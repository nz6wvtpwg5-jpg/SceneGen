const express = require('express');
const crypto = require('crypto');

const SCOPE = 'shows.read';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OPAQUE = /^[A-Za-z0-9_-]{43,128}$/;

const digest = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const opaqueToken = () => crypto.randomBytes(32).toString('base64url');
const pkceChallenge = (verifier) => crypto.createHash('sha256').update(verifier).digest('base64url');

function configuredClient() {
  const clientId = String(process.env.SCENEGEN_OAUTH_DROPTUNE_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.SCENEGEN_OAUTH_DROPTUNE_CLIENT_SECRET || '').trim();
  const redirectUris = String(process.env.SCENEGEN_OAUTH_DROPTUNE_REDIRECT_URIS || '')
    .split(',').map((value) => value.trim()).filter(Boolean);
  if (!clientId || clientSecret.length < 32 || !redirectUris.length) return null;
  return { clientId, clientSecret, redirectUris };
}

function secureEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function validateAuthorizationRequest(input, client = configuredClient()) {
  if (!client) return 'server_error';
  if (input.client_id !== client.clientId) return 'unauthorized_client';
  if (input.response_type !== 'code') return 'unsupported_response_type';
  if (!client.redirectUris.includes(input.redirect_uri)) return 'invalid_redirect_uri';
  if (input.scope !== SCOPE) return 'invalid_scope';
  if (!/^[A-Za-z0-9._~-]{16,200}$/.test(input.state || '')) return 'invalid_request';
  if (input.code_challenge_method !== 'S256' || !OPAQUE.test(input.code_challenge || '')) return 'invalid_request';
  return null;
}

function serializePublicShow(show) {
  return {
    id: show.id, date: show.date, startTime: show.start_time, doorsTime: show.door_time,
    venueName: show.venue_name, city: show.city, region: show.state, country: show.country,
    festivalName: show.festival_name, status: show.status, updatedAt: show.updated_at,
  };
}

function clientCredentials(req) {
  const basic = String(req.headers.authorization || '');
  if (basic.startsWith('Basic ')) {
    try {
      const [id, secret] = Buffer.from(basic.slice(6), 'base64').toString('utf8').split(/:(.*)/s);
      return { id, secret };
    } catch { return { id: '', secret: '' }; }
  }
  return { id: String(req.body.client_id || ''), secret: String(req.body.client_secret || '') };
}

function oauthError(res, status, error, description) {
  res.set('Cache-Control', 'no-store');
  return res.status(status).json({ error, error_description: description });
}

async function ownedArtists(pool, userId) {
  return (await pool.query(`SELECT DISTINCT e.id::text id,e.name,e.alias
    FROM entities e
    LEFT JOIN entity_memberships membership ON membership.entity_id=e.id
      AND membership.user_id=$1::uuid AND membership.status='active'
    WHERE e.entity_type='artist' AND (
      e.administrator_id::text=$1::text OR membership.role='admin'
    ) ORDER BY lower(e.name),e.id`, [userId])).rows;
}

function createInternalOAuthRouter(pool) {
  const router = express.Router();

  router.post('/context', async (req, res) => {
    const userId = String(req.body.userId || '');
    const error = validateAuthorizationRequest(req.body);
    if (!UUID.test(userId)) return res.status(401).json({ error: 'SceneGen session required' });
    if (error) return res.status(error === 'server_error' ? 503 : 400).json({ error });
    const artists = await ownedArtists(pool, userId);
    return res.json({ application: 'Droptune', scope: SCOPE, artists });
  });

  router.post('/approve', async (req, res) => {
    const userId = String(req.body.userId || '');
    const entityId = String(req.body.entityId || '');
    const error = validateAuthorizationRequest(req.body);
    if (!UUID.test(userId)) return res.status(401).json({ error: 'SceneGen session required' });
    if (error) return res.status(error === 'server_error' ? 503 : 400).json({ error });
    if (!UUID.test(entityId)) return res.status(422).json({ error: 'Choose an artist' });
    const artists = await ownedArtists(pool, userId);
    if (!artists.some((artist) => artist.id === entityId)) return res.status(403).json({ error: 'Artist owner or administrator access required' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const integration = await client.query(`INSERT INTO oauth_integrations
        (client_id,user_id,entity_id,scope,revoked_at,updated_at)
        VALUES($1,$2::uuid,$3::uuid,$4,NULL,NOW())
        ON CONFLICT(client_id,user_id,entity_id) DO UPDATE
          SET scope=EXCLUDED.scope,revoked_at=NULL,updated_at=NOW()
        RETURNING id`, [req.body.client_id, userId, entityId, SCOPE]);
      const rawCode = opaqueToken();
      await client.query('DELETE FROM oauth_authorization_codes WHERE integration_id=$1 OR expires_at<=NOW()', [integration.rows[0].id]);
      await client.query('DELETE FROM oauth_access_tokens WHERE integration_id=$1', [integration.rows[0].id]);
      await client.query(`INSERT INTO oauth_authorization_codes
        (code_hash,integration_id,client_id,redirect_uri,code_challenge,scope,expires_at)
        VALUES($1,$2,$3,$4,$5,$6,NOW()+INTERVAL '10 minutes')`,
      [digest(rawCode), integration.rows[0].id, req.body.client_id, req.body.redirect_uri, req.body.code_challenge, SCOPE]);
      await client.query(`INSERT INTO oauth_audit_log(integration_id,action,request_id)
        VALUES($1,'authorized',$2)`, [integration.rows[0].id, req.requestId || null]);
      await client.query('COMMIT');
      const redirect = new URL(req.body.redirect_uri);
      redirect.searchParams.set('code', rawCode);
      redirect.searchParams.set('state', String(req.body.state || ''));
      return res.json({ redirect: redirect.toString() });
    } catch (failure) {
      await client.query('ROLLBACK').catch(() => {});
      throw failure;
    } finally { client.release(); }
  });
  return router;
}

async function authenticateAccessToken(pool, req, res, next) {
  const raw = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!OPAQUE.test(raw)) return oauthError(res, 401, 'invalid_token', 'A valid access token is required');
  try {
    const result = await pool.query(`SELECT token.integration_id,integration.entity_id::text entity_id,token.scope
      FROM oauth_access_tokens token JOIN oauth_integrations integration ON integration.id=token.integration_id
      WHERE token.access_token_hash=$1 AND token.access_expires_at>NOW()
        AND integration.revoked_at IS NULL LIMIT 1`, [digest(raw)]);
    if (!result.rowCount) return oauthError(res, 401, 'invalid_token', 'The access token is invalid or expired');
    req.oauth = result.rows[0];
    next();
  } catch (error) { next(error); }
}

function createPublicOAuthRouter(pool) {
  const router = express.Router();

  router.post('/token', async (req, res) => {
    const configured = configuredClient();
    if (!configured) return oauthError(res, 503, 'server_error', 'OAuth is not configured');
    const supplied = clientCredentials(req);
    if (supplied.id !== configured.clientId || !secureEqual(supplied.secret, configured.clientSecret)) {
      return oauthError(res, 401, 'invalid_client', 'Client authentication failed');
    }

    if (req.body.grant_type === 'authorization_code') {
      const code = String(req.body.code || '');
      const verifier = String(req.body.code_verifier || '');
      if (!OPAQUE.test(code) || !OPAQUE.test(verifier)) return oauthError(res, 400, 'invalid_grant', 'Invalid authorization code');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const consumed = await client.query(`DELETE FROM oauth_authorization_codes
          WHERE code_hash=$1 AND client_id=$2 AND redirect_uri=$3 AND expires_at>NOW()
          RETURNING integration_id,scope,code_challenge`, [digest(code), supplied.id, req.body.redirect_uri]);
        const grant = consumed.rows[0];
        if (!grant || !secureEqual(pkceChallenge(verifier), grant.code_challenge)) {
          await client.query('ROLLBACK');
          return oauthError(res, 400, 'invalid_grant', 'Invalid or expired authorization code');
        }
        const accessToken = opaqueToken(); const refreshToken = opaqueToken();
        await client.query('DELETE FROM oauth_access_tokens WHERE integration_id=$1', [grant.integration_id]);
        await client.query(`INSERT INTO oauth_access_tokens
          (integration_id,access_token_hash,refresh_token_hash,scope,access_expires_at,refresh_expires_at)
          VALUES($1,$2,$3,$4,NOW()+INTERVAL '1 hour',NOW()+INTERVAL '90 days')`,
        [grant.integration_id, digest(accessToken), digest(refreshToken), grant.scope]);
        await client.query(`INSERT INTO oauth_audit_log(integration_id,action,request_id) VALUES($1,'token_issued',$2)`, [grant.integration_id, req.requestId || null]);
        await client.query('COMMIT');
        res.set('Cache-Control', 'no-store');
        return res.json({ access_token: accessToken, token_type: 'Bearer', expires_in: 3600, refresh_token: refreshToken, scope: grant.scope });
      } catch (failure) { await client.query('ROLLBACK').catch(() => {}); throw failure; }
      finally { client.release(); }
    }

    if (req.body.grant_type === 'refresh_token') {
      const suppliedRefresh = String(req.body.refresh_token || '');
      if (!OPAQUE.test(suppliedRefresh)) return oauthError(res, 400, 'invalid_grant', 'Invalid refresh token');
      const accessToken = opaqueToken(); const refreshToken = opaqueToken();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const rotated = await client.query(`UPDATE oauth_access_tokens token SET
            access_token_hash=$2,refresh_token_hash=$3,access_expires_at=NOW()+INTERVAL '1 hour',
            refresh_expires_at=NOW()+INTERVAL '90 days',rotated_at=NOW()
          FROM oauth_integrations integration
          WHERE token.integration_id=integration.id AND token.refresh_token_hash=$1
            AND token.refresh_expires_at>NOW() AND integration.revoked_at IS NULL
          RETURNING token.integration_id,token.scope`, [digest(suppliedRefresh), digest(accessToken), digest(refreshToken)]);
        if (!rotated.rowCount) {
          await client.query('ROLLBACK');
          return oauthError(res, 400, 'invalid_grant', 'Invalid or expired refresh token');
        }
        await client.query(`INSERT INTO oauth_audit_log(integration_id,action,request_id) VALUES($1,'token_refreshed',$2)`, [rotated.rows[0].integration_id, req.requestId || null]);
        await client.query('COMMIT');
        res.set('Cache-Control', 'no-store');
        return res.json({ access_token: accessToken, token_type: 'Bearer', expires_in: 3600, refresh_token: refreshToken, scope: rotated.rows[0].scope });
      } catch (failure) { await client.query('ROLLBACK').catch(() => {}); throw failure; }
      finally { client.release(); }
    }
    return oauthError(res, 400, 'unsupported_grant_type', 'Supported grants are authorization_code and refresh_token');
  });

  router.post('/revoke', async (req, res) => {
    const configured = configuredClient(); const supplied = clientCredentials(req);
    if (!configured || supplied.id !== configured.clientId || !secureEqual(supplied.secret, configured.clientSecret)) {
      return oauthError(res, 401, 'invalid_client', 'Client authentication failed');
    }
    const tokenHash = digest(String(req.body.token || ''));
    const revoked = await pool.query(`UPDATE oauth_integrations integration SET revoked_at=NOW(),updated_at=NOW()
      FROM oauth_access_tokens token WHERE token.integration_id=integration.id
        AND (token.access_token_hash=$1 OR token.refresh_token_hash=$1) RETURNING integration.id`, [tokenHash]);
    if (revoked.rowCount) await pool.query(`INSERT INTO oauth_audit_log(integration_id,action,request_id) VALUES($1,'revoked',$2)`, [revoked.rows[0].id, req.requestId || null]);
    return res.status(200).end();
  });

  router.get('/v1/artist', (req, res, next) => authenticateAccessToken(pool, req, res, next), async (req, res) => {
    const result = await pool.query(`SELECT id::text,name,alias,city,state,country FROM entities WHERE id=$1::uuid AND entity_type='artist'`, [req.oauth.entity_id]);
    return res.json(result.rows[0] || null);
  });

  router.get('/v1/shows', (req, res, next) => authenticateAccessToken(pool, req, res, next), async (req, res) => {
    const result = await pool.query(`SELECT id::text,date,start_time,door_time,venue_name,city,state,country,
        festival_name,status,updated_at
      FROM shows WHERE entity_id::text=$1::text AND date>=CURRENT_DATE
        AND status IN ('confirmed','tentative','cancelled')
      ORDER BY date,start_time NULLS LAST,id`, [req.oauth.entity_id]);
    await pool.query(`INSERT INTO oauth_audit_log(integration_id,action,request_id) VALUES($1,'shows_read',$2)`, [req.oauth.integration_id, req.requestId || null]);
    return res.json({ shows: result.rows.map(serializePublicShow) });
  });
  return router;
}

module.exports = { createInternalOAuthRouter, createPublicOAuthRouter, validateAuthorizationRequest, serializePublicShow, pkceChallenge, digest };

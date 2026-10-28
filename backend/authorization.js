const { matches: territoryMatches, resolveShowCountry } = require('./territories');

function requestedEntityId(req) {
  return req.headers['x-entity-id'] || req.query?.entityId || req.body?.entityId || null;
}

const RESOURCE_TABLES = new Map([
  ['shows', 'shows'], ['tours', 'tours'], ['budgets', 'budgets'],
]);

async function resolveEntityId(pool, req) {
  const parts = String(req.path || '').split('/').filter(Boolean);
  const table = RESOURCE_TABLES.get(parts[0]);
  const recordId = parts[1];
  if (table && recordId && /^[0-9a-f-]{36}$/i.test(recordId)) {
    const result = await pool.query(`SELECT entity_id FROM ${table} WHERE id::text = $1 LIMIT 1`, [recordId]);
    return result.rows[0]?.entity_id ? String(result.rows[0].entity_id) : null;
  }
  const explicit = requestedEntityId(req);
  return explicit ? String(explicit) : null;
}

async function resolveDaySheetGrant(pool, req, entityId) {
  const parts = String(req.path || '').split('/').filter(Boolean);
  if (parts[0] !== 'shows' || parts.length < 2 || !parts[1] || !/^[0-9a-f-]{36}$/i.test(parts[1])) return null;
  const result = await pool.query(`
    SELECT g.access_level, g.edit_scope, g.financial_access, g.require_approval, g.access_role,
      g.scope_type, g.countries, g.tour_id, g.show_id, s.country, s.venue_address, s.tour_id show_tour_id
    FROM shows s
    JOIN day_sheet_access_grants g ON g.entity_id::text = s.entity_id::text
    WHERE s.id::text = $1
      AND s.entity_id::text = $2
      AND g.user_id = $3::uuid
      AND g.revoked_at IS NULL
      AND (g.expires_at IS NULL OR g.expires_at > NOW())
    `, [parts[1], String(entityId), req.userId]);
  const grants = result.rows.filter((grant) =>
    grant.scope_type === 'all'
    || (grant.scope_type === 'countries' && territoryMatches(grant.countries, resolveShowCountry(grant.country, grant.venue_address)))
    || (grant.scope_type === 'tour' && String(grant.tour_id) === String(grant.show_tour_id))
    || (grant.scope_type === 'show' && String(grant.show_id) === parts[1]));
  if (!grants.length) return null;
  const restrictedCrewRole = grants.find((grant) => ['band_member', 'crew_member'].includes(grant.access_role))?.access_role || null;
  const bandMember = Boolean(restrictedCrewRole);
  const permission = {
    access_role: restrictedCrewRole || 'collaborator',
    access_level: bandMember ? 'viewer' : grants.some((grant) => grant.access_level === 'editor') ? 'editor' : 'viewer',
    edit_scope: bandMember ? 'none' : grants.some((grant) => grant.edit_scope === 'full') ? 'full'
      : grants.some((grant) => grant.edit_scope === 'advance') ? 'advance' : 'none',
    financial_access: bandMember ? 'hidden' : grants.some((grant) => grant.financial_access === 'edit') ? 'edit'
      : grants.some((grant) => grant.financial_access === 'view') ? 'view' : 'hidden',
    require_approval: bandMember ? false : grants.some((grant) => grant.require_approval !== false),
  };
  return permission;
}

function entityIsRequired(req) {
  return RESOURCE_TABLES.has(String(req.path || '').split('/').filter(Boolean)[0]);
}

function isPublicTokenLookup(req) {
  return req.method === 'GET' && (
    /^\/shared\/show\/[^/]+$/.test(req.path) || /^\/invites\/[^/]+$/.test(req.path) || /^\/day-sheet-invitations\/[^/]+$/.test(req.path)
  );
}

function normalizeIdentityEmail(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return /^\S+@\S+\.\S+$/.test(normalized) ? normalized : '';
}

function createPrivateIdentityMiddleware(pool) {
  return async (req, res, next) => {
    if (isPublicTokenLookup(req)) return next();
    const expected = process.env.BACKEND_SERVICE_TOKEN;
    const header = req.headers.authorization || '';
    if (!expected) return res.status(503).json({ error: { code: 'SERVICE_NOT_CONFIGURED', message: 'Private API authentication is not configured' } });
    const value = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const [encodedUserId, suppliedSignature] = value.split('.');
    const expectedSignature = encodedUserId
      ? require('crypto').createHmac('sha256', expected).update(encodedUserId).digest('base64url') : '';
    const signatureValid = /^[A-Za-z0-9_-]+$/.test(suppliedSignature || '') &&
      Buffer.byteLength(expectedSignature) === Buffer.byteLength(suppliedSignature) &&
      require('crypto').timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(suppliedSignature));
    let userId = '';
    try { userId = Buffer.from(encodedUserId || '', 'base64url').toString('utf8'); } catch { userId = ''; }
    if (!signatureValid || !/^[0-9a-f-]{36}$/i.test(userId)) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'A valid SceneGen session is required' } });
    req.userId = userId;
    req.headers['x-user-id'] = req.userId;

    // Collaborator sessions are deliberately isolated from the main SceneGen
    // session, but an older JWT can retain a superseded user UUID. The email in
    // this request was read server-side from that signed collaborator session.
    // Resolve it to the unique live account before any grant lookup so valid
    // access is not incorrectly presented as revoked.
    const sessionEmail = normalizeIdentityEmail(req.headers['x-user-email']);
    if (pool && sessionEmail) {
      try {
        const canonical = await pool.query(`SELECT id::text id, email FROM users
          WHERE lower(trim(email))=$1 AND deleted_at IS NULL LIMIT 1`, [sessionEmail]);
        if (!canonical.rowCount) {
          return res.status(401).json({ error: { code: 'SESSION_IDENTITY_INVALID', message: 'This collaborator session is no longer valid' } });
        }
        const canonicalUser = canonical.rows[0];
        if (String(canonicalUser.id) !== req.userId) {
          console.warn('Reconciled collaborator session identity', { requestId: req.requestId });
          req.userId = String(canonicalUser.id);
          req.headers['x-user-id'] = req.userId;
        }
        req.headers['x-user-email'] = String(canonicalUser.email).trim().toLowerCase();
      } catch (error) {
        return next(error);
      }
    }
    next();
  };
}

function createEntityAuthorizationMiddleware(pool) {
  return async (req, res, next) => {
    const suppliedEntityIds = [req.headers['x-entity-id'], req.query?.entityId, req.body?.entityId]
      .filter((value) => value !== undefined && value !== null && value !== '')
      .map(String);
    if (new Set(suppliedEntityIds).size > 1) {
      return res.status(400).json({ error: { code: 'ENTITY_MISMATCH', message: 'Conflicting entity identifiers were supplied' } });
    }
    try {
      const entityId = await resolveEntityId(pool, req);
      if (!entityId) {
        if (entityIsRequired(req)) return res.status(400).json({ error: { code: 'ENTITY_REQUIRED', message: 'A valid entity context is required' } });
        return next();
      }
      const result = await pool.query(`SELECT e.id, CASE
          WHEN e.administrator_id = $2::text AND EXISTS (
            SELECT 1 FROM agent_created_band_invitations invitation
            WHERE invitation.entity_id = e.id AND invitation.agent_user_id = $2::uuid
              AND invitation.status = 'pending' AND invitation.revoked_at IS NULL
              AND invitation.expires_at > NOW()
          ) THEN 'provisional_agent'
          WHEN e.administrator_id = $2::text THEN 'owner'
          ELSE em.role END AS role
        FROM entities e LEFT JOIN entity_memberships em ON em.entity_id = e.id AND em.user_id = $2::uuid AND em.status = 'active'
        WHERE e.id::text = $1 AND (e.administrator_id = $2::text OR em.user_id IS NOT NULL) LIMIT 1`, [String(entityId), req.userId]);
      let role = result.rows[0]?.role || null;
      // A current day-sheet grant is authoritative for non-owner portal users.
      // This prevents an old viewer/editor membership from widening a later
      // band-member or crew-member invitation into the collaborator editor.
      const grant = await resolveDaySheetGrant(pool, req, entityId);
      const protectedWorkspaceRole = ['owner', 'admin'].includes(role);
      if (grant && (!role || !protectedWorkspaceRole)) {
          role = grant.access_level || 'viewer';
          req.isExternalDaySheetCollaborator = true;
          req.daySheetPermissions = {
            accessRole: grant.access_role || 'collaborator',
            editScope: grant.edit_scope || (grant.access_level === 'editor' ? 'full' : 'none'),
            financialAccess: grant.financial_access || 'hidden',
            requireApproval: grant.require_approval !== false,
          };
      }
      if (!role) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have access to this workspace or day sheet' } });
      req.entityId = String(entityId); req.entityRole = role; req.headers['x-entity-id'] = req.entityId;
      if (req.entityRole === 'provisional_agent') {
        const allowed = /^(\/shows(?:\/|$)|\/tours(?:\/|$)|\/show-proposals(?:\/|$))/.test(req.path);
        if (!allowed) return res.status(403).json({ error: { code: 'PROVISIONAL_AGENT_RESTRICTED', message: 'This band has not accepted its workspace invitation. You can plan shows and tours, but only the band can manage its profile, access, contacts, documents and finances.' } });
      }
      // A legacy workspace membership must not widen restricted portal access.
      if (/^\/(contacts|contact-intelligence)(?:\/|$)/.test(req.path) && !['owner', 'admin'].includes(role)) {
        const restricted = await pool.query(`SELECT 1 FROM day_sheet_access_grants
          WHERE entity_id::text=$1 AND user_id=$2::uuid
            AND access_role IN ('band_member','crew_member')
            AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>NOW()) LIMIT 1`, [String(entityId), req.userId]);
        if (restricted.rows.length || ['band_member','crew_member'].includes(role)) {
          return res.status(403).json({ error: { code: 'CONTACTS_FORBIDDEN', message: 'Contacts are not included in day-sheet-only access' } });
        }
      }
      const readOnly = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
      const selfRecord = req.method === 'POST' && (
        /^\/shows\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/visit$/i.test(req.path)
        || /^\/shows\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/notices\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/acknowledge$/i.test(req.path)
        || /^\/shows\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/documents\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/acknowledge$/i.test(req.path)
      );
      if (req.isExternalDaySheetCollaborator && ['band_member', 'crew_member'].includes(req.daySheetPermissions?.accessRole)) {
        if (/\/documents(?:\/|$)/.test(req.path)) return res.status(403).json({ error: { code: 'BAND_MEMBER_DOCUMENTS_FORBIDDEN', message: 'Documents are not available with band-member day-sheet access' } });
        if (!readOnly) return res.status(403).json({ error: { code: 'BAND_MEMBER_READ_ONLY', message: 'Band-member day-sheet access is view only' } });
      }
      if (!readOnly && !selfRecord && req.entityRole === 'viewer') return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'This membership is read-only' } });
      if (req.method === 'DELETE' && !['owner', 'admin'].includes(req.entityRole)) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Owner or administrator access is required' } });
      next();
    } catch (error) { console.error('Entity authorization failed:', error.message); res.status(500).json({ error: { code: 'AUTHORIZATION_ERROR', message: 'Unable to authorize entity access' } }); }
  };
}

module.exports = { createPrivateIdentityMiddleware, createEntityAuthorizationMiddleware, requestedEntityId, resolveEntityId, resolveDaySheetGrant, isPublicTokenLookup };

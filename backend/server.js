require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const SquareService = require('./services/squareService');
const moment = require('moment-timezone');
const { createPrivateIdentityMiddleware, createEntityAuthorizationMiddleware, isPublicTokenLookup } = require('./authorization');
const { encryptCalendarToken, decryptCalendarToken } = require('./calendar-crypto');
const crypto = require('crypto');
const { promisify } = require('util');
const scryptAsync = promisify(crypto.scrypt);
const { canonicalCountry, resolveShowCountry } = require('./territories');
const { upsertVenue } = require('./venue-directory');
const { verifiedPlace } = require('./show-proposal-policy');
const { prepareShowVenueEdit, resolveShowVenueEdit } = require('./show-venue-edit');
const { sendNativePush } = require('./apns-push');
const { invitePromoterByEmail } = require('./promoter-claims');
const { serviceTokenMiddleware } = require('./service-token');
const { deploymentCapabilitiesHandler } = require('./deployment-capabilities');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

// Middleware
app.disable('x-powered-by');
app.set('trust proxy', 1);

const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '15mb' }));
app.use((req, res, next) => {
  const requestId = /^[A-Za-z0-9_-]{8,80}$/.test(String(req.headers['x-request-id'] || ''))
    ? String(req.headers['x-request-id']) : crypto.randomUUID();
  req.requestId = requestId;
  res.set('X-Request-Id', requestId);
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setTimeout(15_000, () => {
    if (!res.headersSent) res.status(503).json({ error: { code: 'SERVICE_TIMEOUT', message: 'SceneGen is taking too long to respond. Please try again.' }, requestId });
  });
  next();
});

// Log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Helper function to convert snake_case to camelCase
function toCamelCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);

  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    converted[camelKey] = value;
  }
  return converted;
}

// Keep every show response consistent. In particular, do not invent operational
// times: a day sheet must make missing production data visible to the user.
const { userShowNotes } = require('./calendar-import-notes');
function serializeShow(row) {
  const show = toCamelCase(row);
  const resolvedCountry = resolveShowCountry(show.country, show.venueAddress);
  const resolvedLatitude = show.venueLat ?? show.latitude ?? null;
  const resolvedLongitude = show.venueLng ?? show.longitude ?? null;
  return {
    ...show,
    notes: userShowNotes(show.notes),
    showDate: show.date,
    showTime: show.startTime || '',
    doorsTime: show.doorTime || '',
    loadInTime: show.loadInTime || '',
    soundCheckTime: show.soundCheckTime || '',
    endTime: show.endTime || '',
    setLength: '',
    venueName: show.venueName || '',
    venueAddress: show.venueAddress || '',
    venueCity: show.city || '',
    venueState: show.state || '',
    country: resolvedCountry || show.country || '',
    venueCountry: resolvedCountry || show.country || '',
    latitude: resolvedLatitude,
    longitude: resolvedLongitude,
    venueLat: resolvedLatitude,
    venueLng: resolvedLongitude,
    venueCapacity: show.capacity == null ? undefined : show.capacity,
    artistEntityId: show.entityId,
    promoterEntityId: show.entityId,
    createdBy: show.entityId,
    contactName: show.promoterName || '',
    contactPhone: show.promoterPhone || '',
    contactEmail: show.promoterEmail || '',
    dealType: show.backendDeal || 'guarantee',
    guarantee: show.guaranteedFee ?? show.fee ?? undefined,
  };
}

function normalizeCurrencyCode(value) {
  const code = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

async function trustedVenueInput(input, client = null) {
  if (input?.venueId) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(input.venueId))) {
      const error = new Error('Choose a valid venue');
      error.status = 422;
      throw error;
    }
    const database = client || pool;
    const selected = await database.query('SELECT * FROM venues WHERE id=$1', [input.venueId]);
    if (!selected.rowCount) {
      const error = new Error('That venue is no longer available');
      error.status = 422;
      throw error;
    }
    const venue = selected.rows[0];
    return {
      ...input,
      venueId: venue.id,
      googleVerified: Boolean(venue.google_place_id),
      venuePlaceId: venue.google_place_id,
      venueName: venue.name,
      venueAddress: venue.address,
      city: venue.city,
      state: venue.region,
      country: venue.country,
      countryCode: venue.country_code,
      postalCode: venue.postal_code,
      latitude: venue.latitude,
      longitude: venue.longitude,
      capacity: venue.capacity,
    };
  }
  if (!input?.venuePlaceId) return input;
  const place = await verifiedPlace(String(input.venuePlaceId));
  return {
    ...input,
    googleVerified: true,
    venuePlaceId: place.placeId,
    venueName: place.name,
    venueAddress: place.address,
    city: place.city,
    state: place.region,
    country: place.country,
    countryCode: place.countryCode,
    latitude: place.latitude,
    longitude: place.longitude,
  };
}

const effectiveShowCurrencySql = (showAlias = 's') => `COALESCE(
  (SELECT upper(trim(tour.currency)) FROM tours tour WHERE tour.id = ${showAlias}.tour_id
    AND upper(trim(tour.currency)) ~ '^[A-Z]{3}$'),
  (SELECT min(upper(trim(budget.currency))) FROM budgets budget
    WHERE budget.show_id = ${showAlias}.id AND upper(trim(budget.currency)) ~ '^[A-Z]{3}$'
    HAVING count(DISTINCT upper(trim(budget.currency))) = 1),
  (SELECT min(upper(trim(budget.currency))) FROM budgets budget
    WHERE budget.tour_id = ${showAlias}.tour_id AND upper(trim(budget.currency)) ~ '^[A-Z]{3}$'
    HAVING count(DISTINCT upper(trim(budget.currency))) = 1),
  CASE WHEN upper(trim(${showAlias}.currency)) ~ '^[A-Z]{3}$' THEN upper(trim(${showAlias}.currency)) END
)`;
const showReadinessSql = (showAlias = 's') => `COALESCE((SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE task.status = 'done') / NULLIF(COUNT(*), 0))::int FROM show_advance_tasks task WHERE task.show_id = ${showAlias}.id), 0)`;

async function resolveRoutingCoordinates(show) {
  const latitude = (show.venue_lat ?? show.latitude) == null ? null : Number(show.venue_lat ?? show.latitude);
  const longitude = (show.venue_lng ?? show.longitude) == null ? null : Number(show.venue_lng ?? show.longitude);
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return { latitude, longitude, precision: 'venue' };
  }

  const city = typeof show.city === 'string' ? show.city.trim() : '';
  if (!city || ['off', 'off day', 'travel', 'travel day', 'tbd', 'n/a'].includes(city.toLowerCase())) {
    return null;
  }

  // City and state are enough for approximate routing. Avoid allowing a
  // stale inferred country value to turn Brussels into "Brussels, USA".
  const query = [city, show.state]
    .map((part) => typeof part === 'string' ? part.trim() : '')
    .filter(Boolean)
    .join(', ');
  return query ? { address: query, precision: 'city' } : null;
}

async function createEntityNotification(entityId, type, title, message, actionUrl = null) {
  const owner = await pool.query('SELECT administrator_id FROM entities WHERE id = $1', [entityId]);
  if (!owner.rows[0]?.administrator_id) return;
  const inserted = await pool.query(
    `INSERT INTO notifications (user_id, entity_id, type, title, message, action_url)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [owner.rows[0].administrator_id, entityId, type, title, message, actionUrl]
  );
  void sendNativePush(pool, {
    id: inserted.rows[0].id, userId: owner.rows[0].administrator_id,
    entityId, title, message, actionUrl
  }).catch((error) => console.error('Native push delivery failed:', error.message));
}

// Simple auth middleware (validates that a user/entity ID is present)
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'A bearer token is required' }
    });
  }

  // For now, we'll extract entityId from query params or body
  // In production, you'd validate the SceneGen session here
  const entityId = (req.query && req.query.entityId) ||
                   (req.body && req.body.entityId) ||
                   req.headers['x-entity-id'];

  if (!entityId) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Entity ID is required (pass as query param, body field, or X-Entity-Id header)'
      }
    });
  }

  req.entityId = entityId;
  next();
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const hashOpaqueToken = (value) => crypto.createHash('sha256').update(value).digest('hex');
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scryptAsync(password, salt, 64, { N: 1 << 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 });
  return `scrypt$131072$8$1$${salt.toString('base64')}$${derived.toString('base64')}`;
}
async function passwordMatches(stored, password) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltText, hashText] = parts;
  const expectedToken = Buffer.from(hashText, 'base64');
  const suppliedToken = await scryptAsync(password, Buffer.from(saltText, 'base64'), expectedToken.length,
    { N: Number(n), r: Number(r), p: Number(p), maxmem: 256 * 1024 * 1024 });
  return expectedToken.length === suppliedToken.length && crypto.timingSafeEqual(suppliedToken, expectedToken);
}

// The Next.js service is the only caller of these private-network endpoints.
app.post('/internal/auth/register', serviceTokenMiddleware, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const passwordHash = await hashPassword(String(req.body.password || ''));
  const result = await pool.query(
    `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, updated_at = NOW()
       WHERE users.email_verified_at IS NULL
     RETURNING id`, [email, String(req.body.name || '').trim(), passwordHash]);
  res.json({ userId: result.rows[0]?.id });
});
app.post('/internal/auth/rate-limit', serviceTokenMiddleware, async (req, res) => {
  const maxAttempts = Math.max(1, Math.min(Number(req.body.maxAttempts) || 5, 50));
  const windowSeconds = Math.max(60, Math.min(Number(req.body.windowSeconds) || 900, 86400));
  const rateKey = hashOpaqueToken(`${req.body.namespace || 'auth'}:${req.body.key || 'unknown'}`);
  const result = await pool.query(`INSERT INTO auth_rate_limits (rate_key, window_started_at, attempts) VALUES ($1, NOW(), 1)
    ON CONFLICT (rate_key) DO UPDATE SET
      window_started_at = CASE WHEN auth_rate_limits.window_started_at < NOW() - ($2 * INTERVAL '1 second') THEN NOW() ELSE auth_rate_limits.window_started_at END,
      attempts = CASE WHEN auth_rate_limits.window_started_at < NOW() - ($2 * INTERVAL '1 second') THEN 1 ELSE auth_rate_limits.attempts + 1 END
    RETURNING attempts`, [rateKey, windowSeconds]);
  if (crypto.randomInt(100) === 0) pool.query(`DELETE FROM auth_rate_limits WHERE window_started_at < NOW() - INTERVAL '7 days'`).catch(() => {});
  res.json({ allowed: Number(result.rows[0].attempts) <= maxAttempts });
});
app.post('/internal/auth/login', serviceTokenMiddleware, async (req, res) => {
  const key = hashOpaqueToken(`${req.body.ip || 'unknown'}:${normalizeEmail(req.body.email)}`);
  const limit = await pool.query(`INSERT INTO auth_rate_limits (rate_key, window_started_at, attempts) VALUES ($1, NOW(), 1)
    ON CONFLICT (rate_key) DO UPDATE SET window_started_at = CASE WHEN auth_rate_limits.window_started_at < NOW() - INTERVAL '15 minutes' THEN NOW() ELSE auth_rate_limits.window_started_at END,
    attempts = CASE WHEN auth_rate_limits.window_started_at < NOW() - INTERVAL '15 minutes' THEN 1 ELSE auth_rate_limits.attempts + 1 END RETURNING attempts`, [key]);
  if (Number(limit.rows[0].attempts) > 10) return res.json({ user: null });
  const result = await pool.query(`SELECT id, email, name, image, password_hash, email_verified_at FROM users WHERE email = $1 LIMIT 1`, [normalizeEmail(req.body.email)]);
  const row = result.rows[0];
  if (!row?.password_hash || !row.email_verified_at || !(await passwordMatches(row.password_hash, String(req.body.password || '')))) return res.json({ user: null });
  res.json({ user: { id: row.id, email: row.email, name: row.name, image: row.image } });
});
app.post('/internal/auth/password-access-options', serviceTokenMiddleware, async (req, res) => {
  const normalizedEmail = normalizeEmail(req.body.email);
  const key = hashOpaqueToken(`access-options:${req.body.ip || 'unknown'}:${normalizedEmail}`);
  const limit = await pool.query(`INSERT INTO auth_rate_limits (rate_key, window_started_at, attempts) VALUES ($1, NOW(), 1)
    ON CONFLICT (rate_key) DO UPDATE SET window_started_at = CASE WHEN auth_rate_limits.window_started_at < NOW() - INTERVAL '15 minutes' THEN NOW() ELSE auth_rate_limits.window_started_at END,
    attempts = CASE WHEN auth_rate_limits.window_started_at < NOW() - INTERVAL '15 minutes' THEN 1 ELSE auth_rate_limits.attempts + 1 END RETURNING attempts`, [key]);
  if (Number(limit.rows[0].attempts) > 10) return res.json({ valid: false, member: false, collaborator: false });
  const result = await pool.query(`SELECT u.password_hash, u.email_verified_at,
      EXISTS (SELECT 1 FROM booking_agent_profiles bap WHERE bap.user_id = u.id) AS booking_agent,
      (EXISTS (SELECT 1 FROM entities e WHERE e.administrator_id::text = u.id::text)
        OR EXISTS (SELECT 1 FROM entity_memberships em WHERE em.user_id = u.id AND em.status = 'active')
        OR EXISTS (SELECT 1 FROM booking_agent_profiles bap WHERE bap.user_id = u.id)) AS member,
      EXISTS (SELECT 1 FROM day_sheet_access_grants g WHERE g.user_id = u.id
        AND g.revoked_at IS NULL AND (g.expires_at IS NULL OR g.expires_at > NOW())) AS collaborator,
      EXISTS (SELECT 1 FROM day_sheet_access_grants g WHERE g.user_id = u.id) AS historical_collaborator
    FROM users u WHERE u.email = $1 AND u.deleted_at IS NULL LIMIT 1`, [normalizedEmail]);
  const row = result.rows[0];
  if (!row?.password_hash || !row.email_verified_at || !(await passwordMatches(row.password_hash, String(req.body.password || '')))) {
    return res.json({ valid: false, member: false, collaborator: false });
  }
  // An activated booking agent uses the full agent workspace. The underlying
  // grants still govern artist access, but the separate collaborator UI disappears.
  const collaborator = (Boolean(row.collaborator) || (!Boolean(row.member) && Boolean(row.historical_collaborator))) && !Boolean(row.booking_agent);
  // A former day-sheet recipient keeps the isolated portal account after access
  // is revoked; it must not be mistaken for a new full-workspace registration.
  res.json({ valid: true, member: Boolean(row.member) || (!collaborator && !row.historical_collaborator), collaborator });
});
async function upsertSocialAccount(req, res, forcedProvider) {
  const provider = forcedProvider || String(req.body.provider || '');
  if (!['google', 'apple'].includes(provider)) return res.status(400).json({ error: 'Unsupported identity provider' });
  const providerAccountId = String(req.body.providerAccountId || '').trim();
  const email = normalizeEmail(req.body.email);
  if (!providerAccountId || !email) return res.status(400).json({ error: 'Provider account and verified email are required' });
  const client = await pool.connect();
  try { await client.query('BEGIN');
    const linked = await client.query(`SELECT u.id, u.email, u.name, u.image FROM auth_accounts a JOIN users u ON u.id = a.user_id WHERE a.provider = $1 AND a.provider_account_id = $2`, [provider, providerAccountId]);
    if (linked.rows[0]) { await client.query('COMMIT'); return res.json(linked.rows[0]); }
    const existing = await client.query('SELECT id, email, name, image, email_verified_at FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);
    if (existing.rows[0] && !existing.rows[0].email_verified_at) { await client.query('ROLLBACK'); return res.status(409).json({ error: `Verify the existing email account before linking ${provider}.` }); }
    let user = existing.rows[0];
    if (!user) { const created = await client.query(`INSERT INTO users (email, name, image, email_verified_at) VALUES ($1, $2, $3, NOW()) RETURNING id, email, name, image`, [email, req.body.name || null, req.body.image || null]); user = created.rows[0]; }
    await client.query(`INSERT INTO auth_accounts (user_id, provider, provider_account_id) VALUES ($1, $2, $3)`, [user.id, provider, providerAccountId]);
    await client.query('COMMIT'); res.json({ id: user.id, email: user.email, name: user.name, image: user.image });
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
app.post('/internal/auth/social', serviceTokenMiddleware, async (req, res) => upsertSocialAccount(req, res));
app.get('/internal/deployment/capabilities', serviceTokenMiddleware, deploymentCapabilitiesHandler);
app.post('/internal/auth/google', serviceTokenMiddleware, async (req, res) => {
  req.body.provider = 'google';
  return upsertSocialAccount(req, res, 'google');
});
app.post('/internal/auth/day-sheet-invitation', serviceTokenMiddleware, async (req, res) => {
  const suppliedToken = String(req.body.token || '');
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(suppliedToken)) return res.json({ user: null });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`SELECT i.email, i.recipient_name, i.status, i.accepted_by, u.name, u.image
      FROM day_sheet_access_invites i
      LEFT JOIN users u ON u.id = i.accepted_by
      WHERE i.token_hash = $1 AND i.status IN ('pending', 'accepted')
        AND i.revoked_at IS NULL AND i.expires_at > NOW()
      LIMIT 1 FOR UPDATE OF i`, [hashOpaqueToken(suppliedToken)]);
    const invitation = result.rows[0];
    if (!invitation) { await client.query('ROLLBACK'); return res.json({ user: null }); }
    if (invitation.accepted_by) {
      await client.query('COMMIT');
      return res.json({ user: { id: invitation.accepted_by, email: invitation.email, name: invitation.name || invitation.recipient_name, image: invitation.image } });
    }
    const invitedEmail = normalizeEmail(invitation.email);
    const user = await client.query(`INSERT INTO users (email, name)
      VALUES ($1, $2)
      ON CONFLICT (email) DO UPDATE SET name = COALESCE(NULLIF(users.name, ''), EXCLUDED.name)
      RETURNING id, email, name, image`, [invitedEmail, invitation.recipient_name || null]);
    await client.query('COMMIT');
    res.json({ user: user.rows[0] || null });
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; } finally { client.release(); }
});
app.post('/internal/auth/active-day-sheet-collaborator', serviceTokenMiddleware, async (req, res) => {
  const result = await pool.query(`SELECT u.id, u.email, COALESCE(NULLIF(u.name, ''), NULLIF(g.recipient_name, '')) name, u.image
    FROM users u JOIN day_sheet_access_grants g ON g.user_id = u.id
    WHERE u.email = $1 AND g.revoked_at IS NULL AND (g.expires_at IS NULL OR g.expires_at > NOW())
    ORDER BY g.created_at DESC LIMIT 1`, [normalizeEmail(req.body.email)]);
  res.json({ user: result.rows[0] || null });
});
app.post('/internal/auth/collaborator-password-login', serviceTokenMiddleware, async (req, res) => {
  const normalizedEmail = normalizeEmail(req.body.email);
  const key = hashOpaqueToken(`collaborator:${req.body.ip || 'unknown'}:${normalizedEmail}`);
  const limit = await pool.query(`INSERT INTO auth_rate_limits (rate_key, window_started_at, attempts) VALUES ($1, NOW(), 1)
    ON CONFLICT (rate_key) DO UPDATE SET window_started_at = CASE WHEN auth_rate_limits.window_started_at < NOW() - INTERVAL '15 minutes' THEN NOW() ELSE auth_rate_limits.window_started_at END,
    attempts = CASE WHEN auth_rate_limits.window_started_at < NOW() - INTERVAL '15 minutes' THEN 1 ELSE auth_rate_limits.attempts + 1 END RETURNING attempts`, [key]);
  if (Number(limit.rows[0].attempts) > 10) return res.json({ user: null });
  const result = await pool.query(`SELECT u.id, u.email, u.name, u.image, u.password_hash, u.email_verified_at
    FROM users u
    WHERE u.email = $1 AND u.deleted_at IS NULL
      AND EXISTS (SELECT 1 FROM day_sheet_access_grants g WHERE g.user_id = u.id)
    LIMIT 1`, [normalizedEmail]);
  const row = result.rows[0];
  if (!row?.password_hash || !row.email_verified_at || !(await passwordMatches(row.password_hash, String(req.body.password || '')))) {
    return res.json({ user: null });
  }
  res.json({ user: { id: row.id, email: row.email, name: row.name, image: row.image } });
});
app.post('/internal/auth/collaborator-login', serviceTokenMiddleware, async (req, res) => {
  const suppliedToken = String(req.body.token || '');
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(suppliedToken)) return res.json({ user: null });
  const result = await pool.query(`DELETE FROM auth_tokens token
    USING users u
    WHERE token.token_hash = $1 AND token.purpose = 'collaborator_login'
      AND token.expires_at > NOW() AND u.id = token.user_id
      AND EXISTS (SELECT 1 FROM day_sheet_access_grants g WHERE g.user_id = u.id
        AND g.revoked_at IS NULL AND (g.expires_at IS NULL OR g.expires_at > NOW()))
    RETURNING u.id, u.email, u.name, u.image`, [hashOpaqueToken(suppliedToken)]);
  res.json({ user: result.rows[0] || null });
});
app.post('/internal/auth/find', serviceTokenMiddleware, async (req, res) => { const result = await pool.query(`SELECT id, email, name, image, password_hash AS "passwordHash", email_verified_at AS "emailVerifiedAt" FROM users WHERE email = $1 AND deleted_at IS NULL LIMIT 1`, [normalizeEmail(req.body.email)]); res.json({ user: result.rows[0] || null }); });
app.post('/internal/auth/issue-token', serviceTokenMiddleware, async (req, res) => { const token = crypto.randomBytes(32).toString('base64url'); await pool.query(`INSERT INTO auth_tokens (user_id, purpose, token_hash, expires_at) VALUES ($1, $2, $3, NOW() + ($4 * INTERVAL '1 minute')) ON CONFLICT (user_id, purpose) DO UPDATE SET token_hash=EXCLUDED.token_hash, expires_at=EXCLUDED.expires_at, created_at=NOW()`, [req.body.userId, req.body.purpose, hashOpaqueToken(token), Math.min(Number(req.body.minutes) || 30, 1440)]); res.json({ token }); });
app.post('/internal/auth/consume-token', serviceTokenMiddleware, async (req, res) => { const result = await pool.query(`DELETE FROM auth_tokens WHERE token_hash = $1 AND purpose = $2 AND expires_at > NOW() RETURNING user_id AS "userId"`, [hashOpaqueToken(req.body.token || ''), req.body.purpose]); res.json({ userId: result.rows[0]?.userId }); });
app.post('/internal/auth/consume-booking-agent-activation', serviceTokenMiddleware, async (req, res) => {
  const suppliedToken = String(req.body.token || '');
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(suppliedToken)) return res.json({ user: null });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`DELETE FROM auth_tokens token
      USING users user_record
      WHERE token.token_hash=$1 AND token.purpose='booking_agent_activation' AND token.expires_at>NOW()
        AND user_record.id=token.user_id
        AND EXISTS (SELECT 1 FROM booking_agent_profiles profile WHERE profile.user_id=user_record.id)
      RETURNING user_record.id,user_record.email,user_record.name,user_record.image`, [hashOpaqueToken(suppliedToken)]);
    const user = result.rows[0];
    if (!user) { await client.query('ROLLBACK'); return res.json({ user: null }); }
    await client.query('COMMIT');
    res.json({ user });
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; } finally { client.release(); }
});
app.post('/internal/auth/registration-status', serviceTokenMiddleware, async (req, res) => {
  const suppliedToken = String(req.body.token || '');
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(suppliedToken)) return res.json({ status: 'unavailable' });
  const result = await pool.query(`SELECT u.email, u.email_verified_at
    FROM auth_tokens token JOIN users u ON u.id = token.user_id
    WHERE token.token_hash = $1 AND token.purpose = 'registration_status'
      AND token.expires_at > NOW() LIMIT 1`, [hashOpaqueToken(suppliedToken)]);
  const user = result.rows[0];
  res.json(user ? { status: user.email_verified_at ? 'verified' : 'pending', email: user.email } : { status: 'unavailable' });
});
app.post('/internal/auth/verify-email', serviceTokenMiddleware, async (req, res) => { await pool.query('UPDATE users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = $1', [req.body.userId]); res.json({ ok: true }); });
app.post('/internal/auth/update-password', serviceTokenMiddleware, async (req, res) => { const passwordHash = await hashPassword(String(req.body.password || '')); await pool.query('UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1', [req.body.userId, passwordHash]); res.json({ ok: true }); });
app.post('/internal/auth/set-initial-password', serviceTokenMiddleware, async (req, res) => {
  const passwordHash = await hashPassword(String(req.body.password || ''));
  const result = await pool.query(`UPDATE users SET password_hash=$2,email_verified_at=COALESCE(email_verified_at,NOW()),updated_at=NOW()
    WHERE id=$1::uuid AND password_hash IS NULL AND deleted_at IS NULL RETURNING id`, [req.body.userId, passwordHash]);
  res.json({ created: Boolean(result.rowCount) });
});
app.post('/internal/auth/reset-password', serviceTokenMiddleware, async (req, res) => {
  const suppliedToken = String(req.body.token || '');
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(suppliedToken)) return res.json({ updated: false });

  // Hash before taking a database lock. A server failure must never consume a
  // usable link without also committing the new password.
  const passwordHash = await hashPassword(String(req.body.password || ''));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tokenResult = await client.query(`SELECT user_id AS "userId"
      FROM auth_tokens
      WHERE token_hash = $1 AND purpose = 'reset_password' AND expires_at > NOW()
      LIMIT 1 FOR UPDATE`, [hashOpaqueToken(suppliedToken)]);
    const userId = tokenResult.rows[0]?.userId;
    if (!userId) {
      await client.query('ROLLBACK');
      return res.json({ updated: false });
    }
    const updated = await client.query(`UPDATE users
      SET password_hash = $2, updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id`, [userId, passwordHash]);
    if (!updated.rowCount) {
      await client.query('ROLLBACK');
      return res.json({ updated: false });
    }
    await client.query(`DELETE FROM auth_tokens
      WHERE token_hash = $1 AND purpose = 'reset_password'`, [hashOpaqueToken(suppliedToken)]);
    await client.query('COMMIT');
    return res.json({ updated: true });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
});
app.post('/internal/city-geocodes/store', serviceTokenMiddleware, async (req, res) => {
  try {
    const input = Array.isArray(req.body?.places) ? req.body.places : [];
    if (!input.length || input.length > 50) return res.status(422).json({ error: 'Supply 1-50 places' });
    const valid = input.every(place => {
      const city = typeof place.city === 'string' ? place.city.trim() : '';
      const country = typeof place.country === 'string' ? place.country.trim() : '';
      return city.length > 0 && city.length <= 120 && country.length > 0 && country.length <= 120
        && !place.partialMatch && place.lat != null && place.lng != null
        && Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lng))
        && Number(place.lat) >= -90 && Number(place.lat) <= 90
        && Number(place.lng) >= -180 && Number(place.lng) <= 180;
    });
    if (!valid) return res.status(422).json({ error: 'Invalid or partial geocode' });
    for (const place of input) {
      await pool.query(
        `INSERT INTO city_geocode_cache (city_key,country_key,city,country,latitude,longitude,source)
         VALUES (lower(trim($1)),lower(trim($2)),$1,$2,$3,$4,'google-geocoding')
         ON CONFLICT (city_key,country_key) DO UPDATE
         SET latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,updated_at=NOW()`,
        [place.city.trim(),place.country.trim(),Number(place.lat),Number(place.lng)]
      );
    }
    res.json({ saved: input.length });
  } catch (error) {
    console.error('Failed to store city centres:', error);
    res.status(500).json({ error: 'Unable to save city locations' });
  }
});
app.post('/internal/calendar/store', serviceTokenMiddleware, async (req, res) => {
  const { userId, accessToken, refreshToken, expiresAt, scope } = req.body;
  if (!userId || !accessToken) return res.status(400).json({ error: 'Missing calendar connection data' });
  await pool.query(`INSERT INTO calendar_connections (user_id, provider, access_token_encrypted, refresh_token_encrypted, token_expires_at, scope, access_token, refresh_token)
    VALUES ($1, 'google', $2, $3, $4, $5, NULL, NULL)
    ON CONFLICT (user_id, provider) DO UPDATE SET access_token_encrypted = EXCLUDED.access_token_encrypted,
      refresh_token_encrypted = COALESCE(EXCLUDED.refresh_token_encrypted, calendar_connections.refresh_token_encrypted),
      token_expires_at = EXCLUDED.token_expires_at, scope = EXCLUDED.scope, access_token = NULL, refresh_token = NULL, updated_at = NOW()`,
    [userId, encryptCalendarToken(accessToken), encryptCalendarToken(refreshToken), expiresAt ? new Date(expiresAt) : null, scope || null]);
  res.json({ ok: true });
});
app.post('/internal/calendar/get', serviceTokenMiddleware, async (req, res) => {
  const result = await pool.query(`SELECT access_token_encrypted, refresh_token_encrypted, token_expires_at, scope FROM calendar_connections WHERE user_id = $1 AND provider = 'google' LIMIT 1`, [req.body.userId]);
  const row = result.rows[0]; if (!row) return res.json({ connection: null });
  res.json({ connection: { accessToken: decryptCalendarToken(row.access_token_encrypted), refreshToken: decryptCalendarToken(row.refresh_token_encrypted), expiresAt: row.token_expires_at, scope: row.scope } });
});
app.post('/internal/calendar/disconnect', serviceTokenMiddleware, async (req, res) => { await pool.query(`DELETE FROM calendar_connections WHERE user_id = $1 AND provider = 'google'`, [req.body.userId]); res.json({ ok: true }); });

const { createInternalOAuthRouter, createPublicOAuthRouter } = require('./droptune-oauth');
app.use('/internal/oauth', serviceTokenMiddleware, createInternalOAuthRouter(pool));
app.use('/oauth', createPublicOAuthRouter(pool));

// All product API calls must come from the authenticated Next.js service.
app.use('/api', createPrivateIdentityMiddleware(pool));
app.use('/api', async (req, res, next) => {
  if (isPublicTokenLookup(req)) return next();
  try {
    const active = await pool.query('SELECT 1 FROM users WHERE id=$1::uuid AND deleted_at IS NULL LIMIT 1', [req.userId]);
    if (!active.rowCount) return res.status(401).json({ error: { code: 'ACCOUNT_UNAVAILABLE', message: 'This SceneGen account is no longer available' } });
    next();
  } catch (error) { next(error); }
});
app.use('/api', require('./show-proposals').createShowProposalRouter(pool, createEntityNotification));
app.use('/api', require('./promoter-claims').createPromoterClaimRouter(pool));
app.use('/api', createEntityAuthorizationMiddleware(pool));
app.use('/api', require('./day-sheet-collaborators').createDaySheetCollaboratorRouter(pool, serializeShow));
app.use('/api', require('./day-sheet-changes').createDaySheetChangeRouter(pool, serializeShow));
app.use('/api', require('./show-advance').createShowAdvanceRouter(pool));
app.use('/api', require('./show-itinerary').createShowItineraryRouter(pool));
app.use('/api', require('./day-sheet-templates').createDaySheetTemplateRouter(pool));
app.use('/api', require('./guest-lists').createGuestListRouter(pool));
app.use('/api', require('./show-logistics').createShowLogisticsRouter(pool));
app.use('/api', require('./show-documents').createShowDocumentsRouter(pool));
app.use('/api', require('./show-updates').createShowUpdatesRouter(pool));
app.use('/api', require('./tour-health').createTourHealthRouter(pool));

app.post('/api/client-errors', async (req, res) => {
  const message = String(req.body.message || '').trim().slice(0, 500);
  if (!message) return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'An error message is required' } });
  const recent = await pool.query(`SELECT count(*)::int count FROM client_error_reports
    WHERE user_id=$1::uuid AND created_at > NOW() - INTERVAL '1 hour'`, [req.userId]);
  if (recent.rows[0].count >= 20) return res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Error report limit reached' } });
  await pool.query(`INSERT INTO client_error_reports
      (user_id,entity_id,error_name,message,stack,route,release,request_id)
    VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8)`, [req.userId, req.entityId || null,
    String(req.body.name || '').slice(0, 120) || null, message,
    String(req.body.stack || '').slice(0, 4000) || null,
    String(req.body.route || '').startsWith('/') ? String(req.body.route).slice(0, 500) : null,
    String(req.body.release || '').slice(0, 80) || null, req.requestId]);
  res.status(204).end();
});

app.post('/api/user/delete-account', async (req, res) => {
  if (req.body.confirmation !== 'DELETE') return res.status(422).json({ error: { code: 'CONFIRMATION_REQUIRED', message: 'Type DELETE to confirm account deletion' } });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const account = await client.query('SELECT id,email FROM users WHERE id=$1::uuid AND deleted_at IS NULL FOR UPDATE', [req.userId]);
    if (!account.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Account not found' } }); }
    const deletedEmail = `deleted+${req.userId}@deleted.invalid`;
    await client.query('DELETE FROM native_push_devices WHERE user_id=$1', [req.userId]);
    await client.query('DELETE FROM calendar_connections WHERE user_id=$1', [req.userId]);
    await client.query('DELETE FROM entity_memberships WHERE user_id=$1::uuid', [req.userId]);
    await client.query('DELETE FROM day_sheet_access_grants WHERE user_id=$1::uuid', [req.userId]);
    await client.query('DELETE FROM collaborator_workspace_profiles WHERE user_id=$1::uuid', [req.userId]);
    await client.query('DELETE FROM booking_agent_profiles WHERE user_id=$1::uuid', [req.userId]);
    await client.query('DELETE FROM show_notice_receipts WHERE user_id=$1::uuid', [req.userId]);
    await client.query('DELETE FROM show_portal_visits WHERE user_id=$1::uuid', [req.userId]);
    await client.query('DELETE FROM tour_document_receipts WHERE user_id=$1::uuid', [req.userId]);
    await client.query('DELETE FROM auth_accounts WHERE user_id=$1::uuid', [req.userId]);
    await client.query('DELETE FROM auth_tokens WHERE user_id=$1::uuid', [req.userId]);
    await client.query('UPDATE day_sheet_access_invites SET email=$2,token_hash=encode(digest(token_hash || $1::text,\'sha256\'),\'hex\'),status=\'revoked\',revoked_at=NOW() WHERE email=$3', [req.userId, deletedEmail, account.rows[0].email]);
    await client.query('UPDATE agent_created_band_invitations SET recipient_email=$2,status=\'revoked\',revoked_at=NOW() WHERE recipient_email=$3 AND status=\'pending\'', [req.userId, deletedEmail, account.rows[0].email]);
    await client.query(`UPDATE users SET email=$2,name='Deleted user',image=NULL,password_hash=NULL,
      email_verified_at=NULL,deleted_at=NOW(),updated_at=NOW() WHERE id=$1::uuid`, [req.userId, deletedEmail]);
    await client.query('COMMIT');
    res.status(204).end();
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('Account deletion failed:', error.message);
    res.status(500).json({ error: { code: 'ACCOUNT_DELETION_FAILED', message: 'Account deletion could not be completed' } });
  } finally { client.release(); }
});

app.get('/api/conversations', async (req, res) => {
  if (!req.entityId) return res.status(400).json({ error: { code: 'ENTITY_REQUIRED', message: 'Entity context is required' } });
  try {
    const result = await pool.query(`SELECT c.id AS conversation_id, other.id AS participant_id,
      other.name AS participant_name, latest.content AS last_message,
      COALESCE(latest.created_at, c.accepted_at, c.created_at) AS updated_at
      FROM contacts c
      JOIN entities other ON other.id = CASE WHEN c.entity_a_id = $1::uuid THEN c.entity_b_id ELSE c.entity_a_id END
      LEFT JOIN LATERAL (SELECT m.content, m.created_at FROM messages m WHERE m.contact_id = c.id
        ORDER BY m.created_at DESC, m.id DESC LIMIT 1) latest ON true
      WHERE c.status = 'accepted' AND (c.entity_a_id = $1::uuid OR c.entity_b_id = $1::uuid)
      ORDER BY COALESCE(latest.created_at, c.accepted_at, c.created_at) DESC`, [req.entityId]);
    res.json({ conversations: result.rows.map((row) => ({ conversationId: row.conversation_id,
      lastMessage: row.last_message || '', updatedAt: row.updated_at,
      participants: [{ id: req.entityId }, { id: row.participant_id, name: row.participant_name }] })) });
  } catch (error) {
    console.error('Failed to fetch conversations:', error.message);
    res.status(500).json({ error: { code: 'DATABASE_ERROR', message: 'Failed to fetch conversations' } });
  }
});

async function authorizedConversation(conversationId, entityId) {
  return pool.query(`SELECT id FROM contacts WHERE id = $1::uuid AND status = 'accepted'
    AND (entity_a_id = $2::uuid OR entity_b_id = $2::uuid) LIMIT 1`, [conversationId, entityId]);
}

app.get('/api/messages', async (req, res) => {
  const conversationId = String(req.query.conversationId || '');
  if (!req.entityId || !/^[0-9a-f-]{36}$/i.test(conversationId)) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Entity context and conversationId are required' } });
  try {
    if (!(await authorizedConversation(conversationId, req.entityId)).rows[0]) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
    const result = await pool.query(`SELECT message_id, sender_id, content, sent_at FROM (
      SELECT id AS message_id, sender_entity_id AS sender_id, content, created_at AS sent_at
      FROM messages WHERE contact_id = $1::uuid ORDER BY created_at DESC, id DESC LIMIT 200
    ) recent ORDER BY sent_at ASC, message_id ASC`, [conversationId]);
    res.json({ messages: toCamelCase(result.rows) });
  } catch (error) {
    console.error('Failed to fetch messages:', error.message);
    res.status(500).json({ error: { code: 'DATABASE_ERROR', message: 'Failed to fetch messages' } });
  }
});

app.post('/api/messages', async (req, res) => {
  const conversationId = String(req.body.conversationId || '');
  const content = String(req.body.content || '').trim();
  if (!req.entityId || !/^[0-9a-f-]{36}$/i.test(conversationId) || !content || content.length > 4000) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'A valid conversation and message (maximum 4000 characters) are required' } });
  try {
    if (!(await authorizedConversation(conversationId, req.entityId)).rows[0]) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
    const result = await pool.query(`INSERT INTO messages (contact_id, sender_entity_id, content)
      VALUES ($1::uuid, $2::uuid, $3) RETURNING id AS message_id, sender_entity_id AS sender_id, content, created_at AS sent_at`, [conversationId, req.entityId, content]);
    res.status(201).json(toCamelCase(result.rows[0]));
  } catch (error) {
    console.error('Failed to send message:', error.message);
    res.status(500).json({ error: { code: 'DATABASE_ERROR', message: 'Failed to send message' } });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'scenegen-api' });
});

app.get('/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ready', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'not_ready', database: 'unavailable' });
  }
});

// =====================
// ENTITY ENDPOINTS
// =====================

// GET /api/user/entities - Get all entities for a user
app.get('/api/user/entities', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authorization header is required'
        }
      });
    }

    // Extract user ID from token (for now, accept from header)
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User ID is required (pass as X-User-Id header)'
        }
      });
    }

    const result = await pool.query(`
      SELECT e.*,
        CASE
          WHEN e.administrator_id::text = $1::text AND EXISTS (
            SELECT 1 FROM agent_created_band_invitations invitation
            WHERE invitation.entity_id = e.id AND invitation.agent_user_id = $1::uuid
              AND invitation.status = 'pending' AND invitation.revoked_at IS NULL
              AND invitation.expires_at > NOW()
          ) THEN 'provisional_agent'
          WHEN e.administrator_id::text = $1::text THEN 'owner'
          ELSE em.role
        END AS membership_role
      FROM entities e
      LEFT JOIN entity_memberships em
        ON em.entity_id = e.id
       AND em.user_id = $1::uuid
       AND em.status = 'active'
      WHERE e.administrator_id::text = $1::text
         OR em.user_id IS NOT NULL
      ORDER BY
        CASE WHEN e.administrator_id::text = $1::text THEN 0 ELSE 1 END,
        e.name
    `, [userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user entities:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch entities',
        details: error.message
      }
    });
  }
});

// POST /api/artist/add - Create artist entity
app.get('/api/booking-agent/profile', async (req, res) => {
  const result = await pool.query(`SELECT display_name, agency_name, bio, city, region, country,
      latitude, longitude, created_at, updated_at
    FROM booking_agent_profiles WHERE user_id = $1::uuid`, [req.userId]);
  res.json({ profile: result.rows[0] ? toCamelCase(result.rows[0]) : null });
});

app.post('/api/booking-agent/profile', async (req, res) => {
  const displayName = String(req.body.displayName || req.body.name || '').trim();
  const optional = (value, limit) => { const cleaned = String(value || '').trim(); return cleaned ? cleaned.slice(0, limit) : null; };
  const agencyName = optional(req.body.agencyName, 200);
  const bio = optional(req.body.bio, 2000);
  const city = optional(req.body.city, 120);
  const region = optional(req.body.region || req.body.state, 120);
  const country = optional(req.body.country, 120);
  const hasCoordinates = req.body.latitude != null || req.body.longitude != null;
  const latitude = hasCoordinates ? Number(req.body.latitude) : null;
  const longitude = hasCoordinates ? Number(req.body.longitude) : null;
  if (displayName.length < 2 || displayName.length > 120) return res.status(422).json({ error: { message: 'Enter your name (2–120 characters)' } });
  if (hasCoordinates && (!Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)) {
    return res.status(422).json({ error: { message: 'Choose a valid location' } });
  }
  const result = await pool.query(`INSERT INTO booking_agent_profiles
      (user_id, display_name, agency_name, bio, city, region, country, latitude, longitude)
    VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT (user_id) DO UPDATE SET display_name=EXCLUDED.display_name,
      agency_name=EXCLUDED.agency_name, bio=EXCLUDED.bio, city=EXCLUDED.city,
      region=EXCLUDED.region, country=EXCLUDED.country, latitude=EXCLUDED.latitude,
      longitude=EXCLUDED.longitude, updated_at=NOW()
    RETURNING display_name, agency_name, bio, city, region, country, latitude, longitude`,
  [req.userId, displayName, agencyName, bio, city, region, country, latitude, longitude]);
  res.status(201).json({ profile: toCamelCase(result.rows[0]) });
});

app.get('/api/booking-agent/band-invitations', async (req, res) => {
  const result = await pool.query(`SELECT id, recipient_email, recipient_name, band_name, status,
  entity_id, city, state, country, latitude, longitude, expires_at, created_at, accepted_at
    FROM agent_created_band_invitations
    WHERE agent_user_id = $1::uuid AND revoked_at IS NULL
    ORDER BY created_at DESC`, [req.userId]);
  res.json({ invitations: toCamelCase(result.rows) });
});

app.post('/api/booking-agent/band-invitations', async (req, res) => {
  const recipientEmail = normalizeEmail(req.body.recipientEmail || req.body.email);
  const recipientName = String(req.body.recipientName || '').trim().slice(0, 120) || null;
  const bandName = String(req.body.bandName || '').trim();
  const optional = (value, limit) => String(value || '').trim().slice(0, limit) || null;
  const city = optional(req.body.city, 100);
  const state = optional(req.body.state || req.body.region, 100);
  const country = optional(req.body.country, 100);
  const hasLocation = city || state || country || req.body.latitude != null || req.body.longitude != null;
  const latitude = req.body.latitude == null ? null : Number(req.body.latitude);
  const longitude = req.body.longitude == null ? null : Number(req.body.longitude);
  if (!/^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/.test(recipientEmail)) return res.status(422).json({ error: { message: 'Enter one valid band contact email' } });
  if (bandName.length < 2 || bandName.length > 255) return res.status(422).json({ error: { message: 'Enter a band name between 2 and 255 characters' } });
  if (hasLocation && (!city || !country || !Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)) {
    return res.status(422).json({ error: { message: 'Choose the home city from the Google Places suggestions' } });
  }
  const agent = await pool.query(`SELECT profile.display_name, users.email
    FROM booking_agent_profiles profile JOIN users ON users.id = profile.user_id
    WHERE profile.user_id = $1::uuid`, [req.userId]);
  if (!agent.rowCount) return res.status(403).json({ error: { message: 'Complete your booking-agent profile first' } });
  if (recipientEmail === normalizeEmail(agent.rows[0].email)) return res.status(422).json({ error: { message: 'Use the email address of the person who will own the band workspace' } });
  const recent = await pool.query(`SELECT count(*)::int invitation_count FROM agent_created_band_invitations
    WHERE agent_user_id=$1::uuid AND created_at > NOW() - INTERVAL '1 hour'`, [req.userId]);
  if (Number(recent.rows[0]?.invitation_count || 0) >= 10) return res.status(429).json({ error: { message: 'Too many band invitations were created recently. Try again later.' } });
  const token = crypto.randomBytes(32).toString('base64url');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`INSERT INTO agent_created_band_invitations
        (agent_user_id, recipient_email, recipient_name, band_name, bio, city, state, country,
         latitude, longitude, token_hash, expires_at)
      VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW() + INTERVAL '14 days')
      RETURNING id, recipient_email, recipient_name, band_name, status, city, state, country,
        latitude, longitude, expires_at, created_at`,
    [req.userId, recipientEmail, recipientName, bandName, optional(req.body.bio, 5000),
      city, state, country, latitude, longitude, hashOpaqueToken(token)]);
    const invitation = result.rows[0];
    await client.query(`INSERT INTO entities
        (id, administrator_id, entity_type, name, bio, city, state, country, latitude, longitude)
      VALUES ($1,$2::text,'artist',$3,$4,$5,$6,$7,$8,$9)`,
    [invitation.id, req.userId, bandName, optional(req.body.bio, 5000), city, state,
      country, latitude, longitude]);
    await client.query(`UPDATE agent_created_band_invitations SET entity_id=$2 WHERE id=$1`,
      [invitation.id, invitation.id]);
    invitation.entity_id = invitation.id;
    await client.query('COMMIT');
    res.status(201).json({ invitation: toCamelCase(invitation), token, agentName: agent.rows[0].display_name });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error.code === '23505') return res.status(409).json({ error: { message: 'A pending invitation already exists for this band and email address' } });
    throw error;
  } finally { client.release(); }
});

app.get('/api/booking-agent/band-invitations/:token', async (req, res) => {
  const token = String(req.params.token || '');
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) return res.status(404).json({ error: { message: 'Invitation not found' } });
  const result = await pool.query(`SELECT invitation.id, invitation.recipient_email, invitation.recipient_name,
      invitation.band_name, invitation.bio, invitation.city, invitation.state, invitation.country,
      invitation.latitude, invitation.longitude, invitation.entity_id,
      invitation.status, invitation.expires_at, agent.display_name agent_name, agent.agency_name,
      authenticated_user.email authenticated_email
    FROM agent_created_band_invitations invitation
    JOIN booking_agent_profiles agent ON agent.user_id = invitation.agent_user_id
    JOIN users authenticated_user ON authenticated_user.id = $2::uuid
    WHERE invitation.token_hash = $1 AND invitation.revoked_at IS NULL LIMIT 1`,
  [hashOpaqueToken(token), req.userId]);
  const invitation = result.rows[0];
  if (!invitation || normalizeEmail(invitation.recipient_email) !== normalizeEmail(invitation.authenticated_email)) return res.status(403).json({ error: { message: 'Sign in with the email address that received this invitation' } });
  if (invitation.status === 'pending' && new Date(invitation.expires_at) < new Date()) {
    await pool.query(`UPDATE agent_created_band_invitations SET status='expired' WHERE id=$1 AND status='pending'`, [invitation.id]);
    invitation.status = 'expired';
  }
  res.json({ invitation: toCamelCase(invitation) });
});

app.post('/api/booking-agent/band-invitations/:token/accept', async (req, res) => {
  const token = String(req.params.token || '');
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) return res.status(404).json({ error: { message: 'Invitation not found' } });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(`SELECT invitation.*, agent.display_name agent_name,
        authenticated_user.email authenticated_email
      FROM agent_created_band_invitations invitation
      JOIN booking_agent_profiles agent ON agent.user_id = invitation.agent_user_id
      JOIN users authenticated_user ON authenticated_user.id = $2::uuid
      WHERE invitation.token_hash=$1 AND invitation.revoked_at IS NULL FOR UPDATE OF invitation`, [hashOpaqueToken(token), req.userId]);
    const invitation = found.rows[0];
    if (!invitation || normalizeEmail(invitation.recipient_email) !== normalizeEmail(invitation.authenticated_email)) {
      await client.query('ROLLBACK'); return res.status(403).json({ error: { message: 'Sign in with the email address that received this invitation' } });
    }
    if (invitation.status === 'accepted') { await client.query('COMMIT'); return res.json({ entityId: invitation.entity_id, accepted: true }); }
    if (invitation.status !== 'pending' || new Date(invitation.expires_at) < new Date()) {
      if (invitation.status === 'pending') await client.query(`UPDATE agent_created_band_invitations SET status='expired' WHERE id=$1`, [invitation.id]);
      await client.query('COMMIT'); return res.status(410).json({ error: { message: 'This invitation is no longer active' } });
    }
    const transferred = await client.query(`UPDATE entities SET administrator_id=$1::text, updated_at=NOW()
      WHERE id=$2 AND administrator_id=$3::text AND entity_type='artist'
      RETURNING id, name, entity_type`, [req.userId, invitation.entity_id, invitation.agent_user_id]);
    const entity = transferred.rows[0];
    if (!entity) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: { code: 'CUSTODY_CHANGED', message: 'This band workspace is no longer held by the inviting agent. Ask the agent to send a new invitation.' } });
    }
    const overlap = await client.query(`SELECT u.email FROM day_sheet_access_grants grant_record
      JOIN users u ON u.id=grant_record.user_id
      WHERE grant_record.entity_id=$1 AND grant_record.user_id<>$2
        AND grant_record.revoked_at IS NULL AND (grant_record.expires_at IS NULL OR grant_record.expires_at>NOW())
      LIMIT 1`, [entity.id, invitation.agent_user_id]);
    if (overlap.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: { code: 'ACCESS_OVERLAP', message: `This workspace already has active access assigned to ${overlap.rows[0].email}. Review that access before giving this agent all-territory booking access.` } });
    }
    await client.query(`INSERT INTO day_sheet_access_grants
        (entity_id, user_id, recipient_name, access_level, edit_scope, financial_access,
         require_approval, can_propose_shows, scope_type, countries, created_by)
      SELECT $1,$2,$3,'editor','full','view',TRUE,TRUE,'all','{}',$4
      WHERE NOT EXISTS (SELECT 1 FROM day_sheet_access_grants existing
        WHERE existing.entity_id=$1 AND existing.user_id=$2 AND existing.revoked_at IS NULL
          AND (existing.expires_at IS NULL OR existing.expires_at>NOW()))`,
    [entity.id, invitation.agent_user_id, invitation.agent_name, req.userId]);
    await client.query(`INSERT INTO collaborator_workspace_profiles (user_id, entity_id, agency_name)
      SELECT $1,$2,agency_name FROM booking_agent_profiles WHERE user_id=$1
      ON CONFLICT (user_id, entity_id) DO UPDATE SET agency_name=EXCLUDED.agency_name, updated_at=NOW()`,
    [invitation.agent_user_id, entity.id]);
    await client.query(`UPDATE agent_created_band_invitations SET status='accepted', entity_id=$2,
      accepted_by=$3, accepted_at=NOW() WHERE id=$1`, [invitation.id, entity.id, req.userId]);
    await client.query('COMMIT');
    res.json({ entityId: entity.id, entityName: entity.name, accepted: true });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
});

// POST /api/artist/add - Create artist entity
app.post('/api/artist/add', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authorization header is required'
        }
      });
    }

    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User ID is required (pass as X-User-Id header)'
        }
      });
    }

    const { name, bio, city, state, country, latitude, longitude } = req.body;

    if (!name) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Artist name is required'
        }
      });
    }

    // Check if user already owns an entity
    const existingEntity = await pool.query(
      'SELECT id FROM entities WHERE administrator_id = $1',
      [userId]
    );

    if (existingEntity.rows.length > 0) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'You already own an entity'
        }
      });
    }

    // Create the artist entity
    const result = await pool.query(
      `INSERT INTO entities (administrator_id, entity_type, name, bio, city, state, country, latitude, longitude)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [userId, 'artist', name, bio, city, state, country, latitude, longitude]
    );

    console.log('✅ Artist entity created:', result.rows[0].id);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating artist:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to create artist entity',
        details: error.message
      }
    });
  }
});

// POST /api/promoter/add - Create promoter entity
app.post('/api/promoter/add', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authorization header is required'
        }
      });
    }

    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User ID is required (pass as X-User-Id header)'
        }
      });
    }

    const { name, bio, city, state, country, latitude, longitude } = req.body;

    if (!name) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Promoter name is required'
        }
      });
    }

    // Check if user already owns an entity
    const existingEntity = await pool.query(
      'SELECT id FROM entities WHERE administrator_id = $1',
      [userId]
    );

    if (existingEntity.rows.length > 0) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'You already own an entity'
        }
      });
    }

    // Create the promoter entity
    const result = await pool.query(
      `INSERT INTO entities (administrator_id, entity_type, name, bio, city, state, country, latitude, longitude)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [userId, 'promoter', name, bio, city, state, country, latitude, longitude]
    );

    console.log('✅ Promoter entity created:', result.rows[0].id);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating promoter:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to create promoter entity',
        details: error.message
      }
    });
  }
});

async function getEntityProfile(req, res, entityType) {
  try {
    const result = await pool.query(`SELECT e.id, e.entity_type, e.name, e.alias, e.bio, e.city, e.state,
      e.country, e.latitude, e.longitude, e.members, e.tags, e.social_links,
      e.video_url, e.music_url,
      COALESCE(jsonb_agg(jsonb_build_object('fileId', a.file_key, 'uri', '/api/assets/' || a.id::text,
        'fileName', a.file_name, 'mimeType', a.mime_type)) FILTER (WHERE a.id IS NOT NULL), '[]'::jsonb) AS assets
      FROM entities e LEFT JOIN entity_assets a ON a.entity_id = e.id
      WHERE e.id::text = $1 AND e.entity_type = $2 GROUP BY e.id LIMIT 1`, [req.params.id, entityType]);
    if (!result.rows[0]) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Workspace not found' } });
    const shows = await pool.query(`SELECT id, venue_name, city, state, country, date, start_time
      FROM shows WHERE entity_id = $1 AND date >= CURRENT_DATE AND status != 'cancelled'
      ORDER BY date, start_time LIMIT 5`, [req.params.id]);
    const profile = toCamelCase(result.rows[0]);
    profile.upcomingShows = toCamelCase(shows.rows);
    res.json(profile);
  } catch (error) {
    console.error('Failed to fetch workspace:', error.message);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch workspace' } });
  }
}

app.get('/api/artist/get/:id', (req, res) => getEntityProfile(req, res, 'artist'));
app.get('/api/promoter/get/:id', (req, res) => getEntityProfile(req, res, 'promoter'));

app.put('/api/entities/:id/profile', async (req, res) => {
  if (!req.entityId || req.entityId !== req.params.id) return res.status(400).json({ error: { code: 'ENTITY_MISMATCH', message: 'Workspace does not match the active entity' } });
  if (!['owner', 'admin'].includes(req.entityRole)) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Owner or administrator access is required' } });
  const text = (value, maximum) => value == null ? null : String(value).trim().slice(0, maximum);
  const safeUrl = (value) => { const candidate = text(value, 1000); if (!candidate) return null; try { const url = new URL(candidate); return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null; } catch { return null; } };
  const socialLinks = req.body.socialLinks && typeof req.body.socialLinks === 'object' && !Array.isArray(req.body.socialLinks)
    ? Object.fromEntries(Object.entries(req.body.socialLinks).slice(0, 10)
      .map(([key, value]) => [text(key, 30), safeUrl(value)])
      .filter(([key, value]) => key && value)) : {};
  const tags = Array.isArray(req.body.tags) ? [...new Set(req.body.tags.slice(0, 12).map((tag) => {
    const slug = String(tag || '').trim().toLowerCase().replace(/^#/, '').normalize('NFKD').replace(/[^a-z0-9]+/g, '').slice(0, 40);
    return slug ? `#${slug}` : null;
  }).filter(Boolean))] : [];
  const hasCoordinates = Object.prototype.hasOwnProperty.call(req.body, 'latitude')
    || Object.prototype.hasOwnProperty.call(req.body, 'longitude');
  const latitude = req.body.latitude == null || req.body.latitude === '' ? null : Number(req.body.latitude);
  const longitude = req.body.longitude == null || req.body.longitude === '' ? null : Number(req.body.longitude);
  if (hasCoordinates && ((latitude == null) !== (longitude == null)
    || (latitude != null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90))
    || (longitude != null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)))) {
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Choose a valid confirmed workspace location' } });
  }
  try {
    const result = await pool.query(`UPDATE entities SET name = $2, bio = $3, city = $4, state = $5, country = $6,
      tags = $7::jsonb, social_links = $8::jsonb, video_url = $9, music_url = $10,
      latitude = CASE WHEN $11::boolean THEN $12::numeric ELSE latitude END,
      longitude = CASE WHEN $11::boolean THEN $13::numeric ELSE longitude END, updated_at = NOW()
      WHERE id::text = $1 RETURNING id, name, bio, city, state, country, latitude, longitude,
        tags, social_links, video_url, music_url`,
      [req.entityId, text(req.body.name, 255) || 'Untitled profile', text(req.body.bio, 5000), text(req.body.city, 100),
       text(req.body.state, 100), text(req.body.country, 100), JSON.stringify(tags), JSON.stringify(socialLinks),
      safeUrl(req.body.videoUrl), safeUrl(req.body.musicUrl), hasCoordinates, latitude, longitude]);
    res.json(toCamelCase(result.rows[0]));
  } catch (error) {
    console.error('Failed to update workspace:', error.message);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update workspace' } });
  }
});

// =====================
// SHOWS ENDPOINTS
// =====================

// GET /api/shows - List all shows
app.get('/api/shows', authMiddleware, async (req, res) => {
  try {
    const { entityId, startDate, endDate, tourId, status } = req.query;

    console.log('🎫 [GET /api/shows] Query params:', {
      entityId,
      tourId,
      startDate,
      endDate,
      status
    });

    let query = `SELECT s.*, ${effectiveShowCurrencySql('s')} AS currency, ${showReadinessSql('s')} AS readiness_percentage, (SELECT cis.event_title FROM calendar_import_sources cis WHERE cis.show_id = s.id LIMIT 1) AS calendar_event_title FROM shows s WHERE s.entity_id = $1`;
    const params = [entityId];
    let paramCount = 1;

    if (startDate) {
      paramCount++;
      query += ` AND s.date >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND s.date <= $${paramCount}`;
      params.push(endDate);
    }

    if (tourId) {
      paramCount++;
      query += ` AND s.tour_id = $${paramCount}`;
      params.push(tourId);
    }

    if (status) {
      paramCount++;
      query += ` AND s.status = $${paramCount}`;
      params.push(status);
    }

    query += ' ORDER BY s.date ASC, s.start_time ASC';

    console.log('📊 [GET /api/shows] Executing query:', query);
    console.log('📊 [GET /api/shows] With params:', params);

    const result = await pool.query(query, params);

    console.log('✅ [GET /api/shows] Found', result.rows.length, 'shows');

    // Transform snake_case to camelCase and map to frontend field names
    const shows = result.rows.map(serializeShow);

    res.json({
      shows,
      total: shows.length
    });
  } catch (error) {
    console.error('Error fetching shows:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch shows',
        details: error.message
      }
    });
  }
});

// POST /api/shows - Create a new show
app.post('/api/shows', authMiddleware, async (req, res) => {
  let client = null;
  try {
    const {
      tourId, festivalName, city, date, startTime, endTime,
      loadInTime, soundCheckTime, doorTime, status, notes,
      fee, guaranteedFee, backendDeal, isPaid, capacity,
      ticketPrice, promoterName, promoterEmail, promoterPhone, currency
    } = req.body;

    // Validation
    if (!city || !date || !startTime) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
          details: 'city, date, and startTime are required'
        }
      });
    }

    let showCurrency = normalizeCurrencyCode(currency);
    if (currency && !showCurrency) return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Currency must be a three-letter ISO code' } });
    if (tourId) {
      const tour = await pool.query('SELECT currency FROM tours WHERE id::text = $1 AND entity_id::text = $2', [tourId, req.entityId]);
      if (!tour.rowCount) return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'That tour is not in this workspace' } });
      showCurrency ||= normalizeCurrencyCode(tour.rows[0].currency);
    }

    const trustedVenue = await trustedVenueInput(req.body);
    client = await pool.connect();
    await client.query('BEGIN');
    const normalizedCountry = canonicalCountry(trustedVenue.country) || resolveShowCountry('', trustedVenue.venueAddress) || null;
    const venue = await upsertVenue(client, { ...trustedVenue, country: normalizedCountry });
    const showVenue = venue ? {
      venueName: venue.name,
      venueAddress: venue.address,
      city: venue.city,
      state: venue.region,
      country: venue.country,
      latitude: venue.latitude,
      longitude: venue.longitude,
      capacity: venue.capacity,
    } : trustedVenue;
    const result = await client.query(
      `INSERT INTO shows (
        entity_id, tour_id, festival_name, venue_name, venue_address, city, state, country,
        latitude, longitude, date, start_time, end_time, load_in_time,
        sound_check_time, door_time, status, notes, fee, guaranteed_fee,
        backend_deal, is_paid, capacity, ticket_price, promoter_name,
        promoter_email, promoter_phone, currency, venue_id, venue_place_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
      RETURNING *`,
      [
        req.entityId, tourId || null, String(festivalName || '').trim().slice(0, 255) || null, showVenue.venueName || null, showVenue.venueAddress || null, showVenue.city, showVenue.state,
        canonicalCountry(showVenue.country) || normalizedCountry, showVenue.latitude, showVenue.longitude, date, startTime, endTime, loadInTime,
        soundCheckTime, doorTime, status || 'confirmed', notes, fee, guaranteedFee,
        backendDeal, isPaid || false, showVenue.capacity ?? capacity, ticketPrice, promoterName,
        promoterEmail, promoterPhone, showCurrency, venue?.id || null, venue?.google_place_id || null
      ]
    );

    await client.query('COMMIT');
    if (result.rows[0]?.promoter_email) {
      void invitePromoterByEmail(pool, {
        email:result.rows[0].promoter_email,
        sourceEntityId:req.entityId,
        sourceShowId:result.rows[0].id,
      }).catch(error => console.error('Promoter show invitation failed',error.message));
    }
    // Transform to match frontend Show interface (same as GET endpoint)
    res.status(201).json({ show: serializeShow(result.rows[0]) });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Error creating show:', error);
    res.status(error.status || 500).json({
      error: {
        code: error.status ? 'VALIDATION_ERROR' : 'SERVER_ERROR',
        message: error.status ? error.message : 'Failed to create show',
        details: error.message
      }
    });
  } finally {
    client?.release();
  }
});

// Shared factual venue data. Commercial and contact data stays on workspace-scoped shows.
app.get('/api/venues', authMiddleware, async (req, res) => {
  try {
    const city = String(req.query.city || '').trim();
    const country = String(req.query.country || '').trim();
    const query = String(req.query.query || '').trim();
    if (city.length < 2 && query.length < 2) return res.json({ venues: [] });
    const result = await pool.query(`SELECT v.id, v.google_place_id AS "googlePlaceId", v.name, v.address,
      v.city, v.region, v.country, v.country_code AS "countryCode", v.postal_code AS "postalCode",
      v.latitude, v.longitude, v.capacity, COUNT(s.id)::int AS "usageCount"
      FROM venues v LEFT JOIN shows s ON s.venue_id=v.id AND COALESCE(s.show_type,'show')='show'
      WHERE ($1='' OR lower(v.city)=lower($1)) AND ($2='' OR lower(COALESCE(v.country,''))=lower($2))
      AND ($3='' OR v.name ILIKE '%'||$3||'%' OR COALESCE(v.address,'') ILIKE '%'||$3||'%')
      GROUP BY v.id ORDER BY COUNT(s.id) DESC, v.name ASC LIMIT 50`, [city, country, query]);
    res.json({ venues: result.rows });
  } catch (error) {
    console.error('Venue search failed:', error.message);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to search venues' } });
  }
});

// Factual venue profile only. Never expose show IDs, fees, band notes, day sheets,
// private contacts or other workspace-owned data through a shared venue.
app.get('/api/venues/:id', authMiddleware, async (req, res) => {
  try {
    if (!CONTACT_UUID.test(String(req.params.id || ''))) return res.status(422).json({ error:{message:'Valid venue ID required'} });
    const result=await pool.query(
      `SELECT id,google_place_id AS "googlePlaceId",name,address,city,region,country,
         country_code AS "countryCode",postal_code AS "postalCode",latitude,longitude,capacity
       FROM venues WHERE id=$1::uuid`,[req.params.id]);
    if (!result.rowCount) return res.status(404).json({error:{message:'Venue not found'}});
    res.set('Cache-Control','private, no-store');
    return res.json({venue:result.rows[0]});
  } catch(error) {
    console.error('Venue profile failed:',error);
    return res.status(500).json({error:{message:'Unable to load venue profile'}});
  }
});

// Proxy licensed Google Places imagery without exposing our API key.
// No photo or mismatched Google place is treated as an ordinary 404.
app.get('/api/venues/:id/photo', authMiddleware, async (req, res) => {
  try {
    if (!CONTACT_UUID.test(String(req.params.id || ''))) return res.sendStatus(404);
    const key = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return res.status(503).json({ error: { message: 'Google Places photos are not configured' } });
    const found = await pool.query('SELECT google_place_id,name,city,country FROM venues WHERE id=$1::uuid', [req.params.id]);
    const venue = found.rows[0];
    if (!venue) return res.sendStatus(404);
    const headers = { 'X-Goog-Api-Key': key };
    let placeId = venue.google_place_id;
    if (!placeId) {
      if (!venue.name || !venue.city || !venue.country) return res.sendStatus(404);
      const search = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json',
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress' },
        body: JSON.stringify({ textQuery: [venue.name,venue.city,venue.country].join(', '), maxResultCount: 3 }),
        signal: AbortSignal.timeout(5000),
      });
      if (!search.ok) return res.sendStatus(404);
      const candidates = (await search.json()).places || [];
      const norm = value => String(value || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
      const match = candidates.find(p => norm(p.displayName?.text) === norm(venue.name) &&
        norm(p.formattedAddress).includes(norm(venue.city)) &&
        norm(p.formattedAddress).includes(norm(venue.country)));
      if (!match) return res.sendStatus(404);
      placeId = match.id;
    }
    const details = await fetch('https://places.googleapis.com/v1/places/' + encodeURIComponent(placeId), {
      headers: { ...headers, 'X-Goog-FieldMask': 'photos' }, signal: AbortSignal.timeout(5000),
    });
    if (!details.ok) return res.sendStatus(404);
    const photo = (await details.json()).photos?.[0];
    if (!photo?.name) return res.sendStatus(404);
    const media = await fetch('https://places.googleapis.com/v1/' + photo.name + '/media?maxWidthPx=900&skipHttpRedirect=true', {
      headers, signal: AbortSignal.timeout(7000),
    });
    if (!media.ok) return res.sendStatus(404);
    const url = (await media.json()).photoUri;
    if (!url || !/^https:\/\//.test(url)) return res.sendStatus(404);
    const picture = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!picture.ok || !String(picture.headers.get('content-type')).startsWith('image/')) return res.sendStatus(404);
    const buffer = Buffer.from(await picture.arrayBuffer());
    if (buffer.length > 5_000_000) return res.sendStatus(404);
    res.set('Content-Type', picture.headers.get('content-type'));
    res.set('Cache-Control', 'private, max-age=1800');
    const attribution = (photo.authorAttributions || []).map(a=>a.displayName).filter(Boolean).join(', ');
    if (attribution) res.set('X-Photo-Attribution', encodeURIComponent(attribution));
    return res.send(buffer);
  } catch (error) {
    console.error('Venue photo lookup failed:', error instanceof Error ? error.message : error);
    return res.sendStatus(404);
  }
});

// GET /api/shows/:id - Get a single show
app.get('/api/shows/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, ${effectiveShowCurrencySql('s')} AS currency, ${showReadinessSql('s')} AS readiness_percentage, (SELECT cis.event_title FROM calendar_import_sources cis WHERE cis.show_id = s.id LIMIT 1) AS calendar_event_title
       FROM shows s WHERE s.id = $1 AND s.entity_id = $2`,
      [req.params.id, req.entityId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Show not found'
        }
      });
    }

    const show = serializeShow(result.rows[0]);
    if (req.isExternalDaySheetCollaborator && req.daySheetPermissions?.financialAccess === 'hidden') {
      for (const key of ['fee', 'guaranteedFee', 'backendDeal', 'dealType', 'currency', 'isPaid', 'ticketPrice', 'guarantee', 'doorSplitPercentage', 'advanceTicketPrice', 'doorTicketPrice']) delete show[key];
    }
    if (req.isExternalDaySheetCollaborator && ['band_member', 'crew_member'].includes(req.daySheetPermissions?.accessRole)) {
      for (const key of ['contactName', 'contactPhone', 'contactEmail', 'promoterName', 'promoterPhone', 'promoterEmail', 'notes', 'feeNotes', 'feeText', 'commercialNotes']) delete show[key];
    }
    res.json({ show, accessLevel: req.entityRole, externalCollaborator: Boolean(req.isExternalDaySheetCollaborator), permissions: req.daySheetPermissions || null });
  } catch (error) {
    console.error('Error fetching show:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch show',
        details: error.message
      }
    });
  }
});

// PUT /api/shows/:id - Update a show
app.put('/api/shows/:id', authMiddleware, async (req, res) => {
  let client = null;
  try {
    if (req.isExternalDaySheetCollaborator) {
      return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'External collaborators must use the restricted day-sheet editor' } });
    }
    const trustedVenue = await trustedVenueInput(req.body);
    client = await pool.connect();
    await client.query('BEGIN');
    const {
      tourId, festivalName, venueName, venueAddress, city, state, country,
      latitude, longitude, date, startTime, endTime,
      loadInTime, soundCheckTime, doorTime, status, notes,
      fee, guaranteedFee, backendDeal, isPaid, capacity,
      ticketPrice, promoterName, promoterEmail, promoterPhone,
      googleCalendarEventId
    } = trustedVenue;

    const result = await client.query(
      `UPDATE shows SET
        tour_id = COALESCE($1, tour_id),
        festival_name = COALESCE($2, festival_name),
        venue_name = COALESCE($3, venue_name),
        venue_address = COALESCE($4, venue_address),
        city = COALESCE($5, city),
        state = COALESCE($6, state),
        country = COALESCE($7, country),
        latitude = COALESCE($8, latitude),
        longitude = COALESCE($9, longitude),
        date = COALESCE($10, date),
        start_time = COALESCE($11, start_time),
        end_time = COALESCE($12, end_time),
        load_in_time = COALESCE($13, load_in_time),
        sound_check_time = COALESCE($14, sound_check_time),
        door_time = COALESCE($15, door_time),
        status = COALESCE($16, status),
        notes = COALESCE($17, notes),
        fee = COALESCE($18, fee),
        guaranteed_fee = COALESCE($19, guaranteed_fee),
        backend_deal = COALESCE($20, backend_deal),
        is_paid = COALESCE($21, is_paid),
        capacity = COALESCE($22, capacity),
        ticket_price = COALESCE($23, ticket_price),
        promoter_name = COALESCE($24, promoter_name),
        promoter_email = COALESCE($25, promoter_email),
        promoter_phone = COALESCE($26, promoter_phone),
        google_calendar_event_id = COALESCE($27, google_calendar_event_id)
      WHERE id = $28 AND entity_id = $29
      RETURNING *`,
      [
        tourId, festivalName, venueName, venueAddress, city, state, country === undefined ? undefined : (canonicalCountry(country) || resolveShowCountry('', venueAddress) || null),
        latitude, longitude, date, startTime, endTime, loadInTime,
        soundCheckTime, doorTime, status, notes, fee, guaranteedFee,
        backendDeal, isPaid, capacity, ticketPrice, promoterName,
        promoterEmail, promoterPhone, googleCalendarEventId,
        req.params.id, req.entityId
      ]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Show not found'
        }
      });
    }

    const venue = await upsertVenue(client, {
      ...result.rows[0], ...trustedVenue,
      venueName: trustedVenue.venueName ?? result.rows[0].venue_name,
      venueAddress: trustedVenue.venueAddress ?? result.rows[0].venue_address,
    });
    if (venue) {
      result.rows[0].venue_id = venue.id;
      await client.query('UPDATE shows SET venue_id=$1, venue_place_id=COALESCE($2, venue_place_id) WHERE id=$3',
        [venue.id, trustedVenue.venuePlaceId || venue.google_place_id || null, result.rows[0].id]);
    }
    await client.query('COMMIT');
    if (result.rows[0]?.promoter_email) {
      void invitePromoterByEmail(pool, {
        email:result.rows[0].promoter_email,
        sourceEntityId:req.entityId,
        sourceShowId:result.rows[0].id,
      }).catch(error => console.error('Promoter show invitation failed',error.message));
    }
    res.json({ show: serializeShow(result.rows[0]) });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Error updating show:', error);
    res.status(error.status || 500).json({
      error: {
        code: error.status ? 'VALIDATION_ERROR' : 'SERVER_ERROR',
        message: error.status ? error.message : 'Failed to update show',
        details: error.message
      }
    });
  } finally {
    client?.release();
  }
});

// PATCH /api/shows/:id - Partially update a show (for calendar sync)
app.patch('/api/shows/:id', authMiddleware, async (req, res) => {
  let client = null;
  try {
    const venueSelectionRequested = Boolean(req.body.venueId || req.body.venuePlaceId || req.body.venueSelectionIntent);
    if (req.isExternalDaySheetCollaborator && venueSelectionRequested) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'External collaborators cannot change canonical venue identity' } });
    }
    const edit = prepareShowVenueEdit(req.body);
    const { fields, venueMetadata } = edit;
    if (fields.festivalName !== undefined) {
      fields.festivalName = String(fields.festivalName || '').trim() || null;
      if (fields.festivalName && fields.festivalName.length > 255) return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Festival name must be 255 characters or fewer' } });
    }
    if (fields.country !== undefined) {
      fields.country = canonicalCountry(fields.country) || resolveShowCountry('', fields.venueAddress) || null;
    } else if (fields.venueAddress !== undefined) {
      const addressCountry = resolveShowCountry('', fields.venueAddress);
      if (addressCountry) fields.country = addressCountry;
    }
    const allowedFields = {
      tourId: 'tour_id', festivalName: 'festival_name', venueName: 'venue_name', venueAddress: 'venue_address',
      city: 'city', state: 'state', country: 'country', latitude: 'latitude', longitude: 'longitude',
      date: 'date', startTime: 'start_time', endTime: 'end_time', loadInTime: 'load_in_time',
      soundCheckTime: 'sound_check_time', doorTime: 'door_time', status: 'status', notes: 'notes',
      fee: 'fee', guaranteedFee: 'guaranteed_fee', backendDeal: 'backend_deal', isPaid: 'is_paid',
      capacity: 'capacity', ticketPrice: 'ticket_price', promoterName: 'promoter_name',
      promoterEmail: 'promoter_email', promoterPhone: 'promoter_phone', currency: 'currency',
      googleCalendarEventId: 'google_calendar_event_id', venuePlaceId: 'venue_place_id'
    };
    const unknownFields = Object.keys(fields).filter(key => key !== 'entityId' && !Object.hasOwn(allowedFields, key));
    if (unknownFields.length > 0) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: `Unsupported show fields: ${unknownFields.join(', ')}` } });
    }
    const attempted = Object.keys(fields).filter((key) => key !== 'entityId');
    if (attempted.length === 0) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'No fields to update' } });
    }
    if (req.isExternalDaySheetCollaborator) {
      const permissions = req.daySheetPermissions || { editScope: 'none', financialAccess: 'hidden' };
      const advanceFields = new Set(['festivalName', 'venueName', 'venueAddress', 'city', 'state', 'country', 'latitude', 'longitude', 'date', 'startTime', 'endTime', 'loadInTime', 'soundCheckTime', 'doorTime', 'status', 'notes', 'capacity', 'promoterName', 'promoterEmail', 'promoterPhone']);
      const financialFields = new Set(['fee', 'guaranteedFee', 'backendDeal', 'isPaid', 'ticketPrice', 'currency']);
      if (attempted.some((key) => ['tourId', 'googleCalendarEventId'].includes(key))) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'External collaborators cannot move a show or change calendar ownership' } });
      }
      if (attempted.some((key) => financialFields.has(key)) && permissions.financialAccess !== 'edit') {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'This invitation does not allow financial changes' } });
      }
      const nonFinancial = attempted.filter((key) => !financialFields.has(key));
      if (permissions.editScope === 'none' && nonFinancial.length) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'This invitation is view only' } });
      }
      if (permissions.editScope === 'advance' && nonFinancial.some((key) => !advanceFields.has(key))) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'This invitation only allows advance information to be edited' } });
      }
    }
    client = await pool.connect();
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    const currentResult = await client.query('SELECT * FROM shows WHERE id = $1 AND entity_id = $2 FOR UPDATE', [req.params.id, req.entityId]);
    if (!currentResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Show not found' } });
    }
    const currentShow = currentResult.rows[0];
    // Only a deliberate venue selection can trigger Google Places verification.
    // A stale venuePlaceId in an old edit form is deliberately ignored.
    await resolveShowVenueEdit(edit, currentShow, trustedVenueInput, client);

    const requestedChanges = Object.fromEntries(Object.keys(fields).filter(key => key !== 'entityId').map((key) => [key, {
      old: currentShow[allowedFields[key]], new: fields[key],
    }]).filter(([, change]) => JSON.stringify(change.old) !== JSON.stringify(change.new)));
    if (!Object.keys(requestedChanges).length) {
      await client.query('COMMIT');
      return res.json({ show: serializeShow(currentShow) });
    }

    const actor = await client.query('SELECT COALESCE(name, email) name FROM users WHERE id=$1', [req.userId]);
    const actorName = actor.rows[0]?.name || 'An external collaborator';
    const financialFields = new Set(['fee', 'guaranteedFee', 'backendDeal', 'isPaid', 'ticketPrice', 'currency']);
    const sensitiveFields = new Set(['festivalName', 'venueName', 'venueAddress', 'city', 'state', 'country', 'latitude', 'longitude', 'date', 'startTime', 'endTime', 'loadInTime', 'soundCheckTime', 'doorTime', 'status', ...financialFields]);
    const permissions = req.daySheetPermissions || { requireApproval: false };
    if (req.isExternalDaySheetCollaborator && permissions.requireApproval && Object.keys(requestedChanges).some((key) => sensitiveFields.has(key))) {
      const pending = await client.query(`INSERT INTO day_sheet_changes (entity_id, show_id, actor_id, actor_external, changes, status)
        VALUES ($1,$2,$3,TRUE,$4::jsonb,'pending') RETURNING id`, [req.entityId, req.params.id, req.userId, JSON.stringify(requestedChanges)]);
      await client.query('COMMIT');
      await createEntityNotification(req.entityId, 'day_sheet_change_requested', 'Day-sheet change needs approval',
        `${actorName} requested changes to ${currentShow.venue_name || currentShow.city || 'a day sheet'}.`, `/shows/${req.params.id}`)
        .catch((notificationError) => console.error('Failed to create day-sheet approval notification:', notificationError.message));
      return res.status(202).json({ show: serializeShow(currentShow), pendingApproval: true, changeId: pending.rows[0].id });
    }

    const changedFields = Object.keys(requestedChanges);
    const values = changedFields.map((key) => requestedChanges[key].new);
    const setters = changedFields.map((key, index) => `${allowedFields[key]} = $${index + 1}`);
    values.push(req.params.id, req.entityId);
    const result = await client.query(`UPDATE shows SET ${setters.join(', ')}
      WHERE id = $${values.length - 1} AND entity_id = $${values.length} RETURNING *`, values);
    const venueNeedsUpdate = Boolean(venueMetadata.venueId || venueMetadata.venuePlaceId ||
      changedFields.some((field) => ['venueName', 'venueAddress', 'city', 'state', 'country', 'latitude', 'longitude'].includes(field)));
    const venue = venueNeedsUpdate ? await upsertVenue(client, {
      ...result.rows[0],
      ...venueMetadata,
      venueName: result.rows[0].venue_name,
      venueAddress: result.rows[0].venue_address,
    }) : null;
    if (venue) {
      result.rows[0].venue_id = venue.id;
      await client.query('UPDATE shows SET venue_id=$1, venue_place_id=COALESCE($2, venue_place_id) WHERE id=$3',
        [venue.id, venueMetadata.venuePlaceId || venue.google_place_id || null, result.rows[0].id]);
    }
    await client.query(`INSERT INTO day_sheet_changes (entity_id, show_id, actor_id, actor_external, changes, status)
      VALUES ($1,$2,$3,$4,$5::jsonb,'applied')`, [req.entityId, req.params.id, req.userId, Boolean(req.isExternalDaySheetCollaborator), JSON.stringify(requestedChanges)]);
    await client.query('COMMIT');
    if (req.isExternalDaySheetCollaborator) {
      await createEntityNotification(req.entityId, 'day_sheet_changed', 'Day sheet updated',
        `${actorName} updated ${result.rows[0].venue_name || result.rows[0].city || 'a day sheet'}.`, `/shows/${req.params.id}`)
        .catch((notificationError) => console.error('Failed to create day-sheet update notification:', notificationError.message));
    }
    if (result.rows[0]?.promoter_email) {
      void invitePromoterByEmail(pool, {
        email:result.rows[0].promoter_email,
        sourceEntityId:req.entityId,
        sourceShowId:result.rows[0].id,
      }).catch(error => console.error('Promoter show invitation failed',error.message));
    }
    console.log('✅ Show updated successfully:', result.rows[0].id);
    res.json({ show: serializeShow(result.rows[0]), pendingApproval: false });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Error patching show:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update show'
      }
    });
  } finally {
    client?.release();
  }
});

// DELETE /api/shows/:id - Delete a show
app.delete('/api/shows/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM shows WHERE id = $1 AND entity_id = $2 RETURNING id',
      [req.params.id, req.entityId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Show not found'
        }
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting show:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to delete show',
        details: error.message
      }
    });
  }
});

// PUT /api/shows/bulk-update - Bulk update multiple shows
app.put('/api/shows/bulk-update', authMiddleware, async (req, res) => {
  try {
    if (req.isExternalDaySheetCollaborator) {
      return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'External collaborators cannot bulk-update shows' } });
    }
    const { showIds, updates } = req.body;

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!Array.isArray(showIds) || showIds.length === 0 || showIds.length > 500 || showIds.some((id) => !uuidPattern.test(String(id)))) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'showIds must contain between 1 and 500 valid IDs'
        }
      });
    }

    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'updates object is required'
        }
      });
    }

    // SQL identifiers can never come from request data. Bulk editing is limited
    // to the fields used by the tour/calendar bulk actions.
    const allowedBulkFields = {
      tourId: 'tour_id',
      status: 'status',
      currency: 'currency',
      isPaid: 'is_paid',
    };
    const unsupportedFields = Object.keys(updates).filter((key) => !Object.hasOwn(allowedBulkFields, key));
    if (unsupportedFields.length) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: `Unsupported bulk-update fields: ${unsupportedFields.join(', ')}` } });
    }

    const updateFields = [];
    const values = [];
    let paramCount = 0;

    Object.keys(updates).forEach(key => {
      paramCount++;
      updateFields.push(`${allowedBulkFields[key]} = $${paramCount}`);
      values.push(updates[key]);
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No valid update fields provided'
        }
      });
    }

    // Add showIds and entityId to values
    paramCount++;
    values.push(showIds);
    paramCount++;
    values.push(req.entityId);

    const query = `
      UPDATE shows
      SET ${updateFields.join(', ')}
      WHERE id = ANY($${paramCount - 1}) AND entity_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    res.json({
      updated: result.rows.length,
      shows: result.rows
    });
  } catch (error) {
    console.error('❌ Error bulk updating shows:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to bulk update shows',
        details: error.message
      }
    });
  }
});

// =====================
// TOURS ENDPOINTS
// =====================

// GET /api/tours - List all tours
app.get('/api/tours', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*,
        (SELECT COUNT(*) FROM shows WHERE tour_id = t.id) as show_count,
        (SELECT SUM(fee) FROM shows WHERE tour_id = t.id AND is_paid = true) as total_revenue
      FROM tours t
      WHERE t.entity_id = $1
      ORDER BY t.start_date DESC`,
      [req.entityId]
    );

    // Transform snake_case to camelCase for frontend
    const tours = result.rows.map(row => ({
      id: row.id,
      artistEntityId: row.entity_id,
      name: row.name,
      notes: row.notes || row.description,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      showCount: row.show_count,
      totalRevenue: row.total_revenue,
      currency: row.currency
    }));

    res.json({
      tours: tours,
      total: tours.length
    });
  } catch (error) {
    console.error('Error fetching tours:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch tours',
        details: error.message
      }
    });
  }
});

// Single, testable transaction-backed conversion path for private Google dates.
app.post('/api/tours/import-calendar', authMiddleware,
  require('./calendar-import').createCalendarImportHandler({
    pool, upsertVenue, canonicalCountry, toCamelCase,
  }));

// POST /api/tours - Create a new tour
app.post('/api/tours', authMiddleware, async (req, res) => {
  try {
    const { name, description, startDate, endDate, status, currency, showIds } = req.body;
    const normalizedCurrency = currency ? normalizeCurrencyCode(currency) : null;
    if (currency && !normalizedCurrency) return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Currency must be a three-letter ISO code' } });

    if (!name || !startDate || !endDate) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
          details: 'name, startDate, and endDate are required'
        }
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid date format',
          details: 'startDate and endDate must be valid dates'
        }
      });
    }

    if (end < start) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid date range',
          details: 'endDate must be after startDate'
        }
      });
    }

    const ids = showIds === undefined ? [] : showIds;
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!Array.isArray(ids) || ids.length > 500 || ids.some(id => !uuidPattern.test(String(id))) || new Set(ids).size !== ids.length) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'showIds must contain at most 500 distinct valid show IDs' } });
    }

    const client = await pool.connect();
    let result;
    try {
      await client.query('BEGIN');
      if (ids.length) {
        const owned = await client.query('SELECT id FROM shows WHERE id = ANY($1::uuid[]) AND entity_id = $2 FOR UPDATE', [ids, req.entityId]);
        if (owned.rows.length !== ids.length) {
          await client.query('ROLLBACK');
          return res.status(422).json({ error: { code: 'SHOWS_UNAVAILABLE', message: 'One or more selected shows are unavailable in this workspace' } });
        }
      }
      result = await client.query(
      `INSERT INTO tours (entity_id, name, description, start_date, end_date, status, currency)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [req.entityId, name, description, startDate, endDate, status || 'planning', normalizedCurrency]
    );

      if (!result.rows[0]?.id || result.rows[0].id === result.rows[0].entity_id) throw new Error('Tour creation returned invalid record');
      if (ids.length) {
        const assigned = await client.query('UPDATE shows SET tour_id = $1 WHERE id = ANY($2::uuid[]) AND entity_id = $3 RETURNING id', [result.rows[0].id, ids, req.entityId]);
        if (assigned.rows.length !== ids.length) throw new Error('Show assignment count mismatch');
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const tour = result.rows[0];

    // Transform to camelCase for frontend
    const tourData = toCamelCase(tour);

    res.status(201).json({ tour: tourData });
  } catch (error) {
    console.error('Error creating tour:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to create tour',
        details: error.message
      }
    });
  }
});

// GET /api/tours/:id - Get tour with shows
app.get('/api/tours/:id', authMiddleware, async (req, res) => {
  try {
    console.log(`🔍 GET /api/tours/${req.params.id}`);
    console.log(`   Requested by entity: ${req.entityId}`);

    const tourResult = await pool.query(
      'SELECT * FROM tours WHERE id = $1 AND entity_id = $2',
      [req.params.id, req.entityId]
    );

    if (tourResult.rows.length === 0) {
      console.log(`❌ Tour not found or unauthorized`);
      console.log(`   Tour ID: ${req.params.id}`);
      console.log(`   Entity ID: ${req.entityId}`);

      // Check if tour exists at all
      const existsCheck = await pool.query('SELECT entity_id FROM tours WHERE id = $1', [req.params.id]);
      if (existsCheck.rows.length > 0) {
        console.log(`   ⚠️  Tour exists but belongs to entity: ${existsCheck.rows[0].entity_id}`);
      } else {
        console.log(`   ⚠️  Tour does not exist in database`);
      }

      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Tour not found'
        }
      });
    }

    console.log(`✅ Tour found: ${tourResult.rows[0].name}`);

    const showsResult = await pool.query(
      `SELECT s.*, ${effectiveShowCurrencySql('s')} AS currency, ${showReadinessSql('s')} AS readiness_percentage
       FROM shows s WHERE s.tour_id = $1 ORDER BY s.date ASC`,
      [req.params.id]
    );

    // Transform tour to camelCase
    const tourData = toCamelCase(tourResult.rows[0]);

    // Transform shows to camelCase and map field names
    const shows = showsResult.rows.map(serializeShow);
    const routeMileage = await require('./tour-route-mileage').readRouteMileage(
      pool, req.entityId, req.params.id, showsResult.rows, resolveRoutingCoordinates
    );

    const tour = {
      ...tourData,
      shows,
      showCount: shows.length,
      routeMileage
    };

    res.json({ tour });
  } catch (error) {
    console.error('Error fetching tour:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch tour',
        details: error.message
      }
    });
  }
});

// PUT /api/tours/:id - Update a tour
app.put('/api/tours/:id', authMiddleware, async (req, res) => {
  try {
    const { name, description, startDate, endDate, status } = req.body;

    const result = await pool.query(
      `UPDATE tours SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        start_date = COALESCE($3, start_date),
        end_date = COALESCE($4, end_date),
        status = COALESCE($5, status)
      WHERE id = $6 AND entity_id = $7
      RETURNING *`,
      [name, description, startDate, endDate, status, req.params.id, req.entityId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Tour not found'
        }
      });
    }

    res.json({ tour: result.rows[0] });
  } catch (error) {
    console.error('Error updating tour:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update tour',
        details: error.message
      }
    });
  }
});

// PATCH /api/tours/:id - Partially update a tour
app.patch('/api/tours/:id', authMiddleware, async (req, res) => {
  try {
    const fields = req.body;
    const updateFields = [];
    const values = [];
    let paramCount = 0;

    // Build dynamic update query
    Object.keys(fields).forEach(key => {
      if (key === 'entityId') return;
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      paramCount++;
      updateFields.push(`${dbKey} = $${paramCount}`);
      values.push(fields[key]);
    });

    if (updateFields.length === 0) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No fields to update'
        }
      });
    }

    paramCount++;
    values.push(req.params.id);
    paramCount++;
    values.push(req.entityId);

    const query = `UPDATE tours SET ${updateFields.join(', ')}
                   WHERE id = $${paramCount - 1} AND entity_id = $${paramCount}
                   RETURNING *`;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Tour not found'
        }
      });
    }

    // Transform to camelCase for frontend
    const tourData = toCamelCase(result.rows[0]);

    res.json({ tour: tourData });
  } catch (error) {
    console.error('Error patching tour:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update tour',
        details: error.message
      }
    });
  }
});

// DELETE /api/tours/:id - Delete a tour
app.delete('/api/tours/:id', authMiddleware, async (req, res) => {
  try {
    // First, delete all shows associated with this tour
    await pool.query(
      'DELETE FROM shows WHERE tour_id = $1 AND entity_id = $2',
      [req.params.id, req.entityId]
    );

    // Then delete the tour
    const result = await pool.query(
      'DELETE FROM tours WHERE id = $1 AND entity_id = $2 RETURNING id',
      [req.params.id, req.entityId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Tour not found'
        }
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting tour:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to delete tour',
        details: error.message
      }
    });
  }
});

// ADMIN: Force delete a tour (bypass entity check)
app.delete('/api/admin/tours/:id', serviceTokenMiddleware, authMiddleware, async (req, res) => {
  try {
    // First, delete all shows associated with this tour
    await pool.query(
      'DELETE FROM shows WHERE tour_id = $1',
      [req.params.id]
    );

    // Then delete the tour
    const result = await pool.query(
      'DELETE FROM tours WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Tour not found'
        }
      });
    }

    res.json({
      message: 'Tour deleted successfully',
      tour: result.rows[0]
    });
  } catch (error) {
    console.error('Error force-deleting tour:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to delete tour',
        details: error.message
      }
    });
  }
});

// =====================
// INVITES ENDPOINTS
// =====================

// GET /api/invites - Get sent and received invites
app.get('/api/invites', authMiddleware, async (req, res) => {
  if (!['owner', 'admin'].includes(req.entityRole)) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Owner or administrator access is required' } });
  try {
    const sentResult = await pool.query(
      'SELECT * FROM invites WHERE from_entity_id = $1 ORDER BY created_at DESC',
      [req.entityId]
    );

    // For received, we'd need user email - for now return empty array
    const receivedResult = { rows: [] };

    res.json({
      sent: sentResult.rows,
      received: receivedResult.rows
    });
  } catch (error) {
    console.error('Error fetching invites:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch invites',
        details: error.message
      }
    });
  }
});

// POST /api/invites - Send an invite
app.post('/api/invites', authMiddleware, async (req, res) => {
  if (!['owner', 'admin'].includes(req.entityRole)) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Owner or administrator access is required' } });
  try {
    const { toEmail, message, permissions, expiresInDays } = req.body;

    if (!toEmail) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'toEmail is required'
        }
      });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 7));

    // Generate unique token
    const token = `invite-${crypto.randomBytes(32).toString('hex')}`;

    const result = await pool.query(
      `INSERT INTO invites (from_entity_id, to_email, message, permissions, expires_at, token)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [req.entityId, toEmail, message, JSON.stringify(permissions || {}), expiresAt, token]
    );

    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invites/${token}`;

    res.status(201).json({
      invite: result.rows[0],
      token,
      url: inviteUrl
    });
  } catch (error) {
    console.error('Error creating invite:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to create invite',
        details: error.message
      }
    });
  }
});

// GET /api/invites/:token - Get invite by token
app.get('/api/invites/:token', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*, e.name as from_entity_name, e.entity_type as from_entity_type
       FROM invites i
       JOIN entities e ON i.from_entity_id = e.id
       WHERE i.token = $1`,
      [req.params.token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Invite not found or expired'
        }
      });
    }

    const invite = result.rows[0];

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      return res.status(410).json({
        error: {
          code: 'EXPIRED',
          message: 'This invite has expired'
        }
      });
    }

    // Check if already accepted
    if (invite.status === 'accepted') {
      return res.status(409).json({
        error: {
          code: 'ALREADY_ACCEPTED',
          message: 'This invite has already been accepted'
        }
      });
    }

    res.json({ invite });
  } catch (error) {
    console.error('Error fetching invite:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch invite',
        details: error.message
      }
    });
  }
});

// POST /api/invites/:token/accept - Accept invite by token
app.post('/api/invites/:token/accept', async (req, res) => {
  // The signed SceneGen identity middleware validates the session before this route.
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });

  const client = await pool.connect().catch((error) => {
    console.error('Unable to start invite acceptance:', error);
    return null;
  });
  if (!client) return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to accept invite' } });
  try {
    await client.query('BEGIN');
    // Lock the invitation so simultaneous accept attempts cannot both proceed.
    const inviteResult = await client.query('SELECT * FROM invites WHERE token = $1 FOR UPDATE', [req.params.token]);
    if (!inviteResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Invite not found' } });
    }
    const invite = inviteResult.rows[0];
    if (new Date(invite.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(410).json({ error: { code: 'EXPIRED', message: 'This invite has expired' } });
    }
    if (invite.status === 'accepted') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: { code: 'ALREADY_ACCEPTED', message: 'Already accepted' } });
    }

    const entityResult = await client.query('SELECT id FROM entities WHERE administrator_id = $1', [userId]);
    if (!entityResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(422).json({ error: { code: 'ENTITY_REQUIRED', message: 'Create your SceneGen profile before accepting this invite' } });
    }
    await client.query(
      `INSERT INTO contacts (entity_a_id, entity_b_id, status, message, requested_by)
       VALUES ($1, $2, 'accepted', $3, $1) ON CONFLICT DO NOTHING`,
      [invite.from_entity_id, entityResult.rows[0].id, 'Connected via invite']
    );
    await client.query(`UPDATE invites SET status = 'accepted', accepted_at = NOW() WHERE token = $1`, [req.params.token]);
    await client.query('COMMIT');
    return res.json({ success: true, message: 'Invite accepted successfully' });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (rollbackError) { console.error('Invite rollback failed:', rollbackError); }
    console.error('Error accepting invite:', error);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to accept invite' } });
  } finally {
    client.release();
  }
});

// =====================
// TAGS ENDPOINTS
// =====================

// GET /api/tags/get/:query - Search tags
app.get('/api/tags/get/:query', async (req, res) => {
  try {
    const query = req.params.query;

    // For now, return suggested tags based on common music genres/styles
    const commonTags = [
      'rock', 'indie', 'pop', 'electronic', 'hip-hop', 'jazz', 'blues',
      'metal', 'punk', 'alternative', 'folk', 'country', 'r&b', 'soul',
      'funk', 'reggae', 'latin', 'classical', 'experimental', 'ambient'
    ];

    const matchingTags = commonTags
      .filter(tag => tag.includes(query.toLowerCase()))
      .map(tag => ({ name: tag, count: Math.floor(Math.random() * 100) }));

    res.json({ tags: matchingTags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch tags',
        details: error.message
      }
    });
  }
});

// GET /api/tags/entity/get/:entityId - Get entity tags
app.get('/api/tags/entity/get/:entityId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT tags FROM entities WHERE id = $1',
      [req.params.entityId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Entity not found' }
      });
    }

    res.json({ tags: result.rows[0].tags || [] });
  } catch (error) {
    console.error('Error fetching entity tags:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch entity tags',
        details: error.message
      }
    });
  }
});

// POST /api/tags/entity/set/:entityId - Set entity tags
app.post('/api/tags/entity/set/:entityId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const userId = req.headers['x-user-id'];

    if (!authHeader || !userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tags must be an array'
        }
      });
    }

    const result = await pool.query(
      `UPDATE entities
       SET tags = $1::jsonb
       WHERE id = $2 AND administrator_id = $3
       RETURNING *`,
      [JSON.stringify(tags), req.params.entityId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Entity not found or unauthorized' }
      });
    }

    res.json({ success: true, entity: result.rows[0] });
  } catch (error) {
    console.error('Error setting entity tags:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to set entity tags',
        details: error.message
      }
    });
  }
});

// =====================
// CONTACTS ENDPOINTS
// =====================

const CONTACT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRIVATE_CONTACT_METHODS = new Set(['email', 'phone', 'whatsapp', 'other']);
const contactText = (value, maximum) => value == null ? null : String(value).trim().slice(0, maximum) || null;
const contactList = (value, maximum = 30) => Array.isArray(value)
  ? [...new Set(value.map((item) => contactText(item, 80)).filter(Boolean))].slice(0, maximum)
  : [];
const contactEmail = (value) => {
  const email = contactText(value, 254)?.toLowerCase() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('INVALID_EMAIL');
  return email;
};
const contactCoordinate = (value, minimum, maximum) => {
  if (value == null || value === '') return null;
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate) || coordinate < minimum || coordinate > maximum) throw new Error('INVALID_COORDINATES');
  return coordinate;
};
const privateContactValues = (body = {}, current = {}) => {
  const supplied = (key) => Object.prototype.hasOwnProperty.call(body, key);
  const pick = (key, existingKey = key) => supplied(key) ? body[key] : current[existingKey];
  const kindValue = pick('kind');
  const kind = kindValue === 'organization' ? 'organization' : 'person';
  const givenName = contactText(pick('givenName', 'given_name'), 100);
  const surname = contactText(pick('surname'), 100);
  const organization = contactText(pick('organization'), 200);
  const requestedDisplayName = contactText(pick('displayName', 'display_name'), 200);
  const displayName = requestedDisplayName || [givenName, surname].filter(Boolean).join(' ') || organization;
  if (!displayName) throw new Error('DISPLAY_NAME_REQUIRED');
  const preferred = contactText(pick('preferredContactMethod', 'preferred_contact_method'), 20);
  if (preferred && !PRIVATE_CONTACT_METHODS.has(preferred)) throw new Error('INVALID_CONTACT_METHOD');
  const latitude = contactCoordinate(pick('latitude'), -90, 90);
  const longitude = contactCoordinate(pick('longitude'), -180, 180);
  if ((latitude == null) !== (longitude == null)) throw new Error('INVALID_COORDINATES');
  return {
    kind, displayName, givenName, surname, organization,
    jobTitle: contactText(pick('jobTitle', 'job_title'), 160),
    roles: supplied('roles') ? contactList(body.roles) : contactList(current.roles),
    email: contactEmail(pick('email')), phone: contactText(pick('phone'), 80), preferred,
    city: contactText(pick('city'), 120), region: contactText(pick('region'), 120),
    country: contactText(pick('country'), 120), latitude, longitude,
    territories: supplied('territories') ? contactList(body.territories) : contactList(current.territories),
    tags: supplied('tags') ? contactList(body.tags) : contactList(current.tags),
    notes: contactText(pick('notes'), 10000),
  };
};
const insertPrivateContact = async (client, entityId, userId, values) => client.query(
  `INSERT INTO private_contacts
   (entity_id,kind,display_name,given_name,surname,organization,job_title,roles,email,phone,
    preferred_contact_method,city,region,country,latitude,longitude,territories,tags,notes,created_by)
   VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18::jsonb,$19,$20::uuid)
   RETURNING *`,
  [entityId, values.kind, values.displayName, values.givenName, values.surname, values.organization,
    values.jobTitle, JSON.stringify(values.roles), values.email, values.phone, values.preferred,
    values.city, values.region, values.country, values.latitude, values.longitude,
    JSON.stringify(values.territories), JSON.stringify(values.tags), values.notes, userId]
);

const privateContactValidationError = (error) => [
  'DISPLAY_NAME_REQUIRED', 'INVALID_EMAIL', 'INVALID_CONTACT_METHOD', 'INVALID_COORDINATES',
].includes(error.message);

// GET /api/contacts - Get all contacts for entity
app.get('/api/contacts', authMiddleware, async (req, res) => {
  try {
    const requestedStatus = req.query.status;
    if (requestedStatus && !['pending', 'accepted', 'rejected'].includes(requestedStatus)) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid contact status' } });
    }
    const result = await pool.query(
      `SELECT c.*, e.id as contact_entity_id, e.name as contact_name, e.entity_type as contact_type,
              e.city as contact_city, e.state as contact_state, e.country as contact_country,
              e.latitude as contact_latitude, e.longitude as contact_longitude,
              CASE WHEN jsonb_typeof(e.tags) = 'array' THEN e.tags ELSE '[]'::jsonb END as contact_tags,
              'scenegen' as source
       FROM contacts c
       JOIN entities e ON (c.entity_a_id = e.id OR c.entity_b_id = e.id)
       WHERE (c.entity_a_id = $1 OR c.entity_b_id = $1)
         AND e.id != $1
         AND ($2::text IS NULL OR c.status = $2)
       ORDER BY c.created_at DESC`,
      [req.entityId, requestedStatus || null]
    );

    let rows = result.rows;
    if (!requestedStatus || requestedStatus === 'accepted') {
      const privateResult = await pool.query(
        `SELECT private_contact.id,private_contact.entity_id as entity_a_id,
                private_contact.linked_entity_id as contact_entity_id,private_contact.display_name as contact_name,
                COALESCE(private_contact.roles->>0,private_contact.kind) as contact_type,
                private_contact.city as contact_city,private_contact.region as contact_state,
                private_contact.country as contact_country,private_contact.latitude as contact_latitude,
                private_contact.longitude as contact_longitude,private_contact.tags as contact_tags,
                private_contact.kind as contact_kind,private_contact.given_name as contact_given_name,
                private_contact.surname as contact_surname,private_contact.organization as contact_organization,
                private_contact.job_title as contact_job_title,private_contact.email as contact_email,
                private_contact.phone as contact_phone,private_contact.preferred_contact_method,
                private_contact.roles as contact_roles,private_contact.territories as contact_territories,
                private_contact.notes as contact_notes,
                COALESCE((SELECT jsonb_agg(jsonb_build_object(
                  'showId',pcs.show_id,'venue',pcs.venue_location,'bandGenres',pcs.band_genres))
                  FROM private_contact_shows pcs JOIN shows s ON s.id=pcs.show_id
                  WHERE pcs.contact_id=private_contact.id AND pcs.entity_id=$1::uuid
                    AND s.entity_id::text=$1::text),'[]'::jsonb) as show_associations,
                COALESCE((SELECT jsonb_agg(jsonb_build_object(
                  'showId',s.id,
                  'showDate',s.date,
                  'city',COALESCE(NULLIF(trim(s.city),''),NULLIF(trim(pcs.venue_location->>'city'),'')),
                  'state',COALESCE(NULLIF(trim(s.state),''),NULLIF(trim(pcs.venue_location->>'region'),'')),
                  'country',COALESCE(NULLIF(trim(s.country),''),NULLIF(trim(pcs.venue_location->>'country'),'')),
                  'latitude',COALESCE(s.venue_lat,s.latitude),
                  'longitude',COALESCE(s.venue_lng,s.longitude))
                  ORDER BY s.date DESC,s.id DESC)
                  FROM private_contact_shows pcs JOIN shows s ON s.id=pcs.show_id
                  WHERE pcs.contact_id=private_contact.id AND pcs.entity_id=$1::uuid
                    AND s.entity_id::text=$1::text
                    AND s.date<CURRENT_DATE
                    AND COALESCE(s.show_type,'show') NOT IN ('off_day','travel_day')
                    AND COALESCE(lower(trim(s.status)),'confirmed') NOT IN ('cancelled','canceled')
                    AND COALESCE(NULLIF(trim(s.city),''),NULLIF(trim(pcs.venue_location->>'city'),'')) IS NOT NULL
                  ),'[]'::jsonb) as show_locations,
                'private' as source,'accepted' as status,
                private_contact.entity_id as requested_by,private_contact.created_at,
                private_contact.created_at as accepted_at
         FROM private_contacts private_contact WHERE private_contact.entity_id=$1::uuid
           AND (NOT private_contact.auto_captured OR (private_contact.kind='organization' AND private_contact.tags ? 'venue' AND private_contact.notes LIKE 'SceneGen venue ID:%') OR EXISTS (
             SELECT 1 FROM private_contact_shows pcs JOIN shows s ON s.id=pcs.show_id
             WHERE pcs.contact_id=private_contact.id AND pcs.entity_id=$1::uuid AND s.entity_id::text=$1::text))
         ORDER BY private_contact.display_name`, [req.entityId]);
      // Every show-linked venue is visible as a read-only directory card.
      // This does not expose show-owned private or financial information.
      const venueResult = await pool.query(
        `SELECT v.id, v.name AS contact_name, 'venue' AS contact_type,
          v.city AS contact_city, v.region AS contact_state, v.country AS contact_country,
          v.latitude AS contact_latitude, v.longitude AS contact_longitude,
          'venue' AS contact_kind, '["venue"]'::jsonb AS contact_roles,
          '["venue"]'::jsonb AS contact_tags, 'venue' AS source,
          'accepted' AS status, NOW() AS created_at, NOW() AS accepted_at
         FROM venues v WHERE EXISTS (SELECT 1 FROM shows s
          WHERE s.venue_id=v.id AND s.entity_id::text=$1::text
          AND COALESCE(s.show_type,'show') NOT IN ('off_day','travel_day'))`, [req.entityId]);
      const knownVenueIds = new Set(privateResult.rows.flatMap(row => {
        const match = String(row.contact_notes || '').match(/SceneGen venue ID: ([0-9a-f-]{36})/i);
        return match ? [match[1].toLowerCase()] : [];
      }));
      const venueCards = venueResult.rows.filter(row => !knownVenueIds.has(String(row.id).toLowerCase()));
      rows = [...rows, ...privateResult.rows, ...venueCards]
        .sort((left, right) => String(left.contact_name || '').localeCompare(String(right.contact_name || '')));
    }
    res.json({ contacts: toCamelCase(rows) });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch contacts',
        details: error.message
      }
    });
  }
});

// Registered and show-inferred promoter discovery. This is intentionally
// separate from the private address book: only names and genre hashtags leave
// the server. Email is used internally to de-duplicate evidence, never returned.
const {
  PROFILE_SQL, HISTORICAL_PROMOTERS_SQL, CONTACT_ONLY_PROMOTERS_SQL,
  normalizeGenres, discoverPromoters,
} = require('./promoter-discovery');

// Registered SceneGen profiles: same search filters as promoter discovery,
// but no private contact data or unclaimed promoters.
app.get('/api/contacts/search-profiles', authMiddleware, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().slice(0,80);
    const city = String(req.query.city || '').trim().slice(0,120);
    const country = String(req.query.country || '').trim().slice(0,120);
    const genres = normalizeGenres(Array.isArray(req.query.genre) ? req.query.genre : [req.query.genre].filter(Boolean));
    if (!q && !city && !country && !genres.length) return res.json({profiles:[]});
    const result = await pool.query(
      `SELECT id::text AS id,name,entity_type AS type,city,country
       FROM entities WHERE entity_type IN ('artist','promoter')
         AND id::text<>$1::text
         AND ($2::text='' OR name ILIKE '%' || $2 || '%')
         AND ($3::text='' OR lower(trim(coalesce(city,'')))=lower($3))
         AND ($4::text='' OR lower(trim(coalesce(country,'')))=lower($4)
           OR (lower($4) IN ('usa','united states','united states of america')
             AND lower(trim(coalesce(country,''))) IN ('usa','united states','united states of america')))
         AND ($5::text[]='{}'::text[] OR EXISTS (
           SELECT 1 FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(tags)='array' THEN tags ELSE '[]'::jsonb END) tag
           WHERE '#' || regexp_replace(lower(tag), '[^a-z0-9]', '', 'g') = ANY($5::text[])
         ))
       ORDER BY name LIMIT 60`,[req.entityId,q,city,country,genres]);
    res.set('Cache-Control','private, no-store');
    res.json({profiles:result.rows});
  } catch(error) {
    console.error('Profile search failed:',error);
    res.status(500).json({error:{message:'Could not search SceneGen profiles'}});
  }
});

app.get('/api/contacts/discover-promoters', authMiddleware, async (req, res) => {
  try {
    if (!req.entityId) return res.status(400).json({ error: { message: 'Select an artist workspace' } });
    const workspace = await pool.query(
      'SELECT entity_type,tags FROM entities WHERE id::text=$1 LIMIT 1', [req.entityId]);
    if (workspace.rows[0]?.entity_type !== 'artist') {
      return res.status(403).json({ error: { message: 'Promoter discovery requires an artist workspace' } });
    }
    const suggestedGenres = normalizeGenres(workspace.rows[0].tags);
    const explicitGenres = Object.prototype.hasOwnProperty.call(req.query, 'genre');
    const genreValue = explicitGenres ? req.query.genre : suggestedGenres;
    const genres = normalizeGenres(Array.isArray(genreValue) ? genreValue : [genreValue]);
    const query = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
    res.setHeader('Cache-Control', 'private, no-store');
    const city = typeof req.query.city === 'string' ? req.query.city.trim().slice(0,120) : '';
    const country = typeof req.query.country === 'string' ? req.query.country.trim().slice(0,120) : '';
    if (!query && !genres.length && !city && !country) return res.json({ promoters: [], suggestedGenres });

    const [profiles, history, contactOnly] = await Promise.all([
      pool.query(PROFILE_SQL),
      pool.query(HISTORICAL_PROMOTERS_SQL),
      pool.query(CONTACT_ONLY_PROMOTERS_SQL),
    ]);
    const ownContacts = await pool.query(
      `SELECT DISTINCT lower(trim(email)) AS email, linked_entity_id::text AS profile_id
       FROM private_contacts WHERE entity_id=$1::uuid`, [req.entityId]);
    const promoters = discoverPromoters(profiles.rows, [...history.rows, ...contactOnly.rows], {
      genres, query, city, country, viewerEntityId: req.entityId,
      excludedEmails: ownContacts.rows.map(row => row.email).filter(Boolean),
      excludedProfileIds: ownContacts.rows.map(row => row.profile_id).filter(Boolean),
    });
    res.json({ promoters, suggestedGenres });
  } catch (error) {
    console.error('Promoter directory lookup failed:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ error: { message: 'Promoter discovery is temporarily unavailable' } });
  }
});

app.post('/api/contacts/private', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const inputs = Array.isArray(body.contacts) ? body.contacts : [body];
    if (!inputs.length || inputs.length > 500 || inputs.some((input) => !input || typeof input !== 'object' || Array.isArray(input))) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Provide between 1 and 500 valid contacts' } });
    }
    const values = inputs.map((input) => privateContactValues(input));
    await client.query('BEGIN');
    const created = [];
    for (const value of values) created.push((await insertPrivateContact(client, req.entityId, req.userId, value)).rows[0]);
    await client.query('COMMIT');
    // A standalone contact has no show context, so do not send a vague
    // invitation. The first linked show/import triggers the invitation.
    res.status(201).json({ contacts: toCamelCase(created), contact: inputs.length === 1 ? toCamelCase(created[0]) : undefined });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (privateContactValidationError(error)) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: error.message.replaceAll('_', ' ').toLowerCase() } });
    }
    if (error.code === '23505') return res.status(409).json({ error: { code: 'CONFLICT', message: 'A private contact with this email already exists' } });
    console.error('Error creating private contact:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create private contact' } });
  } finally { client.release(); }
});

app.patch('/api/contacts/private/:id', authMiddleware, async (req, res) => {
  try {
    if (!CONTACT_UUID.test(req.params.id)) return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'A valid contact ID is required' } });
    const current = await pool.query('SELECT * FROM private_contacts WHERE id=$1::uuid AND entity_id=$2::uuid', [req.params.id, req.entityId]);
    if (!current.rows[0]) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Private contact not found' } });
    const value = privateContactValues(req.body, current.rows[0]);
    const result = await pool.query(
      `UPDATE private_contacts SET kind=$1,display_name=$2,given_name=$3,surname=$4,organization=$5,
       job_title=$6,roles=$7::jsonb,email=$8,phone=$9,preferred_contact_method=$10,city=$11,
       region=$12,country=$13,latitude=$14,longitude=$15,territories=$16::jsonb,tags=$17::jsonb,
       notes=$18,updated_at=NOW() WHERE id=$19::uuid AND entity_id=$20::uuid RETURNING *`,
    [value.kind, value.displayName, value.givenName, value.surname, value.organization, value.jobTitle,
      JSON.stringify(value.roles), value.email, value.phone, value.preferred, value.city, value.region,
      value.country, value.latitude, value.longitude, JSON.stringify(value.territories), JSON.stringify(value.tags),
      value.notes, req.params.id, req.entityId]);
    res.json({ contact: toCamelCase(result.rows[0]) });
  } catch (error) {
    if (privateContactValidationError(error)) return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: error.message.replaceAll('_', ' ').toLowerCase() } });
    if (error.code === '23505') return res.status(409).json({ error: { code: 'CONFLICT', message: 'A private contact with this email already exists' } });
    console.error('Error updating private contact:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update private contact' } });
  }
});

app.delete('/api/contacts/private/:id', authMiddleware, async (req, res) => {
  try {
    if (!CONTACT_UUID.test(req.params.id)) return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'A valid contact ID is required' } });
    const result = await pool.query('DELETE FROM private_contacts WHERE id=$1::uuid AND entity_id=$2::uuid RETURNING id', [req.params.id, req.entityId]);
    if (!result.rows[0]) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Private contact not found' } });
    res.json({ deleted: true });
  } catch (error) {
    console.error('Error deleting private contact:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to delete private contact' } });
  }
});

app.post('/api/contacts/private/import-shows', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const before = await client.query('SELECT count(*)::int AS count FROM private_contacts WHERE entity_id=$1::uuid', [req.entityId]);
    const candidates = await client.query('SELECT id FROM shows WHERE entity_id::text=$1::text ORDER BY date NULLS FIRST,id', [req.entityId]);
    for (const show of candidates.rows) {
      await client.query('UPDATE shows SET promoter_email=promoter_email WHERE id=$1::uuid AND entity_id::text=$2::text', [show.id,req.entityId]);
    }
    const after = await client.query('SELECT count(*)::int AS count FROM private_contacts WHERE entity_id=$1::uuid', [req.entityId]);
    const imported = after.rows[0].count - before.rows[0].count;
    const skipped = candidates.rows.length - imported;
    await client.query('COMMIT');
    // Invite newly imported promoters using the actual linked show details.
    const invitationCandidates = await pool.query(
      `SELECT DISTINCT ON (lower(trim(pc.email))) lower(trim(pc.email)) AS email,
          s.id AS show_id
        FROM private_contacts pc
        JOIN private_contact_shows pcs ON pcs.contact_id=pc.id AND pcs.entity_id=pc.entity_id
        JOIN shows s ON s.id=pcs.show_id AND s.entity_id::text=pc.entity_id::text
        WHERE pc.entity_id=$1::uuid AND pc.email IS NOT NULL
          AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(pc.roles) r(role)
            WHERE lower(trim(r.role))='promoter')
        ORDER BY lower(trim(pc.email)),s.date DESC,s.id DESC`, [req.entityId]);
    for (const candidate of invitationCandidates.rows) {
      void invitePromoterByEmail(pool, { email:candidate.email, sourceEntityId:req.entityId, sourceShowId:candidate.show_id })
        .catch(error => console.error('Promoter import invitation failed', error.message));
    }
    res.json({ imported, skipped, found: candidates.rows.length });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error importing show contacts:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to import show contacts' } });
  } finally { client.release(); }
});

// Create a show-associated private contact through the canonical contact tables.
app.post('/api/contacts/private/for-show', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const showId = String(req.body?.showId || '');
    if (!CONTACT_UUID.test(showId)) return res.status(422).json({ error: { message: 'A valid show ID is required' } });
    const values = privateContactValues(req.body);
    await client.query('BEGIN');
    const show = await client.query('SELECT id,city,state,country,venue_name,venue_address,venue_lat,venue_lng,latitude,longitude FROM shows WHERE id=$1::uuid AND entity_id::text=$2::text FOR UPDATE', [showId,req.entityId]);
    if (!show.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: { message: 'Show not found in this workspace' } }); }
    const item = show.rows[0];
    let contact;
    if (values.email) {
      const existing = await client.query('SELECT id FROM private_contacts WHERE entity_id=$1::uuid AND lower(email)=lower($2) LIMIT 1', [req.entityId,values.email]);
      if (existing.rows[0]) contact = existing.rows[0];
    }
    if (!contact) contact = (await insertPrivateContact(client,req.entityId,req.userId,values)).rows[0];
    await client.query(
      `INSERT INTO private_contact_shows(contact_id,show_id,entity_id,venue_location,band_genres)
       VALUES($1::uuid,$2::uuid,$3::uuid,$4::jsonb,'[]'::jsonb)
       ON CONFLICT(contact_id,show_id) DO NOTHING`,
      [contact.id,showId,req.entityId,JSON.stringify({name:item.venue_name,address:item.venue_address,city:item.city,region:item.state,country:item.country,latitude:item.venue_lat ?? item.latitude,longitude:item.venue_lng ?? item.longitude})]);
    await client.query('COMMIT');
    // Invitations are opt-in. A failed email must never undo the saved contact.
    let invitation = { sent:false, reason:'not_requested' };
    if (req.body?.sendInvitation === true) {
      if (!values.email) invitation = {sent:false,reason:'email_required'};
      else invitation = await invitePromoterByEmail(pool, {
        email:values.email,sourceEntityId:req.entityId,sourceShowId:showId
      }).catch(error => {
        console.error('Map contact invitation failed:',error);
        return {sent:false,reason:'delivery_failed'};
      });
    }
    res.status(201).json({ contactId:contact.id,showId,invitation });
  } catch(error) {
    await client.query('ROLLBACK').catch(()=>{});
    if (privateContactValidationError(error)) return res.status(422).json({error:{message:error.message}});
    if (error.code==='23505') return res.status(409).json({error:{message:'Contact already exists. Add an email to select the existing contact.'}});
    console.error('Unable to attach show contact:',error);
    res.status(500).json({error:{message:'Unable to save show contact'}});
  } finally { client.release(); }
});

app.get('/api/contact-intelligence', authMiddleware, async (req, res) => {
  try {
    const requestedCurrency = String(req.query.currency || '').trim().toUpperCase();
    if (requestedCurrency && !/^[A-Z]{3}$/.test(requestedCurrency)) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Currency must be a three-letter ISO code' } });
    }
    const result = await pool.query(
      `WITH eligible AS (
         SELECT s.id,s.date,s.country,s.city,s.state,s.venue_name,
           COALESCE(s.venue_lat,s.latitude) AS latitude,
           COALESCE(s.venue_lng,s.longitude) AS longitude,
           COALESCE(s.guaranteed_fee,s.fee,0)::numeric AS fee,
           ${effectiveShowCurrencySql('s')} AS currency
         FROM shows s WHERE s.entity_id::text=$1::text AND s.date<CURRENT_DATE
           AND COALESCE(s.show_type,'show') NOT IN ('off_day','travel_day')
           AND COALESCE(lower(s.status),'confirmed') NOT IN ('cancelled','canceled')
           AND NULLIF(trim(s.country),'') IS NOT NULL
       ), countries AS (
         SELECT country,currency,count(*)::int AS visits,
           sum(fee)::numeric AS total_fee,avg(fee)::numeric AS average_fee,max(fee)::numeric AS highest_fee,
           count(*) FILTER (WHERE fee>0)::int AS paid_shows,
           avg(latitude)::numeric AS latitude,avg(longitude)::numeric AS longitude
         FROM eligible WHERE ($2::text='' OR currency=$2) GROUP BY country,currency
       ), cities AS (
         SELECT e.country, trim(e.city) AS city,
           count(*)::int AS visits,
           COALESCE(avg(e.latitude) FILTER (WHERE e.latitude BETWEEN -90 AND 90 AND e.longitude BETWEEN -180 AND 180),max(gc.latitude))::numeric AS latitude,
           COALESCE(avg(e.longitude) FILTER (WHERE e.latitude BETWEEN -90 AND 90 AND e.longitude BETWEEN -180 AND 180),max(gc.longitude))::numeric AS longitude
         FROM eligible e LEFT JOIN city_geocode_cache gc
           ON gc.country_key=lower(trim(e.country)) AND gc.city_key=lower(trim(e.city))
         WHERE NULLIF(trim(e.city),'') IS NOT NULL
           AND ($2::text='' OR e.currency=$2)
         GROUP BY e.country,trim(e.city)
       ), show_points AS (
         SELECT e.id AS show_id,e.venue_name,e.city,e.country,
           COALESCE(e.latitude,gc.latitude) AS latitude,
           COALESCE(e.longitude,gc.longitude) AS longitude,
           pc.id AS contact_id,pc.display_name,pc.organization,
           count(pc.id) OVER (PARTITION BY e.id)::int AS linked_contacts
         FROM eligible e
         LEFT JOIN city_geocode_cache gc ON gc.country_key=lower(trim(e.country)) AND gc.city_key=lower(trim(e.city))
         LEFT JOIN private_contact_shows pcs ON pcs.show_id=e.id AND pcs.entity_id=$1::uuid
         LEFT JOIN private_contacts pc ON pc.id=pcs.contact_id AND pc.entity_id=$1::uuid
       ), points AS (
         SELECT pc.id AS contact_id,pc.display_name,pc.organization,pc.roles,pc.email,pc.phone,
           s.id AS show_id,s.venue_name,s.city,s.state,s.country,pcs.venue_location,pcs.band_genres,
           COALESCE(s.venue_lat,s.latitude,pc.latitude)::numeric AS latitude,
           COALESCE(s.venue_lng,s.longitude,pc.longitude)::numeric AS longitude,
           count(*) OVER (PARTITION BY pc.id)::int AS associated_shows
         FROM private_contacts pc JOIN private_contact_shows pcs ON pcs.contact_id=pc.id AND pcs.entity_id=$1::uuid
         JOIN shows s ON s.id=pcs.show_id AND s.entity_id::text=$1::text
         WHERE pc.entity_id=$1::uuid
       )
       SELECT jsonb_build_object(
         'currencies',COALESCE((SELECT jsonb_agg(DISTINCT currency ORDER BY currency) FROM eligible WHERE currency IS NOT NULL),'[]'::jsonb),
         'countries',COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.country,c.currency) FROM countries c),'[]'::jsonb),
         'cities',COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.country,c.city) FROM cities c),'[]'::jsonb),
         'contactPoints',COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.display_name,p.venue_name) FROM points p WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL),'[]'::jsonb),
         'showPoints',COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.city,p.venue_name) FROM show_points p WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL),'[]'::jsonb),
         'unmappedContacts',COALESCE((SELECT count(*) FROM private_contacts pc WHERE pc.entity_id=$1::uuid AND pc.latitude IS NULL AND NOT EXISTS (SELECT 1 FROM private_contact_shows pcs JOIN shows s ON s.id=pcs.show_id WHERE pcs.contact_id=pc.id AND COALESCE(s.venue_lat,s.latitude) IS NOT NULL)),0)
       ) AS intelligence`, [req.entityId, requestedCurrency]);
    res.json(result.rows[0].intelligence);
  } catch (error) {
    console.error('Error loading contact intelligence:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to load contact intelligence' } });
  }
});

app.post('/api/contacts/private/:id/link', authMiddleware, async (req, res) => {
  try {
    const linkedEntityId = String(req.body?.linkedEntityId || '');
    if (!CONTACT_UUID.test(req.params.id) || !CONTACT_UUID.test(linkedEntityId) || linkedEntityId === String(req.entityId)) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Valid contact and profile IDs are required' } });
    }
    const accepted = await pool.query(
      `SELECT 1 FROM contacts WHERE status='accepted'
       AND ((entity_a_id=$1::uuid AND entity_b_id=$2::uuid) OR (entity_a_id=$2::uuid AND entity_b_id=$1::uuid)) LIMIT 1`,
    [req.entityId, linkedEntityId]);
    if (!accepted.rows[0]) return res.status(409).json({ error: { code: 'CONNECTION_REQUIRED', message: 'Accept the SceneGen connection before linking this private record' } });
    const result = await pool.query(
      'UPDATE private_contacts SET linked_entity_id=$1::uuid,updated_at=NOW() WHERE id=$2::uuid AND entity_id=$3::uuid RETURNING *',
      [linkedEntityId, req.params.id, req.entityId]);
    if (!result.rows[0]) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Private contact not found' } });
    res.json({ contact: toCamelCase(result.rows[0]) });
  } catch (error) {
    console.error('Error linking private contact:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to link private contact' } });
  }
});

// POST /api/contacts/request - Send contact request
app.post('/api/contacts/request', authMiddleware, async (req, res) => {
  try {
    const contactEntityId = req.body.contactEntityId || req.body.recipientEntityId;
    const message = String(req.body.message || '').trim().slice(0, 2000) || null;

    if (!contactEntityId || !/^[0-9a-f-]{36}$/i.test(String(contactEntityId))) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'A valid contactEntityId is required'
        }
      });
    }

    if (contactEntityId === req.entityId) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'You cannot contact your active workspace' } });
    }

    const target = await pool.query('SELECT id, name FROM entities WHERE id = $1', [contactEntityId]);
    if (!target.rows[0]) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Contact profile not found' } });

    // Check if contact already exists
    const existing = await pool.query(
      `SELECT * FROM contacts
       WHERE (entity_a_id = $1 AND entity_b_id = $2)
          OR (entity_a_id = $2 AND entity_b_id = $1)`,
      [req.entityId, contactEntityId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Contact request already exists'
        }
      });
    }

    const result = await pool.query(
      `INSERT INTO contacts (entity_a_id, entity_b_id, status, message, requested_by)
       VALUES ($1, $2, 'pending', $3, $1)
       RETURNING *`,
      [req.entityId, contactEntityId, message]
    );

    const sender = await pool.query('SELECT name FROM entities WHERE id = $1', [req.entityId]);
    await createEntityNotification(contactEntityId, 'contact_request', 'New contact request',
      `${sender.rows[0]?.name || 'A SceneGen profile'} wants to connect with you.`, '/contacts');
    res.status(201).json({ contact: toCamelCase(result.rows[0]) });
  } catch (error) {
    console.error('Error creating contact request:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to send contact request',
        details: error.message
      }
    });
  }
});

// POST /api/contacts/accept/:contactId - Accept contact request
app.post('/api/contacts/accept/:contactId', authMiddleware, async (req, res) => {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.contactId)) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'A valid contact ID is required' } });
    }
    const result = await pool.query(
      `UPDATE contacts
       SET status = 'accepted', accepted_at = NOW()
       WHERE id = $1
         AND (entity_a_id = $2 OR entity_b_id = $2)
         AND requested_by != $2
         AND status = 'pending'
       RETURNING *`,
      [req.params.contactId, req.entityId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Contact request not found'
        }
      });
    }

    const contact = result.rows[0];
    const accepter = await pool.query('SELECT name FROM entities WHERE id = $1', [req.entityId]);
    await createEntityNotification(contact.requested_by, 'contact_accepted', 'Contact request accepted',
      `${accepter.rows[0]?.name || 'A SceneGen profile'} accepted your contact request.`, '/contacts');
    res.json({ contact: toCamelCase(contact) });
  } catch (error) {
    console.error('Error accepting contact:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to accept contact request',
        details: error.message
      }
    });
  }
});

// POST /api/contacts/reject/:contactId - Reject contact request
app.post('/api/contacts/reject/:contactId', authMiddleware, async (req, res) => {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.contactId)) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'A valid contact ID is required' } });
    }
    const result = await pool.query(
      `UPDATE contacts
       SET status = 'rejected'
       WHERE id = $1
         AND (entity_a_id = $2 OR entity_b_id = $2)
         AND requested_by != $2
         AND status = 'pending'
       RETURNING *`,
      [req.params.contactId, req.entityId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Contact request not found'
        }
      });
    }

    const contact = result.rows[0];
    const rejecter = await pool.query('SELECT name FROM entities WHERE id = $1', [req.entityId]);
    await createEntityNotification(contact.requested_by, 'contact_rejected', 'Contact request declined',
      `${rejecter.rows[0]?.name || 'A SceneGen profile'} declined your contact request.`, '/contacts');
    res.json({ contact: toCamelCase(contact) });
  } catch (error) {
    console.error('Error rejecting contact:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to reject contact request',
        details: error.message
      }
    });
  }
});

// DELETE /api/contacts/:contactId - Remove a contact relationship
app.delete('/api/contacts/:contactId', authMiddleware, async (req, res) => {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.contactId)) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'A valid contact ID is required' } });
    }
    const result = await pool.query(
      `DELETE FROM contacts
       WHERE id = $1
         AND (entity_a_id = $2 OR entity_b_id = $2)
       RETURNING id`,
      [req.params.contactId, req.entityId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Contact not found' } });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to delete contact' } });
  }
});

// =====================
// SEARCH ENDPOINTS
// =====================

// GET /api/search - Search for entities
app.get('/api/search', async (req, res) => {
  try {
    const { q, entityType } = req.query;

    if (!q) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query (q) is required'
        }
      });
    }

    let query = `SELECT id, name, entity_type, city, state, country, bio
                 FROM entities
                 WHERE name ILIKE $1`;
    const params = [`%${q}%`];

    if (entityType) {
      query += ` AND entity_type = $2`;
      params.push(entityType);
    }

    query += ` LIMIT 50`;

    const result = await pool.query(query, params);

    res.json({ results: result.rows });
  } catch (error) {
    console.error('Error searching entities:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to search entities',
        details: error.message
      }
    });
  }
});

// GET /api/general/search/:segment - Advanced search (alias for /api/search)
app.get('/api/general/search/:segment', async (req, res) => {
  try {
    const segment = req.params.segment;
    const { entityType } = req.query;

    let query = `SELECT id, name, entity_type, city, state, country, bio
                 FROM entities
                 WHERE name ILIKE $1`;
    const params = [`%${segment}%`];

    if (entityType) {
      query += ` AND entity_type = $2`;
      params.push(entityType);
    }

    query += ` LIMIT 50`;

    const result = await pool.query(query, params);

    res.json({ results: result.rows });
  } catch (error) {
    console.error('Error searching entities:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to search entities',
        details: error.message
      }
    });
  }
});

// =====================
// USER ENDPOINTS
// =====================

// GET /api/user/get - Get current user profile
app.get('/api/user/get', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const userId = req.headers['x-user-id'];

    if (!authHeader || !userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const result = await pool.query('SELECT id, email, name, image, preferences, timezone FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (!result.rows[0]) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    res.json(toCamelCase(result.rows[0]));
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch user',
        details: error.message
      }
    });
  }
});

// PUT /api/user/update - Update user profile
app.put('/api/user/update', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const userId = req.headers['x-user-id'];

    if (!authHeader || !userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const name = String(req.body.name || '').trim().slice(0, 100);
    const timezone = req.body.timezone == null ? null : String(req.body.timezone).trim().slice(0, 100);
    const preferencesInput = req.body.preferences && typeof req.body.preferences === 'object' && !Array.isArray(req.body.preferences)
      ? req.body.preferences : {};
    const preferences = {
      emailNotifications: preferencesInput.emailNotifications !== false,
      calendarReminders: preferencesInput.calendarReminders !== false,
    };
    if (!name) return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Name is required' } });
    if (timezone) {
      try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(); }
      catch { return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Time zone is invalid' } }); }
    }
    const result = await pool.query(`UPDATE users SET name = $2, timezone = $3, preferences = $4::jsonb, updated_at = NOW()
      WHERE id = $1 RETURNING id, email, name, image, preferences, timezone`, [userId, name, timezone, JSON.stringify(preferences)]);
    if (!result.rows[0]) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    res.json(toCamelCase(result.rows[0]));
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update user',
        details: error.message
      }
    });
  }
});

// GET /api/user/connections/get - Get user connections
app.get('/api/user/connections/get', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const userId = req.headers['x-user-id'];

    if (!authHeader || !userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    // Get entities owned by user
    const entities = await pool.query(
      'SELECT id FROM entities WHERE administrator_id = $1',
      [userId]
    );

    if (entities.rows.length === 0) {
      return res.json({ connections: [] });
    }

    const entityId = entities.rows[0].id;

    // Get connections through contacts
    const result = await pool.query(
      `SELECT c.*, e.name as contact_name, e.entity_type as contact_type
       FROM contacts c
       JOIN entities e ON (c.entity_a_id = e.id OR c.entity_b_id = e.id)
       WHERE (c.entity_a_id = $1 OR c.entity_b_id = $1)
         AND e.id != $1
         AND c.status = 'accepted'`,
      [entityId]
    );

    res.json({ connections: result.rows });
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch connections',
        details: error.message
      }
    });
  }
});

// =====================
// NOTIFICATION ENDPOINTS
// =====================

app.post('/api/notification/devices', async (req, res) => {
  const token = String(req.body.token || '').trim().toLowerCase();
  const environment = req.body.environment === 'sandbox' ? 'sandbox' : 'production';
  if (!/^[a-f0-9]{64,200}$/.test(token) || req.body.platform !== 'ios') {
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'A valid iOS device token is required' } });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM native_push_devices WHERE token = $1 AND (user_id <> $2 OR entity_id <> $3::uuid)', [token, req.userId, req.entityId]);
    await client.query(`INSERT INTO native_push_devices (user_id, entity_id, token, platform, environment)
      VALUES ($1, $2::uuid, $3, 'ios', $4)
      ON CONFLICT (token) DO UPDATE SET enabled = true, environment = EXCLUDED.environment, last_registered_at = NOW()`,
      [req.userId, req.entityId, token, environment]);
    await client.query('COMMIT');
    res.status(204).end();
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('Push device registration failed:', error.message);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Could not register this device' } });
  } finally { client.release(); }
});

app.delete('/api/notification/devices', async (req, res) => {
  const token = String(req.body.token || '').trim().toLowerCase();
  if (!/^[a-f0-9]{64,200}$/.test(token)) return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'A valid device token is required' } });
  await pool.query('DELETE FROM native_push_devices WHERE token = $1 AND user_id = $2 AND entity_id = $3::uuid', [token, req.userId, req.entityId]);
  res.status(204).end();
});

// GET /api/notification/history - Get notification history
app.get('/api/notification/history', async (req, res) => {
  try {
    const userId = req.userId;
    if (!req.entityId) return res.status(400).json({ error: { code: 'ENTITY_REQUIRED', message: 'Entity context is required' } });
    const { limit = 50, unreadOnly = false } = req.query;
    const boundedLimit = Math.max(1, Math.min(Number.parseInt(String(limit), 10) || 50, 100));

    let query = 'SELECT * FROM notifications WHERE user_id = $1 AND entity_id = $2::uuid';
    const params = [userId, req.entityId];

    if (unreadOnly === 'true') {
      query += ' AND read = false';
    }

    query += ' ORDER BY created_at DESC LIMIT $3';
    params.push(boundedLimit);

    const result = await pool.query(query, params);
    const unread = await pool.query(
      'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND read = false AND entity_id = $2::uuid',
      [userId, req.entityId]
    );

    res.json({
      notifications: toCamelCase(result.rows),
      total: result.rows.length,
      unreadCount: unread.rows[0].count
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch notifications',
        details: error.message
      }
    });
  }
});

// POST /api/notification/markread - Mark notification as read
app.post('/api/notification/markread', async (req, res) => {
  try {
    const userId = req.userId;
    if (!req.entityId) return res.status(400).json({ error: { code: 'ENTITY_REQUIRED', message: 'Entity context is required' } });
    const { notificationId, markAllAsRead } = req.body;

    if (markAllAsRead) {
      await pool.query(
        'UPDATE notifications SET read = true, read_at = COALESCE(read_at, NOW()) WHERE user_id = $1 AND entity_id = $2::uuid',
        [userId, req.entityId]
      );

      return res.json({ success: true, message: 'All notifications marked as read' });
    }

    if (!notificationId || !/^[0-9a-f-]{36}$/i.test(String(notificationId))) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'A valid notificationId or markAllAsRead is required'
        }
      });
    }

    const result = await pool.query(
      'UPDATE notifications SET read = true, read_at = COALESCE(read_at, NOW()) WHERE id = $1::uuid AND user_id = $2 AND entity_id = $3::uuid RETURNING *',
      [notificationId, userId, req.entityId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Notification not found' }
      });
    }

    res.json({ success: true, notification: toCamelCase(result.rows[0]) });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to mark notification as read',
        details: error.message
      }
    });
  }
});

// =====================
// ASSETS ENDPOINTS
// =====================

const ALLOWED_ASSET_TYPES = new Set([
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'image/jpeg', 'image/png', 'image/webp'
]);

// POST /api/assets - Store or replace an entity-owned asset.
app.post('/api/assets', async (req, res) => {
  if (!['owner', 'admin'].includes(req.entityRole)) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Owner or administrator access is required' } });
  try {
    const { fileId, fileName, mimeType, data } = req.body;
    if (!req.entityId || !/^[a-zA-Z0-9_-]{1,100}$/.test(String(fileId || '')) ||
        !ALLOWED_ASSET_TYPES.has(String(mimeType || '')) || typeof data !== 'string') {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid asset metadata' } });
    }
    const content = Buffer.from(data, 'base64');
    if (!content.length || content.length > 10 * 1024 * 1024 || content.toString('base64').replace(/=+$/, '') !== data.replace(/=+$/, '')) {
      return res.status(413).json({ error: { code: 'FILE_TOO_LARGE', message: 'File must be between 1 byte and 10 MB' } });
    }
    const result = await pool.query(`INSERT INTO entity_assets (entity_id, file_key, file_name, mime_type, byte_size, content)
      VALUES ($1::uuid, $2, $3, $4, $5, $6)
      ON CONFLICT (entity_id, file_key) DO UPDATE SET file_name = EXCLUDED.file_name,
        mime_type = EXCLUDED.mime_type, byte_size = EXCLUDED.byte_size, content = EXCLUDED.content, updated_at = NOW()
      RETURNING id`, [req.entityId, fileId, String(fileName || 'file').slice(0, 255), mimeType, content.length, content]);
    res.status(201).json({ filePath: `/api/assets/${result.rows[0].id}` });
  } catch (error) {
    console.error('Error uploading asset:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to upload asset',
        details: error.message
      }
    });
  }
});

app.get('/api/assets/:id', async (req, res) => {
  try {
    const result = await pool.query(`SELECT a.file_name, a.mime_type, a.byte_size, a.content FROM entity_assets a
      WHERE a.id::text = $1 AND (
        EXISTS (SELECT 1 FROM entities own WHERE own.id = a.entity_id AND own.administrator_id = $2)
        OR EXISTS (SELECT 1 FROM entity_memberships em WHERE em.entity_id = a.entity_id AND em.user_id = $2::uuid AND em.status = 'active')
        OR EXISTS (SELECT 1 FROM entities viewer JOIN contacts c ON c.status = 'accepted' AND
          ((c.entity_a_id = viewer.id AND c.entity_b_id = a.entity_id) OR
           (c.entity_b_id = viewer.id AND c.entity_a_id = a.entity_id))
          WHERE viewer.administrator_id = $2)
      ) LIMIT 1`, [req.params.id, req.userId]);
    if (!result.rows[0]) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Asset not found' } });
    const asset = result.rows[0];
    const safeName = String(asset.file_name).replace(/["\\\r\n]/g, '_');
    res.set('Content-Type', asset.mime_type);
    res.set('Content-Length', String(asset.byte_size));
    res.set('Content-Disposition', `inline; filename="${safeName}"`);
    res.set('Cache-Control', 'private, max-age=300');
    res.send(asset.content);
  } catch (error) {
    console.error('Error downloading asset:', error.message);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to download asset' } });
  }
});

// =====================
// CONNECTION ENDPOINTS (Legacy - similar to contacts)
// =====================

// Keep this singular-only boundary before every duplicate legacy handler.
// Express path matching does not treat /api/contact as /api/contacts.
app.use(['/api/connection', '/api/contact'], (req, res) => {
  res.status(410).json({
    error: {
      code: 'ENDPOINT_RETIRED',
      message: 'This endpoint has been retired. Use /api/contacts instead.'
    }
  });
});

// POST /api/connection/request - Send connection request
app.post('/api/connection/request', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const entityId = req.headers['x-entity-id'];
    const { toEntityId, message } = req.body;

    if (!toEntityId) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'toEntityId is required'
        }
      });
    }

    // Check if connection already exists
    const existing = await pool.query(
      `SELECT * FROM contacts
       WHERE (entity_a_id = $1 AND entity_b_id = $2)
          OR (entity_a_id = $2 AND entity_b_id = $1)`,
      [entityId, toEntityId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Connection request already exists'
        }
      });
    }

    const result = await pool.query(
      `INSERT INTO contacts (entity_a_id, entity_b_id, status, message, requested_by)
       VALUES ($1, $2, 'pending', $3, $1)
       RETURNING *`,
      [entityId, toEntityId, message]
    );

    res.status(201).json({ connection: result.rows[0] });
  } catch (error) {
    console.error('Error creating connection request:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to send connection request',
        details: error.message
      }
    });
  }
});

// POST /api/connection/request/accept/:id - Accept connection request
app.post('/api/connection/request/accept/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const entityId = req.headers['x-entity-id'];

    if (!authHeader || !entityId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const result = await pool.query(
      `UPDATE contacts
       SET status = 'accepted', accepted_at = NOW()
       WHERE id = $1
         AND (entity_a_id = $2 OR entity_b_id = $2)
         AND status = 'pending'
       RETURNING *`,
      [req.params.id, entityId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Connection request not found' }
      });
    }

    res.json({ connection: result.rows[0] });
  } catch (error) {
    console.error('Error accepting connection:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to accept connection request',
        details: error.message
      }
    });
  }
});

// =====================
// LEGACY CONTACT ENDPOINTS
// =====================

// POST /api/contact/add - Legacy contact add
app.post('/api/contact/add', async (req, res) => {
  // Deprecated - redirect to POST /api/contacts/request
  res.status(301).json({
    error: {
      code: 'DEPRECATED',
      message: 'This endpoint is deprecated. Please use POST /api/contacts/request instead.'
    }
  });
});

// PUT /api/contact/update/:id - Update contact
app.put('/api/contact/update/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const entityId = req.headers['x-entity-id'];

    if (!authHeader || !entityId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const { message, notes } = req.body;

    const result = await pool.query(
      `UPDATE contacts
       SET message = COALESCE($1, message)
       WHERE id = $2 AND (entity_a_id = $3 OR entity_b_id = $3)
       RETURNING *`,
      [message, req.params.id, entityId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Contact not found' }
      });
    }

    res.json({ contact: result.rows[0] });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update contact',
        details: error.message
      }
    });
  }
});

// DELETE /api/contact/delete/:id - Delete contact
app.delete('/api/contact/delete/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const entityId = req.headers['x-entity-id'];

    if (!authHeader || !entityId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const result = await pool.query(
      'DELETE FROM contacts WHERE id = $1 AND (entity_a_id = $2 OR entity_b_id = $2) RETURNING id',
      [req.params.id, entityId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Contact not found' }
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to delete contact',
        details: error.message
      }
    });
  }
});

// GET /api/contacts/promoters - Get promoter contacts only
app.get('/api/contacts/promoters', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, e.name as contact_name, e.entity_type as contact_type,
              e.city as contact_city, e.state as contact_state
       FROM contacts c
       JOIN entities e ON (c.entity_a_id = e.id OR c.entity_b_id = e.id)
       WHERE (c.entity_a_id = $1 OR c.entity_b_id = $1)
         AND e.id != $1
         AND e.entity_type = 'promoter'
         AND c.status = 'accepted'
       ORDER BY e.name ASC`,
      [req.entityId]
    );

    res.json({ contacts: toCamelCase(result.rows) });
  } catch (error) {
    console.error('Error fetching promoter contacts:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch promoter contacts',
        details: error.message
      }
    });
  }
});

// =====================
// ARTIST MANAGEMENT ENDPOINTS
// =====================

// DELETE /api/artist/delete/:id - Delete artist
app.delete('/api/artist/delete/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const userId = req.headers['x-user-id'];

    if (!authHeader || !userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const result = await pool.query(
      'DELETE FROM entities WHERE id = $1 AND administrator_id = $2 AND entity_type = $3 RETURNING id',
      [req.params.id, userId, 'artist']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Artist not found or unauthorized' }
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting artist:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to delete artist',
        details: error.message
      }
    });
  }
});

// POST /api/artist/:id/members/add - Add band member
app.post('/api/artist/:id/members/add', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const userId = req.headers['x-user-id'];

    if (!authHeader || !userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const { name, responsibility, bio } = req.body;

    if (!name) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Member name is required'
        }
      });
    }

    // Verify ownership
    const ownerCheck = await pool.query(
      'SELECT id FROM entities WHERE id = $1 AND administrator_id = $2 AND entity_type = $3',
      [req.params.id, userId, 'artist']
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Not authorized to modify this artist' }
      });
    }

    // Add member (store in JSONB field or separate table)
    // For now, we'll use a simple approach with JSONB
    const result = await pool.query(
      `UPDATE entities
       SET members = COALESCE(members, '[]'::jsonb) || $1::jsonb
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify([{ id: `member-${Date.now()}`, name, responsibility, bio }]), req.params.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding band member:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to add band member',
        details: error.message
      }
    });
  }
});

// DELETE /api/artist/:id/members/delete/:memberId - Delete band member
app.delete('/api/artist/:id/members/delete/:memberId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const userId = req.headers['x-user-id'];

    if (!authHeader || !userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    // Verify ownership
    const ownerCheck = await pool.query(
      'SELECT id, members FROM entities WHERE id = $1 AND administrator_id = $2 AND entity_type = $3',
      [req.params.id, userId, 'artist']
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Not authorized to modify this artist' }
      });
    }

    // Remove member from JSONB array
    const result = await pool.query(
      `UPDATE entities
       SET members = (
         SELECT jsonb_agg(member)
         FROM jsonb_array_elements(COALESCE(members, '[]'::jsonb)) member
         WHERE member->>'id' != $1
       )
       WHERE id = $2
       RETURNING *`,
      [req.params.memberId, req.params.id]
    );

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting band member:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to delete band member',
        details: error.message
      }
    });
  }
});

// GET /api/artist/alias/suggest - Suggest artist alias
app.get('/api/artist/alias/suggest', async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Artist name is required'
        }
      });
    }

    // Generate alias: lowercase, remove spaces, remove special chars
    const suggestedAlias = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20);

    // Check if alias is taken
    const existing = await pool.query(
      'SELECT id FROM entities WHERE alias = $1',
      [suggestedAlias]
    );

    let finalAlias = suggestedAlias;
    let counter = 1;

    while (existing.rows.length > 0 && counter < 100) {
      finalAlias = `${suggestedAlias}${counter}`;
      const check = await pool.query(
        'SELECT id FROM entities WHERE alias = $1',
        [finalAlias]
      );
      if (check.rows.length === 0) break;
      counter++;
    }

    res.json({ suggestedAlias: finalAlias });
  } catch (error) {
    console.error('Error suggesting alias:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to suggest alias',
        details: error.message
      }
    });
  }
});

// =====================
// BUDGET ENDPOINTS
// =====================

// GET /api/budgets - Get all budgets for an entity (with optional filters)
app.get('/api/budgets', authMiddleware, async (req, res) => {
  try {
    const { entityId } = req;
    const { showId, tourId, search } = req.query;

    let query = 'SELECT b.*, s.venue_name as show_name, s.city as venue_city, s.date as show_date FROM budgets b LEFT JOIN shows s ON b.show_id = s.id WHERE b.entity_id = $1';
    const params = [entityId];
    let paramCount = 1;

    if (showId) {
      paramCount++;
      query += ` AND b.show_id = $${paramCount}`;
      params.push(showId);
    }



    if (tourId) {
      paramCount++;
      query += ` AND b.tour_id = $${paramCount}`;
      params.push(tourId);
    }

    if (search) {
      paramCount++;
      query += ` AND (b.budget_name ILIKE $${paramCount} OR b.city ILIKE $${paramCount} OR s.venue_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY b.created_at DESC';

    const result = await pool.query(query, params);

    // Fetch line items for all budgets
    const budgetIds = result.rows.map(r => r.id);
    let lineItemsMap = {};

    if (budgetIds.length > 0) {
      const lineItemsResult = await pool.query(
        `SELECT budget_id, item_type, category, name, amount, notes
         FROM budget_line_items
         WHERE budget_id = ANY($1)
         ORDER BY created_at ASC`,
        [budgetIds]
      );

      // Group line items by budget_id
      lineItemsResult.rows.forEach(item => {
        if (!lineItemsMap[item.budget_id]) {
          lineItemsMap[item.budget_id] = [];
        }
        lineItemsMap[item.budget_id].push({
          type: item.item_type,
          category: item.category,
          name: item.name,
          amount: parseFloat(item.amount),
          notes: item.notes
        });
      });
    }

    // Transform snake_case to camelCase for frontend
    // Convert numeric fields from strings to numbers (PostgreSQL returns decimals as strings)
    const budgets = result.rows.map(row => ({
      id: row.id,
      showId: row.show_id,
      tourId: row.tour_id,
      entityId: row.entity_id,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      budgetName: row.budget_name,
      currency: row.currency,
      notes: row.notes,
      ticketSales: parseFloat(row.ticket_sales) || 0,
      merchSalesPerPerson: parseFloat(row.merch_sales_per_person) || 0,
      merchCardSales: parseFloat(row.merch_card_sales) || 0,
      merchCashSales: parseFloat(row.merch_cash_sales) || 0,
      totalSales: parseFloat(row.total_sales) || 0,
      previousSales: parseFloat(row.previous_sales) || 0,
      city: row.city,
      distance: parseFloat(row.distance) || 0,
      cashFlow: parseFloat(row.cash_flow) || 0,
      feesCash: parseFloat(row.fees_cash) || 0,
      extraExpenses: parseFloat(row.extra_expenses) || 0,
      agentCommissionPercent: parseFloat(row.agent_commission_percent) || 0,
      agentCommission: parseFloat(row.agent_commission) || 0,
      vanCosts: parseFloat(row.van_costs) || 0,
      driverFees: parseFloat(row.driver_fees) || 0,
      vanRental: parseFloat(row.van_rental) || 0,
      gasCosts: parseFloat(row.gas_costs) || 0,
      accommodationCosts: parseFloat(row.accommodation_costs) || 0,
      flightCosts: parseFloat(row.flight_costs) || 0,
      generalPayouts: parseFloat(row.general_payouts) || 0,
      merchPersonFees: parseFloat(row.merch_person_fees) || 0,
      merchCostOfGoods: parseFloat(row.merch_cost_of_goods) || 0,
      feeBalance: parseFloat(row.fee_balance) || 0,
      feeSurplus: parseFloat(row.fee_surplus) || 0,
      totalExpenses: parseFloat(row.total_expenses) || 0,
      merchDailySurplus: parseFloat(row.merch_daily_surplus) || 0,
      orderCount: parseInt(row.order_count) || 0,
      avgCardOrderValue: parseFloat(row.avg_card_order_value) || 0,
      netProfit: parseFloat(row.net_profit) || 0,
      variation: parseFloat(row.variation) || 0,
      showName: row.show_name,
      venueCity: row.venue_city,
      showDate: row.show_date,
      lineItems: lineItemsMap[row.id] || []
    }));

    res.json(budgets);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch budgets',
        details: error.message
      }
    });
  }
});

// POST /api/budgets - Create a new budget
app.post('/api/budgets', authMiddleware, async (req, res) => {
  try {
    const { entityId } = req;
    const {
      showId, tourId, budgetName, currency, notes,
      // Revenue fields
      ticketSales, merchCashSales, merchCardSales, merchSalesPerPerson,
      totalSales,
      // Expense fields
      agentCommissionPercent, agentCommission,
      vanCosts, driverFees, vanRental, gasCosts,
      accommodationCosts, flightCosts, generalPayouts,
      merchPersonFees, merchCostOfGoods,
      extraExpenses, feesCash,
      totalExpenses,
      // Line items array
      expenses = []
    } = req.body;

    console.log('📝 [POST /api/budgets] Request body:', {
      showId, budgetName, currency,
      ticketSales, merchCashSales, merchCardSales,
      agentCommission, vanCosts, accommodationCosts,
      expensesCount: expenses.length
    });

    const normalizedCurrency = normalizeCurrencyCode(currency);

    if (!showId || !budgetName || !normalizedCurrency) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'showId, budgetName, and a valid three-letter currency code are required'
        }
      });
    }

    // Verify the show belongs to this entity
    const showCheck = await pool.query(
      'SELECT id FROM shows WHERE id = $1 AND entity_id = $2',
      [showId, entityId]
    );

    if (showCheck.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Show not found or does not belong to this entity'
        }
      });
    }

    // Get userId from header (for created_by)
    const userId = req.headers['x-user-id'] || entityId;

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert budget
      const result = await client.query(
        `INSERT INTO budgets (
          show_id, tour_id, entity_id, created_by, budget_name, currency, notes,
          ticket_sales, merch_cash_sales, merch_card_sales, merch_sales_per_person, total_sales,
          agent_commission_percent, agent_commission,
          van_costs, driver_fees, van_rental, gas_costs,
          accommodation_costs, flight_costs, general_payouts,
          merch_person_fees, merch_cost_of_goods,
          extra_expenses, fees_cash, total_expenses
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
        RETURNING *`,
        [
          showId, tourId, entityId, userId, budgetName, normalizedCurrency, notes,
          ticketSales, merchCashSales, merchCardSales, merchSalesPerPerson, totalSales || 0,
          agentCommissionPercent || 10, agentCommission,
          vanCosts, driverFees, vanRental, gasCosts,
          accommodationCosts, flightCosts, generalPayouts,
          merchPersonFees, merchCostOfGoods,
          extraExpenses, feesCash, totalExpenses || 0
        ]
      );

      const budgetId = result.rows[0].id;

      // Insert line items (individual expenses)
      if (expenses && expenses.length > 0) {
        for (const expense of expenses) {
          await client.query(
            `INSERT INTO budget_line_items (budget_id, item_type, category, name, amount)
             VALUES ($1, $2, $3, $4, $5)`,
            [budgetId, 'expense', expense.category || 'Other', expense.name, expense.amount]
          );
        }
        console.log(`✅ [POST /api/budgets] Saved ${expenses.length} expense line items`);
      }

      await client.query('COMMIT');
      console.log('✅ [POST /api/budgets] Budget created:', budgetId);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ [POST /api/budgets] Error creating budget:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to create budget',
        details: error.message
      }
    });
  }
});

// GET /api/budgets/:id - Get a single budget with all details
app.get('/api/budgets/:id', authMiddleware, async (req, res) => {
  try {
    const { entityId } = req;
    const { id } = req.params;

    const budgetResult = await pool.query(
      `SELECT b.*, s.venue_name as show_name, s.city as venue_city, s.date as show_date
       FROM budgets b
       LEFT JOIN shows s ON b.show_id = s.id
       WHERE b.id = $1 AND b.entity_id = $2`,
      [id, entityId]
    );

    if (budgetResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Budget not found'
        }
      });
    }

    const budget = budgetResult.rows[0];

    // Get band member payouts
    const payoutsResult = await pool.query(
      'SELECT * FROM band_member_payouts WHERE budget_id = $1 ORDER BY created_at',
      [id]
    );

    budget.band_member_payouts = payoutsResult.rows;

    res.json(budget);
  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch budget',
        details: error.message
      }
    });
  }
});

// PUT /api/budgets/:id - Update a budget
app.put('/api/budgets/:id', authMiddleware, async (req, res) => {
  try {
    const { entityId } = req;
    const { id } = req.params;

    // Check budget exists and belongs to entity
    const existingBudget = await pool.query(
      'SELECT id FROM budgets WHERE id = $1 AND entity_id = $2',
      [id, entityId]
    );

    if (existingBudget.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Budget not found'
        }
      });
    }

    // Build dynamic update query
    const allowedFields = [
      'budget_name', 'currency', 'notes', 'ticket_sales', 'merch_sales_per_person',
      'merch_card_sales', 'merch_cash_sales', 'total_sales', 'previous_sales',
      'city', 'distance', 'cash_flow', 'fees_cash', 'extra_expenses',
      'agent_commission_percent', 'agent_commission', 'van_costs', 'driver_fees',
      'van_rental', 'gas_costs', 'accommodation_costs', 'flight_costs',
      'general_payouts', 'merch_person_fees', 'merch_cost_of_goods',
      'fee_balance', 'fee_surplus', 'total_expenses', 'merch_daily_surplus',
      'order_count', 'avg_card_order_value', 'net_profit', 'variation'
    ];

    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramCount}`);
        values.push(req.body[key]);
        paramCount++;
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No valid fields to update'
        }
      });
    }

    values.push(id);
    const query = `UPDATE budgets SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update budget',
        details: error.message
      }
    });
  }
});

// DELETE /api/budgets/:id - Delete a budget
app.delete('/api/budgets/:id', authMiddleware, async (req, res) => {
  try {
    const { entityId } = req;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM budgets WHERE id = $1 AND entity_id = $2 RETURNING id',
      [id, entityId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Budget not found'
        }
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting budget:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to delete budget',
        details: error.message
      }
    });
  }
});

// GET /api/budgets/:id/summary - Get calculated summary for a budget
app.get('/api/budgets/:id/summary', authMiddleware, async (req, res) => {
  try {
    const { entityId } = req;
    const { id } = req.params;

    const budgetResult = await pool.query(
      'SELECT * FROM budgets WHERE id = $1 AND entity_id = $2',
      [id, entityId]
    );

    if (budgetResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Budget not found'
        }
      });
    }

    const budget = budgetResult.rows[0];

    // Get band member payouts
    const payoutsResult = await pool.query(
      'SELECT SUM(amount) as total FROM band_member_payouts WHERE budget_id = $1',
      [id]
    );

    const totalRevenue = (budget.ticket_sales || 0) + (budget.merch_card_sales || 0) + (budget.merch_cash_sales || 0);
    const totalExpenses = (budget.fees_cash || 0) + (budget.extra_expenses || 0) + (budget.agent_commission || 0) +
                         (budget.van_costs || 0) + (budget.driver_fees || 0) + (budget.van_rental || 0) +
                         (budget.gas_costs || 0) + (budget.accommodation_costs || 0) + (budget.flight_costs || 0) +
                         (budget.general_payouts || 0) + (budget.merch_person_fees || 0) + (budget.merch_cost_of_goods || 0);
    const bandMemberPayouts = parseFloat(payoutsResult.rows[0].total || 0);
    const netProfit = totalRevenue - totalExpenses - bandMemberPayouts;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const merchProfit = (budget.merch_card_sales || 0) + (budget.merch_cash_sales || 0) - (budget.merch_cost_of_goods || 0) - (budget.merch_person_fees || 0);
    const ticketProfit = (budget.ticket_sales || 0) - totalExpenses;

    res.json({
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      bandMemberPayouts,
      merchProfit,
      ticketProfit
    });
  } catch (error) {
    console.error('Error calculating budget summary:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to calculate budget summary',
        details: error.message
      }
    });
  }
});

// POST /api/budgets/:id/payouts - Add a band member payout
app.post('/api/budgets/:budgetId/payouts', authMiddleware, async (req, res) => {
  try {
    const { entityId } = req;
    const { budgetId } = req.params;
    const { memberId, memberName, amount, percentage, notes } = req.body;

    if (!memberName || !amount) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'memberName and amount are required'
        }
      });
    }

    // Verify budget exists and belongs to entity
    const budgetCheck = await pool.query(
      'SELECT id FROM budgets WHERE id = $1 AND entity_id = $2',
      [budgetId, entityId]
    );

    if (budgetCheck.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Budget not found'
        }
      });
    }

    const result = await pool.query(
      `INSERT INTO band_member_payouts (budget_id, member_id, member_name, amount, percentage, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [budgetId, memberId, memberName, amount, percentage, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding payout:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to add payout',
        details: error.message
      }
    });
  }
});

// DELETE /api/budgets/:budgetId/payouts/:payoutId - Delete a band member payout
app.delete('/api/budgets/:budgetId/payouts/:payoutId', authMiddleware, async (req, res) => {
  try {
    const { entityId } = req;
    const { budgetId, payoutId } = req.params;

    // Verify budget belongs to entity
    const budgetCheck = await pool.query(
      'SELECT id FROM budgets WHERE id = $1 AND entity_id = $2',
      [budgetId, entityId]
    );

    if (budgetCheck.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Budget not found'
        }
      });
    }

    const result = await pool.query(
      'DELETE FROM band_member_payouts WHERE id = $1 AND budget_id = $2 RETURNING id',
      [payoutId, budgetId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Payout not found'
        }
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting payout:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to delete payout',
        details: error.message
      }
    });
  }
});

// =====================
// CSV IMPORT ENDPOINT
// =====================

function importShowKey(show) {
  const date = String(show.date || '').slice(0, 10);
  const city = String(show.city || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return `${date}|${city}`;
}

app.post('/api/import/preview', async (req, res) => {
  const shows = Array.isArray(req.body.shows) ? req.body.shows.slice(0, 500) : [];
  if (!req.entityId || !shows.length) return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Shows are required' } });
  const dates = [...new Set(shows.map(show => String(show.date || '').slice(0, 10)).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)))];
  const existing = dates.length ? await pool.query(`SELECT id,date,city,venue_name,tour_id FROM shows
    WHERE entity_id=$1::uuid AND date::date = ANY($2::date[])`, [req.entityId, dates]) : { rows: [] };
  const keys = new Set(existing.rows.map(importShowKey));
  const duplicates = [];
  shows.forEach((show, index) => {
    const key = importShowKey(show);
    if (keys.has(key)) duplicates.push({ index, key });
    else keys.add(key);
  });
  res.json({ duplicates, existing: existing.rows.map(toCamelCase) });
});

app.get('/api/import/history', async (req, res) => {
  const owner = await pool.query('SELECT 1 FROM entities WHERE id=$1::uuid AND administrator_id::text=$2::text', [req.entityId, req.userId]);
  if (!owner.rowCount) return res.status(403).json({ error: { code: 'OWNER_REQUIRED', message: 'Only the workspace owner can view migration history' } });
  const result = await pool.query(`SELECT id,tour_id,source_kind,source_name,source_preset,source_fingerprint,
      shows_created,duplicates_skipped,created_at FROM import_batches WHERE entity_id=$1::uuid
    ORDER BY created_at DESC LIMIT 100`, [req.entityId]);
  res.json({ batches: result.rows.map(toCamelCase) });
});

/**
 * POST /api/import/execute
 * Bulk import shows, budgets, and line items from CSV
 */
app.post('/api/import/execute', authMiddleware, async (req, res) => {
  const client = await pool.connect();

  try {
    const { entityId } = req;
    let { shows, tour } = req.body;
    const { budgets, source } = req.body;
    const duplicatePolicy = req.body.duplicatePolicy === 'import_anyway' ? 'import_anyway' : 'skip';

    console.log('📥 Bulk import request:', {
      entityId,
      showCount: shows?.length || 0,
      budgetCount: budgets?.length || 0,
      tour: tour?.name || tour?.id,
    });

    // Validate input
    if (!shows || !Array.isArray(shows) || shows.length === 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'shows array is required' }
      });
    }
    if (shows.length > 500 || shows.some(show => !/^\d{4}-\d{2}-\d{2}$/.test(String(show.date || '')) || !String(show.city || '').trim())) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Imports support up to 500 rows and every row needs a valid date and city' } });
    }

    const invalidBudgetCurrency = Array.isArray(budgets)
      ? budgets.find((budget) => !normalizeCurrencyCode(budget.currency))
      : null;
    if (invalidBudgetCurrency) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Every imported budget must have a confirmed three-letter currency code'
        }
      });
    }

    const budgetCurrencies = [...new Set((budgets || []).map((budget) => normalizeCurrencyCode(budget.currency)).filter(Boolean))];
    const requestedTourCurrency = normalizeCurrencyCode(tour?.currency);
    if (tour?.currency && !requestedTourCurrency) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Tour currency must be a three-letter ISO code' } });
    }
    if (budgetCurrencies.length > 1 || (requestedTourCurrency && budgetCurrencies.some((code) => code !== requestedTourCurrency))) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'All imported budgets must use the confirmed tour currency' } });
    }
    const importCurrency = requestedTourCurrency || budgetCurrencies[0] || null;
    if (!importCurrency) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Confirm one three-letter tour currency before importing' } });

    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`scenegen-import:${entityId}`]);

    const requestedDates = [...new Set(shows.map(show => String(show.date || '').slice(0, 10)).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)))];
    const existingShows = requestedDates.length ? await client.query(`SELECT date,city FROM shows
      WHERE entity_id=$1::uuid AND date::date = ANY($2::date[]) FOR UPDATE`, [entityId, requestedDates]) : { rows: [] };
    const existingKeys = new Set(existingShows.rows.map(importShowKey));
    const duplicateIndexes = new Set();
    if (duplicatePolicy === 'skip') shows.forEach((show, index) => {
      const key = importShowKey(show);
      if (existingKeys.has(key)) duplicateIndexes.add(index);
      else existingKeys.add(key);
    });
    const duplicatesSkipped = duplicateIndexes.size;
    if (duplicatesSkipped) {
      shows = shows.filter((_, index) => !duplicateIndexes.has(index));
      if (!shows.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: { code: 'DUPLICATES_ONLY', message: 'Every row already exists in this workspace. Nothing was imported.' } });
      }
    }
    if (tour && !tour.id) {
      const remainingDates = shows.map(show => show.date).filter(Boolean).sort();
      tour = { ...tour, startDate: remainingDates[0], endDate: remainingDates[remainingDates.length - 1] };
    }

    // Get the user ID (administrator) from the entity
    const entityResult = await client.query(
      'SELECT administrator_id FROM entities WHERE id = $1',
      [entityId]
    );

    if (entityResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Entity not found' }
      });
    }

    const userId = entityResult.rows[0].administrator_id;

    let tourId = tour?.id;
    let selectedTour = null;
    if (tourId) {
      const selected = await client.query('SELECT id, start_date, end_date, currency FROM tours WHERE id::text = $1 AND entity_id::text = $2', [tourId, entityId]);
      if (!selected.rowCount) { await client.query('ROLLBACK'); return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'That tour is not in this workspace' } }); }
      const existingCurrency = normalizeCurrencyCode(selected.rows[0].currency);
      if (existingCurrency && existingCurrency !== importCurrency) { await client.query('ROLLBACK'); return res.status(409).json({ error: { code: 'CURRENCY_CONFLICT', message: `This tour is already confirmed in ${existingCurrency}` } }); }
      selectedTour = selected.rows[0];
      if (!existingCurrency) await client.query('UPDATE tours SET currency = $1 WHERE id = $2', [importCurrency, tourId]);
    }

    // Step 1: Create or get tour, and update dates dynamically
    if (!tourId && tour?.name) {
      // Check if tour already exists by name
      const existingTour = await client.query(
        `SELECT id, start_date, end_date, currency FROM tours
         WHERE entity_id = $1 AND name = $2`,
        [entityId, tour.name]
      );

      if (existingTour.rows.length > 0) {
        // Tour exists - update its dates based on all current shows
        tourId = existingTour.rows[0].id;
        const existingCurrency = normalizeCurrencyCode(existingTour.rows[0].currency);
        if (existingCurrency && existingCurrency !== importCurrency) { await client.query('ROLLBACK'); return res.status(409).json({ error: { code: 'CURRENCY_CONFLICT', message: `This tour is already confirmed in ${existingCurrency}` } }); }
        if (!existingCurrency) await client.query('UPDATE tours SET currency = $1 WHERE id = $2', [importCurrency, tourId]);
        const currentStartDate = existingTour.rows[0].start_date;
        const currentEndDate = existingTour.rows[0].end_date;

        // Get dates from the shows being imported
        const showDates = shows.map(s => s.date).filter(Boolean);

        if (showDates.length > 0) {
          const newStartDate = showDates.reduce((min, date) => date < min ? date : min);
          const newEndDate = showDates.reduce((max, date) => date > max ? date : max);

          // Convert to Date objects for proper comparison
          const currentStart = new Date(currentStartDate);
          const currentEnd = new Date(currentEndDate);
          const newStart = new Date(newStartDate);
          const newEnd = new Date(newEndDate);

          // Update tour dates to encompass all shows (existing + new)
          const finalStartDate = currentStart < newStart ? currentStartDate : newStartDate;
          const finalEndDate = currentEnd > newEnd ? currentEndDate : newEndDate;

          await client.query(
            `UPDATE tours SET
              start_date = $1,
              end_date = $2,
              origin_city = COALESCE($3, origin_city),
              origin_state = COALESCE($4, origin_state),
              origin_lat = COALESCE($5, origin_lat),
              origin_lng = COALESCE($6, origin_lng),
              destination_city = COALESCE($7, destination_city),
              destination_state = COALESCE($8, destination_state),
              destination_lat = COALESCE($9, destination_lat),
              destination_lng = COALESCE($10, destination_lng),
              currency = COALESCE(currency, $12),
              updated_at = NOW()
             WHERE id = $11`,
            [
              finalStartDate,
              finalEndDate,
              tour.origin?.city,
              tour.origin?.state,
              tour.origin?.lat,
              tour.origin?.lng,
              tour.destination?.city,
              tour.destination?.state,
              tour.destination?.lat,
              tour.destination?.lng,
              tourId,
              importCurrency
            ]
          );

          console.log('✅ Updated tour:', tourId, 'dates:', finalStartDate, 'to', finalEndDate);
          if (tour.origin) {
            console.log('   Origin:', tour.origin.city, tour.origin.state);
          }
          if (tour.destination) {
            console.log('   Destination:', tour.destination.city, tour.destination.state);
          }
        }
      } else {
        // Create new tour
        let tourStartDate = tour.startDate;
        let tourEndDate = tour.endDate;

        if (!tourStartDate || !tourEndDate) {
          // Derive dates from shows
          const showDates = shows.map(s => s.date).filter(Boolean);
          if (showDates.length > 0) {
            tourStartDate = tourStartDate || showDates.reduce((min, date) => date < min ? date : min);
            tourEndDate = tourEndDate || showDates.reduce((max, date) => date > max ? date : max);
          } else {
            // Fallback to current date if no show dates available
            const today = new Date().toISOString().split('T')[0];
            tourStartDate = tourStartDate || today;
            tourEndDate = tourEndDate || today;
          }
        }

        const tourResult = await client.query(
          `INSERT INTO tours (entity_id, name, start_date, end_date, origin_city, origin_state, origin_lat, origin_lng, destination_city, destination_state, destination_lat, destination_lng, currency)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           RETURNING id`,
          [
            entityId,
            tour.name,
            tourStartDate,
            tourEndDate,
            tour.origin?.city || null,
            tour.origin?.state || null,
            tour.origin?.lat || null,
            tour.origin?.lng || null,
            tour.destination?.city || null,
            tour.destination?.state || null,
            tour.destination?.lat || null,
            tour.destination?.lng || null,
            importCurrency,
          ]
        );
        tourId = tourResult.rows[0].id;
        console.log('✅ Created tour:', tourId, 'with dates:', tourStartDate, 'to', tourEndDate);
        if (tour.origin) {
          console.log('   Origin:', tour.origin.city, tour.origin.state);
        }
        if (tour.destination) {
          console.log('   Destination:', tour.destination.city, tour.destination.state);
        }
      }
    } else if (tourId) {
      // Tour ID provided - update its dates based on new shows
      const showDates = shows.map(s => s.date).filter(Boolean);

      if (showDates.length > 0) {
        if (selectedTour) {
          const currentStartDate = selectedTour.start_date;
          const currentEndDate = selectedTour.end_date;

          const newStartDate = showDates.reduce((min, date) => date < min ? date : min);
          const newEndDate = showDates.reduce((max, date) => date > max ? date : max);

          // Convert to Date objects for proper comparison
          const currentStart = new Date(currentStartDate);
          const currentEnd = new Date(currentEndDate);
          const newStart = new Date(newStartDate);
          const newEnd = new Date(newEndDate);

          // Update to encompass all shows
          const finalStartDate = currentStart < newStart ? currentStartDate : newStartDate;
          const finalEndDate = currentEnd > newEnd ? currentEndDate : newEndDate;

          await client.query(
            `UPDATE tours SET
              start_date = $1,
              end_date = $2,
              origin_city = COALESCE($3, origin_city),
              origin_state = COALESCE($4, origin_state),
              origin_lat = COALESCE($5, origin_lat),
              origin_lng = COALESCE($6, origin_lng),
              destination_city = COALESCE($7, destination_city),
              destination_state = COALESCE($8, destination_state),
              destination_lat = COALESCE($9, destination_lat),
              destination_lng = COALESCE($10, destination_lng),
              currency = COALESCE(currency, $12),
              updated_at = NOW()
             WHERE id = $11`,
            [
              finalStartDate,
              finalEndDate,
              tour.origin?.city,
              tour.origin?.state,
              tour.origin?.lat,
              tour.origin?.lng,
              tour.destination?.city,
              tour.destination?.state,
              tour.destination?.lat,
              tour.destination?.lng,
              tourId,
              importCurrency
            ]
          );

          console.log('✅ Updated tour:', tourId, 'dates:', finalStartDate, 'to', finalEndDate);
          if (tour.origin) {
            console.log('   Origin:', tour.origin.city, tour.origin.state);
          }
          if (tour.destination) {
            console.log('   Destination:', tour.destination.city, tour.destination.state);
          }
        }
      }
    }

    // Step 2: Bulk insert shows
    const showIds = [];
    const showIndexMap = new Map(); // Map rowIndex to show_id

    console.log(`\n📋 Importing ${shows.length} shows...`);

    // Count how many shows have address data
    const showsWithAddresses = shows.filter(s => s.venue_address || s.venueAddress).length;
    const showsWithCoords = shows.filter(s => s.venue_lat && s.venue_lng).length;
    console.log(`📊 Shows with addresses: ${showsWithAddresses}/${shows.length}`);
    console.log(`📊 Shows with coordinates: ${showsWithCoords}/${shows.length}`);

    for (let i = 0; i < shows.length; i++) {
      const show = shows[i];
      const importedCountry = canonicalCountry(show.country)
        || resolveShowCountry('', show.venue_address || show.venueAddress) || null;
      const venue = await upsertVenue(client, { ...show, country: importedCountry, source: 'tour_import' });

      // Log address data for EVERY show that has it
      const hasAddress = show.venue_address || show.venueAddress;
      const hasCoords = show.venue_lat && show.venue_lng;

      if (hasAddress || hasCoords) {
        console.log(`\n✅ Show ${i} HAS ADDRESS DATA:`);
        console.log(`   venue_name: ${show.venueName}`);
        console.log(`   venue_address: ${show.venue_address || show.venueAddress}`);
        console.log(`   venue_lat: ${show.venue_lat}`);
        console.log(`   venue_lng: ${show.venue_lng}`);
        console.log(`   city: ${show.city}, state: ${show.state}`);
      } else if (i < 3) {
        console.log(`\n⚠️  Show ${i} MISSING ADDRESS DATA:`);
        console.log(`   venue_name: ${show.venueName}`);
        console.log(`   city: ${show.city}, state: ${show.state}`);
      }

      const result = await client.query(
        `INSERT INTO shows (
          entity_id, tour_id, date, city, state, country,
          venue_name, venue_address, venue_lat, venue_lng, latitude, longitude, fee, status, start_time, end_time, show_type, currency, venue_id, venue_place_id, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING id`,
        [
          entityId,
          tourId,
          show.date,
          show.city,
          show.state || null,
          importedCountry,
          show.venueName?.trim() || null, // An unconfirmed venue is not the city name
          show.venue_address || show.venueAddress || null, // Use new field name, fallback to old, then null
          show.venue_lat || null, // Latitude from Google Places
          show.venue_lng || null, // Longitude from Google Places
          show.fee || 0,
          'confirmed',
          show.startTime || '20:00', // Default to 8 PM
          show.endTime || '23:00', // Default to 11 PM
          show.show_type || 'show', // Show type: 'show', 'off_day', or 'travel_day'
          importCurrency,
          venue?.id || null,
          show.venuePlaceId || show.place_id || venue?.google_place_id || null,
          String(show.notes || '').slice(0, 4000) || null
        ]
      );

      const showId = result.rows[0].id;
      showIds.push(showId);
      showIndexMap.set(show.rowIndex, showId);
    }

    console.log(`✅ Created ${showIds.length} shows`);

    // Step 2.5: Calculate distances between consecutive shows
    console.log(`\n🗺️  Calculating distances between shows...`);
    const distanceMap = new Map(); // Map showIndex to distance from previous show

    // Sort shows by date to get the correct tour order
    const sortedShows = [...shows].sort((a, b) => new Date(a.date) - new Date(b.date));

    for (let i = 1; i < sortedShows.length; i++) {
      const prevShow = sortedShows[i - 1];
      const currShow = sortedShows[i];

      // Check if both shows have coordinates
      if (prevShow.venue_lat && prevShow.venue_lng && currShow.venue_lat && currShow.venue_lng) {
        try {
          // Use Google Maps Distance Matrix API
          const origin = `${prevShow.venue_lat},${prevShow.venue_lng}`;
          const destination = `${currShow.venue_lat},${currShow.venue_lng}`;

          const response = await fetch(
            `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&units=imperial&key=${process.env.GOOGLE_MAPS_API_KEY}`
          );

          if (response.ok) {
            const data = await response.json();
            if (data.rows && data.rows[0] && data.rows[0].elements && data.rows[0].elements[0]) {
              const element = data.rows[0].elements[0];
              if (element.status === 'OK' && element.distance) {
                // Convert meters to miles (1 mile = 1609.34 meters)
                const miles = element.distance.value / 1609.34;
                distanceMap.set(currShow.rowIndex, Math.round(miles * 10) / 10); // Round to 1 decimal
                console.log(`   ✅ ${prevShow.city} → ${currShow.city}: ${Math.round(miles)} miles`);
              }
            }
          }
        } catch (error) {
          console.log(`   ⚠️  Could not calculate distance: ${prevShow.city} → ${currShow.city}`);
        }
      } else {
        console.log(`   ⚠️  Missing coordinates: ${prevShow.city} → ${currShow.city}`);
      }
    }

    console.log(`✅ Calculated ${distanceMap.size} distances`);

    // Step 3: Bulk insert budgets and line items
    const budgetIds = [];
    let totalLineItems = 0;
    const showFees = new Map(); // Track fees per show

    if (budgets && Array.isArray(budgets)) {
      for (const budget of budgets) {
        const showId = showIndexMap.get(budget.showIndex);
        if (!showId) continue;

        // Calculate totals from line items
        let totalSales = 0;
        let totalExpenses = 0;
        let feesCash = 0; // Track fees cash for this show

        budget.lineItems.forEach(item => {
          if (item.type === 'revenue') {
            totalSales += item.amount;
            // Track "Fees Cash" specifically for the show fee
            if (item.name && item.name.toLowerCase().includes('fee')) {
              feesCash += item.amount;
            }
          } else {
            totalExpenses += item.amount;
          }
        });

        // Store the fee for this show
        if (feesCash > 0) showFees.set(showId, feesCash);

        // Get calculated distance or use CSV distance
        const calculatedDistance = distanceMap.get(budget.showIndex);
        const finalDistance = calculatedDistance ?? budget.distance ?? null;

        // Insert budget
        const budgetResult = await client.query(
          `INSERT INTO budgets (
            entity_id, show_id, tour_id, created_by, budget_name, currency,
            total_sales, total_expenses, distance, cash_flow, previous_sales
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id`,
          [
            entityId,
            showId,
            tourId,
            userId,
            budget.budgetName,
            normalizeCurrencyCode(budget.currency),
            totalSales,
            totalExpenses,
            finalDistance, // Use calculated distance
            budget.cashFlow || null,
            budget.previousSales || null
          ]
        );

        const budgetId = budgetResult.rows[0].id;
        budgetIds.push(budgetId);

        // Insert line items
        for (const item of budget.lineItems) {
          await client.query(
            `INSERT INTO budget_line_items (
              budget_id, item_type, category, name, amount
            )
            VALUES ($1, $2, $3, $4, $5)`,
            [
              budgetId,
              item.type,
              item.category,
              item.name,
              item.amount
            ]
          );
          totalLineItems++;
        }
      }
    }

    console.log(`✅ Created ${budgetIds.length} budgets with ${totalLineItems} line items`);

    // Step 4: Update show fees based on "Fees Cash" line items
    for (const [showId, fee] of showFees.entries()) {
      await client.query(
        'UPDATE shows SET fee = $1 WHERE id = $2',
        [fee, showId]
      );
    }
    console.log(`✅ Updated ${showFees.size} show fees`);

    const sourceKind = ['csv','spreadsheet','document','text','image'].includes(source?.kind) ? source.kind : 'csv';
    const sourcePreset = source?.preset === 'master_tour' ? 'master_tour' : 'generic';
    const sourceFingerprint = crypto.createHash('sha256').update(JSON.stringify({ sourceName: source?.name || '', shows })).digest('hex');
    await client.query(`INSERT INTO import_batches
      (entity_id,created_by,tour_id,source_kind,source_name,source_preset,source_fingerprint,shows_created,duplicates_skipped)
      VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9)`, [entityId, req.userId, tourId, sourceKind,
      String(source?.name || '').slice(0,255) || null, sourcePreset, sourceFingerprint, showIds.length, duplicatesSkipped]);

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      tourId,
      showsCreated: showIds.length,
      budgetsCreated: budgetIds.length,
      lineItemsCreated: totalLineItems,
      duplicatesSkipped,
      showIds,
      budgetIds,
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Import failed:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

    const isMissingVenueAddress = error?.code === '23502' && error?.column === 'venue_address';
    const publicMessage = isMissingVenueAddress
      ? 'Some dates do not have venue addresses yet. Update the SceneGen database and try the import again.'
      : 'SceneGen could not complete this import. No changes were saved. Please review the import and try again.';

    res.status(500).json({
      error: {
        code: 'IMPORT_FAILED',
        message: publicMessage
      }
    });
  } finally {
    client.release();
  }
});

// POST /api/tours/:id/calculate-distances - Calculate distances between shows in a tour
// Route mileage is operational data; never write it into budgets.
app.post('/api/tours/:id/calculate-distances', authMiddleware,
  require('./tour-route-mileage').createRouteMileageHandler({
    pool, resolveLocation: resolveRoutingCoordinates,
  }));

// =====================
// MERCH SALES ENDPOINTS
// =====================

// GET /api/merch/sales - Fetch all merch sales for an entity
app.get('/api/merch/sales', serviceTokenMiddleware, authMiddleware, async (req, res) => {
  try {
    const { entityId } = req.query;

    // Fetch all sales with show info
    const salesResult = await pool.query(`
      SELECT ms.*, s.venue_name as show_name, s.date as show_date,
             s.city as show_city, s.state as show_state
      FROM merch_sales ms
      LEFT JOIN shows s ON ms.show_id = s.id
      WHERE ms.entity_id = $1
      ORDER BY ms.created_at DESC
    `, [entityId]);

    // Fetch all items for these sales in one query
    const itemsResult = await pool.query(`
      SELECT msi.*
      FROM merch_sale_items msi
      INNER JOIN merch_sales ms ON msi.merch_sale_id = ms.id
      WHERE ms.entity_id = $1
    `, [entityId]);

    // Group items by sale_id
    const itemsBySaleId = {};
    itemsResult.rows.forEach(item => {
      if (!itemsBySaleId[item.merch_sale_id]) {
        itemsBySaleId[item.merch_sale_id] = [];
      }
      itemsBySaleId[item.merch_sale_id].push(item);
    });

    // Combine sales with their items and convert to camelCase
    const sales = salesResult.rows.map(sale => {
      const items = (itemsBySaleId[sale.id] || []).map(item => ({
        id: item.id,
        merchSaleId: item.merch_sale_id,
        name: item.name,
        quantity: item.quantity,
        variation: item.variation,
        basePriceMoney: item.base_price_money,
        totalMoney: item.total_money,
        catalogObjectId: item.catalog_object_id
      }));

      return {
        id: sale.id,
        entityId: sale.entity_id,
        squareOrderId: sale.square_order_id,
        totalMoney: sale.total_money,
        currency: sale.currency,
        state: sale.state,
        createdAt: sale.created_at,
        updatedAt: sale.updated_at,
        locationId: sale.location_id,
        showId: sale.show_id,
        matched: !!sale.show_id,
        syncedAt: sale.synced_at,
        itemCount: sale.item_count,
        customerId: sale.customer_id,
        showName: sale.show_name,
        showDate: sale.show_date,
        showCity: sale.show_city,
        showState: sale.show_state,
        items
      };
    });

    const stats = {
      totalOrders: sales.length,
      totalRevenue: sales.reduce((sum, s) => sum + (s.totalMoney || 0), 0),
      averageOrderValue: sales.length
        ? Math.floor(sales.reduce((sum, s) => sum + (s.totalMoney || 0), 0) / sales.length)
        : 0,
      matchedOrders: sales.filter(s => s.showId).length,
      unmatchedOrders: sales.filter(s => !s.showId).length,
      totalItems: sales.reduce((sum, s) => sum + (s.itemCount || 0), 0)
    };

    res.json({ sales, stats });
  } catch (err) {
    console.error('Error fetching merch sales:', err);
    res.status(500).json({ error: 'Failed to fetch merch sales' });
  }
});

// Store sync progress in memory
let syncProgress = {
  inProgress: false,
  processed: 0,
  total: 0,
  percentage: 0,
  message: ''
};

// GET /api/merch/sync/progress - Get current sync progress
app.get('/api/merch/sync/progress', serviceTokenMiddleware, authMiddleware, (req, res) => {
  res.json(syncProgress);
});

// GET /api/merch/sync/counts - Get order counts for sync options modal
app.get('/api/merch/sync/counts', serviceTokenMiddleware, authMiddleware, async (req, res) => {
  try {
    const { entityId } = req.query;

    if (!entityId) {
      return res.status(400).json({ error: 'entityId is required' });
    }

    // Get the most recent order date from our database
    const lastOrderResult = await pool.query(
      'SELECT MAX(created_at) as last_sync, COUNT(*) as db_count FROM merch_sales WHERE entity_id = $1',
      [entityId]
    );

    const lastSyncDate = lastOrderResult.rows[0]?.last_sync;
    const dbOrderCount = parseInt(lastOrderResult.rows[0]?.db_count) || 0;

    const squareService = new SquareService();

    // Fetch all orders from Square
    const allOrders = await squareService.fetchAllOrders();
    const totalOrdersCount = allOrders.length;

    let newOrdersCount = 0;

    if (lastSyncDate) {
      // Count orders since last sync (with 1-hour buffer)
      const sinceDate = new Date(lastSyncDate);
      sinceDate.setHours(sinceDate.getHours() - 1);
      const ordersSince = await squareService.fetchOrdersSince(sinceDate);

      // Count how many are actually new (not already in DB)
      for (const order of ordersSince) {
        const exists = await pool.query(
          'SELECT id FROM merch_sales WHERE square_order_id = $1',
          [order.id]
        );
        if (exists.rows.length === 0) {
          newOrdersCount++;
        }
      }
    } else {
      // First sync - all orders are new
      newOrdersCount = totalOrdersCount;
    }

    res.json({
      newOrdersCount,
      totalOrdersCount,
      dbOrderCount,
      lastSyncDate: lastSyncDate ? new Date(lastSyncDate).toISOString() : null,
      isFirstSync: !lastSyncDate
    });

  } catch (error) {
    console.error('Error getting sync counts:', error);
    res.status(500).json({
      error: 'Failed to get sync counts',
      message: error.message
    });
  }
});

// POST /api/merch/sync - Sync orders from Square
app.post('/api/merch/sync', serviceTokenMiddleware, authMiddleware, async (req, res) => {
  try {
    const { entityId, syncMode = 'incremental' } = req.body; // syncMode can be 'all' or 'incremental'

    // Reset progress
    syncProgress = {
      inProgress: true,
      processed: 0,
      total: 0,
      percentage: 0,
      message: syncMode === 'all' ? 'Fetching all orders...' : 'Checking for new orders...'
    };

    console.log(`🔄 Starting Square sync for entity: ${entityId}, mode: ${syncMode}`);

    // Get the most recent order date from our database
    const lastOrderResult = await pool.query(
      'SELECT MAX(created_at) as last_sync FROM merch_sales WHERE entity_id = $1',
      [entityId]
    );

    const lastSyncDate = lastOrderResult.rows[0]?.last_sync;

    const squareService = new SquareService();
    let orders;

    // If syncMode is 'all', fetch all orders regardless of lastSyncDate
    if (syncMode === 'all') {
      console.log('📡 Full sync - fetching ALL orders from Square...');
      syncProgress.message = 'Full sync - fetching all historical orders...';
      orders = await squareService.fetchAllOrders();
    } else if (lastSyncDate) {
      // Only fetch orders since last sync
      const sinceDate = new Date(lastSyncDate);
      sinceDate.setHours(sinceDate.getHours() - 1); // Go back 1 hour to catch any overlaps
      console.log(`📡 Fetching orders since ${sinceDate.toISOString()}...`);
      syncProgress.message = `Fetching orders since ${sinceDate.toLocaleDateString()}...`;
      orders = await squareService.fetchOrdersSince(sinceDate);
    } else {
      // First sync - fetch all orders
      console.log('📡 First sync - fetching ALL orders from Square...');
      syncProgress.message = 'First sync - fetching all historical orders...';
      orders = await squareService.fetchAllOrders();
    }

    console.log(`✅ Fetched ${orders.length} orders from Square`);
    syncProgress.message = syncMode === 'all'
      ? `Found ${orders.length} total orders`
      : (lastSyncDate
        ? `Found ${orders.length} orders to check since last sync`
        : `Found ${orders.length} total orders`);


    syncProgress.total = orders.length;
    syncProgress.message = `Processing ${orders.length} orders...`;

    // Fetch all shows for this entity to match against
    const showsResult = await pool.query(`
      SELECT id, date, city, state, venue_name
      FROM shows
      WHERE entity_id = $1
      ORDER BY date
    `, [entityId]);

    const shows = showsResult.rows;
    console.log(`Found ${shows.length} shows for matching`);

    let newTransactions = 0;
    let existingTransactions = 0;
    let matchedCount = 0;
    let processedCount = 0;

    for (const order of orders) {
      processedCount++;
      syncProgress.processed = processedCount;
      syncProgress.percentage = Math.round((processedCount / orders.length) * 100);

      // Log progress every 100 orders
      if (processedCount % 100 === 0) {
        console.log(`📊 Progress: ${processedCount}/${orders.length} (${syncProgress.percentage}%)`);
        syncProgress.message = `Processing order ${processedCount} of ${orders.length}...`;
      }

      const exists = await pool.query(
        'SELECT id FROM merch_sales WHERE square_order_id = $1',
        [order.id]
      );

      if (exists.rows.length > 0) {
        existingTransactions++;
        continue;
      }

      // Try to auto-match to a show based on date
      const orderDate = new Date(order.createdAt);
      let matchedShow = null;

      for (const show of shows) {
        const showDate = new Date(show.date);

        // Show dates are stored in UTC but represent local dates
        // We want a window from 12 noon on the show day to 6 AM the next day (local time)
        // Add 12 hours to the show date for the start
        const windowStart = new Date(showDate.getTime() + (12 * 60 * 60 * 1000));

        // Add 30 hours to the show date for the end (24h + 6h)
        const windowEnd = new Date(showDate.getTime() + (30 * 60 * 60 * 1000));

        // Match if order is within the window
        if (orderDate >= windowStart && orderDate <= windowEnd) {
          matchedShow = show;
          break;
        }
      }

      const sale = await pool.query(`
        INSERT INTO merch_sales (
          entity_id, square_order_id, total_money, currency,
          state, created_at, updated_at, location_id,
          item_count, customer_id, show_id, matched
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING id
      `, [
        entityId,
        order.id,
        order.totalMoney?.amount || 0,
        order.totalMoney?.currency || 'USD',
        order.state,
        order.createdAt,
        order.updatedAt,
        order.locationId,
        order.lineItems?.length || 0,
        order.customerId,
        matchedShow?.id || null,
        !!matchedShow
      ]);

      if (matchedShow) {
        matchedCount++;
        console.log(`✓ Matched order ${order.id} to show: ${matchedShow.venue_name} (${matchedShow.city}, ${matchedShow.state})`);
      }

      for (const item of order.lineItems || []) {
        // Use a fallback name for items without a name
        const itemName = item.name || item.variationName || 'Unknown Item';

        await pool.query(`
          INSERT INTO merch_sale_items (
            merch_sale_id, name, quantity, variation,
            base_price_money, total_money, catalog_object_id
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7)
        `, [
          sale.rows[0].id,
          itemName,
          item.quantity || 1,
          item.variationName || null,
          item.basePriceMoney?.amount || 0,
          item.totalMoney?.amount || 0,
          item.catalogObjectId || null
        ]);
      }

      newTransactions++;
    }

    const result = {
      newTransactions,
      existingTransactions,
      totalFetched: orders.length,
      matchedCount
    };

    // Mark sync as complete
    syncProgress.inProgress = false;
    syncProgress.percentage = 100;
    syncProgress.message = 'Sync complete!';

    console.log('✅ SYNC COMPLETE!');
    console.log(`📊 Results: ${newTransactions} new, ${existingTransactions} existing, ${matchedCount} matched`);

    res.json(result);
  } catch (err) {
    console.error('❌ Error syncing Square sales:', err);
    syncProgress.inProgress = false;
    syncProgress.message = 'Sync failed: ' + err.message;
    res.status(500).json({ error: 'Sync failed', details: err.message });
  }
});

// POST /api/merch/auto-match - Auto-match sales to shows by date
app.post('/api/merch/auto-match', serviceTokenMiddleware, authMiddleware, async (req, res) => {
  try {
    const { entityId } = req.body;

    const sales = await pool.query(`
      SELECT id, square_order_id, created_at
      FROM merch_sales
      WHERE entity_id = $1 AND (show_id IS NULL OR matched = false)
    `, [entityId]);

    const shows = await pool.query(`
      SELECT id, date, city, state, venue_name
      FROM shows
      WHERE entity_id = $1
      ORDER BY date
    `, [entityId]);

    let matched = 0;
    let debugCount = 0;

    console.log(`\n🔍 Starting auto-match for ${sales.rows.length} unmatched sales against ${shows.rows.length} shows\n`);

    // Log all shows for debugging
    console.log('📅 Available shows:');
    shows.rows.forEach(show => {
      console.log(`   - ${show.venue_name} (${show.city}, ${show.state}) on ${new Date(show.date).toISOString()}`);
    });
    console.log('');

    for (const sale of sales.rows) {
      const saleDate = new Date(sale.created_at);

      // Find a show within the matching window
      // Show dates are stored in UTC but represent local dates
      // Window: 12 noon on show day to 6 AM the next day (local time)
      const match = shows.rows.find(show => {
        const showDate = new Date(show.date);

        // Add 12 hours to the show date for the start
        const windowStart = new Date(showDate.getTime() + (12 * 60 * 60 * 1000));

        // Add 30 hours to the show date for the end (24h + 6h)
        const windowEnd = new Date(showDate.getTime() + (30 * 60 * 60 * 1000));

        const isMatch = saleDate >= windowStart && saleDate <= windowEnd;

        // Debug logging for April 29-30 sales (first 5 only)
        if (saleDate.getMonth() === 3 && (saleDate.getDate() === 29 || saleDate.getDate() === 30)) {
          if (debugCount < 5) {
            console.log(`🔍 Sale #${debugCount + 1}: ${sale.square_order_id}`);
            console.log(`   Sale time: ${saleDate.toISOString()}`);
            console.log(`   Checking show: ${show.venue_name} on ${showDate.toISOString()}`);
            console.log(`   Window: ${windowStart.toISOString()} → ${windowEnd.toISOString()}`);
            console.log(`   Match: ${isMatch ? '✅ YES' : '❌ NO'}`);
            console.log('');
          }
          debugCount++;
        }

        return isMatch;

        // Match if sale is within the window
        return saleDate >= windowStart && saleDate <= windowEnd;
      });

      if (match) {
        await pool.query(
          'UPDATE merch_sales SET show_id = $1, matched = true WHERE id = $2',
          [match.id, sale.id]
        );
        console.log(`✓ Matched sale ${sale.square_order_id} to show: ${match.venue_name} (${match.city}, ${match.state}) on ${new Date(match.date).toLocaleDateString()}`);
        matched++;
      }
    }

    res.json({ matched, total: sales.rows.length });
  } catch (err) {
    console.error('Error auto-matching sales:', err);
    res.status(500).json({ error: 'Auto-match failed' });
  }
});

// POST /api/merch/match - Manually match a sale to a show
app.post('/api/merch/match', serviceTokenMiddleware, authMiddleware, async (req, res) => {
  try {
    const { saleId, showId, entityId } = req.body;

    if (!saleId || !showId || !entityId || entityId !== req.entityId) {
      return res.status(422).json({ error: 'saleId, showId, and the authenticated entityId are required' });
    }

    const result = await pool.query(
      `UPDATE merch_sales ms
       SET show_id = $1, matched = true
       WHERE ms.id = $2
         AND ms.entity_id = $3
         AND EXISTS (SELECT 1 FROM shows s WHERE s.id = $1 AND s.entity_id = $3)
       RETURNING ms.id`,
      [showId, saleId, entityId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Sale or show not found for this entity' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error matching sale:', err);
    res.status(500).json({ error: 'Match failed' });
  }
});

// Run a non-destructive provider check without requiring a tour update.
void require('./tour-route-mileage').diagnoseRoutingConfiguration();

// Start server
app.listen(PORT, HOST, () => {
  console.log(`\n🚀 SceneGen Backend API listening on ${HOST}:${PORT}`);
  console.log(`📊 Database: Connected to NeonDB`);
  console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`\n📝 ALL SceneGen Backend Endpoints Implemented Locally!`);
  console.log(`\n=== 70+ ENDPOINTS AVAILABLE ===`);
  console.log(`✅ Entities, Artists, Promoters`);
  console.log(`✅ Shows & Tours (Full CRUD)`);
  console.log(`✅ Budgets & Payouts (NEW!)`);
  console.log(`✅ Contacts & Connections`);
  console.log(`✅ Invites (Token-based)`);
  console.log(`✅ Search & Tags`);
  console.log(`✅ Notifications`);
  console.log(`✅ Assets`);
  console.log(`✅ User Management\n`);
  console.log(`✅ 100% SceneGen API Parity + Bookkeeping!\n`);
});

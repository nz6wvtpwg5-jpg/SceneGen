'use strict';

const crypto = require('node:crypto');

/** Shared database-backed rate limit, scoped to authenticated user + artist workspace.
 * This is enforced before any private-contact discovery queries are executed.
 */
async function consumeDiscoveryAllowance(pool, { userId, entityId, action = 'search', maxAttempts = 180, windowSeconds = 900 }) {
  if (!/^[0-9a-f-]{36}$/i.test(String(userId || '')) || !/^[0-9a-f-]{36}$/i.test(String(entityId || ''))) return false;
  const key = crypto.createHash('sha256').update(`promoter-discovery:${action}:${userId}:${entityId}`).digest('hex');
  const result = await pool.query(`INSERT INTO auth_rate_limits (rate_key, window_started_at, attempts)
    VALUES ($1, NOW(), 1)
    ON CONFLICT (rate_key) DO UPDATE SET
      window_started_at = CASE WHEN auth_rate_limits.window_started_at < NOW() - ($2 * INTERVAL '1 second') THEN NOW() ELSE auth_rate_limits.window_started_at END,
      attempts = CASE WHEN auth_rate_limits.window_started_at < NOW() - ($2 * INTERVAL '1 second') THEN 1 ELSE auth_rate_limits.attempts + 1 END
    RETURNING attempts`, [key, windowSeconds]);
  return Number(result.rows[0]?.attempts) <= maxAttempts;
}

module.exports = { consumeDiscoveryAllowance };

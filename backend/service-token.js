'use strict';

const crypto = require('node:crypto');

/** Authenticate service-to-service requests from the SceneGen web app. */
function validServiceToken(expected, received) {
  if (typeof expected !== 'string' || !expected || typeof received !== 'string' || !received) return false;
  // Compare fixed-length digests in constant time without leaking token lengths.
  const left = crypto.createHash('sha256').update(expected, 'utf8').digest();
  const right = crypto.createHash('sha256').update(received, 'utf8').digest();
  return crypto.timingSafeEqual(left, right);
}

function serviceTokenMiddleware(req, res, next) {
  const expected = process.env.BACKEND_SERVICE_TOKEN;
  if (!expected) {
    return res.status(503).json({ error: { code: 'SERVICE_NOT_CONFIGURED', message: 'Private API authentication is not configured' } });
  }
  const supplied = req.headers?.['x-scenegen-service-token'];
  if (!validServiceToken(expected, supplied)) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'A valid SceneGen service token is required' } });
  }
  return next();
}

module.exports = { validServiceToken, serviceTokenMiddleware };

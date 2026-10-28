'use strict';

/** Non-secret backend build metadata for a service-authenticated health probe. */
function deploymentCapabilitiesHandler(req, res) {
  res.set('Cache-Control', 'private, no-store');
  return res.json({
    service: 'scenegen-api',
    status: 'ready',
    commit: process.env.RENDER_GIT_COMMIT?.slice(0, 12) || null,
  });
}

module.exports = { deploymentCapabilitiesHandler };

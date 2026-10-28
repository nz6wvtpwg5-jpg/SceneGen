const crypto = require('crypto');
const http2 = require('http2');

let cachedJwt = null;
let cachedAt = 0;

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function providerToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && now - cachedAt < 50 * 60) return cachedJwt;
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APPLE_DEVELOPER_TEAM_ID;
  const privateKey = process.env.APNS_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!keyId || !teamId || !privateKey) return null;
  const header = base64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const claims = base64url(JSON.stringify({ iss: teamId, iat: now }));
  const unsigned = `${header}.${claims}`;
  const signature = crypto.sign('sha256', Buffer.from(unsigned), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  cachedAt = now;
  cachedJwt = `${unsigned}.${signature}`;
  return cachedJwt;
}

function safeActionUrl(value) {
  const route = typeof value === 'string' ? value.trim() : '';
  return route.startsWith('/') && !route.startsWith('//') ? route : '/notifications';
}

function sendOne(device, notification) {
  const jwt = providerToken();
  const topic = process.env.APNS_BUNDLE_ID || 'io.scenegen.app';
  if (!jwt) return Promise.resolve({ skipped: true });
  const host = device.environment === 'sandbox' ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com';
  return new Promise((resolve, reject) => {
    const client = http2.connect(host);
    client.once('error', reject);
    const request = client.request({
      ':method': 'POST', ':path': `/3/device/${device.token}`,
      authorization: `bearer ${jwt}`, 'apns-topic': topic, 'apns-push-type': 'alert',
      'apns-priority': '10', 'content-type': 'application/json'
    });
    let status = 0;
    let responseBody = '';
    request.on('response', (headers) => { status = Number(headers[':status'] || 0); });
    request.on('data', (chunk) => { responseBody += chunk; });
    request.on('end', () => { client.close(); resolve({ status, responseBody }); });
    request.on('error', (error) => { client.close(); reject(error); });
    request.end(JSON.stringify({
      aps: { alert: { title: String(notification.title).slice(0, 120), body: String(notification.message).slice(0, 800) }, sound: 'default' },
      actionUrl: safeActionUrl(notification.actionUrl), notificationId: notification.id
    }));
  });
}

async function sendNativePush(pool, notification) {
  if (!providerToken()) return;
  const result = await pool.query(
    `SELECT id, token, environment FROM native_push_devices
     WHERE user_id = $1 AND entity_id = $2::uuid AND enabled = true`,
    [notification.userId, notification.entityId]
  );
  await Promise.allSettled(result.rows.map(async (device) => {
    const response = await sendOne(device, notification);
    if (response.status === 410 || response.status === 400 && /BadDeviceToken|DeviceTokenNotForTopic/.test(response.responseBody)) {
      await pool.query('UPDATE native_push_devices SET enabled = false WHERE id = $1', [device.id]);
    }
    if (response.status && response.status >= 400) throw new Error(`APNs rejected push with status ${response.status}`);
  }));
}

module.exports = { safeActionUrl, sendNativePush };

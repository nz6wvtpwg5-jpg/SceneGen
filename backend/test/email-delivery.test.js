const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('day-sheet invitation is delivered through Resend with safe branded content', async (t) => {
  const originalFetch = global.fetch;
  const originalEnvironment = { ...process.env };
  t.after(() => {
    global.fetch = originalFetch;
    process.env = originalEnvironment;
  });
  process.env.RESEND_API_KEY = 'test-key';
  process.env.EMAIL_FROM = 'SceneGen <support@scenegen.io>';
  process.env.EMAIL_REPLY_TO = 'support@scenegen.io';
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, json: async () => ({ id: 'email-id' }) };
  };

  delete require.cache[require.resolve('../email')];
  const { sendDaySheetInvitation } = require('../email');
  const id = await sendDaySheetInvitation({
    to: ' Agent@Example.com ',
    recipientName: '<Alex>',
    entityName: 'Band & Co',
    scope: 'European shows',
    invitationUrl: 'https://scenegen.io/day-sheet-invite/token',
  });

  assert.equal(id, 'email-id');
  assert.equal(request.url, 'https://api.resend.com/emails');
  const payload = JSON.parse(request.options.body);
  assert.deepEqual(payload.to, ['agent@example.com']);
  assert.equal(payload.from, 'SceneGen <support@scenegen.io>');
  assert.equal(payload.reply_to, 'support@scenegen.io');
  assert.match(payload.html, /&lt;Alex&gt;/);
  assert.match(payload.html, /Band &amp; Co/);
  assert.match(payload.html, /Access day sheets/);
});

test('combined invitations clearly explain booking-agent status and activation', async (t) => {
  const originalFetch = global.fetch;
  const originalEnvironment = { ...process.env };
  t.after(() => { global.fetch = originalFetch; process.env = originalEnvironment; });
  process.env.RESEND_API_KEY = 'test-key';
  process.env.EMAIL_FROM = 'SceneGen <support@scenegen.io>';
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, json: async () => ({ id: 'agent-email-id' }) };
  };
  delete require.cache[require.resolve('../email')];
  const { sendDaySheetInvitation } = require('../email');
  await sendDaySheetInvitation({
    to: 'jacob@example.com', recipientName: 'Jacob', entityName: 'CONAN',
    scope: 'Europe and United Kingdom', invitationUrl: 'https://scenegen.io/day-sheet-invite/token',
    inviteAsBookingAgent: true,
  });
  const payload = JSON.parse(request.options.body);
  assert.equal(payload.subject, 'CONAN invited you to become their booking agent on SceneGen');
  assert.match(payload.html, /join as their booking agent/);
  assert.match(payload.html, /CONAN already on your roster/);
  assert.match(payload.html, /Review and accept invitation/);
  assert.doesNotMatch(payload.html, />Access day sheets</);
  assert.equal(payload.tags[0].value, 'booking-agent-invitation');
});

test('email delivery fails clearly when Resend is not configured', async (t) => {
  const originalEnvironment = { ...process.env };
  t.after(() => { process.env = originalEnvironment; });
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  delete process.env.AUTH_EMAIL_FROM;
  delete require.cache[require.resolve('../email')];
  const { sendDaySheetInvitation } = require('../email');
  await assert.rejects(() => sendDaySheetInvitation({
    to: 'agent@example.com', recipientName: 'Alex', entityName: 'Band',
    scope: 'one show', invitationUrl: 'https://scenegen.io/invite',
  }), /not configured/);
});

test('email delivery rejects multiple recipients and header injection', async (t) => {
  const originalEnvironment = { ...process.env };
  t.after(() => { process.env = originalEnvironment; });
  process.env.RESEND_API_KEY = 'test-key';
  process.env.EMAIL_FROM = 'SceneGen <support@scenegen.io>';
  delete require.cache[require.resolve('../email')];
  const { sendTransactionalEmail } = require('../email');
  const message = { subject: 'Invitation', heading: 'Hello', body: 'Body', action: 'Open', actionUrl: 'https://scenegen.io/invite', category: 'test' };
  await assert.rejects(() => sendTransactionalEmail({ ...message, to: 'one@example.com,two@example.com' }), /exactly one address/);
  await assert.rejects(() => sendTransactionalEmail({ ...message, to: 'one@example.com', subject: 'Invitation\r\nBcc: attacker@example.com' }), /subject is invalid/);
});

test('all account links use the validated public application URL', () => {
  const files = [
    '../src/app/api/account/register/route.ts',
    '../src/app/api/account/forgot-password/route.ts',
    '../src/app/api/account/resend-verification/route.ts',
    '../src/app/api/collaborator-access/request-link/route.ts',
  ];
  for (const file of files) {
    assert.match(fs.readFileSync(path.join(root, file), 'utf8'), /publicAppUrl/);
  }
});

test('production account links require a public HTTPS origin', async (t) => {
  const originalEnvironment = { ...process.env };
  t.after(() => { process.env = originalEnvironment; });
  process.env.NODE_ENV = 'production';
  process.env.APP_URL = 'http://example.com';
  const source = fs.readFileSync(path.join(root, '../src/lib/public-app-url.ts'), 'utf8');
  assert.match(source, /production \? 'https:\/\/scenegen-web\.onrender\.com'/);
  assert.match(source, /url\.protocol !== 'https:'/);
  assert.doesNotMatch(source, /production \? fallbackOrigin/);
});

test('production scan covers Resend and configuration-file credentials', () => {
  const source = fs.readFileSync(path.join(root, '../scripts/check-production-surface.js'), 'utf8');
  assert.match(source, /embedded Resend API credential/);
  assert.match(source, /embedded private key/);
  assert.match(source, /embedded database credential/);
  assert.match(source, /git', \['ls-files'/);
  assert.doesNotMatch(source, /existingCredentialFingerprints/);
});

test('both Render services declare the complete transactional email contract', () => {
  const blueprint = fs.readFileSync(path.join(root, '../render.yaml'), 'utf8');
  for (const key of ['RESEND_API_KEY', 'EMAIL_FROM', 'EMAIL_REPLY_TO', 'APP_URL']) {
    assert.equal((blueprint.match(new RegExp(`- key: ${key}`, 'g')) || []).length, 2, `${key} must be declared for web and API`);
  }
  assert.equal((blueprint.match(/- key: RESEND_API_KEY\s+sync: false/g) || []).length, 2);
  assert.doesNotMatch(blueprint, /\bAUTH_EMAIL_FROM\b/);
});

test('day-sheet invitation retains a manual link when email delivery fails', () => {
  const route = fs.readFileSync(path.join(root, 'day-sheet-collaborators.js'), 'utf8');
  assert.match(route, /emailDelivery = 'failed'/);
  assert.match(route, /inviteUrl, emailDelivery/);
  assert.match(route, /inviteAsBookingAgent/);
  assert.match(route, /updatedExisting \|\| inviteAsBookingAgent/);
});

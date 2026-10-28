const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateAuthorizationRequest, serializePublicShow, pkceChallenge, digest } = require('../droptune-oauth');

const configured = {
  clientId: 'droptune-production',
  clientSecret: 'a'.repeat(40),
  redirectUris: ['https://droptune.io/api/integrations/scenegen/callback'],
};
const request = {
  client_id: configured.clientId,
  redirect_uri: configured.redirectUris[0],
  response_type: 'code', scope: 'shows.read',
  state: 'secure-state-value-123456789',
  code_challenge: 'A'.repeat(43), code_challenge_method: 'S256',
};

test('accepts only the exact client, callback, scope, state and PKCE request', () => {
  assert.equal(validateAuthorizationRequest(request, configured), null);
  assert.equal(validateAuthorizationRequest({ ...request, redirect_uri: 'https://evil.example/callback' }, configured), 'invalid_redirect_uri');
  assert.equal(validateAuthorizationRequest({ ...request, scope: 'shows.read finances.read' }, configured), 'invalid_scope');
  assert.equal(validateAuthorizationRequest({ ...request, state: '' }, configured), 'invalid_request');
  assert.equal(validateAuthorizationRequest({ ...request, code_challenge_method: 'plain' }, configured), 'invalid_request');
});

test('PKCE and stored token hashes are deterministic without storing raw secrets', () => {
  const verifier = 'v'.repeat(43);
  assert.equal(pkceChallenge(verifier), pkceChallenge(verifier));
  assert.notEqual(pkceChallenge(verifier), verifier);
  assert.match(digest('secret-token'), /^[a-f0-9]{64}$/);
  assert.notEqual(digest('secret-token'), 'secret-token');
});

test('public show serialization cannot disclose private operational or financial data', () => {
  const result = serializePublicShow({
    id: 'show-1', date: '2026-10-01', start_time: '20:00', door_time: '19:00',
    venue_name: 'The Venue', city: 'Liverpool', state: 'Merseyside', country: 'UK',
    festival_name: null, status: 'confirmed', updated_at: '2026-09-10',
    fee: 5000, guaranteed_fee: 5000, promoter_email: 'private@example.test', notes: 'private',
    venue_address: 'private', hotel_name: 'private', travel_details: 'private',
  });
  assert.deepEqual(Object.keys(result).sort(), ['city','country','date','doorsTime','festivalName','id','region','startTime','status','updatedAt','venueName'].sort());
  assert.equal(JSON.stringify(result).includes('private'), false);
  assert.equal(JSON.stringify(result).includes('5000'), false);
});

test('managed OAuth migration stores only token hashes and enforces artist-scoped grants', () => {
  const sql = fs.readFileSync(path.join(__dirname, '../migrations/065_droptune_oauth.sql'), 'utf8');
  assert.match(sql, /entity_id UUID NOT NULL REFERENCES entities/);
  assert.match(sql, /CHECK \(scope = 'shows\.read'\)/);
  assert.match(sql, /access_token_hash CHAR\(64\)/);
  assert.match(sql, /refresh_token_hash CHAR\(64\)/);
  assert.doesNotMatch(sql, /\baccess_token\s+TEXT|\brefresh_token\s+TEXT/i);
});

test('OAuth routes are mounted before SceneGen private product authentication', () => {
  const server = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  const oauth = server.indexOf("app.use('/oauth', createPublicOAuthRouter(pool))");
  const privateApi = server.indexOf("app.use('/api', createPrivateIdentityMiddleware())");
  assert.ok(oauth >= 0 && privateApi > oauth);
});

test('sign-in preserves the complete OAuth callback through password and Google login', () => {
  const root = path.join(__dirname, '../..');
  const middleware = fs.readFileSync(path.join(root, 'src/middleware.ts'), 'utf8');
  const login = fs.readFileSync(path.join(root, 'src/app/login/page.tsx'), 'utf8');
  assert.match(middleware, /`\$\{pathname\}\$\{req\.nextUrl\.search\}`/);
  assert.match(login, /setCallbackUrl\(requested\)/);
  assert.match(login, /signIn\("google", \{ callbackUrl \}\)/);
  assert.match(login, /window\.location\.assign\(callbackUrl\)/);
});

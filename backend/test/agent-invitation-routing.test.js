/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('direct booking-agent invitation acceptance returns an activatable relationship', () => {
  const backend = read('backend/day-sheet-collaborators.js');
  const acceptance = backend.slice(backend.indexOf("router.post('/day-sheet-invitations/:token/accept'"), backend.indexOf("router.delete('/day-sheet-collaborators/:kind/:id'"));
  assert.match(acceptance, /jsonb_build_object\('displayName',\$4::text\)/);
  assert.match(acceptance, /RETURNING id/);
  assert.match(acceptance, /bookingAgentRelationshipId/);
  assert.match(acceptance, /acceptedGrant\.rows\[0\]\.id/);
});

test('direct agent invite creates the full agent session and opens the agent roster', () => {
  const invite = read('src/app/day-sheet-invite/[token]/page.tsx');
  assert.match(invite, /bookingAgentRelationshipId/);
  assert.match(invite, /booking-agent-activate/);
  assert.match(invite, /callback\/booking-agent-activation/);
  assert.match(invite, /activation-confirmation/);
  assert.match(invite, /window\.location\.replace\('\/agent'\)/);
});

test('booking-agent intent survives invitation lookup and is explicit on the landing page', () => {
  const backend = read('backend/day-sheet-collaborators.js');
  const lookup = backend.slice(backend.indexOf("router.get('/day-sheet-invitations/:token'"), backend.indexOf("router.post('/day-sheet-invitations/:token/accept'"));
  const invite = read('src/app/day-sheet-invite/[token]/page.tsx');
  assert.match(lookup, /i\.invite_as_booking_agent/);
  assert.match(lookup, /booking_agent_relationship_id/);
  assert.match(invite, /Booking-agent invitation/);
  assert.match(invite, /has invited you to become their booking agent/);
  assert.match(invite, /Accept booking-agent invitation/);
  assert.match(invite, /adds .* to your booking-agent roster/);
});

test('booking-agent password recovery resumes into the agent workspace', () => {
  const invite = read('src/app/day-sheet-invite/[token]/page.tsx');
  assert.match(invite, /data\.invitation\.booking_agent_relationship_id/);
  assert.match(invite, /invitation\.booking_agent_relationship_id/);
  assert.match(invite, /Create password and open booking-agent workspace/);
  assert.match(invite, /enterBookingAgentView\(relationshipId\)/);
});

test('existing agents cannot be sent through generic role selection', () => {
  const onboarding = read('src/app/onboarding/page.tsx');
  assert.match(onboarding, /fetch\('\/api\/booking-agent\/profile'/);
  assert.match(onboarding, /router\.replace\('\/agent'\)/);
  assert.match(onboarding, /checkingExistingAgent/);
});

test('revoking collaborator access clears the displayed invitation link', () => {
  const component = read('src/components/manage/DaySheetCollaborators.tsx');
  const revoke = component.slice(component.indexOf('async function revoke('), component.indexOf('async function refreshAccessLink'));
  assert.equal((revoke.match(/setInviteUrl\(["']{2}\)/g) || []).length, 1);
  assert.match(revoke, /setInviteRecipient\(["']{2}\)/);
  assert.match(revoke, /setInviteEmailDelivered\(false\)/);
  assert.doesNotMatch(revoke, /mode=person|removePerson/);
  assert.match(component, /setInviteEntityId\(entityId\)/);
  assert.match(component, /inviteUrl && inviteEntityId === entityId/);
});

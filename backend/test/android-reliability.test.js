const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('location entry remains usable without Google Places on Android', () => {
  const places = read('src/components/ui/PlacesAutocomplete.tsx');
  const onboarding = read('src/app/onboarding/page.tsx');
  assert.doesNotMatch(places, /disabled=\{!isScriptLoaded\}/);
  assert.match(places, /Type your city or location manually/);
  assert.match(places, /pointerdown/);
  assert.match(places, /script\.addEventListener\('error'/);
  assert.match(onboarding, /city: formData\.city \|\| locationInput\.trim\(\)/);
});

test('global API timeout never aborts mutation requests', () => {
  const provider = read('src/components/providers/api-availability-provider.tsx');
  assert.match(provider, /method === 'GET' \|\| method === 'HEAD'/);
  assert.match(provider, /!isSafeRequest/);
});

test('copy links have an Android-compatible fallback', () => {
  const clipboard = read('src/lib/clipboard.ts');
  assert.match(clipboard, /navigator\.clipboard\?\.writeText/);
  assert.match(clipboard, /document\.execCommand\('copy'\)/);
  assert.equal(
    ['src/components/invites/GenerateInvite.tsx', 'src/components/manage/DaySheetCollaborators.tsx', 'src/components/shows/ShareShowModal.tsx', 'src/components/shows/CreateShowForm.tsx', 'src/app/agent/page.tsx']
      .some((file) => /navigator\.clipboard\.writeText/.test(read(file))),
    false,
  );
});

test('share modal remains usable above the Android keyboard', () => {
  const modal = read('src/components/shows/ShareShowModal.tsx');
  assert.match(modal, /overflow-y-auto/);
  assert.match(modal, /100dvh/);
});

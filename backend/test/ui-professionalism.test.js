const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function userInterfaceSource(relativePath) {
  return read(relativePath)
    .split('\n')
    .filter((line) => !line.includes('console.') && !line.includes('{/*') && !/^\s*(\/\/|\*)/.test(line))
    .join('\n');
}

test('onboarding presents all roles with the shared icon system', () => {
  const source = read('src/app/onboarding/page.tsx');

  assert.match(source, /Music2/);
  assert.match(source, /BriefcaseBusiness/);
  assert.match(source, /Megaphone/);
  assert.match(source, /How do you work in live music\?/);
  assert.doesNotMatch(source, /🎸|🎤|🤝|📩|💡/u);
});

test('prominent user-interface components do not use decorative emoji', () => {
  const files = [
    'src/app/bookkeeping/page.tsx',
    'src/app/calendar/page.tsx',
    'src/app/import/components/Step3Validation.tsx',
    'src/app/invite/[token]/page.tsx',
    'src/app/merch/page.tsx',
    'src/app/touring/page.tsx',
    'src/app/tours/page.tsx',
    'src/app/tours/[id]/page.tsx',
    'src/components/merch/analytics/Recommendations.tsx',
    'src/components/shows/CreateShowForm.tsx',
    'src/components/touring/PromoterContactsList.tsx',
    'src/components/tours/CreateTourModal.tsx',
  ];
  const decorativeEmoji = /🎸|🎤|🤝|📩|💡|✅|❌|⚠️|🔍|✉️|📅|📍|🗺️|☕|✈️|🎉/u;

  for (const file of files) {
    assert.doesNotMatch(userInterfaceSource(file), decorativeEmoji, file);
  }
});

test('merch guidance uses professional text labels', () => {
  const recommendations = read('src/lib/merch/buildRecommendations.ts');
  const loadout = read('src/lib/merch/tourLoadout.ts');

  assert.doesNotMatch(recommendations, /📈|📉|⭐|⚠️|🌍|📍|🧥|👕|💿|🎨|💰|📊/u);
  assert.doesNotMatch(loadout, /⚠️|❌|🧥|👕|✅/u);
});

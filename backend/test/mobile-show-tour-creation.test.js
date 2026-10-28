const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('show creation and editing use full-screen mobile workspaces', () => {
  const page = read('src/app/shows/page.tsx');
  const form = read('src/components/shows/CreateShowForm.tsx');

  assert.match(page, /fixed inset-0 z-\[100\] overflow-y-auto/);
  assert.match(page, /min-h-\[100dvh\]/);
  assert.match(page, /mobile-safe-top sticky top-0/);
  assert.match(form, /mobile-create-form/);
  assert.match(form, /mobile-create-actions grid grid-cols-2/);
});

test('tour creation is a thumb-friendly full-screen mobile workflow', () => {
  const modal = read('src/components/tours/CreateTourModal.tsx');

  assert.match(modal, /z-\[120\] overflow-y-auto/);
  assert.match(modal, /min-h-\[100dvh\]/);
  assert.match(modal, /mobile-safe-top sticky top-0/);
  assert.match(modal, /mobile-create-actions/);
  assert.match(modal, /min-h-12 flex-1/);
});

test('mobile create fields avoid iOS zoom and Places results stay usable', () => {
  const css = read('src/app/globals.css');

  assert.match(css, /mobile-create-form input[\s\S]*font-size: 1rem/);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(css, /mobile-create-actions \{[^}]*margin-inline/s);
  assert.match(css, /\.pac-container \{ z-index: 200 !important/);
  assert.match(css, /\.pac-item \{ min-height: 3rem/);
});

test('show validation and Google Places selection contracts remain intact', () => {
  const form = read('src/components/shows/CreateShowForm.tsx');
  const places = read('src/components/ui/PlacesAutocomplete.tsx');

  assert.match(form, /<select id="show-currency"\s+required/);
  assert.match(form, /required=\{!fromCalendarEvent && !isEditing && !isSelfPromoted\}/);
  assert.match(places, /onPlaceSelect/);
  assert.match(places, /address_components/);
  assert.match(places, /onChangeRef\.current/);
  assert.match(places, /autocompleteRef\.current = null/);
});

test('the Capacitor entry keeps its dedicated iPhone landing page', () => {
  const page = read('src/app/app/page.tsx');
  const middleware = read('src/middleware.ts');
  assert.match(page, /NativeAppLanding/);
  assert.doesNotMatch(middleware, /pathname === ["']\/app["']/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { checksum, discoverMigrations, runMigrations } = require('../migrate-deploy');

function migrationDirectory(files) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'scenegen-migrations-'));
  for (const [name, contents] of Object.entries(files)) {
    fs.writeFileSync(path.join(directory, name), contents);
  }
  return directory;
}

function fakeDatabase(handler) {
  const queries = [];
  const client = {
    async query(sql, values) {
      queries.push({ sql, values });
      return handler(sql, values, queries);
    },
    release() { queries.push({ sql: 'RELEASE' }); },
  };
  return { connect: async () => client, queries };
}

test('discovers only numbered SQL migrations in deterministic order', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'scenegen-migrations-'));
  try {
    fs.writeFileSync(path.join(directory, '003_third.sql'), 'SELECT 3;');
    fs.writeFileSync(path.join(directory, '002_second.sql'), 'SELECT 2;');
    fs.writeFileSync(path.join(directory, 'notes.sql'), 'SELECT 1;');
    fs.writeFileSync(path.join(directory, '004_script.js'), 'throw new Error();');
    assert.deepEqual(discoverMigrations(directory).map((item) => item.name), ['002_second.sql', '003_third.sql']);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('production migrations include the routing columns used by the importer', () => {
  const migrations = discoverMigrations();
  const routingMigration = migrations.find(({ name }) => name === '012_show_routing_schema.sql');

  assert.ok(routingMigration, 'routing schema must be a numbered deploy migration');
  assert.match(routingMigration.sql, /venue_lat/i);
  assert.match(routingMigration.sql, /venue_lng/i);
  assert.match(routingMigration.sql, /show_type/i);
});

test('show currency prerequisite runs before the currency reconciliation migration', () => {
  const migrations = discoverMigrations();
  const prerequisiteIndex = migrations.findIndex(({ name }) => name === '019_z_add_show_currency_prerequisite.sql');
  const reconciliationIndex = migrations.findIndex(({ name }) => name === '020_tour_currency_integrity.sql');

  assert.ok(prerequisiteIndex >= 0, 'shows.currency must be created by a managed migration');
  assert.ok(reconciliationIndex > prerequisiteIndex, 'the prerequisite must run before currency reconciliation');
  assert.match(migrations[prerequisiteIndex].sql, /ALTER TABLE shows ADD COLUMN IF NOT EXISTS currency/i);
});

test('production migrations do not use GRANT as an unquoted table alias', () => {
  for (const migration of discoverMigrations()) {
    assert.doesNotMatch(migration.sql, /\b(?:UPDATE|FROM|JOIN)\s+\S+\s+grant\b/i, migration.name);
  }
});

test('migration checksums change when SQL changes', () => {
  assert.notEqual(checksum('SELECT 1;'), checksum('SELECT 2;'));
  assert.equal(checksum('SELECT 1;'), checksum('SELECT 1;'));
});

test('refuses to run when an applied migration checksum changes', async () => {
  const directory = migrationDirectory({ '002_auth.sql': 'SELECT 2;' });
  const database = fakeDatabase(async (sql) => {
    if (sql.startsWith('SELECT name, checksum')) {
      return { rows: [{ name: '002_auth.sql', checksum: checksum('SELECT 1;') }] };
    }
    return { rows: [] };
  });
  try {
    await assert.rejects(runMigrations(database, directory), /has been modified/);
    assert.equal(database.queries.some(({ sql }) => sql === 'BEGIN'), false);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('rolls back a failed migration and releases the advisory lock', async () => {
  const directory = migrationDirectory({ '002_auth.sql': 'BROKEN SQL;' });
  const database = fakeDatabase(async (sql) => {
    if (sql.startsWith('SELECT name, checksum')) return { rows: [] };
    if (sql === 'BROKEN SQL;') throw new Error('migration failed');
    return { rows: [] };
  });
  try {
    await assert.rejects(runMigrations(database, directory), /migration failed/);
    assert.equal(database.queries.some(({ sql }) => sql === 'ROLLBACK'), true);
    assert.equal(database.queries.some(({ sql }) => sql.startsWith('SELECT pg_advisory_unlock')), true);
    assert.equal(database.queries.at(-1).sql, 'RELEASE');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

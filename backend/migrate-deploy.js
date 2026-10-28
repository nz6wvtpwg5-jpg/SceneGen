const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIRECTORY = path.join(__dirname, 'migrations');
const MIGRATION_FILE_PATTERN = /^\d{3}_[a-z0-9_-]+\.sql$/i;
const ADVISORY_LOCK_ID = 724246031;

function checksum(contents) {
  return crypto.createHash('sha256').update(contents).digest('hex');
}

function discoverMigrations(directory = MIGRATIONS_DIRECTORY) {
  return fs.readdirSync(directory)
    .filter((name) => MIGRATION_FILE_PATTERN.test(name))
    .sort((left, right) => left.localeCompare(right))
    .map((name) => {
      const sql = fs.readFileSync(path.join(directory, name), 'utf8');
      return { name, sql, checksum: checksum(sql) };
    });
}

async function runMigrations(database, directory = MIGRATIONS_DIRECTORY) {
  if (!database) throw new Error('A database pool is required');
  const client = await database.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_ID]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

    const appliedResult = await client.query('SELECT name, checksum FROM schema_migrations ORDER BY name');
    const applied = new Map(appliedResult.rows.map((row) => [row.name, row.checksum.trim()]));
    const migrations = discoverMigrations(directory);

    for (const migration of migrations) {
      const previousChecksum = applied.get(migration.name);
      if (previousChecksum) {
        if (previousChecksum !== migration.checksum) {
          throw new Error(`Applied migration ${migration.name} has been modified`);
        }
        console.log(`↷ ${migration.name} already applied`);
        continue;
      }

      console.log(`→ Applying ${migration.name}`);
      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [migration.name, migration.checksum]);
        await client.query('COMMIT');
        console.log(`✓ Applied ${migration.name}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    try { await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_ID]); } catch {}
    client.release();
  }
}

if (require.main === module) {
  require('dotenv').config({ path: __dirname + '/.env' });
  const database = require('./db');
  runMigrations(database)
    .then(async () => { console.log('✓ Database migrations are current'); await database.end(); })
    .catch(async (error) => { console.error('Migration deployment failed:', error.message); await database.end(); process.exitCode = 1; });
}

module.exports = { checksum, discoverMigrations, runMigrations };

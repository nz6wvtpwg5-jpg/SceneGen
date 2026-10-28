require('dotenv').config({ path: __dirname + '/.env' });
const crypto = require('crypto');
const { promisify } = require('util');
const pool = require('./db');
const scryptAsync = promisify(crypto.scrypt);

async function passwordHash(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scryptAsync(password, salt, 64, { N: 1 << 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 });
  return `scrypt$131072$8$1$${salt.toString('base64')}$${derived.toString('base64')}`;
}

async function main() {
  if (process.env.ALLOW_APP_REVIEW_SEED !== 'true') throw new Error('Set ALLOW_APP_REVIEW_SEED=true for this one controlled run');
  const email = String(process.env.APP_REVIEW_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.APP_REVIEW_PASSWORD || '');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || password.length < 16) throw new Error('Provide APP_REVIEW_EMAIL and a unique APP_REVIEW_PASSWORD of at least 16 characters');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const user = await client.query(`INSERT INTO users(email,name,password_hash,email_verified_at,deleted_at)
      VALUES($1,'Apple App Review',$2,NOW(),NULL)
      ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name,password_hash=EXCLUDED.password_hash,
        email_verified_at=NOW(),deleted_at=NULL,updated_at=NOW() RETURNING id`, [email, await passwordHash(password)]);
    const userId = user.rows[0].id;
    let entity = await client.query(`SELECT id FROM entities WHERE administrator_id=$1::text AND name='SceneGen Review Tour' LIMIT 1`, [userId]);
    if (!entity.rowCount) entity = await client.query(`INSERT INTO entities(administrator_id,entity_type,name,city,country)
      VALUES($1::text,'artist','SceneGen Review Tour','Liverpool','United Kingdom') RETURNING id`, [userId]);
    const entityId = entity.rows[0].id;
    await client.query(`INSERT INTO shows(entity_id,venue_name,venue_address,city,state,country,date,start_time,load_in_time,sound_check_time,door_time,status,notes,currency)
      SELECT $1,'Review Hall','1 Test Street, Liverpool','Liverpool','England','United Kingdom',CURRENT_DATE + 14,'20:00','16:00','17:30','19:00','confirmed','Demonstration data for App Review','GBP'
      WHERE NOT EXISTS(SELECT 1 FROM shows WHERE entity_id::text=$1::text AND notes='Demonstration data for App Review')`, [entityId]);
    await client.query('COMMIT');
    console.log('App Review account and isolated demo workspace are ready. Credentials were not printed.');
  } catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error; }
  finally { client.release(); await pool.end(); }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });

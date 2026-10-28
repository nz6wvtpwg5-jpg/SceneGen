const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
let PGlite;
try { ({ PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite')); } catch {}

test('database capture: private provenance, deduplication, edits, clearing and rollback', { skip: !PGlite && 'Install @electric-sql/pglite to run the database regression' }, async () => {
  const db = new PGlite();
  const a='00000000-0000-4000-8000-000000000001', b='00000000-0000-4000-8000-000000000002';
  const s1='00000000-0000-4000-8000-000000000011', s2='00000000-0000-4000-8000-000000000012', s3='00000000-0000-4000-8000-000000000013';
  try {
    await db.exec(`CREATE TABLE users(id uuid PRIMARY KEY);
      CREATE TABLE entities(id uuid PRIMARY KEY,tags jsonb);
      CREATE TABLE shows(id uuid PRIMARY KEY,entity_id uuid REFERENCES entities(id),date date,
        promoter_name text,promoter_email text,promoter_phone text,show_type text,
        venue_name text,venue_address text,venue_place_id text,city text,state text,country text,
        venue_lat numeric,venue_lng numeric,latitude numeric,longitude numeric);
      INSERT INTO entities VALUES('${a}','["#doom"]'),('${b}','["#jazz"]');`);
    for (const name of ['034_private_contacts.sql','038_contact_intelligence.sql','039_backfill_contact_intelligence.sql','063_private_show_contact_capture.sql']) {
      await db.exec(fs.readFileSync(path.join(__dirname,'../migrations',name),'utf8'));
    }
    const insert = (id, entity, venue) => db.query(`INSERT INTO shows(id,entity_id,promoter_name,promoter_email,promoter_phone,venue_name,venue_address,city,country)
      VALUES($1,$2,'Alex',' ALEX@example.com ','123',$3,'1 Main Street','London','UK')`, [id,entity,venue]);
    await insert(s1,a,'Venue One'); await insert(s2,a,'Venue Two'); await insert(s3,b,'Venue Three');
    assert.equal((await db.query('SELECT * FROM private_contacts')).rows.length,2,'same email is private per band');
    const links=(await db.query('SELECT * FROM private_contact_shows WHERE entity_id=$1',[a])).rows;
    assert.equal(links.length,2); assert.deepEqual(links[0].band_genres,['#doom']);
    assert.equal(links[0].venue_location.address,'1 Main Street');
    assert.notEqual(links[0].venue_location.name,links[1].venue_location.name);
    await db.query("UPDATE shows SET promoter_name='Alex Updated',promoter_phone='456' WHERE id=$1",[s2]);
    const contact=(await db.query('SELECT * FROM private_contacts WHERE entity_id=$1',[a])).rows[0];
    assert.equal(contact.display_name,'Alex Updated'); assert.equal(contact.phone,'456');
    assert.equal((await db.query('SELECT * FROM private_contact_shows')).rows.length,3);
    await db.query("UPDATE shows SET promoter_email='new@example.com' WHERE id=$1",[s2]);
    assert.equal((await db.query('SELECT * FROM private_contacts WHERE entity_id=$1',[a])).rows.length,2);
    await db.exec('BEGIN');
    await db.query("UPDATE shows SET promoter_email='rollback@example.com' WHERE id=$1",[s2]);
    await db.exec('ROLLBACK');
    assert.equal((await db.query("SELECT * FROM private_contacts WHERE email='rollback@example.com'")).rows.length,0);
    await db.query("UPDATE shows SET promoter_email='' WHERE id=$1",[s1]);
    assert.equal((await db.query('SELECT * FROM private_contact_shows WHERE show_id=$1',[s1])).rows.length,0);
    await db.query("UPDATE shows SET show_type='off_day' WHERE id=$1",[s2]);
    assert.equal((await db.query('SELECT * FROM private_contact_shows WHERE entity_id=$1',[a])).rows.length,0);
    assert.equal((await db.query('SELECT * FROM private_contact_shows WHERE entity_id=$1',[b])).rows.length,1);
    await db.query('DELETE FROM shows WHERE id=$1',[s3]);
    assert.equal((await db.query('SELECT * FROM private_contact_shows')).rows.length,0);
  } finally { await db.close(); }
});

const { createEntityAuthorizationMiddleware } = require('../authorization');
for (const route of ['/contacts','/contact-intelligence','/contacts/private/example']) {
  test(`restricted legacy membership cannot access ${route}`, async () => {
    const pool = { query: async sql => ({rows: sql.includes('entity_memberships') ? [{role:'viewer'}] : [{restricted:true}]}) };
    const req={path:route,method:'GET',headers:{'x-entity-id':'00000000-0000-4000-8000-000000000001'},query:{},userId:'00000000-0000-4000-8000-000000000002'};
    const res={status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
    await createEntityAuthorizationMiddleware(pool)(req,res,()=>assert.fail('must deny restricted access'));
    assert.equal(res.code,403); assert.equal(res.body.error.code,'CONTACTS_FORBIDDEN');
  });
}

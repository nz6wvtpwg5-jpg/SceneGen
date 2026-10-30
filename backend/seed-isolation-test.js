'use strict';
// Deliberately guarded one-off production isolation fixture. No real promoter data.
if (process.env.SCENEGEN_ISOLATION_SEED !== 'enable') process.exit(0);
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const pool = require('./db');
const scrypt = promisify(crypto.scrypt);
const EMAIL = 'bandtest@scenegen.io';
const NAME = 'SceneGen Isolation Test Band';
const promoterDetails = [
  ['Avery','Cole','North Pier Live','Liverpool','Merseyside','United Kingdom','UK & Ireland',53.4084,-2.9916],
  ['Morgan','Vale','Silver Stage Productions','Manchester','Greater Manchester','United Kingdom','Northern England',53.4808,-2.2426],
  ['Jordan','Reed','Harbourlight Events','Bristol','Bristol','United Kingdom','South West England',51.4545,-2.5879],
  ['Casey','Brooks','Stonewall Touring','Glasgow','Scotland','United Kingdom','Scotland',55.8642,-4.2518],
  ['Riley','Stone','Iron Bridge Promotions','Birmingham','West Midlands','United Kingdom','Midlands',52.4862,-1.8904],
  ['Taylor','Hart','Moonrise Concerts','London','Greater London','United Kingdom','London & South East',51.5074,-0.1278],
  ['Quinn','Miller','Northern Signal Shows','Leeds','West Yorkshire','United Kingdom','Yorkshire',53.8008,-1.5491],
  ['Blair','Parker','Atlas Underground','Cardiff','Wales','United Kingdom','Wales',51.4816,-3.1791],
  ['Drew','Bennett','Blackwater Booking','Newcastle upon Tyne','Tyne and Wear','United Kingdom','North East England',54.9783,-1.6178],
  ['Alex','Rowan','Coastal Sound Collective','Brighton','East Sussex','United Kingdom','South Coast',50.8225,-0.1372],
];
async function main() {
  const password = process.env.SCENEGEN_ISOLATION_PASSWORD || '';
  if (password.length < 10) throw new Error('Test password not configured');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const prior = await client.query('SELECT id,name FROM users WHERE email=$1 FOR UPDATE', [EMAIL]);
    if (prior.rows.length && prior.rows[0].name !== NAME) throw new Error('Email belongs to a different account; refusing to overwrite');
    let userId;
    if (prior.rows.length) {
      userId = prior.rows[0].id;
    } else {
      const created = await client.query('INSERT INTO users(email,name,email_verified_at) VALUES($1,$2,NOW()) RETURNING id', [EMAIL, NAME]);
      userId = created.rows[0].id;
    }
    const salt=crypto.randomBytes(16);
    const derived=await scrypt(password,salt,64,{N:1<<17,r:8,p:1,maxmem:256*1024*1024});
    const passwordHash=`scrypt$131072$8$1$${salt.toString('base64')}$${derived.toString('base64')}`;
    await client.query('UPDATE users SET password_hash=$1,email_verified_at=COALESCE(email_verified_at,NOW()),updated_at=NOW() WHERE id=$2',[passwordHash,userId]);
    const owned=await client.query('SELECT id,name FROM entities WHERE administrator_id=$1::text FOR UPDATE',[userId]);
    if(owned.rows.length>1 || (owned.rows.length===1 && owned.rows[0].name!==NAME)) throw new Error('Unexpected existing workspace; refusing to overwrite');
    let entityId=owned.rows[0]?.id;
    if(!entityId){const created=await client.query("INSERT INTO entities(administrator_id,entity_type,name,city,country) VALUES($1::text,'artist',$2,'Liverpool','United Kingdom') RETURNING id",[userId,NAME]);entityId=created.rows[0].id;}
    for(let i=0;i<promoterDetails.length;i++){
      const [first,last,org,city,region,country,territory,lat,long]=promoterDetails[i];
      const email=`promoter${String(i+1).padStart(2,'0')}@scenegen-isolation.example`;
      const displayName=`${first} ${last}`;
      const values=[entityId,displayName,first,last,org,'Concert promoter',JSON.stringify(['Promoter']),email,`07700 900${String(i+1).padStart(3,'0')}`,'email',city,region,country,lat,long,JSON.stringify([territory]),JSON.stringify(['synthetic','isolation-test','promoter']),`Fictional test record ${i+1}/10. Not a real person or company. Test only.`,userId];
      await client.query(`INSERT INTO private_contacts(entity_id,kind,display_name,given_name,surname,organization,job_title,roles,email,phone,preferred_contact_method,city,region,country,latitude,longitude,territories,tags,notes,created_by)
        VALUES($1::uuid,'person',$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb,$18,$19::uuid)
        ON CONFLICT (entity_id,lower(email)) WHERE email IS NOT NULL AND trim(email)<>'' DO NOTHING`,values);
    }
    const own=await client.query("SELECT count(*)::int AS n FROM private_contacts WHERE entity_id=$1::uuid AND email LIKE '%@scenegen-isolation.example'",[entityId]);
    if(own.rows[0].n!==10) throw new Error('Expected exactly ten synthetic contacts in test workspace');
    const others=await client.query("SELECT count(*)::int AS n FROM private_contacts WHERE entity_id<>$1::uuid AND email LIKE '%@scenegen-isolation.example'",[entityId]);
    if(others.rows[0].n!==0) throw new Error('Synthetic contacts unexpectedly exist outside the test workspace');
    await client.query('COMMIT');
    console.log(`ISOLATION_SEED_SUCCESS user=${userId} entity=${entityId} own_contacts=${own.rows[0].n} other_workspace_contacts=${others.rows[0].n}`);
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();await pool.end();}
}
main().catch(e=>{console.error('ISOLATION_SEED_FAILED:',e.message);process.exitCode=1;});

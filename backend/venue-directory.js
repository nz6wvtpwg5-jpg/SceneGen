const crypto = require('crypto');
const clean = (value, limit=500) => { const text=typeof value==='string'?value.trim().replace(/\s+/g,' '):''; return text?text.slice(0,limit):null; };
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function venueDetails(input={}) { const numeric=(value)=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
  const latitude=numeric(input.latitude??input.venue_lat), longitude=numeric(input.longitude??input.venue_lng);
  const coordinatesValid=latitude!==null&&longitude!==null&&latitude>=-90&&latitude<=90&&longitude>=-180&&longitude<=180;
  const capacity=numeric(input.capacity??input.venueCapacity); return {
  venueId:clean(input.venueId||input.venue_id,36),
  googlePlaceId:input.googleVerified===true?clean(input.venuePlaceId||input.googlePlaceId,300):null, name:clean(input.venueName||input.name),
  address:clean(input.venueAddress||input.address,1000), city:clean(input.city||input.venueCity,200),
  region:clean(input.state||input.region||input.venueState,200), country:clean(input.country||input.venueCountry,200),
  countryCode:clean(input.countryCode,2)?.toUpperCase()||null, postalCode:clean(input.postalCode,40),
  latitude:coordinatesValid?latitude:null, longitude:coordinatesValid?longitude:null,
  capacity:capacity!==null&&Number.isInteger(capacity)&&capacity>=0?capacity:null, source:clean(input.source,40)||'scenegen' }; }
function fingerprint(d) { return crypto.createHash('md5').update([d.name,d.city,d.country,d.address].map(v=>(clean(v)||'').toLowerCase()).join('|')).digest('hex'); }
async function upsertVenue(client,input) { const d=venueDetails(input);
  if(d.venueId&&UUID.test(d.venueId)) { const selected=await client.query('SELECT * FROM venues WHERE id=$1',[d.venueId]); if(selected.rowCount) return selected.rows[0]; }
  if(!d.name||!d.city||['off_day','travel_day'].includes(input.showType||input.show_type)) return null;
  const key=fingerprint(d); await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`venue:${d.googlePlaceId||key}`]);
  const found=await client.query(`SELECT id,google_place_id FROM venues WHERE ($1::text IS NOT NULL AND google_place_id=$1) OR fingerprint=$2 ORDER BY google_place_id IS NOT NULL DESC LIMIT 1`,[d.googlePlaceId,key]);
  if(found.rows[0]?.google_place_id&&!d.googlePlaceId) return (await client.query('SELECT * FROM venues WHERE id=$1',[found.rows[0].id])).rows[0];
  if(found.rowCount) return (await client.query(`UPDATE venues SET google_place_id=COALESCE(google_place_id,$2),fingerprint=CASE WHEN EXISTS(SELECT 1 FROM venues other WHERE other.fingerprint=$3 AND other.id<>$1) THEN fingerprint ELSE $3 END,name=$4,
    address=COALESCE($5,address),city=$6,region=COALESCE($7,region),country=COALESCE($8,country),country_code=COALESCE($9,country_code),
    postal_code=COALESCE($10,postal_code),latitude=COALESCE($11,latitude),longitude=COALESCE($12,longitude),capacity=COALESCE(capacity,$13),updated_at=NOW()
    WHERE id=$1 RETURNING *`,[found.rows[0].id,d.googlePlaceId,key,d.name,d.address,d.city,d.region,d.country,d.countryCode,d.postalCode,d.latitude,d.longitude,d.capacity])).rows[0];
  return (await client.query(`INSERT INTO venues(google_place_id,fingerprint,name,address,city,region,country,country_code,postal_code,latitude,longitude,capacity,source)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,[d.googlePlaceId,key,d.name,d.address,d.city,d.region,d.country,d.countryCode,d.postalCode,d.latitude,d.longitude,d.capacity,d.source])).rows[0]; }
module.exports={fingerprint,upsertVenue,venueDetails};

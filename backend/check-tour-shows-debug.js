require('dotenv').config();
const pool = require('./db');

const tourId = '9d21a757-70e4-4708-995b-b11057ce7fab';
const entityId = '1f60064e-3dc6-4612-a5c4-2be834806277';

async function checkShows() {
  try {
    console.log('\n🔍 Checking shows for tour:', tourId);
    console.log('   Entity ID:', entityId);
    console.log('');

    // Check shows with this tour_id
    const byTourId = await pool.query(
      'SELECT id, date, venue_name, city, state, tour_id, entity_id, venue_lat, venue_lng FROM shows WHERE tour_id = $1 LIMIT 5',
      [tourId]
    );
    console.log('📊 Shows with tour_id =', tourId, ':', byTourId.rows.length);
    if (byTourId.rows.length > 0) {
      console.log('   First show:', JSON.stringify(byTourId.rows[0], null, 2));
    }
    console.log('');

    // Check shows with this entity_id
    const byEntityId = await pool.query(
      'SELECT id, date, venue_name, city, state, tour_id, entity_id, venue_lat, venue_lng FROM shows WHERE entity_id = $1 LIMIT 5',
      [entityId]
    );
    console.log('📊 Shows with entity_id =', entityId, ':', byEntityId.rows.length);
    if (byEntityId.rows.length > 0) {
      console.log('   First show:', JSON.stringify(byEntityId.rows[0], null, 2));
    }
    console.log('');

    // Check shows with BOTH
    const byBoth = await pool.query(
      'SELECT id, date, venue_name, city, state, tour_id, entity_id, venue_lat, venue_lng FROM shows WHERE entity_id = $1 AND tour_id = $2',
      [entityId, tourId]
    );
    console.log('📊 Shows with BOTH entity_id AND tour_id:', byBoth.rows.length);
    if (byBoth.rows.length > 0) {
      console.log('   Shows:', byBoth.rows.map(s => `${s.date} - ${s.venue_name}`).join('\n   '));
    }
    console.log('');

    // Check if there are shows with coordinates
    const withCoords = await pool.query(
      'SELECT COUNT(*) as count FROM shows WHERE entity_id = $1 AND tour_id = $2 AND venue_lat IS NOT NULL AND venue_lng IS NOT NULL',
      [entityId, tourId]
    );
    console.log('📍 Shows with coordinates:', withCoords.rows[0].count);
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkShows();

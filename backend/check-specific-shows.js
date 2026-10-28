require('dotenv').config();
const pool = require('./db');

const tourId = '9d21a757-70e4-4708-995b-b11057ce7fab';

async function checkSpecificShows() {
  try {
    console.log('\n🔍 Checking specific shows...\n');

    // Check Murfreesboro on March 31
    const murfreesboro = await pool.query(
      `SELECT date, venue_name, city, state, venue_address, venue_lat, venue_lng, show_type
       FROM shows
       WHERE tour_id = $1 AND date >= '2026-03-31' AND date < '2026-04-01'`,
      [tourId]
    );
    console.log('📅 March 31 (Murfreesboro):');
    if (murfreesboro.rows.length > 0) {
      murfreesboro.rows.forEach(show => {
        console.log(`   Date: ${show.date}`);
        console.log(`   Venue: ${show.venue_name}`);
        console.log(`   City: ${show.city}, ${show.state}`);
        console.log(`   Address: ${show.venue_address || 'NO ADDRESS'}`);
        console.log(`   Coords: ${show.venue_lat}, ${show.venue_lng}`);
        console.log(`   Type: ${show.show_type || 'show'}`);
      });
    } else {
      console.log('   ⚠️ No show found');
    }
    console.log('');

    // Check Haltom
    const haltom = await pool.query(
      `SELECT date, venue_name, city, state, venue_address, venue_lat, venue_lng, show_type
       FROM shows
       WHERE tour_id = $1 AND (venue_name ILIKE '%haltom%' OR city ILIKE '%haltom%')`,
      [tourId]
    );
    console.log('🎭 Haltom Theater:');
    if (haltom.rows.length > 0) {
      haltom.rows.forEach(show => {
        console.log(`   Date: ${show.date}`);
        console.log(`   Venue: ${show.venue_name}`);
        console.log(`   City: ${show.city}, ${show.state}`);
        console.log(`   Address: ${show.venue_address || 'NO ADDRESS'}`);
        console.log(`   Coords: ${show.venue_lat}, ${show.venue_lng}`);
        console.log(`   Type: ${show.show_type || 'show'}`);
      });
    } else {
      console.log('   ⚠️ No show found');
    }
    console.log('');

    // List ALL shows with their types
    const allShows = await pool.query(
      `SELECT date, venue_name, city, state, venue_address, venue_lat, venue_lng, show_type
       FROM shows
       WHERE tour_id = $1
       ORDER BY date`,
      [tourId]
    );
    console.log('📋 ALL SHOWS IN TOUR:');
    allShows.rows.forEach(show => {
      const dateStr = new Date(show.date).toISOString().substring(0, 10);
      const hasAddress = show.venue_address ? '✅' : '❌';
      const hasCoords = (show.venue_lat && show.venue_lng) ? '✅' : '❌';
      const type = show.show_type || 'show';
      console.log(`   ${dateStr} | ${type.padEnd(11)} | ${hasAddress} ${hasCoords} | ${show.venue_name || 'NO NAME'} | ${show.city}, ${show.state}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkSpecificShows();

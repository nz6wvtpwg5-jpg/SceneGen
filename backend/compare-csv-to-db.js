require('dotenv').config();
const pool = require('./db');

const tourId = '9d21a757-70e4-4708-995b-b11057ce7fab';

// These are the dates from the CSV (based on the logs showing 29 shows from 2026-03-30 to 2026-04-27)
const csvDates = [];
for (let i = 30; i <= 31; i++) {
  csvDates.push(`2026-03-${i}`);
}
for (let i = 1; i <= 27; i++) {
  csvDates.push(`2026-04-${String(i).padStart(2, '0')}`);
}

async function compareCSVtoDB() {
  try {
    console.log('\n🔍 Comparing CSV shows to Database shows...\n');

    // Get all shows from database
    const result = await pool.query(
      `SELECT date, venue_name, city, state, venue_address, venue_lat, venue_lng, show_type
       FROM shows
       WHERE tour_id = $1
       ORDER BY date`,
      [tourId]
    );

    const dbShows = result.rows.map(row => ({
      date: new Date(row.date).toISOString().substring(0, 10),
      venueName: row.venue_name,
      city: row.city,
      state: row.state,
      address: row.venue_address,
      lat: row.venue_lat,
      lng: row.venue_lng,
      type: row.show_type || 'show'
    }));

    console.log(`📊 CSV shows: ${csvDates.length}`);
    console.log(`📊 DB shows: ${dbShows.length}`);
    console.log('');

    console.log('🔍 DETAILED COMPARISON:\n');

    let matchCount = 0;
    csvDates.forEach((csvDate, index) => {
      const dbShow = dbShows.find(db => db.date === csvDate);

      if (dbShow) {
        matchCount++;
        const hasCoords = dbShow.lat && dbShow.lng;
        console.log(`✅ ${csvDate} | MATCH | ${dbShow.venueName} | ${dbShow.city}, ${dbShow.state} | ${hasCoords ? 'HAS COORDS' : 'NO COORDS'} | ${dbShow.type}`);
      } else {
        console.log(`❌ ${csvDate} | NO MATCH IN DB`);
      }
    });

    console.log('');
    console.log(`📊 Summary: ${matchCount} out of ${csvDates.length} CSV dates matched`);
    console.log('');

    // Check if there are DB shows NOT in the CSV date range
    const dbDatesNotInCSV = dbShows.filter(db => !csvDates.includes(db.date));
    if (dbDatesNotInCSV.length > 0) {
      console.log('⚠️ DB shows NOT in CSV date range:');
      dbDatesNotInCSV.forEach(show => {
        console.log(`   ${show.date} | ${show.venueName} | ${show.city}, ${show.state}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

compareCSVtoDB();

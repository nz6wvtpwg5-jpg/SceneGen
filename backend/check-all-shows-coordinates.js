require('dotenv').config();
const pool = require('./db');

const tourId = '9d21a757-70e4-4708-995b-b11057ce7fab';

async function checkAllShows() {
  try {
    const result = await pool.query(
      `SELECT
        id,
        date,
        city,
        state,
        venue_name,
        venue_address,
        venue_lat,
        venue_lng
      FROM shows
      WHERE tour_id = $1
      ORDER BY date`,
      [tourId]
    );

    const rows = result.rows;
    console.log(`\n=== TOTAL SHOWS: ${rows.length} ===\n`);

    let withCoordinates = 0;
    let withoutCoordinates = 0;
    const missingCoords = [];

    rows.forEach(show => {
      const hasCoords = show.venue_lat !== null && show.venue_lng !== null;

      console.log(`${show.date} | ${show.city}, ${show.state} | ${show.venue_name}`);
      console.log(`  Address: ${show.venue_address || 'MISSING'}`);
      console.log(`  Coords: ${hasCoords ? `${show.venue_lat}, ${show.venue_lng}` : 'MISSING'}`);
      console.log('');

      if (hasCoords) {
        withCoordinates++;
      } else {
        withoutCoordinates++;
        missingCoords.push({
          date: show.date,
          city: show.city,
          state: show.state,
          venue: show.venue_name
        });
      }
    });

    console.log(`\n=== SUMMARY ===`);
    console.log(`Shows with coordinates: ${withCoordinates}`);
    console.log(`Shows without coordinates: ${withoutCoordinates}`);

    if (missingCoords.length > 0) {
      console.log(`\n=== SHOWS MISSING COORDINATES ===`);
      missingCoords.forEach(show => {
        console.log(`${show.date} | ${show.city}, ${show.state} | ${show.venue}`);
      });
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAllShows();

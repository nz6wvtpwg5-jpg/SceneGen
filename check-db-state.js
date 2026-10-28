const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'scenegen.db');
const db = new sqlite3.Database(dbPath);

console.log('\n=== CURRENT TOURS ===');
db.all('SELECT * FROM tours ORDER BY start_date', [], (err, tours) => {
  if (err) {
    console.error('Error fetching tours:', err);
    return;
  }

  tours.forEach(tour => {
    console.log(`\nTour: ${tour.name}`);
    console.log(`  ID: ${tour.id}`);
    console.log(`  Dates: ${tour.start_date} to ${tour.end_date}`);
    console.log(`  Created: ${tour.created_at}`);
  });

  console.log('\n=== CURRENT SHOWS ===');
  db.all('SELECT * FROM shows ORDER BY show_date', [], (err, shows) => {
    if (err) {
      console.error('Error fetching shows:', err);
      return;
    }

    shows.forEach(show => {
      console.log(`\nShow: ${show.venue_name}`);
      console.log(`  ID: ${show.id}`);
      console.log(`  City: ${show.city}`);
      console.log(`  Date: ${show.show_date}`);
      console.log(`  Tour ID: ${show.tour_id}`);
      console.log(`  Created: ${show.created_at}`);
    });

    console.log('\n\nSUMMARY:');
    console.log(`Total Tours: ${tours.length}`);
    console.log(`Total Shows: ${shows.length}`);

    db.close();
  });
});

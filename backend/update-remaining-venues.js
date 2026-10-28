require('dotenv').config();
const pool = require('./db');

async function updateRemainingVenues() {
  try {
    const updates = [
      {
        date: '2026-04-04',
        venueName: 'Bad Astronaut Brewing Co.',
        capacity: 350,
        promoterName: 'Christian Larson',
        promoterPhone: '713-225-5483',
        promoterEmail: 'christianblarson@gmail.com'
      },
      {
        date: '2026-04-19',
        venueName: 'Thunderbird Café & Music Hall',
        capacity: 540,
        promoterName: 'Greg Ray',
        promoterPhone: '336-558-7459',
        promoterEmail: 'greg.ray@thunderbirdmusichall.com'
      },
      {
        date: '2026-04-29',
        venueName: 'Hop Springs',
        capacity: 400,
        promoterName: 'Miranda Adams',
        promoterPhone: null,
        promoterEmail: 'mhagen@lifeisbrewing.com'
      }
    ];

    console.log('Updating remaining venues...\n');

    for (const update of updates) {
      const result = await pool.query(
        `UPDATE shows
         SET capacity = $1,
             promoter_name = $2,
             promoter_phone = $3,
             promoter_email = $4
         WHERE date = $5
         RETURNING id, venue_name, capacity, promoter_name`,
        [
          update.capacity,
          update.promoterName,
          update.promoterPhone,
          update.promoterEmail,
          update.date
        ]
      );

      if (result.rows.length > 0) {
        const show = result.rows[0];
        console.log(`✓ Updated: ${update.date} - ${show.venue_name}`);
        console.log(`  Capacity: ${show.capacity}, Promoter: ${show.promoter_name}\n`);
      } else {
        console.log(`✗ No show found on ${update.date}\n`);
      }
    }

    console.log('\nAll manual updates complete!');
    await pool.end();

  } catch (err) {
    console.error('Error:', err);
    await pool.end();
  }
}

updateRemainingVenues();

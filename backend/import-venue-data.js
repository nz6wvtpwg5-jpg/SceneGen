require('dotenv').config();
const fs = require('fs');
const pool = require('./db');

// Read and parse the venue data file
const dataFilePath = '/Users/jon/Downloads/venue_contacts_capacities.txt';
const fileContent = fs.readFileSync(dataFilePath, 'utf8');

// Parse the file content
function parseVenueData(content) {
  const venues = [];
  const lines = content.split('\n').slice(2); // Skip the header line

  let currentVenue = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Match date and venue line: "03/30 - The Green Lantern (Lexington, KY) Capacity: 150 Promoter:"
    const venueMatch = line.match(/^(\d{2}\/\d{2})\s*-\s*([^(]+)\(([^)]+)\)\s*Capacity:\s*(\d+)/);

    if (venueMatch) {
      // Save previous venue if exists
      if (currentVenue.date) {
        venues.push(currentVenue);
      }

      // Start new venue
      const [, date, venueName, location, capacity] = venueMatch;
      currentVenue = {
        date: date.trim(),
        venue: venueName.trim(),
        location: location.trim(),
        capacity: parseInt(capacity),
        promoterName: '',
        promoterPhone: '',
        promoterEmail: ''
      };

      // Check if promoter info is on the same line
      const promoterNameMatch = line.match(/Promoter:\s*([^\s].*?)(?:\s+Phone:|$)/);
      if (promoterNameMatch && promoterNameMatch[1].trim()) {
        currentVenue.promoterName = promoterNameMatch[1].trim();
      }

      const phoneMatch = line.match(/Phone:\s*([\d\-()]+(?:\s*[\d\-()]+)*)/);
      if (phoneMatch) {
        currentVenue.promoterPhone = phoneMatch[1].trim();
      }

      const emailMatch = line.match(/Email:\s*([\S]+@[\S]+)/);
      if (emailMatch) {
        currentVenue.promoterEmail = emailMatch[1].trim();
      }
    } else if (currentVenue.date) {
      // Continuation line - extract any missing info
      if (!currentVenue.promoterName) {
        const nameMatch = line.match(/^([^P]+?)(?:\s+Phone:|$)/);
        if (nameMatch && nameMatch[1].trim()) {
          currentVenue.promoterName = nameMatch[1].trim();
        }
      }

      if (!currentVenue.promoterPhone) {
        const phoneMatch = line.match(/Phone:\s*([\d\-()]+(?:\s*[\d\-()]+)*)/);
        if (phoneMatch) {
          currentVenue.promoterPhone = phoneMatch[1].trim();
        }
      }

      if (!currentVenue.promoterEmail) {
        const emailMatch = line.match(/Email:\s*([\S]+@[\S]+)/);
        if (emailMatch) {
          currentVenue.promoterEmail = emailMatch[1].trim();
        }
      }
    }
  }

  // Don't forget the last venue
  if (currentVenue.date) {
    venues.push(currentVenue);
  }

  return venues;
}

const venueData = parseVenueData(fileContent);

console.log(`Parsed ${venueData.length} venues from file`);
console.log('\nFirst few entries:');
venueData.slice(0, 3).forEach(v => {
  console.log(`${v.date} - ${v.venue} (${v.location})`);
  console.log(`  Capacity: ${v.capacity}`);
  console.log(`  Promoter: ${v.promoterName}`);
  console.log(`  Phone: ${v.promoterPhone}`);
  console.log(`  Email: ${v.promoterEmail}\n`);
});

// Function to normalize venue names for matching
function normalizeVenueName(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')    // Normalize spaces
    .trim();
}

// Function to parse date from MM/DD format and create a full date string
function parseDateToMonth(mmdd) {
  const [month, day] = mmdd.split('/');
  const monthNum = parseInt(month);
  const dayNum = parseInt(day);
  return { month: monthNum, day: dayNum };
}

// Update the database
async function updateDatabase() {
  try {
    // First, get all shows
    const result = await pool.query(`SELECT id, venue_name, date FROM shows ORDER BY date`);
    const shows = result.rows;

    console.log(`\nFound ${shows.length} shows in database\n`);

    let updatedCount = 0;
    let notFoundCount = 0;
    const notFoundVenues = [];
    const updates = [];

    // Try to match each venue entry to a show
    for (const venueEntry of venueData) {
      const normalizedVenueEntry = normalizeVenueName(venueEntry.venue);
      const { month, day } = parseDateToMonth(venueEntry.date);

      // Find matching show
      const matchingShow = shows.find(show => {
        const showVenue = normalizeVenueName(show.venue_name);

        // Check if venue names match
        const venueMatches = showVenue === normalizedVenueEntry ||
                             showVenue.includes(normalizedVenueEntry) ||
                             normalizedVenueEntry.includes(showVenue);

        if (!venueMatches) return false;

        // Check if date matches (date is in YYYY-MM-DD format)
        if (show.date) {
          const showDate = new Date(show.date);
          const showMonth = showDate.getMonth() + 1; // JavaScript months are 0-indexed
          const showDay = showDate.getDate();

          return showMonth === month && showDay === day;
        }

        return false;
      });

      if (matchingShow) {
        // Prepare update
        updates.push({
          id: matchingShow.id,
          capacity: venueEntry.capacity,
          promoterName: venueEntry.promoterName || null,
          promoterPhone: venueEntry.promoterPhone || null,
          promoterEmail: venueEntry.promoterEmail || null,
          venue: venueEntry.venue,
          date: venueEntry.date
        });
      } else {
        notFoundCount++;
        notFoundVenues.push(`${venueEntry.date} - ${venueEntry.venue} (${venueEntry.location})`);
      }
    }

    // Execute all updates
    for (const update of updates) {
      await pool.query(
        `UPDATE shows
         SET capacity = $1,
             promoter_name = $2,
             promoter_phone = $3,
             promoter_email = $4
         WHERE id = $5`,
        [
          update.capacity,
          update.promoterName,
          update.promoterPhone,
          update.promoterEmail,
          update.id
        ]
      );
      updatedCount++;
      console.log(`✓ Updated: ${update.date} - ${update.venue} (ID: ${update.id})`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`IMPORT COMPLETE`);
    console.log(`${'='.repeat(60)}`);
    console.log(`✓ Successfully updated: ${updatedCount} shows`);
    console.log(`✗ Not found in database: ${notFoundCount} venues`);

    if (notFoundVenues.length > 0) {
      console.log(`\nVenues not found:`);
      notFoundVenues.forEach(v => console.log(`  - ${v}`));
    }

    await pool.end();
    console.log('\nDatabase connection closed.');

  } catch (err) {
    console.error('Error updating database:', err);
    await pool.end();
    throw err;
  }
}

// Run the update
updateDatabase().catch(err => {
  console.error('Failed to update database:', err);
  process.exit(1);
});

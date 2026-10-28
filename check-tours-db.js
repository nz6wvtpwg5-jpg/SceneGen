#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/scenegen_dev'
});

async function checkTours() {
  try {
    console.log('🔍 Checking tours table...\n');

    // Get all tours
    const result = await pool.query(`
      SELECT id, entity_id, name, start_date, end_date, created_at
      FROM tours
      ORDER BY created_at DESC
    `);

    console.log(`Found ${result.rows.length} tours:\n`);

    result.rows.forEach((tour, index) => {
      console.log(`Tour ${index + 1}:`);
      console.log(`  ID:        ${tour.id}`);
      console.log(`  Entity ID: ${tour.entity_id}`);
      console.log(`  Name:      ${tour.name}`);
      console.log(`  Dates:     ${tour.start_date} to ${tour.end_date}`);
      console.log(`  Created:   ${tour.created_at}`);

      // Check if ID matches entity_id (the bug!)
      if (tour.id === tour.entity_id) {
        console.log(`  ⚠️  WARNING: Tour ID matches Entity ID! This is the bug!`);
      }
      console.log('');
    });

    // Check for the specific problematic ID
    const badId = 'd5d67ff2-559e-47c5-ac99-f2278705f4e3';
    const badTour = result.rows.find(t => t.id === badId);

    if (badTour) {
      console.log('🚨 FOUND THE PROBLEM TOUR:');
      console.log(`   Tour ID "${badId}" is actually an entity ID!`);
      console.log(`   This tour's entity_id is: ${badTour.entity_id}`);
      console.log('');
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkTours();

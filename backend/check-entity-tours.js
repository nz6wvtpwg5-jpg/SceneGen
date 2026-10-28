#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkEntityAndTours() {
  try {
    console.log('🔍 Checking entities and tours...\n');

    // Get all entities
    const entities = await pool.query('SELECT id, name, administrator_id FROM entities ORDER BY created_at DESC');
    console.log(`Found ${entities.rows.length} entities:\n`);
    entities.rows.forEach((e, i) => {
      console.log(`Entity ${i + 1}:`);
      console.log(`  ID:    ${e.id}`);
      console.log(`  Name:  ${e.name}`);
      console.log(`  Admin: ${e.administrator_id}`);
      console.log('');
    });

    // Get all tours with entity info
    const tours = await pool.query(`
      SELECT t.id, t.entity_id, t.name
      FROM tours t
      ORDER BY t.created_at DESC
    `);

    console.log(`\nFound ${tours.rows.length} tours:\n`);
    for (const t of tours.rows) {
      console.log(`Tour:`);
      console.log(`  Tour ID:     ${t.id}`);
      console.log(`  Entity ID:   ${t.entity_id}`);
      console.log(`  Tour Name:   ${t.name}`);

      // Check if tour belongs to an existing entity
      const entityExists = entities.rows.find(e => e.id === t.entity_id);
      if (entityExists) {
        console.log(`  Entity Name: ${entityExists.name}`);
      } else {
        console.log(`  ⚠️  WARNING: Tour belongs to non-existent or invalid entity!`);
      }
      console.log('');
    }

    // Check if tour ID d5d67ff2-559e-47c5-ac99-f2278705f4e3 matches ANY entity ID
    const problemTourId = 'd5d67ff2-559e-47c5-ac99-f2278705f4e3';
    const matchingEntity = entities.rows.find(e => e.id === problemTourId);

    if (matchingEntity) {
      console.log('🚨 CRITICAL BUG FOUND:');
      console.log(`   Tour ID "${problemTourId}" is actually entity "${matchingEntity.name}"!`);
      console.log(`   This is the root cause of the infinite loop!`);
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkEntityAndTours();

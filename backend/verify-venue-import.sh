#!/bin/bash

# Venue Address Import Verification Script
# This script checks that the database schema and import flow are set up correctly

cd /Users/jon/Desktop/scenegen/SceneGenUIV2/backend

echo "=================================="
echo "Venue Address Import - Verification"
echo "=================================="
echo ""

# Check 1: Database schema
echo "1️⃣  Checking database schema..."
SCHEMA_CHECK=$(psql "$DATABASE_URL" -t -c "
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'shows'
  AND column_name IN ('venue_address', 'venue_lat', 'venue_lng')
ORDER BY column_name;
" 2>&1)

if [[ $SCHEMA_CHECK == *"venue_address"* && $SCHEMA_CHECK == *"venue_lat"* && $SCHEMA_CHECK == *"venue_lng"* ]]; then
  echo "✅ All venue fields exist in shows table"
  echo "$SCHEMA_CHECK"
else
  echo "❌ Missing venue fields in shows table"
  echo "Run migration: psql \"\$DATABASE_URL\" -f migrations/add_venue_address_fields.sql"
  exit 1
fi

echo ""

# Check 2: Indexes
echo "2️⃣  Checking indexes..."
INDEX_CHECK=$(psql "$DATABASE_URL" -t -c "
SELECT indexname
FROM pg_indexes
WHERE tablename = 'shows'
  AND (indexname = 'idx_shows_coordinates' OR indexname = 'idx_shows_tour_id');
" 2>&1)

if [[ $INDEX_CHECK == *"idx_shows_coordinates"* ]]; then
  echo "✅ Coordinates index exists"
else
  echo "⚠️  Coordinates index missing (optional but recommended)"
fi

if [[ $INDEX_CHECK == *"idx_shows_tour_id"* ]]; then
  echo "✅ Tour ID index exists"
else
  echo "⚠️  Tour ID index missing (optional but recommended)"
fi

echo ""

# Check 3: Recent imports with addresses
echo "3️⃣  Checking recent imports..."
RECENT_COUNT=$(psql "$DATABASE_URL" -t -c "
SELECT COUNT(*)
FROM shows
WHERE created_at > NOW() - INTERVAL '1 day';
" 2>&1)

echo "Shows created in last 24 hours: $RECENT_COUNT"

if [ "$RECENT_COUNT" -gt 0 ]; then
  echo ""
  echo "Sample of recent shows:"
  psql "$DATABASE_URL" -c "
  SELECT
    venue_name,
    LEFT(venue_address, 40) as address,
    ROUND(venue_lat::numeric, 4) as lat,
    ROUND(venue_lng::numeric, 4) as lng,
    date
  FROM shows
  WHERE created_at > NOW() - INTERVAL '1 day'
  ORDER BY created_at DESC
  LIMIT 5;
  "
fi

echo ""

# Check 4: Address coverage
echo "4️⃣  Checking address coverage..."
psql "$DATABASE_URL" -c "
SELECT
  COUNT(*) as total_shows,
  COUNT(venue_address) as with_address,
  COUNT(venue_lat) as with_coordinates,
  COUNT(*) - COUNT(venue_address) as missing_address,
  CASE
    WHEN COUNT(*) > 0 THEN ROUND(100.0 * COUNT(venue_address) / COUNT(*), 1)
    ELSE 0
  END as address_percentage
FROM shows;
"

echo ""

# Check 5: Sample tour with map data
echo "5️⃣  Checking tours with mappable shows..."
psql "$DATABASE_URL" -c "
SELECT
  t.id,
  t.name,
  COUNT(s.id) as total_shows,
  COUNT(s.venue_address) as shows_with_address,
  MIN(s.date) as start_date,
  MAX(s.date) as end_date
FROM tours t
LEFT JOIN shows s ON s.tour_id = t.id
WHERE t.created_at > NOW() - INTERVAL '7 days'
GROUP BY t.id, t.name
ORDER BY t.created_at DESC
LIMIT 5;
"

echo ""
echo "=================================="
echo "Verification Complete"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Test import flow at http://localhost:3000/import"
echo "2. Enter venue addresses using Google Places Autocomplete"
echo "3. Check browser console for logs"
echo "4. Run this script again to verify data was saved"
echo ""

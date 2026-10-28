#!/bin/bash

# Entity Endpoints Testing Script
# This script tests the complete entity creation flow

echo "🧪 Testing Entity Endpoints..."
echo ""

# Test with a unique user ID
USER_ID="31abcffb-6c8c-4988-bbbf-fd59350d4038"

echo "1️⃣ Testing GET /api/user/entities (should return empty array or existing entity)"
curl -s -X GET http://localhost:3001/api/user/entities \
  -H "Authorization: Bearer test-token" \
  -H "X-User-Id: $USER_ID" | jq .
echo ""
echo ""

echo "2️⃣ Testing POST /api/artist/add (create new artist)"
ARTIST_RESPONSE=$(curl -s -X POST http://localhost:3001/api/artist/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -H "X-User-Id: $USER_ID" \
  -d '{
    "name": "Jon Davis Band",
    "bio": "Rock band from California",
    "city": "San Francisco",
    "state": "California",
    "country": "USA",
    "latitude": 37.7749,
    "longitude": -122.4194
  }')

echo "$ARTIST_RESPONSE" | jq .
echo ""

# Extract entity ID
ENTITY_ID=$(echo "$ARTIST_RESPONSE" | jq -r '.id // empty')

if [ -n "$ENTITY_ID" ] && [ "$ENTITY_ID" != "null" ]; then
  echo "✅ Artist created successfully!"
  echo "   Entity ID: $ENTITY_ID"
else
  echo "⚠️  Artist may already exist (expected if running multiple times)"
fi
echo ""
echo ""

echo "3️⃣ Testing GET /api/user/entities again (should return the created entity)"
curl -s -X GET http://localhost:3001/api/user/entities \
  -H "Authorization: Bearer test-token" \
  -H "X-User-Id: $USER_ID" | jq .
echo ""
echo ""

echo "4️⃣ Testing duplicate creation (should return 409 Conflict)"
curl -s -X POST http://localhost:3001/api/artist/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -H "X-User-Id: $USER_ID" \
  -d '{
    "name": "Another Artist",
    "bio": "This should fail",
    "city": "New York",
    "state": "New York",
    "country": "USA"
  }' | jq .
echo ""
echo ""

echo "✅ Testing complete!"
echo ""
echo "📝 To clean up test data, run:"
echo "   psql \$DATABASE_URL -c \"DELETE FROM entities WHERE administrator_id = '$USER_ID';\""

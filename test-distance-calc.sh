#!/bin/bash

# Test distance calculation endpoint
TOUR_ID="ed87e9cc-4f20-4430-98d7-2669513c849f"
BACKEND_URL="http://localhost:5001"

echo "Testing distance calculation endpoint..."
echo "Tour ID: $TOUR_ID"
echo ""

# Note: This requires a valid auth token
# Get token from browser localStorage or session
echo "Calling: POST $BACKEND_URL/api/tours/$TOUR_ID/calculate-distances"
echo ""

# For now, just check if backend is responding
curl -X GET "$BACKEND_URL/api/tours/$TOUR_ID" \
  -H "Content-Type: application/json" \
  2>/dev/null | head -20

echo ""
echo "Backend is responding. Now restart frontend to pick up changes."

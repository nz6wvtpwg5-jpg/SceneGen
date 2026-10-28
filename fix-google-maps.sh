#!/bin/bash

# Google Maps Directions API Fix Script
# This script will help diagnose and fix the REQUEST_DENIED error

echo "🔍 Google Maps Directions API Diagnostic Script"
echo "=============================================="
echo ""

# Check if API key is set
echo "1️⃣ Checking API Key Configuration..."
if grep -q "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" .env.local 2>/dev/null; then
    API_KEY=$(grep "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" .env.local | cut -d '=' -f2)
    echo "   ✅ API key found in .env.local"
    echo "   Key: ${API_KEY:0:20}..."
else
    echo "   ❌ API key not found in .env.local"
    echo "   Please add: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here"
    exit 1
fi

echo ""
echo "2️⃣ Testing API Key Validity..."

# Test if the API key works with Maps JavaScript API
RESPONSE=$(curl -s "https://maps.googleapis.com/maps/api/js?key=${API_KEY}")

if echo "$RESPONSE" | grep -q "InvalidKeyMapError\|RefererNotAllowedMapError"; then
    echo "   ❌ API key is invalid or has restrictions"
    echo ""
    echo "   Possible issues:"
    echo "   • API key has referrer restrictions blocking localhost"
    echo "   • API key is invalid or revoked"
    echo ""
    echo "   Fix: Go to https://console.cloud.google.com/apis/credentials"
    echo "   Click your API key → Set 'Application restrictions' to 'None'"
else
    echo "   ✅ API key appears valid"
fi

echo ""
echo "3️⃣ Testing Directions API..."

# Test Directions API directly
DIRECTIONS_RESPONSE=$(curl -s "https://maps.googleapis.com/maps/api/directions/json?origin=New+York,NY&destination=Boston,MA&key=${API_KEY}")

if echo "$DIRECTIONS_RESPONSE" | grep -q '"status" : "OK"'; then
    echo "   ✅ Directions API is working!"
    DISTANCE=$(echo "$DIRECTIONS_RESPONSE" | grep -o '"distance" : {[^}]*}' | head -1)
    echo "   $DISTANCE"
elif echo "$DIRECTIONS_RESPONSE" | grep -q '"status" : "REQUEST_DENIED"'; then
    echo "   ❌ Directions API returned REQUEST_DENIED"
    ERROR_MESSAGE=$(echo "$DIRECTIONS_RESPONSE" | grep -o '"error_message" : "[^"]*"')
    echo "   $ERROR_MESSAGE"
    echo ""
    echo "   🔧 How to fix:"
    echo ""
    echo "   Step 1: Enable the Directions API"
    echo "   → Go to: https://console.cloud.google.com/apis/library/directions-backend.googleapis.com"
    echo "   → Click 'ENABLE'"
    echo ""
    echo "   Step 2: Check billing is enabled"
    echo "   → Go to: https://console.cloud.google.com/billing"
    echo "   → Ensure a billing account is linked (required even for free tier)"
    echo ""
    echo "   Step 3: Remove API restrictions"
    echo "   → Go to: https://console.cloud.google.com/apis/credentials"
    echo "   → Click your API key"
    echo "   → Under 'Application restrictions', select 'None'"
    echo "   → Click 'Save'"
    echo ""
    echo "   Step 4: Wait 5 minutes and run this script again"
elif echo "$DIRECTIONS_RESPONSE" | grep -q '"status" : "OVER_QUERY_LIMIT"'; then
    echo "   ⚠️  API quota exceeded"
    echo "   → Check quotas: https://console.cloud.google.com/apis/api/directions-backend.googleapis.com/quotas"
else
    echo "   ⚠️  Unexpected response:"
    echo "$DIRECTIONS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$DIRECTIONS_RESPONSE"
fi

echo ""
echo "4️⃣ Testing Geocoding API (for reference)..."
GEOCODE_RESPONSE=$(curl -s "https://maps.googleapis.com/maps/api/geocode/json?address=New+York,NY&key=${API_KEY}")

if echo "$GEOCODE_RESPONSE" | grep -q '"status" : "OK"'; then
    echo "   ✅ Geocoding API is working"
elif echo "$GEOCODE_RESPONSE" | grep -q '"status" : "REQUEST_DENIED"'; then
    echo "   ❌ Geocoding API returned REQUEST_DENIED"
else
    echo "   ⚠️  Geocoding API status: $(echo "$GEOCODE_RESPONSE" | grep -o '"status" : "[^"]*"')"
fi

echo ""
echo "=============================================="
echo "📝 Summary & Next Steps"
echo "=============================================="
echo ""
echo "If you see REQUEST_DENIED above, follow these steps:"
echo ""
echo "1. Open Google Cloud Console:"
echo "   https://console.cloud.google.com/google/maps-apis/api-list"
echo ""
echo "2. Enable these APIs (click each and press ENABLE):"
echo "   • Maps JavaScript API"
echo "   • Directions API"
echo "   • Geocoding API"
echo "   • Places API"
echo ""
echo "3. Check billing (REQUIRED even for free tier):"
echo "   https://console.cloud.google.com/billing"
echo ""
echo "4. Remove API key restrictions:"
echo "   https://console.cloud.google.com/apis/credentials"
echo "   → Click your API key"
echo "   → Application restrictions: None"
echo "   → API restrictions: None (or select specific APIs)"
echo "   → Save"
echo ""
echo "5. Wait 5 minutes for changes to propagate"
echo ""
echo "6. Restart your dev server:"
echo "   npm run dev"
echo ""
echo "7. Test at: http://localhost:3000/test-maps"
echo ""
echo "=============================================="
echo ""

# Optional: Open diagnostic page in browser
read -p "Would you like to open the diagnostic test page? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Opening http://localhost:3000/test-maps in browser..."

    # Detect OS and open browser
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "http://localhost:3000/test-maps"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        xdg-open "http://localhost:3000/test-maps"
    else
        echo "Please manually open: http://localhost:3000/test-maps"
    fi
fi

echo ""
echo "✅ Script complete!"

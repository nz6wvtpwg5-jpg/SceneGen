#!/bin/bash

# SceneGen Frontend API Testing Script
# This script tests all API endpoints to see what works and what doesn't
#
# Usage:
#   1. Sign in to http://localhost:3001
#   2. Open DevTools → Application → Session Storage
#   3. Find and copy your JWT token
#   4. Run: ./test-apis.sh "your-token-here"

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3001/api"
TOKEN="${1:-}"

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Error: No token provided${NC}"
    echo ""
    echo "Usage: $0 <your-jwt-token>"
    echo ""
    echo "To get your token:"
    echo "  1. Open http://localhost:3001 and sign in"
    echo "  2. Open DevTools (F12)"
    echo "  3. Go to Application tab → Session Storage"
    echo "  4. Copy the JWT token value"
    echo "  5. Run: $0 \"your-token-here\""
    exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          SceneGen API Endpoint Testing                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to test an endpoint
test_endpoint() {
    local METHOD=$1
    local ENDPOINT=$2
    local DATA=$3
    local EXPECTED_STATUS=$4
    local DESCRIPTION=$5

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${BLUE}Testing:${NC} $DESCRIPTION"
    echo -e "  ${YELLOW}$METHOD $ENDPOINT${NC}"

    if [ "$METHOD" = "GET" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            "$BASE_URL$ENDPOINT" 2>&1) || true
    else
        RESPONSE=$(curl -s -w "\n%{http_code}" \
            -X "$METHOD" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$DATA" \
            "$BASE_URL$ENDPOINT" 2>&1) || true
    fi

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" = "$EXPECTED_STATUS" ] || [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        echo -e "  ${GREEN}✅ PASS${NC} (Status: $HTTP_CODE)"
        if [ ! -z "$BODY" ] && [ "$BODY" != "null" ]; then
            echo "  Response preview: $(echo "$BODY" | head -c 100)..."
        fi
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "  ${RED}❌ FAIL${NC} (Status: $HTTP_CODE, Expected: $EXPECTED_STATUS)"
        if [ ! -z "$BODY" ]; then
            echo "  Error: $BODY"
        fi
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
}

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}1. AUTHENTICATION & USER ENDPOINTS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_endpoint "GET" "/user" "" "200" "Get current user data"
test_endpoint "GET" "/user/entities" "" "200" "Get user entities (owned profiles)"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}2. SHOWS MANAGEMENT${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_endpoint "GET" "/shows" "" "200" "List all shows"
test_endpoint "GET" "/shows?status=confirmed" "" "200" "Filter shows by status"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}3. TOURS MANAGEMENT${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_endpoint "GET" "/tours" "" "200" "List all tours"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}4. CONTACTS & CONNECTIONS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_endpoint "GET" "/contacts" "" "200" "List contacts"
test_endpoint "GET" "/contacts/promoters" "" "200" "List promoter contacts"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}5. SEARCH${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_endpoint "GET" "/search?q=test" "" "200" "Search entities"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}6. MESSAGING${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_endpoint "GET" "/conversations" "" "200" "List conversations"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}7. NOTIFICATIONS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_endpoint "GET" "/notification/history" "" "200" "Get notification history"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}8. INVITES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

test_endpoint "GET" "/invites" "" "200" "List invites"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                     TEST SUMMARY                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Total Tests:  ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed:       ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:       ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed. Check the output above for details.${NC}"
    exit 1
fi

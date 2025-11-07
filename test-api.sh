#!/bin/bash
# Integration tests for OAB System API

set -e

echo "=========================================="
echo "OAB System Integration Tests"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test an endpoint
test_endpoint() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="$5"

    echo -n "Testing: $test_name... "

    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "http://localhost:8080$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "http://localhost:8080$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    status_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')

    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $status_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected HTTP $expected_status, got $status_code)"
        echo "Response: $body"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo "1. Testing Health Check"
echo "----------------------"
test_endpoint "Health check" "GET" "/health" "" "200"
echo ""

echo "2. Testing Provider Endpoints"
echo "----------------------------"
test_endpoint "Get providers list" "GET" "/providers" "" "200"

# Get first provider ID
PROVIDER_ID=$(curl -s http://localhost:8080/providers | python3 -c "import sys,json; print(json.load(sys.stdin)['providers'][0]['id'])" 2>/dev/null || echo "")
if [ -n "$PROVIDER_ID" ]; then
    test_endpoint "Get specific provider" "GET" "/providers/$PROVIDER_ID" "" "200"
fi
echo ""

echo "3. Testing Appointment Types"
echo "---------------------------"
test_endpoint "Get appointment types" "GET" "/appointment-types" "" "200"
echo ""

echo "4. Testing Availability"
echo "---------------------"
if [ -n "$PROVIDER_ID" ]; then
    test_endpoint "Get availability" "GET" "/availability?providerId=$PROVIDER_ID&date=2025-11-15" "" "200"
fi
echo ""

echo "5. Testing Authentication"
echo "-----------------------"
# Create temp file for login data
cat > /tmp/admin_login.json << 'EOF'
{
  "email": "admin@ildertonhealth-demo.ca",
  "password": "Admin123!"
}
EOF

cat > /tmp/staff_login.json << 'EOF'
{
  "email": "staff@ildertonhealth-demo.ca",
  "password": "Staff123!"
}
EOF

# Test admin login
response=$(curl -s -w "\n%{http_code}" -X POST "http://localhost:8080/auth/login" \
    -H "Content-Type: application/json" \
    -d @/tmp/admin_login.json)
status_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | sed '$d')

echo -n "Testing: Admin login... "
if [ "$status_code" = "200" ]; then
    ADMIN_TOKEN=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null || echo "")
    if [ -n "$ADMIN_TOKEN" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $status_code, token received)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC} (No token in response)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
else
    echo -e "${RED}✗ FAIL${NC} (HTTP $status_code)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test staff login
response=$(curl -s -w "\n%{http_code}" -X POST "http://localhost:8080/auth/login" \
    -H "Content-Type: application/json" \
    -d @/tmp/staff_login.json)
status_code=$(echo "$response" | tail -n 1)

echo -n "Testing: Staff login... "
if [ "$status_code" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $status_code)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} (HTTP $status_code)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

echo "6. Testing Booking Creation"
echo "-------------------------"
# Create a booking
cat > /tmp/booking.json << 'EOF'
{
  "providerId": "PROVIDER_ID_PLACEHOLDER",
  "appointmentTypeId": "APPT_TYPE_PLACEHOLDER",
  "date": "2025-11-20",
  "time": "10:00",
  "modality": "in-person",
  "patientInfo": {
    "firstName": "Test",
    "lastName": "User",
    "dateOfBirth": "1990-01-01",
    "email": "test.integration@example.com",
    "preferredNotification": "email"
  },
  "reason": "Integration test booking"
}
EOF

# Get appointment type ID
APPT_TYPE_ID=$(curl -s http://localhost:8080/appointment-types | python3 -c "import sys,json; print(json.load(sys.stdin)['appointmentTypes'][0]['id'])" 2>/dev/null || echo "")

if [ -n "$PROVIDER_ID" ] && [ -n "$APPT_TYPE_ID" ]; then
    # Replace placeholders
    sed -i.bak "s/PROVIDER_ID_PLACEHOLDER/$PROVIDER_ID/" /tmp/booking.json
    sed -i.bak "s/APPT_TYPE_PLACEHOLDER/$APPT_TYPE_ID/" /tmp/booking.json

    test_endpoint "Create booking" "POST" "/bookings" "@/tmp/booking.json" "201"

    # Test getting patient bookings
    test_endpoint "Get patient bookings" "GET" "/bookings/patient/test.integration@example.com" "" "200"
fi
echo ""

echo "7. Testing Avatar URLs"
echo "--------------------"
# Test that avatar URLs are present
avatar_count=$(curl -s http://localhost:8080/providers | python3 -c "import sys,json; providers=json.load(sys.stdin)['providers']; print(sum(1 for p in providers if p.get('photoUrl')))" 2>/dev/null || echo "0")

echo -n "Testing: Providers have avatar URLs... "
if [ "$avatar_count" -gt "0" ]; then
    echo -e "${GREEN}✓ PASS${NC} ($avatar_count providers with avatars)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} (No providers have avatar URLs)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test that an avatar URL is accessible
if [ "$avatar_count" -gt "0" ]; then
    AVATAR_URL=$(curl -s http://localhost:8080/providers | python3 -c "import sys,json; print(json.load(sys.stdin)['providers'][0]['photoUrl'])" 2>/dev/null || echo "")
    if [ -n "$AVATAR_URL" ]; then
        avatar_status=$(curl -s -o /dev/null -w "%{http_code}" "$AVATAR_URL")
        echo -n "Testing: Avatar URL is accessible... "
        if [ "$avatar_status" = "200" ]; then
            echo -e "${GREEN}✓ PASS${NC} (HTTP $avatar_status)"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${RED}✗ FAIL${NC} (HTTP $avatar_status)"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    fi
fi
echo ""

echo "8. Testing Admin Endpoints (Protected)"
echo "------------------------------------"
if [ -n "$ADMIN_TOKEN" ]; then
    response=$(curl -s -w "\n%{http_code}" -X GET "http://localhost:8080/admin/bookings" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    status_code=$(echo "$response" | tail -n 1)

    echo -n "Testing: Admin get bookings (with auth)... "
    if [ "$status_code" = "200" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $status_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $status_code)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi

    # Test stats endpoint
    response=$(curl -s -w "\n%{http_code}" -X GET "http://localhost:8080/admin/bookings/reports/bookings" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    status_code=$(echo "$response" | tail -n 1)

    echo -n "Testing: Admin get statistics (with auth)... "
    if [ "$status_code" = "200" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $status_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $status_code)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
fi

# Test without auth (should fail)
test_endpoint "Admin get bookings (no auth)" "GET" "/admin/bookings" "" "401"
echo ""

echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed ✗${NC}"
    exit 1
fi

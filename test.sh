#!/bin/bash

# AI Form Summarizer Backend Test Script
# This script tests the basic functionality of the backend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER_URL="http://localhost:3000"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="testpassword123"

echo -e "${YELLOW}🧪 AI Form Summarizer Backend Test Script${NC}"
echo "======================================="

# Function to make HTTP requests and check response
make_request() {
    local method=$1
    local url=$2
    local data=$3
    local headers=$4
    local expected_status=$5
    
    if [ -n "$data" ] && [ -n "$headers" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -H "$headers" -d "$data")
    elif [ -n "$data" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -d "$data")
    elif [ -n "$headers" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X "$method" "$url" -H "$headers")
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X "$method" "$url")
    fi
    
    body=$(echo "$response" | sed -E 's/HTTPSTATUS\:[0-9]{3}$//')
    status=$(echo "$response" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    
    if [ "$status" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} $method $url - Status: $status"
        echo "$body"
        return 0
    else
        echo -e "${RED}✗${NC} $method $url - Expected: $expected_status, Got: $status"
        echo "$body"
        return 1
    fi
}

# Check if server is running
echo -e "\n${YELLOW}1. Checking if server is running...${NC}"
if ! curl -s "$SERVER_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}✗ Server is not running at $SERVER_URL${NC}"
    echo "Please start the server with: npm start"
    exit 1
fi

# Test health endpoint
echo -e "\n${YELLOW}2. Testing health endpoint...${NC}"
make_request "GET" "$SERVER_URL/health" "" "" 200

# Test API info endpoint  
echo -e "\n${YELLOW}3. Testing API info endpoint...${NC}"
make_request "GET" "$SERVER_URL/" "" "" 200

# Test user registration
echo -e "\n${YELLOW}4. Testing user registration...${NC}"
registration_data="{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"firstName\": \"Test\",
    \"lastName\": \"User\"
}"

registration_response=$(make_request "POST" "$SERVER_URL/auth/register" "$registration_data" "" 201)
token=$(echo "$registration_response" | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])" 2>/dev/null || echo "")

if [ -z "$token" ]; then
    echo -e "${RED}✗ Failed to extract token from registration response${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Token extracted successfully${NC}"

# Test user login
echo -e "\n${YELLOW}5. Testing user login...${NC}"
login_data="{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
}"

make_request "POST" "$SERVER_URL/auth/login" "$login_data" "" 200

# Test unauthorized access
echo -e "\n${YELLOW}6. Testing unauthorized access...${NC}"
webhook_data="{
    \"formData\": {\"test\": \"data\"},
    \"formType\": \"test\"
}"

make_request "POST" "$SERVER_URL/webhook" "$webhook_data" "" 401

# Test webhook with authentication
echo -e "\n${YELLOW}7. Testing webhook with authentication...${NC}"
webhook_data="{
    \"formData\": {
        \"name\": \"Test Contact\",
        \"email\": \"contact@example.com\",
        \"message\": \"This is a test form submission from the test script.\"
    },
    \"formType\": \"contact\"
}"

webhook_response=$(make_request "POST" "$SERVER_URL/webhook" "$webhook_data" "Authorization: Bearer $token" 201)
submission_id=$(echo "$webhook_response" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['submissionId'])" 2>/dev/null || echo "")
summary_id=$(echo "$webhook_response" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['summaryId'])" 2>/dev/null || echo "")

if [ -z "$submission_id" ] || [ -z "$summary_id" ]; then
    echo -e "${RED}✗ Failed to extract submission or summary ID${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Submission ID: $submission_id${NC}"
echo -e "${GREEN}✓ Summary ID: $summary_id${NC}"

# Test getting submissions
echo -e "\n${YELLOW}8. Testing get submissions...${NC}"
make_request "GET" "$SERVER_URL/webhook/submissions" "" "Authorization: Bearer $token" 200

# Test getting specific submission
echo -e "\n${YELLOW}9. Testing get specific submission...${NC}"
make_request "GET" "$SERVER_URL/webhook/submissions/$submission_id" "" "Authorization: Bearer $token" 200

# Test distribution
echo -e "\n${YELLOW}10. Testing distribution...${NC}"
distribution_data="{
    \"summaryId\": \"$summary_id\",
    \"distributionType\": \"email\",
    \"recipients\": [\"test@example.com\"],
    \"metadata\": {
        \"subject\": \"Test Distribution\",
        \"priority\": \"normal\"
    }
}"

distribution_response=$(make_request "POST" "$SERVER_URL/distribute" "$distribution_data" "Authorization: Bearer $token" 200)

# Test getting distribution logs
echo -e "\n${YELLOW}11. Testing get distribution logs...${NC}"
make_request "GET" "$SERVER_URL/distribute/logs" "" "Authorization: Bearer $token" 200

# Test 404 endpoint
echo -e "\n${YELLOW}12. Testing 404 endpoint...${NC}"
make_request "GET" "$SERVER_URL/nonexistent" "" "" 404

echo -e "\n${GREEN}🎉 All tests passed successfully!${NC}"
echo "======================================="
echo -e "${GREEN}✓ Server is running correctly${NC}"
echo -e "${GREEN}✓ Authentication system working${NC}"
echo -e "${GREEN}✓ Database integration working${NC}"
echo -e "${GREEN}✓ Form submission processing working${NC}"
echo -e "${GREEN}✓ Distribution system working${NC}"
echo -e "${GREEN}✓ Authorization protection working${NC}"

echo -e "\n${YELLOW}Test user created:${NC}"
echo "Email: $TEST_EMAIL"
echo "Password: $TEST_PASSWORD"
echo "JWT Token: $token"

echo -e "\n${YELLOW}Clean up:${NC}"
echo "The test user and data will remain in the database."
echo "You can manually delete them if needed."
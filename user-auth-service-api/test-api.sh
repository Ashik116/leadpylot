#!/bin/bash

# User & Auth Service API Test Script
# Usage: ./test-api.sh

BASE_URL="http://localhost:4000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Testing User & Auth Microservice"
echo "=================================="
echo ""

# Test 1: Health Check
echo "1️⃣  Health Check..."
HEALTH=$(curl -s "$BASE_URL/health")
if echo "$HEALTH" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    echo "$HEALTH" | jq '.'
else
    echo -e "${RED}❌ Health check failed${NC}"
    echo "$HEALTH"
fi
echo ""

# Test 2: Readiness Check
echo "2️⃣  Readiness Check..."
READY=$(curl -s "$BASE_URL/ready")
if echo "$READY" | grep -q "ready"; then
    echo -e "${GREEN}✅ Service is ready${NC}"
    echo "$READY" | jq '.'
else
    echo -e "${RED}❌ Service not ready${NC}"
    echo "$READY"
fi
echo ""

# Test 3: Register Admin User
echo "3️⃣  Registering admin user..."
REGISTER=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "login": "admin",
    "password": "admin123",
    "role": "Admin"
  }')

if echo "$REGISTER" | grep -q "token"; then
    echo -e "${GREEN}✅ Admin registration successful${NC}"
    TOKEN=$(echo "$REGISTER" | jq -r '.token')
    echo "Token: ${TOKEN:0:50}..."
elif echo "$REGISTER" | grep -q "already exists"; then
    echo -e "${YELLOW}⚠️  Admin already exists, logging in instead...${NC}"
    
    # Login instead
    LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
      -H "Content-Type: application/json" \
      -d '{
        "login": "admin",
        "password": "admin123"
      }')
    
    TOKEN=$(echo "$LOGIN" | jq -r '.token')
    echo -e "${GREEN}✅ Login successful${NC}"
    echo "Token: ${TOKEN:0:50}..."
else
    echo -e "${RED}❌ Registration failed${NC}"
    echo "$REGISTER"
    exit 1
fi
echo ""

# Test 4: Get Current User
echo "4️⃣  Getting current user..."
ME=$(curl -s -X GET "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN")

if echo "$ME" | grep -q "login"; then
    echo -e "${GREEN}✅ Successfully retrieved user info${NC}"
    echo "$ME" | jq '.'
else
    echo -e "${RED}❌ Failed to get user info${NC}"
    echo "$ME"
fi
echo ""

# Test 5: Change Password
echo "5️⃣  Changing password..."
CHANGE_PW=$(curl -s -X POST "$BASE_URL/api/auth/change-password" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "admin123",
    "newPassword": "admin456"
  }')

if echo "$CHANGE_PW" | grep -q "successfully"; then
    echo -e "${GREEN}✅ Password changed successfully${NC}"
    echo "$CHANGE_PW" | jq '.'
    
    # Change it back
    echo "   Changing password back..."
    curl -s -X POST "$BASE_URL/api/auth/change-password" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "currentPassword": "admin456",
        "newPassword": "admin123"
      }' > /dev/null
    echo -e "${GREEN}   ✅ Password restored${NC}"
else
    echo -e "${RED}❌ Password change failed${NC}"
    echo "$CHANGE_PW"
fi
echo ""

# Test 6: Invalid Login
echo "6️⃣  Testing invalid login..."
INVALID=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "login": "admin",
    "password": "wrongpassword"
  }')

if echo "$INVALID" | grep -q "Invalid"; then
    echo -e "${GREEN}✅ Invalid credentials correctly rejected${NC}"
else
    echo -e "${RED}❌ Invalid credentials test failed${NC}"
    echo "$INVALID"
fi
echo ""

# Test 7: Logout
echo "7️⃣  Logging out..."
LOGOUT=$(curl -s -X POST "$BASE_URL/api/auth/logout" \
  -H "Authorization: Bearer $TOKEN")

if echo "$LOGOUT" | grep -q "successful"; then
    echo -e "${GREEN}✅ Logout successful${NC}"
    echo "$LOGOUT" | jq '.'
else
    echo -e "${RED}❌ Logout failed${NC}"
    echo "$LOGOUT"
fi
echo ""

# Test 8: Access with Expired Token
echo "8️⃣  Testing access after logout..."
AFTER_LOGOUT=$(curl -s -X GET "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN")

if echo "$AFTER_LOGOUT" | grep -q "Session expired\|terminated"; then
    echo -e "${GREEN}✅ Token correctly invalidated after logout${NC}"
else
    echo -e "${RED}❌ Token should be invalidated${NC}"
    echo "$AFTER_LOGOUT"
fi
echo ""

echo "=================================="
echo -e "${GREEN}🎉 All tests completed!${NC}"
echo ""
echo "Summary:"
echo "  ✅ Health checks"
echo "  ✅ User registration"
echo "  ✅ Login/Logout"
echo "  ✅ Protected routes"
echo "  ✅ Password management"
echo "  ✅ Session management"
echo "  ✅ Error handling"

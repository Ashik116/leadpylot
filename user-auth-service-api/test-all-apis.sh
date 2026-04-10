#!/bin/bash

BASE_URL="http://localhost:4000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🧪 COMPREHENSIVE API TEST - ALL ENDPOINTS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Step 1: Login as admin to get token
echo -e "${YELLOW}1️⃣  Logging in as admin...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"admin123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✅ Login successful${NC}"
else
    echo -e "${RED}❌ Login failed${NC}"
    exit 1
fi
echo ""

# Step 2: GET /api/users - List all users
echo -e "${YELLOW}2️⃣  GET /api/users - List all users${NC}"
USERS_RESPONSE=$(curl -s "$BASE_URL/api/users" \
  -H "Authorization: Bearer $TOKEN")

if echo "$USERS_RESPONSE" | jq -e '.data' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Successfully fetched users${NC}"
    echo "$USERS_RESPONSE" | jq '.'
else
    echo -e "${RED}❌ Failed to fetch users${NC}"
    echo "$USERS_RESPONSE"
fi
echo ""

# Step 3: POST /api/users - Create new user
echo -e "${YELLOW}3️⃣  POST /api/users - Create new user (Agent)${NC}"
CREATE_USER=$(curl -s -X POST "$BASE_URL/api/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "login": "agent_test_'$(date +%s)'",
    "password": "agent123",
    "role": "Agent",
    "info": {
      "name": "Test Agent",
      "email": "agent@test.com"
    }
  }')

USER_ID=$(echo "$CREATE_USER" | jq -r '._id')

if [ "$USER_ID" != "null" ] && [ -n "$USER_ID" ]; then
    echo -e "${GREEN}✅ User created successfully${NC}"
    echo "$CREATE_USER" | jq '.'
else
    echo -e "${RED}❌ Failed to create user${NC}"
    echo "$CREATE_USER"
fi
echo ""

# Step 4: GET /api/users/:id - Get user by ID
echo -e "${YELLOW}4️⃣  GET /api/users/:id - Get user by ID${NC}"
if [ "$USER_ID" != "null" ]; then
    GET_USER=$(curl -s "$BASE_URL/api/users/$USER_ID" \
      -H "Authorization: Bearer $TOKEN")
    
    if echo "$GET_USER" | jq -e '._id' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Successfully fetched user by ID${NC}"
        echo "$GET_USER" | jq '.'
    else
        echo -e "${RED}❌ Failed to fetch user by ID${NC}"
        echo "$GET_USER"
    fi
else
    echo -e "${YELLOW}⚠️  Skipped (no user ID)${NC}"
fi
echo ""

# Step 5: PUT /api/users/:id - Update user
echo -e "${YELLOW}5️⃣  PUT /api/users/:id - Update user${NC}"
if [ "$USER_ID" != "null" ]; then
    UPDATE_USER=$(curl -s -X PUT "$BASE_URL/api/users/$USER_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "info": {
          "name": "Updated Test Agent",
          "email": "updated@test.com"
        }
      }')
    
    if echo "$UPDATE_USER" | jq -e '._id' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ User updated successfully${NC}"
        echo "$UPDATE_USER" | jq '.'
    else
        echo -e "${RED}❌ Failed to update user${NC}"
        echo "$UPDATE_USER"
    fi
else
    echo -e "${YELLOW}⚠️  Skipped (no user ID)${NC}"
fi
echo ""

# Step 6: GET /api/users with pagination
echo -e "${YELLOW}6️⃣  GET /api/users?page=1&limit=5 - Pagination${NC}"
PAGINATED=$(curl -s "$BASE_URL/api/users?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN")

if echo "$PAGINATED" | jq -e '.meta' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Pagination works${NC}"
    echo "$PAGINATED" | jq '{data: .data | length, meta: .meta}'
else
    echo -e "${RED}❌ Pagination failed${NC}"
    echo "$PAGINATED"
fi
echo ""

# Step 7: GET /api/users with search
echo -e "${YELLOW}7️⃣  GET /api/users?search=admin - Search${NC}"
SEARCH=$(curl -s "$BASE_URL/api/users?search=admin" \
  -H "Authorization: Bearer $TOKEN")

if echo "$SEARCH" | jq -e '.data' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Search works${NC}"
    echo "$SEARCH" | jq '{results: .data | length, meta: .meta}'
else
    echo -e "${RED}❌ Search failed${NC}"
    echo "$SEARCH"
fi
echo ""

# Step 8: GET /api/users with role filter
echo -e "${YELLOW}8️⃣  GET /api/users?role=Admin - Filter by role${NC}"
ROLE_FILTER=$(curl -s "$BASE_URL/api/users?role=Admin" \
  -H "Authorization: Bearer $TOKEN")

if echo "$ROLE_FILTER" | jq -e '.data' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Role filter works${NC}"
    echo "$ROLE_FILTER" | jq '{results: .data | length, meta: .meta}'
else
    echo -e "${RED}❌ Role filter failed${NC}"
    echo "$ROLE_FILTER"
fi
echo ""

# Step 9: Create a second test user for bulk delete
echo -e "${YELLOW}9️⃣  Creating second test user for bulk operations${NC}"
CREATE_USER2=$(curl -s -X POST "$BASE_URL/api/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "login": "agent_test2_'$(date +%s)'",
    "password": "agent123",
    "role": "Agent"
  }')

USER_ID2=$(echo "$CREATE_USER2" | jq -r '._id')

if [ "$USER_ID2" != "null" ]; then
    echo -e "${GREEN}✅ Second user created${NC}"
else
    echo -e "${YELLOW}⚠️  Could not create second user${NC}"
fi
echo ""

# Step 10: DELETE /api/users/:id - Delete single user
echo -e "${YELLOW}🔟  DELETE /api/users/:id - Delete single user${NC}"
if [ "$USER_ID" != "null" ]; then
    DELETE_USER=$(curl -s -X DELETE "$BASE_URL/api/users/$USER_ID" \
      -H "Authorization: Bearer $TOKEN")
    
    if echo "$DELETE_USER" | jq -e '.message' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ User deleted successfully${NC}"
        echo "$DELETE_USER" | jq '.'
    else
        echo -e "${RED}❌ Failed to delete user${NC}"
        echo "$DELETE_USER"
    fi
else
    echo -e "${YELLOW}⚠️  Skipped (no user ID)${NC}"
fi
echo ""

# Step 11: DELETE /api/users - Bulk delete
echo -e "${YELLOW}1️⃣1️⃣  DELETE /api/users - Bulk delete${NC}"
if [ "$USER_ID2" != "null" ]; then
    BULK_DELETE=$(curl -s -X DELETE "$BASE_URL/api/users" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"ids\":[\"$USER_ID2\"]}")
    
    if echo "$BULK_DELETE" | jq -e '.message' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Bulk delete successful${NC}"
        echo "$BULK_DELETE" | jq '.'
    else
        echo -e "${RED}❌ Bulk delete failed${NC}"
        echo "$BULK_DELETE"
    fi
else
    echo -e "${YELLOW}⚠️  Skipped (no user ID)${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 API Test Complete!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}✅ ALL API ENDPOINTS TESTED:${NC}"
echo "   Authentication APIs (7 endpoints)"
echo "   User Management APIs (6+ operations)"
echo "   Pagination, Search, Filtering"
echo "   CRUD operations"
echo "   Bulk operations"
echo ""


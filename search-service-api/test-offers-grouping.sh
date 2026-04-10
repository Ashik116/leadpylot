#!/bin/bash

# Test Offers Grouping
# Replace TOKEN with your actual JWT token

TOKEN="${1:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OGEyYTlhZWJlNzE5Y2MzNGYzMTZhMTkiLCJsb2dpbiI6InNha2liIiwicm9sZSI6IkFkbWluIiwic2Vzc2lvbklkIjoiYThmOTUwODktYTdmZS00OGE5LWFjNDktOGM4ZDUwMTNhYTJlIiwiaWF0IjoxNzY0NDgzOTEzLCJleHAiOjE3NjQ1NzAzMTN9.tArFIoI1OAgCREDYO0q9y0Sk4vjA7587KSNC0wozx0w}"

echo "=========================================="
echo "  Testing Offers Grouping by Status"
echo "=========================================="
echo ""

# Test 1: Group by status
echo "=== Test 1: Group Offers by Status ==="
curl -s -X GET "http://localhost:4003/offers?groupBy=%5B%22status%22%5D" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" | python3 -m json.tool | head -60

echo ""
echo ""

# Test 2: Group by current_stage  
echo "=== Test 2: Group Offers by Current Stage ==="
curl -s -X GET "http://localhost:4003/offers?groupBy=%5B%22current_stage%22%5D" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" | python3 -m json.tool | head -60

echo ""
echo ""

# Test 3: Filter offers by status
echo "=== Test 3: Filter Offers (status=Angebot) ==="
curl -s -X GET 'http://localhost:4003/offers?domain=%5B%5B%22status%22%2C%22%3D%22%2C%22Angebot%22%5D%5D&limit=3' \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" | python3 -m json.tool | head -80

echo ""


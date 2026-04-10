#!/bin/bash

# Metadata API Test Script
# Demonstrates complete workflow: Discovery → Filter → Group → Drill-down

# Your JWT token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OGEyYTlhZWJlNzE5Y2MzNGYzMTZhMTkiLCJsb2dpbiI6InNha2liIiwicm9sZSI6IkFkbWluIiwic2Vzc2lvbklkIjoiYThmOTUwODktYTdmZS00OGE5LWFjNDktOGM4ZDUwMTNhYTJlIiwiaWF0IjoxNzY0NDgzOTEzLCJleHAiOjE3NjQ1NzAzMTN9.tArFIoI1OAgCREDYO0q9y0Sk4vjA7587KSNC0wozx0w"

BASE_URL="http://localhost:3010/api/metadata"
SEARCH_URL="http://localhost:4003"

echo "========================================"
echo "  METADATA API - Complete Workflow"
echo "========================================"
echo ""

# Step 1: Discover available models
echo "📦 STEP 1: Discover Available Models"
echo "========================================"
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/models" | python3 -m json.tool | head -20
echo ""
echo ""

# Step 2: Get filter options for Lead
echo "🔍 STEP 2: Get Filter Options for Lead"
echo "========================================"
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/options/Lead" | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'Total filter options: {len(data[\"filterOptions\"])}')
print(f'Total group options: {len(data[\"groupOptions\"])}')
print('')
print('Sample Filter Options:')
for opt in data['filterOptions'][:5]:
    print(f\"  - {opt['field']} ({opt['type']}): {', '.join(opt['operators'][:3])}\")
print('')
print('Sample Group Options:')
for opt in data['groupOptions'][:5]:
    print(f\"  - {opt['field']} ({opt['type']})\")
"
echo ""
echo ""

# Step 3: Build a filter using discovered fields
echo "🎯 STEP 3: Build Dynamic Filter"
echo "========================================"
echo "Using discovered field 'status_id' with operator '=' ..."
echo ""

# Get the first status_id from grouping
STATUS_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$SEARCH_URL/leads?groupBy=%5B%22status_id%22%5D&limit=1" | \
  python3 -c "import json, sys; data=json.load(sys.stdin); print(data['data'][0]['status_id'])")

echo "Found status_id: $STATUS_ID"
echo ""
echo ""

# Step 4: Group by status
echo "📊 STEP 4: Group Leads by Status"
echo "========================================"
curl -s -H "Authorization: Bearer $TOKEN" \
  "$SEARCH_URL/leads?groupBy=%5B%22status_id%22%5D" | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
sorted_data = sorted(data['data'], key=lambda x: x['count'], reverse=True)
print('Top 5 Status Groups:')
for item in sorted_data[:5]:
    print(f\"  - Status ID {item['status_id']}: {item['count']} leads\")
"
echo ""
echo ""

# Step 5: Drill down into specific group
echo "🔬 STEP 5: Drill Down - Get Leads from Top Status"
echo "========================================"
echo "Getting leads with status_id = $STATUS_ID (limit 2)..."
echo ""
curl -s -H "Authorization: Bearer $TOKEN" \
  "$SEARCH_URL/leads?domain=%5B%5B%22status_id%22%2C%22%3D%22%2C%22$STATUS_ID%22%5D%5D&limit=2" | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'data' in data:
    print(f\"Total leads found: {data['meta']['total']}\")
    print(f\"Showing {len(data['data'])} leads:\")
    print('')
    for lead in data['data']:
        print(f\"  - {lead.get('contact_name', 'N/A')} ({lead.get('email_from', 'No email')})\")
        print(f\"    Revenue: {lead.get('expected_revenue', 0)} | Created: {lead.get('createdAt', 'N/A')[:10]}\")
        print('')
"
echo ""
echo ""

# Step 6: Complex multi-field filter
echo "⚡ STEP 6: Complex Multi-Field Filter"
echo "========================================"
echo "Filter: status_id = $STATUS_ID AND expected_revenue > 1000"
echo ""
curl -s -H "Authorization: Bearer $TOKEN" \
  "$SEARCH_URL/leads?domain=%5B%5B%22status_id%22%2C%22%3D%22%2C%22$STATUS_ID%22%5D%2C%5B%22expected_revenue%22%2C%22%3E%22%2C1000%5D%5D&limit=3" | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'data' in data:
    print(f\"Leads matching complex filter: {data['meta']['total']}\")
    print('')
    for lead in data['data'][:3]:
        print(f\"  - {lead.get('contact_name', 'N/A')}: €{lead.get('expected_revenue', 0)}\")
"
echo ""
echo ""

# Step 7: Get metadata for another model
echo "🔄 STEP 7: Discover Offer Model Fields"
echo "========================================"
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/options/Offer" | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'Offer Model:')
print(f'  - Filter options: {len(data[\"filterOptions\"])}')
print(f'  - Group options: {len(data[\"groupOptions\"])}')
print('')
print('Sample fields:')
for opt in data['filterOptions'][:5]:
    print(f\"  - {opt['label']}: {opt['type']}\")
"
echo ""
echo ""

echo "========================================"
echo "  ✅ Complete! Metadata API Working!"
echo "========================================"
echo ""
echo "Key Takeaways:"
echo "  1. ✅ Dynamic field discovery for any model"
echo "  2. ✅ Build filters without hardcoding fields"
echo "  3. ✅ Group data by any field"
echo "  4. ✅ Drill down into grouped results"
echo "  5. ✅ Complex multi-field filtering"
echo "  6. ✅ Works with all models (Lead, Offer, etc.)"
echo ""


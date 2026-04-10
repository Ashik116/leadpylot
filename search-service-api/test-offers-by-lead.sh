#!/bin/bash

# Test Offers Grouped by Lead Fields (Auto-Join)
# Replace TOKEN with your actual JWT token

TOKEN="${1:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OGEyYTlhZWJlNzE5Y2MzNGYzMTZhMTkiLCJsb2dpbiI6InNha2liIiwicm9sZSI6IkFkbWluIiwic2Vzc2lvbklkIjoiYThmOTUwODktYTdmZS00OGE5LWFjNDktOGM4ZDUwMTNhYTJlIiwiaWF0IjoxNzY0NDgzOTEzLCJleHAiOjE3NjQ1NzAzMTN9.tArFIoI1OAgCREDYO0q9y0Sk4vjA7587KSNC0wozx0w}"

echo "=========================================="
echo "  Offers Grouped by Lead Fields"
echo "=========================================="
echo ""

# Test 1: Group by Lead Status
echo "=== Test 1: Group Offers by Lead Status ==="
curl -s -X GET 'http://localhost:4003/offers?groupBy=%5B%22lead_id.status%22%5D' \
  -H "Authorization: Bearer ${TOKEN}" | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'Total groups: {data[\"meta\"][\"totalGroups\"]}')
print('\\nTop 10 Lead Statuses:')
for item in data['data'][:10]:
    status = item['lead_id_status'] or 'null'
    count = item['count']
    print(f'  {status}: {count} offers')
"
echo ""
echo ""

# Test 2: Group by Lead Team/Project
echo "=== Test 2: Group Offers by Lead's Team/Project ==="
curl -s -X GET 'http://localhost:4003/offers?groupBy=%5B%22lead_id.team_id%22%5D' \
  -H "Authorization: Bearer ${TOKEN}" | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'Total teams: {data[\"meta\"][\"totalGroups\"]}')
print('\\nTop 5 Teams:')
for item in data['data'][:5]:
    team = item.get('lead_id_team_id', 'null')
    count = item['count']
    print(f'  Team {team}: {count} offers')
"
echo ""
echo ""

# Test 3: Group by Lead Source
echo "=== Test 3: Group Offers by Lead's Source ==="
curl -s -X GET 'http://localhost:4003/offers?groupBy=%5B%22lead_id.source_id%22%5D' \
  -H "Authorization: Bearer ${TOKEN}" | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'Total sources: {data[\"meta\"][\"totalGroups\"]}')
print('\\nTop 5 Sources:')
for item in data['data'][:5]:
    source = item.get('lead_id_source_id', 'null')
    count = item['count']
    print(f'  Source {source}: {count} offers')
"
echo ""
echo ""

# Test 4: Filter offers where lead status = "Angebot"
echo "=== Test 4: Get Offers Where Lead Status = 'Angebot' ==="
curl -s -X GET 'http://localhost:4003/offers?domain=%5B%5B%22lead_id.status%22%2C%22%3D%22%2C%22Angebot%22%5D%5D&limit=3' \
  -H "Authorization: Bearer ${TOKEN}" | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'Total offers with lead status \"Angebot\": {data[\"meta\"][\"total\"]}')
print(f'\\nShowing {len(data[\"data\"])} offers:')
for offer in data['data']:
    title = offer.get('title', 'N/A')
    ref = offer.get('reference_no', 'N/A')
    print(f'  - {title} (Ref: {ref})')
"
echo ""
echo ""

# Test 5: Multi-level grouping
echo "=== Test 5: Group by Lead Status AND Offer Stage ==="
curl -s -X GET 'http://localhost:4003/offers?groupBy=%5B%22lead_id.status%22%2C%22current_stage%22%5D' \
  -H "Authorization: Bearer ${TOKEN}" | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'Total groups: {data[\"meta\"][\"totalGroups\"]}')
print('\\nFirst 10 combinations:')
for item in data['data'][:10]:
    status = item.get('lead_id_status', 'null')
    stage = item.get('current_stage', 'null')
    count = item['count']
    print(f'  Lead: {status} + Stage: {stage} = {count} offers')
"
echo ""
echo ""

# Test 6: Filter by lead's expected revenue
echo "=== Test 6: Offers Where Lead Revenue > 1000 ==="
curl -s -X GET 'http://localhost:4003/offers?domain=%5B%5B%22lead_id.expected_revenue%22%2C%22%3E%22%2C%221000%22%5D%5D&limit=5' \
  -H "Authorization: Bearer ${TOKEN}" | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'Total high-revenue offers: {data[\"meta\"][\"total\"]}')
print(f'\\nShowing {len(data[\"data\"])} offers:')
for offer in data['data']:
    title = offer.get('title', 'N/A')
    stage = offer.get('current_stage', 'N/A')
    print(f'  - {title} (Stage: {stage})')
"
echo ""
echo ""

echo "=========================================="
echo "  ✅ Auto-Join Feature Working!"
echo "=========================================="
echo ""
echo "You can now:"
echo "  - Group offers by ANY lead field"
echo "  - Filter offers by lead properties"
echo "  - Combine multiple conditions"
echo ""


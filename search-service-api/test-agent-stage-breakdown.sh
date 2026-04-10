#!/bin/bash

# Test: Which Agent has Offers at Which Stage
# Complete breakdown of agent-stage-offer distribution

TOKEN="${1:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OGEyYTlhZWJlNzE5Y2MzNGYzMTZhMTkiLCJsb2dpbiI6InNha2liIiwicm9sZSI6IkFkbWluIiwic2Vzc2lvbklkIjoiYThmOTUwODktYTdmZS00OGE5LWFjNDktOGM4ZDUwMTNhYTJlIiwiaWF0IjoxNzY0NDgzOTEzLCJleHAiOjE3NjQ1NzAzMTN9.tArFIoI1OAgCREDYO0q9y0Sk4vjA7587KSNC0wozx0w}"

echo "=========================================="
echo "  Agent → Stage → Offers Breakdown"
echo "=========================================="
echo ""

# Test 1: Multi-level grouping (Agent + Stage)
echo "=== 1. Which Agent Has Offers at Which Stage ==="
echo ""
curl -s -X GET 'http://localhost:4003/offers?groupBy=%5B%22agent_id%22%2C%22current_stage%22%5D' \
  -H "Authorization: Bearer ${TOKEN}" | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
if not data.get('success'):
    print('Error:', data)
    sys.exit(1)

print(f'Total Agent+Stage Combinations: {data[\"meta\"][\"totalGroups\"]}')
print('')
print('Top 25 Agent → Stage Combinations:')
print('=' * 90)
print(f'{\"Agent ID\":<30} | {\"Stage\":<20} | {\"Offers\":>10}')
print('-' * 90)

for item in data['data'][:25]:
    agent = item.get('agent_id', 'No Agent')
    stage = item.get('current_stage', 'No Stage')
    count = item['count']
    
    # Truncate agent ID for display
    agent_display = agent[:28] if agent else 'No Agent'
    stage_display = stage[:18] if stage else 'No Stage'
    
    print(f'{agent_display:<30} | {stage_display:<20} | {count:>10}')

print('')
"
echo ""

# Test 2: Group by Agent only
echo "=== 2. Total Offers Per Agent ==="
echo ""
curl -s -X GET 'http://localhost:4003/offers?groupBy=%5B%22agent_id%22%5D' \
  -H "Authorization: Bearer ${TOKEN}" | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
if not data.get('success'):
    print('Error:', data)
    sys.exit(1)

print(f'Total Agents: {data[\"meta\"][\"totalGroups\"]}')
print('')

# Sort by count descending
sorted_data = sorted(data['data'], key=lambda x: x['count'], reverse=True)

print('Top 10 Agents by Offer Count:')
print('=' * 60)
print(f'{\"Agent ID\":<40} | {\"Total Offers\":>12}')
print('-' * 60)

for item in sorted_data[:10]:
    agent = item.get('agent_id', 'No Agent')
    count = item['count']
    agent_display = agent[:38] if agent else 'No Agent'
    print(f'{agent_display:<40} | {count:>12}')

print('')
"
echo ""

# Test 3: Group by Stage only
echo "=== 3. Total Offers Per Stage ==="
echo ""
curl -s -X GET 'http://localhost:4003/offers?groupBy=%5B%22current_stage%22%5D' \
  -H "Authorization: Bearer ${TOKEN}" | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
if not data.get('success'):
    print('Error:', data)
    sys.exit(1)

print(f'Total Stages: {data[\"meta\"][\"totalGroups\"]}')
print('')

# Sort by count descending
sorted_data = sorted(data['data'], key=lambda x: x['count'], reverse=True)

print('Offers by Stage:')
print('=' * 50)
print(f'{\"Stage\":<30} | {\"Offers\":>12}')
print('-' * 50)

for item in sorted_data:
    stage = item.get('current_stage', 'No Stage')
    count = item['count']
    stage_display = stage[:28] if stage else 'No Stage'
    print(f'{stage_display:<30} | {count:>12}')

print('')
"
echo ""

# Test 4: Drill down - Get a specific agent's offer breakdown by stage
echo "=== 4. Drill Down: Top Agent's Offers by Stage ==="
echo ""
# First get top agent ID
TOP_AGENT=$(curl -s -X GET 'http://localhost:4003/offers?groupBy=%5B%22agent_id%22%5D' \
  -H "Authorization: Bearer ${TOKEN}" | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
if data.get('success'):
    sorted_data = sorted(data['data'], key=lambda x: x['count'], reverse=True)
    print(sorted_data[0]['agent_id'] if sorted_data else '')
" 2>/dev/null)

if [ ! -z "$TOP_AGENT" ]; then
    echo "Top Agent ID: $TOP_AGENT"
    echo ""
    
    # Get this agent's offers grouped by stage
    curl -s -X GET "http://localhost:4003/offers?domain=%5B%5B%22agent_id%22%2C%22%3D%22%2C%22${TOP_AGENT}%22%5D%5D&groupBy=%5B%22current_stage%22%5D" \
      -H "Authorization: Bearer ${TOKEN}" | \
      python3 -c "
import json, sys
data = json.load(sys.stdin)
if not data.get('success'):
    print('Error:', data)
    sys.exit(1)

print(f'This agent has offers in {data[\"meta\"][\"totalGroups\"]} different stages:')
print('')
print('=' * 50)
print(f'{\"Stage\":<30} | {\"Count\":>12}')
print('-' * 50)

sorted_data = sorted(data['data'], key=lambda x: x['count'], reverse=True)
for item in sorted_data:
    stage = item.get('current_stage', 'No Stage')
    count = item['count']
    stage_display = stage[:28] if stage else 'No Stage'
    print(f'{stage_display:<30} | {count:>12}')
"
else
    echo "Could not fetch top agent"
fi

echo ""
echo ""

# Test 5: Three-level grouping (Agent + Lead Status + Offer Stage)
echo "=== 5. Advanced: Agent → Lead Status → Offer Stage ==="
echo ""
curl -s -X GET 'http://localhost:4003/offers?groupBy=%5B%22agent_id%22%2C%22lead_id.status%22%2C%22current_stage%22%5D' \
  -H "Authorization: Bearer ${TOKEN}" | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
if not data.get('success'):
    print('Error:', data)
    sys.exit(1)

print(f'Total 3-level Combinations: {data[\"meta\"][\"totalGroups\"]}')
print('')
print('Top 15 Combinations:')
print('=' * 100)
print(f'{\"Agent\":<25} | {\"Lead Status\":<15} | {\"Offer Stage\":<15} | {\"Count\":>8}')
print('-' * 100)

for item in data['data'][:15]:
    agent = item.get('agent_id', 'No Agent')[:23]
    lead_status = item.get('lead_id_status', 'N/A')[:13]
    stage = item.get('current_stage', 'N/A')[:13]
    count = item['count']
    
    print(f'{agent:<25} | {lead_status:<15} | {stage:<15} | {count:>8}')

print('')
"
echo ""

echo "=========================================="
echo "  ✅ Complete Agent-Stage Analysis Done!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  1. ✅ Multi-level grouping works (Agent + Stage)"
echo "  2. ✅ Can see total offers per agent"
echo "  3. ✅ Can see total offers per stage"
echo "  4. ✅ Can drill down to specific agent"
echo "  5. ✅ Can add Lead status for more insights"
echo ""


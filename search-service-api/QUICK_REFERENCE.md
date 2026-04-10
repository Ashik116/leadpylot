# 🚀 Quick Reference - Universal Filtering & Metadata API

## 📍 Endpoints

### Metadata API (Field Discovery)
```
🔍 Get All Models:     GET http://localhost:3010/api/metadata/models
📊 Get Filter Options: GET http://localhost:3010/api/metadata/options/:model
📝 Get All Fields:     GET http://localhost:3010/api/metadata/fields/:model
```

### Universal Query (Any Endpoint)
```
🔎 Filter:     GET /endpoint?domain=[["field","operator","value"]]
📊 Group:      GET /endpoint?groupBy=["field"]
🎯 Combined:   GET /endpoint?domain=[...]&groupBy=[...]
```

---

## 🎯 Common Use Cases

### 1️⃣ Discover Available Filters
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3010/api/metadata/options/Lead
```

**Returns:** All filterable fields with types and operators

---

### 2️⃣ Group Leads by Status
```bash
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:4003/leads?groupBy=["status_id"]'
```

**Returns:** 
```json
{
  "grouped": true,
  "data": [
    { "status_id": "xxx", "count": 869 },
    { "status_id": "yyy", "count": 1144 }
  ]
}
```

---

### 3️⃣ Filter Leads (Get Full Records)
```bash
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:4003/leads?domain=[["status","=","New"]]&limit=10'
```

**Returns:** Full lead records with nested data

---

### 4️⃣ Drill-Down Pattern

**Step 1: Group to see counts**
```bash
GET /leads?groupBy=["status_id"]
→ "New: 869 leads"
```

**Step 2: Get those specific records**
```bash
GET /leads?domain=[["status_id","=","686e6df2781309ae8c3b30f9"]]
→ All 869 "New" leads with full data
```

---

### 5️⃣ Complex Multi-Field Filter
```bash
# URL encoded
GET /leads?domain=%5B%5B%22status%22%2C%22%3D%22%2C%22New%22%5D%2C%5B%22expected_revenue%22%2C%22%3E%22%2C1000%5D%5D

# Decoded (human-readable)
GET /leads?domain=[
  ["status","=","New"],
  ["expected_revenue",">",1000]
]
```

---

### 6️⃣ Search by Contact Name
```bash
GET /leads?domain=[["contact_name","ilike","john"]]
```

`ilike` = case-insensitive partial match

---

### 7️⃣ Filter by Date Range
```bash
GET /leads?domain=[
  ["lead_date",">=","2024-01-01"],
  ["lead_date","<=","2024-12-31"]
]
```

---

### 8️⃣ Filter by Reference (Related Data)
```bash
# Auto-join: Filter by user's login name
GET /leads?domain=[["user_id.login","ilike","admin"]]
```

---

### 9️⃣ Group by Multiple Fields
```bash
GET /leads?groupBy=["status_id","team_id"]
```

---

### 🔟 Filter + Group Combined
```bash
GET /leads?domain=[["active","=",true]]&groupBy=["status_id"]
```

Only groups active leads by status

---

## 🎨 Operators Cheat Sheet

| Operator | Description | Example |
|----------|-------------|---------|
| `=` | Equals | `["status","=","New"]` |
| `!=` | Not equals | `["status","!=","Lost"]` |
| `>` | Greater than | `["revenue",">",1000]` |
| `>=` | Greater or equal | `["revenue",">=",1000]` |
| `<` | Less than | `["revenue","<",5000]` |
| `<=` | Less or equal | `["revenue","<=",5000]` |
| `ilike` | Contains (case-insensitive) | `["name","ilike","john"]` |
| `like` | Contains (case-sensitive) | `["name","like","John"]` |
| `in` | In list | `["status","in",["New","Call"]]` |
| `not in` | Not in list | `["status","not in",["Lost"]]` |

---

## 📋 Field Types & Available Operators

| Type | Operators |
|------|-----------|
| **string** | `=`, `!=`, `ilike`, `like`, `in`, `not in` |
| **number** | `=`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `not in` |
| **date** | `=`, `!=`, `>`, `>=`, `<`, `<=`, `between` |
| **boolean** | `=`, `!=` |
| **reference** | `=`, `!=`, `in`, `not in` |

---

## 🧪 Testing Commands

### Set Your Token
```bash
export TOKEN="your_jwt_token_here"
```

### Test Metadata API
```bash
# Get all models
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3010/api/metadata/models | python3 -m json.tool

# Get Lead options
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3010/api/metadata/options/Lead | python3 -m json.tool
```

### Test Universal Query
```bash
# Group by status
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:4003/leads?groupBy=["status_id"]' | python3 -m json.tool

# Filter by status
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:4003/leads?domain=[["status","=","New"]]&limit=5' \
  | python3 -m json.tool
```

### Run Complete Test Suite
```bash
cd /Volumes/SSD\ Sakib/Office\ -25/leadpylot/backend/microservices/search-service
./test-metadata.sh
```

---

## 🌐 URL Encoding Helper

When using `curl` or browsers, encode special characters:

| Character | Encoded |
|-----------|---------|
| `[` | `%5B` |
| `]` | `%5D` |
| `"` | `%22` |
| `,` | `%2C` |
| `=` | `%3D` |
| `:` | `%3A` |

**Example:**
```
Original: [["status","=","New"]]
Encoded:  %5B%5B%22status%22%2C%22%3D%22%2C%22New%22%5D%5D
```

**Or use quotes in curl:**
```bash
curl 'http://localhost:4003/leads?domain=[["status","=","New"]]'
```

---

## 📦 Models Available

| Model | Filter Fields | Group Fields |
|-------|---------------|--------------|
| Lead | 51 | 37 |
| Offer | 75 | 47 |
| User | TBD | TBD |
| Team | TBD | TBD |
| Opening | TBD | TBD |

---

## 🎯 Frontend Quick Start

### React Hook
```typescript
const useMetadata = (model: string) => {
  const [options, setOptions] = useState(null);
  
  useEffect(() => {
    fetch(`http://localhost:3010/api/metadata/options/${model}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setOptions(data));
  }, [model]);
  
  return options;
};

// Usage
const leadOptions = useMetadata('Lead');
```

### Build Filter URL
```typescript
const buildFilterUrl = (endpoint: string, domain: any[], groupBy?: string[]) => {
  const params = new URLSearchParams();
  if (domain.length > 0) params.append('domain', JSON.stringify(domain));
  if (groupBy) params.append('groupBy', JSON.stringify(groupBy));
  return `${endpoint}?${params}`;
};

// Usage
const url = buildFilterUrl('/leads', 
  [['status', '=', 'New']], 
  ['status_id']
);
```

---

## 🚨 Common Issues

### Issue: 401 Unauthorized
**Solution:** Add Authorization header
```bash
-H "Authorization: Bearer YOUR_TOKEN"
```

### Issue: Empty Results
**Solution:** Check if you're grouping by the right field
```bash
# Group by ObjectId reference (OLD endpoint compatible)
?groupBy=["status_id"]

# NOT the string field
?groupBy=["status"]  # This gives different results
```

### Issue: URL Encoding Errors
**Solution:** Wrap URL in quotes
```bash
curl 'http://localhost:4003/leads?domain=[["status","=","New"]]'
```

---

## 📚 Documentation Links

- **Full Metadata API Docs**: `/backend/microservices/search-service/METADATA_API.md`
- **Universal Query Docs**: `/backend/microservices/search-service/UNIVERSAL_QUERY_MIDDLEWARE.md`
- **Architecture Overview**: `/backend/microservices/search-service/ARCHITECTURE.md`
- **Complete Summary**: `/UNIVERSAL_FILTERING_COMPLETE.md`

---

## ⚡ Pro Tips

1. **Always test metadata first**: Know what fields are available before filtering
2. **Use `ilike` for search**: Case-insensitive partial matching
3. **Group by ObjectId fields**: Match your old endpoint behavior (e.g., `status_id` not `status`)
4. **Combine filters**: Multiple conditions = AND logic
5. **URL encode or quote**: Avoid curl parsing issues
6. **Check field types**: Use correct operators for each type
7. **Drill-down pattern**: Group first, then filter by group value

---

**Happy Filtering! 🎉**


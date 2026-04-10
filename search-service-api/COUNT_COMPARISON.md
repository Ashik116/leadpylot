# Count Comparison: OLD vs NEW Endpoints

## 🔍 Investigation Results

### Your Screenshot (OLD multilevel endpoint)
```
URL: /leads/group/multilevel/status?filters=[]&page=1&limit=50&sortBy=count&sortOrder=desc

Results:
- New: 864
- Angebot: 1118
- Privat: 33
- Termin: 29
- Total Leads: 6060
```

### NEW Universal Query Endpoint
```
URL: /leads?groupBy=["status"]

Results:
- New: 418
- Angebot: 1144
- NE1: 2523
- Out: 4850
```

---

## ❌ Counts DON'T Match - Here's Why

### Reason 1: Different Fields Being Grouped

**OLD Endpoint:**
- Groups by `status_id` (ObjectId reference)
- Looks up the Status model
- Returns `groupName: "New"` from Status collection

**NEW Endpoint:**
- Groups by `status` (raw string field on Lead model)
- Uses the literal string value
- Returns `status: "New"` or `status: "NE1"` etc.

**Lead Model has BOTH fields:**
```javascript
{
  status: "New",           // ← String field (what universal query uses)
  status_id: ObjectId(...) // ← Reference field (what multilevel uses)
}
```

---

### Reason 2: Possible Default Filters

The OLD multilevel endpoint likely applies default filters like:
- `active: true`
- `use_status: { $ne: 'pending' }`

The NEW universal query doesn't apply these by default.

---

## ✅ Solution: Make Them Match

### Option 1: Group by `status_id` in Universal Query

```bash
# This should match OLD endpoint
GET /leads?groupBy=["status_id"]
```

### Option 2: Add Default Filters to Universal Query

Modify middleware to apply the same defaults as multilevel:

```javascript
// In universalQuery.js
if (modelName === 'Lead' && parsedDomain.length === 0) {
  // Apply same defaults as multilevel endpoint
  parsedDomain = [
    ['active', '=', true],
    ['use_status', '!=', 'pending']
  ];
}
```

### Option 3: Test with includeAll

```bash
# Get ALL leads (active + inactive)
GET /leads/group/multilevel/status?filters=[{"field":"includeAll","value":true}]
```

---

## 🧪 Let Me Test to Confirm

### Test 1: Group by status_id (should match OLD endpoint)


# Search Service - Tester Quick Reference

## 🚀 Quick Start

### Prerequisites
```bash
# Install dependencies
cd backend/microservices/search-service
npm install

# Install test dependencies
npm install --save-dev jest supertest mongodb-memory-server
```

### Run Tests
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/unit/queryEngine.test.js
```

---

## 📋 Common Test Scenarios

### 1. Basic Search

**Test**: Simple filtering by status
```javascript
POST /api/search
{
  "model": "Lead",
  "domain": [["status", "=", "New"]],
  "limit": 10
}
```

**Expected**:
- Status code: 200
- `success: true`
- All returned leads have `status: "New"`
- `meta.total` matches count

---

### 2. Text Search (ilike)

**Test**: Case-insensitive search
```javascript
POST /api/search
{
  "model": "Lead",
  "domain": [["contact_name", "ilike", "john"]],
  "limit": 10
}
```

**Expected**:
- Matches "John", "JOHN", "john", "Johnny"
- Case-insensitive matching

---

### 3. Numeric Comparison

**Test**: Filter by revenue
```javascript
POST /api/search
{
  "model": "Lead",
  "domain": [["expected_revenue", ">", 10000]],
  "limit": 10
}
```

**Expected**:
- All results have `expected_revenue > 10000`
- Works with `>`, `>=`, `<`, `<=`

---

### 4. Date Filtering

**Test**: Filter by date range
```javascript
POST /api/search
{
  "model": "Lead",
  "domain": [
    ["createdAt", ">=", "2024-01-01"],
    ["createdAt", "<=", "2024-12-31"]
  ],
  "limit": 10
}
```

**Special Date Values**:
- `"today"` - Current date
- `"yesterday"` - Previous date
- `"2024-01-01"` - Specific date

---

### 5. Grouping (Single Level)

**Test**: Group by status
```javascript
POST /api/search
{
  "model": "Lead",
  "groupBy": ["status"]
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "groupId": "...",
      "groupName": "New",
      "fieldName": "status",
      "count": 50
    },
    {
      "groupId": "...",
      "groupName": "Qualified",
      "fieldName": "status",
      "count": 30
    }
  ],
  "meta": {
    "total": 2
  }
}
```

---

### 6. Multi-Level Grouping

**Test**: Group by status and user
```javascript
POST /api/search
{
  "model": "Lead",
  "groupBy": ["status", "user_id"]
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "groupId": "...",
      "groupName": "New",
      "fieldName": "status",
      "count": 50,
      "subGroups": [
        {
          "groupId": "...",
          "groupName": "John Doe",
          "fieldName": "user_id",
          "count": 25
        }
      ]
    }
  ]
}
```

---

### 7. Auto-Join Filtering

**Test**: Filter by related field
```javascript
POST /api/search
{
  "model": "Lead",
  "domain": [["user_id.login", "ilike", "admin"]],
  "limit": 10
}
```

**Expected**:
- Automatically joins `users` collection
- Filters by `user.login` field
- Returns leads with matching users

**Common Related Fields**:
- `user_id.login` - User login
- `user_id.name` - User name
- `team_id.name` - Team name
- `source_id.name` - Source name

---

### 8. Array Field Filtering

**Test**: Filter by array field
```javascript
POST /api/search
{
  "model": "Lead",
  "domain": [["files._id", "in", ["id1", "id2"]]],
  "limit": 10
}
```

**Expected**:
- Matches leads with files containing specified IDs
- Works with `in` and `not in` operators

---

### 9. Access Control (Agent Role)

**Test**: Agent sees only own data
```javascript
// Use Agent token
POST /api/search
{
  "model": "Lead",
  "domain": []
}
```

**Expected**:
- Automatically adds `user_id = agent_id` filter
- Returns only leads assigned to the agent
- For Offers, uses `agent_id` field

---

### 10. Universal Query Middleware

**Test**: Filter via query params
```bash
GET /leads?domain=[["status","=","New"]]&limit=10
```

**Test**: Group via query params
```bash
GET /leads?groupBy=["status"]
```

**Test**: Group with expansion
```bash
GET /leads?groupBy=["status"]&expand=true
```

---

## 🧪 Test Data Setup

### Create Test Leads
```javascript
const Lead = queryEngine.getModel('Lead');
await Lead.insertMany([
  {
    contact_name: 'John Doe',
    email_from: 'john@example.com',
    status: 'New',
    expected_revenue: 10000,
    user_id: userId,
    createdAt: new Date()
  },
  // ... more leads
]);
```

### Create Test Users
```javascript
const User = queryEngine.getModel('User');
await User.insertMany([
  {
    login: 'admin',
    role: 'Admin',
    first_name: 'Admin',
    last_name: 'User'
  },
  {
    login: 'agent1',
    role: 'Agent',
    first_name: 'Agent',
    last_name: 'One'
  }
]);
```

---

## ✅ Test Assertions Checklist

### For Search Results
- [ ] Status code is 200
- [ ] `success: true`
- [ ] `data` is an array
- [ ] All results match domain filters
- [ ] `meta.total` is correct
- [ ] `meta.limit` matches request
- [ ] `meta.offset` matches request
- [ ] Results are sorted correctly

### For Grouping Results
- [ ] Status code is 200
- [ ] `success: true`
- [ ] `grouped: true`
- [ ] Each group has `groupId`, `groupName`, `fieldName`, `count`
- [ ] Counts are accurate
- [ ] Group names are resolved (for reference fields)
- [ ] Multi-level groups have `subGroups` array

### For Access Control
- [ ] Agent role filters data correctly
- [ ] Admin role sees all data
- [ ] Invalid tokens return 401
- [ ] Missing auth returns 401

### For Error Cases
- [ ] Invalid model returns error
- [ ] Invalid domain syntax returns error
- [ ] Missing required fields returns 400
- [ ] Database errors are handled gracefully

---

## 🐛 Common Issues & Solutions

### Issue: "Model not found"
**Solution**: Check model loader paths, ensure models are registered

### Issue: "Authentication required"
**Solution**: Provide valid JWT token in Authorization header

### Issue: Empty results when data exists
**Solution**: 
- Check domain syntax (must be valid JSON array)
- Verify field names match schema
- Check value types (ObjectId, Date, etc.)

### Issue: Slow queries
**Solution**:
- Add indexes on filtered fields
- Limit result size
- Use pagination

### Issue: Group names show "Unknown"
**Solution**:
- Check if reference IDs exist
- Verify Settings model is loaded (for status_id/stage_id)
- Check lookup collection names

---

## 📊 Performance Benchmarks

### Expected Performance
- Simple search (< 100ms for 1k records)
- Grouping (< 500ms for 1k records)
- Auto-join filtering (< 1s for 1k records)
- Multi-level grouping (< 2s for 1k records)

### Test Performance
```javascript
const startTime = Date.now();
const response = await request(app)
  .post('/api/search')
  .set(getAuthHeader())
  .send({ /* ... */ });
const duration = Date.now() - startTime;

expect(duration).toBeLessThan(2000); // < 2 seconds
```

---

## 🔍 Debugging Tips

### Enable Logging
```javascript
// In queryEngine.js
logger.info('Search query', { domain, groupBy, modelName });
logger.debug('Pipeline stages', pipeline);
```

### Inspect MongoDB Queries
```javascript
// Enable mongoose debug mode
mongoose.set('debug', true);
```

### Test Pipeline Manually
```javascript
const Model = queryEngine.getModel('Lead');
const pipeline = [/* ... */];
const result = await Model.aggregate(pipeline);
console.log(JSON.stringify(result, null, 2));
```

---

## 📝 Test Report Template

```markdown
# Test Report - Search Service

## Test Date: YYYY-MM-DD
## Tester: [Name]

### Test Summary
- Total Tests: X
- Passed: Y
- Failed: Z
- Coverage: XX%

### Test Results
| Test Case | Status | Notes |
|-----------|--------|-------|
| Basic Search | ✅ Pass | - |
| Grouping | ✅ Pass | - |
| Auto-Join | ❌ Fail | Issue with user_id lookup |

### Issues Found
1. [Issue description]
2. [Issue description]

### Recommendations
1. [Recommendation]
2. [Recommendation]
```

---

## 🎯 Priority Test Cases

### High Priority (Must Test)
1. ✅ Basic search with all operators
2. ✅ Single-level grouping
3. ✅ Access control (Agent role)
4. ✅ Auto-join filtering
5. ✅ Error handling

### Medium Priority (Should Test)
1. Multi-level grouping
2. Date filtering
3. Array field filtering
4. Universal query middleware
5. Performance with large datasets

### Low Priority (Nice to Have)
1. Edge cases (null values, invalid IDs)
2. Complex domain combinations
3. Metadata endpoints
4. Expand mode functionality

---

**Last Updated**: 2024-12-XX


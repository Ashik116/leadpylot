# Search Service - Tester Approach Summary

## 📌 Overview

This document provides a high-level summary of how to approach testing the search-service. For detailed information, refer to the other documentation files.

---

## 🎯 What is the Search Service?

The search-service is a **microservice** that provides:
- **Universal filtering** across all models (Lead, Offer, Opening, etc.)
- **Grouping/aggregation** capabilities
- **Auto-join** functionality for related fields
- **Role-based access control** (Agent filtering)

**Key Technology**: MongoDB aggregation pipelines

---

## 🏗️ Architecture at a Glance

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│   Universal Query Middleware    │  ← Intercepts domain/groupBy params
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│      Search Controller          │  ← Handles /api/search endpoint
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│       Query Engine              │  ← Core logic: domain → pipeline
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│      MongoDB Database           │  ← Executes aggregation
└─────────────────────────────────┘
```

---

## 📚 Documentation Files

1. **`TESTER_ROLE_POSTMORTEM.md`** - Comprehensive postmortem
   - Architecture details
   - Component breakdown
   - Testing strategy
   - Implementation plan

2. **`TESTER_QUICK_REFERENCE.md`** - Quick reference guide
   - Common test scenarios
   - Code examples
   - Debugging tips
   - Performance benchmarks

3. **`tests/test-template.js`** - Test template
   - Ready-to-use test structure
   - Helper functions
   - Example test cases

4. **Existing Documentation**:
   - `ARCHITECTURE.md` - System architecture
   - `QUICK_START.md` - Getting started guide
   - `TESTING_GUIDE.md` - Testing instructions
   - `METADATA_API.md` - API reference

---

## 🚀 Getting Started (5 Steps)

### Step 1: Understand the Basics (Day 1)
- Read `ARCHITECTURE.md` to understand the system
- Read `QUICK_START.md` to see how it works
- Run the existing test script: `node test-search.js`

### Step 2: Set Up Testing Environment (Day 1-2)
```bash
# Install dependencies
npm install
npm install --save-dev jest supertest mongodb-memory-server

# Create test directory
mkdir -p tests/unit tests/integration tests/e2e

# Copy test template
cp tests/test-template.js tests/unit/queryEngine.test.js
```

### Step 3: Write Unit Tests (Day 2-3)
Start with core logic:
- `QueryEngine._parseDomain()` - Domain parsing
- `QueryEngine._castValue()` - Value casting
- `QueryEngine._buildGroupStage()` - Grouping

### Step 4: Write Integration Tests (Day 3-4)
Test API endpoints:
- `POST /api/search` - Basic search
- `POST /api/search` - Grouping
- `POST /api/search` - Auto-join filtering
- Access control (Agent role)

### Step 5: Write E2E Tests (Day 4-5)
Test real-world scenarios:
- Dashboard flow (group → drill down)
- Complex filtering
- Performance benchmarks

---

## 🎯 Testing Priorities

### Must Test (Critical)
1. ✅ **Domain Parsing** - All operators work correctly
2. ✅ **Grouping** - Single and multi-level
3. ✅ **Access Control** - Agent filtering
4. ✅ **Auto-Joins** - Related field filtering
5. ✅ **Error Handling** - Invalid inputs

### Should Test (Important)
1. Date filtering (including special values)
2. Array field filtering
3. Universal query middleware
4. Performance with realistic data
5. Edge cases (null values, missing relationships)

### Nice to Have (Optional)
1. Complex domain combinations
2. Metadata endpoints
3. Expand mode functionality
4. Stress testing

---

## 🧪 Test Approach

### 1. Unit Testing (Isolated)
**Focus**: Test individual functions in isolation
**Tools**: Jest
**Files**: `tests/unit/*.test.js`

**Example**:
```javascript
test('should parse domain with equality operator', () => {
  const domain = [['status', '=', 'New']];
  const result = queryEngine._parseDomain(domain, schema, new Map());
  expect(result.$and[0].status).toBe('New');
});
```

### 2. Integration Testing (Components)
**Focus**: Test API endpoints with database
**Tools**: Jest + Supertest + MongoDB Memory Server
**Files**: `tests/integration/*.test.js`

**Example**:
```javascript
test('should return filtered leads', async () => {
  await Lead.insertMany([testLead1, testLead2]);
  const response = await request(app)
    .post('/api/search')
    .send({ model: 'Lead', domain: [['status', '=', 'New']] });
  expect(response.body.data.length).toBe(1);
});
```

### 3. End-to-End Testing (Full Flow)
**Focus**: Test complete user workflows
**Tools**: Jest + Supertest
**Files**: `tests/e2e/*.test.js`

**Example**:
```javascript
test('dashboard flow: group then drill down', async () => {
  // Step 1: Group by status
  const groups = await request(app)
    .post('/api/search')
    .send({ model: 'Lead', groupBy: ['status'] });
  
  // Step 2: Drill down into a group
  const leads = await request(app)
    .post('/api/search')
    .send({ 
      model: 'Lead', 
      domain: [['status', '=', groups.body.data[0].groupName]] 
    });
  
  expect(leads.body.data.length).toBe(groups.body.data[0].count);
});
```

---

## 📊 Test Coverage Goals

### Minimum Coverage
- **Unit Tests**: 70% of core logic (QueryEngine)
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user flows

### Ideal Coverage
- **Unit Tests**: 90%+ of all functions
- **Integration Tests**: All endpoints + edge cases
- **E2E Tests**: All major workflows

---

## 🐛 Known Issues to Watch For

1. **OR Logic Not Implemented**
   - Currently only supports implicit AND
   - OR operator (`|`) is planned but incomplete

2. **includeIds Commented Out**
   - Drill-down feature incomplete
   - Group results don't include record IDs

3. **Expand Mode Empty**
   - `expand=true` returns empty records array
   - Needs implementation

4. **Model Loading Fragility**
   - Hardcoded paths may break in different environments
   - Test with different path configurations

---

## 💡 Pro Tips

1. **Start Small**: Begin with simple test cases, then add complexity
2. **Use Test Fixtures**: Create reusable test data helpers
3. **Test Edge Cases**: Null values, missing relationships, invalid inputs
4. **Performance Matters**: Test with realistic data volumes
5. **Document Findings**: Keep track of bugs and performance issues
6. **Automate**: Use CI/CD for regression testing

---

## 📞 Getting Help

### If You're Stuck

1. **Check Documentation**:
   - `ARCHITECTURE.md` - Understand the system
   - `TESTING_GUIDE.md` - See existing test examples
   - `QUICK_REFERENCE.md` - Common scenarios

2. **Review Existing Code**:
   - `test-search.js` - Manual test script
   - `src/services/queryEngine.js` - Core logic
   - `src/controllers/searchController.js` - API handler

3. **Debug**:
   - Enable logging: `logger.info('...')`
   - Use MongoDB debug mode: `mongoose.set('debug', true)`
   - Test pipeline manually in MongoDB shell

---

## ✅ Success Criteria

You've successfully tested the search-service when:

1. ✅ All critical test cases pass
2. ✅ Test coverage meets minimum goals
3. ✅ Performance benchmarks are met
4. ✅ All known issues are documented
5. ✅ Test reports are generated
6. ✅ Documentation is updated

---

## 🎓 Learning Path

### Week 1: Foundation
- [ ] Read all documentation
- [ ] Understand architecture
- [ ] Run existing tests
- [ ] Set up test environment

### Week 2: Unit Tests
- [ ] Write QueryEngine tests
- [ ] Write Controller tests
- [ ] Write Middleware tests
- [ ] Achieve 70%+ coverage

### Week 3: Integration Tests
- [ ] Test all API endpoints
- [ ] Test access control
- [ ] Test error handling
- [ ] Test edge cases

### Week 4: E2E Tests
- [ ] Test user workflows
- [ ] Test performance
- [ ] Document findings
- [ ] Generate reports

### Week 5: Polish
- [ ] Review test coverage
- [ ] Fix any gaps
- [ ] Update documentation
- [ ] Create test reports

---

## 📝 Next Steps

1. **Read** `TESTER_ROLE_POSTMORTEM.md` for detailed information
2. **Review** `TESTER_QUICK_REFERENCE.md` for common scenarios
3. **Copy** `tests/test-template.js` to start writing tests
4. **Run** existing test script: `node test-search.js`
5. **Start** with unit tests for QueryEngine

---

**Good luck with testing! 🚀**

For questions or issues, refer to the main project documentation or contact the development team.


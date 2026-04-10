# Search Service - Postmortem & Tester Role Guide

## 📋 Executive Summary

The **Search Service** is a dedicated microservice that provides universal filtering, searching, and grouping capabilities across all models in the LeadPylot application. It uses MongoDB aggregation pipelines to execute high-performance queries with automatic relationship resolution.

---

## 🏗️ Architecture Overview

### Core Components

1. **QueryEngine** (`src/services/queryEngine.js`)
   - **Purpose**: Translates Odoo-style domain filters into MongoDB aggregation pipelines
   - **Key Features**:
     - Domain parsing (`_parseDomain`)
     - Auto-join via `$lookup` stages (`_addLookup`)
     - Value casting (`_castValue`) - ObjectId, Date, etc.
     - Grouping with multilevel support (`_buildGroupStage`)
     - Date field handling with `$dateToString`
     - Reference field name resolution (status_id, stage_id, user_id, etc.)

2. **SearchController** (`src/controllers/searchController.js`)
   - **Purpose**: HTTP request handler for `/api/search`
   - **Key Features**:
     - Role-based access control (Agent filtering)
     - Request validation
     - Error handling

3. **UniversalQuery Middleware** (`src/middleware/universalQuery.js`)
   - **Purpose**: Intercepts requests with `domain`/`groupBy` query params on ANY endpoint
   - **Key Features**:
     - Route-to-model detection
     - Three modes: Filtering, Grouping, Grouping+Expansion
     - Integration with lead-offers-service for nested data

4. **Model Loader** (`src/models/loader.js`)
   - **Purpose**: Dynamically loads Mongoose models at startup
   - **Supported Models**: Lead, Offer, User, Team, Opening, Settings, Source

5. **Metadata Controller** (`src/controllers/metadataController.js`)
   - **Purpose**: Provides field metadata for dynamic UI generation
   - **Endpoints**:
     - `GET /api/metadata/fields/:model` - Field metadata
     - `GET /api/metadata/options/:model` - Filter/group options
     - `GET /api/metadata/models` - Available models

---

## 🔑 Key Concepts

### 1. Domain System (Odoo-Style)

**Format**: `[['field', 'operator', 'value'], ...]`

**Example**:
```json
[
  ["status", "=", "New"],
  ["user_id.name", "ilike", "John"],
  ["expected_revenue", ">", 1000]
]
```

**Supported Operators**:
- `=`, `!=` - Equality
- `>`, `>=`, `<`, `<=` - Comparison
- `in`, `not in` - Membership
- `ilike`, `like` - Pattern matching (case-insensitive / case-sensitive)
- `between` - Range (for dates/numbers)

**Complex Logic** (MVP - Limited):
- Currently supports implicit AND between conditions
- OR logic (`|`) is planned but not fully implemented
- NOT logic (`!`) is planned but not implemented

### 2. Group By

**Single Level**:
```json
{ "groupBy": ["status"] }
```

**Multi-Level**:
```json
{ "groupBy": ["status", "user_id"] }
```

**Result Structure**:
- Single: `{ groupId, groupName, fieldName, count, subGroups? }`
- Multi: Nested structure with `subGroups` arrays

### 3. Auto-Joins

The service automatically detects related fields (e.g., `user_id.name`) and:
1. Adds `$lookup` stage to join the related collection
2. Unwinds the result
3. Applies filters on the joined data

**Example**: Filtering by `user_id.login` automatically joins the `users` collection.

### 4. Access Control

- **Agents**: Automatically filtered to see only their own data
  - Lead/Opening: Filtered by `user_id`
  - Offer: Filtered by `agent_id`
- **Other Roles**: No automatic filtering (can see all data)

---

## 🧪 Testing Strategy

### Phase 1: Unit Testing

#### 1.1 QueryEngine Core Logic

**Test File**: `tests/unit/queryEngine.test.js`

**Test Cases**:
- ✅ Domain parsing with various operators
- ✅ Value casting (ObjectId, Date, string)
- ✅ Auto-lookup generation
- ✅ Group stage building (single & multilevel)
- ✅ Date field formatting
- ✅ Reference field name resolution
- ✅ Null/undefined handling

**Example**:
```javascript
describe('QueryEngine - Domain Parsing', () => {
  it('should parse simple equality filter', () => {
    const domain = [['status', '=', 'New']];
    const matchStage = queryEngine._parseDomain(domain, schema, new Map());
    expect(matchStage).toEqual({ $and: [{ status: 'New' }] });
  });
  
  it('should cast ObjectId values', () => {
    const domain = [['user_id', '=', '507f1f77bcf86cd799439011']];
    const matchStage = queryEngine._parseDomain(domain, schema, new Map());
    expect(matchStage.$and[0].user_id).toBeInstanceOf(mongoose.Types.ObjectId);
  });
});
```

#### 1.2 Controller Logic

**Test File**: `tests/unit/searchController.test.js`

**Test Cases**:
- ✅ Agent role filtering
- ✅ Request validation
- ✅ Error handling
- ✅ Response formatting

#### 1.3 Middleware Logic

**Test File**: `tests/unit/universalQuery.test.js`

**Test Cases**:
- ✅ Route-to-model detection
- ✅ Parameter parsing
- ✅ Three operation modes
- ✅ Fallback to original endpoint

---

### Phase 2: Integration Testing

#### 2.1 API Endpoints

**Test File**: `tests/integration/api.test.js`

**Test Scenarios**:

1. **Basic Search**
   ```javascript
   POST /api/search
   {
     "model": "Lead",
     "domain": [["status", "=", "New"]],
     "limit": 10
   }
   ```

2. **Grouping**
   ```javascript
   POST /api/search
   {
     "model": "Lead",
     "groupBy": ["status"]
   }
   ```

3. **Multi-Level Grouping**
   ```javascript
   POST /api/search
   {
     "model": "Lead",
     "groupBy": ["status", "user_id"]
   }
   ```

4. **Auto-Join Filtering**
   ```javascript
   POST /api/search
   {
     "model": "Lead",
     "domain": [["user_id.login", "ilike", "admin"]]
   }
   ```

5. **Date Filtering**
   ```javascript
   POST /api/search
   {
     "model": "Lead",
     "domain": [["createdAt", ">=", "2024-01-01"]]
   }
   ```

6. **Agent Access Control**
   ```javascript
   // Test with Agent role token
   POST /api/search
   {
     "model": "Lead",
     "domain": []
   }
   // Should automatically add user_id filter
   ```

#### 2.2 Universal Query Middleware

**Test File**: `tests/integration/universalQuery.test.js`

**Test Scenarios**:

1. **Filtering via Query Params**
   ```
   GET /leads?domain=[["status","=","New"]]
   ```

2. **Grouping via Query Params**
   ```
   GET /leads?groupBy=["status"]
   ```

3. **Grouping with Expansion**
   ```
   GET /leads?groupBy=["status"]&expand=true
   ```

4. **Multiple Endpoints**
   - `/leads`, `/offers`, `/openings`, `/appointments`, `/todos`

---

### Phase 3: End-to-End Testing

#### 3.1 Real-World Scenarios

**Test File**: `tests/e2e/scenarios.test.js`

**Scenarios**:

1. **Dashboard Card Flow**
   - Group leads by status
   - Click on a group
   - Drill down to see full records

2. **Complex Filtering**
   - Multiple conditions
   - Date ranges
   - User filtering
   - Status filtering

3. **Performance Testing**
   - Large datasets (10k+ records)
   - Complex queries with multiple lookups
   - Grouping on large collections

4. **Edge Cases**
   - Null values
   - Missing relationships
   - Invalid ObjectIds
   - Empty results

---

## 📝 Test Implementation Plan

### Step 1: Setup Testing Infrastructure

```bash
# Install testing dependencies
npm install --save-dev jest supertest mongodb-memory-server
```

**Create `jest.config.js`**:
```javascript
module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
```

### Step 2: Create Test Utilities

**File**: `tests/utils/testHelpers.js`

```javascript
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

async function setupTestDB() {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
}

async function teardownTestDB() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
}

function createTestUser(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    login: 'testuser',
    role: 'Admin',
    ...overrides
  };
}

module.exports = {
  setupTestDB,
  teardownTestDB,
  createTestUser
};
```

### Step 3: Write Unit Tests

**Priority Order**:
1. QueryEngine domain parsing
2. QueryEngine value casting
3. QueryEngine grouping
4. Controller access control
5. Middleware route detection

### Step 4: Write Integration Tests

**Priority Order**:
1. Basic search endpoint
2. Grouping endpoint
3. Auto-join filtering
4. Agent access control
5. Universal query middleware

### Step 5: Write E2E Tests

**Priority Order**:
1. Dashboard flow (group → drill down)
2. Complex filtering scenarios
3. Performance benchmarks
4. Error handling

---

## 🎯 Critical Test Cases

### Must-Have Tests

1. **Domain Parsing**
   - ✅ All operators (`=`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `not in`, `ilike`, `like`, `between`)
   - ✅ Nested field paths (`user_id.name`)
   - ✅ Array field handling (`files._id`)
   - ✅ Date field handling
   - ✅ ObjectId casting

2. **Grouping**
   - ✅ Single level grouping
   - ✅ Multi-level grouping
   - ✅ Date field grouping (YYYY-MM-DD format)
   - ✅ Reference field grouping (with name resolution)
   - ✅ Null value handling

3. **Access Control**
   - ✅ Agent sees only own data
   - ✅ Admin sees all data
   - ✅ Filter injection for Agents

4. **Auto-Joins**
   - ✅ User relationship (`user_id.login`)
   - ✅ Team relationship (`team_id.name`)
   - ✅ Source relationship (`source_id.name`)
   - ✅ Status/Stage resolution (Settings collection)

5. **Error Handling**
   - ✅ Invalid model name
   - ✅ Invalid domain syntax
   - ✅ Missing authentication
   - ✅ Database connection errors

---

## 🐛 Known Issues & Limitations

### Current Limitations

1. **OR Logic**: Not fully implemented (Polish Notation parser incomplete)
2. **NOT Logic**: Not implemented
3. **includeIds**: Commented out in grouping (drill-down feature incomplete)
4. **Expand Mode**: Records array is empty (needs implementation)
5. **Model Loading**: Hardcoded paths (fragile in different environments)

### Potential Issues

1. **Performance**: Multiple lookups can be slow on large datasets
2. **Memory**: Large grouping results may consume significant memory
3. **Schema Changes**: Model loader may break if schema paths change
4. **Date Parsing**: Special date strings (`today`, `yesterday`) may have timezone issues

---

## 📊 Testing Checklist

### Pre-Testing Setup
- [ ] MongoDB test database configured
- [ ] Test data fixtures created
- [ ] Authentication tokens generated
- [ ] Test environment variables set

### Unit Tests
- [ ] QueryEngine domain parsing
- [ ] QueryEngine value casting
- [ ] QueryEngine grouping
- [ ] Controller validation
- [ ] Middleware route detection

### Integration Tests
- [ ] Search endpoint (all operators)
- [ ] Grouping endpoint (single & multi)
- [ ] Auto-join filtering
- [ ] Access control
- [ ] Universal query middleware

### E2E Tests
- [ ] Dashboard flow
- [ ] Complex filtering
- [ ] Performance benchmarks
- [ ] Error scenarios

### Documentation
- [ ] Test coverage report
- [ ] Test execution guide
- [ ] Known issues documented
- [ ] Performance benchmarks

---

## 🚀 Quick Start for Testers

### 1. Run Existing Test Script

```bash
cd backend/microservices/search-service
TEST_TOKEN=your_jwt_token node test-search.js
```

### 2. Manual Testing with cURL

```bash
# Get auth token
TOKEN=$(curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"testuser","password":"password"}' \
  | jq -r '.token')

# Test basic search
curl -X POST http://localhost:3010/api/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Lead",
    "domain": [["status", "=", "New"]],
    "limit": 10
  }'

# Test grouping
curl -X POST http://localhost:3010/api/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Lead",
    "groupBy": ["status"]
  }'
```

### 3. Test Universal Query Middleware

```bash
# Filter via query params
curl "http://localhost:4003/leads?domain=[[\"status\",\"=\",\"New\"]]" \
  -H "Authorization: Bearer $TOKEN"

# Group via query params
curl "http://localhost:4003/leads?groupBy=[\"status\"]" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📚 Reference Documentation

- **Architecture**: `ARCHITECTURE.md`
- **Quick Start**: `QUICK_START.md`
- **Testing Guide**: `TESTING_GUIDE.md`
- **API Reference**: `METADATA_API.md`
- **Drill Down**: `DRILL_DOWN_SOLUTION.md`

---

## 💡 Recommendations for Testers

1. **Start with Unit Tests**: Test core logic in isolation first
2. **Use Test Fixtures**: Create reusable test data
3. **Test Edge Cases**: Null values, missing relationships, invalid inputs
4. **Performance Testing**: Test with realistic data volumes
5. **Document Findings**: Keep track of bugs and performance issues
6. **Automate Where Possible**: Use CI/CD for regression testing

---

## 🎓 Learning Path

1. **Week 1**: Understand architecture, read documentation
2. **Week 2**: Write unit tests for QueryEngine
3. **Week 3**: Write integration tests for API endpoints
4. **Week 4**: Write E2E tests and performance benchmarks
5. **Week 5**: Document findings and create test reports

---

**Last Updated**: 2024-12-XX
**Maintainer**: Search Service Team


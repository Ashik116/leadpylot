# Search Service Architecture & Implementation Plan

## Overview

The **Search Service** is a dedicated microservice that provides Odoo-like global filtering, searching, and grouping capabilities across all models in the LeadPylot application. It connects directly to the shared MongoDB database to execute high-performance aggregation queries.

---

## Architecture Decision

### Why a Separate Microservice?

1. **Isolation**: Search logic is complex and evolves independently from business logic.
2. **Scalability**: Can be scaled independently based on search load.
3. **Flexibility**: Other services can consume it without duplicating query logic.

### Performance Strategy

- **Direct DB Access**: Connects to the shared MongoDB (no inter-service calls).
- **Aggregation Pipelines**: Uses MongoDB's native aggregation framework for speed.
- **Auto-Joins**: Automatically resolves related fields (e.g., `user_id.name`) via `$lookup`.
- **Smart Casting**: Auto-converts values to `ObjectId`, `Date`, etc., based on schema.

---

## Core Concepts

### 1. Domain System (Odoo-Style)

A **domain** is an array of conditions that defines which records to retrieve.

**Format**: `[['field', 'operator', 'value'], ...]`

**Example**:
```json
[
  ["status", "=", "new"],
  ["user_id.name", "ilike", "John"],
  ["expected_revenue", ">", 1000]
]
```

**Supported Operators**:
- `=`, `!=`: Equality
- `>`, `>=`, `<`, `<=`: Comparison
- `in`, `not in`: Membership
- `ilike`, `like`: Pattern matching (case-insensitive / case-sensitive)

### 2. Group By

Group results by one or more fields.

**Example**:
```json
{
  "groupBy": ["stage_id", "user_id"]
}
```

**Result**: Returns aggregated counts per group.

---

## API Reference

### Endpoint: `POST /api/search`

**Request Body**:
```json
{
  "model": "Lead",
  "domain": [
    ["status", "=", "new"],
    ["user_id.name", "ilike", "John"]
  ],
  "groupBy": ["stage_id"],
  "limit": 50,
  "offset": 0,
  "orderBy": "createdAt desc"
}
```

**Response**:
```json
{
  "success": true,
  "data": [
    { "_id": "...", "contact_name": "John Doe", ... }
  ],
  "meta": {
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

---

## Implementation Details

### Components

#### 1. `QueryEngine` (`src/services/queryEngine.js`)
- **Purpose**: Core logic to translate domains into MongoDB aggregation pipelines.
- **Key Methods**:
  - `search({ modelName, domain, groupBy, limit, offset, orderBy })`: Main entry point.
  - `_parseDomain(domain, schema, lookups)`: Converts domain to `$match` stage.
  - `_addLookup(field, schema, lookups)`: Auto-generates `$lookup` stages for related fields.
  - `_castValue(value, field, schema)`: Auto-casts values based on schema type.

#### 2. `SearchController` (`src/controllers/searchController.js`)
- Handles HTTP requests and delegates to `QueryEngine`.

#### 3. `Model Loader` (`src/models/loader.js`)
- Registers Mongoose models with the `QueryEngine` on startup.
- Currently loads: `Lead`, `Offer`, `User`, `Team`.

#### 4. Database Config (`src/config/database.js`)
- Connects to the shared MongoDB using `MONGODB_URI` from `.env`.

---

## How Auto-Joins Work

### Example: Filter by `user_id.name`

1. **Input Domain**: `[["user_id.name", "ilike", "John"]]`
2. **QueryEngine Detects**: The field contains a `.`, indicating a related field.
3. **Lookup Added**:
   ```javascript
   {
     $lookup: {
       from: "users",
       localField: "user_id",
       foreignField: "_id",
       as: "user_id_joined"
     }
   }
   ```
4. **Unwind**: Converts array to object.
5. **Match**: Applies filter on `user_id_joined.name`.

**Result**: You can filter by any nested field without manual joins.

---

## Performance Optimizations

1. **Indexed Queries**: Uses indexed fields from schemas.
2. **Lean Aggregation**: No Mongoose overhead, returns plain JS objects.
3. **Minimal Lookups**: Only adds lookups if the field is used in the domain/groupBy.
4. **Connection Pooling**: Reuses MongoDB connections.

---

## Adding New Models

To make a new model searchable:

1. Add it to `src/models/loader.js`:
   ```javascript
   { name: 'YourModel', path: '../../../models/mongo/yourmodel.js' }
   ```
2. Restart the service.

That's it! The model is now searchable with full auto-join support.

---

## Frontend Integration Plan

### 1. Create `GlobalSearch` Component

**Location**: `frontend/src/components/shared/GlobalSearch/GlobalSearch.tsx`

**Features**:
- Smart search bar with field suggestions.
- Filter chips (facets).
- Group By dropdown.
- URL-synced state.

### 2. Create `useGlobalSearch` Hook

**Location**: `frontend/src/hooks/useGlobalSearch.ts`

**Responsibilities**:
- Manage search state.
- Call `POST /api/search`.
- Handle pagination.

### 3. Replace `DynamicFilters`

- Gradually migrate pages to use `GlobalSearch`.
- Remove old filter logic once migration is complete.

---

## Running the Service

### Local Development

1. **Install Dependencies**:
   ```bash
   cd backend/microservices/search-service
   npm install
   ```

2. **Set Environment**:
   Create `.env` in `search-service/`:
   ```env
   MONGODB_URI=mongodb://localhost:27017/leadpylot
   PORT=3010
   ```

3. **Start Service**:
   ```bash
   npm run dev
   ```

4. **Test with Postman**:
   ```
   POST http://localhost:3010/api/search
   Content-Type: application/json

   {
     "model": "Lead",
     "domain": [["status", "=", "new"]],
     "limit": 10
   }
   ```

---

## Roadmap

### Phase 1: Backend (Current)
- [x] Create `search-service` microservice.
- [x] Implement `QueryEngine` with auto-joins.
- [x] Support basic operators (`=`, `ilike`, `>`, etc.).
- [ ] Add support for complex logic (`|` for OR, `!` for NOT).
- [ ] Add field metadata endpoint (`/api/search/fields/{model}`).

### Phase 2: Frontend
- [ ] Build `GlobalSearch` component.
- [ ] Integrate with one page (e.g., Leads list).
- [ ] Add UI for Group By.
- [ ] Migrate all list views.

### Phase 3: Advanced Features
- [ ] Saved searches.
- [ ] Custom filters UI (drag-and-drop).
- [ ] Real-time updates (via WebSockets or polling).

---

## Benefits

1. **Consistent UX**: Every page uses the same search/filter interface.
2. **Fast**: Aggregation pipelines are native to MongoDB.
3. **Flexible**: Filter/group by any field, even if not displayed.
4. **Future-Proof**: Easy to add new models and fields.
5. **Precise**: No data inconsistencies (direct DB queries).

---

## FAQ

**Q: Does this replace REST APIs in other services?**  
A: No. This is for search/filter/grouping only. CRUD operations remain in domain-specific services (e.g., `lead-offers-service`).

**Q: Can I use complex OR logic?**  
A: Not yet (MVP supports AND only). Full Polish Notation support (like Odoo) is on the roadmap.

**Q: How do I secure this?**  
A: Add authentication middleware in `src/app.js` to validate JWTs from requests.

**Q: Can it handle millions of records?**  
A: Yes. MongoDB aggregation is highly optimized. Ensure proper indexes on filtered fields.

---

## Contact

For questions or contributions, refer to the main project documentation.

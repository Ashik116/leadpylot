# Search Service - Technical Documentation

## 📚 Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup & Installation](#setup--installation)
4. [Project Structure](#project-structure)
5. [Core Services](#core-services)
6. [API Endpoints](#api-endpoints)
7. [Microservice Integration](#microservice-integration)
8. [Search Flow](#search-flow)
9. [Adding New Features](#adding-new-features)
10. [Testing](#testing)
11. [Deployment](#deployment)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The Search Service is a dedicated **query microservice** for LeadPylot.  
It provides:

- Domain-based filtering (`domain` syntax)
- Grouping (`groupBy`)
- Metadata discovery (`models`, `fields`, `options`)
- Shared model querying via schema registry

Primary endpoint:
- `POST /api/search`

Metadata endpoints:
- `GET /api/metadata/models`
- `GET /api/metadata/fields/:model`
- `GET /api/metadata/options/:model`

### Key Technologies
- **Node.js** + **Express.js**
- **MongoDB** + **Mongoose Aggregation**
- **Schema Registry model loading**
- **RBAC middleware (auth + permissions)**
- **Docker**

---

## Architecture

### System Architecture
```
┌──────────────────────────────────────────────────────────────┐
│                         API Gateway                           │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│               Search Service (Port 3010)                     │
├──────────────────────────────────────────────────────────────┤
│  Routes → Controllers → QueryEngine                          │
│                         │                                     │
│                         ├─ Domain parser                      │
│                         ├─ Type casting                       │
│                         ├─ Lookup builder                     │
│                         └─ Group/aggregation builder          │
├──────────────────────────────────────────────────────────────┤
│ Data Layer: MongoDB + SchemaRegistry                          │
└──────────────────────────────────────────────────────────────┘
                       │
            ┌──────────┼──────────────────────────────────────┐
            ▼          ▼              ▼                       ▼
      Email Service  Lead Offer   User/Auth Service    Other services
      (universal      Service      (permissions)
       query calls)
```

### Request Flow
```
Request (/api/search or /api/metadata/*)
        ↓
Auth + Permission middleware
        ↓
Controller validation
        ↓
QueryEngine / Metadata resolver
        ↓
MongoDB aggregation/query
        ↓
Normalized response (data + meta)
```

---

## Setup & Installation

### Prerequisites
- Node.js >= 16.x
- MongoDB >= 4.4
- Docker & Docker Compose (optional)

### Local Development Setup
1. Install dependencies:
```bash
cd search-service-api
npm install
```

2. Configure environment:
```bash
cp .env.example .env
```

3. Minimum `.env`:
```env
PORT=3010
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/leadpylot
JWT_SECRET=your-secret
```

4. Start service:
```bash
npm run dev
```

5. Verify:
```bash
curl http://localhost:3010/health
curl http://localhost:3010/api/schema-status
```

---

## Project Structure

```
search-service-api/
├── src/
│   ├── app.js
│   ├── routes/
│   │   ├── searchRoutes.js
│   │   └── metadataRoutes.js
│   ├── controllers/
│   │   ├── searchController.js
│   │   └── metadataController.js
│   ├── services/
│   │   └── queryEngine.js
│   ├── models/
│   │   ├── loader.js
│   │   ├── SchemaRegistry.js
│   │   └── Role.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── authorize.js
│   │   ├── gatewayAuth.js
│   │   └── roles/
│   ├── config/
│   │   ├── database.js
│   │   └── redis.js
│   └── utils/logger.js
├── ARCHITECTURE.md
├── METADATA_API.md
└── ...
```

---

## Core Services

### 1. QueryEngine
**Location:** `src/services/queryEngine.js`

Responsibilities:
- Parse domain arrays into Mongo match conditions
- Build lookup pipelines for related fields
- Cast values by field type (`ObjectId`, `Date`, etc.)
- Handle grouping and date granularity (`day`, `week`, `month`, `year`)

### 2. Model Loader
**Location:** `src/models/loader.js`

Responsibilities:
- Load active schemas from `SchemaRegistry`
- Resolve duplicate models by priority
- Register schemas to query engine
- Fallback to local models when registry is empty

### 3. Metadata Controller
**Location:** `src/controllers/metadataController.js`

Responsibilities:
- Discover searchable models
- Return filterable/groupable fields
- Return operators and reference options for dynamic frontend filters

### 4. Search Controller
**Location:** `src/controllers/searchController.js`

Responsibilities:
- Validate payload (`model`, `domain`, `groupBy`, pagination)
- Apply agent scope restrictions (`user_id` / `agent_id` rules)
- Execute query and return normalized response

---

## API Endpoints

### Search Endpoint
```http
POST /api/search
Authorization: Bearer <token>
```

Sample request:
```json
{
  "model": "Lead",
  "domain": [["status", "=", "new"]],
  "groupBy": ["user_id"],
  "limit": 50,
  "offset": 0,
  "orderBy": "createdAt desc"
}
```

Sample response:
```json
{
  "success": true,
  "data": [],
  "meta": {
    "total": 0,
    "limit": 50,
    "offset": 0
  }
}
```

### Metadata Endpoints

1) Models
```http
GET /api/metadata/models
Authorization: Bearer <token>
```

2) Fields by model
```http
GET /api/metadata/fields/:model
Authorization: Bearer <token>
```

3) Options by model
```http
GET /api/metadata/options/:model
Authorization: Bearer <token>
```

### Health & Schema
- `GET /health`
- `GET /api/schema-status`

### Error Codes (common)
- `400` invalid request/body
- `401` missing/invalid JWT
- `403` missing permission (`search:execute`, `metadata:read`)
- `500` internal query error

---

## Microservice Integration

### How other services use Search Service

- **Email Service** uses it in universal-query middleware for `/emails`
- **Lead/Offer service** can use it for domain-based filtering and grouped analytics
- **Frontend** can use metadata endpoints to render dynamic filters without hardcoding fields

### Auth and Security
- Standard JWT auth middleware
- Permission checks by route
- Optional gateway auth middleware for protected internal traffic

### Schema Registry Integration

On startup:
1. Search service reads active schemas from `SchemaRegistry`
2. Builds queryable model schemas dynamically
3. Uses priority when duplicate model names are published by multiple services

---

## Search Flow

### 1) Search execution flow
```
POST /api/search
  → auth + permission check
  → normalize/cast input
  → QueryEngine builds aggregation pipeline
  → execute Mongo query
  → return data + meta
```

### 2) Metadata discovery flow
```
GET /api/metadata/options/:model
  → inspect model schema
  → map fields to filter operators
  → fetch reference values where applicable
  → return UI-ready options
```

### 3) Agent scope enforcement flow
```
Agent request
  → searchController appends owner domain
  → model-specific owner field (user_id / agent_id)
  → restricted result set
```

---

## Adding New Features

### Add a new search operator
1. Update operator handling in `queryEngine.js`
2. Add metadata operator exposure in `metadataController.js`
3. Add tests and request examples

### Add a new model to search
1. Ensure service publishes schema to registry
2. Verify model appears in `/api/schema-status`
3. Confirm metadata endpoints expose the model fields

### Add a new metadata endpoint
1. Add route in `src/routes/metadataRoutes.js`
2. Implement controller logic
3. Attach auth/permission middleware

---

## Testing

### Health checks
```bash
curl http://localhost:3010/health
curl http://localhost:3010/api/schema-status
```

### Search test
```bash
curl -X POST http://localhost:3010/api/search \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"model":"Lead","domain":[["status","=","new"]],"limit":10}'
```

### Metadata test
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3010/api/metadata/options/Lead
```

---

## Deployment

### Production env (essential)
```env
PORT=3010
NODE_ENV=production
MONGODB_URI=mongodb://...
JWT_SECRET=...
LOG_LEVEL=info
```

### Docker
```bash
docker-compose up -d search-service-api
docker-compose logs -f search-service-api
```

### Monitoring points
- API latency for `/api/search`
- Aggregation query duration
- Schema registry load success on startup
- Error rates by model/operator

---

## Troubleshooting

### 1. Model not searchable
- Check `/api/schema-status`
- Confirm schema published by source service
- Restart search service after schema publication

### 2. Metadata endpoint missing fields
- Verify schema definition in registry
- Check metadata controller filter/group rules
- Confirm field aliases/mappings for target model

### 3. Slow searches
- Check index coverage on frequently filtered fields
- Reduce broad regex/`ilike` usage on huge datasets
- Use pagination (`limit`, `offset`) and group wisely

### 4. Permission denied
- Verify role permissions include:
  - `search:execute`
  - `metadata:read`

---

**Last Updated:** March 2026  
**Version:** 1.0.0


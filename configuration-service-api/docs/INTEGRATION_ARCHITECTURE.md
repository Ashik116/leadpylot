# Configuration Service - Integration Architecture

**Visual Guide to Service Communications**

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         External Clients                            │
│                    (Web App, Mobile App, APIs)                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ HTTPS
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          API Gateway                                │
│                                                                     │
│  • Request Routing & Load Balancing                                │
│  • SSL/TLS Termination                                             │
│  • Rate Limiting & Throttling                                      │
│  • Authentication Pre-check                                        │
│  • Tenant Context Injection                                        │
│                                                                     │
│  Adds Headers:                                                     │
│    - x-gateway-secret                                              │
│    - x-tenant-id                                                   │
│    - x-request-id                                                  │
│                                                                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ HTTP (Internal Network)
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Configuration Service                            │
│                         (Port 4006)                                 │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │              Gateway Auth Middleware                          │ │
│  │              • Validate x-gateway-secret                      │ │
│  │              • Extract tenant context                         │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                             ↓                                       │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │            JWT Authentication Middleware                      │ │
│  │              • Verify JWT signature                           │ │
│  │              • Extract user info (id, role, email)            │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                             ↓                                       │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │            Authorization Middleware (RBAC)                    │ │
│  │              • Check user role permissions                    │ │
│  │              • Enforce resource ownership                     │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                             ↓                                       │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                 Business Logic Layer                          │ │
│  │  • Bank Management      • Project Management                  │ │
│  │  • Assignment Logic     • Closed Lead Management              │ │
│  │  • Settings & Templates • Lead Form Capture                   │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                             ↓                                       │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │              External Service Clients                         │ │
│  │              • documentClient.js                              │ │
│  │              • Lead Service HTTP calls                        │ │
│  │              • Notification event emitters                    │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                             ↓                                       │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                   MongoDB Database                            │ │
│  │  • Banks, Projects, Assignments                               │ │
│  │  • Settings, Sources, Closed Leads                            │ │
│  │  • Lead Forms, Column Preferences                             │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────┬──────────┬──────────┬────────────┬──────────┬────────────┘
          │          │          │            │          │
          │          │          │            │          │
          ▼          ▼          ▼            ▼          ▼
    ┌─────────┐┌──────────┐┌────────┐┌───────────┐┌─────────┐
    │  Auth   ││ Document ││  Lead  ││Notification││ Search  │
    │ Service ││ Service  ││Service ││  Service  ││ Service │
    │ (4000)  ││  (4001)  ││ (4003) ││   (4004)  ││ (3010)  │
    └─────────┘└──────────┘└────────┘└───────────┘└─────────┘
```

---

## Service Integration Patterns

### 1. Auth Service - Passive JWT Validation

```
┌──────────────┐                                    ┌──────────────┐
│              │   1. Login Request                 │              │
│    User      │ ─────────────────────────────────> │ Auth Service │
│              │                                    │   (Port 4000)│
│              │ <───────────────────────────────── │              │
└──────────────┘   2. JWT Token                     └──────────────┘
      │
      │ 3. API Request with JWT
      │    Authorization: Bearer <token>
      │
      ▼
┌──────────────────────────────────────┐
│    Configuration Service (4006)      │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ JWT Verification:              │ │
│  │                                │ │
│  │ const decoded = jwt.verify(   │ │
│  │   token,                       │ │
│  │   JWT_SECRET                   │ │
│  │ );                             │ │
│  │                                │ │
│  │ req.user = {                   │ │
│  │   _id: decoded._id,            │ │
│  │   role: decoded.role,          │ │
│  │   email: decoded.email         │ │
│  │ };                             │ │
│  └────────────────────────────────┘ │
│                                      │
│  No API call to Auth Service!       │
│  (Stateless validation)              │
└──────────────────────────────────────┘
```

**Key Points:**
- Configuration Service DOES NOT call Auth Service APIs
- JWT token is validated using shared `JWT_SECRET`
- User information extracted from token payload
- Completely stateless authentication

---

### 2. Document Service - Synchronous File Upload

```
┌──────────────┐                          ┌──────────────────┐
│              │ 1. Create Bank           │                  │
│    Admin     │ ───────────────────────> │ Configuration    │
│              │    (with logo file)      │    Service       │
│              │                          │     (4006)       │
└──────────────┘                          └────────┬─────────┘
                                                   │
                                2. Upload File     │
                                (multipart/form)   │
                                Authorization:     │
                                Bearer <token>     │
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │   Document      │
                                          │   Service       │
                                          │    (4001)       │
                                          │                 │
                                          │ POST /attach... │
                                          │ /library/upload │
                                          │                 │
                                          └────────┬────────┘
                                                   │
                                3. Return          │
                                Document ID        │
                                & URL              │
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │ Configuration   │
                                          │ Service         │
                                          │                 │
                                          │ bank.logo_id =  │
                                          │   document._id  │
                                          │                 │
                                          │ Save to DB      │
                                          └─────────────────┘
                                                   │
                                4. Success         │
┌──────────────┐                  Response         │
│              │ <─────────────────────────────────┘
│    Admin     │    (Bank created)
│              │
└──────────────┘
```

**API Contract:**

**Request:**
```http
POST /attachments/library/upload/single
Content-Type: multipart/form-data
Authorization: Bearer <jwt-token>

file: [binary data]
type: extra
uploader_id: 507f1f77bcf86cd799439011
```

**Response:**
```json
{
  "success": true,
  "data": {
    "document": {
      "_id": "65abc123def456789012345",
      "filename": "bank_logo.png",
      "url": "https://storage.../65abc123...png",
      "size": 45678,
      "mimetype": "image/png"
    }
  }
}
```

---

### 3. Lead Service - Assignment Synchronization

```
┌──────────────┐                                    ┌──────────────────┐
│              │ 1. Assign Leads to Project        │                  │
│  Supervisor  │ ─────────────────────────────────>│ Configuration    │
│              │    leadIds: [...]                  │    Service       │
│              │    projectId: xxx                  │     (4006)       │
│              │    agentId: yyy                    │                  │
└──────────────┘                                    └────────┬─────────┘
                                                             │
                                          2. Validate        │
                                             - Project exists│
                                             - Agent belongs │
                                                             │
                                                             ▼
                                                    ┌────────────────┐
                                                    │ MongoDB        │
                                                    │                │
                                                    │ Create         │
                                                    │ Assignment     │
                                                    │ Record         │
                                                    │                │
                                                    │ status: active │
                                                    └────────┬───────┘
                                                             │
                                          3. Sync with       │
                                             Lead Service    │
                                                             │
                                                             ▼
                                                    ┌────────────────┐
                                                    │  Lead Service  │
                                                    │    (4003)      │
                                                    │                │
                                                    │ PUT /api/leads │
                                                    │      /:id      │
                                                    │                │
                                                    │ {              │
                                                    │   team_id: xxx │
                                                    │   user_id: yyy │
                                                    │   use_status:  │
                                                    │     'in_use'   │
                                                    │ }              │
                                                    └────────┬───────┘
                                                             │
                                          4. Return 200 OK   │
                                                             │
                                                             ▼
┌──────────────┐                                    ┌─────────────────┐
│              │ <─────────────────────────────────│ Configuration   │
│  Supervisor  │   5. Success Response              │    Service      │
│              │      Assignment created            │                 │
└──────────────┘                                    └─────────────────┘
```

**Consistency Model:** Eventual Consistency
- Assignment created locally first (success guaranteed)
- Lead Service sync happens after (may fail without blocking)
- Retry mechanisms for failed synchronizations

---

### 4. Notification Service - Event-Driven Alerts

```
┌──────────────┐                                    ┌──────────────────┐
│              │ 1. Create Project                  │                  │
│    Admin     │ ─────────────────────────────────>│ Configuration    │
│              │                                    │    Service       │
└──────────────┘                                    │     (4006)       │
                                                    └────────┬─────────┘
                                                             │
                                          2. Save Project    │
                                             to DB           │
                                                             │
                                                             ▼
                                                    ┌────────────────┐
                                                    │ MongoDB        │
                                                    │                │
                                                    │ Insert Project │
                                                    └────────┬───────┘
                                                             │
                                          3. Emit Event      │
                                             (non-blocking)  │
                                                             │
                                                             ▼
                                                    ┌────────────────┐
                                                    │ EventEmitter   │
                                                    │                │
                                                    │ emit(          │
                                                    │   'PROJECT.    │
                                                    │    CREATED',   │
                                                    │   { project }  │
                                                    │ )              │
                                                    └────────┬───────┘
                                                             │
                                          4. Event Listener  │
                                             catches event   │
                                                             │
                                                             ▼
                                                    ┌────────────────┐
                                                    │ Notification   │
                                                    │   Listener     │
                                                    │                │
                                                    │ Build payload  │
                                                    └────────┬───────┘
                                                             │
                                          5. Fire HTTP       │
                                             (fire-and-      │
                                              forget)        │
                                                             ▼
                                                    ┌────────────────┐
                                                    │ Notification   │
                                                    │   Service      │
                                                    │    (4004)      │
                                                    │                │
                                                    │ POST /notif... │
                                                    │ /microservice- │
                                                    │ send           │
                                                    └────────┬───────┘
                                                             │
                                          6. Notify          │
                                             All Admins      │
                                                             │
                                                             ▼
                                                    ┌────────────────┐
                                                    │  Admin Users   │
                                                    │                │
                                                    │ Real-time      │
                                                    │ Notification   │
                                                    │ "New Project   │
                                                    │  Created"      │
                                                    └────────────────┘
```

**Important:** Notification failures don't block project creation!

---

### 5. Project Closure - Multi-Service Orchestration

```
┌──────────────┐
│    Admin     │ 1. Close Project Request
│              │    projectId: xxx
└──────┬───────┘    leadsToRefresh: [id1, id2]
       │
       ▼
┌─────────────────────────────────────────────────┐
│         Configuration Service (4006)            │
│                                                 │
│  Step 1: Get all active assignments             │
│  ┌─────────────────────────────────────────┐   │
│  │ MongoDB: Find assignments where         │   │
│  │   project_id = xxx                      │   │
│  │   status = 'active'                     │   │
│  └─────────────────────────────────────────┘   │
│                    │                            │
│                    ▼                            │
│  Step 2: Categorize leads                      │
│  ┌─────────────────────────────────────────┐   │
│  │ Refresh List:  [id1, id2]               │   │
│  │ Close List:    [id3, id4, id5]          │   │
│  └─────────────────────────────────────────┘   │
└─────────────┬───────────────────────────────────┘
              │
              │ Step 3a: For each lead in Refresh List
              │
              ▼
┌────────────────────────────────────────────────┐
│          Lead Service (4003)                   │
│                                                │
│  PUT /api/leads/id1                            │
│  {                                             │
│    team_id: null,                              │
│    user_id: null,                              │
│    use_status: 'reusable',                     │
│    stage: 'new',                               │
│    project_closed_date: Date,                  │
│    closure_reason: 'project_closure_refresh'   │
│  }                                             │
│                                                │
│  (Same for id2)                                │
└────────────────┬───────────────────────────────┘
                 │
                 │ Step 3b: Archive assignments
                 │
                 ▼
┌────────────────────────────────────────────────┐
│     Configuration Service - MongoDB            │
│                                                │
│  UPDATE Assignments                            │
│  SET status = 'archived'                       │
│  WHERE lead_id IN [id1, id2]                   │
└────────────────┬───────────────────────────────┘
                 │
                 │ Step 4: For each lead in Close List
                 │
                 ▼
┌────────────────────────────────────────────────┐
│          Lead Service (4003)                   │
│                                                │
│  PUT /api/leads/id3                            │
│  {                                             │
│    project_closed_date: Date,                  │
│    closure_reason: 'project_closure'           │
│  }                                             │
│                                                │
│  (Same for id4, id5)                           │
│  (Keep team_id & user_id - don't refresh)     │
└────────────────┬───────────────────────────────┘
                 │
                 │ Step 5: Update project
                 │
                 ▼
┌────────────────────────────────────────────────┐
│     Configuration Service - MongoDB            │
│                                                │
│  UPDATE Projects                               │
│  SET                                           │
│    status = 'closed',                          │
│    closed_date = Date,                         │
│    closed_by = adminId                         │
│  WHERE _id = xxx                               │
└────────────────┬───────────────────────────────┘
                 │
                 │ Step 6: Emit event
                 │
                 ▼
┌────────────────────────────────────────────────┐
│  EventEmitter: PROJECT.CLOSED                  │
│  (Triggers notifications, activity logs)       │
└────────────────┬───────────────────────────────┘
                 │
                 ▼
┌──────────────┐
│    Admin     │ Response:
│              │ {
└──────────────┘   success: true,
                   total_leads: 5,
                   refreshed_leads: 2,
                   closed_leads: 3
                 }
```

**Transaction Boundaries:**
- Each lead update is independent
- Partial failures don't rollback successful operations
- Results include both successful and failed operations

---

## Data Flow Diagrams

### Bank Creation with Logo

```
┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│          │     │              │     │             │     │          │
│  Admin   │────>│Configuration │────>│  Document   │────>│ MongoDB  │
│  (Web)   │     │   Service    │     │   Service   │     │          │
│          │     │              │     │             │     │          │
└──────────┘     └──────────────┘     └─────────────┘     └──────────┘
    │                   │                     │                  │
    │ 1. POST /banks    │                     │                  │
    │   + logo file     │                     │                  │
    │──────────────────>│                     │                  │
    │                   │                     │                  │
    │                   │ 2. Upload logo      │                  │
    │                   │    POST /attach.../upload             │
    │                   │───────────────────>│                  │
    │                   │                     │                  │
    │                   │ 3. Document ID      │                  │
    │                   │    & URL            │                  │
    │                   │<───────────────────│                  │
    │                   │                     │                  │
    │                   │ 4. Save Bank        │                  │
    │                   │    bank.logo_id = docId               │
    │                   │──────────────────────────────────────>│
    │                   │                     │                  │
    │                   │ 5. Bank saved       │                  │
    │                   │<──────────────────────────────────────│
    │                   │                     │                  │
    │ 6. Success        │                     │                  │
    │<──────────────────│                     │                  │
    │                   │                     │                  │
```

### Lead Assignment Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────┐     ┌─────────┐
│          │     │              │     │          │     │         │
│Supervisor│────>│Configuration │────>│ MongoDB  │────>│  Lead   │
│          │     │   Service    │     │          │     │ Service │
│          │     │              │     │          │     │         │
└──────────┘     └──────────────┘     └──────────┘     └─────────┘
    │                   │                    │               │
    │ 1. Assign Lead    │                    │               │
    │──────────────────>│                    │               │
    │                   │                    │               │
    │                   │ 2. Validate        │               │
    │                   │    Project & Agent │               │
    │                   │───────────────────>│               │
    │                   │                    │               │
    │                   │ 3. Create          │               │
    │                   │    Assignment      │               │
    │                   │───────────────────>│               │
    │                   │                    │               │
    │                   │ 4. Assignment saved│               │
    │                   │<───────────────────│               │
    │                   │                    │               │
    │                   │ 5. Update Lead     │               │
    │                   │    (team_id, user_id, use_status)  │
    │                   │────────────────────────────────────>│
    │                   │                    │               │
    │                   │ 6. 200 OK          │               │
    │                   │<────────────────────────────────────│
    │                   │                    │               │
    │ 7. Success        │                    │               │
    │<──────────────────│                    │               │
    │                   │                    │               │
```

---

## Error Handling & Resilience

### Graceful Degradation Examples

#### Document Service Unavailable
```
┌──────────────┐                          ┌──────────────────┐
│              │ 1. Create Bank           │                  │
│    Admin     │ ───────────────────────> │ Configuration    │
│              │    (with logo)           │    Service       │
└──────────────┘                          └────────┬─────────┘
                                                   │
                                2. Try upload      │
                                                   ▼
                                          ┌─────────────────┐
                                          │   Document      │
                                          │   Service       │
                                          │    (DOWN)       │
                                          └────────┬────────┘
                                                   │
                                3. Error:          │
                                ECONNREFUSED       │
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │ Configuration   │
                                          │ Service         │
                                          │                 │
                                          │ Log warning     │
                                          │ bank.logo_id =  │
                                          │   null          │
                                          │                 │
                                          │ CONTINUE!       │
                                          └─────────────────┘
                                                   │
┌──────────────┐                  4. Success       │
│              │ <─────────────────────────────────┘
│    Admin     │    (Bank created without logo)
│              │    Warning: Logo upload failed
└──────────────┘
```

**Result:** Bank creation succeeds even if logo upload fails!

#### Lead Service Timeout

```
Assignment created locally ✓
Lead Service sync fails ✗

Actions taken:
1. Log error with details
2. Mark assignment as 'sync_pending'
3. Return success to user
4. Background job retries sync later
```

---

## Security Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Request Flow                         │
└─────────────────────────────────────────────────────────┘

External Request
      │
      │ Layer 1: API Gateway
      ├──> Rate Limiting
      ├──> DDoS Protection
      ├──> SSL/TLS Termination
      │
      ▼
Configuration Service
      │
      │ Layer 2: Gateway Authentication
      ├──> Validate x-gateway-secret
      ├──> Prevent direct access
      │
      ▼
      │ Layer 3: JWT Authentication
      ├──> Verify JWT signature
      ├──> Extract user identity
      │
      ▼
      │ Layer 4: Authorization (RBAC)
      ├──> Check role permissions
      ├──> Validate resource ownership
      │
      ▼
      │ Layer 5: Business Logic Validation
      ├──> Validate request data
      ├──> Check business rules
      │
      ▼
Process Request
```

---

## Performance Considerations

### Service Call Timeouts

| Service | Operation | Timeout | Reason |
|---------|-----------|---------|--------|
| Document Service | Upload | 60s | Large files |
| Document Service | Delete | 30s | Moderate operation |
| Lead Service | Update | 5s | Quick updates |
| Notification Service | Send | 5s | Fire-and-forget |
| Search Service | Query | 10s | Complex searches |

### Connection Pooling

```javascript
// Axios instance with connection reuse
const leadServiceClient = axios.create({
  baseURL: process.env.LEAD_SERVICE_URL,
  timeout: 5000,
  maxRedirects: 5,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true })
});
```

### Caching Strategy

- **JWT Validation:** Stateless (no caching needed)
- **Document URLs:** Cache in Redis (TTL: 1 hour)
- **Project/Bank Metadata:** Cache in Redis (TTL: 5 minutes)
- **User Permissions:** Cache in Redis (TTL: 15 minutes)

---

## Monitoring & Observability

### Request Tracing

```
x-request-id: req_abc123def456
  │
  ├─> Configuration Service
  │     └─> Logged: Request started
  │
  ├─> Document Service
  │     └─> Logged: File upload (req_abc123def456)
  │
  ├─> Lead Service
  │     └─> Logged: Lead update (req_abc123def456)
  │
  └─> Logged: Request completed (req_abc123def456)
```

### Health Checks

```bash
# Configuration Service
GET /health
Response: { status: 'ok', uptime: 123456, db: 'connected' }

# Integrated Services Health
GET /health/integrations
Response: {
  document_service: 'ok',
  lead_service: 'ok',
  notification_service: 'degraded',
  search_service: 'ok'
}
```

---

## Related Documentation

- **Detailed Integration Guide:** [SERVICE_INTEGRATIONS.md](./SERVICE_INTEGRATIONS.md)
- **Technical Overview:** [TECHNICAL_OVERVIEW.md](./TECHNICAL_OVERVIEW.md)
- **Non-Technical Overview:** [NON_TECHNICAL_OVERVIEW.md](./NON_TECHNICAL_OVERVIEW.md)

---

**For questions about integrations, refer to [SERVICE_INTEGRATIONS.md](./SERVICE_INTEGRATIONS.md) or contact the development team.**

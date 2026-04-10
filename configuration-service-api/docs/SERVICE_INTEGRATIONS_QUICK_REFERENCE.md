# Service Integrations - Quick Reference

**Last Updated:** March 2026

This is a quick reference guide for the Configuration Service integrations. For detailed information, see the full documentation linked below.

---

## 📚 Documentation Index

1. **[SERVICE_INTEGRATIONS.md](./SERVICE_INTEGRATIONS.md)** - Comprehensive integration guide
   - Authentication mechanisms
   - API contracts & payloads
   - Error handling strategies
   - Integration patterns
   - Troubleshooting guides

2. **[INTEGRATION_ARCHITECTURE.md](./INTEGRATION_ARCHITECTURE.md)** - Visual architecture guide
   - System architecture diagrams
   - Data flow diagrams
   - Sequence diagrams
   - Security layers

3. **[TECHNICAL_OVERVIEW.md](./TECHNICAL_OVERVIEW.md)** - Full technical documentation
   - API endpoints
   - Data models
   - Business logic

4. **[NON_TECHNICAL_OVERVIEW.md](./NON_TECHNICAL_OVERVIEW.md)** - Business-friendly overview

---

## ⚡ Quick Integration Overview

| Service | Purpose | Pattern | Port |
|---------|---------|---------|------|
| **Auth Service** | Authentication & Authorization | JWT Validation (Passive) | 4000 |
| **Document Service** | File Storage | Synchronous REST API | 4001 |
| **Lead Service** | Lead Synchronization | Synchronous REST API | 4003 |
| **Notification Service** | Real-time Alerts | Event-Driven | 4004 |
| **Search Service** | Advanced Search | Synchronous REST API | 3010 |
| **Gateway** | Request Routing | Header Validation | - |

---

## 🔑 Environment Variables

```bash
# Service URLs
AUTH_SERVICE_URL=http://localhost:4000
DOCUMENT_SERVICE_URL=http://localhost:4001
LEAD_SERVICE_URL=http://localhost:4003
NOTIFICATION_SERVICE_URL=http://localhost:4004
SEARCH_SERVICE_URL=http://localhost:3010

# Authentication
JWT_SECRET=<shared-with-auth-service>
GATEWAY_SECRET=<shared-with-gateway>
GATEWAY_AUTH_ENABLED=true
```

---

## 🔐 Authentication Flow

```
User Login → Auth Service → JWT Token
                                │
                                ▼
                    API Request with Token
                                │
                                ▼
                    Configuration Service
                                │
                    ┌───────────┴───────────┐
                    │                       │
            Validate JWT              Extract User
           (JWT_SECRET)              (id, role, email)
                    │                       │
                    └───────────┬───────────┘
                                │
                                ▼
                        Process Request
```

**Key Point:** Configuration Service does NOT call Auth Service API - it validates JWT tokens locally.

---

## 📤 Document Upload Flow

```
1. User submits form with file
         ↓
2. Configuration Service receives request
         ↓
3. Upload file to Document Service
   POST /attachments/library/upload/single
         ↓
4. Document Service returns document._id
         ↓
5. Save document._id in Configuration DB
         ↓
6. Return success to user
```

---

## 🔄 Lead Assignment Flow

```
1. Supervisor assigns lead to project
         ↓
2. Validate project & agent (Configuration DB)
         ↓
3. Create Assignment record (Configuration DB)
         ↓
4. Update lead in Lead Service
   PUT /api/leads/:id
   { team_id, user_id, use_status: 'in_use' }
         ↓
5. Return success (eventual consistency)
```

**Consistency:** Assignment created locally first, then synchronized with Lead Service.

---

## 📢 Notification Flow

```
Business Logic
      ↓
Emit Event (EventEmitter)
      ↓
Notification Listener
      ↓
POST /notifications/microservice-send
      ↓
Notification Service
      ↓
Users receive notification
```

**Important:** Notification failures don't block main operations!

---

## ⚙️ Project Closure Flow

```
Admin Request: Close Project
      ↓
Get all active assignments
      ↓
Categorize: Refresh vs. Close
      ↓
┌─────────────┬────────────────┐
│             │                │
▼             ▼                ▼
Refresh Leads Close Leads      Update Project
(reusable)    (archived)       (status=closed)
```

**Lead Service Updates:**
- **Refreshed:** `use_status: 'reusable'`, `team_id: null`
- **Closed:** Keep assignment, add `project_closed_date`

---

## 🛡️ Security Layers

1. **API Gateway** - Rate limiting, SSL termination
2. **Gateway Auth** - Validate `x-gateway-secret`
3. **JWT Auth** - Verify token signature
4. **Authorization** - Check role permissions (RBAC)
5. **Business Logic** - Validate data & business rules

---

## 🚨 Common Issues & Solutions

### "Authentication required"
**Cause:** Missing or invalid JWT token
**Solution:** 
```bash
# Check JWT_SECRET matches Auth Service
echo $JWT_SECRET

# Verify token in request
curl -H "Authorization: Bearer <token>" http://localhost:4006/api/banks
```

### "Service unreachable" (ECONNREFUSED)
**Cause:** Target service is down
**Solution:**
```bash
# Check service URLs
echo $DOCUMENT_SERVICE_URL

# Test connectivity
curl http://localhost:4001/health
```

### "Forbidden" (Gateway)
**Cause:** Gateway secret mismatch
**Solution:**
```bash
# Verify GATEWAY_SECRET
echo $GATEWAY_SECRET

# Check if enabled
echo $GATEWAY_AUTH_ENABLED  # Should be 'true' in production
```

---

## 🔧 Integration Testing

### Test Document Upload
```javascript
const file = {
  buffer: Buffer.from('test data'),
  originalname: 'test.png',
  mimetype: 'image/png'
};

const document = await documentClient.uploadDocument(
  file, 
  'extra', 
  'user123', 
  'jwt-token'
);

expect(document._id).toBeDefined();
```

### Test Lead Assignment
```javascript
const result = await assignmentService.assignLeadsToProject(
  ['lead1', 'lead2'],
  'project123',
  'agent456',
  'supervisor789',
  'Assignment notes',
  'jwt-token'
);

expect(result.successCount).toBe(2);
```

---

## 📊 Service Health Checks

```bash
# Configuration Service
curl http://localhost:4006/health

# Document Service
curl http://localhost:4001/health

# Lead Service
curl http://localhost:4003/health

# Notification Service
curl http://localhost:4004/health
```

---

## 📝 API Contracts

### Document Upload
```http
POST /attachments/library/upload/single
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: [binary]
type: extra
uploader_id: 507f1f77bcf86cd799439011
```

**Response:**
```json
{
  "success": true,
  "data": {
    "document": {
      "_id": "65abc...",
      "filename": "logo.png",
      "url": "https://storage.../logo.png",
      "size": 45678
    }
  }
}
```

### Lead Update
```http
PUT /api/leads/:leadId
Authorization: Bearer <token>

{
  "team_id": "project123",
  "user_id": "agent456",
  "use_status": "in_use",
  "assigned_date": "2026-03-25T10:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "lead": {
      "_id": "lead123",
      "team_id": "project123",
      "user_id": "agent456",
      "use_status": "in_use"
    }
  }
}
```

---

## 🔄 Retry Logic

```javascript
async function retryableRequest(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      if (error.code === 'ECONNREFUSED' || 
          error.response?.status >= 500) {
        await sleep(1000 * attempt);
        continue;
      }
      
      throw error; // Don't retry client errors
    }
  }
}
```

---

## 🎯 Integration Patterns

### 1. Synchronous Request-Response
**Used for:** Document uploads, Lead updates
- Blocking operation
- Immediate feedback required
- Transaction-like consistency

### 2. Event-Driven (Fire-and-Forget)
**Used for:** Notifications, Activity logging
- Non-blocking
- No immediate feedback needed
- Eventually consistent

### 3. Token Propagation
**Used for:** All authenticated service calls
- Maintains user context across services
- Enables audit trails
- Enforces permissions downstream

### 4. Eventual Consistency
**Used for:** Assignment synchronization
- Local record created first
- External sync happens after
- Retry mechanisms for failed syncs

---

## 📖 Further Reading

- **Complete Integration Guide:** [SERVICE_INTEGRATIONS.md](./SERVICE_INTEGRATIONS.md)
- **Visual Diagrams:** [INTEGRATION_ARCHITECTURE.md](./INTEGRATION_ARCHITECTURE.md)
- **Technical Details:** [TECHNICAL_OVERVIEW.md](./TECHNICAL_OVERVIEW.md)
- **Business Overview:** [NON_TECHNICAL_OVERVIEW.md](./NON_TECHNICAL_OVERVIEW.md)

---

## 🤝 Support

For questions or issues with service integrations:
1. Check the troubleshooting section in [SERVICE_INTEGRATIONS.md](./SERVICE_INTEGRATIONS.md)
2. Review error logs for detailed error messages
3. Verify environment variables are correctly set
4. Test service connectivity with health check endpoints
5. Contact the development team

---

**Quick Tip:** Always check the [SERVICE_INTEGRATIONS.md](./SERVICE_INTEGRATIONS.md) document for the most comprehensive and up-to-date integration information!

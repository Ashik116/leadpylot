# Email Service - Technical Documentation

```markdown
# Email Service - Technical Documentation

## 📚 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup & Installation](#setup--installation)
4. [Project Structure](#project-structure)
5. [Core Services](#core-services)
6. [API Endpoints](#api-endpoints)
7. [Microservice Integration](#microservice-integration)
8. [Email Workflow Flow](#email-workflow-flow)
9. [Adding New Features](#adding-new-features)
10. [Testing](#testing)
11. [Deployment](#deployment)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The Email Service is a **microservice** responsible for centralized email operations in LeadPylot CRM:

- Inbound email ingestion (IMAP poller + IDLE monitor)
- Outbound email sending (SMTP, bulk, replies, forwards, scheduled sends)
- Approval workflow (body + attachment approval/rejection)
- Collaboration features (internal comments, canned responses, snooze, reminders, starred)
- Email-to-work conversion (email tasks / todos linked to leads and threads)

### Key Technologies

- **Node.js** + **Express.js**
- **MongoDB** + **Mongoose**
- **Socket.IO** (real-time updates)
- **Multer** (uploads)
- **IMAP/SMTP integrations**
- **Docker**

---

## Architecture

### System Architecture
```

┌──────────────────────────────────────────────────────────────┐
│ API Gateway │
└──────────────────────┬───────────────────────────────────────┘
│
▼
┌──────────────────────────────────────────────────────────────┐
│ Email Service (Port 4008) │
├──────────────────────────────────────────────────────────────┤
│ Routes → Controllers → EmailSystemService (Orchestrator)│
│ │ │
│ ├─ Drafts │
│ ├─ Approvals │
│ ├─ Collaboration │
│ ├─ Task/Todo features │
│ └─ IMAP/SMTP sync │
├──────────────────────────────────────────────────────────────┤
│ Data Layer: MongoDB (emails, documents, settings, todos...) │
│ Realtime: Socket.IO │
└──────────────────────────────────────────────────────────────┘
│
┌───────────────┼────────────────┬──────────────────────┐
▼ ▼ ▼ ▼
Search Service Lead Offer Service Todo Board Service Notification Service

```

### Request Flow
```

Client/API Gateway → Email Service Route
↓
Authentication + Permission
↓
Controller Validation
↓
Service Layer Business Logic
↓
MongoDB Read/Write + Optional External Calls
↓
Realtime Emit / API Response

````

---

## Setup & Installation

### Prerequisites
- Node.js >= 16.x
- MongoDB >= 4.4
- Docker & Docker Compose (optional)
- Access to SMTP/IMAP credentials

### Local Development Setup
1. Install dependencies:
```bash
cd email-service-api
npm install
````

2. Configure environment:

```bash
cp .env.example .env
```

3. Required env keys (minimum):

```env
PORT=4008
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/leadpylot
JWT_SECRET=your-secret
SEARCH_SERVICE_URL=http://localhost:3010
LEAD_OFFER_SERVICE_URL=http://localhost:4003
```

4. Start service:

```bash
npm run dev
```

5. Verify health:

```bash
curl http://localhost:4008/health
curl http://localhost:4008/ready
```

---

## Project Structure

```
email-service-api/
├── src/
│   ├── app.js
│   ├── routes/
│   │   ├── emailSystem.js
│   │   ├── emailSystemDrafts.js
│   │   ├── emailSystemCollaboration.js
│   │   ├── emails.js
│   │   └── mailServerSetting.js
│   ├── controllers/
│   │   ├── emailSystemController.js
│   │   ├── emailController.js
│   │   ├── mailServerController.js
│   │   └── emailTemplateCategoryController.js
│   ├── services/
│   │   ├── emailSystem/
│   │   ├── taskService.js
│   │   ├── offerSlotsService.js
│   │   └── schemaPublisher.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── universalQuery.js
│   ├── models/
│   │   ├── Email.js
│   │   ├── Document.js
│   │   ├── task.js
│   │   ├── list.js
│   │   └── ...
│   └── cron/
│       ├── imapEmailProcessor.js
│       └── scheduledEmailProcessor.js
├── docs/
├── postman/
└── ...
```

---

## Core Services

### 1. EmailSystemService (Orchestrator)

**Location:** `src/services/emailSystem/EmailSystemService.js`  
Coordinates feature modules for sending, receiving, approvals, drafts, and tasks.

### 2. EmailTaskService

**Location:** `src/services/emailSystem/features/EmailTaskService.js`

Key behavior:

- Creates `Todo` records with `todo_type: 'email_task'`
- Requires `lead_id` (from request or linked email)
- If assigned, auto-updates thread visibility and approval state

### 3. Task Service (Kanban-style task creation)

**Location:** `src/services/taskService.js`

Key methods:

- `createInboxTaskFromEmail(...)` (board/list empty)
- `createTaskFromEmail(...)` (optional `board_id` + `list_id`)

### 4. Universal Query Middleware

**Location:** `src/middleware/universalQuery.js`

- Intercepts `GET /emails` with domain/group/filter params
- Calls Search Service `POST /api/search`
- Returns filtered/grouped result sets

### 5. Mailserver Settings Service

- Handles mail server CRUD and connection tests (`/settings/mailservers`)

---

## API Endpoints

### Health Endpoints

- `GET /health`
- `GET /ready`

### Email System Endpoints (high signal)

- `POST /email-system/send-project-email`
- `POST /email-system/send-bulk-email`
- `POST /email-system/:id/approve-email`
- `POST /email-system/:id/approve-attachments`
- `POST /email-system/:id/reject`
- `POST /email-system/:id/assign-lead`
- `POST /email-system/:id/assign-agent`
- `POST /email-system/:id/tasks`
- `GET /email-system/:id/tasks`
- `PATCH /email-system/tasks/:taskId`

### Draft Endpoints

- `POST /email-system/drafts`
- `PUT /email-system/drafts/:draftId`
- `GET /email-system/drafts`
- `POST /email-system/drafts/:draftId/send`
- `POST /email-system/drafts/sync/:mailServerId`

### Collaboration Endpoints

- `GET|POST|PUT|DELETE /email-system/:emailId/internal-comments[...]`
- `GET|POST /email-system/canned-responses[...]`
- `POST /email-system/:emailId/snooze`
- `POST /email-system/:emailId/unsnooze`
- `POST /email-system/:emailId/reminders`
- `POST|DELETE /email-system/:emailId/star`

### Settings Endpoints

- `GET /settings/mailservers`
- `POST /settings/mailservers`
- `PUT /settings/mailservers/:id`
- `DELETE /settings/mailservers/:id`
- `POST /settings/mailservers/test-connection`

### Error Response Pattern

Common responses:

- `400` validation error
- `401` auth required
- `403` permission denied
- `404` resource not found
- `500` internal service error

---

## Microservice Integration

### Search Service Integration

- Used by universal query middleware (`/emails` filtering/grouping)
- Dependency via `SEARCH_SERVICE_URL`
- Request includes incoming authorization header

### Lead Offer Service Integration

- Shared domain context (lead, offer, documents)
- Lead Offer has `emailServiceClient` for health and sync-style operations
- Email service has slot/type logic synchronized with lead-offer document slot behavior

### Todo Board Relationship

- Email service can create work items linked to emails/leads:
  - Kanban `Task` docs (`board_id`, `list_id`)
  - Email `Todo` docs (`todo_type: 'email_task'`)
- This supports both board-based workflows and email-centric follow-up workflows

### Notification/Realtime Integration

- Socket.IO initialized in app for real-time UX updates
- Notification side-effects can be emitted by workflow modules

---

## Email Workflow Flow

### 1) Inbound Email Flow

```
IMAP Processor/IDLE
   → Parse email + attachments
   → Persist Email + Document
   → Optional lead match
   → Optional task/todo creation
   → Admin/agent visibility based on workflow
```

### 2) Approval Flow

```
Pending Email
  → Admin approves/rejects body
  → Admin approves/rejects attachments
  → Email status + workflow history updated
```

### 3) Email-to-Task Flow

```
POST /email-system/:id/tasks
  → Validate email + lead
  → Create task (board/list optional)
  → Link back to email_id + lead_id
```

### 4) Email-to-Todo Flow

```
Create email task (Todo)
  → todo_type = email_task
  → Optional assignment
  → Thread visibility and approval updates
```

---

## Adding New Features

### Add a new email workflow endpoint

1. Add route in `src/routes/emailSystem.js` (or relevant route file)
2. Add validation middleware
3. Add controller handler in `src/controllers/emailSystemController.js`
4. Add service implementation in `src/services/emailSystem/...`
5. Add permission constant and role mapping
6. Add Postman example in `postman/`

### Add a new metadata/filter capability

1. Extend `src/middleware/universalQuery.js`
2. Ensure Search Service model/field is available
3. Add tests for fallback behavior if search service is unavailable

---

## Testing

### Quick API checks

```bash
curl http://localhost:4008/health
curl http://localhost:4008/ready
```

### Authenticated sample

```bash
curl -X GET http://localhost:4008/email-system/scheduled \
  -H "Authorization: Bearer <token>"
```

### Postman

- Import files in `postman/`
- Set `baseUrl` and `accessToken`
- Run endpoint groups (core, drafts, collaboration, settings)

---

## Deployment

### Production environment variables (essential)

```env
PORT=4008
NODE_ENV=production
MONGODB_URI=mongodb://...
JWT_SECRET=...
SEARCH_SERVICE_URL=http://search-service-api:3010
LEAD_OFFER_SERVICE_URL=http://lead-offer-service-api:4003
SOCKET_URL=http://notification-service-api:4004
```

### Docker

```bash
docker-compose up -d email-service-api
docker-compose logs -f email-service-api
```

### Monitoring checkpoints

- `/health` and `/ready` status
- IMAP processor status and queue behavior
- Scheduled send success/failures
- Search dependency latency and timeout patterns

---

## Troubleshooting

### 1. `GET /emails` returns unexpected results

- Verify Search Service is running
- Verify `SEARCH_SERVICE_URL`
- Check universal query params (`domain`, `groupBy`, predefined filters)

### 2. Email task creation fails

- Ensure email is linked to a lead
- Validate `board_id` / `list_id` existence if provided
- Verify permission (`EMAIL_TASK_CREATE`)

### 3. Draft sync/sending issues

- Check mailserver credentials in `/settings/mailservers`
- Test SMTP/IMAP via test-connection endpoint
- Check IMAP processor logs

### 4. Missing realtime updates

- Verify Socket.IO initialization and CORS origin
- Ensure client can connect and subscribe

---

**Last Updated:** March 2026  
**Version:** 1.0.0

```

```

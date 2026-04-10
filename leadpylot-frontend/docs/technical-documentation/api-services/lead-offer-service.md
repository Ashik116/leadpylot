# Lead-Offer Service — Comprehensive Documentation

---

# PART ONE — NON-TECHNICAL DOCUMENTATION

---

## 1. What Is the Lead-Offer Service?

The **Lead-Offer Service** is the central hub of the CRM platform. Think of it as the brain of the entire sales operation — it manages every customer inquiry (lead), every financial proposal (offer), and every task that the sales team needs to follow up on.

### In Plain Terms

| Everyday Analogy                            | CRM Equivalent                                     |
| ------------------------------------------- | -------------------------------------------------- |
| A potential customer walks into your office | A **Lead** is created in the system                |
| You prepare a financial proposal for them   | An **Offer** is created for that lead              |
| You open a bank account for the deal        | An **Opening** is created                          |
| The customer signs the paperwork            | A **Confirmation** is recorded                     |
| Money is exchanged                          | A **Payment Voucher** is generated                 |
| The final calculation is done               | **Netto 1** and **Netto 2** documents are produced |

The Lead-Offer Service tracks this entire journey from first contact to final payout, keeping every team member informed at every step.

### What It Manages

- **Leads** — all potential customer contacts and their details
- **Offers** — financial proposals tied to specific leads
- **Offer Lifecycle** — openings, confirmations, payments, netto calculations
- **Todos & Tickets** — tasks that are automatically or manually created
- **Lead Assignments** — which agent handles which lead in which project
- **Reclamations** — dispute/complaint tracking
- **Activities** — a full audit trail of every action taken
- **Commissions** — agent and banker earnings per offer
- **Documents** — files attached to offers, openings, confirmations

---

## 2. Key Business Concepts

### The Offer Pipeline

Every offer moves through a defined lifecycle. At each stage, different teams take action:

```
  Lead Created
       │
       ▼
  Offer Drafted ─────────────────┐
       │                         │
       ▼                         ▼
  Opening Created          Offer Marked as "Lost"
       │                    (can be reverted)
       ▼
  Confirmation Received
       │
       ▼
  Payment Voucher Issued
       │
       ▼
  Netto 1 Calculated
       │
       ▼
  Netto 2 Finalized
       │
       ▼
  Deal Complete ✓
```

Each transition:

- Triggers **automatic notifications** to relevant team members
- Creates an **activity log** entry for audit purposes
- May generate **automatic tickets/tasks** for follow-up

### Lead Queue

Leads are distributed to agents using a **queue system**. Agents work through leads in priority order. When an agent completes work on the current top-of-queue lead, the system automatically surfaces the next one.

### Projects & Teams

- **Projects** represent business divisions or campaigns (e.g., “Investment Fund A”, “Real Estate Portfolio B”)
- **Agents** are assigned to projects and handle leads within them
- Leads can be **transferred** between projects and agents, preserving full history

---

## 3. How Teams Use the System

### Sales Agents

- Receive lead assignments automatically
- View their personal lead queue
- Create offers for qualified leads
- Track offer progress through the pipeline
- Manage their todo/ticket board
- Get real-time notifications when tasks are assigned

### Sales Managers / Admins

- Import leads in bulk (CSV/Excel uploads)
- Assign leads to agents and projects
- Monitor offer progress across all agents
- Approve or reject reclamations (disputes)
- View financial summaries and commission reports
- Manage offer stages (revert, mark as lost, restore)
- Perform bulk operations (update, delete, transfer)

### Operations Team

- Process openings (bank account creation)
- Handle confirmations (signed documents)
- Issue payment vouchers
- Generate Netto 1 and Netto 2 settlement documents
- Manage document attachments at each stage

### Support Team

- File reclamations on behalf of customers
- Track reclamation status (pending, accepted, rejected)
- View full activity history for any lead

---

## 4. Real-World Business Scenarios

### Scenario 1: New Lead from Web Form

1. A potential investor fills out a form on the company website
2. The system **automatically creates a lead** via the import-from-forms API
3. An admin assigns the lead to an agent in the appropriate project
4. The agent receives a **real-time notification** about the new assignment
5. An **activity record** is logged: “Lead assigned to Project X — Agent Y”

### Scenario 2: Agent Creates an Offer

1. An agent evaluates a lead and creates an offer with investment details
2. The system **automatically creates a todo/ticket** linked to the offer
3. Admins receive a **notification**: “New offer created for lead ‘John Doe’ — €50,000 at 5% interest”
4. The offer appears in the pipeline at the “Offer” stage

### Scenario 3: Offer Progresses Through the Pipeline

1. Operations creates an **Opening** (bank account) → notification sent, activity logged
2. Customer signs → **Confirmation** recorded → notification sent, activity logged
3. Payment processed → **Payment Voucher** issued → notification sent, activity logged
4. Finance calculates → **Netto 1** generated → notification sent, activity logged
5. Final settlement → **Netto 2** finalized → notification sent, activity logged

### Scenario 4: Bulk Lead Transfer

1. A project is being closed; 200 leads need to move to a new project
2. Admin selects leads and initiates a **bulk transfer**
3. Each lead gets individual activity logging
4. The receiving agent gets a **notification** about the incoming leads
5. Full transfer history is preserved for audit

### Scenario 5: Handling a Dispute

1. A customer disputes a charge; support files a **Reclamation**
2. The reclamation is linked to the lead and optionally to an offer
3. An admin reviews and either **accepts** or **rejects** the reclamation
4. Status changes trigger notifications and activity logs

---

## 5. Automation & Benefits

### What Happens Automatically

| Trigger                       | Automatic Action                                             |
| ----------------------------- | ------------------------------------------------------------ |
| Offer created by an agent     | Todo/ticket created with priority based on investment volume |
| Offer created by an agent     | Notification sent to all Admins                              |
| Offer created by an admin     | Notification sent to the assigned agent                      |
| Any pipeline stage transition | Activity record logged                                       |
| Lead assigned to agent        | Agent notified in real-time                                  |
| Lead transferred              | Transfer record created with full history                    |
| Todo assigned to agent        | Agent notified                                               |
| Todo completed                | Admins notified with completion duration                     |
| Reclamation filed             | Activity record created                                      |

### Priority Auto-Calculation

When an offer is created, the system automatically assigns a ticket priority based on investment volume:

| Investment Volume | Auto-Priority |
| ----------------- | ------------- |
| €100,000+         | 5 (Critical)  |
| €50,000 – €99,999 | 4 (High)      |
| €20,000 – €49,999 | 3 (Medium)    |
| Below €20,000     | 2 (Low)       |

### Business Benefits

- **Zero manual task creation** — tickets are generated automatically when offers are created
- **Full audit trail** — every action is logged with who, what, and when
- **Real-time awareness** — notifications ensure nothing falls through the cracks
- **Centralized data** — all lead, offer, and financial data in one place
- **Role-based access** — agents see only their leads; admins see everything
- **Bulk operations** — handle hundreds of leads/offers in a single action
- **Pipeline visibility** — see exactly where every deal stands

---

# PART TWO — TECHNICAL DOCUMENTATION

---

## 6. System Architecture Overview

The Lead-Offer Service is the core of a **microservices-based CRM platform** orchestrated via Docker Compose, with a shared MongoDB database.

### High-Level Architecture

```
                                    ┌─────────────────────┐
                                    │   Frontend Client    │
                                    │   (React/Next.js)    │
                                    └──────────┬──────────┘
                                               │
              ┌────────────────────────────────┼────────────────────────────────┐
              │                                │                                │
   ┌──────────▼──────────┐      ┌──────────────▼──────────────┐    ┌──────────▼──────────┐
   │  User Auth Service  │      │    LEAD-OFFER SERVICE       │    │ Configuration Svc   │
   │  :4000              │      │    :4003 (CENTRAL HUB)      │    │ :4006               │
   │                     │      │                              │    │                     │
   │  • Authentication   │      │  • Leads        • Offers     │    │  • Banks            │
   │  • Users & Roles    │      │  • Openings     • Confirms   │    │  • Projects         │
   │  • Permissions      │      │  • Payments     • Netto 1/2  │    │  • Sources          │
   │  • Sessions         │      │  • Todos        • Activities │    │  • Assignments      │
   │  • Telegram Bots    │      │  • Reclamations • Transfers  │    │  • Settings         │
   └─────────────────────┘      │  • Commissions  • Search     │    └─────────────────────┘
                                │  • Documents    • Filters    │
   ┌─────────────────────┐      └──────────────┬──────────────┘    ┌─────────────────────┐
   │  Email Service      │                     │                    │ Notification Svc    │
   │  :4008              │◄────── Shared DB ───┤                    │ :4004               │
   │                     │                     │                    │                     │
   │  • IMAP Ingestion   │                     ├───── HTTP ────────►│  • In-App Alerts    │
   │  • SMTP Sending     │                     │                    │  • Telegram Bots    │
   │  • Email Approval   │                     │                    │  • Socket.IO Push   │
   │  • Collaboration    │                     │                    └─────────────────────┘
   └─────────────────────┘                     │
                                               │                    ┌─────────────────────┐
   ┌─────────────────────┐                     │                    │  Search Service     │
   │  Cashflow Service   │◄────── Shared DB ───┤───── HTTP ────────►│  :3010              │
   │  :4011              │                     │                    │                     │
   │                     │                     │                    │  • Schema Registry  │
   │  • Bank Txns        │                     │                    │  • Global Search    │
   │  • Offer Cashflow   │                     │                    │  • Metadata API     │
   └─────────────────────┘                     │                    └─────────────────────┘
                                               │
   ┌─────────────────────┐                     │                    ┌─────────────────────┐
   │  PDF Service        │◄────── HTTP ────────┤                    │  Todo Board Svc     │
   │  :4009              │                     │                    │  :5001              │
   │                     │                     │◄────── Shared DB ──│                     │
   │  • PDF Templates    │                     │                    │  • Kanban Boards    │
   │  • PDF Generation   │                     │                    │  • Tasks & Lists    │
   └─────────────────────┘                     │                    │  • Internal Chat    │
                                               │                    └─────────────────────┘
   ┌─────────────────────┐                     │
   │  Document Service   │◄────── HTTP ────────┤                    ┌─────────────────────┐
   │  :4002              │                     │                    │  Reporting Service  │
   │                     │                     │                    │  :4007              │
   │  • S3/Cloudinary    │                     └────── Schema ─────►│                     │
   │  • File Uploads     │                                          │  • Analytics        │
   └─────────────────────┘                                          └─────────────────────┘
```

### Technology Stack

| Component        | Technology                          |
| ---------------- | ----------------------------------- |
| Runtime          | Node.js (JavaScript)                |
| Framework        | Express 4.x                         |
| Database         | MongoDB 7.x (Mongoose ODM)          |
| Cache            | Redis 5.x (RBAC permission caching) |
| Real-time        | Socket.IO 4.x                       |
| Auth             | JWT (jsonwebtoken)                  |
| File Storage     | AWS S3 / Local filesystem           |
| PDF              | pdf-lib                             |
| Spreadsheets     | xlsx (for imports)                  |
| HTTP Client      | axios                               |
| Telephony        | asterisk-manager, mysql2 (FreePBX)  |
| Logging          | Winston                             |
| Containerization | Docker / Docker Compose             |

---

## 7. Service Integrations Map

### Integration Summary Table

| External Service          | Port | Integration Type  | Direction     | Purpose                                        |
| ------------------------- | ---- | ----------------- | ------------- | ---------------------------------------------- |
| **Notification Service**  | 4004 | REST (HTTP POST)  | Outbound      | Sends event notifications                      |
| **Search Service**        | 3010 | REST (HTTP POST)  | Outbound      | Universal query middleware                     |
| **Configuration Service** | 4006 | REST (HTTP)       | Bidirectional | Project closure, assignments                   |
| **Document Service**      | 4002 | REST (HTTP)       | Outbound      | File upload/download                           |
| **PDF Service**           | 4009 | REST (HTTP)       | Outbound      | Auto-PDF generation                            |
| **Email Service**         | 4008 | Shared MongoDB    | Bidirectional | Shared lead/offer data via same DB collections |
| **Cashflow Service**      | 4011 | Shared MongoDB    | Bidirectional | Shared Offer/Bank collections                  |
| **Todo Board Service**    | 5001 | Shared MongoDB    | Bidirectional | Dual activity logging                          |
| **Reporting Service**     | 4007 | Schema Registry   | Outbound      | Schema publishing for report generation        |
| **User Auth Service**     | 4000 | JWT + Shared Auth | Inbound       | Token verification (shared JWT_SECRET)         |
| **OpenAI API**            | —    | REST (HTTPS)      | Outbound      | AI-powered lead summaries                      |
| **Leadbot**               | —    | REST (HTTP)       | Outbound      | Conversational lead summary generation         |
| **FreePBX**               | —    | MySQL + GraphQL   | Bidirectional | VoIP/telephony integration                     |

### Integration Patterns

### Pattern 1: Event → HTTP Notification

```
Lead-Offer Service                      Notification Service
       │                                        │
  [Event Emitted]                                │
       │                                         │
       ├── eventEmitter.emit('offer:created') ──►│
       │                                         │
       │   POST /notifications/microservice-send │
       │   {                                     │
       │     eventType: 'offer:created',         │
       │     notification: { ... },              │
       │     targetRole: 'Admin'                 │
       │   }                                     │
       │                                         ├──► Socket.IO push
       │                                         ├──► Telegram bot
       │                                         └──► In-app notification
```

### Pattern 2: Shared MongoDB Collections

```
Lead-Offer Service ◄──── Same MongoDB Database ────► Email Service
       │                                                    │
  Lead collection ◄─────────── reads/writes ──────────► Lead collection
  Offer collection ◄────────── reads/writes ──────────► Offer collection
  Activity collection ◄───────── reads/writes ────────► Activity collection
```

### Pattern 3: Schema Registry (Service Discovery)

```
Lead-Offer Service                          Search Service
       │                                         │
  publishAllSchemas() ─── Mongoose models ──────►│
       │                    written to            │
       │                  schema_registry         │
       │                   collection             │
       │                                         │
       │                    Priority: 100         │
       │                    (highest wins)        │
       │                                         │
       │◄─── POST /api/search ──────────────────│
       │     (universalQuery middleware)          │
```

---

## 8. API Endpoints Reference

### Base URL

- `http://localhost:4003`

### Authentication

All endpoints (except public ones) require:

```
Authorization: Bearer <JWT_TOKEN>
```

### Public Endpoints

| Method | Path      | Description                  | Response                                          |
| ------ | --------- | ---------------------------- | ------------------------------------------------- |
| `GET`  | `/health` | Health check                 | `{ status, service, timestamp, uptime }`          |
| `GET`  | `/`       | Service info + endpoint list | Service metadata                                  |
| `GET`  | `/info`   | Version info                 | `{ service, version, status, port, environment }` |

---

### Leads (`/leads`)

**Middleware:** `authenticate`, `universalQuery`

| Method   | Path                          | Permission                              | Description                        |
| -------- | ----------------------------- | --------------------------------------- | ---------------------------------- |
| `GET`    | `/leads/`                     | `lead:read:assigned` or `lead:read:all` | List leads (paginated, filterable) |
| `GET`    | `/leads/my-leads`             | `lead:read:assigned`                    | Current user’s leads               |
| `GET`    | `/leads/extra`                | `lead:read:*`                           | Extended lead list                 |
| `GET`    | `/leads/assigned`             | `lead:read:*`                           | Assigned leads view                |
| `GET`    | `/leads/ids`                  | `lead:read:*`                           | Lead IDs only                      |
| `GET`    | `/leads/archived`             | `lead:read:*`                           | Archived/soft-deleted leads        |
| `GET`    | `/leads/:id`                  | `lead:read:*`                           | Single lead detail                 |
| `POST`   | `/leads/`                     | `lead:create`                           | Create new lead(s)                 |
| `PUT`    | `/leads/:id`                  | `lead:update`                           | Update a lead                      |
| `PUT`    | `/leads/:id/status`           | `lead:update`                           | Update lead status                 |
| `PUT`    | `/leads/bulk-update`          | `adminOnly`                             | Bulk update leads                  |
| `PUT`    | `/leads/bulk-status-update`   | `lead:update`                           | Bulk status change                 |
| `DELETE` | `/leads/:id`                  | `lead:delete`                           | Soft delete a lead                 |
| `DELETE` | `/leads/`                     | `lead:delete`                           | Bulk soft delete                   |
| `DELETE` | `/leads/permanent-delete`     | `adminOnly`                             | Permanent delete (all)             |
| `DELETE` | `/leads/permanent-delete/:id` | `adminOnly`                             | Permanent delete (one)             |

**Import & Export:**

| Method | Path                         | Permission    | Description                          |
| ------ | ---------------------------- | ------------- | ------------------------------------ |
| `GET`  | `/leads/import`              | `adminOnly`   | Import history                       |
| `POST` | `/leads/import`              | `adminOnly`   | Import leads (multipart file upload) |
| `POST` | `/leads/import-from-forms`   | `lead:create` | Import from web forms                |
| `POST` | `/leads/import/:id/revert`   | `adminOnly`   | Revert an import                     |
| `GET`  | `/leads/import/:id/progress` | authenticated | Import progress                      |
| `GET`  | `/leads/download/*`          | `adminOnly`   | Download import files                |

**Lead Queue:**

| Method | Path                             | Permission    | Description                  |
| ------ | -------------------------------- | ------------- | ---------------------------- |
| `GET`  | `/leads/queue/current-top`       | `lead:read:*` | Current top-of-queue lead    |
| `GET`  | `/leads/queue/navigate/:lead_id` | `lead:read:*` | Queue navigation context     |
| `POST` | `/leads/currenttop-completed`    | `lead:update` | Mark current queue item done |

**Lead Extras:**

| Method | Path                            | Permission    | Description                     |
| ------ | ------------------------------- | ------------- | ------------------------------- |
| `POST` | `/leads/:id/generate-summary`   | `lead:read:*` | AI-powered lead summary         |
| `POST` | `/leads/bulk-search`            | `lead:read:*` | Search by partner IDs           |
| `PUT`  | `/leads/:id/secondary-email`    | `lead:update` | Manage secondary email          |
| `PUT`  | `/leads/:id/make-primary-email` | `lead:update` | Swap primary email              |
| `PUT`  | `/leads/:id/offer_calls`        | `lead:update` | Increment/decrement offer calls |

---

### Offers (`/offers`)

**Middleware:** `authenticate`, `universalQuery`

| Method   | Path                         | Permission     | Description                      |
| -------- | ---------------------------- | -------------- | -------------------------------- |
| `GET`    | `/offers/`                   | `offer:read:*` | List offers (paginated)          |
| `GET`    | `/offers/progress`           | `offer:read:*` | Offers with pipeline progress    |
| `GET`    | `/offers/progress/:id`       | `offer:read:*` | Single offer progress detail     |
| `GET`    | `/offers/tickets`            | `offer:read:*` | Offer tickets view               |
| `GET`    | `/offers/:id`                | `offer:read:*` | Single offer detail              |
| `GET`    | `/offers/:id/pdf`            | `offer:read:*` | Generate/download offer PDF      |
| `GET`    | `/offers/lead/:leadId`       | `offer:read:*` | Offers for a specific lead       |
| `GET`    | `/offers/project/:projectId` | `offer:read:*` | Offers for a specific project    |
| `POST`   | `/offers/`                   | `offer:create` | Create offer (with file uploads) |
| `PUT`    | `/offers/:id`                | `offer:update` | Update offer (with file uploads) |
| `PUT`    | `/offers/out`                | `offer:update` | Mark offer as “out”              |
| `PUT`    | `/offers/revert-from-out`    | `offer:update` | Revert “out” status              |
| `DELETE` | `/offers/`                   | `offer:delete` | Bulk soft delete                 |
| `POST`   | `/offers/:id/restore`        | `offer:update` | Restore deleted offer            |

**Netto Calculations:**

| Method | Path                      | Permission     | Description                |
| ------ | ------------------------- | -------------- | -------------------------- |
| `POST` | `/offers/:offerId/netto1` | `offer:update` | Create Netto 1 calculation |
| `POST` | `/offers/:offerId/netto2` | `offer:update` | Create Netto 2 calculation |

**Offer Revert Operations:**

| Method | Path                              | Permission    | Description              |
| ------ | --------------------------------- | ------------- | ------------------------ |
| `GET`  | `/offers/:offerId/revert-options` | authenticated | Available revert targets |
| `POST` | `/offers/:offerId/revert/:stage`  | authenticated | Revert to specific stage |
| `POST` | `/offers/:offerId/revert-batch`   | authenticated | Batch revert             |

**Offer Financials:**

| Method | Path                                      | Permission    | Description                |
| ------ | ----------------------------------------- | ------------- | -------------------------- |
| `GET`  | `/offers/:offerId/financials`             | authenticated | Get financial data         |
| `POST` | `/offers/:offerId/financials/initialize`  | `adminOnly`   | Initialize financials      |
| `PUT`  | `/offers/:offerId/financials/investment`  | `adminOnly`   | Update investment details  |
| `PUT`  | `/offers/:offerId/financials/payments`    | `adminOnly`   | Update payment schedule    |
| `PUT`  | `/offers/:offerId/financials/agents`      | `adminOnly`   | Update agent commissions   |
| `POST` | `/offers/:offerId/financials/recalculate` | `adminOnly`   | Recalculate all financials |

**Offer Documents:**

| Method | Path                            | Permission     | Description                |
| ------ | ------------------------------- | -------------- | -------------------------- |
| `GET`  | `/offers/:offerId/documents`    | `offer:read:*` | List documents for offer   |
| `POST` | `/offers/:offerId/documents`    | `offer:update` | Upload document to offer   |
| `GET`  | `/offers/documents/:documentId` | `offer:read:*` | Download specific document |

---

### Openings (`/openings`)

| Method   | Path            | Permission    | Description                |
| -------- | --------------- | ------------- | -------------------------- |
| `GET`    | `/openings/`    | authenticated | List openings              |
| `GET`    | `/openings/:id` | authenticated | Single opening detail      |
| `POST`   | `/openings/`    | authenticated | Create opening (multipart) |
| `PUT`    | `/openings/:id` | authenticated | Update opening (multipart) |
| `DELETE` | `/openings/:id` | authenticated | Delete opening             |

---

### Confirmations (`/confirmations`)

| Method   | Path                         | Permission    | Description                     |
| -------- | ---------------------------- | ------------- | ------------------------------- |
| `GET`    | `/confirmations/`            | authenticated | List confirmations              |
| `GET`    | `/confirmations/:id`         | authenticated | Single confirmation             |
| `POST`   | `/confirmations/`            | authenticated | Create confirmation (multipart) |
| `PUT`    | `/confirmations/:id`         | authenticated | Update confirmation (multipart) |
| `DELETE` | `/confirmations/:id`         | authenticated | Delete confirmation             |
| `POST`   | `/confirmations/:id/restore` | authenticated | Restore deleted confirmation    |

---

### Payment Vouchers (`/payment-vouchers`)

| Method   | Path                    | Permission    | Description                        |
| -------- | ----------------------- | ------------- | ---------------------------------- |
| `GET`    | `/payment-vouchers/`    | authenticated | List payment vouchers              |
| `GET`    | `/payment-vouchers/:id` | authenticated | Single payment voucher             |
| `POST`   | `/payment-vouchers/`    | authenticated | Create payment voucher (multipart) |
| `PUT`    | `/payment-vouchers/:id` | authenticated | Update payment voucher             |
| `DELETE` | `/payment-vouchers/:id` | authenticated | Delete payment voucher             |

---

### Lost Offers (`/lost-offers`)

| Method | Path                      | Permission    | Description                 |
| ------ | ------------------------- | ------------- | --------------------------- |
| `GET`  | `/lost-offers/`           | `adminOnly`   | List all lost offers        |
| `GET`  | `/lost-offers/:id`        | authenticated | Single lost offer detail    |
| `POST` | `/lost-offers/`           | authenticated | Mark offer as lost          |
| `POST` | `/lost-offers/:id/revert` | `adminOnly`   | Revert lost offer to active |

---

### Reclamations (`/reclamations`)

| Method   | Path                            | Permission    | Description                 |
| -------- | ------------------------------- | ------------- | --------------------------- |
| `GET`    | `/reclamations/`                | authenticated | List all reclamations       |
| `GET`    | `/reclamations/my-reclamations` | authenticated | Current user’s reclamations |
| `GET`    | `/reclamations/:id`             | authenticated | Single reclamation detail   |
| `POST`   | `/reclamations/`                | authenticated | Create reclamation          |
| `PATCH`  | `/reclamations/:id`             | authenticated | Update status/response      |
| `DELETE` | `/reclamations/:id`             | `adminOnly`   | Delete reclamation          |

---

### Todos / Tickets (`/todos`)

| Method   | Path                   | Permission    | Description               |
| -------- | ---------------------- | ------------- | ------------------------- |
| `GET`    | `/todos/`              | authenticated | List all todos            |
| `GET`    | `/todos/my-tasks`      | authenticated | Current user’s tasks      |
| `GET`    | `/todos/lead/:leadId`  | authenticated | Todos for a specific lead |
| `GET`    | `/todos/:id`           | authenticated | Single todo detail        |
| `POST`   | `/todos/`              | authenticated | Create todo               |
| `PUT`    | `/todos/:id`           | authenticated | Update todo               |
| `DELETE` | `/todos/:id`           | authenticated | Delete todo               |
| `POST`   | `/todos/:id/assign`    | authenticated | Assign todo to user       |
| `POST`   | `/todos/:id/unassign`  | authenticated | Unassign todo             |
| `POST`   | `/todos/:id/reassign`  | authenticated | Reassign todo             |
| `GET`    | `/todos/board-members` | authenticated | Board member list         |

**Todo Types (`/todo-types`):**

| Method   | Path              | Permission    | Description      |
| -------- | ----------------- | ------------- | ---------------- |
| `GET`    | `/todo-types/`    | authenticated | List todo types  |
| `POST`   | `/todo-types/`    | authenticated | Create todo type |
| `PUT`    | `/todo-types/:id` | authenticated | Update todo type |
| `DELETE` | `/todo-types/:id` | authenticated | Delete todo type |

---

### Lead Assignments (`/assign-leads`)

| Method   | Path                               | Permission    | Description                  |
| -------- | ---------------------------------- | ------------- | ---------------------------- |
| `POST`   | `/assign-leads/`                   | authenticated | Assign lead to agent/project |
| `GET`    | `/assign-leads/project/:projectId` | authenticated | Assignments by project       |
| `GET`    | `/assign-leads/agent/:agentId`     | authenticated | Assignments by agent         |
| `GET`    | `/assign-leads/lead/:leadId`       | authenticated | Assignments for a lead       |
| `PATCH`  | `/assign-leads/:id/status`         | authenticated | Update assignment status     |
| `PATCH`  | `/assign-leads/:id/agent`          | authenticated | Change assigned agent        |
| `POST`   | `/assign-leads/replace`            | authenticated | Replace assignment           |
| `POST`   | `/assign-leads/bulk-replace`       | `adminOnly`   | Bulk replace assignments     |
| `DELETE` | `/assign-leads/:id`                | authenticated | Remove assignment            |
| `GET`    | `/assign-leads/grouped`            | authenticated | Grouped assignment view      |

---

### Filters & Search

**Static Filters (`/filters`):**

| Method | Path                             | Permission    | Description             |
| ------ | -------------------------------- | ------------- | ----------------------- |
| `POST` | `/filters/group-by`              | authenticated | Group data by field     |
| `GET`  | `/filters/tables`                | authenticated | Available filter tables |
| `GET`  | `/filters/tables/:table/options` | authenticated | Options for a table     |
| `POST` | `/filters/group-summary`         | authenticated | Summary statistics      |

**Dynamic Filters (`/dynamic-filters`):**

| Method | Path                        | Permission    | Description                   |
| ------ | --------------------------- | ------------- | ----------------------------- |
| `POST` | `/dynamic-filters/apply`    | authenticated | Apply dynamic filter          |
| `GET`  | `/dynamic-filters/options`  | authenticated | Available filter fields       |
| `POST` | `/dynamic-filters/validate` | authenticated | Validate filter rules         |
| `GET`  | `/dynamic-filters/health`   | public        | Filter engine health          |
| `GET`  | `/dynamic-filters/examples` | authenticated | Example filter configurations |

**Global Search (`/search`):**

| Method | Path                                     | Permission    | Description         |
| ------ | ---------------------------------------- | ------------- | ------------------- |
| `GET`  | `/search/?query=&limit=&page=&entities=` | authenticated | Cross-entity search |

---

### Activities (`/activities`)

| Method | Path                                          | Permission      | Description                    |
| ------ | --------------------------------------------- | --------------- | ------------------------------ |
| `GET`  | `/activities/`                                | `activity:read` | List all activities            |
| `GET`  | `/activities/subject/:subjectType/:subjectId` | `activity:read` | Activities for specific entity |
| `GET`  | `/activities/:id`                             | `activity:read` | Single activity detail         |

---

### Commissions (`/commissions`)

| Method | Path                                   | Permission    | Description               |
| ------ | -------------------------------------- | ------------- | ------------------------- |
| `GET`  | `/commissions/offers`                  | `adminOnly`   | All offer commissions     |
| `GET`  | `/commissions/agents/:agentId/offers`  | authenticated | Agent’s offer commissions |
| `GET`  | `/commissions/agents/:agentId/summary` | authenticated | Agent commission summary  |

---

### Lead Transfer (`/transfer`)

| Method | Path                         | Permission    | Description                   |
| ------ | ---------------------------- | ------------- | ----------------------------- |
| `GET`  | `/transfer/available-agents` | authenticated | Agents available for transfer |
| `GET`  | `/transfer/active-calls`     | authenticated | Active call transfers         |
| `POST` | `/transfer/blind`            | authenticated | Blind transfer                |
| `POST` | `/transfer/attended`         | authenticated | Attended transfer             |
| `POST` | `/transfer/hold`             | authenticated | Hold transfer                 |
| `POST` | `/transfer/resume`           | authenticated | Resume transfer               |

---

### Document Slots (`/document-slots`)

| Method | Path                                      | Permission    | Description            |
| ------ | ----------------------------------------- | ------------- | ---------------------- |
| `GET`  | `/document-slots/metadata`                | authenticated | Document slot metadata |
| `GET`  | `/document-slots/offer/:offerId`          | authenticated | Slots for an offer     |
| `GET`  | `/document-slots/lead/:leadId/last-email` | authenticated | Last email for lead    |

---

### Lead Grouping (`/leads/group`)

| Method | Path                           | Permission    | Description               |
| ------ | ------------------------------ | ------------- | ------------------------- |
| `GET`  | `/leads/group/options`         | authenticated | Available grouping fields |
| `GET`  | `/leads/group/summary`         | authenticated | Grouped summary           |
| `GET`  | `/leads/group/multilevel/*`    | authenticated | Multi-level grouping      |
| `GET`  | `/leads/group/:field`          | authenticated | Group by specific field   |
| `GET`  | `/leads/group/:field/:groupId` | authenticated | Group detail              |

---

## 9. Database Schema & Models

The service uses **MongoDB** with **Mongoose** ODM. All models support multi-tenant isolation.

### Core Models (35 total)

### Lead

The primary entity — represents a potential customer.

| Field                     | Type              | Description                          |
| ------------------------- | ----------------- | ------------------------------------ |
| `contact_name`            | String            | Customer name                        |
| `email_from`              | String            | Primary email                        |
| `phone`                   | String            | Phone number                         |
| `expected_revenue`        | Number            | Projected revenue                    |
| `team_id`                 | ObjectId → Team   | Assigned project/team                |
| `user_id`                 | ObjectId → User   | Assigned agent                       |
| `source_id`               | ObjectId → Source | Lead source (web form, import, etc.) |
| `stage`                   | String            | Current pipeline stage               |
| `status`                  | Mixed             | Lead status                          |
| `active`                  | Boolean           | Soft-delete flag                     |
| `last_email`              | Object            | Embedded latest email data           |
| `temporary_access_agents` | [ObjectId]        | Temp agent access                    |
| `custom_fields`           | Map               | Dynamic custom fields                |
| `voip_extension`          | String            | VoIP extension                       |
| `timestamps`              | Auto              | createdAt, updatedAt                 |

### Offer

A financial proposal tied to a Lead.

| Field               | Type                  | Description                                                        |
| ------------------- | --------------------- | ------------------------------------------------------------------ |
| `title`             | String                | Offer title                                                        |
| `project_id`        | ObjectId → Team       | Project reference                                                  |
| `lead_id`           | ObjectId → Lead       | Parent lead                                                        |
| `agent_id`          | ObjectId → User       | Assigned agent                                                     |
| `created_by`        | ObjectId → User       | Creator                                                            |
| `bank_id`           | ObjectId → Bank       | Bank reference                                                     |
| `investment_volume` | Number                | Investment amount (€)                                              |
| `interest_rate`     | Number                | Interest rate (%)                                                  |
| `payment_terms`     | ObjectId → Settings   | Payment term settings                                              |
| `bonus_amount`      | ObjectId → Settings   | Bonus configuration                                                |
| `files`             | [ObjectId → Document] | Attached documents                                                 |
| `current_stage`     | String                | Pipeline stage (offer/opening/confirmation/payment/netto1/netto2)  |
| `progression`       | Object                | Nested stage tracking (opening/confirmation/payment/netto1/netto2) |
| `out`               | Boolean               | Marked as “out”                                                    |
| `active`            | Boolean               | Soft-delete flag                                                   |
| `offerType`         | String                | Offer category                                                     |
| `financials`        | Object                | Nested commission/payment sub-documents                            |

### Supporting Models

| Model                  | Purpose                            | Key Relationships                          |
| ---------------------- | ---------------------------------- | ------------------------------------------ |
| **Opening**            | Bank account opening record        | → Offer, → Lead                            |
| **Confirmation**       | Signed document record             | → Offer, → Opening, → Lead                 |
| **PaymentVoucher**     | Payment processing record          | → Offer, → Confirmation, → Lead            |
| **Netto1**             | First net calculation              | → Offer                                    |
| **Netto2**             | Final net calculation              | → Offer                                    |
| **Lost**               | Lost offer record with reason      | → Offer                                    |
| **Todo**               | Task/ticket item                   | → Lead, → Offer, → User (assignee)         |
| **Reclamation**        | Dispute/complaint                  | → Lead, → User (agent)                     |
| **Activity**           | Audit log entry                    | → User (creator), polymorphic subject      |
| **AssignLeads**        | Lead-to-agent-project mapping      | → Lead, → User, → Team                     |
| **LeadTransfer**       | Transfer history record            | → Lead, → Team (from/to), → User (from/to) |
| **Document**           | File metadata                      | → S3 key or local path                     |
| **Appointment**        | Scheduled meeting                  | → Lead                                     |
| **ImportHistory**      | Bulk import record                 | → User (importer)                          |
| **QueueTop**           | Agent queue position tracking      | → Lead, → User                             |
| **AgentQueuePosition** | Agent’s position in the lead queue | → User                                     |

### Reference/Config Models

| Model              | Purpose                                     |
| ------------------ | ------------------------------------------- |
| **Bank**           | Financial institution reference             |
| **Team**           | Project/team (used as “project” throughout) |
| **User**           | Agent/admin user (mirrors auth service)     |
| **Source**         | Lead acquisition source                     |
| **Settings**       | Configuration key-value pairs               |
| **Favourite**      | User bookmark/favorite items                |
| **UserInactivity** | Agent inactivity tracking                   |
| **PdfTemplate**    | PDF generation templates                    |
| **GeneratedPdf**   | Generated PDF records                       |

### AI & Task Models

| Model                    | Purpose                              |
| ------------------------ | ------------------------------------ |
| **LeadAIContext**        | AI context for lead analysis         |
| **LeadAISummaryHistory** | History of AI-generated summaries    |
| **Task**                 | Task board task (for dual logging)   |
| **PredefinedSubTask**    | Template sub-tasks                   |
| **Board**                | Kanban board definition              |
| **List**                 | Board list/column                    |
| **TaskServiceActivity**  | Dual activity logging for todo-board |

### Entity Relationship Diagram (Simplified)

```
┌──────────┐      1:N      ┌──────────┐       1:N       ┌──────────┐
│   Team   │◄─────────────│   Lead   │───────────────►│  Offer   │
│ (Project)│               │          │                 │          │
└──────────┘               │          │                 │          │
                           │          │    1:N          │          │
┌──────────┐      N:1      │          │◄───────────────│          │
│  Source  │◄─────────────│          │                 │          │
└──────────┘               │          │                 └─────┬────┘
                           │          │                       │
┌──────────┐      N:1      │          │    1:N          ┌─────▼────┐
│   User   │◄─────────────│          │◄───────────────│ Opening  │
│ (Agent)  │               └──────────┘                 └─────┬────┘
└──────────┘                    │                              │
     │                          │ 1:N                    ┌─────▼────────┐
     │                    ┌─────▼──────┐                 │ Confirmation │
     │    1:N             │   Todo     │                 └─────┬────────┘
     └───────────────────►│  (Ticket)  │                       │
                          └────────────┘                 ┌─────▼──────────┐
                                                         │ PaymentVoucher │
┌──────────────┐          ┌────────────┐                 └─────┬──────────┘
│ Reclamation  │─────────►│    Lead    │                       │
└──────────────┘          └────────────┘                 ┌─────▼────┐
                                                         │  Netto1  │
┌──────────────┐          ┌────────────┐                 └─────┬────┘
│  Activity    │─────────►│  Any Model │                       │
│ (Audit Log)  │          │ (polymorphic)                ┌─────▼────┐
└──────────────┘          └────────────┘                 │  Netto2  │
                                                         └──────────┘
┌──────────────┐
│ AssignLeads  │─────► Lead + User + Team
└──────────────┘

┌──────────────┐
│ LeadTransfer │─────► Lead + Team(from) + Team(to) + User(from) + User(to)
└──────────────┘
```

---

## 10. Event-Driven Workflows

The service uses a **centralized in-process event system** (Node.js `EventEmitter` singleton) to decouple business logic from side effects like notifications and activity logging.

### Event Architecture

```
Controller Action
       │
       ▼
  Business Logic
  (Service Layer)
       │
       ├──► eventEmitter.emit(EVENT_TYPE, data)
       │
       ├──────────────────┬────────────────────┐
       │                  │                    │
       ▼                  ▼                    ▼
  Notification       Activity              (Future)
  Listener           Listener              Listeners
       │                  │
       ▼                  ▼
  HTTP POST to       Write Activity
  Notification        to MongoDB
  Service
```

### Complete Event Catalog

### Lead Events

| Event                      | Trigger                     | Notification          | Activity       |
| -------------------------- | --------------------------- | --------------------- | -------------- |
| `lead:created`             | New lead created            | —                     | Yes            |
| `lead:updated`             | Lead fields changed         | —                     | Yes            |
| `lead:deleted`             | Lead soft-deleted           | —                     | Yes            |
| `lead:assigned`            | Lead assigned to agent      | Yes (to agent)        | Yes            |
| `lead:transferred`         | Lead moved between projects | Yes (to target agent) | Yes            |
| `lead:bulk_transferred`    | Multiple leads moved        | Yes (to target agent) | Yes (per-lead) |
| `lead:status_changed`      | Lead status updated         | —                     | Yes            |
| `lead:restored`            | Lead restored from trash    | —                     | Yes            |
| `lead:permanently_deleted` | Lead permanently removed    | —                     | Yes            |

### Offer Events

| Event                         | Trigger                | Notification                     | Activity |
| ----------------------------- | ---------------------- | -------------------------------- | -------- |
| `offer:created`               | New offer created      | Yes (role-based) + Auto-Ticket   | —        |
| `offer:updated`               | Offer modified         | Yes (to admins if agent-updated) | —        |
| `offer:deleted`               | Offer soft-deleted     | —                                | Yes      |
| `offer:restored`              | Offer restored         | —                                | Yes      |
| `offer:netto1_sent`           | Netto 1 generated      | Yes (role-based)                 | —        |
| `offer:netto2_sent`           | Netto 2 generated      | Yes (role-based)                 | —        |
| `offer:netto1_reverted`       | Netto 1 reverted       | —                                | Yes      |
| `offer:netto2_reverted`       | Netto 2 reverted       | —                                | Yes      |
| `offer:lost`                  | Offer marked as lost   | —                                | Yes      |
| `offer:lost_reverted`         | Lost offer restored    | —                                | Yes      |
| `offer:payment_reverted`      | Payment stage reverted | —                                | Yes      |
| `offer:confirmation_reverted` | Confirmation reverted  | —                                | Yes      |
| `offer:opening_reverted`      | Opening reverted       | —                                | Yes      |

### Pipeline Events

| Event                     | Trigger               | Notification     | Activity |
| ------------------------- | --------------------- | ---------------- | -------- |
| `opening:created`         | New opening           | Yes (role-based) | —        |
| `opening:updated`         | Opening modified      | —                | Yes      |
| `opening:deleted`         | Opening removed       | —                | Yes      |
| `confirmation:created`    | New confirmation      | Yes (role-based) | —        |
| `confirmation:updated`    | Confirmation modified | —                | Yes      |
| `confirmation:deleted`    | Confirmation removed  | —                | Yes      |
| `payment_voucher:created` | New payment           | Yes (role-based) | —        |
| `payment_voucher:updated` | Payment modified      | —                | Yes      |
| `payment_voucher:deleted` | Payment removed       | —                | Yes      |

### Todo Events

| Event             | Trigger          | Notification      | Activity |
| ----------------- | ---------------- | ----------------- | -------- |
| `todo:created`    | New todo/ticket  | Yes (to assignee) | —        |
| `todo:assigned`   | Todo assigned    | Yes (to assignee) | —        |
| `todo:completed`  | Todo marked done | Yes (to admins)   | —        |
| `todo:unassigned` | Todo unassigned  | —                 | —        |
| `todo:reassigned` | Todo reassigned  | —                 | —        |

### Other Events

| Event                 | Trigger                | Notification | Activity |
| --------------------- | ---------------------- | ------------ | -------- |
| `reclamation:created` | Dispute filed          | —            | Yes      |
| `reclamation:updated` | Dispute status changed | —            | Yes      |
| `appointment:created` | Meeting scheduled      | —            | Yes      |
| `appointment:updated` | Meeting modified       | —            | Yes      |
| `appointment:deleted` | Meeting cancelled      | —            | Yes      |

### Auto-Ticket Creation Flow (Offer → Todo)

When an offer is created, the notification listener automatically creates a Todo (ticket):

```
OFFER.CREATED event
       │
       ▼
  Calculate priority from investment_volume
       │
       ├── €100,000+  → priority 5
       ├── €50,000+   → priority 4
       ├── €20,000+   → priority 3
       └── <€20,000   → priority 2
       │
       ▼
  Create Todo {
    creator_id: creator._id,
    lead_id: lead._id,
    offer_id: offer._id,
    message: 'Offer "Title" - €50,000 at 5% for Lead Name',
    type: 'Ticket',
    priority: <calculated>,
    isDone: false,
    admin_only: true (if admin created)
  }
```

---

## 11. Service-to-Service Communication

### Communication Matrix

```
                        ┌──────┬────────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐
                        │Auth  │Config  │Email │Notif │Search│PDF   │Cash  │Todo  │Report│
    ┌───────────────────┼──────┼────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
    │Lead-Offer Service │JWT   │ ◄►HTTP │SH-DB │►HTTP │►HTTP │►HTTP │SH-DB │SH-DB │SCHEMA│
    └───────────────────┼──────┼────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┘
                        └──────┴────────┴──────┴──────┴──────┴──────┴──────┴──────┘

Legend: ►HTTP = outbound REST calls       JWT = shared JWT verification
        SH-DB = shared MongoDB collections
        ◄►HTTP = bidirectional REST       SCHEMA = schema registry publication
```

### Outbound HTTP Calls

### To Notification Service (`POST /notifications/microservice-send`)

**Request format:**

```json
{
  "eventType": "offer:created",
  "notification": {
    "id": "offer_created_<offerId>_<timestamp>",
    "type": "offer_created",
    "category": "offers",
    "priority": "high",
    "title": "New Offer Created",
    "message": "Offer created for lead\"John\" - €50,000 at 5% interest",
    "data": {
      "external_id": "offer_created_<offerId>",
      "offer": { "id": "...", "title": "...", "investment_volume": 50000 },
      "lead": { "id": "...", "contact_name": "John" },
      "creator": { "id": "...", "login": "agent1" },
      "project": { "id": "...", "name": "Project A" },
      "metadata": { "timestamp": "...", "amount": "50000", "bank": "..." }
    },
    "timestamp": "2026-03-25T10:00:00.000Z",
    "read": false
  },
  "targetRole": "Admin"
}
```

**Routing logic:**

- If an **agent** creates an offer → notify all **Admins** (`targetRole: 'Admin'`)
- If an **admin** creates an offer → notify the **assigned agent** (`targetUserId: agentId`)

### To Search Service (`POST /api/search`)

Used by the `universalQuery` middleware for advanced search/filter operations.

### To Configuration Service

Called during project closure and assignment workflows.

### To PDF Service

Called by `autoPdfGeneration.js` for automatic PDF generation.

### Inbound HTTP (from other services)

| Source                | Endpoint Called              | Purpose                                |
| --------------------- | ---------------------------- | -------------------------------------- |
| Configuration Service | Various lead/offer endpoints | Assignment & project closure workflows |

### Shared Database Pattern

The following services share MongoDB collections with the Lead-Offer Service:

| Service            | Shared Collections                    | Access Pattern |
| ------------------ | ------------------------------------- | -------------- |
| Email Service      | Lead, Offer, Activity, Document, Todo | Read & Write   |
| Cashflow Service   | Offer, Bank                           | Read & Write   |
| Todo Board Service | Activity (via dual logging)           | Read & Write   |

### Schema Registry

On startup, the service publishes all Mongoose model schemas to a `schema_registry` MongoDB collection. The Search Service reads this registry to build dynamic query capabilities. Lead-Offer Service schemas have **priority 100** (highest), ensuring they win name conflicts.

---

## 12. Authentication & Authorization

### JWT Authentication

Every protected endpoint validates a JWT from the `Authorization: Bearer <token>` header.

**Token verification flow:**

```
Request arrives
     │
     ▼
Extract token from Authorization header
     │
     ▼
Verify JWT with JWT_SECRET
     │
     ▼
Load user from database
     │
     ▼
Check UserSession (if sessionId in token)
     │
     ├── Session invalid → 401
     │
     ▼
Check UserInactivity
     │
     ├── Agent inactive → 423 Locked
     │
     ▼
Attach req.user → next()
```

### Permission-Based Authorization

Permissions are string-based (e.g., `lead:read:all`) and cached in **Redis** for performance.

**Permission hierarchy examples:**

```
lead:read:assigned   → Can read only leads assigned to them
lead:read:all        → Can read all leads
lead:create          → Can create new leads
lead:update          → Can update leads
lead:delete          → Can soft-delete leads
offer:create         → Can create offers
offer:update         → Can update offers
activity:read        → Can view activity logs
```

**Role shortcuts:**

- `adminOnly` — only users with Admin role
- `adminOrProviderOnly` — Admin or Provider roles
- `requireAuth` — any authenticated user

### Socket.IO Authentication

Socket connections use the same JWT, extracted from `handshake.auth.token` or `handshake.query.token`.

---

## 13. Real-Time Features (Socket.IO)

### Connection

```jsx
const socket = io('http://localhost:4003', {
  auth: { token: '<JWT_TOKEN>' },
});
```

### Rooms

| Room Pattern        | Purpose                            |
| ------------------- | ---------------------------------- |
| `user:<userId>`     | Per-user notifications and updates |
| `import:<importId>` | Real-time import progress tracking |

### Events

| Event                | Direction       | Payload                                            | Description                      |
| -------------------- | --------------- | -------------------------------------------------- | -------------------------------- |
| `subscribe:import`   | Client → Server | `{ importId }`                                     | Subscribe to import progress     |
| `unsubscribe:import` | Client → Server | `{ importId }`                                     | Unsubscribe from import progress |
| `import:progress`    | Server → Client | `{ importId, progress, total, processed, errors }` | Real-time import progress        |

### Import Progress Flow

```
Client uploads CSV
       │
       ▼
  importQueue processes rows
       │
       ├── Every N rows:
       │      socket.to('import:<id>').emit('import:progress', {
       │        progress: 45,
       │        total: 1000,
       │        processed: 450,
       │        errors: 2
       │      })
       │
       ▼
  Import complete
       │
       ▼
  Final progress event (100%)
```

---

## 14. Deployment & Environment Setup

### Environment Variables

Create a `.env` file based on `.env.example`:

```
# Server
NODE_ENV=development          # development | production
PORT=4003                     # Service port

# Database
MONGODB_URI=mongodb://localhost:27017/leadpylot

# Security
JWT_SECRET=<strong-random-secret>

# Microservice URLs
USER_AUTH_SERVICE_URL=http://localhost:4000
DOCUMENT_SERVICE_URL=http://localhost:4002
CONFIGURATION_SERVICE_URL=http://localhost:4006
NOTIFICATION_SERVICE_URL=http://localhost:4004
SEARCH_SERVICE_URL=http://localhost:3010

# Frontend
FRONTEND_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3001

# Logging
LOG_LEVEL=info                # error | warn | info | http | debug

# Optional: AI Features
# OPENAI_API_KEY=sk-...
# OPENAI_LEAD_SUMMARY_MODEL=gpt-4o-mini
# OPENAI_LEAD_SUMMARY_TIMEOUT=30000
# LEADBOT_CONVERSATION_URL=http://localhost:8000
# LEADBOT_CONVERSATION_TIMEOUT=30000
```

### Docker Deployment

The service is containerized and orchestrated via Docker Compose from the project root.

**Service Dependencies:**

- MongoDB (shared instance)
- Redis (for RBAC caching)
- All peer microservices (for full functionality)

**Service Ports (Full Platform):**

| Service        | Port     |
| -------------- | -------- |
| User Auth      | 4000     |
| Document       | 4002     |
| **Lead-Offer** | **4003** |
| Notification   | 4004     |
| Configuration  | 4006     |
| Reporting      | 4007     |
| Email          | 4008     |
| PDF            | 4009     |
| Search         | 3010     |
| Cashflow       | 4011     |
| Todo Board     | 5001     |

### Running Locally

```bash
# Install dependencies
cd lead-offer-service-api
npm install

# Set up environment
cp .env.example .env
# Edit .env with your values

# Run in development mode (with hot reload)
npm run dev

# Run in production mode
npm start
```

### Running with Docker

```bash
# From project root (starts all services)
docker-compose up -d

# Or build and run just this service
cd lead-offer-service-api
docker build -t lead-offer-service .
docker run -p 4003:4003 --env-file .env lead-offer-service
```

### Migration Scripts

```bash
# Add performance indexes
npm run migrate:indexes

# Migrate lead source snapshots
npm run migrate:source-snapshots
```

### Health Check

```bash
curl http://localhost:4003/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "lead-offers-service",
  "timestamp": "2026-03-25T10:00:00.000Z",
  "uptime": 3600
}
```

### Startup Sequence

```
1. Load environment variables (dotenv)
2. Connect to MongoDB
3. Set up notification event listeners
4. Set up activity event listeners
5. Initialize import queue with Socket.IO
6. Publish schemas to schema registry
7. Start HTTP + Socket.IO server on PORT
```

### Rate Limiting

- **Default:** 1000 requests per 15-minute window per IP
- Configurable via `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS`

### CORS

- Allowed origins configured via `CORS_ORIGIN` (comma-separated)
- Development mode allows `localhost` origins automatically

### Logging

Structured JSON logging via Winston:

```json
{
  "level": "info",
  "message": "Offer creation notification sent to admins",
  "offerId": "64f...",
  "leadId": "64e...",
  "timestamp": "2026-03-25T10:00:00.000Z"
}
```

Log levels: `error` → `warn` → `info` → `http` → `debug`

---

## Appendix A: Error Response Format

All API errors follow a consistent format:

```json
{
  "error": true,
  "message": "Human-readable error description",
  "trace_id": "unique-trace-id",
  "errors": []
}
```

### Error Codes

| HTTP Status | Meaning                           |
| ----------- | --------------------------------- |
| 400         | Validation error / bad request    |
| 401         | Missing or invalid JWT token      |
| 403         | Insufficient permissions          |
| 404         | Resource not found                |
| 423         | Agent account locked (inactivity) |
| 429         | Rate limit exceeded               |
| 500         | Internal server error             |

Mongoose-specific errors (duplicate key, cast error, validation) are automatically mapped to appropriate HTTP status codes by the global error handler.

---

## Appendix B: Complete Data Flow — Offer Lifecycle

```
                                    ┌─────────────────────────────────────────┐
                                    │            COMPLETE OFFER LIFECYCLE     │
                                    └─────────────────────────────────────────┘

  Agent/Admin                Lead-Offer Service              Side Effects
  ──────────                 ───────────────────              ────────────
       │                            │                              │
  POST /offers/              ──►    │                              │
  { lead_id, bank_id,              │                              │
    investment_volume,              ▼                              │
    interest_rate, ... }    Create Offer in DB                    │
                                    │                              │
                             emit('offer:created')                │
                                    │                              │
                                    ├──────► Notification ────────► Admin/Agent notified
                                    │        Listener              │
                                    │                              │
                                    ├──────► Auto-Ticket ─────────► Todo created (priority
                                    │        Creation              │  based on €amount)
                                    │                              │
  POST /openings/            ──►    │                              │
  { offer_id, lead_id, ... }       ▼                              │
                            Create Opening                        │
                            Update Offer.progression              │
                             emit('opening:created')              │
                                    ├──────► Notification ────────► Agent notified
                                    │                              │
  POST /confirmations/       ──►    │                              │
  { offer_id, opening_id }         ▼                              │
                            Create Confirmation                   │
                            Update Offer.progression              │
                             emit('confirmation:created')         │
                                    ├──────► Notification ────────► Agent notified
                                    │                              │
  POST /payment-vouchers/    ──►    │                              │
  { offer_id, confirm_id }         ▼                              │
                            Create PaymentVoucher                 │
                            Update Offer.progression              │
                             emit('payment_voucher:created')      │
                                    ├──────► Notification ────────► Agent notified
                                    │                              │
  POST /offers/:id/netto1   ──►    │                              │
  { rates, amounts }               ▼                              │
                            Create Netto1 record                  │
                            Update Offer stage                    │
                             emit('offer:netto1_sent')            │
                                    ├──────► Notification ────────► Admin/Agent notified
                                    │                              │
  POST /offers/:id/netto2   ──►    │                              │
  { final rates/amounts }          ▼                              │
                            Create Netto2 record                  │
                            Update Offer stage                    │
                             emit('offer:netto2_sent')            │
                                    ├──────► Notification ────────► Admin/Agent notified
                                    │                              │
                                    ▼                              │
                            ═══ DEAL COMPLETE ═══                  │
                                                                   │
                            Cashflow Service picks up ────────────► Financial tracking
                            from shared Offer collection           │
```

---

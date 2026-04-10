# Notification Service - Technical Documentation

## Overview

The Notification Service is a **microservice** responsible for managing all notifications in the LeadPylot CRM system. It handles real-time notifications via WebSocket, email notifications, Telegram bot messages, and maintains notification history and preferences.

### Key Technologies

- **Node.js** + **Express.js** - Web framework
- **MongoDB** + **Mongoose** - Database
- **Socket.IO** - Real-time WebSocket communication
- **Redis** - Caching and session management
- **node-telegram-bot-api** - Telegram integration
- **Docker** - Containerization

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Notification Service (Port 4004)                │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Routes     │  │ Controllers  │  │ Middleware   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │              │
│         ▼                 ▼                 ▼              │
│  ┌──────────────────────────────────────────────────┐     │
│  │              Services Layer                      │     │
│  │  • RealtimeNotificationService                   │     │
│  │  • TelegramBotService                            │     │
│  │  • NotificationService                           │     │
│  │  • RuleService                                   │     │
│  └──────────────────────────────────────────────────┘     │
│         │                                                 │
│         ▼                                                 │
│  ┌──────────────────────────────────────────────────┐     │
│  │              Data Layer                          │     │
│  │  • MongoDB (Notifications, Rules, Logs)          │     │
│  │  • Redis (Cache, Sessions)                       │     │
│  └──────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐
    │Socket.IO│ │ Telegram│ │  Email  │
    │   (WS)  │ │   Bot   │ │ Service │
    └─────────┘ └─────────┘ └─────────┘
```

### Request Flow

```
Client Request → API Gateway → Notification Service
                                      ↓
                              Authentication Check
                                      ↓
                              Permission Validation
                                      ↓
                              Business Logic (Services)
                                      ↓
                              Database Operations
                                      ↓
                              Real-time Emission (Socket.IO)
                                      ↓
                              External Delivery (Telegram/Email)
```

---

## Setup & Installation

### Prerequisites

- Node.js >= 16.x
- MongoDB >= 4.4
- Redis >= 6.x
- Docker & Docker Compose (optional)

### Local Development Setup

1. **Clone the repository**

```bash
git clone <repository-url>
cd notification-service-api
```

1. **Install dependencies**

```bash
npm install
```

1. **Configure environment variables**

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```
# Server
PORT=4004
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/leadpylot-notifications

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Microservice Secret (for inter-service communication)
MICROSERVICE_SECRET=your-secret-key

# Telegram Bot (optional)
TELEGRAM_BOT_TOKEN=your-bot-token

# CORS
CORS_ORIGIN=http://localhost:3001
```

1. **Start MongoDB and Redis**

```bash
# Using Docker Compose
docker-compose up -d mongodb redis

# Or run locally
mongodb # (your local mongo command)
redis-server
```

1. **Start the development server**

```bash
npm run dev
```

1. **Verify health check**

```bash
curl http://localhost:4004/health
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f notification-service

# Stop services
docker-compose down
```

---

## Project Structure

```
notification-service-api/
├── src/
│   ├── app.js                      # Main application entry point
│   ├── config/                     # Configuration files
│   │   ├── database.js            # MongoDB connection
│   │   └── redis.js               # Redis connection
│   │
│   ├── controllers/                # Route controllers
│   │   ├── notificationController.js
│   │   ├── notificationRuleController.js
│   │   └── notificationAudioController.js
│   │
│   ├── routes/                     # API routes
│   │   ├── notifications.js       # Main notification routes
│   │   ├── notificationRules.js   # Notification rules routes
│   │   ├── notificationAudio.js   # Audio file routes
│   │   ├── telegramBot.js         # Telegram bot routes
│   │   └── botWebhook.js          # Bot webhook routes
│   │
│   ├── services/                   # Business logic
│   │   ├── notificationService.js
│   │   ├── realtimeNotificationService.js
│   │   ├── telegramBotService.js
│   │   ├── ruleService.js
│   │   ├── recipientResolver.js
│   │   ├── schemaPublisher.js
│   │   │
│   │   ├── notificationSystem/    # Modular notification system
│   │   │   ├── core/
│   │   │   │   ├── BaseNotificationHandler.js
│   │   │   │   ├── DeliveryService.js
│   │   │   │   ├── NotificationFactory.js
│   │   │   │   └── NotificationTypes.js
│   │   │   ├── handlers/
│   │   │   │   ├── AuthenticationHandler.js
│   │   │   │   ├── ProjectHandler.js
│   │   │   │   └── SystemHandler.js
│   │   │   ├── utils/
│   │   │   │   ├── MessageFormatter.js
│   │   │   │   ├── DataAggregator.js
│   │   │   │   └── Validator.js
│   │   │   └── enterprise/
│   │   │       ├── NotificationAnalytics.js
│   │   │       ├── NotificationBatch.js
│   │   │       └── NotificationPreferences.js
│   │   │
│   │   └── microserviceNotification/  # Microservice handlers
│   │       ├── orchestrator.js
│   │       ├── dataBuilder.js
│   │       ├── normalizePayload.js
│   │       ├── eventTypeMapper.js
│   │       └── ...
│   │
│   ├── models/                     # Database models
│   │   ├── Notification.js
│   │   ├── NotificationRule.js
│   │   ├── NotificationReadReceipt.js
│   │   ├── DeliveryLog.js
│   │   └── ...
│   │
│   ├── middleware/                 # Express middleware
│   │   ├── authenticate.js        # JWT authentication
│   │   ├── authorize.js           # Role-based authorization
│   │   ├── permissions.js         # Permission checking
│   │   ├── errorHandler.js        # Error handling
│   │   └── socketAuth.js          # Socket.IO authentication
│   │
│   ├── listeners/                  # Event listeners
│   │   └── emailSystemListener.js
│   │
│   ├── helpers/                    # Utility functions
│   │   ├── logger.js
│   │   └── errorHandler.js
│   │
│   └── utils/                      # Utilities
│       └── io.js                   # Socket.IO instance
│
├── scripts/                        # Utility scripts
│   ├── seed-notification-rules.js
│   └── update-bot-notification-types.js
│
├── docs/                          # Documentation
│   ├── NOTIFICATION_ARCHITECTURE.md
│   └── NOTIFICATION_RULES_API_POSTMAN.md
│
├── tests/                         # Test files (if added)
├── .env                           # Environment variables
├── .env.example                   # Environment template
├── Dockerfile                     # Docker configuration
├── docker-compose.yml             # Docker Compose configuration
├── package.json                   # Dependencies
└── README.md                      # Project overview
```

---

## Core Services

### 1. RealtimeNotificationService

**Location:** `src/services/realtimeNotificationService.js`

**Purpose:** Manages real-time notification delivery via Socket.IO and database persistence.

**Key Methods:**

```jsx
// Initialize service with Socket.IO instance
initialize(io);

// Send custom notification
sendCustomNotification(type, data, targetUsers, targetRoles);

// Get available notification types
getAvailableNotificationTypes();

// Validate notification type
isValidNotificationType(type);
```

**Usage Example:**

```jsx
const realtimeNotificationService = require('./services/realtimeNotificationService');

// Send notification to specific users
await realtimeNotificationService.sendCustomNotification(
  'lead_created',
  { leadName: 'John Doe', projectName: 'Sales Q1' },
  ['userId1', 'userId2'], // target users
  ['Admin'] // target roles
);
```

---

### 2. TelegramBotService

**Location:** `src/services/telegramBotService.js`

**Purpose:** Manages Telegram bot integration with multi-bot support.

**Features:**

- Multi-bot support (main bot + email-dedicated bot)
- Webhook for receiving messages
- Inline keyboards with quick-action buttons
- Message routing and callbacks
- Bot configuration reload

**Key Methods:**

```jsx
// Initialize bot with token
initialize(token, botConfig);

// Send message to user
sendMessage(chatId, message, options);

// Send notification with action buttons
sendNotificationWithActions(user, notification);

// Get cached updates
getCachedUpdates(limit);
```

---

### 3. NotificationService

**Location:** `src/services/notificationService.js`

**Purpose:** Core notification business logic and database operations.

**Key Methods:**

```jsx
// Create notification
createNotification(data, userId);

// Get notifications with filters
getNotifications(query, user);

// Mark as read
markAsRead(notificationId, userId);

// Delete notification
deleteNotification(notificationId, userId);
```

---

### 4. RuleService

**Location:** `src/services/ruleService.js`

**Purpose:** Evaluates notification rules and determines if notifications should be sent based on user preferences.

**Key Methods:**

```jsx
// Check if notification should be sent based on rules
shouldSendNotification(eventType, user, data);

// Get applicable rules for event
getRulesForEvent(eventType);
```

---

### 5. DeliveryService

**Location:** `src/services/notificationSystem/core/DeliveryService.js`

**Purpose:** Handles notification delivery through multiple channels.

**Delivery Channels:**

- **Web (Socket.IO)** - Real-time push to connected clients
- **Telegram** - Push to Telegram app
- **Email** - Email notifications (if integrated)

**Key Methods:**

```jsx
// Send to user's Socket.IO room
sendToUserSocket(userId, notification);

// Send to user's Telegram
sendToUserTelegram(user, notification, requireAction);

// Send to role-based rooms
sendToRole(role, notification);

// Send to all connected clients
broadcast(notification);
```

---

## API Endpoints

### Notification Endpoints

### Get All Notifications

```
GET /notifications
Authorization: Bearer <token>

Query Parameters:
- page: number (default: 1)
- limit: number (default: 50, max: 100)
- search: string (filter by content)
- sort: string (createdAt, updatedAt)
- order: string (asc, desc)
- project_id: MongoDB ObjectId
- lead_id: MongoDB ObjectId
- type: string
- read: boolean
- category: string (leads, offers, email, auth, project, task, document, system)
- dateRange: string (all, today, yesterday, week, month)
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "60f1b2b3c4d5e6f7a8b9c0d1",
      "type": "lead_created",
      "category": "leads",
      "read": false,
      "metadata": {
        "subject": "New Lead Created",
        "body": "Lead John Doe has been created",
        "priority": "high",
        "lead_id": "60f1b2b3c4d5e6f7a8b9c0d2"
      },
      "info": {
        "user_id": "60f1b2b3c4d5e6f7a8b9c0d3",
        "project_id": "60f1b2b3c4d5e6f7a8b9c0d4"
      },
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 50,
    "pages": 2
  }
}
```

### Get Unread Count

```
GET /notifications/unread-count
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": { "count": 5 }
}
```

### Mark as Read

```
PATCH /notifications/:id/read
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Notification marked as read"
}
```

### Mark Multiple as Read

```
PATCH /notifications/read
Authorization: Bearer <token>
Content-Type: application/json

{
  "notificationIds": ["id1", "id2", "id3"]
}

Response:
{
  "success": true,
  "message": "3 notifications marked as read"
}
```

### Create Notification

```
POST /notifications
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "custom_notification",
  "category": "system",
  "metadata": {
    "subject": "Custom Notification",
    "body": "This is a custom notification",
    "priority": "medium"
  },
  "info": {
    "user_id": "target_user_id"
  }
}
```

---

### Notification Rules Endpoints

### Get All Rules

```
GET /notification-rules
Authorization: Bearer <token>

Query Parameters:
- category: string (filter by category)
- eventType: string (filter by event type)
- enabled: boolean (filter by status)
- scope: string (global, project)

Response:
{
  "success": true,
  "data": [
    {
      "_id": "60f1b2b3c4d5e6f7a8b9c0d1",
      "eventType": "lead_created",
      "displayName": "Lead Created",
      "category": "leads",
      "enabled": true,
      "priority": "high",
      "channels": ["web", "telegram"],
      "audioId": null
    }
  ]
}
```

### Create Rule

```
POST /notification-rules
Authorization: Bearer <token>
Content-Type: application/json

{
  "eventType": "custom_event",
  "displayName": "Custom Event",
  "category": "other",
  "enabled": true,
  "priority": "medium",
  "channels": ["web", "telegram"]
}
```

### Toggle Rule

```
PATCH /notification-rules/:id/toggle
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "enabled": false
  }
}
```

### Test Rule

```
POST /notification-rules/:id/test
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Test notification sent",
  "notification": { ... }
}
```

---

### Notification Audio Endpoints

### Upload Audio

```
POST /notification-audio/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data

audio: <audio-file>

Response:
{
  "success": true,
  "data": {
    "audioId": "60f1b2b3c4d5e6f7a8b9c0d1",
    "filename": "notification.mp3",
    "url": "/uploads/audio/notification.mp3"
  }
}
```

### Attach Existing Audio

```
POST /notification-audio/:id/attach
Authorization: Bearer <token>
Content-Type: application/json

{
  "audioId": "60f1b2b3c4d5e6f7a8b9c0d1"
}
```

### Stream Audio

```
GET /notification-audio/:id/stream
Authorization: Bearer <token>

Response: Audio file stream
```

### Get Audio by Category

```
GET /notification-audio/category/:category
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "_id": "audio_id",
      "filename": "lead_created.mp3",
      "mimetype": "audio/mpeg"
    }
  ]
}
```

---

### Telegram Bot Endpoints

### Get Bot Status

```
GET /api/telegram-bot/status

Response:
{
  "success": true,
  "data": {
    "initialized": true,
    "bot_name": "LeadPylot Bot",
    "bot_username": "leadpylot_bot",
    "is_active": true,
    "cached_updates_count": 150
  }
}
```

### Get Cached Updates

```
GET /api/telegram-bot/updates?limit=100

Response:
{
  "success": true,
  "bot_info": { ... },
  "updates": [
    {
      "update_id": 123456789,
      "message": { ... }
    }
  ],
  "total": 100
}
```

### Send Test Notification

```
POST /api/telegram-bot/test-notification

Response:
{
  "success": true,
  "message": "Test notification sent to 5 users",
  "results": [ ... ]
}
```

---

## Microservice Integration

The Notification Service provides a **microservice endpoint** that allows other services in the LeadPylot ecosystem to trigger notifications without direct dependencies. This is the primary integration point for cross-service communication.

### Microservice Endpoint

**POST /notifications/microservice-send**

This endpoint allows other microservices to send notifications by:

1. Providing an event type and event data
2. Optionally providing a pre-built notification object
3. Specifying target recipients (by user ID or role)

**Authentication:**

- Uses shared secret via `x-microservice-secret` or `x-gateway-secret` header
- Bypasses normal JWT authentication (for inter-service communication)
- Validates secret in production environment

### Request Format

### Option 1: Event-Based Notification (Recommended)

Send an event type with event data. The notification service will:

- Build the notification automatically
- Apply notification rules
- Emit internal events for handlers
- Persist and deliver to recipients

```
POST /notifications/microservice-send
x-microservice-secret: your-shared-secret
Content-Type: application/json

{
  "eventType": "offer:created",
  "eventData": {
    "offer": {
      "_id": "60f1b2b3c4d5e6f7a8b9c0d1",
      "title": "Investment Offer",
      "investment_volume": 50000,
      "interest_rate": 3.5
    },
    "lead": {
      "_id": "60f1b2b3c4d5e6f7a8b9c0d2",
      "contact_name": "John Doe"
    },
    "creator": {
      "_id": "60f1b2b3c4d5e6f7a8b9c0d3",
      "login": "agent smith",
      "role": "Agent"
    }
  },
  "targetUserId": "recipient_user_id",
  "targetRole": "Admin"
}
```

### Option 2: Pre-Built Notification

Send a complete notification object. The notification service will:

- Skip event emission
- Persist to database
- Deliver to specified recipients

```
POST /notifications/microservice-send
x-microservice-secret: your-shared-secret
Content-Type: application/json

{
  "notification": {
    "id": "custom_notification_123",
    "type": "custom_event",
    "category": "system",
    "priority": "high",
    "title": "Custom Notification",
    "message": "Something important happened",
    "data": {
      "metadata": {
        "timestamp": "2024-01-15T10:30:00.000Z"
      }
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "read": false
  },
  "targetUserId": "user_id_123",
  "targetRole": "Admin"
}
```

### Response

```json
{
  "success": true,
  "message": "Notification created and sent via WebSocket",
  "notificationId": "60f1b2b3c4d5e6f7a8b9c0d1",
  "saved": true
}
```

### Supported Event Types

The notification service supports the following event types via the microservice endpoint:

### Authentication Events

- `auth:login` - Agent login (notifies admins)
- `auth:logout` - Agent logout (notifies admins)

### Lead Events

- `lead:assigned` - Lead assigned to agent
- `lead:transferred` - Lead transferred between projects/agents
- `lead:bulk_transferred` - Bulk lead transfer

### Offer Events

- `offer:created` - New offer created
- `offer:updated` - Offer updated by agent
- `offer:netto1_sent` - Netto 1 document sent
- `offer:netto2_sent` - Netto 2 document sent

### Project Events

- `project:created` - New project created

### Office Events

- `office:created` - Office created
- `office:member_assigned` - Member assigned to office

### Opening Events

- `opening:created` - New opening created

### Confirmation Events

- `confirmation:created` - New confirmation created

### Payment Events

- `payment_voucher:created` - New payment voucher created

### Todo Events

- `todo:created` - New todo/ticket created
- `todo:assigned` - Todo assigned to user
- `todo:completed` - Todo completed

### Email Events

- `email:received` - New email received
- `email:matched` - Email matched to lead

### Integration Examples

### Example 1: User-Auth Service Sends Login Notification

```jsx
// In user-auth-service-api
const axios = require('axios');
const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4004';

eventEmitter.on('auth:login', async (data) => {
  const { user, ipAddress } = data;

  // Only notify for agent logins
  if (user.role !== 'Agent') return;

  await axios.post(`${notificationServiceUrl}/notifications/microservice-send`, {
    eventType: 'auth:login',
    notification: {
      id: `agent_login_${user._id}_${Date.now()}`,
      type: 'agent_login',
      title: 'Agent Login Alert',
      message: `Agent${user.login} has logged in`,
      data: {
        agent: {
          id: user._id,
          login: user.login,
          name: user.name,
        },
      },
    },
    targetRole: 'Admin', // Send to all admins
  });
});
```

### Example 2: Lead-Offer Service Sends Offer Creation Notification

```jsx
// In lead-offer-service-api
const axios = require('axios');
const notificationServiceUrl =
  process.env.NOTIFICATION_SERVICE_URL || 'http://host.docker.internal:4004';

eventEmitter.on('offer:created', async (data) => {
  const { offer, creator, lead } = data;

  // If agent created offer, notify admins
  if (creator.role === 'Agent') {
    await axios.post(`${notificationServiceUrl}/notifications/microservice-send`, {
      eventType: 'offer:created',
      notification: {
        id: `offer_created_${offer._id}_${Date.now()}`,
        type: 'offer_created',
        category: 'offers',
        priority: 'high',
        title: 'New Offer Created',
        message: `Offer created for lead "${lead.contact_name}" - €${offer.investment_volume}`,
        data: {
          offer: { id: offer._id, investment_volume: offer.investment_volume },
          lead: { id: lead._id, contact_name: lead.contact_name },
        },
      },
      targetRole: 'Admin',
    });
  }
  // If admin created offer, notify assigned agent
  else {
    await axios.post(`${notificationServiceUrl}/notifications/microservice-send`, {
      eventType: 'offer:created',
      notification: {
        id: `offer_created_${offer._id}_${Date.now()}`,
        type: 'offer_created',
        category: 'offers',
        priority: 'high',
        title: 'New Offer Created',
        message: `Offer created for your lead "${lead.contact_name}"`,
        data: {
          offer: { id: offer._id, investment_volume: offer.investment_volume },
          lead: { id: lead._id, contact_name: lead.contact_name },
        },
      },
      targetUserId: offer.agent_id, // Specific agent
    });
  }
});
```

### Example 3: Email Service Sends Email Matched Notification

```jsx
// In email-service-api
const http = require('http');
const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4004';

async function notifyEmailMatched({ emailRecord, leadMatchResult }) {
  const leadId = leadMatchResult.lead._id;
  const emailId = emailRecord._id;
  const postData = JSON.stringify({
    eventType: 'email:matched',
    notification: {
      id: `email_matched_admin_${emailId}_${Date.now()}`,
      type: 'email',
      category: 'email',
      priority: 'medium',
      title: 'Email Matched to Lead',
      message: `New email from${emailRecord.from_address}`,
      data: {
        emailId,
        leadId,
        subject: emailRecord.subject,
      },
    },
    targetRole: 'Admin',
  });

  const options = {
    hostname: new URL(notificationServiceUrl).hostname,
    port: new URL(notificationServiceUrl).port || 80,
    path: '/notifications/microservice-send',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'x-microservice-secret': process.env.MICROSERVICE_SECRET,
    },
  };

  const req = http.request(options, (res) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('Email notification sent successfully');
    }
  });

  req.write(postData);
  req.end();
}
```

### Service Integrations

The following services integrate with the notification service via the microservice endpoint:

| Service                       | Events Sent                                                                                                                                                                                                                                                       | Description                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **user-auth-service-api**     | `auth:login`, `auth:logout`, `office:created`, `office:member_assigned`                                                                                                                                                                                           | Authentication and office management events |
| **lead-offer-service-api**    | `offer:created`, `offer:updated`, `offer:netto1_sent`, `offer:netto2_sent`, `lead:transferred`, `lead:bulk_transferred`, `opening:created`, `lead:assigned`, `todo:created`, `todo:assigned`, `todo:completed`, `confirmation:created`, `payment_voucher:created` | Offer, lead, and todo management events     |
| **configuration-service-api** | `project:created`, `lead_form_created`                                                                                                                                                                                                                            | Project and lead form events                |
| **email-service-api**         | `email:received`, `email:matched`                                                                                                                                                                                                                                 | Email processing events                     |

### Environment Configuration

**Services calling the notification service must configure:**

```
# Notification service URL
NOTIFICATION_SERVICE_URL=http://host.docker.internal:4004
# Or for production:
NOTIFICATION_SERVICE_URL=http://notification-service:4004

# Shared secret for authentication
MICROSERVICE_SECRET=your-production-secret
# Or:
GATEWAY_SECRET=your-gateway-secret
```

**Docker Environment:**

```yaml
# In docker-compose.yml
services:
your-service:
environment:
  - NOTIFICATION_SERVICE_URL=http://notification-service:4004
  - MICROSERVICE_SECRET=${MICROSERVICE_SECRET}
```

### Event Processing Flow

```
┌─────────────────────┐
│ Other Service       │
│ (user-auth, offer,  │
│  email, etc.)       │
└──────────┬──────────┘
           │
           │ 1. Event occurs
           │
           ▼
┌─────────────────────┐
│ Event Listener      │
│ (in other service)  │
└──────────┬──────────┘
           │
           │ 2. Call notification service
           │
           ▼
┌─────────────────────────────────────────┐
│ POST /notifications/microservice-send   │
│ + Authentication (shared secret)        │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Orchestrator                             │
│  1. Check notification rules            │
│  2. Normalize payload                   │
│  3. Map event type                       │
│  4. Emit internal events                │
└──────────┬──────────────────────────────┘
           │
           ├──────────────────┐
           ▼                  ▼
┌──────────────────┐  ┌──────────────────┐
│ Event Handlers   │  │ Persist & Emit   │
│ (if needed)      │  │                  │
└──────────────────┘  └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │ Socket.IO        │
                       │ (Real-time)      │
                       └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │ Clients receive  │
                       │ notification     │
                       └──────────────────┘
```

### Best Practices

1. **Use Event Type When Possible**
   - Let notification service build the notification
   - Ensures consistency across services
   - Allows rule-based filtering
2. **Provide Complete Event Data**
   - Include all related objects (lead, offer, user, etc.)
   - Use populated objects with all required fields
   - Follow the schema in examples above
3. **Handle Errors Gracefully**
   - Don’t fail if notification service is down
   - Log errors for debugging
   - Consider retry logic for critical notifications
4. **Use Targeting Wisely**
   - Use `targetRole` for role-based notifications
   - Use `targetUserId` for user-specific notifications
   - Don’t send both unless necessary
5. **Test Integration**
   - Use test endpoint in development
   - Verify notifications are received
   - Check database persistence

### Troubleshooting Microservice Integration

**Notifications Not Sending:**

1. Verify `NOTIFICATION_SERVICE_URL` is correct
2. Check `MICROSERVICE_SECRET` matches
3. Ensure notification service is running
4. Check service logs for errors

**Wrong Recipients:**

1. Verify `targetRole` or `targetUserId` is set correctly
2. Check if users exist and are active
3. Ensure users have Socket.IO connections active

**Rule-Based Filtering Not Working:**

1. Verify notification rule is enabled
2. Check event type matches rule
3. Review rule conditions

---

## Notification Flow

### 1. Notification Creation Flow

```
┌─────────────┐
│   Event     │ (Lead created, offer sent, etc.)
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│ Event Listener/Handler  │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Recipient Resolver      │ (Who should receive?)
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Rule Service            │ (Should we notify based on rules?)
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Notification Builder    │ (Build notification object)
└──────┬──────────────────┘
       │
       ├──────────────────────────┐
       ▼                          ▼
┌──────────────────┐    ┌──────────────────┐
│ Database Save    │    │ Real-time Emit   │
│ (Notification)   │    │ (Socket.IO)      │
└──────────────────┘    └──────────────────┘
                                      │
                                      ▼
                             ┌──────────────────┐
                             │ Client Receives  │
                             │ (WebSocket)      │
                             └──────────────────┘
```

### 2. Telegram Notification Flow

```
┌─────────────────────┐
│ Notification Event  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────┐
│ Check User Preferences  │ (Has Telegram enabled?)
└──────────┬──────────────┘
           │ Yes
           ▼
┌─────────────────────────┐
│ Format Message          │ (Apply template)
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Add Action Buttons      │ (Reply, Forward, etc.)
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Send via Telegram API   │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Log Delivery            │ (Success/Failure)
└─────────────────────────┘
```

### 3. Real-time Notification Flow

```
┌─────────────────────┐
│ Notification Created│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────┐
│ Get Target Users/Roles  │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Join Socket.IO Rooms    │
│ • user_{userId}         │
│ • role_{roleName}       │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Emit to Rooms           │
│ io.to(room).emit()      │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Client Receives         │
│ (Real-time update)      │
└─────────────────────────┘
```

---

## Adding New Features

### Adding a New Notification Type

### Step 1: Define Notification Type

Edit `src/services/notificationSystem/core/NotificationTypes.js`:

```jsx
module.exports = {
  // ... existing types

  YOUR_NEW_NOTIFICATION: {
    type: 'your_new_notification',
    category: 'business', // or: leads, offers, email, auth, project, task, document, system, other
    priority: 'high', // low, medium, high
    targetRoles: ['Admin', 'Agent'],
    title: 'New Notification Title',
    messageTemplate: 'Something happened: {leadName}',
    requiredData: ['leadName', 'projectId'],
    channels: ['web', 'telegram'],
  },
};
```

### Step 2: Add Handler Method

Create or edit a handler in `src/services/notificationSystem/handlers/`:

```jsx
// In BusinessProcessHandler.js or create new handler
class BusinessProcessHandler extends BaseNotificationHandler {
  // ... existing methods

  async handleYourNewNotification(data) {
    try {
      const notification = this.createNotification('your_new_notification', {
        messageData: {
          leadName: data.leadName,
          projectId: data.projectId,
        },
      });

      // Send to specific roles
      await this.sendToRole('Admin', notification);

      // Or send to specific users
      if (data.targetUsers) {
        await this.sendToUsers(data.targetUsers, notification);
      }

      return notification;
    } catch (error) {
      this.handleError(error, 'handleYourNewNotification', data);
    }
  }
}
```

### Step 3: Add Event Mapping

Edit `src/services/notificationSystem/core/NotificationFactory.js`:

```jsx
const getMethodMap = () => ({
  // ... existing mappings
  your_new_notification: 'handleYourNewNotification',
});
```

### Step 4: Add Route (Optional)

If you need a dedicated endpoint, add to `src/routes/notifications.js`:

```jsx
router.post(
  '/your-event',
  requireAuth,
  authorize(PERMISSIONS.NOTIFICATION_CREATE_ALL),
  async (req, res) => {
    try {
      const { leadName, projectId } = req.body;

      const notification = await realtimeNotificationService.sendCustomNotification(
        'your_new_notification',
        { leadName, projectId }
      );

      res.json({
        success: true,
        message: 'Notification sent successfully',
        notification,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);
```

### Adding a New Notification Rule

### Step 1: Add to Seeder

Edit `src/services/notificationRuleSeeder.js`:

```jsx
const defaultRules = [
  // ... existing rules

  {
    eventType: 'your_custom_event',
    displayName: 'Your Custom Event',
    description: 'Triggered when custom event occurs',
    category: 'other',
    enabled: true,
    priority: 'medium',
    channels: ['web', 'telegram'],
    scope: 'global',
    conditions: [],
  },
];
```

### Step 2: Seed the Rule

```bash
node scripts/seed-notification-rules.js
```

### Adding a New Delivery Channel

### Step 1: Extend DeliveryService

Edit `src/services/notificationSystem/core/DeliveryService.js`:

```jsx
class DeliveryService {
  // ... existing methods

  async sendToUserSlack(user, notification) {
    try {
      // Check if user has Slack configured
      if (!user.slack_webhook_url) {
        return { success: false, reason: 'Slack not configured' };
      }

      // Format message for Slack
      const slackMessage = this.formatForSlack(notification);

      // Send to Slack
      const axios = require('axios');
      await axios.post(user.slack_webhook_url, slackMessage);

      return { success: true };
    } catch (error) {
      logger.error('Slack delivery failed:', error);
      return { success: false, error: error.message };
    }
  }

  formatForSlack(notification) {
    return {
      text: notification.title,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: notification.message,
          },
        },
      ],
    };
  }
}
```

### Step 2: Update Notification Channels

Add ‘slack’ to allowed channels in notification rules.

---

## Deployment

### Production Environment Variables

```
# Server
PORT=4004
NODE_ENV=production

# MongoDB
MONGODB_URI=mongodb://username:password@mongodb-host:27017/leadpylot-notifications

# Redis
REDIS_HOST=redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Security
MICROSERVICE_SECRET=your-production-secret
GATEWAY_SECRET=your-gateway-secret
TELEGRAM_BOT_WEBHOOK_SECRET=your-webhook-secret

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token

# CORS
CORS_ORIGIN=https://leadpylot.com

# Logging
LOG_LEVEL=info
```

### Docker Deployment

1. **Build image:**

```bash
docker build -t leadpylot/notification-service:latest .
```

1. **Run container:**

```bash
docker run -d \
  --name notification-service \
  -p 4004:4004 \
  --env-file .env.prod \
  leadpylot/notification-service:latest
```

1. **Kubernetes Deployment (example):**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
name: notification-service
spec:
replicas:3
selector:
matchLabels:
app: notification-service
template:
metadata:
labels:
app: notification-service
spec:
containers:
-name: notification-service
image: leadpylot/notification-service:latest
ports:
-containerPort:4004
env:
-name: NODE_ENV
value:"production"
-name: MONGODB_URI
valueFrom:
secretKeyRef:
name: mongo-secret
key: uri
```

### Health Checks

```bash
# Check service health
curl http://localhost:4004/health

# Expected response:
{
  "status": "healthy",
  "service": "notification-service",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600
}
```

### Monitoring

Key metrics to monitor:

- Notification delivery rate
- Notification failure rate
- Socket.IO connections
- Telegram message delivery
- API response times
- Database connection pool
- Redis cache hit rate

---

## Troubleshooting

### Common Issues

### 1. Notifications Not Sending

**Symptoms:** No errors but notifications not received

**Solutions:**

- Check Socket.IO connection: Verify client is connected
- Check user permissions: Verify user has correct role
- Check notification rules: Verify rule is enabled
- Check logs: Look for error messages

```bash
docker-compose logs -f notification-service | grep ERROR
```

### 2. Telegram Bot Not Working

**Symptoms:** Telegram notifications not delivered

**Solutions:**

- Verify bot token is correct
- Check bot is initialized: `GET /api/telegram-bot/status`
- Verify user has Telegram configured with chat_id
- Check webhook is set: Use Telegram BotFather
- Check bot has necessary permissions

### 3. Socket.IO Connection Issues

**Symptoms:** Clients unable to connect

**Solutions:**

- Check CORS configuration
- Verify transport settings (websocket/polling)
- Check firewall/network restrictions
- Verify Socket.IO client version compatibility

### 4. Database Connection Issues

**Symptoms:** Service fails to start, MongoDB errors

**Solutions:**

- Verify MongoDB connection string
- Check MongoDB is accessible
- Verify network connectivity
- Check MongoDB credentials

### 5. High Memory Usage

**Symptoms:** Service consumes too much memory

**Solutions:**

- Check for memory leaks in notification caching
- Limit Socket.IO room size
- Implement pagination for large notification lists
- Add Redis caching for frequently accessed data

### Debug Mode

Enable debug logging:

```
LOG_LEVEL=debug
DEBUG=notification-service:*
```

### Useful Commands

```bash
# Check service logs
docker-compose logs -f notification-service

# Connect to running container
docker exec -it notification-service sh

# Check MongoDB for stuck notifications
docker exec -it mongodb mongo leadpylot-notifications
> db.notifications.count({read: false})

# Clear Redis cache
docker exec -it redis redis-cli FLUSHDB

# Restart service
docker-compose restart notification-service
```

---

## Best Practices

### 1. Notification Design

- Keep notifications concise and actionable
- Use appropriate priority levels
- Group related notifications
- Don’t spam users (implement rate limiting)

### 2. Performance

- Use pagination for large datasets
- Implement caching for frequently accessed data
- Use database indexes for common queries
- Implement connection pooling

### 3. Security

- Always validate input data
- Implement rate limiting
- Use secure authentication (JWT)
- Validate microservice secret
- Sanitize user input in notifications

### 4. Error Handling

- Log all errors with context
- Implement graceful degradation
- Retry failed deliveries (with backoff)
- Monitor error rates

---

## Support

For technical support or questions:

- Check the main README.md
- Review architecture docs in `docs/`
- Check existing GitHub issues
- Contact the development team

---

**Last Updated:** March 2025
**Version:** 1.0.0

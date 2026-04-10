# TECHNICAL_DOCUMENTATION

# User Authentication & Authorization Service - Technical Documentation

## Table of Contents

1. [Architecture Overview](about:blank#architecture-overview)
2. [System Design](about:blank#system-design)
3. [Database Schema](about:blank#database-schema)
4. [Security Implementation](about:blank#security-implementation)
5. [Permission System](about:blank#permission-system)
6. [Event System](about:blank#event-system)
7. [Testing Guide](about:blank#testing-guide)
8. [Deployment Guide](about:blank#deployment-guide)

---

## Architecture Overview

### Microservice Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         API Gateway / Load Balancer              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    User Auth Service (Express.js)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Routes     │  │ Controllers  │  │  Middleware  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                    │
│  ┌──────┴───────┐  ┌──────┴────────┐  ┌────┴──────────┐        │
│  │   Services   │  │   Validators  │  │ Auth Helpers  │        │
│  └──────┬───────┘  └───────────────┘  └───────────────┘        │
└─────────┼──────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────┐
│                        Data Layer                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                 │
│  │  MongoDB   │  │   Redis    │  │  Events    │                 │
│  │  (Primary) │  │  (Cache)   │  │ (Kafka)    │                 │
│  └────────────┘  └────────────┘  └────────────┘                 │
└──────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component  | Technology        | Version | Purpose            |
| ---------- | ----------------- | ------- | ------------------ |
| Runtime    | Node.js           | >=18    | JavaScript runtime |
| Framework  | Express.js        | 4.18+   | Web framework      |
| Database   | MongoDB           | 6+      | Primary data store |
| Cache      | Redis             | 7+      | Session cache      |
| Auth       | JWT               | 9.0+    | Token-based auth   |
| Password   | bcrypt            | 5.1+    | Password hashing   |
| Validation | express-validator | 7.2+    | Input validation   |
| Logging    | Winston           | 3.17+   | Structured logging |
| Testing    | Jest              | 29+     | Unit testing       |

---

## System Design

### Directory Structure

```
user-auth-service-api/
├── src/
│   ├── app.js                      # Application entry point
│   ├── config/
│   │   ├── database.js             # MongoDB connection
│   │   └── redis.js                # Redis connection
│   ├── models/
│   │   ├── User.js                 # User schema
│   │   ├── Role.js                 # Role schema
│   │   ├── Permission.js           # Permission schema
│   │   ├── Session.js              # Session schema
│   │   └── Office.js               # Office schema
│   ├── controllers/
│   │   ├── authController.js       # Auth endpoints
│   │   ├── userController.js       # User CRUD
│   │   └── roleController.js       # Role & Permission CRUD
│   ├── services/
│   │   ├── authService.js          # Auth business logic
│   │   ├── userService.js          # User business logic
│   │   ├── permissionService.js    # Permission management
│   │   └── emailService.js         # Email notifications
│   ├── middleware/
│   │   ├── auth.js                 # JWT verification
│   │   ├── validate.js             # Request validation
│   │   ├── errorHandler.js         # Error handling
│   │   └── rateLimiter.js          # Rate limiting
│   ├── routes/
│   │   ├── auth.js                 # Auth routes
│   │   ├── users.js                # User routes
│   │   ├── roles.js                # Role routes
│   │   └── permissions.js          # Permission routes
│   ├── utils/
│   │   ├── jwt.js                  # JWT utilities
│   │   ├── logger.js               # Winston logger
│   │   └── events.js               # Event emitter
│   └── auth/                       # Legacy auth structure
│       ├── middleware/
│       │   ├── authenticate.js     # Auth middleware
│       │   └── authorize.js        # RBAC middleware
│       └── roles/
│           ├── permissions.js      # Permission definitions
│           └── roleDefinitions.js  # Role definitions
├── scripts/
│   ├── create-admin.js             # Create admin user
│   └── seedRbac.js                 # Seed roles/permissions
├── tests/
│   ├── unit/                       # Unit tests
│   ├── integration/                # Integration tests
│   └── fixtures/                   # Test data
├── docs/
│   ├── API_DOCUMENTATION.md        # API reference
│   └── TECHNICAL_DOCUMENTATION.md  # This file
├── .env.example                    # Environment template
├── package.json
└── README.md
```

### Request Flow

```
1. Client Request → API Gateway
                      ↓
2. Rate Limiter → Check rate limits
                      ↓
3. Security Middleware → CORS, Helmet
                      ↓
4. Auth Middleware → Verify JWT (if protected)
                      ↓
5. Route Handler → Match route
                      ↓
6. Validation Middleware → Validate input
                      ↓
7. Controller → Handle request logic
                      ↓
8. Service Layer → Business logic
                      ↓
9. Database Layer → Query/Update
                      ↓
10. Response → Format response
                      ↓
11. Client ← JSON Response
```

---

## Database Schema

### User Collection

```jsx
{
  _id: ObjectId,                    // Primary key
  login: String (unique),           // Username
  email: String (unique),           // Email address
  password: String,                 // Bcrypt hash (10 rounds)
  role: String,                     // User role
  firstName: String,                // First name
  lastName: String,                 // Last name
  active: Boolean (default: true),  // Account status
  info: {
    name: String,                   // Full name
    phone: String,                  // Phone number
    department: String,             // Department
    avatar: String,                 // Avatar URL
  },
  office_id: ObjectId (ref: Office),// Associated office
  other_platform_credentials: [{    // External credentials
    platform_type: String,          // Platform name
    chat_id: String,                // Platform user ID
    username: String,               // Platform username
    phone: String,                  // Platform phone
    bot_enabled: Boolean            // Notifications enabled
  }],
  emailVerification: {
    token: String,                  // Verification token
    expiresAt: Date,                // Token expiration
    verified: Boolean (default: false)
  },
  passwordReset: {
    token: String,                  // Reset token
    expiresAt: Date                 // Token expiration
  },
  loginAttempts: {
    count: Number (default: 0),     // Failed attempts
    lastAttempt: Date,              // Last failed login
    lockedUntil: Date               // Lock expiration
  },
  lastLogin: Date,                  // Last successful login
  createdAt: Date (default: now),
  updatedAt: Date (default: now)
}

Indexes:
- { login: 1 } (unique)
- { email: 1 } (unique)
- { active: 1, role: 1 }
- { "emailVerification.token": 1 } (sparse, unique)
- { "passwordReset.token": 1 } (sparse, unique)
```

### Role Collection

```jsx
{
  _id: ObjectId,
  name: String (unique),            // Role name
  level: Number,                    // Hierarchy level (0-100)
  permissions: [String],            // Permission keys
  isSystemRole: Boolean,            // Prevent deletion
  description: String,              // Role description
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- { name: 1 } (unique)
- { level: 1 }
```

### Permission Collection

```jsx
{
  _id: ObjectId,
  key: String (unique),             // Permission key (e.g., "lead:create")
  name: String,                     // Display name
  module: String,                   // Module name
  action: String,                   // Action name
  description: String,              // Description
  createdAt: Date
}

Indexes:
- { key: 1 } (unique)
- { module: 1, action: 1 }
```

### Session Collection

```jsx
{
  _id: ObjectId,
  userId: ObjectId (ref: User),     // User reference
  sessionId: String (unique),       // Session UUID
  tokenHash: String,                // Hashed refresh token
  ipAddress: String,                // Client IP
  userAgent: String,                // Client user agent
  device: {
    type: String,                   // Device type
    os: String,                     // Operating system
    browser: String                 // Browser name
  },
  status: String,                   // active, expired, logged_out
  loginTime: Date,                  // Login timestamp
  lastActivity: Date,               // Last activity
  expiresAt: Date,                  // Expiration time
  logoutReason: String,             // Logout reason (if logged out)
  createdAt: Date
}

Indexes:
- { sessionId: 1 } (unique)
- { userId: 1, status: 1 }
- { tokenHash: 1 }
- { expiresAt: 1 } (TTL index)
```

### Office Collection

```jsx
{
  _id: ObjectId,
  name: String,                     // Office name
  address: String,                  // Office address
  phone: String,                    // Office phone
  manager_id: ObjectId (ref: User), // Office manager
  workingHours: {
    start: String,                  // Opening time (HH:mm)
    end: String,                    // Closing time (HH:mm)
    timezone: String                // Timezone
  },
  active: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- { name: 1 }
- { active: 1 }
```

---

## Security Implementation

### Password Security

### Hashing Algorithm

```jsx
// bcrypt with 10 salt rounds
const saltRounds = 10;
const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
```

### Password Policy

```jsx
const passwordRequirements = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false, // Optional
  forbiddenPatterns: [
    'password',
    '12345678',
    'qwerty', // Common passwords
  ],
};

// Validation regex
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
```

### JWT Implementation

### Token Structure

```jsx
// Access Token (short-lived)
{
  sub: userId,                      // Subject (user ID)
  iat: issuedAt,                    // Issued at
  exp: expiresAt,                   // Expiration (24h default)
  role: userRole,                   // User role
  sessionId: sessionId              // Session reference
}

// Refresh Token (long-lived)
{
  sub: userId,
  iat: issuedAt,
  exp: expiresAt,                   // 30 days
  type: 'refresh',
  sessionId: sessionId
}
```

### Token Generation

```jsx
// utils/jwt.js
const jwt = require('jsonwebtoken');

function generateAccessToken(user, sessionId) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      sessionId: sessionId,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

function generateRefreshToken(user, sessionId) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      type: 'refresh',
      sessionId: sessionId,
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );
}

function verifyToken(token, secret = process.env.JWT_SECRET) {
  return jwt.verify(token, secret);
}
```

### Session Management

### Session Lifecycle

```jsx
1. Login → Create session with UUID
2. Store session in MongoDB with TTL
3. Generate tokens with session reference
4. Each request validates session
5. Logout → Mark session as logged_out
6. Expired sessions auto-cleanup via TTL index
```

### Session Validation

```jsx
async function validateSession(sessionId, userId) {
  const session = await Session.findOne({
    sessionId,
    userId,
    status: 'active',
    expiresAt: { $gt: new Date() },
  });

  if (!session) {
    throw new Error('Invalid or expired session');
  }

  // Update last activity
  session.lastActivity = new Date();
  await session.save();

  return session;
}
```

### Rate Limiting

### Implementation

```jsx
const rateLimit = require('express-rate-limit');

// Login rate limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts',
  skipSuccessfulRequests: true,
});

// API rate limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  keyGenerator: (req) => req.user?.id || req.ip,
});
```

### Account Lockout

### Failed Login Tracking

```jsx
async function handleFailedLogin(user) {
  user.loginAttempts.count += 1;
  user.loginAttempts.lastAttempt = new Date();

  // Lock account after 5 failed attempts
  if (user.loginAttempts.count >= 5) {
    user.loginAttempts.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    await sendAccountLockedEmail(user);
  }

  await user.save();
}

async function resetLoginAttempts(user) {
  user.loginAttempts = { count: 0, lastAttempt: null, lockedUntil: null };
  await user.save();
}
```

---

## Permission System

### RBAC Architecture

```
User → Role → Permissions → Resources
```

### Permission Format

```jsx
// Format: {resource}:{action}
const permissions = {
  // User Management
  'user:create': 'Create new users',
  'user:read': 'View user information',
  'user:update': 'Update user information',
  'user:delete': 'Delete users',
  'user:manage': 'Full user management',

  // Lead Management
  'lead:create': 'Create leads',
  'lead:read': 'View leads',
  'lead:update': 'Edit leads',
  'lead:delete': 'Delete leads',
  'lead:assign': 'Assign leads to agents',
  'lead:export': 'Export lead data',

  // Offer Management
  'offer:create': 'Create offers',
  'offer:read': 'View offers',
  'offer:update': 'Edit offers',
  'offer:delete': 'Delete offers',
  'offer:approve': 'Approve offers',

  // System Administration
  'system:admin': 'Full system access',
  'system:config': 'Modify system configuration',
  'system:audit': 'View audit logs',
};
```

### Permission Checking

```jsx
// middleware/auth.js
function requirePermission(requiredPermission) {
  return (req, res, next) => {
    const user = req.user;

    // Admin has all permissions
    if (user.role === 'Admin') {
      return next();
    }

    // Check if user has the required permission
    const hasPermission = user.permissions?.includes(requiredPermission);

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        required: requiredPermission,
      });
    }

    next();
  };
}
```

### Role Hierarchy

```jsx
const roleLevels = {
  Admin: 100,
  Manager: 75,
  Agent: 50,
  Provider: 40,
  Client: 20,
};

function hasHigherOrEqualRole(userRole, targetRole) {
  return roleLevels[userRole] >= roleLevels[targetRole];
}
```

---

## Event System

### Event Types

```jsx
const eventTypes = {
  // User Events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_ACTIVATED: 'user.activated',
  USER_DEACTIVATED: 'user.deactivated',

  // Auth Events
  USER_REGISTERED: 'user.registered',
  USER_LOGGED_IN: 'user.logged_in',
  USER_LOGGED_OUT: 'user.logged_out',
  PASSWORD_CHANGED: 'user.password_changed',
  PASSWORD_RESET: 'user.password_reset',
  EMAIL_VERIFIED: 'user.email_verified',

  // Role Events
  ROLE_CREATED: 'role.created',
  ROLE_UPDATED: 'role.updated',
  ROLE_DELETED: 'role.deleted',
  ROLE_ASSIGNED: 'role.assigned',

  // Security Events
  ACCOUNT_LOCKED: 'account.locked',
  SUSPICIOUS_ACTIVITY: 'account.suspicious_activity',
  LOGIN_FAILED: 'auth.login_failed',
};
```

### Event Publishing

```jsx
// utils/events.js
const EventEmitter = require('events');

class AuthServiceEvents extends EventEmitter {}

const eventBus = new AuthServiceEvents();

// Example: Emit event
eventBus.emit(eventTypes.USER_LOGGED_IN, {
  userId: user._id,
  role: user.role,
  timestamp: new Date(),
  ip: req.ip,
  userAgent: req.headers['user-agent'],
});

// Example: Listen for event
eventBus.on(eventTypes.USER_LOGGED_IN, async (data) => {
  await logActivity(data);
  await sendRealtimeNotification(data.userId, 'Welcome back!');
});
```

---

## Testing Guide

### Unit Testing

```jsx
// tests/unit/authService.test.js
const authService = require('../../src/services/authService');
const bcrypt = require('bcrypt');

describe('AuthService', () => {
  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      const user = await createUser({
        email: 'test@example.com',
        password: await bcrypt.hash('Password123', 10),
      });

      const result = await authService.login('test@example.com', 'Password123');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });

    it('should throw error for invalid credentials', async () => {
      await expect(authService.login('test@example.com', 'wrongpassword')).rejects.toThrow(
        'Invalid credentials'
      );
    });
  });
});
```

### Integration Testing

```jsx
// tests/integration/auth.test.js
const request = require('supertest');
const app = require('../../src/app');

describe('POST /auth/login', () => {
  it('should login user with valid credentials', async () => {
    const response = await request(app).post('/auth/login').send({
      email: 'test@example.com',
      password: 'Password123',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('accessToken');
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- auth.test.js

# Watch mode
npm test -- --watch
```

---

## Deployment Guide

### Docker Deployment

### Dockerfile

```docker
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["npm", "start"]
```

### docker-compose.yml

```yaml
version:'3.8'

services:
user-auth-service:
build: .
ports:
-"4000:4000"
environment:
- NODE_ENV=production
- MONGODB_URI=mongodb://mongodb:27017/user_db
- REDIS_URI=redis://redis:6379
- JWT_SECRET=${JWT_SECRET}
depends_on:
- mongodb
- redis
restart: unless-stopped

mongodb:
image: mongo:6
ports:
-"27017:27017"
volumes:
- mongodb_data:/data/db
restart: unless-stopped

redis:
image: redis:7-alpine
ports:
-"6379:6379"
volumes:
- redis_data:/data
restart: unless-stopped

volumes:
mongodb_data:
redis_data:
```

### Environment Variables

### Required Variables

```bash
# Application
NODE_ENV=production
PORT=4000

# Database
MONGODB_URI=mongodb://localhost:27017/user_db

# Redis
REDIS_URI=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@leadpylot.com
SMTP_PASS=your-email-password
SMTP_FROM=noreply@leadpylot.com

# Security
MICROSERVICE_SECRET=your-microservice-secret
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Optional Variables

```bash
# Session
SESSION_DURATION_HOURS=24
REFRESH_TOKEN_DAYS=30

# Security
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCK_MINUTES=30

# CORS
CORS_ORIGIN=http://localhost:3001,https://app.leadpylot.com

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/user-auth-service
```

### Production Checklist

- [ ] Set strong JWT secrets (64+ characters)
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS properly
- [ ] Set up database backups
- [ ] Configure rate limiting
- [ ] Enable security headers (Helmet)
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Set up health check endpoints
- [ ] Configure graceful shutdown
- [ ] Review and set resource limits
- [ ] Test disaster recovery procedures

### Monitoring

### Health Check Endpoints

```bash
# Basic health check
GET /health
Response: { status: 'healthy', service: 'user-auth-service' }

# Readiness check (includes DB)
GET /ready
Response: { status: 'ready', database: 'connected' }
```

### Metrics to Monitor

- Request rate and latency
- Error rate by endpoint
- Database connection pool status
- Redis connection status
- Active sessions count
- Failed login attempts
- Token refresh rate
- Memory and CPU usage

---

## Appendix

### Common Issues and Solutions

### Issue: Session expired prematurely

**Solution:** Check TTL index on sessions collection and JWT expiration time.

### Issue: High memory usage

**Solution:** Implement pagination for user lists, add indexes to frequently queried fields.

### Issue: Slow login response

**Solution:** Add indexes to email field, implement Redis caching for session data.

### Performance Optimization Tips

1. **Database Indexes**
   - Index all fields used in queries
   - Use compound indexes for multi-field queries
   - Monitor index usage with `explain()`
2. **Caching Strategy**
   - Cache user permissions in Redis
   - Cache role definitions
   - Invalidate cache on updates
3. **Connection Pooling**
   - Configure MongoDB connection pool (default: 10)
   - Configure Redis connection pool
4. **Query Optimization**
   - Use `select()` to limit returned fields
   - Implement pagination for large datasets
   - Use `lean()` for read-only queries

---

**Document Version:** 1.0
**Last Updated:** March 25, 2025
**Maintainer:** Development Team

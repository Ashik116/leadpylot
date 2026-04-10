# User & Auth Microservice

## Overview

This is the User & Authentication microservice for LeadPylot. It handles all user management, authentication, and authorization operations.

## Features

- ✅ User registration and management
- ✅ JWT-based authentication
- ✅ Session management with sliding expiration
- ✅ Role-based access control (RBAC)
- ✅ Password hashing and verification
- ✅ User profile management
- ✅ Activity logging via events

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB
- **Authentication:** JWT (JSON Web Tokens)
- **Password Hashing:** bcrypt

## Project Structure

```
user-auth-service/
├── src/
│   ├── models/              # MongoDB models
│   │   ├── User.js
│   │   └── UserSession.js
│   ├── services/            # Business logic
│   │   └── userService.js
│   ├── controllers/         # Request handlers
│   │   ├── authController.js
│   │   └── userController.js
│   ├── routes/              # API routes
│   │   ├── auth.js
│   │   └── users.js
│   ├── middleware/          # Express middleware
│   ├── auth/                # Authentication & authorization
│   │   ├── services/
│   │   │   ├── authService.js
│   │   │   ├── passwordService.js
│   │   │   └── tokenService.js
│   │   ├── middleware/
│   │   │   ├── authenticate.js
│   │   │   └── authorize.js
│   │   └── roles/
│   │       ├── roleDefinitions.js
│   │       ├── permissions.js
│   │       └── rolePermissions.js
│   ├── utils/               # Utility functions
│   │   ├── events.js
│   │   ├── logger.js
│   │   └── errorHandler.js
│   ├── config/              # Configuration files
│   └── app.js               # Application entry point
├── tests/                   # Test files
├── .env.example             # Environment variables template
├── Dockerfile               # Docker configuration
├── docker-compose.yml       # Docker Compose configuration
├── package.json             # Dependencies
└── README.md                # This file
```

## Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB >= 6
- Docker (optional)

### Installation

1. Clone the repository and navigate to the service directory:
   ```bash
   cd backend/microservices/user-auth-service
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update environment variables in `.env`:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: A secure random string for JWT signing
   - Other configurations as needed

### Running the Service

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

#### Docker
```bash
docker-compose up -d
```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login` | User login | No |
| POST | `/api/auth/register` | User registration | No (first user) / Admin |
| GET | `/api/auth/me` | Get current user | Yes |
| POST | `/api/auth/change-password` | Change password | Yes |
| POST | `/api/auth/change-password/:id` | Change user password (admin) | Yes (Admin) |
| POST | `/api/auth/logout` | User logout | Yes |

### User Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/users` | Get all users | Yes (Admin) |
| GET | `/api/users/:id` | Get user by ID | Yes |
| POST | `/api/users` | Create user | Yes (Admin) |
| PUT | `/api/users/:id` | Update user | Yes |
| DELETE | `/api/users/:id` | Delete user | Yes (Admin) |
| DELETE | `/api/users` | Bulk delete users | Yes (Admin) |

## Roles & Permissions

### Available Roles

- **Admin:** Full system access
- **Agent:** Limited access to assigned resources
- **Manager:** Team management capabilities
- **Banker:** Bank-specific operations
- **Client:** Client portal access
- **Provider:** Lead provider access

### Permission System

The service implements a granular permission system where each role is mapped to specific permissions. See `src/auth/roles/` for details.

## Authentication Flow

1. **Login:** User submits credentials → Service validates → Returns JWT token
2. **Request:** Client includes JWT in Authorization header (`Bearer <token>`)
3. **Verification:** Middleware validates token and checks session
4. **Authorization:** Middleware checks user permissions for requested resource
5. **Response:** Service processes request and returns response

## Session Management

- Sessions use sliding expiration (default: 24 hours)
- Each login creates a new session stored in MongoDB
- Sessions can be revoked (logout) or expire automatically
- Multiple concurrent sessions supported per user

## Event System

The service emits events for:
- User creation, update, deletion
- Login, logout
- Password changes
- Registration

These events can be consumed by:
- Activity logging service
- Notification service
- WebSocket gateway for real-time updates

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | 3000 |
| `NODE_ENV` | Environment (development/production) | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/user_db |
| `JWT_SECRET` | Secret key for JWT signing | (required) |
| `JWT_EXPIRES_IN` | JWT token expiration | 24h |
| `SESSION_DURATION_HOURS` | Session duration in hours | 24 |

## Database Schema

### User Collection
```javascript
{
  _id: ObjectId,
  login: String (unique),
  password: String (hashed),
  role: String (enum: Admin, Agent, Manager, etc.),
  info: Object,
  active: Boolean,
  create_date: Date,
  write_date: Date,
  lastModified: Date,
  // ... additional fields
}
```

### UserSession Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  sessionId: String (UUID),
  tokenHash: String,
  ipAddress: String,
  userAgent: String,
  status: String (active, expired, logged_out),
  loginTime: Date,
  lastActivity: Date,
  expiresAt: Date,
  // ... additional fields
}
```

## Security Features

- Password hashing with bcrypt (10 salt rounds)
- JWT token-based authentication
- Session management and tracking
- Token revocation on logout
- Sliding session expiration
- Role-based access control

## Testing

```bash
npm test
```

## Deployment

### Docker Deployment

1. Build the image:
   ```bash
   docker build -t leadpylot/user-auth-service:1.0.0 .
   ```

2. Run with docker-compose:
   ```bash
   docker-compose up -d
   ```

### Kubernetes Deployment

See Kubernetes manifests in the `k8s/` directory (to be added).

## Monitoring & Logging

- Logs are output to `stdout/stderr` using Winston
- Health check endpoint: `GET /health`
- Readiness check endpoint: `GET /ready`

## Migration from Monolith

This service was extracted from the monolith using the "Copy-Paste + Refactor" approach:

1. ✅ Copied existing code from `/backend/services/userService.js`
2. ✅ Copied auth services from `/backend/auth/`
3. ✅ Copied models from `/backend/models/mongo/`
4. ✅ Adapted dependencies to work independently
5. ✅ Created Docker configuration
6. ⚠️  Security features simplified (to be enhanced)

## Future Enhancements

- [ ] Add IP blocking and device fingerprinting
- [ ] Implement rate limiting
- [ ] Add 2FA/MFA support
- [ ] Integrate with API Gateway for centralized security
- [ ] Add Kafka for event publishing
- [ ] Add comprehensive test suite
- [ ] Add health check dependencies (DB connection)
- [ ] Add metrics endpoint for Prometheus

## Contributing

See main project CONTRIBUTING.md

## License

See main project LICENSE

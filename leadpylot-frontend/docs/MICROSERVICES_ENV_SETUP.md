# Microservices Environment Setup

This document explains how to configure the frontend to work with the new microservices architecture.

## Environment Variables

Create a `.env.local` file in the `frontend/` directory with the following variables:

### Local Development

```bash
# Monolith Backend URL (for endpoints not yet migrated)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000

# User & Auth Microservice URL (Port 4000)
NEXT_PUBLIC_USER_AUTH_SERVICE_URL=http://localhost:4000

# Configuration Microservice URL (Port 4006)
NEXT_PUBLIC_CONFIG_SERVICE_URL=http://localhost:4006

# Document Service URL (Port 4002)
NEXT_PUBLIC_DOCUMENT_SERVICE_URL=http://localhost:4002

# Lead-Offers Service URL (Port 4003)
NEXT_PUBLIC_LEAD_OFFERS_SERVICE_URL=http://localhost:4003

# Notification Service URL (Port 4004)
NEXT_PUBLIC_NOTIFICATION_SERVICE_URL=http://localhost:4004

# Enable/Disable Microservices (set to 'false' to use monolith only)
NEXT_PUBLIC_USE_MICROSERVICES=true
```

### Production

```bash
# Monolith Backend URL
NEXT_PUBLIC_API_BASE_URL=https://api.leadpylot.com

# User & Auth Microservice URL
NEXT_PUBLIC_USER_AUTH_SERVICE_URL=https://auth.leadpylot.com

# Configuration Microservice URL
NEXT_PUBLIC_CONFIG_SERVICE_URL=https://config.leadpylot.com

# Document Service URL
NEXT_PUBLIC_DOCUMENT_SERVICE_URL=https://documents.leadpylot.com

# Lead-Offers Service URL
NEXT_PUBLIC_LEAD_OFFERS_SERVICE_URL=https://leads.leadpylot.com

# Notification Service URL
NEXT_PUBLIC_NOTIFICATION_SERVICE_URL=https://notifications.leadpylot.com

# Enable Microservices
NEXT_PUBLIC_USE_MICROSERVICES=true
```

### Production (Using IP Addresses)

If you're not using domain names, you can use IP addresses:

```bash
NEXT_PUBLIC_API_BASE_URL=http://3.127.16.193:3000
NEXT_PUBLIC_USER_AUTH_SERVICE_URL=http://3.127.16.193:4000
NEXT_PUBLIC_CONFIG_SERVICE_URL=http://3.127.16.193:4006
NEXT_PUBLIC_DOCUMENT_SERVICE_URL=http://3.127.16.193:4002
NEXT_PUBLIC_LEAD_OFFERS_SERVICE_URL=http://3.127.16.193:4003
NEXT_PUBLIC_NOTIFICATION_SERVICE_URL=http://3.127.16.193:4004
NEXT_PUBLIC_USE_MICROSERVICES=true
```

## How It Works

### Automatic Routing

The frontend now automatically routes API requests to the correct microservice based on the endpoint:

**User & Auth Service** (Port 4000):
- `/auth/login`
- `/auth/logout`
- `/auth/register`
- `/auth/me`
- `/auth/change-password`
- `/auth/*` (all auth endpoints)
- `/users` (all user endpoints)
- `/users/*` (e.g., `/users/123`)

**Configuration Service** (Port 4006):
- `/settings/*`
- `/banks/*`
- `/projects/*`
- `/sources/*`

**Document Service** (Port 4002):
- `/attachments/*`

**Lead-Offers Service** (Port 4003):
- `/leads/*`
- `/offers/*`
- `/appointments/*`
- `/assign-leads/*`
- `/dynamic-filters/*`
- `/filters/*`

**Notification Service** (Port 4004):
- `/notifications/*`

**Monolith** (Port 3000):
- All other endpoints (until migrated)

### Example Request Flow

```typescript
// Frontend code (no changes needed!)
const response = await AxiosBase.post('/auth/login', { login, password });

// Automatically routed to: http://localhost:4000/auth/login
// Instead of: http://localhost:3000/auth/login
```

### Disabling Microservices

If you want to temporarily disable microservices and use only the monolith:

```bash
NEXT_PUBLIC_USE_MICROSERVICES=false
```

This will route all requests to `NEXT_PUBLIC_API_BASE_URL` (monolith).

## Docker Compose Setup

The `docker-compose.yml` has been updated to include the microservice URLs. Make sure all services are running:

```bash
# Start all services (monolith + microservices)
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f frontend
docker-compose logs -f user-auth-service
docker-compose logs -f configuration-service
```

## Testing

### Test Auth Endpoints

```bash
# Should be routed to user-auth service (port 4000)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login": "admin", "password": "password"}'
```

### Test User Endpoints

```bash
# Should be routed to user-auth service (port 4000)
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Settings Endpoints

```bash
# Should be routed to configuration service (port 4006)
curl http://localhost:3000/api/settings/bonus_amount \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Notification Endpoints

```bash
# Should be routed to notification service (port 4004)
curl http://localhost:3000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test unread count
curl http://localhost:3000/api/notifications/unread-count \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Debugging

Enable debug logging in the browser console to see routing information:

```javascript
// Check browser console for logs like:
🔀 Routing /auth/login → User & Auth Service (http://localhost:4000)
🔀 Routing /users → User & Auth Service (http://localhost:4000)
🔀 Routing /settings/payment_terms → Configuration Service (http://localhost:4006)
🔀 Routing /notifications → Notification Service (http://localhost:4004)
🔀 Routing /leads → Lead-Offers Service (http://localhost:4003)
🔀 Routing /attachments → Document Service (http://localhost:4002)
🔀 Routing /other-endpoint → Monolith (http://localhost:3000)
```

## Troubleshooting

### CORS Errors

If you see CORS errors, make sure the microservices have CORS properly configured:

```javascript
// In microservice backend
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
```

### Connection Refused

If requests fail with "connection refused":
1. Check if the microservice is running: `docker-compose ps`
2. Check if the port is correct in environment variables
3. Check if the URL is accessible: `curl http://localhost:4000/health`

### Auth Token Not Working

If authentication fails:
1. Make sure the token is generated by the correct service
2. Verify JWT_SECRET is the same across all services
3. Check if the token is being sent in the Authorization header

## Migration Checklist

When migrating new endpoints to microservices:

1. ✅ Create the microservice
2. ✅ Update `frontend/src/configs/microservices.config.ts`
3. ✅ Add endpoint patterns to the service configuration
4. ✅ Add environment variable for the service URL
5. ✅ Update docker-compose.yml
6. ✅ Test the routing
7. ✅ Deploy and monitor

## Future Services

As more services are extracted, add them to `microservices.config.ts`:

```typescript
// Example: Lead Service
LEAD_SERVICE: {
  name: 'Lead Service',
  baseUrl: getServiceUrl('NEXT_PUBLIC_LEAD_SERVICE_URL', 4002),
  endpoints: [
    '/leads',
    '/leads/*',
  ],
  description: 'Handles lead management operations',
},
```

## Support

If you encounter issues:
1. Check the browser console for routing logs
2. Check microservice logs: `docker-compose logs SERVICE_NAME`
3. Verify environment variables are loaded: `console.log(process.env)`
4. Test the microservice directly: `curl http://localhost:4000/health`


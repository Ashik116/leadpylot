# Docker Setup Guide - Lead Offers Microservice

This microservice is separated from the main LeadPylot project but connects to its database.

## Prerequisites

1. **Main project database must be running**
   - Navigate to: `/Users/syedmomininislamtamim/LeadPylotNew/leadpylot`
   - Run: `docker-compose up mongo -d`
   - This starts MongoDB on `localhost:27017`

2. **Docker and Docker Compose installed**
   - Docker Desktop for Mac should be running

## Running the Microservice

### Option 1: Using Docker Compose (Recommended)

1. **Start the main project's database** (if not already running):
   ```bash
   cd /Users/syedmomininislamtamim/LeadPylotNew/leadpylot
   docker-compose up mongo -d
   ```

2. **Start this microservice**:
   ```bash
   cd /Users/syedmomininislamtamim/Desktop/lead-offer-project/lead-offer-service-api/lead-offers-service
   docker-compose up -d
   ```

3. **View logs**:
   ```bash
   docker-compose logs -f lead-offers-service
   ```

4. **Stop the service**:
   ```bash
   docker-compose down
   ```

### Option 2: Using Docker directly

Build the image:
```bash
docker build -t lead-offers-service:dev --target development .
```

Run the container:
```bash
docker run -d \
  --name lead-offers-service \
  -p 4003:4003 \
  --add-host host.docker.internal:host-gateway \
  --env-file .env \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/leadpylot \
  -v $(pwd)/src:/app/src \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/storage:/app/storage \
  -v $(pwd)/temp-uploads:/app/temp-uploads \
  lead-offers-service:dev
```

## Configuration

### Database Connection

The microservice connects to the main project's MongoDB using:
- **In Docker**: `mongodb://host.docker.internal:27017/leadpylot`
- **Outside Docker**: `mongodb://localhost:27017/leadpylot`

The `host.docker.internal` hostname allows Docker containers to connect to services running on the host machine.

### Environment Variables

Key environment variables in `.env`:
- `MONGODB_URI`: MongoDB connection string
- `PORT`: Service port (default: 4003)
- `NODE_ENV`: Environment mode (development/production)
- `JWT_SECRET`: **CRITICAL** - Must match the main project's JWT secret for token validation

For other services (user auth, email, etc.), the microservice uses URLs pointing to the main project:
- `USER_AUTH_SERVICE_URL=http://3.76.250.176:4000`
- `EMAIL_SERVICE_URL=http://3.76.250.176:4008`
- etc.

### Authentication

This microservice uses the **same JWT secret** as the main project, allowing it to verify tokens issued by the main project's authentication service. Users authenticated in the main project can seamlessly use this microservice without re-authentication.

**Important**: The `JWT_SECRET` in this microservice's `.env` file must **exactly match** the JWT secret in the main project's `.env` file. Any mismatch will result in "Invalid token" errors.

## Verifying the Setup

1. **Check if the service is running**:
   ```bash
   curl http://localhost:4003/health
   ```

2. **Check database connectivity**:
   ```bash
   docker-compose logs lead-offers-service | grep -i "mongo\|database\|connected"
   ```

3. **Access the service**:
   The service should be available at `http://localhost:4003`

## Troubleshooting

### Cannot connect to MongoDB

**Error**: `MongoNetworkError: connect ECONNREFUSED`

**Solutions**:
1. Verify main project's MongoDB is running:
   ```bash
   docker ps | grep mongo
   ```

2. Test MongoDB connection from your machine:
   ```bash
   mongosh mongodb://localhost:27017/leadpylot
   ```

3. Check if port 27017 is accessible:
   ```bash
   nc -zv localhost 27017
   ```

### Service won't start

1. Check logs:
   ```bash
   docker-compose logs lead-offers-service
   ```

2. Verify port 4003 is not in use:
   ```bash
   lsof -i :4003
   ```

3. Rebuild the container:
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up
   ```

## Development Workflow

### Hot Reload

The development setup includes volume mounts for `./src`, so changes to your source code will automatically reload the service (if you're using nodemon or similar).

### Viewing Real-time Logs

```bash
docker-compose logs -f lead-offers-service
```

### Rebuilding After Dependency Changes

If you modify `package.json`:
```bash
docker-compose down
docker-compose build
docker-compose up -d
```

## Production Build

To build for production:

```bash
docker build -t lead-offers-service:prod --target production .
```

Run in production mode:
```bash
docker run -d \
  --name lead-offers-service-prod \
  -p 4003:4003 \
  --add-host host.docker.internal:host-gateway \
  --env-file .env \
  -e NODE_ENV=production \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/leadpylot \
  lead-offers-service:prod
```

## Network Architecture

```
┌─────────────────────────────────────┐
│  Main Project                       │
│  (/LeadPylotNew/leadpylot)         │
│                                     │
│  ┌──────────────┐                  │
│  │   MongoDB    │◄─────────────────┼─────┐
│  │  port 27017  │                  │     │
│  └──────────────┘                  │     │
└─────────────────────────────────────┘     │
                                             │
                                             │
┌─────────────────────────────────────┐     │
│  Lead Offers Microservice           │     │
│  (Docker Container)                 │     │
│                                     │     │
│  Uses host.docker.internal ─────────┼─────┘
│  to connect to host's MongoDB      │
│                                     │
│  Exposes port 4003                  │
└─────────────────────────────────────┘
```

## Notes

- The microservice and main project share the same MongoDB database (`leadpylot`)
- Both can run simultaneously without conflicts
- The microservice uses port 4003, main project typically uses other ports
- Data is shared between both applications through the common database

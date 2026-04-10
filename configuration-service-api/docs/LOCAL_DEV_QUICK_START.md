# Local Development Quick Start Guide

## Prerequisites

- Docker and Docker Compose installed
- MongoDB running locally or accessible via `host.docker.internal:27017`
- All microservices cloned in the `leadpylot-microservices` directory

## Solution Overview

This guide implements **Solution 2: Docker Volume Mounting** for local development. The search service will access models from other services via Docker volume mounts.

## Architecture

```
Search Service Container (Port 3010)
├── /app/src (search service code)
├── /app/external-models/ (mounted from other services)
│   ├── lead-offer-service/ → ../lead-offer-service-api/src/models
│   ├── email-service/ → ../email-service-api/src/models
│   ├── notification-service/ → ../notification-service-api/src/models
│   ├── user-auth-service/ → ../user-auth-service-api/src/models
│   ├── configuration-service/ → ../configuration-service-api/src/models
│   └── pdf-service/ → ../pdf-service-api/src/models
└── /app/logs (search service logs)
```

## Quick Start Steps

### 1. Verify Project Structure

Ensure your directory structure looks like this:

```
leadpylot-microservices/
├── docker-compose.yaml
├── .env
├── lead-offer-service-api/
│   └── src/models/
├── email-service-api/
│   └── src/models/
├── notification-service-api/
│   └── src/models/
├── user-auth-service-api/
│   └── src/models/
├── configuration-service-api/
│   └── src/models/
├── pdf-service-api/
│   └── src/models/
└── search-service-api/
    └── src/models/loader.js
```

### 2. Start All Services

```bash
cd leadpylot-microservices

# Start all services including search service
docker-compose up -d

# View logs
docker-compose logs -f search-service-api
```

### 3. Verify Search Service Startup

Check if models loaded successfully:

```bash
# View search service logs
docker logs search-service-api | grep "Registered model"

# Expected output:
# Registered model: Lead (from /app/external-models/lead-offer-service/Lead.js)
# Registered model: Offer (from /app/external-models/lead-offer-service/Offer.js)
# Registered model: Opening (from /app/external-models/lead-offer-service/Opening.js)
# ...
# Model loading complete: X loaded, Y failed
```

### 4. Test Search Service Health

```bash
# Check health endpoint
curl http://localhost:3010/health

# Expected response:
# {"status":"ok","service":"search-service"}
```

### 5. Test Search Functionality

```bash
# Test metadata endpoint
curl http://localhost:3010/api/metadata/models

# Test search endpoint
curl -X POST http://localhost:3010/api/search/query \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Lead",
    "query": {},
    "limit": 10
  }'
```

## Troubleshooting

### Issue: Models not loading

**Symptoms:**

```
Failed to load model Lead: Not found in any configured path
```

**Solution:**

1. Check if model directories exist:

```bash
ls -la lead-offer-service-api/src/models/
ls -la email-service-api/src/models/
ls -la notification-service-api/src/models/
```

2. Check if volumes are mounted correctly:

```bash
docker exec search-service-api ls -la /app/external-models/
```

3. Verify docker-compose.yaml has correct volume paths:

```bash
docker-compose config | grep -A 10 search-service-api
```

### Issue: Permission denied accessing mounted volumes

**Symptoms:**

```
Error: EACCES: permission denied, open '/app/external-models/...'
```

**Solution:**

1. Check file permissions:

```bash
ls -la lead-offer-service-api/src/models/
```

2. Ensure files are readable:

```bash
chmod -R +r lead-offer-service-api/src/models/
chmod -R +r email-service-api/src/models/
chmod -R +r notification-service-api/src/models/
```

### Issue: Search service fails to start

**Symptoms:**

```
Error: Cannot find module 'mongoose'
```

**Solution:**

1. Rebuild the search service container:

```bash
docker-compose down search-service-api
docker-compose build search-service-api
docker-compose up -d search-service-api
```

2. Check if node_modules is properly mounted:

```bash
docker exec search-service-api ls -la /app/node_modules/
```

### Issue: MongoDB connection failed

**Symptoms:**

```
MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution:**

1. Ensure MongoDB is running:

```bash
# If using local MongoDB
brew services start mongodb-community

# Or check if MongoDB is accessible
docker exec search-service-api ping -c 1 host.docker.internal
```

2. Verify MongoDB connection string in docker-compose.yaml:

```bash
docker-compose exec search-service-api env | grep MONGODB_URI
```

## Development Workflow

### Making Changes to Models

When you modify a model in any service:

1. **No restart needed** - Models are loaded via volume mounts
2. **Restart search service** to reload models:

```bash
docker-compose restart search-service-api
```

3. **Verify models loaded**:

```bash
docker logs search-service-api | tail -20
```

### Adding New Models

To add a new model to the search service:

1. **Create the model** in its respective service directory
2. **Update** [`search-service-api/src/models/loader.js`](search-service-api/src/models/loader.js:1):

```javascript
{
    name: 'NewModel',
    paths: [
        '/app/external-models/your-service/NewModel.js',
        '../../../your-service/src/models/NewModel.js'
    ]
}
```

3. **Restart search service**:

```bash
docker-compose restart search-service-api
```

### Debugging Model Loading

To debug model loading issues:

1. **Enable debug logging** in search service:

```bash
docker-compose exec search-service-api sh
export LOG_LEVEL=debug
node src/app.js
```

2. **Check model paths**:

```bash
docker exec search-service-api sh
ls -la /app/external-models/lead-offer-service/
```

3. **Test model loading manually**:

```bash
docker exec search-service-api node -e "
const path = require('path');
const fs = require('fs');
const modelPath = '/app/external-models/lead-offer-service/Lead.js';
console.log('Path exists:', fs.existsSync(modelPath));
console.log('Absolute path:', path.resolve(modelPath));
"
```

## Performance Tips

### 1. Use Read-Only Volumes

The volumes are already mounted as read-only (`:ro`) for security and performance.

### 2. Minimize Model Size

Keep model files focused and avoid heavy computations in model definitions.

### 3. Cache Models

The search service caches model schemas after loading, so subsequent queries are fast.

### 4. Monitor Resource Usage

```bash
# Check container resource usage
docker stats search-service-api

# View logs without flooding terminal
docker logs search-service-api --tail 100 -f
```

## Next Steps

### For Production Deployment

See [`SEARCH_SERVICE_MODEL_ACCESS_SOLUTION.md`](SEARCH_SERVICE_MODEL_ACCESS_SOLUTION.md:1) for production deployment strategies:

1. **Solution 1: Shared Models Package** - Recommended for production
2. **Solution 3: API-Based Schema Discovery** - Alternative for distributed environments
3. **Solution 4: Hybrid Approach** - Best of both worlds

### For AWS EC2 Deployment

See the "Production Deployment (AWS EC2)" section in [`SEARCH_SERVICE_MODEL_ACCESS_SOLUTION.md`](SEARCH_SERVICE_MODEL_ACCESS_SOLUTION.md:1).

## Common Commands Reference

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart specific service
docker-compose restart search-service-api

# View logs
docker-compose logs -f search-service-api

# View logs for all services
docker-compose logs -f

# Check service status
docker-compose ps

# Execute command in container
docker-compose exec search-service-api sh

# Rebuild service
docker-compose build search-service-api

# Remove volumes (WARNING: deletes data)
docker-compose down -v

# Check mounted volumes
docker inspect search-service-api | grep -A 20 Mounts
```

## Support

If you encounter issues:

1. Check the logs: `docker logs search-service-api`
2. Verify volume mounts: `docker inspect search-service-api`
3. Review the comprehensive solution guide: [`SEARCH_SERVICE_MODEL_ACCESS_SOLUTION.md`](SEARCH_SERVICE_MODEL_ACCESS_SOLUTION.md:1)
4. Check model files exist in their respective directories

## Summary

✅ **What works:**

- Search service can access models from all other services
- Models are loaded via Docker volume mounts
- No code changes required in other services
- Real-time model updates during development

✅ **What to remember:**

- Restart search service after model changes
- All services must be in the same directory structure
- Volumes are mounted read-only for security
- This solution is for local development only

✅ **Next steps:**

- Test the search functionality
- Implement production solution (shared models package)
- Deploy to AWS EC2 instances

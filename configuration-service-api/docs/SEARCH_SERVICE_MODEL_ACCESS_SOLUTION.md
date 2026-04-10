# Search Service Model Access Solution

## Problem Statement

The search service requires access to Mongoose models from all other microservices to perform centralized querying. After separating microservices into individual repositories, the search service cannot access these models because:

1. **Previous Setup**: All services were in `leadpylot/backend/microservices/` - search service could access models via relative paths
2. **Current Setup**: Each service is in a separate repository - models are not available in the search service container
3. **Docker Issue**: Docker containers are isolated; models from other services are not accessible

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Search Service API                        │
│                  (Port 3010)                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Model Loader (loader.js)                            │  │
│  │  - Needs models from ALL services                    │  │
│  │  - Lead, Offer, Opening, User, Email, etc.           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│Lead-Offer     │   │Email          │   │Notification   │
│Service        │   │Service        │   │Service        │
│(Port 4003)    │   │(Port 4008)    │   │(Port 4004)    │
└───────────────┘   └───────────────┘   └───────────────┘
```

---

## Solution 1: Shared Models Package (Recommended for Production)

### Overview

Extract all shared Mongoose models into a separate npm package that can be installed by all services.

### Architecture

```
leadpylot-models/                    (Private npm package)
├── package.json
├── src/
│   ├── models/
│   │   ├── Lead.js
│   │   ├── Offer.js
│   │   ├── User.js
│   │   ├── Email.js
│   │   └── ...
│   └── index.js                    (Exports all models)
└── README.md
```

### Implementation Steps

#### Step 1: Create Shared Models Package

```bash
# Create new repository
mkdir leadpylot-models
cd leadpylot-models
npm init -y
```

**package.json:**

```json
{
  "name": "@leadpylot/models",
  "version": "1.0.0",
  "description": "Shared Mongoose models for LeadPylot microservices",
  "main": "src/index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": ["mongoose", "models", "leadpylot"],
  "author": "LeadPylot",
  "license": "PRIVATE",
  "dependencies": {
    "mongoose": "^7.0.0"
  },
  "peerDependencies": {
    "mongoose": "^7.0.0"
  }
}
```

**src/index.js:**

```javascript
const Lead = require('./models/Lead')
const Offer = require('./models/Offer')
const Opening = require('./models/Opening')
const User = require('./models/User')
const Email = require('./models/Email')
const Notification = require('./models/Notification')
const Role = require('./models/Role')
const Team = require('./models/Team')
// ... import all other models

module.exports = {
  Lead,
  Offer,
  Opening,
  User,
  Email,
  Notification,
  Role,
  Team,
  // ... export all models
}
```

#### Step 2: Publish Package

**Option A: Private npm registry (recommended)**

```bash
# Setup .npmrc
echo "@leadpylot:registry=http://your-private-registry.com" > .npmrc

# Publish
npm publish
```

**Option B: Git-based package (free alternative)**

```json
// In consuming package.json
{
  "dependencies": {
    "@leadpylot/models": "git+https://github.com/your-org/leadpylot-models.git#v1.0.0"
  }
}
```

#### Step 3: Update Search Service

**Update search-service-api/package.json:**

```json
{
  "dependencies": {
    "@leadpylot/models": "^1.0.0"
  }
}
```

**Update search-service-api/src/models/loader.js:**

```javascript
const {
  Lead,
  Offer,
  Opening,
  User,
  Email,
  Notification,
  Role,
  Team,
} = require('@leadpylot/models')
const queryEngine = require('../services/queryEngine')
const logger = require('../utils/logger')

const loadModels = () => {
  try {
    const models = {
      Lead,
      Offer,
      Opening,
      User,
      Email,
      Notification,
      Role,
      Team,
    }

    let loadedCount = 0

    Object.entries(models).forEach(([name, Model]) => {
      if (Model && Model.schema) {
        queryEngine.registerModel(name, Model.schema)
        logger.info(`Registered model: ${name}`)
        loadedCount++
      } else {
        logger.warn(`Failed to load model ${name}: No schema found`)
      }
    })

    logger.info(`Model loading complete: ${loadedCount} loaded`)
  } catch (error) {
    logger.error('Fatal error in model loader:', error)
  }
}

module.exports = loadModels
```

#### Step 4: Update Other Services

Each service should also use the shared models package:

**lead-offer-service-api/package.json:**

```json
{
  "dependencies": {
    "@leadpylot/models": "^1.0.0"
  }
}
```

**lead-offer-service-api/src/models/index.js:**

```javascript
const { Lead, Offer, Opening } = require('@leadpylot/models')

module.exports = {
  Lead,
  Offer,
  Opening,
}
```

### Pros

- ✅ Clean separation of concerns
- ✅ Version control for models
- ✅ Works in all environments (local, Docker, production)
- ✅ Single source of truth for models
- ✅ Easy to update models across all services

### Cons

- ❌ Initial setup effort
- ❌ Requires private npm registry or git-based package
- ❌ Breaking changes affect all services

---

## Solution 2: Docker Volume Mounting (Local Development Only)

### Overview

Mount model directories from other services into the search service container using Docker volumes.

### Implementation

**Update leadpylot-microservices/docker-compose.yaml:**

```yaml
search-service-api:
  build:
    context: ./search-service-api
    dockerfile: Dockerfile
  container_name: search-service-api
  image: leadpylot/search-service-api:latest
  ports:
    - '3010:3010'
  environment:
    - NODE_ENV=development
    - PORT=3010
    - MONGODB_URI=mongodb://host.docker.internal:27017/leadpylot
    - LOG_LEVEL=info
  volumes:
    # Mount model directories from other services
    - ./lead-offer-service-api/src/models:/app/external-models/lead-offer-service:ro
    - ./email-service-api/src/models:/app/external-models/email-service:ro
    - ./notification-service-api/src/models:/app/external-models/notification-service:ro
    - ./user-auth-service-api/src/models:/app/external-models/user-auth-service:ro
    - ./configuration-service-api/src/models:/app/external-models/configuration-service:ro
    - ./pdf-service-api/src/models:/app/external-models/pdf-service:ro
    - ./search-service-api/src:/app/src
    - ./search-service-api/logs:/app/logs
    - /app/node_modules
  restart: unless-stopped
  healthcheck:
    test: ['CMD-SHELL', 'curl -f http://localhost:3010/health || exit 1']
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
```

**Update search-service-api/src/models/loader.js:**

```javascript
const fs = require('fs')
const path = require('path')
const queryEngine = require('../services/queryEngine')
const logger = require('../utils/logger')

const loadModels = () => {
  try {
    const modelDefinitions = [
      // Lead-Offer Service Models
      {
        name: 'Lead',
        paths: [
          '/app/external-models/lead-offer-service/Lead.js',
          '../../../lead-offers-service/src/models/Lead.js',
        ],
      },
      {
        name: 'Offer',
        paths: [
          '/app/external-models/lead-offer-service/Offer.js',
          '../../../lead-offers-service/src/models/Offer.js',
        ],
      },
      // Email Service Models
      {
        name: 'Email',
        paths: [
          '/app/external-models/email-service/Email.js',
          '../../../email-service/src/models/Email.js',
        ],
      },
      // Notification Service Models
      {
        name: 'Notification',
        paths: [
          '/app/external-models/notification-service/Notification.js',
          '../../../notification-service/src/models/Notification.js',
        ],
      },
      // User Auth Service Models
      {
        name: 'Role',
        paths: [
          '/app/external-models/user-auth-service/Role.js',
          '../../../user-auth-service/src/models/Role.js',
          './Role.js',
        ],
      },
      // ... add all other models
    ]

    let loadedCount = 0
    let failedCount = 0

    modelDefinitions.forEach((modelInfo) => {
      let loaded = false

      for (const relativePath of modelInfo.paths) {
        try {
          const modelPath = path.resolve(__dirname, relativePath)
          if (fs.existsSync(modelPath)) {
            const exported = require(modelPath)

            let Model = null

            if (exported && exported.schema) {
              Model = exported
            } else if (
              exported &&
              exported[modelInfo.name] &&
              exported[modelInfo.name].schema
            ) {
              Model = exported[modelInfo.name]
            } else if (exported) {
              for (const key of Object.keys(exported)) {
                if (exported[key] && exported[key].schema) {
                  Model = exported[key]
                  break
                }
              }
            }

            if (Model && Model.schema) {
              queryEngine.registerModel(modelInfo.name, Model.schema)
              logger.info(
                `Registered model: ${modelInfo.name} (from ${relativePath})`
              )
              loaded = true
              loadedCount++
              break
            }
          }
        } catch (err) {
          // Continue to next path
        }
      }

      if (!loaded) {
        failedCount++
        logger.warn(
          `Failed to load model ${modelInfo.name}: Not found in any configured path`
        )
      }
    })

    logger.info(
      `Model loading complete: ${loadedCount} loaded, ${failedCount} failed`
    )
  } catch (error) {
    logger.error('Fatal error in model loader:', error)
  }
}

module.exports = loadModels
```

### Pros

- ✅ Quick implementation for local development
- ✅ No code refactoring required
- ✅ Real-time model updates during development

### Cons

- ❌ Only works for local development (not production)
- ❌ Tightly couples services
- ❌ Requires all services to be on the same machine
- ❌ Not suitable for distributed architecture

---

## Solution 3: API-Based Model Schema Discovery (Production)

### Overview

Each service exposes its model schemas via API endpoints. The search service fetches schemas dynamically.

### Implementation

#### Step 1: Add Schema Endpoint to Each Service

**lead-offer-service-api/src/routes/schemaRoutes.js:**

```javascript
const express = require('express')
const router = express.Router()
const Lead = require('../models/Lead')
const Offer = require('../models/Offer')
const Opening = require('../models/Opening')

router.get('/schemas', (req, res) => {
  const schemas = {
    Lead: Lead.schema.obj,
    Offer: Offer.schema.obj,
    Opening: Opening.schema.obj,
  }
  res.json({ success: true, schemas })
})

module.exports = router
```

**lead-offer-service-api/src/app.js:**

```javascript
const schemaRoutes = require('./routes/schemaRoutes')
app.use('/api/schema', schemaRoutes)
```

#### Step 2: Update Search Service to Fetch Schemas

**search-service-api/src/services/schemaFetcher.js:**

```javascript
const axios = require('axios')
const logger = require('../utils/logger')

const serviceEndpoints = {
  'lead-offer-service': 'http://host.docker.internal:4003',
  'email-service': 'http://host.docker.internal:4008',
  'notification-service': 'http://host.docker.internal:4004',
  'user-auth-service': 'http://host.docker.internal:4000',
  'configuration-service': 'http://host.docker.internal:4006',
  'pdf-service': 'http://host.docker.internal:4009',
}

const fetchSchemas = async () => {
  const schemas = {}

  for (const [serviceName, baseUrl] of Object.entries(serviceEndpoints)) {
    try {
      const response = await axios.get(`${baseUrl}/api/schema/schemas`, {
        timeout: 5000,
      })

      if (response.data.success && response.data.schemas) {
        Object.assign(schemas, response.data.schemas)
        logger.info(`Fetched schemas from ${serviceName}`)
      }
    } catch (error) {
      logger.warn(`Failed to fetch schemas from ${serviceName}:`, error.message)
    }
  }

  return schemas
}

module.exports = { fetchSchemas }
```

**search-service-api/src/models/loader.js:**

```javascript
const { fetchSchemas } = require('../services/schemaFetcher')
const queryEngine = require('../services/queryEngine')
const logger = require('../utils/logger')

const loadModels = async () => {
  try {
    logger.info('Fetching schemas from all services...')
    const schemas = await fetchSchemas()

    let loadedCount = 0

    Object.entries(schemas).forEach(([name, schema]) => {
      if (schema) {
        queryEngine.registerModel(name, schema)
        logger.info(`Registered model: ${name}`)
        loadedCount++
      }
    })

    logger.info(`Model loading complete: ${loadedCount} loaded`)
  } catch (error) {
    logger.error('Fatal error in model loader:', error)
  }
}

module.exports = loadModels
```

**search-service-api/src/app.js:**

```javascript
// Load Models (async)
const loadModels = require('./models/loader')
loadModels()
```

### Pros

- ✅ Works in distributed environments
- ✅ No shared code required
- ✅ Services remain independent
- ✅ Dynamic schema updates

### Cons

- ❌ Network overhead
- ❌ Requires all services to be running
- ❌ More complex implementation
- ❌ Potential startup delays

---

## Solution 4: Hybrid Approach (Recommended)

### Overview

Combine different solutions for different environments:

- **Local Development**: Docker volume mounting (Solution 2)
- **Production**: Shared models package (Solution 1)

### Implementation

#### Local Development (Docker Volume Mounting)

Use Solution 2 for local development as documented above.

#### Production (Shared Models Package)

Use Solution 1 for production deployment.

#### Environment-Specific Configuration

**search-service-api/src/models/loader.js:**

```javascript
const fs = require('fs')
const path = require('path')
const queryEngine = require('../services/queryEngine')
const logger = require('../utils/logger')

const loadModels = () => {
  try {
    const NODE_ENV = process.env.NODE_ENV || 'development'

    if (NODE_ENV === 'production') {
      // Production: Use shared models package
      logger.info('Loading models from @leadpylot/models package...')
      loadModelsFromPackage()
    } else {
      // Development: Load from mounted volumes
      logger.info('Loading models from mounted volumes...')
      loadModelsFromVolumes()
    }
  } catch (error) {
    logger.error('Fatal error in model loader:', error)
  }
}

const loadModelsFromPackage = () => {
  try {
    const models = require('@leadpylot/models')
    let loadedCount = 0

    Object.entries(models).forEach(([name, Model]) => {
      if (Model && Model.schema) {
        queryEngine.registerModel(name, Model.schema)
        logger.info(`Registered model: ${name}`)
        loadedCount++
      }
    })

    logger.info(`Model loading complete: ${loadedCount} loaded`)
  } catch (error) {
    logger.error('Failed to load models from package:', error)
  }
}

const loadModelsFromVolumes = () => {
  // Implementation from Solution 2
  const modelDefinitions = [
    {
      name: 'Lead',
      paths: ['/app/external-models/lead-offer-service/Lead.js'],
    },
    {
      name: 'Offer',
      paths: ['/app/external-models/lead-offer-service/Offer.js'],
    },
    // ... all other models
  ]

  let loadedCount = 0
  let failedCount = 0

  modelDefinitions.forEach((modelInfo) => {
    let loaded = false

    for (const relativePath of modelInfo.paths) {
      try {
        const modelPath = path.resolve(__dirname, relativePath)
        if (fs.existsSync(modelPath)) {
          const exported = require(modelPath)

          let Model = null

          if (exported && exported.schema) {
            Model = exported
          } else if (
            exported &&
            exported[modelInfo.name] &&
            exported[modelInfo.name].schema
          ) {
            Model = exported[modelInfo.name]
          } else if (exported) {
            for (const key of Object.keys(exported)) {
              if (exported[key] && exported[key].schema) {
                Model = exported[key]
                break
              }
            }
          }

          if (Model && Model.schema) {
            queryEngine.registerModel(modelInfo.name, Model.schema)
            logger.info(`Registered model: ${modelInfo.name}`)
            loaded = true
            loadedCount++
            break
          }
        }
      } catch (err) {
        // Continue to next path
      }
    }

    if (!loaded) {
      failedCount++
      logger.warn(`Failed to load model ${modelInfo.name}`)
    }
  })

  logger.info(
    `Model loading complete: ${loadedCount} loaded, ${failedCount} failed`
  )
}

module.exports = loadModels
```

### Pros

- ✅ Best of both worlds
- ✅ Optimal for each environment
- ✅ Flexible and maintainable
- ✅ Production-ready

### Cons

- ❌ Requires maintaining two approaches
- ❌ More complex setup

---

## Recommended Implementation Plan

### Phase 1: Quick Fix (Local Development - 1 day)

1. Implement Solution 2 (Docker volume mounting)
2. Update docker-compose.yaml
3. Test search service locally
4. Document the setup

### Phase 2: Production Solution (1-2 weeks)

1. Create shared models package (Solution 1)
2. Set up private npm registry or git-based package
3. Refactor search service to use shared package
4. Update all services to use shared models
5. Test in staging environment

### Phase 3: Hybrid Implementation (Optional - 3-5 days)

1. Implement environment-specific model loading (Solution 4)
2. Update docker-compose for local development
3. Deploy to production with shared models package
4. Monitor and optimize

---

## Production Deployment (AWS EC2)

### Architecture

```
AWS EC2 Instances:
├── EC2 Instance 1: User Auth Service (Port 4000)
├── EC2 Instance 2: Configuration Service (Port 4006)
├── EC2 Instance 3: Document Service (Port 4002)
├── EC2 Instance 4: Email Service (Port 4008)
├── EC2 Instance 5: Lead Offer Service (Port 4003)
├── EC2 Instance 6: Notification Service (Port 4004)
├── EC2 Instance 7: PDF Service (Port 4009)
├── EC2 Instance 8: Reporting Service (Port 4007)
└── EC2 Instance 9: Search Service (Port 3010)

Shared Resources:
├── MongoDB (Atlas or EC2)
├── Redis (ElastiCache or EC2)
└── S3 (for file storage)
```

### Deployment Steps

#### 1. Build and Push Docker Images

```bash
# Build images
cd leadpylot-microservices/search-service-api
docker build -t leadpylot/search-service-api:latest .

# Push to registry
docker push leadpylot/search-service-api:latest

# Repeat for all services
```

#### 2. Deploy Each Service

**search-service-api Dockerfile (Production):**

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3010

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3010/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); });"

# Start application
CMD ["node", "src/app.js"]
```

**docker-compose.prod.yaml:**

```yaml
version: '3.8'

services:
  search-service-api:
    image: leadpylot/search-service-api:latest
    container_name: search-service-api
    ports:
      - '3010:3010'
    environment:
      - NODE_ENV=production
      - PORT=3010
      - MONGODB_URI=${MONGODB_URI}
      - LOG_LEVEL=info
    restart: unless-stopped
    healthcheck:
      test: ['CMD-SHELL', 'curl -f http://localhost:3010/health || exit 1']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'
```

#### 3. Deploy to EC2

```bash
# SSH into EC2 instance
ssh -i your-key.pem ec2-user@your-ec2-ip

# Clone repository
git clone https://github.com/your-org/leadpylot-microservices.git
cd leadpylot-microservices

# Copy environment file
cp .env.prod .env

# Start service
docker-compose -f docker-compose.prod.yaml up -d
```

#### 4. Configure Load Balancer (Optional)

Use AWS Application Load Balancer to distribute traffic:

```bash
# Create target groups for each service
# Register EC2 instances
# Configure health checks
# Set up routing rules
```

#### 5. Monitor and Scale

```bash
# View logs
docker logs -f search-service-api

# Scale services
docker-compose up -d --scale search-service-api=3

# Monitor with CloudWatch
aws logs tail /aws/leadpylot/search-service --follow
```

---

## Troubleshooting

### Issue: Models not loading in Docker

**Symptoms:**

```
Failed to load model Lead: Not found in any configured path
```

**Solution:**

1. Check if volumes are mounted correctly:
   ```bash
   docker exec search-service-api ls -la /app/external-models/
   ```
2. Verify model files exist in source directories
3. Check file permissions
4. Review docker-compose.yaml volume paths

### Issue: Search service fails to start in production

**Symptoms:**

```
Error: Cannot find module '@leadpylot/models'
```

**Solution:**

1. Ensure shared models package is published
2. Check .npmrc configuration
3. Verify package.json dependencies
4. Run `npm install` in the container

### Issue: Network connectivity between services

**Symptoms:**

```
Failed to fetch schemas from lead-offer-service: connect ECONNREFUSED
```

**Solution:**

1. Verify service endpoints in environment variables
2. Check security groups allow inter-service communication
3. Ensure all services are running
4. Test connectivity: `curl http://host.docker.internal:4003/health`

---

## Summary

| Solution                   | Local Dev | Production | Complexity | Recommended |
| -------------------------- | --------- | ---------- | ---------- | ----------- |
| Shared Models Package      | ✅        | ✅         | Medium     | ⭐⭐⭐⭐⭐  |
| Docker Volume Mounting     | ✅        | ❌         | Low        | ⭐⭐⭐      |
| API-Based Schema Discovery | ✅        | ✅         | High       | ⭐⭐        |
| Hybrid Approach            | ✅        | ✅         | High       | ⭐⭐⭐⭐    |

**Final Recommendation:**

- **Immediate**: Use Docker volume mounting for local development (Solution 2)
- **Long-term**: Implement shared models package for production (Solution 1)
- **Optional**: Combine both with environment-specific loading (Solution 4)

---

## Additional Resources

- [Docker Volumes Documentation](https://docs.docker.com/storage/volumes/)
- [Private npm Packages](https://docs.npmjs.com/private-packages/intro)
- [Git-based npm packages](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#git-urls-as-dependencies)
- [AWS EC2 Deployment Guide](https://docs.aws.amazon.com/AmazonEC2/latest/UserGuide/ec2-launch-instance.html)
- [Docker Compose Production](https://docs.docker.com/compose/production/)

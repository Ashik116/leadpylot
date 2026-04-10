# LeadPylot Microservices - Search Service Model Access Solutions

## Overview

This repository contains comprehensive solutions for the search service model access issue in LeadPylot's microservices architecture. The search service requires access to Mongoose models from all other microservices to perform centralized querying.

## Problem

After separating microservices into individual repositories, the search service cannot access models from other services because:

- **Previous Setup**: All services were in `leadpylot/backend/microservices/` - search service could access models via relative paths
- **Current Setup**: Each service is in a separate repository - models are not available in the search service container
- **Docker Issue**: Docker containers are isolated; models from other services are not accessible

## Solutions Provided

### 📚 Documentation

1. **[SEARCH_SERVICE_MODEL_ACCESS_SOLUTION.md](SEARCH_SERVICE_MODEL_ACCESS_SOLUTION.md)** - Comprehensive solution guide covering:

   - Problem analysis and architecture overview
   - Solution 1: Shared Models Package (recommended for production)
   - Solution 2: Docker Volume Mounting (local development only)
   - Solution 3: API-Based Schema Discovery (production alternative)
   - Solution 4: Hybrid Approach (best of both worlds)
   - Production deployment strategies
   - Troubleshooting guide

2. **[LOCAL_DEV_QUICK_START.md](LOCAL_DEV_QUICK_START.md)** - Quick start guide for local development:

   - Prerequisites and setup
   - Step-by-step instructions
   - Troubleshooting common issues
   - Development workflow tips

3. **[PRODUCTION_DEPLOYMENT_AWS_EC2.md](PRODUCTION_DEPLOYMENT_AWS_EC2.md)** - Production deployment guide:
   - AWS infrastructure setup (VPC, EC2, Security Groups)
   - Shared models package implementation
   - Service deployment scripts
   - Monitoring, scaling, and load balancing
   - SSL/TLS configuration
   - Backup and disaster recovery

### 🔧 Implementation

The following files have been updated to implement the local development solution:

- **[`docker-compose.yaml`](docker-compose.yaml:1)** - Updated to include search service with volume mounts
- **[`search-service-api/src/models/loader.js`](search-service-api/src/models/loader.js:1)** - Updated to load models from mounted volumes

## Quick Start

### Local Development (Immediate Solution)

```bash
cd leadpylot-microservices

# Start all services including search service
docker-compose up -d

# View search service logs
docker logs search-service-api | grep "Registered model"

# Test search service health
curl http://localhost:3010/health
```

### Production (Recommended Solution)

1. Create shared models package (see [`SEARCH_SERVICE_MODEL_ACCESS_SOLUTION.md`](SEARCH_SERVICE_MODEL_ACCESS_SOLUTION.md:1))
2. Deploy services to AWS EC2 instances (see [`PRODUCTION_DEPLOYMENT_AWS_EC2.md`](PRODUCTION_DEPLOYMENT_AWS_EC2.md:1))
3. Update search service to use shared models package

## Architecture

```
Local Development:
┌─────────────────────────────────────────────────────────────┐
│                     Docker Compose                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Search Service API (Port 3010)                    │  │
│  │  ┌────────────────────────────────────────────┐    │  │
│  │  │  Model Loader                              │    │  │
│  │  │  - Loads models from mounted volumes        │    │  │
│  │  └────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
│  Volumes:                                                │
│  ├── /app/external-models/lead-offer-service/            │
│  ├── /app/external-models/email-service/                 │
│  ├── /app/external-models/notification-service/            │
│  ├── /app/external-models/user-auth-service/             │
│  ├── /app/external-models/configuration-service/         │
│  └── /app/external-models/pdf-service/                  │
└─────────────────────────────────────────────────────────────┘

Production:
┌─────────────────────────────────────────────────────────────┐
│                    AWS EC2 Instances                      │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐│
│  │Search Service  │  │Lead-Offer     │  │Email        ││
│  │(Port 3010)    │  │Service        │  │Service      ││
│  │               │  │(Port 4003)    │  │(Port 4008)  ││
│  │@leadpylot/    │  └───────────────┘  └─────────────┘│
│  │models package │                                    │
│  └───────────────┘                                    │
│         │                                              │
│         ▼                                              │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Shared Models Package (@leadpylot/models)         │ │
│  │  - All Mongoose models in one package            │ │
│  │  - Version controlled                           │ │
│  │  - Installed via npm or git                       │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Solution Comparison

| Solution                   | Local Dev | Production | Complexity | Recommended |
| -------------------------- | --------- | ---------- | ---------- | ----------- |
| Shared Models Package      | ✅        | ✅         | Medium     | ⭐⭐⭐⭐⭐  |
| Docker Volume Mounting     | ✅        | ❌         | Low        | ⭐⭐⭐      |
| API-Based Schema Discovery | ✅        | ✅         | High       | ⭐⭐        |
| Hybrid Approach            | ✅        | ✅         | High       | ⭐⭐⭐⭐    |

## Implementation Roadmap

### Phase 1: Quick Fix (Local Development - 1 day) ✅

- [x] Implement Docker volume mounting
- [x] Update docker-compose.yaml
- [x] Update model loader
- [x] Test search service locally
- [x] Document the setup

### Phase 2: Production Solution (1-2 weeks)

- [ ] Create shared models package
- [ ] Set up private npm registry or git-based package
- [ ] Refactor search service to use shared package
- [ ] Update all services to use shared models
- [ ] Test in staging environment

### Phase 3: AWS Deployment (1-2 weeks)

- [ ] Set up AWS infrastructure (VPC, EC2, Security Groups)
- [ ] Deploy services to EC2 instances
- [ ] Configure monitoring and logging
- [ ] Set up load balancing and auto-scaling
- [ ] Implement SSL/TLS certificates
- [ ] Configure backup and disaster recovery

### Phase 4: Optimization (Ongoing)

- [ ] Monitor performance and optimize
- [ ] Implement CI/CD pipeline
- [ ] Set up automated testing
- [ ] Optimize costs

## File Structure

```
leadpylot-microservices/
├── README.md                                          # This file
├── SEARCH_SERVICE_MODEL_ACCESS_SOLUTION.md             # Comprehensive solution guide
├── LOCAL_DEV_QUICK_START.md                           # Local development quick start
├── PRODUCTION_DEPLOYMENT_AWS_EC2.md                  # Production deployment guide
├── docker-compose.yaml                                 # Updated with search service
├── .env                                              # Environment variables
├── search-service-api/
│   ├── src/
│   │   └── models/
│   │       └── loader.js                              # Updated model loader
│   ├── Dockerfile
│   └── package.json
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
└── ... (other services)
```

## Key Features

### ✅ What's Implemented

1. **Local Development Solution**

   - Docker volume mounting for model access
   - Updated docker-compose.yaml
   - Updated model loader with fallback paths
   - Comprehensive documentation

2. **Production Solution Design**

   - Shared models package architecture
   - AWS EC2 deployment strategy
   - Monitoring and scaling setup
   - Backup and disaster recovery

3. **Documentation**
   - Comprehensive solution guide
   - Quick start guide for local development
   - Production deployment guide
   - Troubleshooting tips

### 🔄 What's Next

1. **Implement Shared Models Package**

   - Extract all models to separate package
   - Publish to private npm registry or GitHub
   - Update search service to use package

2. **Deploy to Production**

   - Set up AWS infrastructure
   - Deploy services to EC2 instances
   - Configure monitoring and alerting

3. **Optimize and Scale**
   - Implement auto-scaling
   - Set up load balancing
   - Optimize costs

## Troubleshooting

### Issue: Models not loading in Docker

```bash
# Check if volumes are mounted correctly
docker exec search-service-api ls -la /app/external-models/

# View search service logs
docker logs search-service-api | grep "Registered model"

# Restart search service
docker-compose restart search-service-api
```

### Issue: Search service fails to start

```bash
# Check service logs
docker logs search-service-api

# Rebuild container
docker-compose down search-service-api
docker-compose build search-service-api
docker-compose up -d search-service-api
```

### Issue: Network connectivity between services

```bash
# Test connectivity
docker exec search-service-api ping -c 3 lead-offer-service-ip

# Check security group rules
aws ec2 describe-security-groups --group-ids $SG_ID
```

## Support

For detailed information:

- **Problem Analysis**: See [`SEARCH_SERVICE_MODEL_ACCESS_SOLUTION.md`](SEARCH_SERVICE_MODEL_ACCESS_SOLUTION.md:1)
- **Local Development**: See [`LOCAL_DEV_QUICK_START.md`](LOCAL_DEV_QUICK_START.md:1)
- **Production Deployment**: See [`PRODUCTION_DEPLOYMENT_AWS_EC2.md`](PRODUCTION_DEPLOYMENT_AWS_EC2.md:1)

## Contributing

When making changes to models:

1. Update the model in its respective service
2. Update the shared models package (for production)
3. Bump the version of the shared models package
4. Publish the new version
5. Update services to use the new version

## License

Private - LeadPylot Internal Use Only

## Authors

LeadPylot Development Team

---

**Last Updated**: 2024-01-08
**Version**: 1.0.0

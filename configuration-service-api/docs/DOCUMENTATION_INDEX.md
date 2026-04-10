# Configuration Service - Documentation Index

**Version:** 1.1.0  
**Last Updated:** March 2026

Welcome to the Configuration Service documentation! This service is the central administrative hub of the LeadPylot platform, managing organizational structures, business rules, and communication templates.

---

## 📚 Documentation

### Getting Started

| Document | Description | Audience |
|----------|-------------|----------|
| **[NON_TECHNICAL_OVERVIEW.md](./NON_TECHNICAL_OVERVIEW.md)** | Business-friendly overview of features and capabilities | Business users, Product managers |
| **[TECHNICAL_OVERVIEW_SHORT.md](./TECHNICAL_OVERVIEW_SHORT.md)** | Quick technical reference with key statistics | Developers (quick reference) |
| **[TECHNICAL_OVERVIEW.md](./TECHNICAL_OVERVIEW.md)** | Complete technical documentation with API endpoints | Developers, System architects |

### Service Integrations (NEW!)

| Document | Description | Audience |
|----------|-------------|----------|
| **[SERVICE_INTEGRATIONS.md](./SERVICE_INTEGRATIONS.md)** ⭐ | **Comprehensive integration guide** covering all service communications, API contracts, authentication, error handling, and troubleshooting | Developers, DevOps |
| **[INTEGRATION_ARCHITECTURE.md](./INTEGRATION_ARCHITECTURE.md)** 📊 | **Visual architecture guide** with diagrams showing data flows, sequence diagrams, and security layers | Developers, System architects |
| **[SERVICE_INTEGRATIONS_QUICK_REFERENCE.md](./SERVICE_INTEGRATIONS_QUICK_REFERENCE.md)** ⚡ | **Quick reference** for common integration patterns and troubleshooting | Developers (quick reference) |

### Additional Resources

| Document | Description | Audience |
|----------|-------------|----------|
| **[LOCAL_DEV_QUICK_START.md](./LOCAL_DEV_QUICK_START.md)** | Quick start guide for local development | Developers |
| **[PRODUCTION_DEPLOYMENT_AWS_EC2.md](./PRODUCTION_DEPLOYMENT_AWS_EC2.md)** | Production deployment guide for AWS | DevOps, System administrators |
| **[SEARCH_SERVICE_MODEL_ACCESS_SOLUTION.md](./SEARCH_SERVICE_MODEL_ACCESS_SOLUTION.md)** | Search service integration solution | Developers, DevOps |
| **[SAVED_FILTERS_API.md](./SAVED_FILTERS_API.md)** | Saved filter presets (Odoo-style `domain`), REST contract for frontend | Frontend, full-stack developers |

---

## 🎯 Quick Navigation

### I want to understand...

- **What this service does** → Start with [NON_TECHNICAL_OVERVIEW.md](./NON_TECHNICAL_OVERVIEW.md)
- **How services communicate** → Read [SERVICE_INTEGRATIONS.md](./SERVICE_INTEGRATIONS.md)
- **System architecture** → See [INTEGRATION_ARCHITECTURE.md](./INTEGRATION_ARCHITECTURE.md)
- **API endpoints** → Check [TECHNICAL_OVERVIEW.md](./TECHNICAL_OVERVIEW.md)
- **How to set up locally** → Follow [LOCAL_DEV_QUICK_START.md](./LOCAL_DEV_QUICK_START.md)

### I need to...

- **Integrate with Auth Service** → See [Service Integrations § Auth Service](./SERVICE_INTEGRATIONS.md#3-auth-service-integration)
- **Upload files to Document Service** → See [Service Integrations § Document Service](./SERVICE_INTEGRATIONS.md#4-document-service-integration)
- **Sync leads with Lead Service** → See [Service Integrations § Lead Service](./SERVICE_INTEGRATIONS.md#5-lead-service-integration)
- **Send notifications** → See [Service Integrations § Notification Service](./SERVICE_INTEGRATIONS.md#6-notification-service-integration)
- **Troubleshoot integration issues** → Check [Service Integrations § Troubleshooting](./SERVICE_INTEGRATIONS.md#12-troubleshooting)
- **Deploy to production** → Follow [PRODUCTION_DEPLOYMENT_AWS_EC2.md](./PRODUCTION_DEPLOYMENT_AWS_EC2.md)

---

## 🔗 Service Integrations Overview

The Configuration Service integrates with multiple microservices:

```
                    ┌─────────────────────────┐
                    │   API Gateway           │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │  Configuration Service  │
                    │      (Port 4006)        │
                    └─┬───┬───┬───┬───┬───┬───┘
                      │   │   │   │   │   │
            ┌─────────┴─┬─┴─┬─┴─┬─┴─┬─┴─┬─┴───────┐
            │           │   │   │   │   │         │
            ▼           ▼   ▼   ▼   ▼   ▼         ▼
        ┌────────┐  ┌─────┐ │ │ │ │ ┌───────┐ ┌──────┐
        │  Auth  │  │ Doc │ │ │ │ │ │Notif. │ │Search│
        │Service │  │Svc  │ │ │ │ │ │Service│ │Svc   │
        │ (4000) │  │(4001)│ │ │ │ │ │(4004) │ │(3010)│
        └────────┘  └─────┘ │ │ │ │ └───────┘ └──────┘
                            ▼ ▼ ▼ ▼
                        ┌────────────┐
                        │Lead Service│
                        │   (4003)   │
                        └────────────┘
```

**Integration Patterns:**
- **Auth Service:** JWT validation (passive)
- **Document Service:** Synchronous REST API (file uploads)
- **Lead Service:** Synchronous REST API (data sync)
- **Notification Service:** Event-driven (fire-and-forget)
- **Search Service:** Synchronous REST API (optional)
- **Gateway:** Header validation

**For detailed integration documentation:** [SERVICE_INTEGRATIONS.md](./SERVICE_INTEGRATIONS.md)

---

## 🚀 Key Features

### Core Capabilities
- **Organizational Management:** Banks, Projects, Teams
- **Lead Lifecycle:** Assignments, Sources, Stages
- **External Lead Capture:** Lead Forms, Domain Whitelisting
- **Communication Templates:** Email & PDF templates
- **System Configuration:** Settings, VOIP, Preferences
- **Closed Lead Management:** Archiving, Reverting, Reassignment

### Integration Capabilities
- **JWT Authentication:** Secure, stateless authentication
- **File Management:** Bank logos, signatures via Document Service
- **Lead Synchronization:** Real-time sync with Lead Service
- **Event Notifications:** Automated alerts to users
- **Advanced Search:** Full-text search via Search Service
- **Gateway Security:** Request validation and tenant isolation

---

## 🔐 Security

The Configuration Service implements multiple security layers:

1. **API Gateway** - Rate limiting, SSL termination
2. **Gateway Authentication** - Secret-based validation
3. **JWT Authentication** - Token signature verification
4. **Authorization (RBAC)** - Role-based permissions
5. **Business Logic Validation** - Data and rule validation

**For security details:** [SERVICE_INTEGRATIONS.md § Security](./SERVICE_INTEGRATIONS.md#11-security-considerations)

---

## ⚙️ Configuration

### Required Environment Variables

```bash
# Database
MONGODB_URI=mongodb://localhost:27019/leadpylot

# Authentication
JWT_SECRET=<shared-with-auth-service>

# Service URLs
AUTH_SERVICE_URL=http://localhost:4000
DOCUMENT_SERVICE_URL=http://localhost:4001
LEAD_SERVICE_URL=http://localhost:4003
NOTIFICATION_SERVICE_URL=http://localhost:4004
SEARCH_SERVICE_URL=http://localhost:3010

# Gateway
GATEWAY_SECRET=<shared-with-gateway>
GATEWAY_AUTH_ENABLED=true
```

**For complete configuration:** [TECHNICAL_OVERVIEW.md](./TECHNICAL_OVERVIEW.md)

---

## 🔧 API Endpoints

### Core Modules

| Module | Endpoints | Description |
|--------|-----------|-------------|
| **Banks** | `/api/banks` | Financial institution management |
| **Projects** | `/api/projects` | Project & team management |
| **Assignments** | `/api/assignments` | Lead assignment tracking |
| **Sources** | `/api/sources` | Marketing channel tracking |
| **Lead Forms** | `/api/lead-forms` | External lead capture |
| **Closed Leads** | `/api/closed-leads` | Historical lead preservation |
| **Settings** | `/api/settings` | System configuration |

**For complete API reference:** [TECHNICAL_OVERVIEW.md](./TECHNICAL_OVERVIEW.md)

---

## 🛠️ Development

### Local Setup

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env

# Start the service
npm run dev

# Run tests
npm test
```

**For detailed setup:** [LOCAL_DEV_QUICK_START.md](./LOCAL_DEV_QUICK_START.md)

### Docker Setup

```bash
# Build and start
docker-compose up -d configuration-service-api

# View logs
docker logs configuration-service-api

# Stop
docker-compose down
```

---

## 🐛 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Authentication required" | Check JWT_SECRET matches Auth Service |
| "Service unreachable" | Verify service URLs and connectivity |
| "Forbidden" (Gateway) | Check GATEWAY_SECRET is correct |
| "Database connection failed" | Verify MONGODB_URI is correct |

**For detailed troubleshooting:** [SERVICE_INTEGRATIONS.md § Troubleshooting](./SERVICE_INTEGRATIONS.md#12-troubleshooting)

---

## 📊 Architecture

### Layered Architecture

```
┌─────────────────────────────────────┐
│      Controllers (HTTP Layer)       │
│  • Request validation               │
│  • Response formatting              │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Services (Business Logic)      │
│  • Business rules                   │
│  • Cross-service orchestration      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Models (Data Layer)            │
│  • Schema validation                │
│  • Database operations              │
└─────────────────────────────────────┘
```

**For detailed architecture:** [INTEGRATION_ARCHITECTURE.md](./INTEGRATION_ARCHITECTURE.md)

---

## 📦 Data Models

### Primary Models
- **Bank:** Financial institutions with access control
- **Project:** Projects/teams with branding
- **Assignment:** Lead-to-project-to-agent mapping
- **Source:** Marketing channel tracking
- **ClosedLead:** Historical lead data
- **LeadForm:** External lead submissions
- **Settings:** System configuration
- **ColumnPreference:** UI customization

**For complete data models:** [TECHNICAL_OVERVIEW.md § Data Models](./TECHNICAL_OVERVIEW.md#3-core-data-models)

---

## 🤝 Contributing

### Making Changes

1. Create a feature branch
2. Make your changes
3. Run tests: `npm test`
4. Update documentation if needed
5. Create a pull request

### Code Standards

- Follow existing code style
- Add tests for new features
- Update documentation
- Keep business logic in service layer
- Validate all inputs

---

## 📝 Version History

### v1.1.0 (March 2026)
- ✨ Added comprehensive service integration documentation
- 📊 Added visual architecture diagrams
- 📖 Enhanced technical documentation
- 🔒 Documented security patterns
- 🐛 Added troubleshooting guides

### v1.0.0
- 🎉 Initial release
- ✅ Core functionality implemented
- 📚 Basic documentation

---

## 📞 Support

### Documentation Questions
- Check the relevant documentation file
- Review troubleshooting sections
- Search for error messages in documentation

### Technical Issues
1. Check logs for detailed error messages
2. Verify environment variables
3. Test service connectivity
4. Review [Troubleshooting Guide](./SERVICE_INTEGRATIONS.md#12-troubleshooting)
5. Contact development team

---

## 📄 License

Private - LeadPylot Internal Use Only

---

## 👥 Authors

LeadPylot Development Team

---

**Quick Links:**
- [Service Integrations (Complete Guide)](./SERVICE_INTEGRATIONS.md)
- [Integration Architecture (Visual Guide)](./INTEGRATION_ARCHITECTURE.md)
- [Quick Reference](./SERVICE_INTEGRATIONS_QUICK_REFERENCE.md)
- [Technical Overview](./TECHNICAL_OVERVIEW.md)
- [Non-Technical Overview](./NON_TECHNICAL_OVERVIEW.md)

---

**Last Updated:** March 25, 2026  
**Documentation Version:** 1.1.0

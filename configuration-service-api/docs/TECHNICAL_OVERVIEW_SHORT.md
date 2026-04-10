# Configuration Service API - Technical Overview (Short)

**Version:** 1.1.0
**Last Updated:** March 2026

## Quick Reference

### What is this service?
A centralized configuration management microservice for the lead management platform. Handles system settings, banks, projects, assignments, sources, closed leads, lead forms, and domain whitelisting.

### Technology Stack
- **Framework:** Node.js with Express
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT with Role-Based Access Control
- **Architecture:** Layered (Controller / Service / Model)

### Key Statistics
- **All primary administrative modules** (10+ modules)
- **Comprehensive data schemas** (10+ primary models)
- **Microservice Integrations:** Auth, Document, Lead, Notification, Search, Gateway
- **Multi-tenant** architecture support
- **Integration Patterns:** Synchronous REST, Event-driven, JWT propagation

### Core Modules
| Module | Purpose |
| :--- | :--- |
| **Settings** | System configuration (payment terms, stages, email templates) |
| **Banks** | Financial institution management with access control |
| **Projects** | Project & team management with custom branding |
| **Assignments** | Lead-to-project-to-agent assignment tracking |
| **Sources** | Marketing channel tracking with pricing |
| **Lead Forms** | External lead capture from third-party sites |
| **Allowed Sites** | Domain whitelisting and security |
| **Column Preferences**| User UI customization |
| **Grouping Fields** | Default filter and grouping presets |
| **Closed Leads** | Historical lead preservation & reversion |

---

### Project Structure
The service is structured into standard layers:
- **Controllers**: Handle HTTP requests and input validation.
- **Services**: Contain business logic and cross-service orchestration.
- **Models**: Define the data structure and database constraints.
- **Middleware**: Enforce security, authentication, and permissions.
- **Utils**: Provide shared logic for logging and data formatting.

---

### Authentication
All endpoints (with the exception of health checks) require a valid JWT token. Permissions are enforced based on the user's role (Admin, Supervisor, or Agent) as defined in the Auth Service.

---

### Error Handling
The service uses a standardized error response format across all modules, ensuring consistent interpretation of success and failure states by the client applications.

---

### Development Guidelines
1. Business logic must reside exclusively in the service layer.
2. Direct database access is restricted to the model and service layers.
3. Every external request must be validated against the authorized domain registry.
4. Activity logs are triggered via an internal event system for non-blocking audits.

---

### Support and Full Documentation
- **Non-Technical Overview:** [NON_TECHNICAL_OVERVIEW.md](./NON_TECHNICAL_OVERVIEW.md)
- **Full Technical Documentation:** [TECHNICAL_OVERVIEW.md](./TECHNICAL_OVERVIEW.md)
- **Service Integrations (Detailed):** [SERVICE_INTEGRATIONS.md](./SERVICE_INTEGRATIONS.md)

---

**For detailed information:**
- **Architecture & Endpoints:** [TECHNICAL_OVERVIEW.md](./TECHNICAL_OVERVIEW.md)
- **Service Integration Details:** [SERVICE_INTEGRATIONS.md](./SERVICE_INTEGRATIONS.md)

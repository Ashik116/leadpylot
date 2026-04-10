# Configuration Service API - Technical Documentation

---

## 1. System Architecture

The Configuration Service API is the central administrative and configuration backbone of the LeadPylot ecosystem. It operates as a Node.js microservice within a distributed architecture, providing critical organizational data and business rules to all other services.

### 1.1 Core Role

The service manages the fundamental hierarchy and configuration of the platform, including:
- **Organizational Structure**: Managing Banks (primary organizations) and Projects (specific sales or operational teams).
- **External Lead Ingestion**: Handling lead capture from third-party sites via Lead Forms and whitelisting authorized domains via Allowed Sites.
- **Lead Lifecycle Rules**: Defining Assignment rules, Lead Sources, and Workflow Stages.
- **System-Wide Settings**: Configuring VOIP servers, Payment Terms, and Bonus Schemes.
- **Communication Templates**: Storing and managing Email and PDF templates used by the Email and PDF generation services.
- **UI Customization**: Preserving user-specific interface preferences such as column visibility and grouping fields.

### 1.2 Architectural Framework

The service follows a disciplined Layered Architecture:
- **Controller Layer**: Handles incoming HTTP requests, performs initial validation, and delegates to the Service layer.
- **Service Layer**: Contains the core business logic, orchestrates cross-service interactions, and enforces multi-tenant security rules.
- **Data Access Layer (Mongoose/MongoDB)**: Manages persistence and enforces schema constraints.
- **Event-Driven Communication**: Utilizes an internal EventEmitter to trigger side effects like activity logging or synchronization without blocking the primary request-response cycle.

### 1.3 Service Dependencies

- **Document Service**: Integrated for managing organizational assets such as Bank logos and Email/PDF signatures.
- **Lead Service**: Interacts during project closures and lead re-assignments to update lead states across the ecosystem.
- **Auth Service**: Relies on Role-Based Access Control (RBAC) tokens to enforce permission boundaries.

---

## 2. Data Lifecycle and Flows

### 2.1 Organizational Hierarchy Flow

The system operates on a primary-secondary organizational model. A "Bank" represents a high-level entity (e.g., a financial institution or department). "Projects" (internally referred to as Teams) are created under these Banks. 
1. **Creation**: Banks are created with specific metadata (names, codes, logos).
2. **Restricting Access**: Banks can be marked as restricted, meaning only a manually defined list of agents can access the bank and its associated projects.
3. **Project Association**: Projects are linked to a single Bank. When a Bank's access list changes, the service automatically synchronizes this with all relevant agents in associated projects.

### 2.2 Lead Assignment and Distribution Flow

The service governs how leads move from a "Source" to an "Agent" within a "Project".
1. **Source Tracking**: Every lead is associated with a Source (UTM tracking). The service maintains lead counts per source for ROI analysis.
2. **Assignment Logic**: The Assignment controller facilitates the mapping of Leads to Projects and Agents.
3. **Project Closure**: When a Project is closed, the service executes a complex cleanup. It identifies all active leads within that project and either "refreshes" them (returning them to a pool for re-distribution) or "archives" them into the Closed Lead repository.

### 2.3 Closed Lead Archiving and Reverting

To preserve data integrity while keeping the active lead database performant, historical data is moved to a separate repository.
1. **Ingestion**: The Lead Offers service pushes data into the Configuration Service's "ClosedLead" repository when a lead journey completes.
2. **Reverting**: If a mistake is made, the service provides a revert mechanism that restores the lead's active state in the Lead Service and removes the historical record.

### 2.4 External Lead Ingestion Flow

The service provides a secure entry point for leads generated from external marketing sites.
1. **Whitelisting**: Every incoming request is checked against the "AllowedSite" registry to ensure the referring domain is authorized.
2. **Lead Form Capture**: Data is ingested via the LeadForm controller, which validates contact information and calculates "Expected Revenue" (formatted for reporting, e.g., 25.5k).
3. **Identification**: A unique "Lead Source Number" is automatically generated based on the referring hostname to ensure traceability.

---

## 3. Core Data Models

The service utilizes several high-complexity models to maintain state.

### 3.1 Project Model

| Field | Type | Description |
| :--- | :--- | :--- |
| name | String | The public name of the project/team. |
| description | String | Detailed overview of project goals. |
| bank_id | ObjectId | Reference to the parent Bank entity. |
| agents | Array (Object) | List of users with associated mailserver configurations. |
| project_email | String | Official contact email for the project. |
| project_phone | String | Official contact number. |
| project_website| String | Link to the project's primary portal. |
| color_code | String | HEX code used for UI branding and identification. |
| voip_server_id | ObjectId | Reference to the primary VOIP/SIP server. |
| mailserver_id | ObjectId | Reference to the global project mailserver. |
| mailservers | Array (ObjectId)| List of additional mailservers available to the team. |
| pdf_templates | Array (ObjectId)| PDF templates mapped for automated document generation. |
| email_templates| Array (ObjectId)| Pre-defined email templates assigned to the project. |
| state | String | Operational state: Active, Blocked, Stop, or New. |
| active | Boolean | Soft-delete flag for the project. |

### 3.2 Bank Model

| Field | Type | Description |
| :--- | :--- | :--- |
| name | String | Official organizational name. |
| code | String | Unique reference code for internal lookups. |
| logo_id | ObjectId | Reference to the logo stored in the Document Service. |
| isRestricted | Boolean | If true, access is limited to explicitly allowed agents. |
| allowedAgents | Array (ObjectId)| List of users permitted to interact with this bank. |

### 3.3 Closed Lead Model

| Field | Type | Description |
| :--- | :--- | :--- |
| lead_id | ObjectId | Reference to the original unique lead identifier. |
| project_id | ObjectId | The project the lead was assigned to when closed. |
| agent_id | ObjectId | The agent responsible for the lead at closure. |
| history_data | Object | Comprehensive snapshot of all lead activity and states. |
| isReverted | Boolean | Flag indicating if this record was restored to active. |

### 3.4 Source Model

| Field | Type | Description |
| :--- | :--- | :--- |
| name | String | The UTM source or lead provider name. |
| price | Number | Cost per lead from this source. |
| provider_id | ObjectId | Reference to the lead provider (User record). |
| lead_count | Number | Running total of leads received from this source. |
| active | Boolean | Soft-delete status flag. |

### 3.5 Settings Model (Generic)

| Field | Type | Description |
| :--- | :--- | :--- |
| name | String | Name of the setting (e.g., "Standard Stage", "VOIP Server A"). |
| type | String | Category: stage, bonus_amount, payment_terms, voipservers, email_templates. |
| info | Mixed | Type-specific configuration (e.g., JSON for VOIP details or template HTML). |

### 3.6 Column Preference Model

| Field | Type | Description |
| :--- | :--- | :--- |
| user_id | Array (ObjectId)| Reference to one or more users this preference applies to. |
| isDefault | Boolean | If true, this serves as the global fallback layout. |
| data | Object | Map of table names to their respective `columnVisibility` and `columnOrders`. |
| version | Number | Incremental version used for client-side synchronization. |

### 3.7 Default Grouping Fields Model

| Field | Type | Description |
| :--- | :--- | :--- |
| user_id | ObjectId | The user this grouping configuration belongs to. |
| defaultGroupingFields| Map | Model-to-field mapping (e.g., Lead -> { assign_date: true }). |
| defaultFilter | Map | Model-to-filter mapping (e.g., Lead -> [{ field: "status", op: "=", val: "New" }]). |

### 3.8 Lead Form Model

| Field | Type | Description |
| :--- | :--- | :--- |
| first_name | String | Prospect's first name. |
| email | String | Unique index for identifying return prospects. |
| site_link | String | Hostname of the landing page where the lead originated. |
| expected_revenue| Number | Raw numeric value (formatted to k/M in responses). |
| lead_source_no | String | Unique auto-generated identifier (e.g., lp-123456). |
| use_status | Enum | none, pending, or converted. |

### 3.9 Allowed Site Model

| Field | Type | Description |
| :--- | :--- | :--- |
| url | String | Normalized, lower-case URL of the authorized domain. |
| name | String | Human-readable label for the site. |
| active | Boolean | Flag to temporarily disable site access. |

---

## 4. Role-Based Access Control (RBAC)

The service enforces strict permission boundaries based on user roles:

- **Admin / Super Admin**: Full read/write access to all entities. Can manage global settings and push bulk UI updates.
- **Supervisor**: Can manage projects and banks they are associated with. Access restricted to organizational units they manage.
- **Agent**: Read-only access to assigned projects. Limited to personal UI preference management.

---

## 5. API Reference - Bank Management

### 5.1 Create Bank
- **Path**: `/banks`
- **Method**: `POST`
- **Description**: Registers a new bank entity.
- **Request Body**: `name` (String), `code` (String), `isRestricted` (Boolean), `allowedAgents` (Array of ObjectId).
- **Success Response**: Created Bank document.
- **Edge Cases**: Validates unique name; triggers agent synchronization if restriction is changed.

### 5.2 Bulk Delete Banks
- **Path**: `/banks/bulk-delete`
- **Method**: `POST`
- **Description**: Deletes or updates the state of multiple banks.
- **Request Body**: `ids` (Array), `bulkState` (Enum: active, blocked, stop, new, delete).
- **Edge Cases**: Prevents deletion of banks with active projects.

---

## 6. API Reference - Project Management

### 6.1 Get Projects
- **Path**: `/projects`
- **Method**: `GET`
- **Description**: Paginated retrieval of projects with deep search capabilities.
- **Searchable Fields**: name, description, project_email, project_phone, project_alias, bank name, bank IBAN, agent login/name.
- **Computed Fields**: `agent_count`, `voipserver_name`, `mailserver_name`.
- **Success Response**: List of projects with populated bank, agent, and server details.
- **Business Logic**: Implements "Match Monolith" logic for field transformations (team -> project).

### 6.2 Close Project
- **Path**: `/projects/:id/close`
- **Method**: `POST`
- **Description**: Terminates project operations.
- **Edge Cases**: Triggers "Selective Lead Refresh" - active leads are returned to the pool while completed leads remain archived.

---

## 7. API Reference - Source Management

### 7.1 Create Source
- **Path**: `/sources`
- **Method**: `POST`
- **Description**: Registers a lead source.
- **Request Body**: `name`, `price`, `provider_id`.
- **Edge Cases**: Validates `provider_id` format and ensures `lead_count` starts at zero.

### 7.2 Delete Source
- **Path**: `/sources/:id`
- **Method**: `DELETE`
- **Description**: Soft-deletes a source.
- **Edge Cases**: Source remains in database for historical reporting but is excluded from active dropdowns.

---

## 8. API Reference - Closed Leads

### 8.1 Get Statistics
- **Path**: `/closed-leads/stats`
- **Method**: `GET`
- **Description**: Aggregates data on closed projects and their lead outcomes.
- **Response**: Count of successes, failures, and total leads per project.

### 8.2 Revert Closed Leads
- **Path**: `/closed-leads/revert`
- **Method**: `POST`
- **Description**: Restores closed leads to active state.
- **Request Body**: `ids` (Array of ClosedLead IDs).
- **Business Logic**: Calls Lead Service to restore active data and then deletes the local closed record.

---

## 9. API Reference - System Settings & Templates

### 9.1 Update Generic Setting
- **Path**: `/settings/:type/:id`
- **Method**: `PUT`
- **Description**: Updates a specific configuration (Bonus, VOIP, etc.).
- **Edge Cases**: For `stage` types, status names must be unique across all existing stages.

### 9.2 Manage Email Templates
- **Path**: `/settings/email-templates/:id`
- **Method**: `GET`
- **Description**: Retrieves a template with populated category and signature details.
- **Response**: Includes `template_content` (normalized with data paths) and Document metadata for the signature file.

### 9.3 Bulk Delete Settings
- **Path**: `/settings/:type/bulk`
- **Method**: `DELETE`
- **Description**: Deletes multiple settings of a specific type.
- **Business Logic**: For email templates, it also performs the bidirectional cleanup of project associations.

---

## 10. API Reference - UI Preferences

### 10.3 Column Preferences for Multiple Users
- **Path**: `/columns/multiple`
- **Method**: `GET`
- **Description**: (Admin only) Retrieves settings for a list of users.
- **Query Params**: `user_ids` (Array), `table` (Optional filter).

### 10.4 Reset to Default
- **Path**: `/columns/reset`
- **Method**: `POST`
- **Description**: Reverts a user's layout for a specific table back to the global default.
- **Inputs**: `table` (String).

---

## 11. API Reference - Default Grouping Fields

### 11.1 Create/Update Grouping
- **Path**: `/grouping-fields`
- **Method**: `POST`
- **Description**: Saves grouping and filter presets for a user.
- **Inputs**: `defaultGroupingFields` (Object), `defaultFilter` (Object).
- **Edge Cases**: Validates filter operators (e.g., `=`, `!=`) and field existence.

### 11.2 Get by Model Name
- **Path**: `/grouping-fields/model/:modelName`
- **Method**: `GET`
- **Description**: Retrieves all user presets for a specific page (e.g., "lead" or "offer").

---

## 12. API Reference - External Lead Forms

### 12.1 Ingest Lead
- **Path**: `/lead-forms`
- **Method**: `POST`
- **Description**: Ingests lead data from Elementor/WordPress or flat JSON bodies.
- **Logic**: 
    - Automatically parses currency and revenue strings (e.g., "25.000 €" or "30k").
    - Resolves `site_link` from headers (Origin/Referer) or User-Agent metadata.
    - Generates a unique `lead_source_no`.

### 12.2 List Lead Forms
- **Path**: `/lead-forms`
- **Method**: `GET`
- **Description**: Retrieves captured leads with revenue formatting.
- **Filtering**: By source, site_link, or search terms.

---

## 13. API Reference - Domain Whitelisting

### 13.1 Manage Allowed Sites
- **Path**: `/allowed-sites`
- **Method**: `GET`, `POST`, `PUT`, `DELETE`
- **Description**: CRUD operations for authorizing external domains.
- **Validation**: Normalizes URLs (lowercase, remove trailing slashes) and prevents duplicate registrations.

---

## 14. External Microservice Integration

The Configuration Service maintains data integrity and ecosystem synchronization through multiple integration patterns, including RESTful communication, internal event listeners, and shared database registries.

**📖 For comprehensive integration documentation, including:**
- API contracts and request/response formats
- Authentication mechanisms and security patterns
- Error handling and resilience strategies
- Sequence diagrams and troubleshooting guides

**See:** [SERVICE_INTEGRATIONS.md](./SERVICE_INTEGRATIONS.md)

### 14.1 Auth Service (Security & Identity)
- **Mechanism**: JWT Trust Model (Stateless).
- **Endpoint Protection**: Every sensitive route is protected by an `authenticate` middleware that extracts identity from the `Authorization: Bearer <token>` header.
- **Integration Detail**: The service does not query the Auth database directly; it trusts the JWT signature (verified via a shared secret) and uses the embedded `userId` and `role` to enforce permission boundaries.

### 14.2 Lead Service (Lifecycle Synchronization)
- **Mechanism**: REST (Axios) / Bi-directional.
- **Port**: 4003 (`LEAD_SERVICE_URL`).
- **Synchronous Actions**: 
    - **Assignment**: Updating lead ownership and status in real-time when an agent is assigned.
    - **Project Closure**: Coordinating "Selective Refresh" flows where leads are moved back to the reusable pool.
    - **Archiving**: Pushing completed lead data to the local `ClosedLead` repository while updating the primary record in the Lead Service.

### 14.3 Document Service (Asset Management)
- **Mechanism**: REST (Axios) / Multipart Form Data.
- **Port**: 4002 (`DOCUMENT_SERVICE_URL`).
- **Purpose**: Managing organization assets (Bank Logos) and user assets (Email/PDF Signatures).
- **Flow**: The client uploads files to `/attachments/library/upload/single` and receives a unique `documentId`. The Configuration Service stores this ID rather than the binary data, fetching metadata and public URLs via the `documentClient` during response population.

### 14.4 Notification Service (Event-Driven Alerts)
- **Mechanism**: Event Listener / REST.
- **Port**: 4004 (`NOTIFICATION_SERVICE_URL`).
- **Trigger**: Internal `EventEmitter` emits signals like `PROJECT_CREATED` or `LEAD_FORM_CREATED`.
- **Payload**: The `notificationListeners` module catches these events and sends formatted JSON payloads to `/notifications/microservice-send`, targeting specific administrative roles.

### 14.5 Search Service (Universal Query Proxy)
- **Mechanism**: HTTP Proxy / Query Interception.
- **Port**: 3010 (`SEARCH_SERVICE_URL`).
- **Process**: The `universalQueryMiddleware` intercepts GET requests containing `domain` or `groupBy` parameters. It proxies these complex queries to the Search Service, which returns the matching document IDs. The middleware then hydrates these IDs into full MongoDB records to ensure API consistency.

### 14.6 Schema Registry (Cross-Service Discovery)
- **Mechanism**: Shared Database (MongoDB `schema_registry` collection).
- **Process**: Upon service startup, the `schemaPublisher` iterates through all local Mongoose models, extracts their structural definitions (fields, types, indexes), and publishes them to a centralized collection with a priority score (80).
- **Outcome**: This allows the Search Service and Reporting services to dynamically discover the Configuration Service's data structure without manual configuration or code changes.

### 14.7 External Lead Ingestion (WordPress/Elementor)
- **Mechanism**: HTTP Webhooks.
- **Validation**: Every incoming lead is checked against the `AllowedSite` registry using normalized URL matching to prevent domain spoofing.
- **Parsing**: The controller handles multi-part form data from common CMS plugins (like Elementor Pro), normalizing currency strings and mapping nested form fields to the Lead Form model.


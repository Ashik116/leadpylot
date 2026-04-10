# Configuration Service - Architecture & Data Flow Diagrams

**Version:** 1.0.0  
**Last Updated:** March 2026

---

## 1. System Overview

The Configuration Service is a central administrative microservice designed with a layered architecture to ensure separation of concerns, scalability, and maintainability. It serves as the bridge between administrative configurations and active lead operations.

### 1.1 High-Level Component Architecture

This diagram illustrates the Service's position within the LeadPylot ecosystem and its primary external and internal interaction points.

```mermaid
graph TD
    User[Administrative User] --> Gateway[API Gateway]
    ExternalSite[External WordPress/Elementor Site] --> LeadCapture[Lead Form Capture Endpoint]
    
    subgraph "Core Microservice"
        Gateway --> Routes[Routing Layer]
        LeadCapture --> Routes
        Routes --> Controllers[Controller Layer]
        Controllers --> Services[Service Layer]
        Services --> Models[Model Layer]
        Models --> DB[(MongoDB)]
    end
    
    subgraph "External Integrations"
        Services --> Auth[Auth Service]
        Services --> Doc[Document Service]
        Services --> Lead[Lead Service]
        Services --> Notify[Notification Service]
    end
```

---

## 2. Internal Layered Architecture

The service follows a strict Controller-Service-Model pattern to decouple request handling, business logic, and data persistence.

```mermaid
graph LR
    subgraph "Presentation Layer"
        Middleware[Middleware: Auth, RBAC, Validation]
        Routes[Routes]
        Controllers[Controllers]
    end
    
    subgraph "Business Logic Layer"
        Services[Services]
        Events[Internal Event Emitter]
    end
    
    subgraph "Data Access Layer"
        Models[Mongoose Models]
    end
    
    Routes --> Middleware
    Middleware --> Controllers
    Controllers --> Services
    Services --> Events
    Services --> Models
```

---

## 3. Core Data Flows

### 3.1 Lead Assignment Synchronization

The following sequence represents the end-to-end flow when an administrator assigns leads to a specific project and agent.

```mermaid
sequenceDiagram
    participant Admin
    participant Controller as Assignment Controller
    participant Service as Assignment Service
    participant DB as MongoDB
    participant LeadSvc as Lead Service (External)

    Admin->>Controller: POST /assign-leads (LeadIDs, ProjectID, AgentID)
    Controller->>Service: Validate & Execute Assignment
    Service->>DB: Create Assignment Record (Local)
    Service->>LeadSvc: PUT /api/leads/:id (Sync State)
    LeadSvc-->>Service: 200 OK
    Service-->>Controller: Assignment Successful
    Controller-->>Admin: Return Success Response
```

### 3.2 External Lead Ingestion (Lead Form Capture)

This flow illustrates how external form submissions are captured, cleaned, and broadcasted to the ecosystem.

```mermaid
sequenceDiagram
    participant Site as External Site
    participant Controller as Lead Form Controller
    participant Service as Lead Form Service
    participant LeadSvc as Lead Service (External)
    participant Notify as Notification Service

    Site->>Controller: POST /register-lead (Form Data)
    Controller->>Service: Normalize & Resolve Site Link
    Service->>LeadSvc: POST /api/leads (Create Lead)
    LeadSvc-->>Service: Lead Created
    Service->>Notify: POST /notifications (Notify Admin)
    Service-->>Controller: Capture Complete
    Controller-->>Site: Return Status Code
```

---

## 4. Project Closure & Lead Refreshing

When a project is closed, the system orchestrates a complex state transition for all associated leads.

```mermaid
flowchart TD
    Start[Admin Closes Project] --> GetAssign[Retrieve All Active Assignments]
    GetAssign --> Split{Is Lead Refreshed?}
    
    Split -- Yes --> Refresh[Reset Lead State in Lead Service]
    Refresh --> Archive[Archive Local Assignment]
    
    Split -- No --> Close[Mark Lead as Closed in Lead Service]
    Close --> UpdateProj[Update Project Status to Closed]
    
    Archive --> UpdateProj
    UpdateProj --> End[Closure Process Complete]
```

---

## 5. Multi-Tenant Context Propagation

The service handles tenant-specific data isolation through a header-based context injection flow.

```mermaid
flowchart LR
    Request[Incoming Request] --> Gateway[API Gateway]
    Gateway --> Inject[Inject x-tenant-id Header]
    Inject --> Middleware[Tenant Middleware]
    Middleware --> Context[Set Request Context]
    Context --> DB[Filter Database Queries by TenantID]
```

---

**End of Architecture Documentation**

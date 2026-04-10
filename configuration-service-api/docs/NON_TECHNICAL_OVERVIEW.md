# Configuration Service - System Overview

The **Configuration Service** is the central administrative hub of the LeadPylot platform. It acts as the "Master Controller," managing the organizational structures, business rules, and communication templates that power the entire ecosystem.

---

## Core Organizational Management

### **Bank & Financial Partner Management**
This module stores the essential data for every financial institution we partner with.
*   **Centralized Records:** Stores names, contact details, and official logos.
*   **Commercial Rules:** Manages commission rates, volume limits, and specific partner agreements.
*   **Access Control:** Precisely defines which teams or agents are authorized to handle products from specific banks.

### **Project & Team Orchestration**
Projects are the primary containers for work. This service manages how they are structured.
*   **Extended Branding:** Supports custom email addresses, phone numbers, websites, and color codes per project.
*   **Team Assignment:** Links specific agents to projects, ensuring they only see relevant data.
*   **Bank Integration:** Connects specific banks to projects, enabling agents to pitch the right products.
*   **Lifecycle Management:** Handles the creation, active tracking, and eventual archiving of project work.

---

## Lead Lifecycle & Workflow

### **External Lead Capture (Lead Forms)**
Simplifies the ingestion of leads from third-party websites and landing pages.
*   **Automated Ingestion:** Captures data directly from external forms (name, contact, site link).
*   **Revenue Projection:** Tracks estimated revenue for new leads with simplified formatting (e.g., "123k").
*   **Source Validation:** Automatically identifies and labels the origin of every incoming lead.

### **Intelligent Lead Assignment**
Ensures every potential customer (Lead) is handled by the right person at the right time.
*   **Ownership Tracking:** Records exactly which agent and project "owns" a lead.
*   **Conflict Prevention:** Prevents multiple agents from accidentally working the same lead simultaneously.
*   **Accountability:** Maintains a clear history of how a lead has moved through the system.

### **Dynamic Workflows (Stages)**
Business processes are not static. The Configuration Service allows administrators to define the "Stages" a lead goes through (e.g., New, In Progress, Offer Sent, Closed).
*   **Custom Statuses:** Define unique milestones for different business lines.
*   **Workflow Logic:** Determines the valid next steps for a lead based on its current status.

---

## Communication & Document Templates

### **Standardized Email Templates**
Maintains brand consistency and speed through pre-defined email communications.
*   **Dynamic Placeholders:** Automatically injects customer names, project details, and agent info into emails.
*   **Category Management:** Organizes templates by purpose (e.g., Intro, Follow-up, Contract).
*   **Professional Signatures:** Manages image-based signatures and per-template signature settings.

### **Smart PDF Templates (Mapping)**
One of the most powerful features of the platform. It allows the system to automatically fill out complex PDF forms.
*   **Field Mapping:** Links specific data points (like an IBAN or Phone Number) to exact boxes on a PDF form.
*   **Automated Filling:** Generates ready-to-sign documents in seconds, eliminating manual data entry.
*   **Deduplication:** Ensures the same document isn't uploaded multiple times, keeping the library clean.

---

## System Preferences & Personalization

### **UI & Efficiency settings**
The service allows users and admins to customize how data is presented for maximum efficiency.
*   **Column Preferences:** Users can choose which data columns are most important for their daily view.
*   **Grouping & Sorting:** Defines default ways to organize lead lists (e.g., by source or by urgency).
*   **Global Settings:** Manages system-wide rules like bonus amounts, payment terms, and VOIP server connections.

---

## Security & Domain Integrity

### **Domain Whitelisting (Allowed Sites)**
Ensures that only authorized domains can interact with the lead capture system.
*   **Access Control:** Maintains a secure list of URLs permitted to submit data.
*   **Threat Mitigation:** Prevents unauthorized external sources from flooding the system with invalid leads.

### **Role-Based Access Control (RBAC)**
The Configuration Service enforces strict permission boundaries based on user roles.

| Role | Capability | Typical User |
| :--- | :--- | :--- |
| **Administrator** | Full system control; can modify banks, projects, and global settings. | System Owner / Ops Manager |
| **Supervisor** | Can manage lead assignments, view performance reports, and edit templates. | Team Lead |
| **Agent** | View assigned leads and projects; use pre-approved templates. | Sales/Case Worker |

---

## System Interconnectivity

The Configuration Service does not operate in isolation. It acts as the "connective tissue" between various parts of the platform to ensure data remains synchronized and accurate.

*   **Lead & Activity Syncing:** When a project is closed or an agent is changed, this service automatically coordinates with the **Lead Service** to update the status and ownership of every affected customer record.
*   **Asset & Document Management:** It partners with the **Document Service** to securely store and retrieve high-resolution bank logos, professional email signatures, and official PDF documents.
*   **Real-time Alerts:** Whenever a new project is launched or a customer submits a lead form on a website, this service instantly triggers the **Notification Service** to alert the relevant administrators and supervisors.
*   **Centralized Search Intelligence:** To provide fast and accurate search results across thousands of records, this service shares its data structures with a centralized **Search Engine**, allowing for advanced filtering and grouping of information.
*   **Secure Access Control:** It works hand-in-hand with the platform's **Security Service** to verify that every person logged into the system has the correct permissions to view or modify sensitive business configurations.

---

## Service Ecosystem & Integrations

The Configuration Service doesn't work in isolation. It collaborates with other specialized services to deliver a complete solution.

### **Connected Services**

| Service | What It Does | How Configuration Service Uses It |
| :--- | :--- | :--- |
| **Authentication Service** | Manages user logins and permissions | Validates user identity on every request |
| **Document Service** | Stores files and images | Uploads bank logos and email signatures |
| **Lead Service** | Manages the lead database | Keeps lead assignments synchronized |
| **Notification Service** | Sends real-time alerts to users | Notifies admins when projects or leads are created |
| **Search Service** | Powers advanced search features | Enables fast searching across projects and banks |

### **Real-World Integration Example: Creating a Bank**

When an administrator creates a new bank in the system:

1. **Configuration Service** validates the data and creates the bank record
2. **Document Service** receives and stores the bank's logo image
3. **Configuration Service** saves the logo reference in the bank record
4. **Notification Service** sends a notification to all administrators about the new bank
5. **Search Service** indexes the bank data for fast searching

All of this happens in seconds, creating a seamless experience for the administrator.

### **Why This Matters for Your Business**

- **Reliability**: If one service has issues, others continue working
- **Speed**: Specialized services perform their tasks efficiently
- **Scalability**: Each service can be scaled independently based on demand
- **Maintainability**: Issues can be isolated and fixed without affecting the entire system

**For technical teams:** See [SERVICE_INTEGRATIONS.md](./SERVICE_INTEGRATIONS.md) for detailed integration documentation.

---

## Business Benefits

*   **Speed to Market:** Launch new projects or bank partnerships in minutes without code changes.
*   **Data Quality:** Enforces validation rules at the source, preventing "dirty data" from entering the system.
*   **Compliance Ready:** Maintains a full audit trail of assignments and changes for regulatory peace of mind.
*   **Scalability:** Supports an unlimited number of projects, agents, and templates as your business grows.

---

## Glossary of Terms

*   **Allowed Site:** A verified external domain authorized to submit data to the platform.
*   **Assignment:** The formal link between a Lead, an Agent, and a Project.
*   **Closed Lead:** A record that is preserved for history after its project has ended.
*   **Lead Form:** An external data capture point used to onboard new potential customers.
*   **Placeholder:** A special code (like `{{name}}`) that the system replaces with actual data.
*   **Source:** The marketing channel (e.g., Google, Facebook) that generated the lead.
*   **Stage:** A specific milestone in the sales process (e.g., "Awaiting Signature").

---

## Related Documentation

- **Technical Overview:** [TECHNICAL_OVERVIEW_SHORT.md](./TECHNICAL_OVERVIEW_SHORT.md)
- **Full Technical Documentation:** [TECHNICAL_OVERVIEW.md](./TECHNICAL_OVERVIEW.md)
- **Service Integration Details:** [SERVICE_INTEGRATIONS.md](./SERVICE_INTEGRATIONS.md)

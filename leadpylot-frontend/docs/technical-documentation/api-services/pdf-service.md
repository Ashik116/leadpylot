# Technical Documentation - PDF Service API

## 1. Overview

The PDF Service API is a microservice dedicated to the management and dynamic generation of PDF documents. It provides tools for template uploading, field extraction, font management, and data-driven PDF filling. The service is built with Node.js and Express, utilizing MongoDB for metadata and storage solutions (S3 or Local FS) for the physical files.

### Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18.2
- **Database**: MongoDB with Mongoose ODM 8.13.2
- **PDF Core**: `pdf-lib` 1.17.1 + `@pdf-lib/fontkit` 1.1.1
- **Storage**: AWS S3 (Production) / Local FS (Dev)
- **Authentication**: JWT-based authentication with Role-Based Access Control (RBAC)
- **Caching**: Redis 5.10.0
- **Validation**: express-validator 7.0.1
- **Logging**: Winston 3.8.2

### Key Capabilities

- Dynamic PDF form filling with live data
- Automatic field extraction from PDF templates
- Custom font support (TTF, OTF, WOFF, WOFF2)
- Unicode support (German, Turkish extended characters)
- Character-box field handling (IBAN, phone numbers)
- Hybrid storage (AWS S3 + local filesystem)
- Multi-tenant data isolation
- Data masking for specific roles
- Preview before final assignment workflow

---

## 2. System Architecture

### 2.1 Architecture Overview

The PDF Service API follows a **layered microservice architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  (Web Apps, Mobile Apps, Other Microservices)                   │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS/JWT
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express.js Application                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Middleware Stack                             │  │
│  │  • CORS           • JSON Parser                           │  │
│  │  • Request Log    • JWT Authentication                    │  │
│  │  • RBAC Check     • Validation                            │  │
│  │  • Tenant Isolation • Error Handling                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Routes     │→ │ Controllers  │→ │  Services    │          │
│  │              │  │              │  │              │          │
│  │ • Templates  │  │ • Request    │  │ • PDF Gen    │          │
│  │ • Fonts      │  │   Handlers   │  │ • Field Ext  │          │
│  │ • Generation │  │ • Response   │  │ • Storage    │          │
│  └──────────────┘  └──────────────┘  │ • Fonts      │          │
│                                         │ • S3 Service │          │
│                                         └──────┬───────┘          │
└──────────────────────────────────────────────┼──────────────────┘
                                               │
                ┌──────────────────────────────┼──────────────────┐
                │                              │                  │
                ▼                              ▼                  ▼
    ┌───────────────────┐         ┌───────────────────┐  ┌──────────────┐
    │   MongoDB         │         │  Storage Layer    │  │   Redis      │
    │   (Metadata)      │         │  • AWS S3         │  │   (Cache)    │
    │   • Templates     │         │  • Local FS       │  │              │
    │   • Generated PDFs│         │  • Hybrid Mode    │  └──────────────┘
    │   • Fonts         │         └───────────────────┘
    │   • Users/Roles   │
    └───────────────────┘
```

### 2.2 Component Hierarchy

**Layer Structure:**

1. **Routes Layer** ([`src/routes/`](src/routes/))
   - Defines API endpoints
   - Applies authentication/authorization middleware
   - Routes requests to controllers
2. **Controller Layer** ([`src/controllers/`](src/controllers/))
   - Handles HTTP request/response
   - Validates input data
   - Delegates business logic to services
   - Formats responses
3. **Service Layer** ([`src/services/`](src/services/))
   - Contains all business logic
   - Orchestrates data operations
   - Integrates with external services
   - Handles complex transformations
4. **Model Layer** ([`src/models/`](src/models/))
   - Mongoose schema definitions
   - Data validation rules
   - Database queries
   - Relationship definitions
5. **Utility Layer** ([`src/utils/`](src/utils/))
   - Shared helper functions
   - Error handling
   - Logging
   - Common transformations

### 2.3 Request Flow Diagram

```
User Request
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Pre-Request Middleware                                    │
│    • CORS validation                                        │
│    • JSON parsing (limit: 50MB)                             │
│    • Request logging                                        │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Authentication Middleware                                │
│    • Extract JWT from Authorization header                  │
│    • Verify token signature                                 │
│    • Load fresh user data from database                     │
│    • Validate session (active, not expired)                 │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Authorization Middleware                                 │
│    • Check user role permissions                            │
│    • Verify access to specific resource                     │
│    • Apply tenant isolation filters                         │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Route Handler                                             │
│    • Match request to route                                  │
│    • Apply route-specific validation                        │
│    • Call controller function                               │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Controller Layer                                          │
│    • Validate request body/query/params                      │
│    • Call appropriate service                               │
│    • Handle service response/errors                         │
│    • Format HTTP response                                   │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Service Layer (Business Logic)                           │
│    • Execute business operations                            │
│    • Query/modify database via models                       │
│    • Integrate with external services                       │
│    • Apply transformations                                  │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
Response to User
```

### 2.4 Data Flow: PDF Generation

```
Client Request (offerId + templateId)
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│ 1. Data Fetching Phase                                       │
│    • Fetch Offer by offerId                                  │
│    • Fetch related Lead                                      │
│    • Fetch related Bank                                      │
│    • Fetch Agent (User)                                      │
│    • Fetch Team (Project)                                    │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. Data Preparation Phase                                    │
│    • Merge related data into single object                   │
│    • Apply computed fields                                   │
│    • Format dates, currency, percentages                     │
│    • Create data snapshot (for historical tracking)          │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. Template Loading Phase                                    │
│    • Fetch PdfTemplate by templateId                         │
│    • Download template PDF from storage (S3/local)           │
│    • Load field mappings                                     │
│    • Load template settings (fonts, watermark, etc.)         │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. PDF Processing Phase (pdf-lib)                            │
│    • Load PDF document                                       │
│    • Load fonts (standard + custom + DejaVu Sans)            │
│    • Process each field mapping:                             │
│      - Extract data value from snapshot                      │
│      - Apply transformations (format, case, etc.)            │
│      - Handle character-box fields (split into chars)        │
│      - Calculate optimal font size (auto-sizing)             │
│      - Apply color (if specified)                            │
│      - Fill PDF field                                        │
│    • Flatten form (if configured)                            │
│    • Apply watermark (if configured)                         │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. Storage Phase                                             │
│    • Generate PDF filename                                   │
│    • Create temporary file (temp_ prefix)                    │
│    • Upload to storage (S3/local based on configuration)     │
│    • Store file metadata in GeneratedPdf collection          │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
Response to Client
{
  "success": true,
  "generatedPdf": {
    "id": "...",
    "previewUrl": "...",
    "downloadUrl": "...",
    "assignUrl": "..."
  }
}
```

---

## 3. Database Models

### 3.1 Core PDF Models

### PdfTemplate ([`src/models/PdfTemplate.js`](src/models/PdfTemplate.js))

Stores PDF template definitions with field mappings and settings.

**Schema Fields:**

| Field                | Type     | Required    | Description                                                       |
| -------------------- | -------- | ----------- | ----------------------------------------------------------------- |
| `name`               | String   | Yes         | Template name                                                     |
| `description`        | String   | No          | Template description                                              |
| `category`           | String   | Yes         | Category: `offer`, `contract`, `application`, `other`             |
| `offer_type`         | String   | Conditional | Offer type if category is `offer`: `festgeld`, `tagesgeld`, `etf` |
| `tags`               | Array    | No          | Searchable tags                                                   |
| `status`             | String   | Yes         | Status: `draft`, `mapping`, `active`, `archived`                  |
| `file_path`          | String   | Yes         | Storage path to template PDF                                      |
| `file_hash`          | String   | Yes         | MD5 hash for deduplication                                        |
| `storage_type`       | String   | Yes         | Where file is stored: `local`, `cloud`, `dual`                    |
| `extracted_fields`   | Array    | Yes         | List of form fields extracted from PDF                            |
| `field_mappings`     | Array    | No          | Mappings from PDF fields to data sources                          |
| `field_groups`       | Array    | No          | Character-box field groups (IBAN, phone)                          |
| `settings`           | Object   | No          | Generation settings (fonts, watermark, protection)                |
| `team`               | ObjectId | No          | Reference to Team (multi-tenancy)                                 |
| `mapping_completion` | Number   | Yes         | Percentage of fields mapped (0-100)                               |
| `usage_count`        | Number   | Yes         | Times used in generation                                          |
| `created_by`         | ObjectId | Yes         | User who created template                                         |

**Extracted Field Structure:**

```jsx
{
  "field_name": "customer_name",      // PDF field name
  "field_type": "text",               // text, checkbox, signature
  "page_index": 0,                    // Page number (0-indexed)
  "coordinates": {                    // Field position
    "x": 100,
    "y": 200,
    "width": 150,
    "height": 20
  },
  "is_mapped": false,                 // Has mapping been configured?
  "mapping_source": null              // Data source when mapped
}
```

**Field Mapping Structure:**

```jsx
{
  "pdf_field": "customer_name",       // PDF field name
  "data_source": "lead",              // Source entity
  "data_field": "contact_name",       // Field in source entity
  "transformation": "none",           // Optional: capitalize, uppercase, lowercase
  "format": null,                     // Optional: currency, percentage, date
  "default_value": "",                // Fallback value if data is empty
  "color": "#000000"                  // Text color (hex)
}
```

**Field Group Structure (Character Boxes):**

```jsx
{
  "group_name": "iban",               // Group identifier
  "group_type": "IBAN",               // IBAN, PHONE, SSN, etc.
  "fields": ["iban_1", "iban_2", ...], // Individual character fields
  "separator": "",                    // Character between boxes
  "pattern": "########################" // Pattern mask
}
```

### GeneratedPdf ([`src/models/GeneratedPdf.js`](src/models/GeneratedPdf.js))

Tracks generated PDFs with data snapshots and metadata.

**Schema Fields:**

| Field                     | Type     | Required    | Description                                    |
| ------------------------- | -------- | ----------- | ---------------------------------------------- |
| `offer`                   | ObjectId | Conditional | Reference to Offer                             |
| `lead`                    | ObjectId | No          | Reference to Lead                              |
| `template`                | ObjectId | Yes         | Template used for generation                   |
| `agent`                   | ObjectId | No          | User who generated the PDF                     |
| `team`                    | ObjectId | No          | Reference to Team (project)                    |
| `status`                  | String   | Yes         | `pending`, `generating`, `completed`, `failed` |
| `file_path`               | String   | Yes         | Storage path to generated PDF                  |
| `file_name`               | String   | Yes         | Generated filename                             |
| `storage_type`            | String   | Yes         | `local`, `cloud`, `dual`                       |
| `data_snapshot`           | Object   | Yes         | Complete data used for generation              |
| `field_mappings_snapshot` | Array    | Yes         | Field mappings at generation time              |
| `generation_time_ms`      | Number   | Yes         | Time taken to generate (milliseconds)          |
| `preview_generated`       | Boolean  | Yes         | Whether preview was created                    |
| `is_temp`                 | Boolean  | Yes         | Is this a temporary preview file?              |
| `actions`                 | Array    | Yes         | Audit trail of actions                         |
| `email_status`            | String   | No          | Email delivery status                          |
| `tags`                    | Array    | No          | User-defined tags                              |
| `notes`                   | String   | No          | User notes                                     |
| `generated_at`            | Date     | Yes         | Generation timestamp                           |
| `assigned_at`             | Date     | No          | Assignment timestamp                           |

**Data Snapshot Structure:**

```jsx
{
  "lead_data": {
    "contact_name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    // ... all lead fields
  },
  "offer_data": {
    "amount": 10000,
    "interest_rate": 2.5,
    "duration_months": 12,
    // ... all offer fields
  },
  "bank_data": {
    "name": "Example Bank",
    "iban": "DE89370400440532013000",
    "bic": "COBADEFFXXX",
    // ... all bank fields
  },
  "agent_data": {
    "name": "Jane Smith",
    "email": "jane@example.com",
    // ... all agent fields
  },
  "project_data": {
    "name": "Project Alpha",
    "reference": "REF-2024-001",
    // ... all project fields
  }
}
```

**Actions Audit Trail:**

```jsx
{
  "action": "generated",              // generated, downloaded, previewed, assigned
  "user_id": ObjectId("..."),
  "user_name": "Jane Smith",
  "timestamp": ISODate("2024-03-25T10:30:00Z"),
  "metadata": {
    "ip": "192.168.1.100",
    "user_agent": "Mozilla/5.0..."
  }
}
```

### Font ([`src/models/Font.js`](src/models/Font.js))

Manages custom uploaded fonts.

**Schema Fields:**

| Field          | Type     | Required | Description                                |
| -------------- | -------- | -------- | ------------------------------------------ |
| `font_family`  | String   | Yes      | Font family name                           |
| `font_name`    | String   | Yes      | Specific font name                         |
| `font_style`   | String   | Yes      | `regular`, `bold`, `italic`, `bold_italic` |
| `file_format`  | String   | Yes      | `TTF`, `OTF`, `WOFF`, `WOFF2`              |
| `file_path`    | String   | Yes      | Storage path to font file                  |
| `file_size`    | Number   | Yes      | File size in bytes                         |
| `storage_type` | String   | Yes      | `local`, `cloud`, `dual`                   |
| `uploaded_by`  | ObjectId | Yes      | User who uploaded                          |
| `usage_count`  | Number   | Yes      | Times used in generation                   |
| `is_active`    | Boolean  | Yes      | Font availability status                   |

### 3.2 Supporting Models

### User ([`src/models/User.js`](src/models/User.js))

- Authentication and authorization
- Password hashing (bcrypt, 10 rounds)
- Role assignment
- Session tracking

### Role ([`src/models/Role.js`](src/models/Role.js))

- RBAC role definitions
- Permission associations
- Role hierarchy (flat structure)

### UserSession ([`src/models/UserSession.js`](src/models/UserSession.js))

- Active session tracking
- Device fingerprinting
- Geolocation data
- Session expiration

### Offer ([`src/models/Offer.js`](src/models/Offer.js))

- Offer data for PDF generation
- References to Lead, Bank, Agent, Team

### Lead ([`src/models/Lead.js`](src/models/Lead.js))

- Lead/customer information
- Contact details
- Source tracking

### Bank ([`src/models/Bank.js`](src/models/Bank.js))

- Bank information
- Account details (IBAN, BIC)

### Team ([`src/models/Team.js`](src/models/Team.js))

- Project/team data
- Multi-tenancy support
- Agent associations

### Document ([`src/models/document.js`](src/models/document.js))

- General document storage
- File type tracking (contract, ID, extra, etc.)
- Library functionality (library, assigned, archived)

### 3.3 Model Relationships

```
PdfTemplate
    ├── team (Team) - many-to-one
    └── created_by (User) - many-to-one

GeneratedPdf
    ├── template (PdfTemplate) - many-to-one
    ├── offer (Offer) - many-to-one (conditional)
    ├── lead (Lead) - many-to-one
    ├── agent (User) - many-to-one
    └── team (Team) - many-to-one

Offer
    ├── lead (Lead) - many-to-one
    ├── bank (Bank) - many-to-one
    ├── agent (User) - many-to-one
    └── team (Team) - many-to-one

Team
    ├── agents (User[]) - one-to-many
    ├── banks (Bank[]) - many-to-many
    └── pdf_templates (PdfTemplate[]) - many-to-many

Document
    ├── polymorphic references to Lead, Offer, Opening, etc.
    └── assigned_to (User) - many-to-one

User
    ├── role (Role) - many-to-one
    └── sessions (UserSession[]) - one-to-many
```

### 3.4 Indexes & Performance

**Key Indexes:**

- `User.email` - Unique, for authentication lookups
- `UserSession.user_id` + `UserSession.status` - For active session queries
- `GeneratedPdf.offer` - For offer document retrieval
- `GeneratedPdf.status` - For filtering pending/completed
- `PdfTemplate.status` + `PdfTemplate.category` - For template filtering
- `PdfTemplate.file_hash` - Unique, for deduplication
- `Document.assigned_to` + `Document.file_type` - For document queries

**Performance Considerations:**

- Use `lean()` queries for read-only operations
- Limit field selection with `.select()` for large documents
- Implement pagination for list endpoints
- Cache permission lookups in Redis
- Use `populate()` sparingly - prefer manual lookups for complex queries

---

## 4. Service Layer

### 4.1 PDF Generation Service ([`src/services/pdfGenerationService.js`](src/services/pdfGenerationService.js))

**Size:** 2,423 lines - The core PDF generation engine.

**Primary Methods:**

### `generateOfferPdf(offerId, templateId, options)`

Main orchestrator for PDF generation.

**Parameters:**

- `offerId` (ObjectId) - Offer to generate PDF for
- `templateId` (ObjectId) - Template to use
- `options` (Object) - Optional settings:
- `notes` (String) - User notes
- `tags` (Array) - User tags
- `userId` (ObjectId) - User generating PDF
- `isTemp` (Boolean) - Create temporary preview?

**Process:**

1. Fetch offer, lead, bank, agent, team data
2. Prepare data snapshot with transformations
3. Load template from storage
4. Load fonts (standard + custom + DejaVu Sans)
5. Call `fillPdfTemplate()`
6. Save generated PDF to storage
7. Create GeneratedPdf record
8. Return metadata with URLs

**Returns:** GeneratedPdf object with preview/download/assign URLs

### `fillPdfTemplate(pdfDoc, dataSnapshot, template, customFonts)`

Core PDF filling logic using pdf-lib.

**Parameters:**

- `pdfDoc` (PDFDocument) - Loaded PDF document
- `dataSnapshot` (Object) - Complete data from all sources
- `template` (PdfTemplate) - Template with field mappings
- `customFonts` (Array) - Custom fonts to embed

**Process:**

1. Register fontkit with PDF document
2. Load and embed all fonts
3. Get PDF form from document
4. Process each field mapping:

- Extract data value using `extractDataValue()`
- Apply transformations
- Handle character-box groups
- Calculate optimal font size
- Set field value with font and color

5. Optionally flatten form
6. Optionally apply watermark

**Returns:** Filled PDFDocument object

### `extractDataValue(dataSource, dataField, dataSnapshot, transformation, format)`

Extracts and transforms data from snapshot.

**Parameters:**

- `dataSource` (String) - Source entity: `lead`, `offer`, `bank`, `agent`, `project`
- `dataField` (String) - Field path (supports nested: `bank.name`)
- `dataSnapshot` (Object) - Complete data snapshot
- `transformation` (String) - Optional: `capitalize`, `uppercase`, `lowercase`
- `format` (String) - Optional: `currency`, `percentage`, `date`

**Supported Formats:**

- `currency` - German locale currency formatting (e.g., “1.000,00 €”)
- `percentage` - Percentage with 2 decimals (e.g., “2,50 %”)
- `date` - German date format (DD.MM.YYYY)

**Returns:** Transformed value or empty string if not found

### `calculateOptimalFontSize(text, font, maxWidth, maxHeight, minSize, maxSize)`

Binary search font sizing for text fitting.

**Parameters:**

- `text` (String) - Text to fit
- `font` (Font) - Font to use
- `maxWidth` (Number) - Field width in points
- `maxHeight` (Number) - Field height in points
- `minSize` (Number) - Minimum font size (default: 6)
- `maxSize` (Number) - Maximum font size (default: 24)

**Algorithm:** Binary search between min/max sizes to find largest font that fits text within bounds.

**Returns:** Optimal font size (Number)

### `prepareDataForGeneration(offerId)`

Aggregates all related data for PDF generation.

**Parameters:**

- `offerId` (ObjectId) - Offer to fetch data for

**Process:**

1. Fetch offer with populated references
2. Fetch related lead
3. Fetch related bank
4. Fetch agent (user)
5. Fetch team (project)
6. Apply computed fields
7. Transform dates and currency

**Returns:** Complete data snapshot object

### `loadCustomFonts(template)`

Discovers and loads all required fonts.

**Parameters:**

- `template` (PdfTemplate) - Template with font settings

**Font Loading Order:**

1. Standard PDF fonts (Helvetica, Times-Roman, Courier)
2. DejaVu Sans (for Unicode support - German/Turkish characters)
3. System fonts (OS font directories)
4. Custom uploaded fonts (from database)

**Returns:** Array of loaded font objects

### 4.2 Field Extraction Service ([`src/services/pdfFieldExtractionService.js`](src/services/pdfFieldExtractionService.js))

**Size:** 773 lines - PDF template processing and field extraction.

**Primary Methods:**

### `extractFieldsFromPdf(pdfBuffer)`

Extracts all form fields from PDF.

**Parameters:**

- `pdfBuffer` (Buffer) - PDF file buffer

**Process:**

1. Load PDF document
2. Get form from document
3. Iterate through all fields
4. Extract field metadata:

- Name
- Type (text, checkbox, signature)
- Page index
- Coordinates (x, y, width, height)

5. Detect character-box patterns
6. Group related fields

**Returns:** Array of extracted field objects

### `detectFieldGroups(extractedFields)`

Identifies character-box field patterns.

**Patterns Detected:**

- `IBAN` - International Bank Account Numbers
- `PHONE` - Phone numbers
- `SSN` - Social Security Numbers
- `ZIP` - Postal codes
- `CUSTOM` - Custom numeric sequences

**Detection Logic:**

1. Find fields with matching prefixes (e.g., `iban_1`, `iban_2`)
2. Check for spatial alignment (same Y coordinate)
3. Verify sequential naming
4. Create field group with pattern

**Returns:** Array of field group objects

### `generatePreviewPdf(template)`

Creates PDF with field names filled in.

**Parameters:**

- `template` (PdfTemplate) - Template with extracted fields

**Process:**

1. Load original template
2. For each field, fill with field name
3. Save as preview PDF

**Purpose:** Visual reference for field mapping configuration

**Returns:** Buffer of preview PDF

### 4.3 Font Management Service ([`src/services/fontManagementService.js`](src/services/fontManagementService.js))

**Size:** 677 lines - Font discovery and upload handling.

**Primary Methods:**

### `discoverSystemFonts()`

Scans OS font directories for available fonts.

**Search Paths:**

- **Windows:** `C:/Windows/Fonts/`
- **macOS:** `/System/Library/Fonts/`, `/Library/Fonts/`
- **Linux:** `/usr/share/fonts/`, `/usr/local/share/fonts/`
- **Application:** `./storage/fonts/`, `./fonts/`

**Process:**

1. Scan each directory recursively
2. Read font files (.ttf, .otf, .woff, .woff2)
3. Extract font metadata (family, name, style)
4. Return list of system fonts

**Returns:** Array of system font objects

### `uploadFont(file, userId)`

Handles font file upload and storage.

**Parameters:**

- `file` (File) - Uploaded font file
- `userId` (ObjectId) - User uploading

**Process:**

1. Validate file format (TTF, OTF, WOFF, WOFF2)
2. Extract font metadata
3. Generate MD5 hash
4. Save to storage (local/cloud)
5. Create Font record in database

**Returns:** Created Font object

### 4.4 Storage Services

### Hybrid Storage Service ([`src/services/hybridStorageService.js`](src/services/hybridStorageService.js))

**Storage Modes:**

1. **Cloud Preferred** (default)
   - Upload to S3 first
   - Fallback to local if S3 fails
   - Read from S3, fallback to local
2. **Local Preferred**
   - Upload to local first
   - Fallback to S3 if local fails
   - Read from local, fallback to S3
3. **Dual Mode**
   - Upload to both simultaneously
   - Read from preferred source

**Primary Methods:**

### `uploadFile(file, key, options)`

Uploads file with intelligent routing.

**Parameters:**

- `file` (Buffer/Stream) - File to upload
- `key` (String) - Storage path/key
- `options` (Object):
- `contentType` (String) - MIME type
- `metadata` (Object) - Custom metadata

**Returns:** Object with storage type and path

### `downloadFile(key)`

Downloads file with fallback logic.

**Parameters:**

- `key` (String) - Storage path/key

**Process:**

1. Try preferred storage first
2. Fallback to secondary storage
3. Return file stream

**Returns:** File stream

### `checkFileExists(key)`

Checks if file exists in any storage.

**Parameters:**

- `key` (String) - Storage path/key

**Returns:** Object with existence status and location

### `getStorageStats()`

Returns storage usage statistics.

**Returns:**

```jsx
{
  "local": {
    "enabled": true,
    "fileCount": 150,
    "totalSize": "45.2 MB"
  },
  "cloud": {
    "enabled": true,
    "connected": true,
    "bucket": "leadpylot-pdfs"
  }
}
```

### AWS S3 Service ([`src/services/awsS3Service.js`](src/services/awsS3Service.js))

AWS S3 integration with multipart upload support.

**Primary Methods:**

### `uploadFile(buffer, key, options)`

Uploads file to S3 with multipart support.

**Features:**

- Multipart upload for files > 5MB
- Server-side encryption (AES256)
- Custom ACL support
- Progress tracking

**Returns:** S3 upload result

### `getSignedUrl(key, expiresIn)`

Generates presigned URL for temporary access.

**Parameters:**

- `key` (String) - Object key
- `expiresIn` (Number) - Expiration in seconds (default: 3600)

**Returns:** Presigned URL string

### `deleteFile(key)`

Deletes file from S3.

**Returns:** Deletion result

---

## 5. Authentication & Security

### 5.1 Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Client Request with JWT Token                           │
│    Headers: Authorization: Bearer <token>                  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Authentication Middleware                               │
│    src/middleware/auth/authenticate.js                      │
│    • Extract token from header                             │
│    • Verify JWT signature with JWT_SECRET                  │
│    • Decode token payload                                  │
│    • Check expiration time                                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. User Validation                                          │
│    • Fetch user from MongoDB (fresh data)                  │
│    • Check user exists                                     │
│    • Check user.active = true                              │
│    • Update req.user with latest user data                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Session Validation                                       │
│    • Find session in UserSession collection                │
│    • Check session.status = 'active'                       │
│    • Check session.expiresAt > now                         │
│    • Update session.lastActivity (sliding expiration)      │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Success - Proceed to Authorization                      │
└─────────────────────────────────────────────────────────────┘
```

**JWT Configuration:**

- **Algorithm:** HS256 (HMAC-SHA256)
- **Secret:** `process.env.JWT_SECRET` (1024+ bits recommended)
- **Expiration:** 24 hours (configurable via `JWT_EXPIRES_IN`)
- **Session Duration:** 24 hours (configurable via `SESSION_DURATION_HOURS`)

**Error Responses:**

- `401` - No token provided
- `401` - Invalid token signature
- `401` - Token expired
- `401` - User not found
- `401` - User account inactive
- `401` - Session expired or revoked

### 5.2 Authorization & RBAC

The service implements **Role-Based Access Control (RBAC)** with 223+ granular permissions.

### Permission Checking Flow

```
Request → authenticate → authorize (permission check)
                              │
                              ▼
                    ┌─────────────────────┐
                    │ Check Cache (Redis) │
                    │ Key: rbac:role-     │
                    │      permissions:   │
                    │      <role>         │
                    └─────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                Cache Hit           Cache Miss
                    │                   │
                    ▼                   ▼
            Return permissions    Query Database
                                (Role collection)
                                    │
                                    ▼
                            Store in Redis
                                    │
                                    ▼
                            Return permissions
```

### Permission Caching Strategy

**Redis Keys:**

- `rbac:role-permissions:<role>` - Array of permissions for role
- `rbac:role-name:<role>` - Role metadata
- `rbac:permissions:all` - All permissions (for admin checks)

**Cache Behavior:**

- **No TTL:** Permissions persist until manually invalidated
- **Invalidation:** Call `clearPermissionsCache()` when roles update
- **Fallback:** If Redis unavailable, query database directly

### Authorization Middleware Usage

```jsx
// In routes
const { authenticate, authorize, PERMISSIONS } = require('../middleware/auth');

router.post(
  '/admin/pdf-templates/upload',
  authenticate, // 1. Check JWT
  authorize(PERMISSIONS.PDF_TEMPLATE_CREATE), // 2. Check permission
  uploadTemplate // 3. Execute handler
);
```

### 5.3 User Roles

**Defined Roles:** 6 total

| Role       | Description          | Permissions                          |
| ---------- | -------------------- | ------------------------------------ |
| `Admin`    | System administrator | All 223+ permissions                 |
| `Manager`  | Project manager      | Read-only access to most resources   |
| `Agent`    | Sales agent          | Limited access, data masking applies |
| `Banker`   | Bank partner         | Read access to offer/bank data       |
| `Client`   | End client           | Read access to own data only         |
| `Provider` | Service provider     | Read access to assigned tasks        |

**Role Assignment:**

- Set in `User.role` field
- References `Role` collection
- Real-time checking (fetched from DB on each request)

### 5.4 Complete Permission List

**PDF Service Permissions (12 permissions):**

```jsx
// Font Management (4 permissions)
FONT_MANAGEMENT_READ: 'font:management:read';
FONT_MANAGEMENT_CREATE: 'font:management:create';
FONT_MANAGEMENT_UPDATE: 'font:management:update';
FONT_MANAGEMENT_DELETE: 'font:management:delete';

// PDF Generation (4 permissions)
PDF_GENERATION_READ: 'pdf:generation:read';
PDF_GENERATION_CREATE: 'pdf:generation:create';
PDF_GENERATION_UPDATE: 'pdf:generation:update';
PDF_GENERATION_DELETE: 'pdf:generation:delete';

// PDF Templates (4 permissions)
PDF_TEMPLATE_READ: 'pdf:template:read';
PDF_TEMPLATE_CREATE: 'pdf:template:create';
PDF_TEMPLATE_UPDATE: 'pdf:template:update';
PDF_TEMPLATE_DELETE: 'pdf:template:delete';
```

**Full System Permissions (223+ total):**

- User Management: 24 permissions
- Project/Team: 32 permissions
- Lead: 28 permissions
- Offer: 24 permissions
- Bank: 16 permissions
- Email: 18 permissions
- Notification: 12 permissions
- Search: 8 permissions
- Security: 14 permissions
- Settings: 20 permissions
- Document: 15 permissions
- PDF: 12 permissions (listed above)

**See:** [`src/middleware/roles/permissions.js`](src/middleware/roles/permissions.js) for complete list

### 5.5 Data Masking Rules

**Role-Based Data Privacy:**

The **Agent** role has restricted access to sensitive information. When Agents retrieve or update PDF data snapshots, the following fields are automatically masked:

**Email Fields:**

- `email`
- `email_address`
- `mail`
- `contact_email`

**Phone Fields:**

- `phone`
- `mobile`
- `handy`
- `telefon`
- `mobile_number`

**Masking Behavior:**

- **GET requests:** Fields are stripped from response
- **PUT requests:** Fields in request body are ignored
- **Other roles:** No masking applied

---

## 6. Storage Architecture

### 6.1 Hybrid Storage System

The PDF Service implements a **flexible multi-storage abstraction** supporting local filesystem, AWS S3, and S3-compatible services (Lightsail, MinIO).

```
┌─────────────────────────────────────────────────────────────┐
│                   Storage Abstraction Layer                  │
│                 hybridStorageService.js                      │
└─────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  Local FS     │ │  AWS S3       │ │  S3-Compatible │
│  Storage      │ │  Storage      │ │  Storage       │
│               │ │               │ │  (Lightsail)   │
└───────────────┘ └───────────────┘ └───────────────┘
```

### 6.2 Storage Modes

**Configuration:** Set via environment variables

### 1. Cloud Preferred (Default)

```
CLOUD_STORAGE_ENABLED=true
PREFERRED_STORAGE=cloud
STORAGE_FALLBACK_TO_LOCAL=true
```

**Behavior:**

- Upload to S3 first
- If S3 fails, fallback to local
- Read from S3, fallback to local if not found

**Use Case:** Production with cloud storage

### 2. Local Preferred

```
CLOUD_STORAGE_ENABLED=false
PREFERRED_STORAGE=local
```

**Behavior:**

- Upload to local filesystem
- No cloud storage interaction
- All operations on local disk

**Use Case:** Development, testing

### 3. Dual Storage Mode

```
CLOUD_STORAGE_ENABLED=true
PREFERRED_STORAGE=cloud
DUAL_STORAGE_MODE=true
```

**Behavior:**

- Upload to both S3 and local simultaneously
- Read from preferred source (S3)
- Fallback to secondary if preferred fails

**Use Case:** Backup/redundancy requirements

### 6.3 Storage Directory Structure

**Local Storage:**

```
storage/
├── documents/          # Generated PDFs
├── imports/            # Import files
├── offer_imports/      # Offer-specific imports
├── uploads/            # User uploads
├── signatures/         # Digital signatures
├── fonts/              # Custom font files
└── temp-uploads/       # Temporary uploads
```

**S3 Storage:**

```
s3://<bucket>/
├── documents/          # Generated PDFs
├── templates/          # PDF templates
├── fonts/              # Custom fonts
└── temp/               # Temporary files
```

### 6.4 File Upload Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Receive File Upload                                      │
│    • Validate file type (PDF, TTF, OTF)                     │
│    • Check file size limits                                 │
│    • Generate unique filename                               │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Determine Storage Location                               │
│    • Check PREFERRED_STORAGE                                │
│    • Check CLOUD_STORAGE_ENABLED                            │
│    • Check DUAL_STORAGE_MODE                                │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Upload to Storage(s)                                     │
│    • If dual mode: Upload to both simultaneously            │
│    • If cloud preferred: Try S3, fallback to local          │
│    • If local preferred: Upload to local only               │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Save Metadata to Database                                │
│    • Store file_path                                        │
│    • Store storage_type (local/cloud/dual)                  │
│    • Store file_hash (MD5 for deduplication)               │
└─────────────────────────────────────────────────────────────┘
```

### 6.5 AWS S3 Configuration

**Environment Variables:**

```
# Required
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
AWS_REGION=eu-central-1
AWS_S3_BUCKET=leadpylot-pdfs

# Optional
AWS_S3_ENDPOINT=https://s3.eu-central-1.amazonaws.com
AWS_S3_MULTIPART_THRESHOLD=5242880    # 5MB
AWS_S3_PART_SIZE=5242880              # 5MB
AWS_CONNECTION_TIMEOUT=30000          # 30 seconds
AWS_REQUEST_TIMEOUT=30000             # 30 seconds
AWS_S3_SERVER_SIDE_ENCRYPTION=AES256
AWS_S3_ACL=private
```

**S3 Features:**

- Multipart upload for files > 5MB
- Server-side encryption (AES256)
- Presigned URLs for temporary access
- Custom endpoint support (Lightsail, MinIO)
- Connection testing and health checks

---

## 7. PDF Generation Internals

### 7.1 Generation Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Request Validation                                  │
│    • Validate offerId and templateId                        │
│    • Check user permissions                                 │
│    • Verify offer and template exist                        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Data Aggregation                                    │
│    • Fetch Offer with populated references                  │
│    • Fetch Lead                                             │
│    • Fetch Bank                                             │
│    • Fetch Agent (User)                                     │
│    • Fetch Team (Project)                                   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Data Preparation                                    │
│    • Create data_snapshot object                            │
│    • Add computed fields                                    │
│    • Apply date formatting (DD.MM.YYYY)                     │
│    • Apply currency formatting (German locale)              │
│    • Apply percentage formatting                            │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Template Loading                                    │
│    • Fetch PdfTemplate from database                        │
│    • Download template PDF from storage                     │
│    • Load field_mappings                                    │
│    • Load template settings                                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Font Loading                                        │
│    • Load standard PDF fonts (Helvetica, Times, Courier)    │
│    • Load DejaVu Sans (Unicode support)                     │
│    • Load custom uploaded fonts                             │
│    • Register fonts with pdf-lib fontkit                    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 6: PDF Processing                                      │
│    • Load PDF document with pdf-lib                         │
│    • Get form from document                                 │
│    • For each field mapping:                                │
│      - Extract data value from snapshot                     │
│      - Apply transformations (case, format)                  │
│      - Handle character-box fields (split into chars)       │
│      - Calculate optimal font size                          │
│      - Set field value with font and color                  │
│    • Optionally flatten form                                │
│    • Optionally apply watermark                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 7: PDF Saving                                          │
│    • Generate filename (with indexing)                      │
│    • Serialize PDF to bytes                                 │
│    • Create temporary file (temp_ prefix) if preview        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 8: Storage & Metadata                                  │
│    • Upload PDF to storage (local/cloud)                    │
│    • Create GeneratedPdf record:                            │
│      - Store data_snapshot                                  │
│      - Store field_mappings_snapshot                        │
│      - Track generation_time_ms                             │
│      - Set is_temp flag                                     │
│      - Log action in audit trail                            │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 9: Response                                            │
│    • Return GeneratedPdf object with:                       │
│      - previewUrl (GET /pdf/generated/:id/preview)          │
│      - downloadUrl (GET /pdf/generated/:id/download)        │
│      - assignUrl (POST /pdf/generated/:id/assign)           │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Field Mapping System

**Field Mapping Structure:**

```jsx
{
  "pdf_field": "customer_name",      // Field name in PDF
  "data_source": "lead",             // Data source entity
  "data_field": "contact_name",      // Field in data source
  "transformation": "capitalize",     // Optional text transformation
  "format": null,                    // Optional formatting (currency, percentage, date)
  "default_value": "Unknown",        // Fallback if data is empty
  "color": "#000000"                 // Text color (hex)
}
```

**Supported Data Sources:**

- `lead` - Lead/customer data
- `offer` - Offer data
- `bank` - Bank information
- `agent` - Agent (user) data
- `project` - Project/team data

**Supported Transformations:**

- `capitalize` - First letter uppercase
- `uppercase` - All uppercase
- `lowercase` - All lowercase
- `none` - No transformation (default)

**Supported Formats:**

- `currency` - German locale currency (1.000,00 €)
- `percentage` - Percentage with 2 decimals (2,50 %)
- `date` - German date format (DD.MM.YYYY)
- `none` - No formatting (default)

**Nested Field Access:**

```jsx
// Access nested fields with dot notation
{
  "pdf_field": "bank_name",
  "data_source": "bank",
  "data_field": "name"  // Maps to bank.name
}

// Deep nesting
{
  "pdf_field": "agent_email",
  "data_source": "agent",
  "data_field": "email"  // Maps to agent.email
}
```

### 7.3 Font Management

**Font Loading Priority:**

1. **Standard PDF Fonts** (Always available)

- Helvetica
- Helvetica-Bold
- Helvetica-Oblique
- Helvetica-BoldOblique
- Times-Roman
- Times-Bold
- Times-Italic
- Times-BoldItalic
- Courier
- Courier-Bold
- Courier-Oblique
- Courier-BoldOblique

1. **DejaVu Sans** (For Unicode support)
   - Automatically embedded for German/Turkish characters
   - Required for: ä, ö, ü, Ä, Ö, Ü, ß, ç, ğ, ı, ö, ş, ü
2. **System Fonts** (OS-dependent)
   - Scanned from OS font directories
   - Platform-specific paths (Windows/macOS/Linux)
   - TTF, OTF, WOFF, WOFF2 formats
3. **Custom Uploaded Fonts**
   - User-uploaded TTF/OTF files
   - Stored in database and storage
   - Loaded per template requirements

**Font Embedding Process:**

```jsx
// Register fontkit
pdfDoc.registerFontkit(fontkit);

// Load and embed fonts
const standardFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
const dejaVuFont = await pdfDoc.embedFont(readFileSync('fonts/DejaVuSans.ttf'));
const customFont = await pdfDoc.embedFont(readFileSync(customFontPath));

// Use in fields
field.setText('Hello World'); // Uses default font
field.setDefaultAppearance({ font: customFont, fontSize: 12 });
```

### 7.4 Character-Box Fields

**Purpose:** Handle PDF forms with individual character boxes (common for IBAN, phone numbers, SSN).

**Detection Logic:**

```jsx
// Example: IBAN with 22 character boxes
// PDF fields: iban_1, iban_2, iban_3, ..., iban_22
// All fields have same Y coordinate (aligned horizontally)
// Sequential X coordinates (left to right)

// Detected group:
{
  "group_name": "iban",
  "group_type": "IBAN",
  "fields": ["iban_1", "iban_2", "iban_3", ...],
  "separator": "",
  "pattern": "DE########################"
}
```

**Processing:**

```jsx
// Input data: "DE89370400440532013000"
// Split into individual characters
const chars = data.split(''); // ['D', 'E', '8', '9', ...]

// Fill each character field
for (let i = 0; i < group.fields.length; i++) {
  const fieldName = group.fields[i];
  const char = chars[i] || '';
  // Fill field with single character
  pdfForm.getField(fieldName).setText(char);
}
```

**Supported Group Types:**

- `IBAN` - International Bank Account Numbers (22-34 chars)
- `PHONE` - Phone numbers (10-15 chars)
- `SSN` - Social Security Numbers (9-11 chars)
- `ZIP` - Postal codes (5-10 chars)
- `CUSTOM` - Custom numeric sequences

### 7.5 Transformation Pipeline

**Data Transformation Flow:**

```
Raw Data from Database
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Extract Value                                       │
│    • Navigate to data_source.data_field                     │
│    • Handle nested paths (dot notation)                     │
│    • Return value or empty string                           │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Apply Default Value                                 │
│    • If value is empty/null/undefined                       │
│    • Use mapping.default_value                              │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Apply Format Transformation                         │
│    • currency: Format as German currency (1.000,00 €)       │
│    • percentage: Format as percentage (2,50 %)              │
│    • date: Format as German date (DD.MM.YYYY)              │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Apply Text Transformation                           │
│    • capitalize: First letter uppercase                     │
│    • uppercase: ALL UPPERCASE                               │
│    • lowercase: all lowercase                               │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
Final Value → Fill PDF Field
```

**Formatting Examples:**

| Raw Value              | Format       | Transformation | Result       |
| ---------------------- | ------------ | -------------- | ------------ |
| `1000.5`               | `currency`   | `none`         | `1.000,50 €` |
| `0.025`                | `percentage` | `none`         | `2,50 %`     |
| `2024-03-25T10:30:00Z` | `date`       | `none`         | `25.03.2024` |
| `john doe`             | `none`       | `capitalize`   | `John doe`   |
| `john doe`             | `none`       | `uppercase`    | `JOHN DOE`   |

### 7.6 Performance Considerations

**Generation Time Tracking:**

- Every generation tracked in `generation_time_ms` field
- Start time: Before data fetching
- End time: After PDF upload to storage

**Performance Optimization Tips:**

1. **Font Loading**
   - Cache loaded fonts in memory
   - Load only required fonts per template
   - Use standard fonts when possible (faster than custom fonts)
2. **Data Fetching**
   - Use `lean()` for read-only queries
   - Populate only required fields
   - Implement database query optimization
3. **PDF Processing**
   - Minimize font embedding overhead
   - Use auto-sizing sparingly (computationally expensive)
   - Batch field updates when possible
4. **Storage**
   - Use cloud storage for production (faster than local disk)
   - Enable dual mode for redundancy
   - Implement CDN for PDF downloads
5. **Caching**
   - Cache permission lookups in Redis
   - Cache font metadata
   - Consider caching generated PDFs (if data doesn’t change)

---

## 8. PDF Template Management

This section covers all administrative endpoints for managing PDF templates, found in [`src/routes/pdfTemplates.js`](src/routes/pdfTemplates.js).

### Upload Template

**Endpoint**: `POST /admin/pdf-templates/upload`

Uploads a PDF form and extracts its fields to create a new template.

- **Request**: Multi-part form-data. Use the field `template` for the PDF file. Optional fields include `name`, `description`, `category` (offer, contract, application, other), `offer_type` (required if category is offer), and `tags` (array or comma-separated string).
- **Response**: A 201 Created response containing the full template object, the list of `extracted_fields`, and the initial status set to `draft`.
- **Edge Cases**:
  - **No file**: Returns 400 “No PDF file provided”.
  - **Invalid format**: Rejects non-PDF files with 400 “Only PDF files are allowed”.
  - **File size**: Files over 50MB return 400 “File too large”.
  - **Missing offer_type**: If category is “offer”, missing the type returns 400 validation error.

### Get All Templates

**Endpoint**: `GET /admin/pdf-templates`

Retrieves a list of templates with filtering.

- **Request**: Query parameters for `status`, `category`, `search` (name/desc), `page`, `limit`, `sortBy`, and `sortOrder`.
- **Response**: A JSON object with a `data` array of templates and pagination metadata (total, pages, current).
- **Edge Cases**:
  - **Empty results**: Returns 200 with an empty array if no filters match.

### Get Template Statistics

**Endpoint**: `GET /admin/pdf-templates/stats`

Provides a summary of template usage and counts.

- **Response**: Counts grouped by status and category, plus total usage metrics.

### Get Field Mapping Options

**Endpoint**: `GET /admin/pdf-templates/field-mapping-options`

Returns available system fields that can be mapped to PDF fields.

- **Response**: A structured list of fields from Lead, Offer, Bank, and Agent entities.

### Get Template Details

**Endpoint**: `GET /admin/pdf-templates/:id`

Fetch a specific template by its MongoDB ID.

- **Request**: Path parameter `id`.
- **Response**: Comprehensive template data including current mappings and settings.
- **Edge Cases**:
  - **Invalid ID**: Returns 400 “Invalid template ID”.
  - **Not Found**: Returns 404 if the template doesn’t exist.

### Update Template Metadata

**Endpoint**: `PUT /admin/pdf-templates/:id`

Updates the template’s descriptive fields.

- **Request**: JSON body with any of the fields: `name`, `description`, `category`, `offer_type`, `tags`.
- **Response**: The updated template object.
- **Edge Cases**:
  - **Category shift**: Changing category to “offer” without providing `offer_type` results in a 400 error.

### Update Template Settings

**Endpoint**: `PUT /admin/pdf-templates/:id/settings`

Configures generation behaviors like font size, watermarking, and protection.

- **Request**: JSON body with a `settings` object. Fields include `default_font`, `default_font_size`, `auto_flatten`, `watermark`, and `password_protect`.
- **Response**: Confirmation and the saved settings.
- **Edge Cases**:
  - **Invalid font/size**: Restricted to specific font families and sizes between 6-72.

### Delete Template

**Endpoint**: `DELETE /admin/pdf-templates/:id`

Archives a template.

- **Response**: 200 OK. If the template is currently used by any generated PDFs, it is marked as `archived` instead of being physically deleted to maintain historical consistency.

### Duplicate Template

**Endpoint**: `POST /admin/pdf-templates/:id/duplicate`

Creates a copy of an existing template with a new name.

- **Request**: Optional `name` in body.
- **Response**: The new template object in `draft` status.

### Get Template Fields

**Endpoint**: `GET /admin/pdf-templates/:id/fields`

Specific endpoint to get extracted fields and their current mapping status.

- **Response**: Detailed list of `extractedFields`, `fieldGroups`, and a `mappingCompletion` percentage.

### Update Field Mappings

**Endpoint**: `PUT /admin/pdf-templates/:id/field-mappings`

The core configuration endpoint for data injection.

- **Request**: `mappings` (Array of pdf-to-data source maps) and `fieldGroups` (for character-box splitting).
- **Response**: Success message and the new `mappingCompletion` score.
- **Edge Cases**:
  - **Invalid data source**: Only allows specific sources like `lead`, `offer`, `bank`, etc.

---

## 9. Font Management

Management of typography for PDF documents, found in [`src/routes/fontManagement.js`](src/routes/fontManagement.js).

### List Available Fonts

**Endpoint**: `GET /admin/fonts`

Lists all fonts available for PDF field styling.

- **Response**: Categorized list of Standard, System, and Uploaded fonts.

### Get Font Options

**Endpoint**: `GET /admin/fonts/options`

Formats fonts specifically for UI dropdowns.

- **Response**: Array of objects with `value`, `label`, and `type`.

### Upload Font

**Endpoint**: `POST /admin/fonts/upload`

Uploads a TTF or OTF file to the service.

- **Request**: Multi-part form-data with `fontFile`.
- **Response**: Metadata for the newly stored font.
- **Edge Cases**:
  - **No file**: Returns 400 “No font file provided”.
  - **Invalid extension**: Rejects non-font files.

### Preview Font

**Endpoint**: `POST /admin/fonts/preview`

Returns a sample string formatted for testing.

- **Request**: `font_family`, `sample_text`.
- **Response**: Font family details and a placeholder preview URL.

### Delete Font

**Endpoint**: `DELETE /admin/fonts/:fontId`

Removes a custom uploaded font.

- **Edge Cases**:
  - **Invalid ID**: Returns 400 if ID is not a valid MongoDB ObjectId.

---

## 10. PDF Generation

Generation and assignment of documents, found in [`src/routes/pdfGeneration.js`](src/routes/pdfGeneration.js).

### Generate Offer PDF

**Endpoint**: `POST /pdf/generate-offer`

The primary manual generation trigger.

- **Request**: `offerId` and `templateId`. Optional `notes` and `tags`.
- **Response**: Contains the `generatedPdf` metadata and URLs for preview, download, and assignment.
- **Edge Cases**:
  - **Missing IDs**: Returns 400 for missing offer or template.
  - **Generation Failure**: If the PDF lib fails to fill the form, returns 500 “PDF generation failed”.

### Get Offer Documents

**Endpoint**: `GET /pdf/offer/:offerId/documents`

Retrieves generated documents tied to an offer.

- **Status**: Currently returning a “not yet implemented” message in the microservice as these documents are stored in a separate `Document` collection.

### Preview Generated PDF

**Endpoint**: `GET /pdf/generated/:generatedPdfId/preview`

Streams the PDF for inline viewing.

- **Response**: Binary PDF data with `Content-Type: application/pdf`.
- **Edge Cases**:
  - **File missing**: Returns 404 “PDF file not found on disk” or in cloud.
  - **Storage type**: Automatically switches between Temp, Cloud, or Local storage based on the file’s current state.

### Download Generated PDF

**Endpoint**: `GET /pdf/generated/:generatedPdfId/download`

Fires a file download for a generated PDF.

- **Response**: Identical to preview but sets `Content-Disposition: attachment`.

### Assign Generated PDF

**Endpoint**: `POST /pdf/generated/:generatedPdfId/assign`

Finalizes a document and assigns it to an offer.

- **Request**: Optional `offerId` override and `notes`.
- **Response**: Returns the formalized Document object.
- **Edge Cases**:
  - **Contract Collision**: If an `offer-contract` already exists, it is demoted to `offer-extra` to ensure only one active contract exists per offer.
  - **Regeneration**: If the file was a temporary preview (`temp_`), it is fully regenerated with final data before assignment.

### Get Generated PDF Data

**Endpoint**: `GET /pdf/generated/:generatedPdfId/data`

Fetches the data snapshot used to generate the PDF for review or editing.

- **Response**: The `data_snapshot` object.
- **Edge Cases**:
  - **Agent Restriction**: If the user is an **Agent**, sensitive lead fields (Email, Phone) are automatically stripped from the response.

### Update Generated PDF Data

**Endpoint**: `PUT /pdf/generated/:generatedPdfId/data`

Updates the data snapshot and triggers an immediate regeneration of the PDF.

- **Request**: JSON object with `data` sections (lead_data, offer_data, etc.).
- **Response**: Updated PDF metadata.
- **Edge Cases**:
  - **Empty update**: Returns error if no valid data sections are provided.
  - **Agent Override**: Agents are prevented from updating sensitive fields. Any such fields in the request are ignored.

---

## 11. Security Details

### Professional Data Masking

The system implements a privacy layer specifically for the **Agent** role. When retrieving or updating PDF data snapshots, the following fields are masked/protected:

- **Email**: email, email_address, mail, contact_email
- **Phone**: phone, mobile, handy, telefon, mobile_number

### Authentication Flow

See **Section 5: Authentication & Security** for complete authentication and authorization details.

---

## 12. Utility Endpoints

Found in the main [`src/app.js`](src/app.js) entry point.

### Health Check

**GET `/health`**

Basic status check for the service.

- **Response**: 200 OK with `status`, `timestamp`, and `uptime`.

### Readiness Check

**GET `/ready`**

Checks if the service is ready to accept traffic (database connection check).

- **Response**:
  - 200 OK if MongoDB is connected.
  - 503 Service Unavailable if MongoDB is disconnected.

---

## 13. API Quick Reference

### Base URLs

- **Development**: `http://localhost:4009`
- **Production**: Configured via reverse proxy

### Endpoint Groups

| Path                   | Description         | Authentication      |
| ---------------------- | ------------------- | ------------------- |
| `/health`              | Health check        | Public              |
| `/ready`               | Readiness check     | Public              |
| `/admin/pdf-templates` | Template management | Admin only          |
| `/admin/fonts`         | Font management     | Admin only          |
| `/pdf`                 | PDF generation      | Authenticated users |

### Authentication

All protected endpoints require JWT authentication:

```bash
# Get JWT token from login endpoint
# Then include in requests:
Authorization: Bearer <your-jwt-token>
```

### Error Codes

| Code | Description              |
| ---- | ------------------------ |
| 1000 | Unauthorized             |
| 1002 | Token expired            |
| 1004 | Insufficient permissions |
| 1104 | Resource not found       |
| 1200 | Validation error         |
| 1300 | Database error           |
| 1400 | Server error             |
| 1500 | Business logic error     |

---

**Document Version:** 2.0
**Last Updated:** 2024-03-25
**For the latest version and contributions, visit the repository.**

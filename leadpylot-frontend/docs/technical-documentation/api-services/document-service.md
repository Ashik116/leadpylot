# Technical Documentation - Document Service API

---

## 1. Project Overview

The Document Service API is a high-performance Node.js microservice responsible for managing document lifecycles, hybrid storage, and entity assignments within the LeadPylot ecosystem. It abstracts the complexity of multiple storage backends into a unified interface for the rest of the microservices.

### 1.1 Key Features

- **Hybrid Storage Architecture**: Seamlessly switch between or redundantly use Local and AWS S3 storage.
- **Cloudinary Integration**: Out-of-the-box support for CDN-based assets and direct frontend-to-cloud registrations.
- **Document Library**: A centralized searchable repository with tagging, metadata tracking, and archiving capabilities.
- **Entity Assignment**: Robust linking system to associate documents with Leads, Offers, Openings, and notification triggers.
- **Secure Access Control**: Granular Role-Based Access Control (RBAC) protecting sensitive files.
- **Public & Private Sharing**: Support for authenticated views and secure public sharing via non-guessable slugs.

---

## 2. System Architecture

The service follows a decoupled, service-oriented architecture designed for high availability and data integrity.

### 2.1 Component Architecture

- **API Entry Point (`app.js`)**: Configures fundamental middleware (CORS, body-parsing, security headers) and mounts the attachment routers.
- **Middleware Layer**:
  - `authenticate`: Validates JWT tokens and identifies the requesting user.
  - `authorize`: Enforces role-based permissions using a centralized permission matrix.
- **Controller Layer (`controllers/`)**:
  - `attachmentController`: Handles file serving, aggregation (ZIP), and core logic.
  - `documentLibraryController`: Manages library-specific views, searches, and entity assignments.
  - `cloudinaryController`: Manages interactions with the Cloudinary API.
- **Service Layer (`services/`)**:
  - `UnifiedDocumentService`: Orcherstrates the entire file ingestion process (hashing, mime-detection, record creation).
  - `HybridStorageService`: The core abstraction for file I/O, managing the “Dual Mode” and “Fallback” logic.
  - `AWSS3Service`: Direct low-level implementation for Amazon S3 interactions.
  - `CloudinaryService`: Local implementation for Cloudinary asset management.
- **Data Layer (`models/`)**:
  - `Document`: The primary Mongoose schema tracking every file’s state, location, and assignments.

### 2.2 Schema Synchronization

On service startup, the `schemaPublisher` utility automatically transmits the current Document schema definitions to the `search-service`. This ensures that the global search index remains consistent with the local document metadata structure without manual configuration updates.

---

## 3. Storage Strategy & Implementation

The Document Service implements a highly resilient **Hybrid Storage Model**.

### 3.1 Storage Modes

- **Single Storage Mode**: Documents are stored in the preferred backend (S3 if enabled, otherwise Local).
- **Dual Storage Mode**: For maximum safety, files are written to both Local Disk and AWS S3 simultaneously. If one fails, the other serves as an immediate backup.
- **Fallback Mechanism**: If Cloud storage is configured as preferred but encounters a timeout or credential error, the system automatically writes to Local storage and logs a warning, ensuring the user’s upload never fails.

### 3.2 File Processing Workflow

1. **Reception**: Files are received via Multer, with a standard limit of 50MB per file.
2. **Identification**: The system generates a unique hash (MD5) of the file content. This hash is used for data integrity checks and can be used for future de-duplication.
3. **Mime-Type Validation**: Files are checked against a strict allow-list of document, image, and audio formats.
4. **Persistence**: The `HybridStorageService` determines the target paths and performs the I/O operations.
5. **Indexing**: A `Document` record is created in MongoDB, storing the relative path, storage source (`local`/`s3`/`cloudinary`), and a generated `public_slug`.

---

## 4. Data Model Design

The core entity is the `Document` Mongoose model. It acts as a metadata pointer to a physical file.

### 4.1 Schema Definition Reference

| Field            | Type     | Description                                                        |
| ---------------- | -------- | ------------------------------------------------------------------ |
| `filename`       | String   | Original name of the uploaded file.                                |
| `path`           | String   | Internal relative path or S3 key.                                  |
| `storage_source` | Enum     | `local`, `s3`, or `cloudinary`.                                    |
| `public_slug`    | String   | Unique index for non-authenticated public access.                  |
| `library_status` | Enum     | Lifecycle state: `library`, `assigned`, or `archived`.             |
| `type`           | String   | Logic categorization (e.g., `contract`, `id_files`, `annahme`).    |
| `uploader_id`    | ObjectId | Reference to the User who uploaded the file.                       |
| `assignments`    | Array    | List of links to Leads, Offers, etc., with active/inactive status. |
| `metadata`       | Object   | Stores `file_hash`, `content_type`, and Cloudinary IDs.            |

---

## 5. Security & Isolation

### 5.1 Permission Matrix

Access is governed by specific permission tokens:

- **`ATTACHMENT_VIEW`**: Permission to stream or initiate a redirect to the file content.
- **`ATTACHMENT_DELETE`**: Permission to initiate cleanup and record removal.
- **`DOCUMENT_LIBRARY_READ`**: Permission to search the document library.
- **`DOCUMENT_LIBRARY_ASSIGN`**: Permission to modify the `assignments` array.

### 5.2 Tenant & Agent Isolation

- **Agents**: Strictly isolated. They can only query documents they personally uploaded or documents specifically assigned to Leads within their own team.
- **Admins**: Have broad “God-mode” access to view, download, and permanently delete any document in the system.

---

## 6. Detailed Data Flows

The Document Service coordinates between several internal and external components to handle document lifecycles.

### 6.1 Document Upload & Ingestion Flow (Standard)

This flow occurs during manual library uploads or direct entity-related uploads.

1. **Request Reception**:
   - The client sends a `multipart/form-data` request.
   - `Auth` middleware validates the bearer token and injects the `user` object.
   - `RBAC` middleware ensures the user has `DOCUMENT_LIBRARY_WRITE` permission.
2. **Stream Processing (Multer)**:
   - Files are streamed to a temporary disk location (`temp-uploads/`).
   - Middleware validates `fileSize` (50MB) and `mimetype` (Allowed: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX, CSV, ZIP).
3. **Unified Processing Orchestration**:
   - `UnifiedDocumentService.processFile()` is called for each file.
   - **Hashing**: An MD5 hash is generated from the file stream. This is stored in `metadata.file_hash` for deduplication and integrity.
   - **Mime Detection**: Final verification of the file type via `file-type` library.
4. **Hybrid Persistence Logic**:
   - `HybridStorageService.uploadFile()` is invoked.
   - It checks the `PREFERRED_STORAGE` and `DUAL_STORAGE_MODE` env vars.
   - **S3 Upload**: If cloud is enabled, the file is streamed to the configured S3 bucket with a unique key.
   - **Local Storage**: The file is moved from temp-uploads to the final `storage/` directory.
   - **Dual Mode**: If enabled, BOTH actions occur.
   - **Fallback Logic**: If S3 upload fails (timeout/credentials), the service automatically attempts a local write and returns a status flag indicating the local path is the primary for this record.
5. **Database Registration**:
   - A `Document` record is created in MongoDB.
   - **Metadata Extraction**: Original name, extension, and detected content-type are stored.
   - **Life-cycle State**: Initial `library_status` is set to `library`.
   - `pre('save')` hook: Concatenates `filename`, `tags`, and `notes` into a lowercase `searchable_text` field for fast regex-based keyword search.
6. **Cross-Service Notification**:
   - `schemaPublisher` emits the document schema to the `search-service`.
   - This allows the central search engine to index the new metadata for global platform search.
7. **Indexing**: MongoDB updates its compound index on `assignments.entity_type` and `assignments.entity_id`, making the document instantly retrievable via the `/api/attachments/lead/:id` endpoint.

### 6.3 Public File Sharing Flow

Providing secure access to non-authenticated users.

1. **Generation**: When a document is uploaded, a `public_slug` (sparse unique) is optionally generated or manually assigned.
2. **Request**: User accesses `GET /public/:slug`.
3. **Validation**:
   - Service checks if `active: true`.
   - Service checks if file exists in S3 or Local.
4. **Streaming**: The service streams the file directly to the response with `Content-Disposition: inline`.

### 6.4 Search & Indexing Flow

How documents become discoverable across the platform.

1. **Ingestion**: After DB save, `pre('save')` hook builds the `searchable_text`.
2. **Local Search**: `Document.searchDocuments()` uses a Mongoose regex query on the `text` indexed fields.
3. **Global Search**: `schemaPublisher` sends the record metadata to the `search-service` (ElasticSearch/OpenSearch counterpart).
4. **Discovery**: The search service indexes the metadata, making it findable via the global navbar or specialized attachment search tools.

---

## 7. Model Documentation (Mongoose)

The Document Service primarily “owns” the `Document` model and “references” several others from the shared cluster.

### 7.1 The `Document` Model

The central entity representating a physical file and its logical associations.

### 7.1.1 Schema Fields (Comprehensive)

| Field             | Type     | Description                      | Logic / Default                                  |
| ----------------- | -------- | -------------------------------- | ------------------------------------------------ |
| `filename`        | String   | Filename displayed to users.     | Required.                                        |
| `path`            | String   | Internal storage path or S3 key. | Required.                                        |
| `filetype`        | String   | File extension (e.g., `.pdf`).   | Required.                                        |
| `size`            | Number   | File size in bytes.              | Required.                                        |
| `storage_source`  | String   | Where the file is kept.          | Enum: `local`, `s3`, `cloudinary`.               |
| `public_url`      | String   | Direct URL if stored on cloud.   | Default: null.                                   |
| `public_slug`     | String   | Unique non-guessable sharing ID. | Sparse unique index.                             |
| `type`            | String   | Business classification.         | Enum (contract, id_files, etc).                  |
| `active`          | Boolean  | Soft-deletion flag.              | Default: true.                                   |
| `library_status`  | String   | Lifecycle state.                 | Enum: `library`, `assigned`, `archived`.         |
| `tags`            | [String] | Categorization keywords.         | Lowercase/Trimmed.                               |
| `notes`           | String   | User-provided description.       | Optional.                                        |
| `searchable_text` | String   | Unified search string.           | Indexed; built via pre-save hook.                |
| **`metadata`**    | Object   | JSON blob for tech specs.        | Contains `file_hash`, `content_type`.            |
| **`assignments`** | [Object] | Active connections.              | Tracks `entity_type`, `entity_id`, `notes`.      |
| **`history`**     | [Object] | Audit trail.                     | Tracks `action`, `performed_by`, `performed_at`. |

### 7.1.2 Model Logic & Methods

**Instance Methods:**

- **`assignTo(entityType, entityId, userId, notes)`**:
- Validates if the assignment is fresh.
- Updates the `assignments` and `assignment_history` arrays.
- Switches `library_status` to ‘assigned’.
- **`unassignFrom(entityType, entityId, performedBy, notes)`**:
- Soft-deactivates the specific assignment (sets `active: false`).
- Audits the removal in history.
- Reverts `library_status` to ‘library’ IF no active assignments remain.
- **`reassignTo(newType, newId, userId, notes)`**:
- An atomic operation that deactivates all current assignments and creates a new one.
- **`changeType(newType, userId, notes)`**:
- Updates the logic category (e.g., from `swift` to `contract`) while preserving storage paths.

**Static Methods:**

- **`searchDocuments(text, filters)`**:
- Performs a case-insensitive regex search across `filename`, `searchable_text`, and `tags`.
- Automatically filters out `active: false` documents.
- **`findByAssignment(entityType, entityId)`**:
- Simple wrapper around `$elemMatch` on the assignments array.
- **`findLibraryDocuments(filters)`**:
- Queries documents specifically in `library` or `assigned` status.

**Virtual Fields:**

- **`assignmentCount`**: Returns the count of _currently active_ assignments.
- **`formattedSize`**: Converts raw bytes into human-readable strings (e.g., “4.52 MB”).

### 7.2 Referenced Models

The Document Service queries these models (shared via MongoDB cluster) to validate ownership and context.

- **`Lead`**: Contains `lead_source_no`, `contact_name`, and `team_id`.
- **`Offer`**: Contains the financial details of proposed plans.
- **`Email`**: Links attachments specifically to email notification records.
- **`User`**: Provides the identity of uploaders and performers of assignment actions.

---

## 8. Full API Specification

All routes are mounted under the base path `/api/attachments`.

### 6.1 Public Access Endpoints

### GET `/public/:publicSlug`

- **Description**: Publicly accessible view of a document using a unique slug.
- **Request**: `publicSlug` (string) parameter from the document record.
- **Response**: Streams the file buffer with appropriate `Content-Type`.
- **Edge Cases**:
  - Returns 404 if the document is marked as `active: false`.
  - Returns 404 if the physical file is missing from both Local and S3 storage.

### 6.2 Attachment Retrieval (Authenticated)

### GET `/:id/view`

- **Description**: Inline view of a private attachment.
- **Auth**: Required (`ATTACHMENT_VIEW`).
- **Response**: Streams file or redirects to Cloudinary signed URL.
- **Edge Cases**:
  - **Permission Denied**: Returns 403 if the user is an Agent and the document is not their own or not assigned to a lead under their team.
  - **Cloudinary Delay**: Redirects to the Cloudinary URL; if the URL has expired, the client must re-request.
  - **Disk Failure**: Returns 500 if the local storage is unreachable during streaming.

### GET `/:id/download`

- **Description**: Forces browser download.
- **Response**: Stream with `Content-Disposition: attachment`.
- **Edge Cases**:
  - **Filename Sanitization**: If the original filename contains illegal characters, the service sanitizes them for the response header.
  - **Empty File**: If the file exists but has 0 bytes, some browsers may trigger a warning; the service serves it as-is.

### POST `/bulk-download`

- **Description**: Aggregates up to 100 documents into a single ZIP file.
- **Body**: `{"ids": ["id1", "id2", ...]}`
- **Edge Cases**:
  - **Mixed Permissions**: If the user has access to 5 out of 10 IDs, the ZIP will contain only those 5. The total count and failures are returned in `X-Files-Included` and `X-Files-Failed` headers.
  - **Zero Success**: If no files are accessible, returns 404 instead of an empty ZIP.
  - **Memory Limits**: Extremely large batches (e.g., 100 x 50MB) may time out; clients should batch smaller groups for reliability.

### GET `/:id/info`

- **Description**: Returns JSON metadata for a document without streaming content.
- **Edge Cases**:
  - **Invalid ID**: Returns 404 with “Invalid document ID” message.
  - **Orphaned Record**: Returns success even if the physical file is missing, as this endpoint only queries the database.

### GET `/lead/:leadId`

- **Description**: Gathers ALL documents related to a lead from manual assignments, associated Offers, and Email threads.
- **Edge Cases**:
  - **Lead Not Found**: Returns 404 if the `leadId` doesn’t exist in the Leads collection.
  - **Team Isolation**: Returns an empty list (or 403 depending on user role) if the lead belongs to a different team than the agent.

### 6.3 Deletion & Cleanup

### DELETE `/:id`

- **Description**: Permanent removal of a document.
- **Logic**: Deletes physical file -> Removes from Notifications -> Removes from Team contracts -> Removes from Offers -> Deletes DB Record.
- **Edge Cases**:
  - **Cloud Delete Fails**: If S3/Cloudinary deletion fails, the service logs a critical warning but proceeds with DB deletion to prevent “ghost” records.
  - **Active Assignment**: Service layer may block deletion if the document is currently assigned to an active Lead or Offer (requires `unassign` first).

### DELETE `/bulk`

- **Description**: Deletes up to 50 documents in one batch.
- **Edge Cases**:
  - **Partial Deletion**: Returns a 200 OK with a results array detailing success/failure for each individual ID.

### 6.4 Document Library Management

### POST `/library/upload`

- **Description**: Batch upload to library. Supports `tags`, `notes`, and `type` fields.
- **Limit**: 50MB/file, 200 files/request.
- **Edge Cases**:
  - **Mime Mismatch**: Returns 400 if any file type is not in the allowed list (PDF, DOCX, JPG, etc.).
  - **S3 Bucket Down**: Triggers automatic fallback to Local storage if configured; otherwise returns 500.

### POST `/library/upload/single`

- **Description**: Standard single-file upload for simple library entry.
- **Edge Cases**:
  - **Deduplication**: If a file with the same hash already exists for the same uploader, the service might reference the existing one instead of creating a duplicate (depending on configuration).

### GET `/library`

- **Description**: Main paginated search for the library. Supports filtering by status, tags, and date range.
- **Edge Cases**:
  - **Empty Result Set**: Returns 200 OK with an empty array and total count 0.
  - **Invalid Sort Field**: Defaults to `createdAt` descending if a non-existent field is passed for sorting.

### GET `/search`

- **Description**: Advanced search logic with optimized regex and indexing.
- **Edge Cases**:
  - **Special Characters**: Search text is escaped; however, complex regex symbols may cause unexpected matching if not handled by the client.
  - **Indexing Delay**: Newly uploaded documents might take seconds to appear in search if the `search-service` has a lag in processing the published schema.

### GET `/library/stats`

- **Description**: Statistical overview of storage usage and document counts.
- **Edge Cases**:
  - **Heavy Load**: Can be cached or read from a secondary replica to avoid locking the primary collection.

### GET `/library/unassigned` / `/library/assigned` / `/library/archived`

- **Description**: Specialized filtered views for the library dashboard.
- **Edge Cases**: Standard permission filtering applies (Agents see only their context).

### GET `/library/:id/status`

- **Description**: Internal health check to verify if a document record is “orphaned”.
- **Edge Cases**:
  - **Sync Check**: Reports if a file is present in Local but missing in S3 (out of sync).

### PUT `/library/:id`

- **Description**: Update metadata such as tags or notes.
- **Edge Cases**:
  - **Protected Fields**: Attempting to update `path`, `file_hash`, or `size` via this endpoint is ignored to prevent database corruption.

### DELETE `/library/:id`

- **Description**: Soft-archive (default) or permanent delete (`?permanent=true`).
- **Edge Cases**:
  - **Permanent Delete**: Fails if the document is currently assigned to an entity.

### POST `/library/:id/restore` / `/library/restore/bulk`

- **Description**: Reverses soft-deletion and moves records back to `library` status.
- **Edge Cases**:
  - **Already Active**: Returns success but performs no action if document is already `active: true`.

### 6.5 Cloudinary Integrations

### POST `/cloudinary/upload` / `/cloudinary/upload/multiple`

- **Description**: Directly proxy file uploads to the Cloudinary API.
- **Edge Cases**:
  - **Cloudinary Limit**: Returns 400 if the Cloudinary account quota (bandwidth/storage) is exceeded.
  - **Network Timeout**: Proactive error handling for interruptions between Document Service and Cloudinary CDN.

### POST `/cloudinary/register`

- **Description**: Register a URL already provided by a frontend-direct upload.
- **Edge Cases**:
  - **Invalid URL**: Returns 400 if the provided URL doesn’t match the Cloudinary pattern or is unreachable.

### 6.6 Assignment Logic

### POST `/assign/lead` / `/assign/offer`

- **Body**: `{"document_ids": [...], "target_id": "...", "type": "...", "notes": "..."}`
- **Edge Cases**:
  - **Bulk Mixed Success**: Some documents may be successfully assigned while others fail (e.g., if one was deleted mid-request).
  - **Lead ID vs No**: Supports lookup by both internal ObjectId and the user-facing `lead_source_no`. Returns 404 if no matching lead is found for either.

### DELETE `/unassign/:documentId`

- **Description**: Removes the document link from the specified entity.
- **Edge Cases**:
  - **Entity Not Linked**: Returns 200 OK but does nothing if the document was not previously assigned to that entity.
  - **Reversion**: If this was the last active assignment, the document’s `library_status` automatically reverts to `library`.

---

## 9. Configuration & Setup

### 9.1 Key Environment Variables

- `PORT`: Server port (default 3000).
- `MONGODB_URI`: Connection string for the Document database.
- `CLOUD_STORAGE_ENABLED`: Set to `true` for S3 support.
- `DUAL_STORAGE_MODE`: Set to `true` to write to both backends.
- `PREFERRED_STORAGE`: Determine the primary storage engine (`local`/`cloud`).
- `AWS_S3_BUCKET`: The name of your S3 target bucket.

### 9.2 Installation Commands

1. **Install Dependencies**: `npm install`
2. **Start Development**: `npm run dev`
3. **Start Production**: `npm start`

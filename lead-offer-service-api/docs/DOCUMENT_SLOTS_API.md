# Document Slots API Documentation

This document provides API documentation for managing **document slots** on Offers and **last_email** on Leads. Document slots allow storing multiple document IDs and email IDs per slot (e.g. contract, id_files, swift) for each offer. Last email is a lead-level slot for the most recent email communication.

## Base URL
```
/document-slots
```
(No `/api` prefix. Mount path in app is `/document-slots`.)

## Authentication
All endpoints require authentication. Include the token in the request headers:
```
Authorization: Bearer <your-token>
Content-Type: application/json
```

## Authorization Levels
- **Offer Read** (`OFFER_READ_OWN` or `OFFER_READ_ALL`): GET offer slots
- **Offer Update** (`OFFER_UPDATE_OWN` or `OFFER_UPDATE_ALL`): Add/remove/clear offer slots
- **Lead Read** (`LEAD_READ_OWN` or `LEAD_READ_ALL`): GET lead last_email
- **Lead Update** (`LEAD_UPDATE_OWN` or `LEAD_UPDATE_ALL`): Add/remove/clear lead last_email

---

## Valid Slot Names (Offers)

| Slot Name | Label | Stage | Direction | Description |
|-----------|--------|-------|-----------|-------------|
| `contract` | Contract | opening | incoming | Customer sends signed contract |
| `id_files` | ID Files | opening | incoming | Customer sends ID documents with contract |
| `contract_received_mail` | Contract Received Mail | opening | outgoing | We confirm receipt of contract and ID |
| `bank_confirmation` | Bank Confirmation | confirmation | outgoing | We confirm account opened with depot login |
| `annahme` | Annahme | confirmation | outgoing | We send bank details to customer |
| `swift` | Swift | payment | incoming | Customer sends payment voucher |
| `swift_confirm_mail` | Swift Confirm Mail | payment | outgoing | We confirm receipt of payment voucher |
| `depot_update_mail` | Depot Update Mail | post-payment | outgoing | We confirm amount updated in account |
| `depot_login` | Depot Login | post-payment | outgoing | Depot login credentials |
| `load_mail` | Load Mail | post-payment | outgoing | Follow-up mail with new offers (1–2 weeks later) |

---

## API Endpoints

### 1. Get Slots Metadata

Returns all valid slot names and their metadata (label, stage, direction, description).

**Endpoint:** `GET /document-slots/metadata`

**Access:** Authenticated

**Request Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "valid_slots": [
      "contract",
      "id_files",
      "contract_received_mail",
      "bank_confirmation",
      "annahme",
      "swift",
      "swift_confirm_mail",
      "depot_update_mail",
      "depot_login",
      "load_mail"
    ],
    "metadata": {
      "contract": {
        "label": "Contract",
        "stage": "opening",
        "direction": "incoming",
        "description": "Customer sends signed contract"
      },
      "id_files": {
        "label": "ID Files",
        "stage": "opening",
        "direction": "incoming",
        "description": "Customer sends ID documents with contract"
      }
    }
  }
}
```

---

### 2. Get All Document Slots for an Offer

Returns all document slots for an offer with populated documents and emails.

**Endpoint:** `GET /document-slots/offers/:offerId`

**Access:** Offer Read permission

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `offerId` | string (MongoDB ObjectId) | Yes | Offer ID |

**Request Headers:**
```
Authorization: Bearer <token>
```

**Example Request:**
```
GET /document-slots/offers/507f1f77bcf86cd799439011
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "offer_id": "507f1f77bcf86cd799439011",
    "document_slots": {
      "contract": {
        "documents": [
          {
            "_id": "64abc123def456789",
            "name": "contract.pdf",
            "type": "contract"
          }
        ],
        "emails": [
          {
            "_id": "64email123",
            "subject": "Contract received",
            "lead_id": "507f1f77bcf86cd799439012"
          }
        ],
        "updated_at": "2024-02-01T10:00:00.000Z",
        "updated_by": {
          "_id": "507f1f77bcf86cd799439013",
          "name": "John Doe",
          "login": "john@example.com"
        },
        "metadata": {
          "label": "Contract",
          "stage": "opening",
          "direction": "incoming",
          "description": "Customer sends signed contract"
        }
      },
      "id_files": {},
      "swift": {}
    }
  }
}
```

**Error Responses:**

**404 Not Found - Offer not found:**
```json
{
  "success": false,
  "error": "Offer not found"
}
```

**400 Bad Request - Invalid offer ID:**
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [{ "msg": "Invalid offer ID", "param": "offerId" }]
}
```

---

### 3. Get a Specific Offer Slot

Returns a single document slot for an offer.

**Endpoint:** `GET /document-slots/offers/:offerId/slots/:slotName`

**Access:** Offer Read permission

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `offerId` | string (MongoDB ObjectId) | Yes | Offer ID |
| `slotName` | string | Yes | One of the valid slot names (e.g. `contract`, `swift`) |

**Request Headers:**
```
Authorization: Bearer <token>
```

**Example Request:**
```
GET /document-slots/offers/507f1f77bcf86cd799439011/slots/contract
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "offer_id": "507f1f77bcf86cd799439011",
    "slot_name": "contract",
    "documents": [
      {
        "_id": "64abc123def456789",
        "name": "contract.pdf",
        "type": "contract"
      }
    ],
    "emails": [],
    "updated_at": "2024-02-01T10:00:00.000Z",
    "updated_by": {
      "_id": "507f1f77bcf86cd799439013",
      "name": "John Doe",
      "login": "john@example.com"
    },
    "metadata": {
      "label": "Contract",
      "stage": "opening",
      "direction": "incoming",
      "description": "Customer sends signed contract"
    }
  }
}
```

**Error Responses:**

**400 Bad Request - Invalid slot name:**
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [{ "msg": "Invalid slot name. Valid slots: contract, id_files, ...", "param": "slotName" }]
}
```

---

### 4. Add Document to Offer Slot

Adds a single document to an offer slot.

**Endpoint:** `POST /document-slots/offers/:offerId/slots/:slotName/documents`

**Access:** Offer Update permission

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `offerId` | string (MongoDB ObjectId) | Yes | Offer ID |
| `slotName` | string | Yes | Valid slot name |

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `document_id` | string (MongoDB ObjectId) | Yes | Document ID to add |

**Example Request:**
```
POST /document-slots/offers/507f1f77bcf86cd799439011/slots/contract/documents
```
```json
{
  "document_id": "64abc123def456789012345"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Document added to contract slot",
  "data": {
    "offer_id": "507f1f77bcf86cd799439011",
    "slot_name": "contract",
    "documents": [
      {
        "_id": "64abc123def456789012345",
        "name": "contract.pdf",
        "type": "contract"
      }
    ],
    "emails": [],
    "updated_at": "2024-02-01T10:00:00.000Z",
    "updated_by": { "_id": "...", "name": "John Doe", "login": "john@example.com" },
    "metadata": { "label": "Contract", "stage": "opening", "direction": "incoming", "description": "Customer sends signed contract" }
  }
}
```

**Error Responses:**

**400 - Document already in slot:**
```json
{
  "success": false,
  "error": "Document already exists in this slot"
}
```

**404 - Document or Offer not found:**
```json
{
  "success": false,
  "error": "Document not found"
}
```
```json
{
  "success": false,
  "error": "Offer not found"
}
```

---

### 5. Remove Document from Offer Slot

Removes a document from an offer slot.

**Endpoint:** `DELETE /document-slots/offers/:offerId/slots/:slotName/documents/:documentId`

**Access:** Offer Update permission

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `offerId` | string (MongoDB ObjectId) | Yes | Offer ID |
| `slotName` | string | Yes | Valid slot name |
| `documentId` | string (MongoDB ObjectId) | Yes | Document ID to remove |

**Request Headers:**
```
Authorization: Bearer <token>
```

**Example Request:**
```
DELETE /document-slots/offers/507f1f77bcf86cd799439011/slots/contract/documents/64abc123def456789012345
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Document removed from contract slot",
  "data": {
    "offer_id": "507f1f77bcf86cd799439011",
    "slot_name": "contract",
    "documents": [],
    "emails": [],
    "updated_at": "2024-02-01T10:05:00.000Z",
    "updated_by": { "_id": "...", "name": "John Doe", "login": "john@example.com" },
    "metadata": { "label": "Contract", "stage": "opening", "direction": "incoming", "description": "Customer sends signed contract" }
  }
}
```

**Error Responses:**

**400/404:**
```json
{ "success": false, "error": "Document not found in this slot" }
```
```json
{ "success": false, "error": "Slot is empty" }
```

---

### 6. Add Email to Offer Slot

Adds a single email to an offer slot.

**Endpoint:** `POST /document-slots/offers/:offerId/slots/:slotName/emails`

**Access:** Offer Update permission

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `offerId` | string (MongoDB ObjectId) | Yes | Offer ID |
| `slotName` | string | Yes | Valid slot name |

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email_id` | string (MongoDB ObjectId) | Yes | Email ID to add |

**Example Request:**
```
POST /document-slots/offers/507f1f77bcf86cd799439011/slots/contract_received_mail/emails
```
```json
{
  "email_id": "64email123def456789012345"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Email added to contract_received_mail slot",
  "data": {
    "offer_id": "507f1f77bcf86cd799439011",
    "slot_name": "contract_received_mail",
    "documents": [],
    "emails": [
      { "_id": "64email123def456789012345", "subject": "Contract received", "lead_id": "..." }
    ],
    "updated_at": "2024-02-01T10:00:00.000Z",
    "updated_by": { "_id": "...", "name": "John Doe", "login": "john@example.com" },
    "metadata": { "label": "Contract Received Mail", "stage": "opening", "direction": "outgoing", "description": "We confirm receipt of contract and ID" }
  }
}
```

**Error Responses:**

**400 - Email already in slot:**
```json
{
  "success": false,
  "error": "Email already exists in this slot"
}
```

---

### 7. Remove Email from Offer Slot

Removes an email from an offer slot.

**Endpoint:** `DELETE /document-slots/offers/:offerId/slots/:slotName/emails/:emailId`

**Access:** Offer Update permission

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `offerId` | string (MongoDB ObjectId) | Yes | Offer ID |
| `slotName` | string | Yes | Valid slot name |
| `emailId` | string (MongoDB ObjectId) | Yes | Email ID to remove |

**Request Headers:**
```
Authorization: Bearer <token>
```

**Example Request:**
```
DELETE /document-slots/offers/507f1f77bcf86cd799439011/slots/contract_received_mail/emails/64email123def456789012345
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Email removed from contract_received_mail slot",
  "data": {
    "offer_id": "507f1f77bcf86cd799439011",
    "slot_name": "contract_received_mail",
    "documents": [],
    "emails": [],
    "updated_at": "2024-02-01T10:05:00.000Z",
    "updated_by": { "_id": "...", "name": "John Doe", "login": "john@example.com" },
    "metadata": { "label": "Contract Received Mail", "stage": "opening", "direction": "outgoing", "description": "We confirm receipt of contract and ID" }
  }
}
```

**Error Responses:**
```json
{ "success": false, "error": "Email not found in this slot" }
```
```json
{ "success": false, "error": "Slot has no emails" }
```

---

### 8. Bulk Add Documents and Emails to Offer Slot

Adds multiple documents and/or emails to an offer slot in one request. Duplicates are skipped.

**Endpoint:** `POST /document-slots/offers/:offerId/slots/:slotName/bulk`

**Access:** Offer Update permission

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `offerId` | string (MongoDB ObjectId) | Yes | Offer ID |
| `slotName` | string | Yes | Valid slot name |

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `document_ids` | string[] | No | Array of document IDs (MongoDB ObjectIds). Optional; default `[]`. |
| `email_ids` | string[] | No | Array of email IDs (MongoDB ObjectIds). Optional; default `[]`. |

At least one of `document_ids` or `email_ids` may be provided; both are optional.

**Example Request:**
```
POST /document-slots/offers/507f1f77bcf86cd799439011/slots/swift/bulk
```
```json
{
  "document_ids": ["64doc1abc123", "64doc2def456"],
  "email_ids": ["64email1abc123"]
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Bulk added items to swift slot",
  "data": {
    "offer_id": "507f1f77bcf86cd799439011",
    "slot_name": "swift",
    "documents": [
      { "_id": "64doc1abc123", "name": "voucher1.pdf", "type": "payment_voucher" },
      { "_id": "64doc2def456", "name": "voucher2.pdf", "type": "payment_voucher" }
    ],
    "emails": [
      { "_id": "64email1abc123", "subject": "Payment voucher", "lead_id": "..." }
    ],
    "updated_at": "2024-02-01T10:00:00.000Z",
    "updated_by": { "_id": "...", "name": "John Doe", "login": "john@example.com" },
    "metadata": { "label": "Swift", "stage": "payment", "direction": "incoming", "description": "Customer sends payment voucher" }
  }
}
```

**Error Responses:**

**400 - Validation (e.g. invalid ID in array):**
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [{ "msg": "Each document_id must be a valid MongoDB ID", "param": "document_ids[0]" }]
}
```

---

### 9. Clear Offer Slot

Removes all documents and emails from an offer slot.

**Endpoint:** `DELETE /document-slots/offers/:offerId/slots/:slotName`

**Access:** Offer Update permission

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `offerId` | string (MongoDB ObjectId) | Yes | Offer ID |
| `slotName` | string | Yes | Valid slot name |

**Request Headers:**
```
Authorization: Bearer <token>
```

**Example Request:**
```
DELETE /document-slots/offers/507f1f77bcf86cd799439011/slots/contract
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Cleared contract slot",
  "data": {
    "offer_id": "507f1f77bcf86cd799439011",
    "slot_name": "contract",
    "documents": [],
    "emails": [],
    "updated_at": "2024-02-01T10:10:00.000Z",
    "updated_by": { "_id": "...", "name": "John Doe", "login": "john@example.com" },
    "metadata": { "label": "Contract", "stage": "opening", "direction": "incoming", "description": "Customer sends signed contract" }
  }
}
```

---

## Lead Last Email Endpoints

Last email is a lead-level slot for the most recent email communication. It has the same structure (documents, emails, updated_at, updated_by) but is stored on the Lead model.

---

### 10. Get Lead Last Email

Returns last_email for a lead. If no emails are pinned in last_email, the API returns the latest email(s) for that lead from the Email collection.

**Endpoint:** `GET /document-slots/leads/:leadId/last-email`

**Access:** Lead Read permission

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `leadId` | string (MongoDB ObjectId) | Yes | Lead ID |

**Request Headers:**
```
Authorization: Bearer <token>
```

**Example Request:**
```
GET /document-slots/leads/507f1f77bcf86cd799439012/last-email
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "lead_id": "507f1f77bcf86cd799439012",
    "documents": [
      { "_id": "64doc123", "name": "attachment.pdf", "type": "extra" }
    ],
    "emails": [
      { "_id": "64email123", "subject": "Re: Your offer", "lead_id": "507f1f77bcf86cd799439012", "received_at": "2024-02-01T09:00:00.000Z" }
    ],
    "updated_at": "2024-02-01T10:00:00.000Z",
    "updated_by": { "_id": "...", "name": "John Doe", "login": "john@example.com" },
    "metadata": {
      "label": "Last Email",
      "stage": "lead",
      "direction": "any",
      "description": "Most recent email communication with lead"
    }
  }
}
```

**Error Responses:**
```json
{ "success": false, "error": "Lead not found" }
```

---

### 11. Add Document to Lead Last Email

Adds a document to the lead's last_email slot.

**Endpoint:** `POST /document-slots/leads/:leadId/last-email/documents`

**Access:** Lead Update permission

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `leadId` | string (MongoDB ObjectId) | Yes | Lead ID |

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `document_id` | string (MongoDB ObjectId) | Yes | Document ID to add |

**Example Request:**
```
POST /document-slots/leads/507f1f77bcf86cd799439012/last-email/documents
```
```json
{
  "document_id": "64abc123def456789012345"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Document added to last_email",
  "data": {
    "lead_id": "507f1f77bcf86cd799439012",
    "documents": [
      { "_id": "64abc123def456789012345", "name": "attachment.pdf", "type": "extra" }
    ],
    "emails": [],
    "updated_at": "2024-02-01T10:00:00.000Z",
    "updated_by": { "_id": "...", "name": "John Doe", "login": "john@example.com" },
    "metadata": { "label": "Last Email", "stage": "lead", "direction": "any", "description": "Most recent email communication with lead" }
  }
}
```

**Error Responses:**
```json
{ "success": false, "error": "Document already exists in last_email" }
```
```json
{ "success": false, "error": "Document not found" }
```
```json
{ "success": false, "error": "Lead not found" }
```

---

### 12. Remove Document from Lead Last Email

Removes a document from the lead's last_email slot.

**Endpoint:** `DELETE /document-slots/leads/:leadId/last-email/documents/:documentId`

**Access:** Lead Update permission

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `leadId` | string (MongoDB ObjectId) | Yes | Lead ID |
| `documentId` | string (MongoDB ObjectId) | Yes | Document ID to remove |

**Request Headers:**
```
Authorization: Bearer <token>
```

**Example Request:**
```
DELETE /document-slots/leads/507f1f77bcf86cd799439012/last-email/documents/64abc123def456789012345
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Document removed from last_email",
  "data": {
    "lead_id": "507f1f77bcf86cd799439012",
    "documents": [],
    "emails": [],
    "updated_at": "2024-02-01T10:05:00.000Z",
    "updated_by": { "_id": "...", "name": "John Doe", "login": "john@example.com" },
    "metadata": { "label": "Last Email", "stage": "lead", "direction": "any", "description": "Most recent email communication with lead" }
  }
}
```

**Error Responses:**
```json
{ "success": false, "error": "No documents in last_email" }
```
```json
{ "success": false, "error": "Document not found in last_email" }
```

---

### 13. Add Email to Lead Last Email

Adds an email to the lead's last_email slot.

**Endpoint:** `POST /document-slots/leads/:leadId/last-email/emails`

**Access:** Lead Update permission

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `leadId` | string (MongoDB ObjectId) | Yes | Lead ID |

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email_id` | string (MongoDB ObjectId) | Yes | Email ID to add |

**Example Request:**
```
POST /document-slots/leads/507f1f77bcf86cd799439012/last-email/emails
```
```json
{
  "email_id": "64email123def456789012345"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Email added to last_email",
  "data": {
    "lead_id": "507f1f77bcf86cd799439012",
    "documents": [],
    "emails": [
      { "_id": "64email123def456789012345", "subject": "Re: Offer", "lead_id": "507f1f77bcf86cd799439012" }
    ],
    "updated_at": "2024-02-01T10:00:00.000Z",
    "updated_by": { "_id": "...", "name": "John Doe", "login": "john@example.com" },
    "metadata": { "label": "Last Email", "stage": "lead", "direction": "any", "description": "Most recent email communication with lead" }
  }
}
```

**Error Responses:**
```json
{ "success": false, "error": "Email already exists in last_email" }
```

---

### 14. Remove Email from Lead Last Email

Removes an email from the lead's last_email slot.

**Endpoint:** `DELETE /document-slots/leads/:leadId/last-email/emails/:emailId`

**Access:** Lead Update permission

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `leadId` | string (MongoDB ObjectId) | Yes | Lead ID |
| `emailId` | string (MongoDB ObjectId) | Yes | Email ID to remove |

**Request Headers:**
```
Authorization: Bearer <token>
```

**Example Request:**
```
DELETE /document-slots/leads/507f1f77bcf86cd799439012/last-email/emails/64email123def456789012345
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Email removed from last_email",
  "data": {
    "lead_id": "507f1f77bcf86cd799439012",
    "documents": [],
    "emails": [],
    "updated_at": "2024-02-01T10:05:00.000Z",
    "updated_by": { "_id": "...", "name": "John Doe", "login": "john@example.com" },
    "metadata": { "label": "Last Email", "stage": "lead", "direction": "any", "description": "Most recent email communication with lead" }
  }
}
```

**Error Responses:**
```json
{ "success": false, "error": "No emails in last_email" }
```
```json
{ "success": false, "error": "Email not found in last_email" }
```

---

### 15. Clear Lead Last Email

Clears all documents and emails from the lead's last_email slot.

**Endpoint:** `DELETE /document-slots/leads/:leadId/last-email`

**Access:** Lead Update permission

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `leadId` | string (MongoDB ObjectId) | Yes | Lead ID |

**Request Headers:**
```
Authorization: Bearer <token>
```

**Example Request:**
```
DELETE /document-slots/leads/507f1f77bcf86cd799439012/last-email
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Cleared last_email",
  "data": {
    "lead_id": "507f1f77bcf86cd799439012",
    "documents": [],
    "emails": [],
    "updated_at": "2024-02-01T10:10:00.000Z",
    "updated_by": { "_id": "...", "name": "John Doe", "login": "john@example.com" },
    "metadata": { "label": "Last Email", "stage": "lead", "direction": "any", "description": "Most recent email communication with lead" }
  }
}
```

**Error Responses:**
```json
{ "success": false, "error": "Lead not found" }
```

---

## Summary Table

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/metadata` | Get valid slot names and metadata |
| GET | `/offers/:offerId` | Get all document slots for an offer |
| GET | `/offers/:offerId/slots/:slotName` | Get one offer slot |
| POST | `/offers/:offerId/slots/:slotName/documents` | Add document to offer slot |
| DELETE | `/offers/:offerId/slots/:slotName/documents/:documentId` | Remove document from offer slot |
| POST | `/offers/:offerId/slots/:slotName/emails` | Add email to offer slot |
| DELETE | `/offers/:offerId/slots/:slotName/emails/:emailId` | Remove email from offer slot |
| POST | `/offers/:offerId/slots/:slotName/bulk` | Bulk add documents/emails to offer slot |
| DELETE | `/offers/:offerId/slots/:slotName` | Clear offer slot |
| GET | `/leads/:leadId/last-email` | Get lead last_email |
| POST | `/leads/:leadId/last-email/documents` | Add document to last_email |
| DELETE | `/leads/:leadId/last-email/documents/:documentId` | Remove document from last_email |
| POST | `/leads/:leadId/last-email/emails` | Add email to last_email |
| DELETE | `/leads/:leadId/last-email/emails/:emailId` | Remove email from last_email |
| DELETE | `/leads/:leadId/last-email` | Clear last_email |

---

## cURL Examples

**Get slots metadata:**
```bash
curl -X GET "https://your-api-host/document-slots/metadata" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Add document to contract slot:**
```bash
curl -X POST "https://your-api-host/document-slots/offers/507f1f77bcf86cd799439011/slots/contract/documents" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"document_id": "64abc123def456789012345"}'
```

**Bulk add to swift slot:**
```bash
curl -X POST "https://your-api-host/document-slots/offers/507f1f77bcf86cd799439011/slots/swift/bulk" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"document_ids": ["64doc1", "64doc2"], "email_ids": ["64email1"]}'
```

**Get lead last email:**
```bash
curl -X GET "https://your-api-host/document-slots/leads/507f1f77bcf86cd799439012/last-email" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Common Error Responses

**401 Unauthorized (missing or invalid token):**
```json
{
  "success": false,
  "error": "Authentication required"
}
```

**403 Forbidden (insufficient permission):**
```json
{
  "success": false,
  "error": "Access denied"
}
```

**400 Bad Request (validation - invalid MongoDB ID):**
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [
    { "msg": "Invalid offer ID", "param": "offerId", "location": "params" }
  ]
}
```

All IDs in path and body must be valid 24-character hex MongoDB ObjectIds.

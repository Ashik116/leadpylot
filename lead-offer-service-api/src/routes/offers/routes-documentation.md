# Offers Routes Documentation

This document provides detailed information about all the offers API endpoints.

## Table of Contents
- [Get All Offers](#get-all-offers)
- [Get Offers With Progress](#get-offers-with-progress)
- [Get Offer By ID](#get-offer-by-id)
- [Download Offer PDF](#download-offer-pdf)
- [Create Offer](#create-offer)
- [Update Offer](#update-offer)
- [Delete Offers](#delete-offers)
- [Document Management](#document-management)
- [Get Offers By Lead](#get-offers-by-lead)
- [Get Offers By Project](#get-offers-by-project)
- [Netto System Integration](#netto-system-integration)
- [Revert Operations](#revert-operations)

---

## Get All Offers

**GET** `/offers`

Get all offers with pagination, filtering, and sorting capabilities.

### Query Parameters

All query parameters work independently and can be combined:

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `page` | integer | Page number | 1 |
| `limit` | integer | Items per page (max: 100) | 20 |
| `search` | string | Search across offer title, lead contact name, project name, lead email, lead phone, lead source number (partner ID), and bank name (case-insensitive) | - |
| `status` | string | Filter by offer status: `pending`, `sent` | - |
| `project_id` | MongoID | Filter by specific project ID | - |
| `lead_id` | MongoID | Filter by specific lead ID | - |
| `agent_id` | MongoID | Filter by specific agent ID (admin only) | - |
| `stage` | string | Filter by current stage: `opening`, `confirmation`, `payment` | - |
| `has_progress` | string | Filter by progress type: `opening`, `confirmation`, `payment`, `netto1`, `netto2`, `netto`, `any`, `lost` | - |
| `sortBy` | string | Sort field (see available fields below) | `updatedAt` |
| `sortOrder` | string | Sort direction: `asc`, `desc` | `desc` |

### Available Sort Fields

- `title` - Offer title
- `investment_volume` - Investment amount
- `interest_rate` - Interest rate
- `status` - Offer status
- `createdAt` / `created_at` - Creation date
- `updatedAt` / `updated_at` - Last update date
- `leadName` / `contactName` - Lead contact name (populated)
- `partnerId` - Partner/source ID (populated)
- `agent` - Agent name (populated)
- `interestMonth` - Number of months (populated from payment_terms)
- `bankName` - Bank name (populated)
- `projectName` - Project name (populated)
- `bonusAmount` - Bonus amount (populated)

**Note:** `contactName` is an alias for `leadName` (both sort by lead_id.contact_name)

### Examples

```
GET /offers?search=john&status=sent&page=2
GET /offers?project_id=123&agent_id=456
GET /offers?search=contract&limit=50
GET /offers?search=john@example.com&limit=50
GET /offers?search=+1234567890&limit=50
GET /offers?search=1719173&limit=50
GET /offers?search=bankname&limit=50
GET /offers?stage=confirmation
GET /offers?has_progress=netto1
GET /offers?sortBy=leadName&sortOrder=asc
GET /offers?sortBy=investment_volume&sortOrder=desc
GET /offers?sortBy=partnerId&sortOrder=asc
GET /offers?sortBy=interestMonth&sortOrder=asc
```

---

## Get Offers With Progress

**GET** `/offers/progress`

Get offers that have progress (openings, confirmations, or payment vouchers).

### Query Parameters

Same as [Get All Offers](#get-all-offers)

### Examples

```
GET /offers/progress?search=john&stage=confirmation&page=2
GET /offers/progress?search=john@example.com&stage=confirmation&page=2
GET /offers/progress?search=1719173&stage=confirmation&page=2
GET /offers/progress?search=bankname&has_progress=payment
GET /offers/progress?has_progress=payment
GET /offers/progress?has_progress=netto1
GET /offers/progress?has_progress=netto2
GET /offers/progress?has_progress=netto
GET /offers/progress?has_progress=any
GET /offers/progress?sortBy=leadName&sortOrder=asc
GET /offers/progress?sortBy=investment_volume&sortOrder=desc
```

---

## Get Offer By ID

**GET** `/offers/:id`

Get a specific offer by ID with optional PDF generation.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | MongoID | Offer ID |

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `generatePdf` | boolean | Generate PDF for the offer |
| `returnPdf` | boolean | Return PDF directly in response |
| `templateId` | MongoID | Template ID for PDF generation |
| `templatePath` | string | Custom template path |
| `mappingPath` | string | Custom mapping path |

---

## Download Offer PDF

**GET** `/offers/:id/pdf`

Download the PDF file for a specific offer.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | MongoID | Offer ID |

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `templateId` | MongoID | Template ID for PDF generation |

---

## Create Offer

**POST** `/offers`

Create a new offer with optional file uploads and PDF generation.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project_id` | MongoID | Yes | Project ID |
| `lead_id` | MongoID | Yes | Lead ID |
| `agent_id` | MongoID | No | Agent ID |
| `bank_id` | MongoID | No | Bank ID |
| `investment_volume` | number | Yes | Investment amount |
| `nametitle` | string | No | Name title |
| `offer_type` | string | No | Offer type: `Tagesgeld`, `Festgeld`, `ETF` |
| `interest_rate` | number | Yes | Interest rate |
| `payment_terms` | MongoID | Yes | Payment terms ID |
| `bonus_amount` | MongoID | Yes | Bonus amount ID |
| `flex_option` | boolean | No | Flex option |
| `status` | string | No | Offer status: `pending`, `sent` |

### File Uploads

- **Field Name:** `files`
- **Max Files:** 10
- **Max Size:** 10MB per file
- **Allowed Types:** JPEG, PNG, WebP, PDF, Plain Text

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `returnPdf` | boolean | Return generated PDF in response |
| `templateId` | MongoID | Template ID for PDF generation |
| `templatePath` | string | Custom template path |
| `mappingPath` | string | Custom mapping path |

---

## Update Offer

**PUT** `/offers/:id`

Update an existing offer with optional PDF regeneration.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | MongoID | Offer ID |

### Request Body

Same fields as [Create Offer](#create-offer) but all are optional.

### File Uploads

Same as [Create Offer](#create-offer)

### Query Parameters

Same as [Create Offer](#create-offer)

---

## Delete Offers

### Delete Single Offer

**DELETE** `/offers/:id`

Delete a specific offer by ID.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | MongoID | Offer ID |

### Bulk Delete Offers

**DELETE** `/offers`

Delete multiple offers at once.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ids` | array | Yes | Array of offer IDs (MongoID) |

---

## Document Management

### Remove Document from Offer

**DELETE** `/offers/:offerId/documents/:documentId`

Remove a specific document from an offer.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `offerId` | MongoID | Offer ID |
| `documentId` | MongoID | Document ID |

### Add Documents to Offer

**POST** `/offers/:offerId/documents`

Upload and attach documents to an offer with specific document types.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `offerId` | MongoID | Offer ID |

#### Request Body (multipart/form-data)

| Field | Type | Description |
|-------|------|-------------|
| `files` | files | Array of files (max 10) |
| `documentTypes` | array | Array of document types corresponding to each file |

#### Supported Document Types

**Offer Documents:**
- `offer-contract` - Contract documents for offers
- `offer-extra` - Additional documents for offers
- `offer-email` - Email documents for offers

**Opening Documents:**
- `opening-contract` - Contract documents for openings
- `opening-id` - ID documents for openings
- `opening-extra` - Additional documents for openings
- `opening-email` - Email documents for openings
- `opening-mail` - Mail documents for openings

**Confirmation Documents:**
- `confirmation-contract` - Contract documents for confirmations
- `confirmation-extra` - Additional documents for confirmations
- `confirmation-email` - Email documents for confirmations
- `confirmation-mail` - Mail documents for confirmations

**Payment Documents:**
- `payment-contract` - Contract documents for payments
- `payment-extra` - Additional documents for payments
- `payment-email` - Email documents for payments
- `payment-mail` - Mail documents for payments

**Netto Documents:**
- `netto1-mail` - Mail documents for Netto1 stage
- `netto2-mail` - Mail documents for Netto2 stage

#### Example

```
POST /offers/:offerId/documents
Content-Type: multipart/form-data

files: [file1.pdf, file2.jpg, file3.eml]
documentTypes: ["offer-contract", "confirmation-email", "payment-mail"]
```

---

## Get Offers By Lead

**GET** `/offers/lead/:leadId`

Get all offers for a specific lead.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `leadId` | MongoID | Lead ID |

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `sortBy` | string | Sort field (see available fields in [Get All Offers](#available-sort-fields)) |
| `sortOrder` | string | Sort direction: `asc`, `desc` |

---

## Get Offers By Project

**GET** `/offers/project/:projectId`

Get all offers for a specific project.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | MongoID | Project ID |

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `sortBy` | string | Sort field (see available fields in [Get All Offers](#available-sort-fields)) |
| `sortOrder` | string | Sort direction: `asc`, `desc` |

---

## Netto System Integration

### Send to Netto1

**POST** `/offers/:offerId/netto1`

Send an offer to the Netto1 system.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `offerId` | MongoID | Offer ID |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bankerRate` | float | No | Banker rate (0-100) |
| `agentRate` | float | No | Agent rate (0-100) |

### Send to Netto2

**POST** `/offers/:offerId/netto2`

Send an offer to the Netto2 system.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `offerId` | MongoID | Offer ID |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bankerRate` | float | No | Banker rate (0-100) |
| `agentRate` | float | No | Agent rate (0-100) |

---

## Revert Operations

### Get Revert Options

**GET** `/offers/:offerId/revert-options`

Get available revert options for an offer.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `offerId` | MongoID | Offer ID |

### Revert Stage

**POST** `/offers/:offerId/revert/:stage`

Revert a specific stage for an offer.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `offerId` | MongoID | Offer ID |
| `stage` | string | Stage to revert: `opening`, `confirmation`, `payment`, `netto1`, `netto2`, `lost` |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | No | Reason for reverting |

### Revert Batch

**POST** `/offers/:offerId/revert-batch`

Revert multiple stages for an offer in one operation.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `offerId` | MongoID | Offer ID |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `stages` | array | Yes | Array of stages to revert: `opening`, `confirmation`, `payment`, `netto1`, `netto2`, `lost` |
| `reason` | string | No | Reason for reverting |

---

## Notes

### PDF Generation

PDF functionality is integrated into the main CRUD operations:
- **POST /** - Creates an offer and generates a PDF (use `?returnPdf=true` to get the PDF directly)
- **GET /:id** - Gets an offer with PDF info (use `?returnPdf=true` to get the PDF)
- **GET /:id/pdf** - Downloads the PDF file directly

### Authentication

All routes require authentication using the `authenticate` middleware.

### File Uploads

File uploads use multer with the following configuration:
- **Storage:** Centralized temp uploads directory
- **File naming:** Timestamp prefix to avoid collisions
- **Allowed types:** JPEG, PNG, WebP, PDF, Plain Text
- **Max size:** 10MB per file
- **Max files:** 10 files per request


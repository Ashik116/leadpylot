# Document Slots API – Postman (Microservices)

Use **one** of these base URLs depending on how you call the API.

| Scenario | Base URL | When to use |
|----------|----------|--------------|
| **Via API Gateway** | `http://localhost:4050` | Frontend / Postman through gateway (tenant auth). |
| **Direct – Lead-Offer Service** | `http://localhost:4003` | Testing lead-offer-service alone (e.g. local dev). |

**Auth:** All endpoints require authentication (e.g. `Authorization: Bearer <token>`).  
If using the gateway, use tenant auth as configured (e.g. `X-Tenant-API-Key` + user token).

---

## APIs following the document flow

Use this order when testing or building the UI. Replace `{{baseUrl}}` with `http://localhost:4003` (direct) or `http://localhost:4050` (gateway). Replace `:offerId`, `:leadId`, and IDs with real MongoDB ObjectIds.

### Setup

| Step | Method | Endpoint | Description | Body |
|------|--------|----------|-------------|------|
| 0 | GET | `{{baseUrl}}/document-slots/metadata` | Get valid slot names | — |
| 0 | GET | `{{baseUrl}}/document-slots/offers/:offerId` | Get all slots for an offer (read state) | — |

---

### Stage: OPENING (Contract)

Customer sends signed contract + IDs; we confirm receipt.

| Step | Slot | Method | Endpoint | Description | Body |
|------|------|--------|----------|-------------|------|
| 1 | **contract** | POST | `{{baseUrl}}/document-slots/offers/:offerId/slots/contract/documents` | Add signed contract (customer sent) | `{ "document_id": "<MongoId>" }` |
| 2 | **id_files** | POST | `{{baseUrl}}/document-slots/offers/:offerId/slots/id_files/documents` | Add ID documents (sent with contract) | `{ "document_id": "<MongoId>" }` |
| 2b | **id_files** | POST | `{{baseUrl}}/document-slots/offers/:offerId/slots/id_files/bulk` | Add multiple IDs at once | `{ "document_ids": ["id1","id2"], "email_ids": [] }` |
| 3 | **contract_received_mail** | POST | `{{baseUrl}}/document-slots/offers/:offerId/slots/contract_received_mail/documents` | Add “contract received” document | `{ "document_id": "<MongoId>" }` |
| 3b | **contract_received_mail** | POST | `{{baseUrl}}/document-slots/offers/:offerId/slots/contract_received_mail/emails` | Add “contract received” email we sent | `{ "email_id": "<MongoId>" }` |

*After contract received mail → stage moves to CONFIRMATION.*

---

### Stage: CONFIRMATION

We send bank confirmation + depot login; we send bank details (Annahme).

| Step | Slot | Method | Endpoint | Description | Body |
|------|------|--------|----------|-------------|------|
| 4 | **bank_confirmation** | POST | `{{baseUrl}}/document-slots/offers/:offerId/slots/bank_confirmation/documents` | Add “account opened” confirmation doc | `{ "document_id": "<MongoId>" }` |
| 4b | **bank_confirmation** | POST | `{{baseUrl}}/document-slots/offers/:offerId/slots/bank_confirmation/emails` | Add “account opened” email we sent | `{ "email_id": "<MongoId>" }` |
| 5 | **depot_login** | POST | `{{baseUrl}}/document-slots/offers/:offerId/slots/depot_login/documents` | Add depot login (e.g. credentials doc) | `{ "document_id": "<MongoId>" }` |
| 5b | **depot_login** | POST | `{{baseUrl}}/document-slots/offers/:offerId/slots/depot_login/emails` | Add depot login email | `{ "email_id": "<MongoId>" }` |
| 6 | **annahme** | POST | `{{baseUrl}}/document-slots/offers/:offerId/slots/annahme/documents` | Add bank details document we sent | `{ "document_id": "<MongoId>" }` |
| 6b | **annahme** | POST | `{{baseUrl}}/document-slots/offers/:offerId/slots/annahme/emails` | Add bank details email we sent | `{ "email_id": "<MongoId>" }` |

---

### Stage: PAYMENT VOUCHER

Customer sends SWIFT/payment voucher; we confirm receipt.

| Step | Slot | Method | Endpoint | Description | Body |
|------|------|--------|----------|-------------|------|
| 7 | **swift** | POST | `{{baseUrl}}/document-slots/offers/:offerId/slots/swift/documents` | Add payment voucher (customer sent) | `{ "document_id": "<MongoId>" }` |
| 7b | **swift** | POST | `{{baseUrl}}/document-slots/offers/:offerId/slots/swift/bulk` | Add multiple swift docs/emails | `{ "document_ids": ["id1"], "email_ids": ["id1"] }` |
| 8 | **swift_confirm_mail** | POST | `{{baseUrl}}/document-slots/offers/:offerId/slots/swift_confirm_mail/documents` | Add “payment received” doc we sent | `{ "document_id": "<MongoId>" }` |
| 8b | **swift_confirm_mail** | POST | `{{baseUrl}}/document-slots/offers/:offerId/slots/swift_confirm_mail/emails` | Add “payment received” email we sent | `{ "email_id": "<MongoId>" }` |

*After swift confirm mail → stage moves to PAYMENT.*

---

### Post-payment

Amount updated; later we send load mail (new product/offer).

| Step | Slot | Method | Endpoint | Description | Body |
|------|------|--------|----------|-------------|------|
| 9 | **depot_update_mail** | POST | `{{baseUrl}}/document-slots/offers/:offerId/slots/depot_update_mail/documents` | Add “amount updated” doc we sent | `{ "document_id": "<MongoId>" }` |
| 9b | **depot_update_mail** | POST | `{{baseUrl}}/document-slots/offers/:offerId/slots/depot_update_mail/emails` | Add “amount updated” email we sent | `{ "email_id": "<MongoId>" }` |
| 10 | **load_mail** | POST | `{{baseUrl}}/document-slots/offers/:offerId/slots/load_mail/documents` | Add follow-up offer doc (1–2 weeks later) | `{ "document_id": "<MongoId>" }` |
| 10b | **load_mail** | POST | `{{baseUrl}}/document-slots/offers/:offerId/slots/load_mail/emails` | Add follow-up offer email | `{ "email_id": "<MongoId>" }` |

---

### Lead level (independent of offer)

Last email is per **lead**, not per offer.

| Step | Method | Endpoint | Description | Body |
|------|--------|----------|-------------|------|
| 11 | GET | `{{baseUrl}}/document-slots/leads/:leadId/last-email` | Get last email for lead | — |
| 12 | POST | `{{baseUrl}}/document-slots/leads/:leadId/last-email/documents` | Add document to last email | `{ "document_id": "<MongoId>" }` |
| 13 | POST | `{{baseUrl}}/document-slots/leads/:leadId/last-email/emails` | Add email to last email | `{ "email_id": "<MongoId>" }` |

---

### Read / remove (any stage)

Use these to read or remove items in any slot.

| Action | Method | Endpoint | Body |
|--------|--------|----------|------|
| Get one slot | GET | `{{baseUrl}}/document-slots/offers/:offerId/slots/:slotName` | — |
| Remove document from slot | DELETE | `{{baseUrl}}/document-slots/offers/:offerId/slots/:slotName/documents/:documentId` | — |
| Remove email from slot | DELETE | `{{baseUrl}}/document-slots/offers/:offerId/slots/:slotName/emails/:emailId` | — |
| Clear entire slot | DELETE | `{{baseUrl}}/document-slots/offers/:offerId/slots/:slotName` | — |
| Clear lead last email | DELETE | `{{baseUrl}}/document-slots/leads/:leadId/last-email` | — |

---

## 1. Metadata

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `{{baseUrl}}/document-slots/metadata` | Get valid slot names and metadata |

**Example (Gateway):** `GET http://localhost:4050/document-slots/metadata`  
**Example (Direct):** `GET http://localhost:4003/document-slots/metadata`

---

## 2. Offer document slots

Replace `:offerId` with a MongoDB ObjectId (e.g. `674a1b2c3d4e5f6789abcdef`).  
Replace `:slotName` with one of: `contract`, `id_files`, `contract_received_mail`, `bank_confirmation`, `annahme`, `swift`, `swift_confirm_mail`, `depot_update_mail`, `depot_login`, `load_mail`.

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| GET | `{{baseUrl}}/document-slots/offers/:offerId` | Get all document slots for an offer | — |
| GET | `{{baseUrl}}/document-slots/offers/:offerId/slots/:slotName` | Get one slot | — |
| POST | `{{baseUrl}}/document-slots/offers/:offerId/slots/:slotName/documents` | Add document to slot | `{ "document_id": "<MongoId>" }` |
| DELETE | `{{baseUrl}}/document-slots/offers/:offerId/slots/:slotName/documents/:documentId` | Remove document from slot | — |
| POST | `{{baseUrl}}/document-slots/offers/:offerId/slots/:slotName/emails` | Add email to slot | `{ "email_id": "<MongoId>" }` |
| DELETE | `{{baseUrl}}/document-slots/offers/:offerId/slots/:slotName/emails/:emailId` | Remove email from slot | — |
| POST | `{{baseUrl}}/document-slots/offers/:offerId/slots/:slotName/bulk` | Bulk add documents and emails | `{ "document_ids": ["id1","id2"], "email_ids": ["id1"] }` |
| DELETE | `{{baseUrl}}/document-slots/offers/:offerId/slots/:slotName` | Clear all items in slot | — |

**Examples (Direct – port 4003):**

- Get all slots: `GET http://localhost:4003/document-slots/offers/674a1b2c3d4e5f6789abcdef`
- Get one slot: `GET http://localhost:4003/document-slots/offers/674a1b2c3d4e5f6789abcdef/slots/contract`
- Add document: `POST http://localhost:4003/document-slots/offers/674a1b2c3d4e5f6789abcdef/slots/contract/documents`  
  Body (JSON): `{ "document_id": "674a1b2c3d4e5f6789abc000" }`
- Remove document: `DELETE http://localhost:4003/document-slots/offers/674a1b2c3d4e5f6789abcdef/slots/contract/documents/674a1b2c3d4e5f6789abc000`
- Add email: `POST http://localhost:4003/document-slots/offers/674a1b2c3d4e5f6789abcdef/slots/contract/emails`  
  Body: `{ "email_id": "674a1b2c3d4e5f6789abc001" }`
- Bulk: `POST http://localhost:4003/document-slots/offers/674a1b2c3d4e5f6789abcdef/slots/swift/bulk`  
  Body: `{ "document_ids": ["id1","id2"], "email_ids": ["id1"] }`
- Clear slot: `DELETE http://localhost:4003/document-slots/offers/674a1b2c3d4e5f6789abcdef/slots/contract`

---

## 3. Lead last email

Replace `:leadId` with a MongoDB ObjectId.

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| GET | `{{baseUrl}}/document-slots/leads/:leadId/last-email` | Get last_email for a lead | — |
| POST | `{{baseUrl}}/document-slots/leads/:leadId/last-email/documents` | Add document to last_email | `{ "document_id": "<MongoId>" }` |
| DELETE | `{{baseUrl}}/document-slots/leads/:leadId/last-email/documents/:documentId` | Remove document | — |
| POST | `{{baseUrl}}/document-slots/leads/:leadId/last-email/emails` | Add email to last_email | `{ "email_id": "<MongoId>" }` |
| DELETE | `{{baseUrl}}/document-slots/leads/:leadId/last-email/emails/:emailId` | Remove email | — |
| DELETE | `{{baseUrl}}/document-slots/leads/:leadId/last-email` | Clear last_email | — |

**Examples (Direct – port 4003):**

- Get: `GET http://localhost:4003/document-slots/leads/674a1b2c3d4e5f6789abcdef/last-email`
- Add document: `POST http://localhost:4003/document-slots/leads/674a1b2c3d4e5f6789abcdef/last-email/documents`  
  Body: `{ "document_id": "674a1b2c3d4e5f6789abc000" }`
- Add email: `POST http://localhost:4003/document-slots/leads/674a1b2c3d4e5f6789abcdef/last-email/emails`  
  Body: `{ "email_id": "674a1b2c3d4e5f6789abc001" }`
- Clear: `DELETE http://localhost:4003/document-slots/leads/674a1b2c3d4e5f6789abcdef/last-email`

---

## Quick reference – full URLs (Direct to Lead-Offer, port 4003)

```
GET    http://localhost:4003/document-slots/metadata
GET    http://localhost:4003/document-slots/offers/:offerId
GET    http://localhost:4003/document-slots/offers/:offerId/slots/:slotName
POST   http://localhost:4003/document-slots/offers/:offerId/slots/:slotName/documents
DELETE http://localhost:4003/document-slots/offers/:offerId/slots/:slotName/documents/:documentId
POST   http://localhost:4003/document-slots/offers/:offerId/slots/:slotName/emails
DELETE http://localhost:4003/document-slots/offers/:offerId/slots/:slotName/emails/:emailId
POST   http://localhost:4003/document-slots/offers/:offerId/slots/:slotName/bulk
DELETE http://localhost:4003/document-slots/offers/:offerId/slots/:slotName

GET    http://localhost:4003/document-slots/leads/:leadId/last-email
POST   http://localhost:4003/document-slots/leads/:leadId/last-email/documents
DELETE http://localhost:4003/document-slots/leads/:leadId/last-email/documents/:documentId
POST   http://localhost:4003/document-slots/leads/:leadId/last-email/emails
DELETE http://localhost:4003/document-slots/leads/:leadId/last-email/emails/:emailId
DELETE http://localhost:4003/document-slots/leads/:leadId/last-email
```

---

## Quick reference – full URLs (Via Gateway, port 4050)

Same paths, different host/port:

```
GET    http://localhost:4050/document-slots/metadata
GET    http://localhost:4050/document-slots/offers/:offerId
... (same paths as above, replace 4003 with 4050)
```

---

## Service ports (from gateway config)

| Service | Default URL | Port |
|---------|-------------|------|
| API Gateway | `http://localhost:4050` | 4050 |
| Lead-Offer Service | `http://localhost:4003` | 4003 |

If you use Docker or different env vars (`LEAD_OFFER_SERVICE_URL`, etc.), replace host/port accordingly.

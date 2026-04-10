# Leadbot Service API

## Frontend Integration Tips

- Use **X-API-Key** header for all `/api/*` requests; omit for `/` and `/health`
- Pass **X-Request-ID** for traceability; the API returns it in responses
- Use **multipart/form-data** for file uploads (documents, audio)
- Handle **401** (invalid API key), **422** (validation errors), **502/503** (service/dependency issues)

---

## Quick Reference

| Endpoint | Method | Auth | Content-Type |
|----------|--------|------|--------------|
| /health | GET | No | — |
| / | GET | No | — |
| /api/classify-email | POST | Yes | application/json |
| /api/extract-document | POST | Yes | multipart/form-data |
| /api/conversation | POST | Yes | application/json or multipart/form-data |
| /api/conversation | GET | Yes | — |
| /api/audio/transcribe/status | GET | Yes | — |
| /api/audio/transcribe | POST | Yes | multipart/form-data |
| /api/audio/transcribe/elevenlabs | POST | Yes | multipart/form-data |

---

## Base URL & Environment

| Environment | Base URL |
|-------------|----------|
| Local | http://localhost:8000 |
| Production | Configure via deployment |

**Interactive docs:** `{BASE_URL}/docs` (Swagger UI)

---

## Authentication

All endpoints except `/` and `/health` require an API key.

| Header | Value |
|--------|-------|
| X-API-Key | Your API key |

**401 Unauthorized** when missing or invalid.

---

## Request ID

Every request gets a unique `X-Request-ID` header. If not sent, one is generated. Use it for debugging and support.

---

## Error Response Format

All errors return JSON with `error` and `request_id`:

- **401, 422, 5xx:** `error` is a string
- **400:** `error` may be a string or object (e.g. `{"error": "...", "message": "...", "errors": [...], "hint": "..."}`) for validation failures

| Status | Meaning |
|--------|---------|
| 400 | Bad request (invalid file, type, size) |
| 401 | Invalid or missing X-API-Key |
| 422 | Validation error (check `details` for field-level info) |
| 502 | Upstream failure (e.g. vision/LLM) |
| 503 | Service unavailable (e.g. audio dependencies not loaded) |

---

## API Endpoints

### 1. Health Check

**GET** `/health` — Auth: None

Check service and dependency health.

**Response 200:**

| Field | Values |
|-------|--------|
| status | "ok" or "degraded" |
| checks.* | "ok" or "unreachable" |

**Use case:** App startup, status page, monitoring.

---

### 2. Root

**GET** `/` — Auth: None

Basic service info.

Response 200: Service name and version.

---

### 3. Email Classification

**POST** `/api/classify-email` — Auth: Required

Content-Type: `application/json`

Classify an email and suggest document slot and agent.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| subject | string | Yes | Max 1000 chars |
| body | string | Yes | Max 50,000 chars |
| direction | "incoming" \| "outgoing" | No | Default: "incoming" |
| attachments | array | No | From /api/extract-document or similar |
| is_reply | boolean | No | Whether this is a reply |
| parent_subject | string | No | Subject of parent email |
| parent_slot | string | No | Slot of parent email |

#### Response 200

| Field | Type | Description |
|-------|------|-------------|
| is_opening | boolean | New thread vs reply |
| stage | string \| null | Lead stage (e.g. Positiv) |
| slot | string \| null | Document slot (offer_email, contract, id_files, etc.) |
| confidence | number | 0–1 |
| reason | string \| null | Explanation |
| suggested_agent | string \| null | Suggested assignee |
| situation_summary | string \| null | Short summary |
| attachment_slots | array | Per-attachment slot suggestions |

#### Use Cases

| Use Case | Flow |
|----------|------|
| Inbox classification | Send each incoming email → get slot and agent |
| Reply detection | Set `is_reply`, `parent_subject`, `parent_slot` |
| Attachment routing | Include attachments from extract-document → get `attachment_slots` |
| Outgoing emails | Set `direction: "outgoing"` |

---

### 4. Document Extraction

**POST** `/api/extract-document` — Auth: Required

Content-Type: `multipart/form-data`

Extract text from PDFs and images via vision model.

#### Request

| Field | Type | Description |
|-------|------|-------------|
| files | file[] | One or more PDF/PNG/JPEG/WebP files |

**Limits:** Max size: 20 MB per file | Max PDF pages: 100 | Types: PDF, PNG, JPEG, WebP

#### Response 200

Returns `full_text`, `fields`, `pages`.

#### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | Invalid type, empty file, too large |
| 502 | Vision extraction failed |

#### Use Cases

| Use Case | Flow |
|----------|------|
| Contract upload | Upload PDF → use `full_text` and `fields` |
| ID/ID documents | Upload image → extract text for forms |
| Invoice processing | Upload PDF → extract structured fields |
| Pre-classify | Use output as `attachments` in /api/classify-email |

---

### 5. Conversations

#### 5.1 Send Message

**POST** `/api/conversation` — Auth: Required

Content-Type: `application/json` or `multipart/form-data`

Send a message and get an AI reply. Supports JSON or multipart with files.

#### JSON Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| user_id | string | Yes | Min 1 char |
| user | object | No | Agent/rep context |
| lead_id | string | No | Default: "general" |
| lead | object | No | Lead context |
| message | string | Yes | 1–10,000 chars |
| emails | array | No | Email thread for context |

#### Multipart Request (with files)

| Field | Type | Description |
|-------|------|-------------|
| user_id | string | Required |
| lead_id | string | Optional, default "general" |
| message | string | Optional if files only |
| lead | JSON string | Lead object |
| user | JSON string | User object |
| emails | JSON string | Email array |
| files | file[] | Documents (PDF/images) |

**File-only upload:** If `message` is empty, files are extracted and attached; response includes `documents` and a prompt to send a message.

#### Response 200 (with message)

Returns `reply`, `lead_id`, `user_id`.

#### Response 200 (file upload only)

Returns `documents` and `message` prompt.

---

#### 5.2 Get Conversation

**GET** `/api/conversation` — Auth: Required

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| user_id | string | — | Required |
| lead_id | string | "general" | Lead or "general" |

**Response 200:** Conversation history.

**Empty conversation:** Returns empty messages array.

---

#### Conversation Use Cases

| Use Case | Endpoints | Flow |
|----------|-----------|------|
| Lead chat | POST + GET /api/conversation | Send `user_id`, `lead_id`, `lead`, `message`; fetch history |
| General CRM chat | POST + GET /api/conversation | Use `lead_id: "general"` |
| Email draft | POST /api/conversation | Include `emails` and ask for draft |
| CRM queries | POST /api/conversation | Ask questions; LLM uses CRM tools |
| Document analysis | POST /api/conversation (multipart) | Upload files, then ask about them |
| Chat with context | POST /api/conversation | Send `lead` and `user` for context |

---

### 6. Audio Transcription

#### 6.1 Transcription Status

**GET** `/api/audio/transcribe/status` — Auth: Required

Check if transcription is available.

**Response 200:** Status object.

**503** if audio dependencies are not available.

---

#### 6.2 Transcribe (Whisper)

**POST** `/api/audio/transcribe` — Auth: Required

Content-Type: `multipart/form-data`

**Form Fields:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| file | file | — | Audio file |
| translate | boolean | false | Translate to English |
| diarize | boolean | false | Speaker diarization |
| summary | boolean | false | Structured summary |
| language | string | auto | ISO code (e.g. `de`, `en`) |

**Formats:** MP3, WAV, M4A, OGG, FLAC, WebM, MP4 | Max size: 100 MB

**Response 200:** Transcription text and metadata.

---

#### 6.3 Transcribe (ElevenLabs)

**POST** `/api/audio/transcribe/elevenlabs` — Auth: Required

Content-Type: `multipart/form-data`

Same parameters and response as Whisper. Requires `ELEVENLABS_API_KEY`. Returns `metadata.engine: "elevenlabs"`.

**503** if ElevenLabs is not configured.

---

#### Audio Use Cases

| Use Case | Endpoint | Params |
|----------|----------|--------|
| Call transcript | /api/audio/transcribe | `file`, `diarize: true` |
| Non-English call | /api/audio/transcribe | `file`, `translate: true`, `language: "de"` |
| Call summary | /api/audio/transcribe | `file`, `summary: true` |
| Check availability | /api/audio/transcribe/status | — |
| Cloud transcription | /api/audio/transcribe/elevenlabs | Same as Whisper |

---

## Limits & Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Max file size (documents) | 20 MB | Per file |
| Max PDF pages | 100 | Per document |
| Max message length | 10,000 chars | Conversation |
| Max conversation history | 50 messages | Sent to LLM per turn |
| Max audio size | 100 MB | Transcription |

---

## Related Docs

- [Leadbot API Doc](./Leadbot-API-Doc.md)
- [Leadbot API — Use Case Reference](./Leadbot-API-Use-Case-Reference.md)

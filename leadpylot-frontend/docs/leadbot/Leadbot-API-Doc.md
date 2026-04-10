# Leadbot API Doc

Request/response reference for each endpoint.

**Import the collection:** `Leadbot_API.postman_collection.json` (10 KiB)

**Base URL:** `{{base_url}}` (default: `http://localhost:8000`)

**Auth:** Add `X-API-Key` to all `/api/*` requests. Set in collection variables.

---

## 1. Classify Email

| Property | Value |
|----------|-------|
| **Method** | POST |
| **URL** | `{{base_url}}/api/classify-email` |
| **Auth** | X-API-Key required |
| **Headers** | Content-Type: application/json |

### Request Body (JSON)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| subject | string | Yes | Max 1000 chars |
| body | string | Yes | Max 50,000 chars |
| direction | "incoming" \| "outgoing" | No | Default: "incoming" |
| attachments | array | No | From extract-document output |
| is_reply | boolean | No | Whether this is a reply |
| parent_subject | string | No | Subject of parent email |
| parent_slot | string | No | Slot of parent email |

### Response 200

Returns classification result with slot, suggested agent, stage, etc.

---

## 2. Extract Document

| Property | Value |
|----------|-------|
| **Method** | POST |
| **URL** | `{{base_url}}/api/extract-document` |
| **Auth** | X-API-Key required |
| **Headers** | Content-Type: multipart/form-data (auto-set by Postman) |

### Request Body (form-data)

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| files | file | Yes | One or more PDF/PNG/JPEG/WebP files (max 20 MB each) |

In Postman: Body → form-data → add key `files`, type File, select file(s).

### Response 200

Returns extracted text, fields, and pages.

---

## 3. Send Message (Conversation)

| Property | Value |
|----------|-------|
| **Method** | POST |
| **URL** | `{{base_url}}/api/conversation` |
| **Auth** | X-API-Key required |
| **Headers** | Content-Type: application/json |

### Request Body (JSON)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| user_id | string | Yes | Min 1 char |
| user | object | No | Agent context |
| lead_id | string | No | Default: "general" |
| lead | object | No | Lead context |
| message | string | Yes | 1–10,000 chars |
| emails | array | No | Email thread for context |

### Response 200 (with message)

Returns `reply`, `lead_id`, `user_id`.

### Response 200 (file upload only, no message)

Returns `documents` and `message` prompt.

---

## 4. Send Message with Files (Multipart)

| Property | Value |
|----------|-------|
| **Method** | POST |
| **URL** | `{{base_url}}/api/conversation` |
| **Auth** | X-API-Key required |
| **Headers** | Content-Type: multipart/form-data (auto-set) |

### Request Body (form-data)

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| user_id | text | Yes | User reference |
| lead_id | text | No | Default: "general" |
| message | text | No* | User message (*optional if files only) |
| lead | text (JSON) | No | Lead object as JSON string |
| user | text (JSON) | No | User object as JSON string |
| emails | text (JSON) | No | Email array as JSON string |
| files | file | No | PDF/images to attach |

In Postman: Body → form-data → add keys. For `lead` / `user` / `emails`, paste JSON string.

### Response 200

Same as Send Message (JSON) — `reply`, `lead_id`, `user_id` when message sent; or `documents`, `message` when files-only.

---

## 5. Get Conversation

| Property | Value |
|----------|-------|
| **Method** | GET |
| **URL** | `{{base_url}}/api/conversation?user_id=user-123&lead_id=lead-456` |
| **Auth** | X-API-Key required |
| **Headers** | — |

### Query Parameters

| Param | Type | Default | Required |
|-------|------|---------|----------|
| user_id | string | — | Yes |
| lead_id | string | "general" | No |

### Response 200 (with messages)

Returns conversation history.

### Response 200 (empty)

Returns empty messages array.

---

## 6. Audio Transcribe Status

| Property | Value |
|----------|-------|
| **Method** | GET |
| **URL** | `{{base_url}}/api/audio/transcribe/status` |
| **Auth** | X-API-Key required |
| **Headers** | — |

### Response 200

Returns transcription service status.

**503** if audio dependencies not loaded.

---

## 7. Transcribe Audio (Whisper)

| Property | Value |
|----------|-------|
| **Method** | POST |
| **URL** | `{{base_url}}/api/audio/transcribe` |
| **Auth** | X-API-Key required |
| **Headers** | Content-Type: multipart/form-data (auto-set) |

### Request Body (form-data)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| file | file | — | Audio file (MP3, WAV, M4A, OGG, FLAC, WebM, MP4; max 100 MB) |
| translate | text | false | `true` to translate to English |
| diarize | text | false | `true` for speaker diarization |
| summary | text | false | `true` for structured summary |
| language | text | auto | ISO code (e.g. `de`, `en`) |

In Postman: Body → form-data → add `file` (File), `translate` / `diarize` / `summary` / `language` (Text).

### Response 200

Returns transcription text and metadata.

---

## 8. Transcribe Audio (ElevenLabs)

| Property | Value |
|----------|-------|
| **Method** | POST |
| **URL** | `{{base_url}}/api/audio/transcribe/elevenlabs` |
| **Auth** | X-API-Key required |
| **Headers** | Content-Type: multipart/form-data (auto-set) |

Same request/response as Whisper. Requires `ELEVENLABS_API_KEY` on server. **503** if not configured.

---

## Error Responses

All errors return JSON with `error` and `request_id`.

| Status | Meaning |
|--------|---------|
| 400 | Bad request (invalid file, type, size) |
| 401 | Invalid or missing X-API-Key |
| 422 | Validation error (check `details`) |
| 502 | Upstream failure (vision/LLM) |
| 503 | Service unavailable |

---

## Related Docs

- [Leadbot API — Use Case Reference](./Leadbot-API-Use-Case-Reference.md)
- [Leadbot Service API](./Leadbot-Service-API.md)

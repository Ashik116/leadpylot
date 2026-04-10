# Leadbot API — Use Case Reference

**Base URL:** `http://localhost:6009` (local)

**Auth:** `X-API-Key` on all `/api/*` endpoints

**Environment variable:** Set `LEADBOT_API_BASE` and `LEADBOT_API_KEY` in your frontend env for API base URL and key.

---

## 1. Inbox & Email Handling

| Flow | Endpoints | Steps |
|------|-----------|-------|
| Classify new email | POST /api/classify-email | Send `subject`, `body`, `direction` → get `slot`, `suggested_agent`, `stage` |
| Classify email with attachments | POST /api/extract-document → POST /api/classify-email | 1) Extract attachments 2) Use `attachments` in classify payload |
| Detect reply vs opening | POST /api/classify-email | Set `is_reply`, `parent_subject`, `parent_slot` → get `is_opening` |
| Route outgoing email | POST /api/classify-email | Set `direction: "outgoing"` |

---

## 2. Document Processing

| Flow | Endpoints | Steps |
|------|-----------|-------|
| Extract text from contract | POST /api/extract-document | Upload PDF → get `full_text`, `fields`, `pages` |
| Extract from image (ID, invoice) | POST /api/extract-document | Upload PNG/JPEG/WebP → same response |
| Pre-classify before storing | POST /api/extract-document → POST /api/classify-email | 1) Extract 2) Classify with attachments |

---

## 3. Lead Chat & Conversations

| Flow | Endpoints | Steps |
|------|-----------|-------|
| Chat about a lead | POST /api/conversation, GET /api/conversation | Send `user_id`, `lead_id`, `lead`, `message`; fetch history |
| General CRM chat | POST /api/conversation | Use `lead_id: "general"` |
| Load chat history | GET /api/conversation | Send `user_id`, `lead_id` |
| Ask for email draft | POST /api/conversation | Include `emails` array + ask for draft |
| Query CRM data | POST /api/conversation | Ask questions; LLM uses CRM tools |
| Chat with uploaded docs | POST /api/conversation (multipart) | 1) Upload files 2) Send message |

---

## 4. Voice & Audio

| Flow | Endpoints | Steps |
|------|-----------|-------|
| Transcribe call | GET /api/audio/transcribe/status → POST /api/audio/transcribe | 1) Check status 2) Upload audio |
| Transcribe with speakers | POST /api/audio/transcribe | Set `diarize: true` |
| Translate non-English | POST /api/audio/transcribe | Set `translate: true`, `language: "de"` |
| Get call summary | POST /api/audio/transcribe | Set `summary: true` |

---

## 5. App Health & Status

| Flow | Endpoints | Steps |
|------|-----------|-------|
| Startup check | GET /health | Verify MongoDB, CRM, Ollama |
| Service info | GET / | Get service name and version |

---

## Request/Response Cheat Sheet

| Endpoint | Method | Content-Type | Auth |
|----------|--------|--------------|------|
| /health | GET | — | No |
| / | GET | — | No |
| /api/classify-email | POST | application/json | Yes |
| /api/extract-document | POST | multipart/form-data | Yes |
| /api/conversation | POST | application/json or multipart | Yes |
| /api/conversation | GET | — | Yes |
| /api/audio/transcribe/status | GET | — | Yes |
| /api/audio/transcribe | POST | multipart/form-data | Yes |
| /api/audio/transcribe/elevenlabs | POST | multipart/form-data | Yes |

**Auth header:** `X-API-Key`

---

## Related Docs

- [Leadbot API Doc](./Leadbot-API-Doc.md)
- [Leadbot Service API](./Leadbot-Service-API.md)

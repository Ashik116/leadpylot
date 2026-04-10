# Stream Chat — Use Cases & APIs

Documentation for the streaming chat interface (`/stream-ui`). Use cases and APIs used by the stream UI.

---

## Stream-UI Behavior Summary

| Action | API Used |
|--------|----------|
| Send message (no files) | `POST /api/conversation/stream` (JSON, SSE) |
| Send message (with files) | `POST /api/conversation/stream` (multipart) — streams reply; emits `file_uploading` events during extraction |
| Regenerate last reply | `POST /api/conversation/regenerate/stream` |
| Edit message & regenerate | `POST /api/conversation/edit-and-regenerate/stream` |
| Delete message | `DELETE /api/conversation/message/{id}` |
| Load conversation | `GET /api/conversation?limit=20` |
| Load older messages | `GET /api/conversation?limit=20&before_id={id}` |
| List conversations | `GET /api/conversations` |
| Delete conversation | `DELETE /api/conversation` |

---

## Use Cases

| Use Case | Description | API |
|----------|-------------|-----|
| **Send message** | User sends a message; assistant reply streams in real time | `POST /api/conversation/stream` |
| **Send message with files** | User attaches PDF/images; documents extracted, reply streams; emits `file_uploading` events (`reading` → `analysing` → `done`) | `POST /api/conversation/stream` (multipart) |
| **Regenerate** | Regenerate the last assistant reply (user message stays) | `POST /api/conversation/regenerate/stream` |
| **Edit & regenerate** | Edit a past user message; delete it and all after; regenerate from edited message | `POST /api/conversation/edit-and-regenerate/stream` |
| **Delete message** | Delete a user message and all messages after it (cascade) | `DELETE /api/conversation/message/{id}` |
| **Load conversation** | Load conversation history (paginated, newest first) | `GET /api/conversation` |
| **Load older messages** | Load more messages above current view | `GET /api/conversation?before_id=...` |
| **List conversations** | List all conversations for a user | `GET /api/conversations` |
| **Delete conversation** | Delete entire conversation and all messages | `DELETE /api/conversation` |

---

## Streaming APIs

### 1. Send Message (Stream)

**POST** `/api/conversation/stream`  
**Content-Type:** `application/json` or `multipart/form-data` (with files)

**Request (JSON):**

```json
{
  "user_id": "user-123",
  "lead_id": "general",
  "message": "Summarize the offer status",
  "user": { "role": "agent" },
  "lead": { "contact_name": "Robert", "email_from": "robert@example.com", "stage": "Positiv", "status": "Angebot" },
  "emails": [{"subject": "Hello", "body": "...", "direction": "incoming", "date": "2025-06-01"}],
  "offer_ids": ["id1", "id2"]
}
```

**Request (multipart with files):** Same fields as form fields. `lead`, `user`, `emails`, `offer_ids` as JSON strings. Add `files` (file[]).

**Response:** `text/event-stream` (SSE)

| Event `type` | Fields | When |
|--------------|--------|------|
| `file_uploading` | `status`, `filenames`, `count`? | During file extraction (multipart only). `status`: `"reading"` → `"analysing"` → `"done"` |
| `text` | `content` | Incremental reply chunks |
| `tool_start` | — | LLM is calling a tool |
| `message_id` | `message_id` | ID of saved assistant message |
| `done` | `reply`, `lead_id`, `user_id` | Stream complete |
| `error` | `message` | Error |

**Keepalive:** The server may send `: keepalive\n\n` comments during long operations (e.g. VLM extraction) to keep the connection alive.

**Example SSE (no files):**

```
data: {"type":"text","content":""}
data: {"type":"text","content":"I'll"}
data: {"type":"text","content":" check"}
data: {"type":"tool_start"}
data: {"type":"text","content":" that"}
data: {"type":"done","reply":"I'll check that for you.","lead_id":"general","user_id":"user-123"}
data: {"type":"message_id","message_id":"msg-abc123"}
```

**Example SSE (with files):**

```
data: {"type":"file_uploading","status":"reading","filenames":["report.pdf"]}
: keepalive
: keepalive
data: {"type":"file_uploading","status":"analysing","filenames":["report.pdf"]}
data: {"type":"file_uploading","status":"done","count":1,"filenames":["report.pdf"]}
data: {"type":"text","content":"Based"}
data: {"type":"text","content":" on the document"}
data: {"type":"done","reply":"Based on the document...","lead_id":"general","user_id":"user-123"}
data: {"type":"message_id","message_id":"msg-abc123"}
```

**Frontend handling for `file_uploading`:**

- `status: "reading"` → Show "Reading file(s)…" in the stream bubble
- `status: "analysing"` → Show "Analysing document…"
- `status: "done"` → Clear the status text; the next `text` events will stream the LLM reply

---

## User-friendly status text guide

Use clear, reassuring copy so users understand what’s happening without technical jargon.

### Recommended labels

| Event / state | Recommended text | Avoid |
|---------------|------------------|-------|
| Initial placeholder (HTTP 200) | **Thinking…** | "Processing", "Loading", "Please wait" |
| `file_uploading` `reading` | **Reading file(s)…** | "Parsing", "Extracting", "Uploading" |
| `file_uploading` `analysing` | **Analysing document…** | "OCR", "VLM", "Running model" |
| `tool_start` (LLM using tools) | **Looking up information…** | "Using tools", "Tool call", "Executing" |
| Error | **Something went wrong. Please try again.** | Raw error messages, stack traces |

### Alternative options

- **Thinking…** → "Working on it…" or "Preparing response…"
- **Reading file(s)…** → "Opening your file(s)…" (for single file)
- **Analysing document…** → "Understanding your document…" or "Extracting content…"
- **Looking up information…** → "Searching CRM…" or "Checking records…" (if your UI is CRM-focused)

### Best practices

1. **Keep it short** — Status text should fit in one line in the bubble.
2. **Use ellipsis (…)** — Indicates ongoing work.
3. **Be specific when possible** — "Reading file(s)…" is clearer than "Processing…".
4. **Don’t stack multiple states** — Show one status at a time; replace, don’t append.
5. **Clear on first real content** — Remove the placeholder as soon as the first `text` or `tool_start` arrives.

---

### 2. Regenerate Last Response (Stream)

**POST** `/api/conversation/regenerate/stream`  
**Content-Type:** `application/json`

**Request:**

```json
{
  "user_id": "user-123",
  "lead_id": "general"
}
```

**Response:** Same SSE format as Send Message. Deletes the last assistant message, keeps the user message, streams a new reply.

---

### 3. Edit & Regenerate (Stream)

**POST** `/api/conversation/edit-and-regenerate/stream`  
**Content-Type:** `application/json`

**Request:**

```json
{
  "user_id": "user-123",
  "lead_id": "general",
  "message_id": "msg-object-id",
  "content": "Updated user message text"
}
```

**Response:** Same SSE format as Send Message. Deletes the message and all after it, updates the user message, streams a new reply.

---

## Supporting REST APIs

### Get Conversation (paginated)

**GET** `/api/conversation?user_id={uid}&lead_id={lid}&limit=20&before_id={id}`

| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| `user_id` | Yes | — | User reference |
| `lead_id` | No | `"general"` | Lead/contact |
| `limit` | No | 20 | Messages per page |
| `before_id` | No | — | Load messages older than this ID |

**Response (with pagination):**

```json
{
  "id": "69a10e3d38ac53616e25e054",
  "user_id": "69966fe94d3d3e405436d021",
  "lead_id": "general",
  "title": null,
  "messages": [
    {
      "id": "69a913239fafffc6ed510787",
      "role": "user",
      "content": "try again",
      "tool_exchanges": null,
      "attachments": null,
      "created_at": "2026-03-05T05:22:43.938000Z"
    },
    {
      "id": "69a913239fafffc6ed510788",
      "role": "assistant",
      "content": "Perfect! Here are the next 20 leads...",
      "tool_exchanges": null,
      "attachments": null,
      "created_at": "2026-03-05T05:22:43.946000Z"
    },
    {
      "id": "69aa4654241d5af7d46a2e99",
      "role": "user",
      "content": "What can you tell me about these documents?",
      "tool_exchanges": null,
      "attachments": [
        {
          "filename": "Antrag für Festgeld.pdf",
          "subject": "Uploaded: Antrag für Festgeld.pdf"
        }
      ],
      "created_at": "2026-03-06T03:13:24.665000Z"
    },
    {
      "id": "69aa4e74b6ef03153da01f1a",
      "role": "user",
      "content": "What can you tell me about these documents?",
      "tool_exchanges": null,
      "attachments": [
        {
          "filename": "Antrag für Festgeld.pdf",
          "subject": "Uploaded: Antrag für Festgeld.pdf",
          "extracted_text": "Postanschrift:\n(Verträge an diese Adresse)...",
          "fields": { "page_1": { "vollstaendiger_name": "Günter Bischoff", "anlagesumme": "50.000,00 €", ... } },
          "page_count": 1
        }
      ],
      "created_at": "2026-03-06T03:48:04.143000Z"
    },
    {
      "id": "69aa501154c333f82144f62f",
      "role": "assistant",
      "content": "I'll analyze the leads status...",
      "tool_exchanges": [
        {
          "name": "count_documents",
          "arguments": { "collection": "leads", "filter": { "active": true } },
          "result": "{\"count\": 55103}"
        },
        {
          "name": "group_and_count",
          "arguments": { "collection": "leads", "group_by": "use_status", "limit": 15 },
          "result": "{\"results\": [{\"group_value\": \"pending\", \"count\": 55020}, ...], \"count\": 2}"
        }
      ],
      "attachments": null,
      "created_at": "2026-03-06T03:54:57.205000Z"
    }
  ],
  "has_more": true,
  "count": 20
}
```

**Response (no pagination, full history):** When `limit` and `before_id` are omitted, returns `messages` as full array (or empty) and no `has_more`/`count`.

**Message fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Message ID (ObjectId) |
| `role` | `"user"` \| `"assistant"` | Sender |
| `content` | string | Message text |
| `tool_exchanges` | array \| null | Assistant only: `[{name, arguments, result}]` — tools used during the reply |
| `attachments` | array \| null | User only: `[{filename, subject?, extracted_text?, fields?, page_count?}]` — file uploads with optional OCR output |
| `created_at` | string | ISO 8601 timestamp (e.g. `2026-03-05T05:22:43.938000Z`) |

---

### Delete Message (cascade)

**DELETE** `/api/conversation/message/{message_id}?user_id={uid}`

Only user messages can be deleted. Deletes the message and all messages after it.

**Response:** `{"deleted": true, "message_id": "...", "deleted_count": 3}`

---

### List Conversations

**GET** `/api/conversations?user_id={uid}&limit=50`

**Response:**

```json
{
  "conversations": [
    { "lead_id": "general", "title": "...", "message_count": 5, "updated_at": "..." }
  ]
}
```

---

### Delete Conversation

**DELETE** `/api/conversation?user_id={uid}&lead_id={lid}`

**Response:** `{"deleted": true, "user_id": "...", "lead_id": "..."}`

---

## Frontend Implementation Notes

### Status text

Use the [User-friendly status text guide](#user-friendly-status-text-guide) for placeholder and status labels (Thinking…, Reading file(s)…, Looking up information…, etc.).

### SSE parsing

1. Use `fetch()` with `res.body.getReader()`.
2. Decode chunks with `TextDecoder`.
3. Split on newlines; for each line starting with `data: `, parse `JSON.parse(line.slice(6))`.
4. Ignore `: keepalive` comment lines (keep connection alive).
5. Handle events by `data.type`.

### Event order (stream with files)

See [User-friendly status text guide](#user-friendly-status-text-guide) for recommended labels.

1. HTTP 200 arrives → show "Thinking…" immediately.
2. `file_uploading` status `reading` → update to "Reading file(s)…"
3. `: keepalive` (optional, repeated) → no UI change
4. `file_uploading` status `analysing` → update to "Analysing document…"
5. `file_uploading` status `done` → clear status; ready for text
6. First `text` or `tool_start` → clear "Thinking…" placeholder
7. `text` events → append reply chunks
8. `done` → finalize bubble with full reply
9. `message_id` → ID of saved assistant message (for edit/delete)

### Message attachments (history)

User messages that had file uploads include `attachments`:

```json
{
  "id": "69aa4e74b6ef03153da01f1a",
  "role": "user",
  "content": "What can you tell me about these documents?",
  "attachments": [
    {
      "filename": "Antrag für Festgeld.pdf",
      "subject": "Uploaded: Antrag für Festgeld.pdf",
      "extracted_text": "Postanschrift:\n(Verträge an diese Adresse)...",
      "fields": { "page_1": { "vollstaendiger_name": "Günter Bischoff", "anlagesumme": "50.000,00 €" } },
      "page_count": 1
    }
  ],
  "created_at": "2026-03-06T03:48:04.143000Z"
}
```

- **Minimal** (no OCR): `filename`, `subject`
- **With OCR**: `extracted_text`, `fields`, `page_count`

Render file chips on user bubbles using `attachments[].filename`.

### Tool exchanges (assistant messages)

Assistant messages that used CRM tools include `tool_exchanges`:

```json
{
  "id": "69aa501154c333f82144f62f",
  "role": "assistant",
  "content": "I'll analyze the leads status...",
  "tool_exchanges": [
    { "name": "count_documents", "arguments": { "collection": "leads", "filter": { "active": true } }, "result": "{\"count\": 55103}" },
    { "name": "group_and_count", "arguments": { "collection": "leads", "group_by": "use_status" }, "result": "{\"results\": [...], \"count\": 2}" }
  ],
  "attachments": null,
  "created_at": "2026-03-06T03:54:57.205000Z"
}
```

### Message actions (stream-ui behavior)

| Message type | Actions |
|--------------|---------|
| User | Edit, Delete |
| Assistant | Regenerate |

### Pagination

- **Initial load:** `GET /api/conversation?user_id={uid}&lead_id={lid}&limit=20` — returns newest 20 messages
- **Load older:** `GET /api/conversation?user_id={uid}&lead_id={lid}&limit=20&before_id={oldest_id}` — use `messages[0].id` from current view as `before_id`
- **Show "Load older" button:** when `has_more === true`
- **`count`:** number of messages in current response

### Auth

All requests require `X-API-Key` header.

# Stream Chat — Use Cases & APIs

Documentation for the streaming chat interface (`/stream-ui`). Use cases and APIs used by the stream UI.

---

## Stream-UI Behavior Summary

| Action | API Used |
|--------|----------|
| Send message (no files) | `POST /api/conversation/stream` (JSON, SSE) |
| Send message (with files) | `POST /api/conversation/stream` (multipart) — streams reply; emits `documents` event first |
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
| **Send message with files** | User attaches PDF/images; documents extracted, reply streams; emits `documents` event first | `POST /api/conversation/stream` (multipart) |
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
| `documents` | `documents` | First, when files were uploaded |
| `text` | `content` | Incremental reply chunks |
| `tool_start` | — | LLM is calling a tool |
| `message_id` | `message_id` | ID of saved assistant message |
| `done` | `reply`, `lead_id`, `user_id`, `documents`? | Stream complete |
| `error` | `message` | Error |

**Example SSE:**

```
data: {"type":"text","content":""}
data: {"type":"text","content":"I'll"}
data: {"type":"text","content":" check"}
data: {"type":"tool_start"}
data: {"type":"text","content":" that"}
data: {"type":"done","reply":"I'll check that for you.","lead_id":"general","user_id":"user-123"}
```

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

**Response:**

```json
{
  "id": "conv-id",
  "user_id": "user-123",
  "lead_id": "general",
  "title": "Conversation title",
  "messages": [
    { "id": "msg-id", "role": "user", "content": "...", "tool_exchanges": null },
    { "id": "msg-id", "role": "assistant", "content": "...", "tool_exchanges": [...] }
  ],
  "has_more": true
}
```

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

### SSE parsing

1. Use `fetch()` with `res.body.getReader()`.
2. Decode chunks with `TextDecoder`.
3. Split on newlines; for each line starting with `data: `, parse `JSON.parse(line.slice(6))`.
4. Handle events by `data.type`.

### Message actions (stream-ui behavior)

| Message type | Actions |
|--------------|---------|
| User | Edit, Delete |
| Assistant | Regenerate |

### Pagination

- Initial load: `GET /api/conversation?limit=20`
- Load more: `GET /api/conversation?limit=20&before_id={oldest_message_id}`
- Use `has_more` from response to show/hide "Load older" button

### Auth

All requests require `X-API-Key` header.

# Stream Chat — API Reference

Backend API reference for the streaming chat service. Covers request formats, SSE event specifications, event ordering, and supporting REST endpoints.

---

## Table of Contents

1. [API Quick Reference](#1-api-quick-reference)
2. [Streaming API](#2-streaming-api)
3. [SSE Event Reference](#3-sse-event-reference)
4. [Event Sequences](#4-event-sequences)
5. [UX Copy Guidance](#5-ux-copy-guidance)
6. [Supporting REST APIs](#6-supporting-rest-apis)

---

## 1. API Quick Reference

| Action | Method | Endpoint | Content-Type |
|--------|--------|----------|--------------|
| Send message | POST | `/api/conversation/stream` | JSON or multipart |
| Regenerate last reply | POST | `/api/conversation/regenerate/stream` | JSON |
| Edit & regenerate | POST | `/api/conversation/edit-and-regenerate/stream` | JSON |
| Delete message | DELETE | `/api/conversation/message/{id}` | — |
| Get conversation | GET | `/api/conversation` | — |
| List conversations | GET | `/api/conversations` | — |
| Delete conversation | DELETE | `/api/conversation` | — |

All requests require the `X-API-Key` header.

---

## 2. Streaming API

### POST `/api/conversation/stream`

**Content-Type:** `application/json` or `multipart/form-data`

#### JSON body

```json
{
  "user_id": "user-123",
  "lead_id": "general",
  "message": "Summarize the offer status",
  "user": { "role": "agent" },
  "lead": {
    "contact_name": "Robert",
    "email_from": "robert@example.com",
    "stage": "Positiv",
    "status": "Angebot"
  },
  "emails": [
    { "subject": "Hello", "body": "...", "direction": "incoming", "date": "2025-06-01" }
  ],
  "offer_ids": ["id1", "id2"]
}
```

#### Multipart form fields

Same fields as JSON. `lead`, `user`, `emails`, `offer_ids` must be sent as JSON strings.

| Field | Type | Description |
|-------|------|-------------|
| `message` | string | User message text |
| `user_id` | string | User reference |
| `lead_id` | string | Lead/contact ID (`"general"` if no lead) |
| `lead` | JSON string | Lead context object |
| `user` | JSON string | User object (e.g. `{"role":"agent"}`) |
| `emails` | JSON string | Array of email objects |
| `offer_ids` | JSON string | Array of offer IDs |
| `files` | file[] | Documents (PDF, PNG, JPEG, WebP). Extracted via VLM, stored in `conv_meta.documents`. |
| `audio` | file | Single audio file (MP3, WAV, M4A, OGG, FLAC, WebM, MP4). Transcribed, stored in `conv_meta.audio_transcripts`. |

**Validation:** At least one of `message`, `files`, or `audio` is required.

**Auto-generated message when `message` is empty:**

| Attachments | Default message |
|-------------|----------------|
| Documents only | `"What can you tell me about these documents?"` |
| Audio only | `"What can you tell me about this voice recording?"` |
| Both | `"What can you tell me about these documents and the voice recording?"` |

**Response:** `text/event-stream` (SSE)

---

### POST `/api/conversation/regenerate/stream`

Deletes the last assistant message, keeps the user message, streams a new reply.

```json
{ "user_id": "user-123", "lead_id": "general" }
```

**Response:** Same SSE format as Send Message.

---

### POST `/api/conversation/edit-and-regenerate/stream`

Edits a past user message, deletes it and all messages after it, streams a new reply from the edited message.

```json
{
  "user_id": "user-123",
  "lead_id": "general",
  "message_id": "msg-object-id",
  "content": "Updated message text"
}
```

**Response:** Same SSE format as Send Message.

---

## 3. SSE Event Reference

All events are sent as `data: <JSON>\n\n`. The server also sends `: keepalive\n\n` comment lines during long operations (VLM extraction, audio transcription) to keep the connection alive. Clients must ignore these comment lines.

### Event types

| `type` | Fields | When |
|--------|--------|------|
| `llm_start` | — | Emitted immediately after HTTP 200; the LLM has started processing. Signals the UI to update from "Thinking…" to "Generating response…". |
| `file_uploading` | `status`, `filenames[]`, `total`, `filename?`, `index?`, `count?` | During document processing. `status` cycles through multiple values — see below. |
| `audio_transcribing` | `status`, `filename` | During audio transcription. |
| `tool_start` | `name?` | LLM is calling a tool. `name` is the function name (e.g. `"get_crm_knowledge"`). |
| `tool_done` | — | All tool calls in the current LLM iteration are complete; the LLM is resuming generation. |
| `text` | `content` | Incremental LLM reply chunk. Append to the response bubble. |
| `message_id` | `message_id` | ObjectId of the saved assistant message. Arrives after `done`. |
| `done` | `reply`, `lead_id`, `user_id` | Stream complete. `reply` is the full canonical response text. |
| `error` | `message` | An error occurred. The stream will not continue. |

### `file_uploading` status progression

| `status` | Key fields | Description |
|----------|-----------|-------------|
| `reading` | `filenames[]`, `total` | VLM extraction has started for all uploaded files |
| `analysing` | `filenames[]`, `total` | VLM extraction complete; document classification is starting |
| `classifying` | `filename`, `index`, `total` | Per-file: the LLM is classifying this document. `index` is 1-based. |
| `classified` | `total` | All documents are classified. Fires **before** audio transcription begins. |
| `done` | `filenames[]`, `count` | All file and audio processing is complete. `count` = total processed items. |

### `audio_transcribing` status values

| `status` | Key fields | Description |
|----------|-----------|-------------|
| `start` | `filename` | Audio transcription has started |
| `done` | `filename` | Audio transcription is complete |

---

## 4. Event Sequences

### Plain text message (no files, no audio)

```
data: {"type":"llm_start"}

data: {"type":"text","content":"Sure"}
data: {"type":"text","content":", here is"}
data: {"type":"text","content":" the summary."}
data: {"type":"done","reply":"Sure, here is the summary.","lead_id":"general","user_id":"user-123"}
data: {"type":"message_id","message_id":"msg-abc123"}
```

### Plain text — LLM uses a tool

The LLM may call tools (e.g. `get_crm_knowledge`) before generating its reply. Each tool call is a separate `tool_start` / `tool_done` pair. Multiple sequential tool calls are possible.

```
data: {"type":"llm_start"}

data: {"type":"tool_start","name":"get_crm_knowledge"}
data: {"type":"tool_done"}

data: {"type":"text","content":"Based on your CRM data"}
data: {"type":"text","content":", here are the offers."}
data: {"type":"done","reply":"Based on your CRM data, here are the offers.","lead_id":"lead-456","user_id":"user-123"}
data: {"type":"message_id","message_id":"msg-abc124"}
```

### One document uploaded

```
data: {"type":"file_uploading","status":"reading","filenames":["report.pdf"],"total":1}
: keepalive
: keepalive
data: {"type":"file_uploading","status":"analysing","filenames":["report.pdf"],"total":1}
data: {"type":"file_uploading","status":"classifying","filename":"report.pdf","index":1,"total":1}
data: {"type":"file_uploading","status":"classified","total":1}
data: {"type":"file_uploading","status":"done","filenames":["report.pdf"],"count":1}
data: {"type":"llm_start"}

data: {"type":"text","content":"Based on the document"}
data: {"type":"done","reply":"Based on the document...","lead_id":"general","user_id":"user-123"}
data: {"type":"message_id","message_id":"msg-abc125"}
```

### Three documents uploaded

```
data: {"type":"file_uploading","status":"reading","filenames":["a.pdf","b.pdf","c.pdf"],"total":3}
: keepalive
data: {"type":"file_uploading","status":"analysing","filenames":["a.pdf","b.pdf","c.pdf"],"total":3}
data: {"type":"file_uploading","status":"classifying","filename":"a.pdf","index":1,"total":3}
data: {"type":"file_uploading","status":"classifying","filename":"b.pdf","index":2,"total":3}
data: {"type":"file_uploading","status":"classifying","filename":"c.pdf","index":3,"total":3}
data: {"type":"file_uploading","status":"classified","total":3}
data: {"type":"file_uploading","status":"done","filenames":["a.pdf","b.pdf","c.pdf"],"count":3}
data: {"type":"llm_start"}

data: {"type":"text","content":"I've reviewed all three documents."}
data: {"type":"done","reply":"I've reviewed all three documents.","lead_id":"general","user_id":"user-123"}
data: {"type":"message_id","message_id":"msg-abc126"}
```

### Audio file only

```
data: {"type":"audio_transcribing","status":"start","filename":"call.mp3"}
data: {"type":"audio_transcribing","status":"done","filename":"call.mp3"}
data: {"type":"file_uploading","status":"done","filenames":["call.mp3"],"count":1}
data: {"type":"llm_start"}

data: {"type":"text","content":"Based on the recording"}
data: {"type":"done","reply":"Based on the recording...","lead_id":"general","user_id":"user-123"}
data: {"type":"message_id","message_id":"msg-abc127"}
```

### Documents + audio (combined)

Note: `classified` fires before audio transcription starts, so each processing phase can be tracked independently.

```
data: {"type":"file_uploading","status":"reading","filenames":["report.pdf"],"total":1}
: keepalive
data: {"type":"file_uploading","status":"analysing","filenames":["report.pdf"],"total":1}
data: {"type":"file_uploading","status":"classifying","filename":"report.pdf","index":1,"total":1}
data: {"type":"file_uploading","status":"classified","total":1}
data: {"type":"audio_transcribing","status":"start","filename":"call.mp3"}
data: {"type":"audio_transcribing","status":"done","filename":"call.mp3"}
data: {"type":"file_uploading","status":"done","filenames":["report.pdf","call.mp3"],"count":2}
data: {"type":"llm_start"}

data: {"type":"text","content":"I've analysed both."}
data: {"type":"done","reply":"I've analysed both.","lead_id":"general","user_id":"user-123"}
data: {"type":"message_id","message_id":"msg-abc128"}
```

---

## 5. Event → Display Mapping

For each event, the frontend must show exactly what is specified below. This defines the contract between backend and frontend.

### Initial state (HTTP 200 received)

| When | What to show |
|------|--------------|
| Response stream starts (before any event) | **Thinking…** in the assistant bubble |

### LLM events

| Event | What to show |
|-------|--------------|
| `llm_start` | Replace placeholder with **Generating response…** |
| `tool_start` | Replace placeholder with **Looking up knowledge…** if `name === "get_crm_knowledge"`, else **Fetching data…** (or `Running {name}…` if `name` is present) |
| `tool_done` | Replace placeholder with **Generating response…** |
| `text` | Remove placeholder; append `content` to the response bubble |
| `done` | Replace all bubble content with `reply`; finalize the bubble |
| `message_id` | Store `message_id` for edit/delete/regenerate |
| `error` | Remove bubble; show **Something went wrong. Please try again.** (or `message`) |

### File upload events (only when request included `files`)

| Event | What to show |
|-------|--------------|
| `file_uploading` `status: "reading"` | Mark **Reading documents** step active. If `total > 1`, show **Reading {total} documents** |
| `file_uploading` `status: "analysing"` | Mark **Reading** step done; mark **Classifying documents** step active |
| `file_uploading` `status: "classifying"` | Update classify step label: **Classifying {index} of {total}** (or **Classifying document** if `total === 1`) |
| `file_uploading` `status: "classified"` | Mark **Classifying** step done; if no audio in request, mark **Generating response** step active |
| `file_uploading` `status: "done"` | If no audio in request, mark **Generating response** step active (fallback; may already be active from `classified`) |

### Audio events (only when request included `audio`)

| Event | What to show |
|-------|--------------|
| `audio_transcribing` `status: "start"` | Mark **Transcribing audio** step active |
| `audio_transcribing` `status: "done"` | Mark **Transcribing** step done; mark **Generating response** step active |

### Progress tracker steps by request type

| Request type | Steps (in order) |
|--------------|------------------|
| Files only | Reading documents → Classifying documents → Generating response |
| Audio only | Transcribing audio → Generating response |
| Files + audio | Reading documents → Classifying documents → Transcribing audio → Generating response |
| Plain text (no files, no audio) | No steps — use placeholder text only (Thinking… → Generating response… → streamed text) |

### Step states

Each step has three states: **pending** (○), **active** (↻ spinner), **done** (✓ + elapsed time). When `text` arrives, remove the entire tracker and stream the response into the bubble.

### Key rules

- **Replace, never append** — Placeholder and step labels are updated in-place. Only `text` events append content.
- **`classified` before audio** — When both files and audio are present, `classified` marks the classify step done *before* audio transcription starts. Do not wait for `file_uploading: done`.
- **`done` is canonical** — When `done` arrives, replace all displayed text with `reply`. Do not keep accumulated streaming chunks.

---

## 6. Supporting REST APIs

### GET `/api/conversation`

Load conversation history (paginated, newest first).

**Query params:**

| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| `user_id` | Yes | — | User reference |
| `lead_id` | No | `"general"` | Lead/contact |
| `limit` | No | 20 | Messages per page |
| `before_id` | No | — | Load messages older than this ID |

**Response:**

```json
{
  "id": "69a10e3d38ac53616e25e054",
  "user_id": "user-123",
  "lead_id": "general",
  "messages": [
    {
      "id": "msg-abc123",
      "role": "user",
      "content": "Summarize the offer",
      "tool_exchanges": null,
      "attachments": null,
      "document_attachments": null,
      "voice_attachments": null,
      "created_at": "2026-03-05T05:22:43.938000Z"
    },
    {
      "id": "msg-abc124",
      "role": "assistant",
      "content": "Here is the summary...",
      "tool_exchanges": [
        { "name": "get_crm_knowledge", "arguments": { "topic": "lead_summary" }, "result": "..." }
      ],
      "attachments": null,
      "created_at": "2026-03-05T05:22:44.100000Z"
    }
  ],
  "has_more": true,
  "count": 20
}
```

**Message fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Message ObjectId |
| `role` | `"user"` \| `"assistant"` | Sender |
| `content` | string | Message text |
| `tool_exchanges` | array \| null | Assistant only: `[{name, arguments, result}]` — tools used to produce the reply |
| `attachments` | array \| null | Merged list of document + voice attachments (backward compat) |
| `document_attachments` | array \| null | `[{filename, subject?, extracted_text?, fields?, page_count?}]` |
| `voice_attachments` | array \| null | `[{filename, transcript, diarization?, detected_lang?}]` |
| `created_at` | string | ISO 8601 timestamp |

**Pagination:**
- Initial load: omit `before_id`
- Load older messages: pass `messages[0].id` from the current view as `before_id`
- Show a "load older" control when `has_more === true`

**Document attachment shape:**

```json
{
  "filename": "report.pdf",
  "subject": "Uploaded: report.pdf",
  "extracted_text": "Full extracted text…",
  "fields": { "page_1": { "name": "John", "amount": "50,000 €" } },
  "page_count": 1
}
```

**Voice attachment shape:**

```json
{
  "type": "voice",
  "filename": "call.mp3",
  "transcript": "Hello, this is the customer…",
  "diarization": "Speaker 1: Hello…",
  "detected_lang": "de"
}
```

---

### DELETE `/api/conversation/message/{message_id}`

Delete a user message and all messages after it (cascade).

**Query params:** `user_id`

**Response:** `{"deleted": true, "message_id": "...", "deleted_count": 3}`

> Deletion also removes the affected messages' document and audio entries from the conversation's stored context, keeping future LLM responses clean.

---

### GET `/api/conversations`

List all conversations for a user.

**Query params:** `user_id`, `limit` (default 50)

**Response:**

```json
{
  "conversations": [
    { "lead_id": "general", "title": "...", "message_count": 5, "updated_at": "2026-03-05T06:00:00Z" }
  ]
}
```

---

### DELETE `/api/conversation`

Delete the entire conversation and all its messages.

**Query params:** `user_id`, `lead_id`

**Response:** `{"deleted": true, "user_id": "...", "lead_id": "..."}`
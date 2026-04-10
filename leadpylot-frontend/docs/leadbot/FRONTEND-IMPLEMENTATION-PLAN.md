# Leadbot Frontend Implementation Plan

**Goal:** Build the frontend against the API contract now. When the backend is ready, it works automatically with minimal/no changes.

**Strategy:** Contract-first development with a mock adapter. Same service interface, switchable implementation.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Components                              │
│  (Chat, Email Classifier, Document Upload, Audio Transcribe)    │
└────────────────────────────┬────────────────────────────────────┘
                              │
┌────────────────────────────▼────────────────────────────────────┐
│                    Custom Hooks (TanStack Query)                  │
│  useLeadbotChat, useClassifyEmail, useExtractDocument, etc.      │
└────────────────────────────┬────────────────────────────────────┘
                              │
┌────────────────────────────▼────────────────────────────────────┐
│                    LeadbotService (API layer)                     │
│  Single interface - calls real API or mock based on config       │
└────────────────────────────┬────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
┌─────────────▼─────────────┐   ┌─────────────▼─────────────┐
│   Real API Client         │   │   Mock Adapter            │
│   (when backend ready)    │   │   (during development)   │
│   Axios + X-API-Key       │   │   Returns fixture data    │
└───────────────────────────┘   └───────────────────────────┘
```

**Switch mechanism:** `NEXT_PUBLIC_LEADBOT_MOCK=true` → use mock. When backend is ready, set `false` or remove → real API.

---

## 2. Implementation Phases

### Phase 1: Foundation (Do First)

| Task | Files | Description |
|------|-------|-------------|
| 1.1 Types | `src/types/leadbot.types.ts` | Request/response types from API spec |
| 1.2 Config | `src/configs/leadbot.config.ts` | Base URL, API key, mock flag from env |
| 1.3 API Client | `src/services/leadbot/LeadbotApiClient.ts` | Axios instance with X-API-Key, X-Request-ID |
| 1.4 Mock Adapter | `src/services/leadbot/LeadbotMockAdapter.ts` | Returns typed mock data for each endpoint |
| 1.5 Service | `src/services/leadbot/LeadbotService.ts` | Single interface: `mock ? MockAdapter : ApiClient` |
| 1.6 Env vars | `.env.example` | Document `LEADBOT_API_BASE`, `LEADBOT_API_KEY`, `LEADBOT_MOCK` |

**Result:** Service layer ready. No UI yet.

---

### Phase 2: Core Hooks (TanStack Query)

| Task | Files | Description |
|------|-------|-------------|
| 2.1 Health | `src/hooks/leadbot/useLeadbotHealth.ts` | `useQuery` for GET /health |
| 2.2 Classify Email | `src/hooks/leadbot/useClassifyEmail.ts` | `useMutation` for POST /api/classify-email |
| 2.3 Extract Document | `src/hooks/leadbot/useExtractDocument.ts` | `useMutation` for POST /api/extract-document |
| 2.4 Conversation | `src/hooks/leadbot/useLeadbotConversation.ts` | `useMutation` (send) + `useQuery` (get history) |
| 2.5 Transcribe | `src/hooks/leadbot/useTranscribeAudio.ts` | `useMutation` for POST /api/audio/transcribe |
| 2.6 Transcribe Status | `src/hooks/leadbot/useTranscribeStatus.ts` | `useQuery` for GET /api/audio/transcribe/status |

**Result:** All API operations exposed as hooks. Works with mock or real API.

---

### Phase 3: UI Integration Points

Where Leadbot features plug into existing LeadPylot UI:

| Feature | Integration Point | Notes |
|---------|-------------------|-------|
| **Lead Chat** | Lead detail drawer / sidebar | Chat about a lead with context |
| **Email Classification** | Inbox / mail dashboard | Classify incoming emails, suggest slot/agent |
| **Document Extraction** | Document upload flow | Extract text from PDFs/images before storing |
| **Email Draft** | Compose email | Ask AI for draft with `emails` context |
| **Audio Transcription** | Call recordings / notes | Transcribe calls, optional diarize/summary |
| **General CRM Chat** | Global assistant / command palette | `lead_id: "general"` for CRM queries |

**Result:** Clear mapping of where each hook/feature will be used.

---

### Phase 4: UI Components (Build Incrementally)

| Component | Purpose | Depends On |
|-----------|---------|------------|
| `LeadbotChat` | Chat UI for lead or general | useLeadbotConversation |
| `EmailClassifierBadge` | Show slot/agent suggestion | useClassifyEmail |
| `DocumentExtractUpload` | Upload + extract in one flow | useExtractDocument |
| `AudioTranscribeUpload` | Upload audio, get transcript | useTranscribeAudio |
| `LeadbotHealthIndicator` | Status dot (optional) | useLeadbotHealth |

**Result:** Reusable components that work with mock data during dev.

---

## 3. Key Implementation Details

### 3.1 Environment Variables

```env
# Leadbot API (add to .env.example)
NEXT_PUBLIC_LEADBOT_API_BASE=http://localhost:8000
NEXT_PUBLIC_LEADBOT_API_KEY=your-api-key-here
NEXT_PUBLIC_LEADBOT_MOCK=true   # Set false when backend is ready
```

- **Mock mode:** When `LEADBOT_MOCK=true`, `LeadbotService` uses `LeadbotMockAdapter` instead of HTTP.
- **Real mode:** When `LEADBOT_MOCK=false` or unset, uses `LeadbotApiClient` with real requests.

---

### 3.2 Leadbot API Client (Separate from Monolith)

Leadbot uses **X-API-Key** (not the main app's auth). Create a dedicated axios instance:

```typescript
// LeadbotApiClient.ts - simplified
const leadbotAxios = axios.create({
  baseURL: leadbotConfig.baseUrl,
  headers: {
    'X-API-Key': leadbotConfig.apiKey,
    'X-Request-ID': crypto.randomUUID(), // per request
  },
});
```

**Do NOT** route Leadbot through `MicroserviceRouter` or `AxiosBase` — it has different auth and base URL.

---

### 3.3 Mock Adapter Contract

The mock adapter must implement the same interface as the real client:

```typescript
// LeadbotService.ts
const client = leadbotConfig.mock
  ? new LeadbotMockAdapter()
  : new LeadbotApiClient(leadbotConfig);

export const LeadbotService = {
  getHealth: () => client.getHealth(),
  classifyEmail: (body) => client.classifyEmail(body),
  extractDocument: (files) => client.extractDocument(files),
  sendMessage: (body) => client.sendMessage(body),
  getConversation: (params) => client.getConversation(params),
  getTranscribeStatus: () => client.getTranscribeStatus(),
  transcribeAudio: (formData) => client.transcribeAudio(formData),
  transcribeElevenLabs: (formData) => client.transcribeElevenLabs(formData),
};
```

Mock returns **realistic typed data** so UI can be built and tested without backend.

---

### 3.4 Error Handling

Handle API errors consistently (from docs):

| Status | Action |
|--------|--------|
| 401 | Show "Invalid API key" / redirect to settings |
| 422 | Show validation errors from `details` |
| 502/503 | Show "Service temporarily unavailable" |

Create `LeadbotApiError` type and handle in hooks/components.

---

### 3.5 File Upload Limits (from API spec)

| Type | Limit |
|------|-------|
| Documents (extract) | 20 MB per file, PDF/PNG/JPEG/WebP |
| Audio (transcribe) | 100 MB, MP3/WAV/M4A/OGG/FLAC/WebM/MP4 |
| Message | 10,000 chars |

Validate in UI before upload to avoid 400 errors.

---

## 4. File Structure

```
src/
├── configs/
│   └── leadbot.config.ts
├── types/
│   └── leadbot.types.ts
├── services/
│   └── leadbot/
│       ├── LeadbotApiClient.ts
│       ├── LeadbotMockAdapter.ts
│       ├── LeadbotService.ts
│       └── fixtures/           # Mock data
│           ├── classifyEmail.json
│           ├── conversation.json
│           └── ...
├── hooks/
│   └── leadbot/
│       ├── useLeadbotHealth.ts
│       ├── useClassifyEmail.ts
│       ├── useExtractDocument.ts
│       ├── useLeadbotConversation.ts
│       ├── useTranscribeAudio.ts
│       └── useTranscribeStatus.ts
└── components/
    └── leadbot/
        ├── LeadbotTab.tsx
        ├── LeadbotChat/
        │   └── ...
        ├── EmailClassifierBadge.tsx
        └── ...
```

---

## 5. Switching to Real API (When Backend Is Ready)

1. Set `NEXT_PUBLIC_LEADBOT_MOCK=false` (or remove the var).
2. Set `NEXT_PUBLIC_LEADBOT_API_BASE` to production URL if needed.
3. Set `NEXT_PUBLIC_LEADBOT_API_KEY` to the real key.
4. No code changes required — the service layer abstracts the implementation.

---

## 6. Optional: Add to Microservices Config

If you want Leadbot to follow the same pattern as other services (for consistency), add to `microservices.config.ts`:

```typescript
LEADBOT_SERVICE: {
  name: 'Leadbot Service',
  baseUrl: getServiceUrl('NEXT_PUBLIC_LEADBOT_API_BASE', 8000),
  endpoints: [
    '/api/classify-email',
    '/api/extract-document',
    '/api/conversation',
    '/api/audio/transcribe',
    '/api/audio/transcribe/status',
    '/api/audio/transcribe/elevenlabs',
    '/health',
    '/',
  ],
  description: 'AI-powered email classification, document extraction, chat, and audio transcription',
},
```

**Note:** Leadbot uses `X-API-Key`, not the main app token. The MicroserviceRouter would only handle base URL; you'd still need a custom axios instance or request interceptor for Leadbot-specific headers. A **dedicated LeadbotApiClient** is simpler and recommended.

---

## 7. Summary

| Question | Answer |
|----------|--------|
| Can frontend be built before backend? | **Yes.** Use mock adapter. |
| Will it work when backend is done? | **Yes.** Flip `LEADBOT_MOCK=false`, set real URL/key. |
| Code changes when switching? | **None.** Service layer hides implementation. |
| Follows project patterns? | **Yes.** Services, TanStack Query, env-based config. |

---

## 8. Suggested Order of Implementation

1. **Phase 1** (Foundation) — types, config, API client, mock adapter, service
2. **Phase 2** (Hooks) — one hook at a time, test with mock
3. **Phase 4** (UI) — start with `LeadbotChat` (highest value), then others as needed
4. **Phase 3** (Integration) — wire components into existing pages when ready

Start with Phase 1; it unblocks everything else.

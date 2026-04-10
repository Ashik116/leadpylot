# Leadbot — Real API Connection Plan

**Goal:** Connect the Leadbot frontend to the real API instead of mock data.

**API Base URL:** `https://activity-keyword-basket-styles.trycloudflare.com/`

**Status:** Frontend is already built to use real API. Only configuration changes are required.

---

## 1. Summary

The Leadbot frontend uses a **config-driven switch** between mock and real API:

- `NEXT_PUBLIC_LEADBOT_MOCK=true` → Mock adapter (fake responses)
- `NEXT_PUBLIC_LEADBOT_MOCK=false` or unset → Real API via `LeadbotApiClient`

**No code changes are needed.** Update environment variables and restart the app.

---

## 2. Implementation Steps

### Step 1: Get API Key

Obtain the API key from your Leadbot backend. All `/api/*` endpoints require the `X-API-Key` header.

- Check backend docs or env for `LEADBOT_API_KEY` or similar
- If no key is required yet, use a placeholder (e.g. `dev-key`) — the backend may return 401 if invalid

### Step 2: Update Environment Variables

Create or edit `.env.local` in the project root:

```env
# Leadbot API — Real connection
NEXT_PUBLIC_LEADBOT_API_BASE=https://activity-keyword-basket-styles.trycloudflare.com
NEXT_PUBLIC_LEADBOT_API_KEY=your-actual-api-key-here
NEXT_PUBLIC_LEADBOT_MOCK=false
```

**Notes:**

- No trailing slash on base URL (Axios appends paths like `/api/conversation`)
- `NEXT_PUBLIC_` prefix is required for Next.js client-side access
- `NEXT_PUBLIC_LEADBOT_MOCK=false` switches from mock to real API

### Step 3: Restart Dev Server

```bash
npm run dev
```

Environment variables are read at build/start. Restart after changing them.

### Step 4: Verify Connection

1. Open a lead detail page → Leadbot tab → Chat
2. Send a message
3. If the real API responds, you should see its reply instead of mock text
4. Check browser Network tab: requests should go to `https://activity-keyword-basket-styles.trycloudflare.com/api/...`

---

## 3. API Endpoints Used by Frontend

| Feature | Endpoint | Method | When Called |
|---------|----------|--------|-------------|
| Chat history | `/api/conversation` | GET | On load |
| Send message | `/api/conversation` | POST (JSON) | User sends text |
| Send message + files | `/api/conversation` | POST (multipart) | User attaches files |
| Classify email | `/api/classify-email` | POST | User clicks Classify |
| Extract document | `/api/extract-document` | POST | User uploads & extracts |
| Transcribe status | `/api/audio/transcribe/status` | GET | On Transcribe tab load |
| Transcribe audio | `/api/audio/transcribe` | POST | User uploads audio |

---

## 4. Authentication

All `/api/*` requests send:

| Header | Value |
|--------|-------|
| `X-API-Key` | From `NEXT_PUBLIC_LEADBOT_API_KEY` |
| `X-Request-ID` | Auto-generated UUID per request |
| `Content-Type` | `application/json` or `multipart/form-data` as needed |

---

## 5. Error Handling

The frontend already handles:

- **401** — Invalid or missing API key (user sees error message)
- **4xx/5xx** — Generic error display with retry where applicable
- **Network errors** — Shown in UI

If you see 401, verify `NEXT_PUBLIC_LEADBOT_API_KEY` matches the backend.

---

## 6. CORS

If the API is on a different origin (e.g. Cloudflare tunnel), ensure the backend allows:

- Origin: your frontend URL (e.g. `http://localhost:3000`)
- Methods: `GET`, `POST`
- Headers: `X-API-Key`, `X-Request-ID`, `Content-Type`

---

## 7. Optional: Health Check

To confirm the API is reachable before using features:

```bash
curl -s https://activity-keyword-basket-styles.trycloudflare.com/health
```

Expected: `{"status":"ok",...}` or similar.

---

## 8. Checklist

- [ ] Add `NEXT_PUBLIC_LEADBOT_API_BASE` to `.env.local`
- [ ] Add `NEXT_PUBLIC_LEADBOT_API_KEY` to `.env.local`
- [ ] Set `NEXT_PUBLIC_LEADBOT_MOCK=false`
- [ ] Restart dev server
- [ ] Test Chat (send message)
- [ ] Test Classify (subject + body)
- [ ] Test Documents (upload + extract)
- [ ] Test Transcribe (if available)
- [ ] Test file upload in Chat (if supported)

---

## 9. Reverting to Mock

To switch back to mock data:

```env
NEXT_PUBLIC_LEADBOT_MOCK=true
```

Restart the dev server. No other changes needed.

---

## 10. Related Files

| File | Purpose |
|------|---------|
| `src/configs/leadbot.config.ts` | Reads env, exposes baseUrl, apiKey, mock |
| `src/services/leadbot/LeadbotService.ts` | Chooses LeadbotApiClient vs LeadbotMockAdapter |
| `src/services/leadbot/LeadbotApiClient.ts` | Axios client, real API calls |
| `.env.local` | Local env overrides (not committed) |

---

## 11. Production Deployment

For production:

1. Set env vars in your hosting platform (Vercel, etc.)
2. Use production API URL if different from dev
3. Use production API key
4. Set `NEXT_PUBLIC_LEADBOT_MOCK=false`

Never commit `.env.local` or real API keys to git.

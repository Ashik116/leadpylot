# Leadbot API Connection — Chat Report

**Date:** March 2, 2025  
**Topic:** Connecting Leadbot frontend to real API (no mock data)  
**API Base URL:** `https://activity-keyword-basket-styles.trycloudflare.com/`

---

## 1. Request Summary

User requested:
- Connect frontend to real Leadbot API (not mock data)
- API base URL: `https://activity-keyword-basket-styles.trycloudflare.com/`
- Implementation plan
- Markdown report
- Chat report

---

## 2. Findings

The frontend is **already implemented** to use the real API. No code changes are required.

**Current architecture:**
- `leadbot.config.ts` reads env: `NEXT_PUBLIC_LEADBOT_API_BASE`, `NEXT_PUBLIC_LEADBOT_API_KEY`, `NEXT_PUBLIC_LEADBOT_MOCK`
- `LeadbotService.ts` switches: `mock ? LeadbotMockAdapter : LeadbotApiClient`
- `LeadbotApiClient.ts` uses Axios with `baseURL` and `X-API-Key` header
- All endpoints (conversation, classify, extract, transcribe) go through this client

---

## 3. Implementation Plan (Summary)

| Step | Action | Details |
|------|--------|---------|
| 1 | Get API key | From backend; required for `/api/*` |
| 2 | Update `.env.local` | Set base URL, API key, `MOCK=false` |
| 3 | Restart dev server | Env vars loaded at startup |
| 4 | Verify | Test Chat, Classify, Documents, Transcribe |

**Required env vars:**
```
NEXT_PUBLIC_LEADBOT_API_BASE=https://activity-keyword-basket-styles.trycloudflare.com
NEXT_PUBLIC_LEADBOT_API_KEY=<your-api-key>
NEXT_PUBLIC_LEADBOT_MOCK=false
```

---

## 4. Deliverables

| Document | Path | Purpose |
|----------|------|---------|
| Implementation plan | `docs/leadbot/LEADBOT-REAL-API-CONNECTION-PLAN.md` | Step-by-step connection guide |
| Chat report | `docs/leadbot/LEADBOT-API-CONNECTION-CHAT-REPORT.md` | This summary |

---

## 5. API Endpoints Used

| Feature | Endpoint | Auth |
|---------|----------|------|
| Chat | GET/POST `/api/conversation` | X-API-Key |
| Classify | POST `/api/classify-email` | X-API-Key |
| Extract | POST `/api/extract-document` | X-API-Key |
| Transcribe | GET `/api/audio/transcribe/status`, POST `/api/audio/transcribe` | X-API-Key |

---

## 6. Next Steps for User

1. Obtain API key from backend
2. Add/update `.env.local` with the three variables above
3. Restart `npm run dev`
4. Test each Leadbot tab (Chat, Documents, Transcribe, Email Draft, Classify)
5. If 401 errors occur, verify API key; if CORS errors occur, update backend CORS config

---

## 7. Rollback

To revert to mock data: set `NEXT_PUBLIC_LEADBOT_MOCK=true` and restart.

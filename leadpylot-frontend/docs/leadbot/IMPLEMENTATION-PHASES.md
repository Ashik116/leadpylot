# Leadbot Implementation Phases

**Goal:** Implement the Leadbot tab in the Lead detail RightSidebar with a scalable, frontend-only approach.

**Folder structure:** `src/components/leadbot/` + `src/hooks/leadbot/` + `src/services/leadbot/`

---

## Phase 1: Foundation & Tab Shell

**Objective:** Create folder structure, types, and a visible Leadbot tab with placeholder content.

| Step | Task | File(s) | Deliverable |
|------|------|---------|-------------|
| 1.1 | Create types | `src/types/leadbot.types.ts` | Request/response interfaces for conversation, classify, etc. |
| 1.2 | Create LeadbotTab shell | `src/components/leadbot/LeadbotTab.tsx` | Tab container with placeholder content |
| 1.3 | Create LeadbotChat placeholder | `src/components/leadbot/LeadbotChat/LeadbotChat.tsx` | Empty state or "Coming soon" message |
| 1.4 | Add Leadbot tab to FilterTabsHeader | `RightSidebar/FilterTabsHeader.tsx` | New tab label "Leadbot" |
| 1.5 | Add conditional render in UpdatesFilterTabs | `RightSidebar/UpdatesFilterTabs.tsx` | Render LeadbotTab when `activeFilter === 'leadbot'` |

**Result:** User can click "Leadbot" tab and see placeholder content. No API yet.

**Dependencies:** None

---

## Phase 2: Config & Service Layer (Optional for MVP)

**Objective:** Set up config and service layer for future API integration.

| Step | Task | File(s) | Deliverable |
|------|------|---------|-------------|
| 2.1 | Create config | `src/configs/leadbot.config.ts` | Base URL, API key, mock flag from env |
| 2.2 | Create API types | `src/types/leadbot.types.ts` (extend) | Full API request/response types |
| 2.3 | Create API client | `src/services/leadbot/LeadbotApiClient.ts` | Axios instance with X-API-Key |
| 2.4 | Create mock adapter | `src/services/leadbot/LeadbotMockAdapter.ts` | Returns typed mock data |
| 2.5 | Create service | `src/services/leadbot/LeadbotService.ts` | Single interface, switches mock/real by config |

**Result:** Service layer ready. Can be deferred if focusing on UI first.

**Dependencies:** Phase 1 types

---

## Phase 3: Conversation Hook & Chat UI

**Objective:** Build working chat UI with send message and history.

| Step | Task | File(s) | Deliverable |
|------|------|---------|-------------|
| 3.1 | Create useLeadbotConversation hook | `src/hooks/leadbot/useLeadbotConversation.ts` | useMutation (send) + useQuery (history) |
| 3.2 | Create LeadbotChatMessage | `src/components/leadbot/LeadbotChat/LeadbotChatMessage.tsx` | Single message bubble (user/assistant) |
| 3.3 | Create LeadbotChatInput | `src/components/leadbot/LeadbotChat/LeadbotChatInput.tsx` | Text input + send button |
| 3.4 | Create LeadbotChatEmpty | `src/components/leadbot/LeadbotChat/LeadbotChatEmpty.tsx` | Empty state when no messages |
| 3.5 | Wire LeadbotChat | `src/components/leadbot/LeadbotChat/LeadbotChat.tsx` | Compose messages + input, use hook |

**Result:** User can type and send messages, see conversation (mock or real).

**Dependencies:** Phase 1, Phase 2 (or mock data inline for UI-only)

---

## Phase 4: Polish & Error States

**Objective:** Loading states, error handling, empty states.

| Step | Task | File(s) | Deliverable |
|------|------|---------|-------------|
| 4.1 | Add loading state | LeadbotChat.tsx | Skeleton or spinner while fetching history |
| 4.2 | Add error state | LeadbotChat.tsx | Error message + retry when API fails |
| 4.3 | Add lead context | LeadbotChat.tsx | Pass lead data to conversation for context |
| 4.4 | Responsive layout | LeadbotTab, LeadbotChat | Works in leadExpandView and normal sidebar |

**Result:** Chat feels complete with proper UX.

**Dependencies:** Phase 3

---

## Phase 5: Future Features (Backlog)

**Objective:** Additional Leadbot capabilities as needed.

| Feature | Component | Hook | Integration Point |
|---------|-----------|------|-------------------|
| Email classification | LeadbotEmailClassifier | useClassifyEmail | Inbox / email tab |
| Document extraction | LeadbotDocumentExtract | useExtractDocument | Document upload flow |
| Email draft | LeadbotEmailDraft | useLeadbotConversation (emails) | Compose email |
| Audio transcription | LeadbotAudioTranscribe | useTranscribeAudio | Call recordings |
| General CRM chat | LeadbotChat (leadId: "general") | useLeadbotConversation | Global assistant |

**Result:** Roadmap for future work. Implement when required.

---

## Implementation Order Summary

```
Phase 1 (MVP)     → Phase 3 (Chat)     → Phase 4 (Polish)
     │                    │                     │
     └────────────────────┴─────────────────────┘
                          │
              Phase 2 (Services) — can run in parallel or after Phase 1
```

**Recommended order for fastest visible result:**

1. **Phase 1** — Tab visible, placeholder content
2. **Phase 3** — Chat UI (with inline mock data if Phase 2 deferred)
3. **Phase 2** — Service layer (when ready for API integration)
4. **Phase 4** — Polish

---

## File Checklist

### Phase 1
- [ ] `src/types/leadbot.types.ts`
- [ ] `src/components/leadbot/LeadbotTab.tsx`
- [ ] `src/components/leadbot/LeadbotChat/LeadbotChat.tsx`
- [ ] Modify `FilterTabsHeader.tsx`
- [ ] Modify `UpdatesFilterTabs.tsx`

### Phase 2
- [ ] `src/configs/leadbot.config.ts`
- [ ] `src/services/leadbot/LeadbotApiClient.ts`
- [ ] `src/services/leadbot/LeadbotMockAdapter.ts`
- [ ] `src/services/leadbot/LeadbotService.ts`

### Phase 3
- [ ] `src/hooks/leadbot/useLeadbotConversation.ts`
- [ ] `src/components/leadbot/LeadbotChat/LeadbotChatMessage.tsx`
- [ ] `src/components/leadbot/LeadbotChat/LeadbotChatInput.tsx`
- [ ] `src/components/leadbot/LeadbotChat/LeadbotChatEmpty.tsx`
- [ ] Update `LeadbotChat.tsx` (wire hook + sub-components)

### Phase 4
- [ ] Loading/error/empty states in LeadbotChat
- [ ] Lead context passed to conversation
- [ ] Responsive layout for leadExpandView

---

## Related Docs

- [Leadbot Tab Implementation Plan](./LEADBOT-TAB-IMPLEMENTATION-PLAN.md) — Folder structure, RightSidebar integration
- [Frontend Implementation Plan](./FRONTEND-IMPLEMENTATION-PLAN.md) — Service layer, mock adapter, hooks
- [Leadbot Service API](./Leadbot-Service-API.md) — API reference

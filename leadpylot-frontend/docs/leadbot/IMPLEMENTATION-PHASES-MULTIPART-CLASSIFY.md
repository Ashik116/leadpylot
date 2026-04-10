# Leadbot — Multipart Conversation & Classify Advanced Options

**Goal:** Implement file upload in chat and full classify-email options per API docs.

**Reference:** [Leadbot Service API](./Leadbot-Service-API.md)

---

## Phase 6: Classify Advanced Options

**Objective:** Expose optional classify-email fields and display full response.

**Dependencies:** Phase 5 (LeadbotEmailClassifier exists)

| Step | Task | File(s) | Deliverable |
|------|------|---------|-------------|
| 6.1 | Extend useClassifyEmail | `src/hooks/leadbot/useClassifyEmail.ts` | Accept full `LeadbotClassifyEmailRequest` |
| 6.2 | Add direction selector | `LeadbotEmailClassifier.tsx` | Incoming / Outgoing radio or select |
| 6.3 | Add is_reply toggle | `LeadbotEmailClassifier.tsx` | Checkbox |
| 6.4 | Add parent fields (conditional) | `LeadbotEmailClassifier.tsx` | parent_subject, parent_slot when is_reply |
| 6.5 | Display is_opening | `LeadbotEmailClassifier.tsx` | "New thread" vs "Reply" in result |
| 6.6 | Display situation_summary | `LeadbotEmailClassifier.tsx` | In result section |
| 6.7 | Display attachment_slots | `LeadbotEmailClassifier.tsx` | Per-attachment slots if present |

**Result:** Classify UI supports direction, reply detection, parent context; shows full API response.

---

## Phase 7: Multipart Conversation (File Upload in Chat)

**Objective:** Allow uploading PDF/images in chat; API extracts and uses them as context.

**Dependencies:** Phase 3 (LeadbotChat, useLeadbotConversation)

### 7.1 Service Layer

| Step | Task | File(s) | Deliverable |
|------|------|---------|-------------|
| 7.1.1 | Add sendMessageWithFiles | `LeadbotApiClient.ts` | FormData with files + JSON fields |
| 7.1.2 | Add LeadbotFileUploadResponse handling | `leadbot.types.ts` | documents, message (for file-only response) |
| 7.1.3 | Add sendMessageWithFiles to service | `LeadbotService.ts` | Delegate to client |
| 7.1.4 | Add mock for multipart | `LeadbotMockAdapter.ts` | Return mock documents + message |

### 7.2 Hook Layer

| Step | Task | File(s) | Deliverable |
|------|------|---------|-------------|
| 7.2.1 | Add sendMessageWithFiles to useLeadbotConversation | `useLeadbotConversation.ts` | Mutation with files + optional message |
| 7.2.2 | Handle file-only response | `useLeadbotConversation.ts` | Merge documents + prompt into messages |
| 7.2.3 | Optimistic update | `useLeadbotConversation.ts` | Add user message for upload, then AI reply |

### 7.3 UI Layer

| Step | Task | File(s) | Deliverable |
|------|------|---------|-------------|
| 7.3.1 | Add file input to LeadbotChatInput | `LeadbotChatInput.tsx` | Attach button, hidden input |
| 7.3.2 | Show selected files | `LeadbotChatInput.tsx` | Chips or list with remove |
| 7.3.3 | Extend onSend callback | `LeadbotChatInput.tsx` | `onSend(message, files?)` |
| 7.3.4 | Wire in LeadbotChat | `LeadbotChat.tsx` | Use sendMessageWithFiles when files present |
| 7.3.5 | File limits | `LeadbotChatInput.tsx` | Max 20 MB, types: PDF, PNG, JPEG, WebP |

**Result:** User can attach files in chat; API extracts and uses them as context.

---

## Phase 8: Classify with Attachments (Optional)

**Objective:** Support extract → classify flow with attachments.

**Dependencies:** Phase 6, Phase 5 (extract-document)

| Step | Task | File(s) | Deliverable |
|------|------|---------|-------------|
| 8.1 | Add attachments upload/extract in classifier | `LeadbotEmailClassifier.tsx` | Optional: upload files → extract → pass to classify |
| 8.2 | Or link to Documents tab | `LeadbotEmailClassifier.tsx` | "Use extracted documents" flow |

**Result:** Classify can use attachments from extract-document output.

---

## Implementation Order

```
Phase 6 (Classify)  ────────► Phase 8 (Classify + Attachments) [optional]
     │
Phase 7 (Multipart)   [can run in parallel with Phase 6]
```

**Recommended order:**

1. **Phase 6** — Classify advanced options (smaller, UI-only)
2. **Phase 7** — Multipart conversation (service + hook + UI)
3. **Phase 8** — Classify with attachments (optional, later)

---

## File Checklist

### Phase 6 ✅
- [x] `src/hooks/leadbot/useClassifyEmail.ts` — accept full request
- [x] `src/components/leadbot/LeadbotEmailClassifier/LeadbotEmailClassifier.tsx` — direction, is_reply, parent fields, full result display

### Phase 7 ✅
- [x] `src/types/leadbot.types.ts` — LeadbotSendMessageWithFilesParams, LeadbotSendMessageWithFilesResponse
- [x] `src/services/leadbot/LeadbotApiClient.ts` — sendMessageWithFiles
- [x] `src/services/leadbot/LeadbotService.ts` — sendMessageWithFiles
- [x] `src/services/leadbot/LeadbotMockAdapter.ts` — sendMessageWithFiles mock
- [x] `src/hooks/leadbot/useLeadbotConversation.ts` — sendMessageWithFiles, sendMessageOrWithFiles
- [x] `src/components/leadbot/LeadbotChat/LeadbotChatInput.tsx` — file picker, chips, onSend(message, files?)
- [x] `src/components/leadbot/LeadbotChat/LeadbotChat.tsx` — wire sendMessageOrWithFiles

### Phase 8 ✅
- [x] `LeadbotEmailClassifier.tsx` — attachments upload, extract, pass to classify

---

## Related Docs

- [Leadbot Service API](./Leadbot-Service-API.md)
- [Leadbot API Doc](./Leadbot-API-Doc.md)
- [Leadbot API Use Case Reference](./Leadbot-API-Use-Case-Reference.md)
- [Implementation Phases](./IMPLEMENTATION-PHASES.md)

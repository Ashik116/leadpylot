# Leadbot Tab — Folder Structure & Implementation Plan

**Goal:** Add a "Leadbot" tab to the Lead detail RightSidebar, with a scalable structure for future API growth.

---

## 1. Current RightSidebar Structure

```
RightSidebar/
├── UpdatesFilterTabs.tsx    # Tab container, state, renders FilterTabsHeader + tab content
├── FilterTabsHeader.tsx      # Tab labels: All | Status | Email | Tasks | Comments
├── UpdatesTab.tsx           # Content for all non-Leadbot tabs (activities, notes)
├── EmailTab.tsx
├── ToDoTab.tsx
├── useActivities.ts
├── useNotes.tsx
└── skeletons/
```

**Flow:** `FilterType` → `UpdatesTab` filters content by type. Leadbot needs **different content** (chat UI), not filtered activities.

---

## 2. Proposed Folder Structure (Scalable & Future-Ready)

```
src/
├── components/
│   └── leadbot/                       # All Leadbot UI components
│       ├── LeadbotTab.tsx             # Tab content - entry point for RightSidebar
│       ├── LeadbotChat/               # Chat feature (can have sub-components)
│       │   ├── LeadbotChat.tsx
│       │   ├── LeadbotChatMessage.tsx
│       │   ├── LeadbotChatInput.tsx
│       │   └── LeadbotChatEmpty.tsx
│       ├── LeadbotDocumentExtract/   # Future: document upload + extract
│       │   └── ...
│       ├── LeadbotEmailDraft/         # Future: email draft assistant
│       │   └── ...
│       └── LeadbotAudioTranscribe/    # Future: audio transcription
│           └── ...
│
├── hooks/
│   └── leadbot/
│       ├── useLeadbotConversation.ts
│       ├── useLeadbotHealth.ts
│       ├── useClassifyEmail.ts
│       └── ...
│
├── services/
│   └── leadbot/
│       ├── LeadbotService.ts
│       ├── LeadbotApiClient.ts
│       └── LeadbotMockAdapter.ts
│
├── types/
│   └── leadbot.types.ts               # Core API types (request/response)
│
└── app/(protected-pages)/dashboards/leads/[id]/_components/
    └── RightSidebar/
        ├── UpdatesFilterTabs.tsx      # MODIFY: add Leadbot tab, conditional render
        ├── FilterTabsHeader.tsx       # MODIFY: add { value: 'leadbot', label: 'Leadbot' }
        ├── UpdatesTab.tsx
        └── ...
```

---

## 3. Why This Structure?

| Concern | Solution |
|---------|----------|
| **Consistency** | Matches existing project structure (`components/`, `hooks/`, `services/`). |
| **Scalability** | New features → new component folders under `components/leadbot/`, new hooks under `hooks/leadbot/`. |
| **Reusability** | `LeadbotTab` can be used in RightSidebar, a modal, or a standalone page. |
| **Future growth** | Add `LeadbotDocumentExtract`, `LeadbotEmailDraft`, etc. as sub-folders under `components/leadbot/`. |

---

## 4. RightSidebar Integration (Minimal Changes)

### 4.1 FilterTabsHeader.tsx

```diff
const filterTabs: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'status', label: 'Status' },
  { value: 'email', label: 'Email' },
  { value: 'tickets', label: 'Tasks' },
  { value: 'comments', label: 'Comments' },
+ { value: 'leadbot', label: 'Leadbot' },
];
```

### 4.2 UpdatesFilterTabs.tsx

```tsx
// Add 'leadbot' to FilterType
export type FilterType = 'all' | 'status' | 'email' | 'tickets' | 'calls' | 'comments' | 'leadbot';

// In render - conditional content:
<Tabs.TabContent value={activeFilter} className="min-h-0 flex-1 overflow-hidden">
  {activeFilter === 'leadbot' ? (
    <LeadbotTab leadId={leadId} leadExpandView={leadExpandView} />
  ) : (
    <UpdatesTab ... />
  )}
</Tabs.TabContent>
```

### 4.3 RightSidebar.tsx

No changes needed. `FilterType` flows from `UpdatesFilterTabs` → `FilterTabsHeader`.

---

## 5. LeadbotTab Component (Entry Point)

```tsx
// components/leadbot/LeadbotTab.tsx
interface LeadbotTabProps {
  leadId: string | undefined;
  leadExpandView?: boolean;
}

export function LeadbotTab({ leadId, leadExpandView }: LeadbotTabProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <LeadbotChat leadId={leadId} leadExpandView={leadExpandView} />
    </div>
  );
}
```

**Future:** `LeadbotTab` can have internal sub-tabs (Chat | Documents | Email Draft) as Leadbot grows.

---

## 6. Future Growth Path

| Phase | Add Under |
|-------|------------------------------|
| **Now** | `LeadbotTab` + `LeadbotChat` in `components/leadbot/` |
| **+ Email classification** | `LeadbotEmailClassifier` in `components/leadbot/` |
| **+ Document extraction** | `LeadbotDocumentExtract` in `components/leadbot/` |
| **+ Email draft** | `LeadbotEmailDraft` in `components/leadbot/` |
| **+ Audio transcription** | `LeadbotAudioTranscribe` in `components/leadbot/` |
| **+ General CRM chat** | Same `LeadbotChat` with `leadId: "general"` |

Each new feature = new component folder + hook. No refactor of existing structure.

---

## 7. File Creation Order

1. `src/components/leadbot/LeadbotTab.tsx` — tab shell
2. `src/components/leadbot/LeadbotChat/LeadbotChat.tsx` — chat UI (placeholder first)
3. Modify `FilterTabsHeader.tsx` — add Leadbot tab
4. Modify `UpdatesFilterTabs.tsx` — add `leadbot` to FilterType, conditional render

RightSidebar imports: `import { LeadbotTab } from '@/components/leadbot/LeadbotTab';`

---

## 8. Summary

| Item | Decision |
|------|----------|
| **Tab location** | RightSidebar, new "Leadbot" tab alongside All, Status, Email, Tasks, Comments |
| **Folder structure** | `src/components/leadbot/` + `src/hooks/leadbot/` + `src/services/leadbot/` |
| **Scalability** | Sub-folders per feature under `components/leadbot/` (Chat, DocumentExtract, etc.) |
| **RightSidebar changes** | 2 files: FilterTabsHeader (add tab), UpdatesFilterTabs (conditional render) |
| **Lazy load** | Optional: `React.lazy(() => import('@/components/leadbot/LeadbotTab'))` |

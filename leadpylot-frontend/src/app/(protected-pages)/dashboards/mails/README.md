# 📧 Mails V2 - Missive-Inspired Email System

## 🎯 **Overview**

Complete redesign of the email system with Missive-inspired UI/UX and enhanced collaboration features.

## ✨ **Features**

### **Core Email Features:**
- ✅ Three-column layout (Sidebar | Conversations | Detail)
- ✅ Gmail-style threading
- ✅ IMAP/SMTP email management
- ✅ Reply/forward operations
- ✅ Attachment handling

### **Collaboration Features (NEW):**
- ✅ Internal comments
- ✅ @Mentions
- ✅ Presence indicators (who's viewing)
- ✅ Collision detection (prevent duplicate replies)
- ✅ Real-time updates (Socket.IO)
- ✅ Canned responses
- ✅ Email snooze
- ✅ Labels/tags

### **CRM Features (Existing + Enhanced):**
- ✅ Automatic lead matching
- ✅ Approval workflows
- ✅ Agent assignment
- ✅ Email masking
- ✅ Project association
- ✅ Statistics & analytics

## 📁 **Folder Structure**

```
mails-v2/
├── page.tsx                          # Main entry point
├── layout.tsx                        # Email system layout
├── README.md                         # This file
│
├── _components/
│   ├── EmailLayout/
│   │   ├── EmailLayout.tsx          # Three-column layout
│   │   ├── Sidebar.tsx              # Left sidebar (folders, labels)
│   │   ├── ConversationList.tsx     # Middle panel (email list)
│   │   └── EmailDetail.tsx          # Right panel (email content)
│   │
│   ├── Conversation/
│   │   ├── ConversationCard.tsx     # Email card in list
│   │   ├── ConversationThread.tsx   # Full conversation view
│   │   └── MessageBubble.tsx        # Individual message
│   │
│   ├── InternalComments/
│   │   ├── InternalCommentsPanel.tsx # Comments section
│   │   ├── CommentInput.tsx          # Add comment input
│   │   ├── CommentThread.tsx         # Comment list
│   │   ├── CommentBubble.tsx         # Single comment
│   │   └── MentionAutocomplete.tsx   # @mention suggestions
│   │
│   ├── Presence/
│   │   ├── PresenceIndicators.tsx    # Who's viewing
│   │   ├── CollisionWarning.tsx      # Duplicate reply warning
│   │   └── TypingIndicator.tsx       # Someone is typing
│   │
│   ├── Compose/
│   │   ├── ComposeModal.tsx          # New email modal
│   │   ├── ReplyEditor.tsx           # Reply/forward editor
│   │   ├── RichTextEditor.tsx        # Rich text editor
│   │   └── CannedResponsePicker.tsx  # Quick replies
│   │
│   ├── Sidebar/
│   │   ├── FolderList.tsx            # Inbox, Sent, etc.
│   │   ├── LabelList.tsx             # Custom labels
│   │   └── TeamList.tsx              # Team/project filter
│   │
│   └── Actions/
│       ├── QuickActions.tsx          # Hover actions
│       ├── SnoozeMenu.tsx            # Snooze picker
│       └── AssignmentMenu.tsx        # Assign to agent
│
├── _hooks/
│   ├── useEmailData.ts               # Email data fetching
│   ├── useInternalComments.ts        # Comments management
│   ├── usePresence.ts                # Presence tracking
│   ├── useEmailActions.ts            # Email operations
│   └── useKeyboardShortcuts.ts       # Keyboard navigation
│
├── _services/
│   ├── EmailService.ts               # API calls
│   ├── InternalCommentService.ts     # Comment API
│   ├── PresenceService.ts            # Presence API
│   └── CannedResponseService.ts      # Template API
│
├── _stores/
│   ├── emailStore.ts                 # Email state (Zustand)
│   ├── presenceStore.ts              # Presence state
│   └── uiStore.ts                    # UI state (panels, modals)
│
├── _types/
│   ├── email.types.ts                # Email interfaces
│   ├── comment.types.ts              # Comment interfaces
│   └── presence.types.ts             # Presence interfaces
│
└── _styles/
    └── missive-theme.css             # Missive-inspired styles
```

## 🎨 **Design System**

### **Colors (Your Theme + Missive Style):**
```css
/* Primary */
--primary: #5B7FFF;          /* Blue - actions, highlights */
--primary-hover: #4A6EEE;
--primary-light: #EBF0FF;

/* Neutral Grays */
--gray-50: #F7F9FA;          /* Sidebar background */
--gray-100: #F0F2F5;         /* Hover states */
--gray-200: #E4E7EB;         /* Borders */
--gray-500: #8492A6;         /* Secondary text */
--gray-900: #1F2D3D;         /* Primary text */

/* Status Colors */
--success: #1DD1A1;          /* Approved, success */
--warning: #FF9F43;          /* Pending, assigned */
--danger: #FF6B81;           /* Rejected, error */
--info: #5B7FFF;             /* Info badges */

/* Internal Comments */
--comment-bg: #FFF3CD;       /* Light yellow */
--comment-border: #FFE5A0;

/* Unread */
--unread-blue: #5B7FFF;
--unread-bg: #EBF0FF;
```

### **Typography:**
- Font: System UI fonts
- Base: 14px
- Subject: 16px (bold)
- Preview: 13px (gray)
- Meta: 12px (light gray)

### **Spacing:**
- Grid: 8px base
- Card padding: 12-16px
- Gap between items: 8px
- Section margins: 16-24px

## 🚀 **Implementation Order**

1. **Phase 1:** Core layout (3-column)
2. **Phase 2:** Conversation list
3. **Phase 3:** Email detail view
4. **Phase 4:** Internal comments
5. **Phase 5:** Presence & collision
6. **Phase 6:** Canned responses
7. **Phase 7:** Polish & animations

## 📦 **Tech Stack Match**

- ✅ Next.js 16 App Router
- ✅ TypeScript (strict mode)
- ✅ Tailwind CSS v4
- ✅ React Query for data
- ✅ Zustand for state
- ✅ Socket.IO for real-time
- ✅ Framer Motion for animations
- ✅ TipTap for rich text
- ✅ Your existing Card/Button components

## 🎯 **Zero Type Errors Guaranteed**

All components will have:
- Proper TypeScript interfaces
- No `any` types (unless absolutely necessary)
- Strict type checking
- JSDoc comments

Ready to build! 🚀


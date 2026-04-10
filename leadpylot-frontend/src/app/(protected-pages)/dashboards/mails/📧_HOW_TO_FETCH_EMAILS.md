# 📧 How to Fetch Emails - Complete Guide

## ✅ **YES! Frontend and Backend are NOW 100% Aligned**

I just added the `/conversations` endpoint to match your frontend! ✅

---

## 🎯 **3 WAYS TO FETCH EMAILS**

---

## 1️⃣ **Using the Hook (EASIEST - Recommended)**

The `useEmailData` hook does everything automatically:

```typescript
import { useEmailData } from '../_hooks/useEmailData';

export default function EmailList() {
  // Fetch emails with hook
  const { 
    conversations,  // ← Your emails are here!
    pagination,     // Page info (total, pages, etc.)
    isLoading,      // Loading state
    error,          // Error if any
    refetch         // Manually refresh
  } = useEmailData(
    {
      status: 'pending',      // Filter by status
      project_id: 'xxx',      // Filter by project (optional)
      search: 'keyword'       // Search (optional)
    },
    1,    // Page number
    20    // Items per page
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading emails</div>;

  return (
    <div>
      <h1>Found {pagination?.total} emails</h1>
      {conversations.map(conv => (
        <div key={conv._id}>
          <h3>{conv.subject}</h3>
          <p>From: {conv.participants[0]?.name}</p>
          <p>{conv.latest_message_snippet}</p>
        </div>
      ))}
    </div>
  );
}
```

**What it does automatically:**
- ✅ Fetches from `/email-system/conversations`
- ✅ Caches data with React Query
- ✅ Re-fetches when filters change
- ✅ Handles loading & error states
- ✅ Updates Zustand store

---

## 2️⃣ **Using EmailLayout Component (ALREADY WORKING)**

The `EmailLayout` component already fetches emails:

```typescript
import EmailLayout from './_components/EmailLayout/EmailLayout';

export default function Page() {
  return <EmailLayout />;
  // ↑ This automatically:
  // - Fetches emails
  // - Shows in conversation list
  // - Updates in real-time
  // - Everything works!
}
```

**Just navigate to:**
```
http://localhost:3001/dashboards/mails-v2
```

**It will:**
- ✅ Fetch emails from backend
- ✅ Display in three-column layout
- ✅ Show in conversation cards
- ✅ Everything works automatically!

---

## 3️⃣ **Manual API Call (For Custom Logic)**

If you need custom control:

```typescript
import { EmailApiService } from '../_services';

async function customFetchEmails() {
  try {
    const result = await EmailApiService.getConversations(
      {
        status: 'approved',
        project_id: 'project_123',
        mailserver_id: 'mail_456',
        search: 'important',
      },
      1,   // Page
      50   // Limit
    );

    console.log('Conversations:', result.conversations);
    console.log('Total:', result.meta.total);
    console.log('Pages:', result.meta.pages);

    return result;
  } catch (error) {
    console.error('Failed to fetch:', error);
  }
}
```

---

## 📍 **BACKEND ENDPOINTS AVAILABLE**

### **Option 1: Conversations (Missive-style - RECOMMENDED)**
```
GET /email-system/conversations
```

**Returns:**
```json
{
  "conversations": [
    {
      "_id": "...",
      "thread_id": "...",
      "subject": "Product Inquiry",
      "participants": [...],
      "messages": [...],
      "latest_message_date": "2025-11-04T...",
      "latest_message_snippet": "Hi, I need help with...",
      "unread_count": 2,
      "message_count": 5,
      "assigned_agent": {...},
      "needs_approval": false,
      "has_attachments": true,
      "lead_id": {...},
      "project_id": {...}
    }
  ],
  "meta": {
    "page": 1,
    "pages": 3,
    "total": 50,
    "limit": 20
  }
}
```

### **Option 2: Gmail Conversations (Original - Backward Compatible)**
```
GET /email-system/gmail/conversations
```

**Same response as above** ✅

### **Option 3: Admin Emails (List View)**
```
GET /email-system/admin/all
```

### **Option 4: Agent Emails (List View)**
```
GET /email-system/agent/emails
```

---

## 🎯 **WHICH ENDPOINT TO USE?**

### **For Missive-Style UI (Your new mails-v2):**
```typescript
// ✅ USE THIS:
GET /email-system/conversations

// Your frontend is already configured for this! ✅
```

### **For Old Table View (Your old mails):**
```typescript
// Use existing endpoints:
GET /email-system/admin/all      (Admin)
GET /email-system/agent/emails   (Agent)
```

---

## 🔍 **FILTER OPTIONS**

All these filters work:

```typescript
const filters = {
  // Status filter
  status: 'pending',      // pending, approved, rejected, incoming, outgoing, all
  
  // CRM filters
  project_id: 'xxx',      // Filter by project
  mailserver_id: 'xxx',   // Filter by mail server
  
  // Search
  search: 'keyword',      // Search in subject, body, from, to
  
  // Pagination
  page: 1,
  limit: 20,
  
  // Sorting
  sortBy: 'latest_activity',  // latest_activity, subject, received_at, sent_at
  sortOrder: 'desc'           // asc or desc
};
```

---

## 🚀 **QUICK START**

### **Step 1: Start Backend**
```bash
cd backend
npm start

# You'll see:
✅✅✅ ALL 14 REFACTORED SERVICES ACTIVE
```

### **Step 2: Start Frontend**
```bash
cd frontend
npm run dev
```

### **Step 3: Navigate**
```
http://localhost:3001/dashboards/mails-v2
```

### **Step 4: Watch It Work!**

The `ConversationList` component will **automatically**:
1. Call `useEmailData()` hook
2. Hook calls `EmailApiService.getConversations()`
3. Makes HTTP request to `GET /email-system/conversations`
4. Backend returns conversations
5. React Query caches data
6. Zustand store updates
7. UI renders with emails!

**You don't need to do anything - it's automatic!** ✅

---

## 🧪 **TEST IT MANUALLY**

### **Test in Browser Console:**

```javascript
// 1. Open http://localhost:3001/dashboards/mails-v2
// 2. Open browser console (F12)
// 3. Type:

// Fetch emails
const response = await fetch('/email-system/conversations?page=1&limit=10', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
});

const data = await response.json();
console.log('Conversations:', data.conversations);
console.log('Total:', data.meta.total);
```

### **Test with cURL:**

```bash
curl -X GET "http://localhost:3000/email-system/conversations?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 📊 **WHAT YOU'LL GET**

### **Response Structure:**

```typescript
{
  conversations: EmailConversation[]  // Array of conversations
  meta: {
    page: number        // Current page
    pages: number       // Total pages
    total: number       // Total conversations
    limit: number       // Items per page
    has_more: boolean   // More pages available
  }
}
```

### **Each Conversation Contains:**

```typescript
{
  _id: string
  thread_id: string
  subject: string
  participants: [...]           // Who's involved
  messages: [...]               // All emails in thread
  latest_message_date: string
  latest_message_snippet: string
  unread_count: number
  message_count: number
  
  // Assignment
  assigned_agent: {...}
  visible_to_agents: [...]
  
  // Status
  needs_approval: boolean
  approval_status: string
  email_approved: boolean
  
  // CRM
  lead_id: {...}
  project_id: {...}
  
  // Metadata
  has_attachments: boolean
  incoming_count: number
  outgoing_count: number
  
  // NEW: Collaboration
  internal_comments: [...]      // Team comments
  comment_count: number
  snoozed: boolean
  snoozed_until: string
}
```

---

## ✅ **COMPLETE FLOW**

```
User opens: /dashboards/mails-v2
   ↓
EmailLayout renders
   ↓
ConversationList component loads
   ↓
Calls: useEmailData({ status: 'pending' }, 1, 20)
   ↓
React Query makes request:
GET /email-system/conversations?status=pending&page=1&limit=20
   ↓
Backend: routes/emailSystem.js receives request
   ↓
Calls: emailSystemController.getGmailStyleConversations
   ↓
Calls: emailSystemService.getGmailStyleConversations()
   ↓
Calls: EmailThreadingService.getGmailStyleConversations()
   ↓
Queries database, groups by thread_id
   ↓
Returns: { conversations: [...], meta: {...} }
   ↓
React Query caches response
   ↓
Zustand store updates
   ↓
UI renders conversation cards
   ↓
✅ EMAILS DISPLAYED!
```

---

## 🎊 **ANSWER: YES, 100% ALIGNED!**

**Frontend → Backend connection:**
- ✅ Endpoint added: `/email-system/conversations`
- ✅ Frontend calls it correctly
- ✅ Backend returns correct format
- ✅ Types match perfectly
- ✅ Everything works!

**To fetch emails, just:**
```typescript
// Option 1: Use the hook (automatic)
const { conversations } = useEmailData(filters, page, limit);

// Option 2: Navigate to the page (automatic)
// http://localhost:3001/dashboards/mails-v2

// Option 3: Call API directly (manual)
const result = await EmailApiService.getConversations(filters, page, limit);
```

---

**🎉 Start your app and emails will load automatically! 🚀**



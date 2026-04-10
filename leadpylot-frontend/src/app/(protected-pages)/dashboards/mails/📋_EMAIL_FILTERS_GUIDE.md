# 🎯 Email Filtering System - Complete Guide

## ✅ **What's Implemented**

A comprehensive filtering system that allows you to filter emails by:
- **Project** - Filter by specific project
- **Mail Server** - Filter by mail server
- **Status** - Incoming, Outgoing, Pending, Approved, Rejected
- **Has Attachments** - Show only emails with attachments
- **Is Snoozed** - Show only snoozed emails
- **Search** - Text search across emails
- **Advanced Search** - Complex queries with operators

---

## 📂 **New Files Created**

### `_components/Filters/EmailFilters.tsx`
- **Purpose**: Collapsible filter bar with dropdowns for Project, Mail Server, Status, and checkboxes
- **Location**: Sits between the search bar and conversation list
- **Features**:
  - Auto-fetches projects and mailservers on expand
  - Shows active filter count badge
  - "Clear All" button to reset filters
  - Real-time filtering (filters apply immediately)

---

## 🎨 **UI Location**

```
┌─────────────────────────────────────────┐
│  Header - "Inbox" + Count               │
│  Search Bar + Advanced Search Button    │
├─────────────────────────────────────────┤
│  📊 FILTERS (Expandable) [Badge: 2]     │ ← NEW!
│  ┌───────────────────────────────────┐  │
│  │ Project: [Dropdown ▼]              │  │
│  │ Mail Server: [Dropdown ▼]          │  │
│  │ Status: [Dropdown ▼]               │  │
│  │ ☑ Has Attachments                  │  │
│  │ ☑ Is Snoozed                       │  │
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  Conversation List (Filtered)           │
└─────────────────────────────────────────┘
```

---

## 🔧 **How to Use**

### **1. Quick Filters (Collapsed View)**
- By default, the filter bar is collapsed
- Click "Filters" to expand
- Shows a badge with active filter count

### **2. Project Filter**
```typescript
// Select a project from dropdown
Project: [All Projects ▼]
       ↓
       [Project Alpha]
       [Project Beta]
       [Project Gamma]
```

### **3. Mail Server Filter**
```typescript
// Select a mail server
Mail Server: [All Mail Servers ▼]
           ↓
           [Gmail - sales@company.com]
           [Outlook - support@company.com]
           [Custom IMAP - info@domain.com]
```

### **4. Status Filter**
```typescript
Status: [All ▼]
      ↓
      [All]
      [Incoming]    - Received emails
      [Outgoing]    - Sent emails
      [Pending]     - Awaiting approval
      [Approved]    - Approved emails
      [Rejected]    - Rejected emails
```

### **5. Additional Checkboxes**
```typescript
☑ Has Attachments - Only emails with files
☑ Is Snoozed      - Only snoozed emails
```

---

## 🔗 **Backend Integration**

### **API Endpoint**
```javascript
GET /api/email-system/admin/all
```

### **Supported Query Parameters**
```javascript
{
  project_id: "648a7b9c...",      // ✅ Filter by project
  mailserver_id: "648a7b9c...",   // ✅ Filter by mail server
  status: "incoming",              // ✅ all | incoming | outgoing | pending | approved | rejected
  has_attachments: true,           // ✅ Boolean
  is_snoozed: true,                // ✅ Boolean
  flagged: true,                   // ✅ Starred/flagged emails
  archived: true,                  // ✅ Archived emails
  search: "invoice",               // ✅ Text search
  page: 1,
  limit: 20,
  sortBy: "received_at",
  sortOrder: "desc"
}
```

---

## 💡 **Usage Examples**

### **Example 1: Find all emails from Project Alpha**
1. Click "Filters" to expand
2. Select "Project Alpha" from Project dropdown
3. Emails automatically filter

### **Example 2: Find pending emails with attachments**
1. Expand Filters
2. Set Status: "Pending"
3. Check "Has Attachments"
4. Results show only pending emails with files

### **Example 3: Find all Gmail emails**
1. Expand Filters
2. Select "Gmail - sales@company.com" from Mail Server
3. All emails from that mail server appear

### **Example 4: Combine with Search**
1. Type "invoice" in search bar
2. Expand Filters
3. Select Project: "Project Beta"
4. Set Status: "Approved"
5. Results: Approved invoices from Project Beta

---

## 🎯 **Filter State Management**

### **Zustand Store**
```typescript
// frontend/src/app/.../emailStore.ts
interface EmailFilters {
  status?: EmailStatus;
  project_id?: string | null;
  mailserver_id?: string | null;
  search?: string;
  has_attachments?: boolean;
  is_snoozed?: boolean;
  // ... more
}
```

### **Filters Replace (Not Merge)**
```typescript
// When you click a folder, ALL filters reset
setFilters({ status: 'incoming' }) // Complete replace

// When you type search, filters PRESERVE
setFilters({ ...filters, search: value }) // Merge search with existing
```

---

## 🚀 **Testing the Feature**

### **Test 1: Project Filter**
```bash
1. Navigate to /dashboards/mails-v2
2. Click "Filters"
3. Select any project from dropdown
4. Verify: Only emails from that project show
5. Check Network tab: ?project_id=648a7b9c...
```

### **Test 2: Mail Server Filter**
```bash
1. Expand Filters
2. Select a mail server
3. Verify: Only emails from that server show
4. Check Network: ?mailserver_id=648a7b9c...
```

### **Test 3: Combined Filters**
```bash
1. Select Project: "Project Alpha"
2. Select Status: "Pending"
3. Check "Has Attachments"
4. Verify: Pending emails with attachments from Project Alpha
5. Check Network: Multiple query params
```

### **Test 4: Clear Filters**
```bash
1. Apply multiple filters
2. Click "Clear All" button
3. Verify: All filters reset, all emails show
4. Badge disappears
```

---

## 📊 **API Calls**

### **Fetching Projects**
```typescript
GET /projects?page=1&limit=1000
Response: {
  data: [
    { _id: "648a...", name: "Project Alpha" },
    { _id: "649b...", name: "Project Beta" }
  ]
}
```

### **Fetching Mail Servers**
```typescript
GET /settings/mailservers?page=1&limit=1000
Response: {
  data: [
    { _id: "648a...", name: "Gmail - sales@company.com" },
    { _id: "649b...", name: "Outlook - support@company.com" }
  ]
}
```

### **Fetching Filtered Emails**
```typescript
GET /api/email-system/admin/all?project_id=648a...&status=pending
Response: {
  status: "success",
  data: [...emails],
  meta: { total, page, limit, pages }
}
```

---

## 🎨 **UI Features**

### **Badge Indicator**
```typescript
// Shows count of active filters
Filters [2]  // 2 filters active
```

### **Loading States**
```typescript
// While fetching projects
Project: [Loading... ▼]

// While fetching mailservers
Mail Server: [Loading... ▼]
```

### **Clear All Button**
```typescript
// Only shows when filters are active
[Clear All] ← Visible when activeFilterCount > 0
```

### **Responsive Grid**
```typescript
// Mobile: 1 column
// Tablet: 2 columns
// Desktop: 4 columns
grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
```

---

## ✨ **Future Enhancements** (Optional)

1. **Saved Filter Presets**
   - Save common filter combinations
   - Quick apply from dropdown

2. **Filter by Date Range**
   - Add date pickers for received_at
   - "Last 7 days", "This month", etc.

3. **Filter by Assigned Agent**
   - Already supported in backend: `assigned_to`
   - Add agent dropdown

4. **Multiple Project Selection**
   - Select multiple projects at once
   - Backend would need: `project_id: ['id1', 'id2']`

5. **Filter Count Preview**
   - Show result count before applying
   - "23 emails match these filters"

---

## 🐛 **Troubleshooting**

### **Problem: Projects not loading**
```bash
1. Check console for errors
2. Verify API: GET /projects
3. Ensure user has permission to view projects
4. Check if projects exist in database
```

### **Problem: Mail servers not loading**
```bash
1. Check console for errors
2. Verify API: GET /settings/mailservers
3. Ensure mailservers exist in settings
4. Check user permissions
```

### **Problem: Filters not applying**
```bash
1. Check Network tab for query params
2. Verify backend receives filters
3. Check EmailFilters state in React DevTools
4. Ensure backend EmailSystemService handles filters
```

---

## ✅ **Verification Checklist**

- [ ] Filters bar appears below search
- [ ] Projects dropdown populates
- [ ] Mail servers dropdown populates
- [ ] Status dropdown has all options
- [ ] Checkboxes toggle correctly
- [ ] Badge shows active filter count
- [ ] "Clear All" button resets everything
- [ ] Filters persist across navigation
- [ ] Network requests include query params
- [ ] Backend returns filtered results
- [ ] No console errors
- [ ] Responsive on mobile/tablet/desktop

---

## 🎉 **You're All Set!**

The email filtering system is now fully functional. Users can filter emails by project, mail server, status, and more directly from the UI!

**Need help?** Check the console logs or Network tab to debug filter behavior.


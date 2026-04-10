# 📧 Real-time Email Notifications - Implementation Guide

**Status:** ✅ Ready to Use  
**Last Updated:** November 11, 2025

---

## 🎯 What's Implemented

✅ Backend IMAP IDLE monitor sends notifications when new emails arrive  
✅ Socket.IO emits on both `'notification'` and `'email:new'` channels  
✅ Frontend automatically shows toast notifications (already working via SocketProvider)  
✅ Custom hook `useEmailNotifications` for refreshing email lists

---

## 🚀 Quick Start

### **Option 1: Auto-refresh Email List (Recommended)**

Add the hook to your email list component (e.g., `ConversationList.tsx` or page component):

```tsx
import { useEmailNotifications } from './_hooks/useEmailNotifications';
import { useQueryClient } from '@tanstack/react-query';

export default function EmailListPage() {
  const queryClient = useQueryClient();

  // Listen for new emails and auto-refresh
  useEmailNotifications({
    onNewEmail: (notification) => {
      console.log('📧 New email received:', notification.data.subject);
      
      // Refresh email list queries
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['email-conversations'] });
      
      // Optional: Show a badge or highlight
      // setBadgeCount(prev => prev + 1);
    }
  });

  // ... rest of component
}
```

---

### **Option 2: Filter by Project/Mailserver**

```tsx
useEmailNotifications({
  projectId: selectedProjectId, // Only show for specific project
  mailserverId: selectedMailserverId, // Only show for specific mailserver
  onNewEmail: (notification) => {
    refetchEmails();
  }
});
```

---

### **Option 3: Conditionally Enable**

```tsx
const isMailsPage = pathname.includes('/mails');

useEmailNotifications({
  enabled: isMailsPage, // Only listen when on mails page
  onNewEmail: (notification) => {
    refetchEmails();
  }
});
```

---

## 📋 Full Implementation Example

### **In ConversationList.tsx:**

```tsx
'use client';

import { useEmailNotifications } from '../_hooks/useEmailNotifications';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export default function ConversationList() {
  const queryClient = useQueryClient();
  const [newEmailCount, setNewEmailCount] = useState(0);

  // Listen for new emails
  useEmailNotifications({
    onNewEmail: (notification) => {
      console.log('📧 New email received:', notification);
      
      // Increment badge counter
      setNewEmailCount(prev => prev + 1);
      
      // Refresh email list
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      // Optional: Play a sound (already handled by SocketProvider)
      // Optional: Show a browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Email', {
          body: `${notification.data.subject} from ${notification.data.from}`,
          icon: '/email-icon.png',
        });
      }
    }
  });

  // Reset badge when user views the list
  const handleListView = () => {
    setNewEmailCount(0);
  };

  return (
    <div>
      {newEmailCount > 0 && (
        <div className="bg-blue-500 text-white p-2 rounded">
          {newEmailCount} new email(s) received
        </div>
      )}
      
      <EmailList onView={handleListView} />
    </div>
  );
}
```

---

## 🎨 UI Enhancements

### **1. Show "New Email" Badge**

```tsx
{newEmailCount > 0 && (
  <Badge 
    variant="solid" 
    className="animate-pulse bg-blue-500"
  >
    {newEmailCount} New
  </Badge>
)}
```

### **2. Auto-scroll to New Email**

```tsx
useEmailNotifications({
  onNewEmail: async (notification) => {
    // Refresh list
    await refetchEmails();
    
    // Scroll to new email
    const emailElement = document.getElementById(`email-${notification.data.email_id}`);
    if (emailElement) {
      emailElement.scrollIntoView({ behavior: 'smooth' });
      emailElement.classList.add('highlight-animation');
    }
  }
});
```

### **3. Show Inline Banner**

```tsx
{lastNewEmail && (
  <Alert className="mb-4 bg-blue-50 border-blue-200">
    <Mail className="h-4 w-4" />
    <AlertDescription>
      New email received: <strong>{lastNewEmail.data.subject}</strong>
      <Button 
        size="sm" 
        className="ml-2"
        onClick={() => {
          // Navigate to email
          router.push(`/dashboards/mails-v2?email=${lastNewEmail.data.email_id}`);
        }}
      >
        View
      </Button>
    </AlertDescription>
  </Alert>
)}
```

---

## 🔔 Notification Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. New Email Arrives at IMAP Server                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. IMAP IDLE Monitor Detects (Instant, Real-time)          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Backend Processes Email & Saves to Database             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Socket.IO Emits Notification                            │
│    - 'notification' channel (SocketProvider handles)       │
│    - 'email:new' channel (useEmailNotifications handles)   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Frontend Receives Notification                          │
│    ✅ Toast notification appears (automatic)                │
│    ✅ Sound plays (automatic, if configured)                │
│    ✅ Notification center updated (automatic)               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. useEmailNotifications Hook Callback Fires               │
│    - Refresh email list                                     │
│    - Update badge count                                     │
│    - Scroll to new email (optional)                         │
│    - Show inline banner (optional)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing

### **1. Test Real-time Notification**

```bash
# Send a test email to your monitored mailbox
# You should see:
# - Toast notification appears immediately
# - Email list refreshes automatically
# - Badge counter increments
```

### **2. Test Filtering**

```tsx
// Test project filter
useEmailNotifications({
  projectId: 'specific-project-id',
  onNewEmail: (notification) => {
    console.log('Should only see emails for this project');
  }
});
```

### **3. Check Console Logs**

```javascript
// You should see these logs:
📧 Real-time email notification received: { ... }
✅ Email list refreshed
🔔 Badge count updated: 1
```

---

## 📊 Notification Data Structure

```typescript
interface EmailNotification {
  id: string;                    // Unique notification ID
  type: 'email';                // Notification type
  title: 'New Email';           // Title
  message: string;              // "Subject from sender@email.com"
  data: {
    email_id: string;           // MongoDB email ID
    subject: string;            // Email subject
    from: string;               // Sender email
    to: string;                 // Recipient email
    received_at: string;        // ISO timestamp
    has_attachments: boolean;   // Attachment flag
    project_id?: string;        // Associated project
    project_name?: string;      // Project name
    mailserver_id: string;      // Mail server ID
    mailserver_name: string;    // Mail server name
    direction: 'incoming';      // Email direction
    approval_status?: string;   // Approval status
  };
  timestamp: string;            // Notification timestamp
  read: false;                  // Read status
}
```

---

## 🎵 Sound Configuration

The email notification sound is already configured in `SocketProvider.tsx`:

```typescript
// NOTIFICATION_CONFIG.simple
email: { 
  roles: ['Admin', 'Agent'], 
  type: 'info', 
  useEmailSound: true  // ✅ Email sound enabled
}
```

**Sound File Location:**
- Default: `/sounds/notification-email.mp3`
- Or specify custom sound in config

---

## 🔧 Advanced Usage

### **1. Batch Notifications**

If multiple emails arrive simultaneously, only show one toast:

```tsx
const [recentEmails, setRecentEmails] = useState<string[]>([]);
const [batchTimer, setBatchTimer] = useState<NodeJS.Timeout | null>(null);

useEmailNotifications({
  onNewEmail: (notification) => {
    // Add to batch
    setRecentEmails(prev => [...prev, notification.data.email_id]);
    
    // Clear existing timer
    if (batchTimer) clearTimeout(batchTimer);
    
    // Set new timer
    const timer = setTimeout(() => {
      toast.push(
        <Notification type="info">
          {recentEmails.length} new emails received
        </Notification>
      );
      setRecentEmails([]);
    }, 2000);
    
    setBatchTimer(timer);
    
    // Always refresh list
    queryClient.invalidateQueries({ queryKey: ['emails'] });
  }
});
```

### **2. Only for Admins**

```tsx
const { user } = useAuth();
const isAdmin = user?.role === 'Admin';

useEmailNotifications({
  enabled: isAdmin, // Only admins receive notifications
  onNewEmail: (notification) => {
    // Handle admin-only notification
  }
});
```

### **3. Store Last Email**

```tsx
const [lastEmail, setLastEmail] = useState<EmailNotification | null>(null);

useEmailNotifications({
  onNewEmail: (notification) => {
    setLastEmail(notification);
    // Show for 10 seconds then hide
    setTimeout(() => setLastEmail(null), 10000);
  }
});
```

---

## 🐛 Troubleshooting

### **Notifications Not Appearing**

1. **Check Socket Connection:**
```tsx
const { isConnected } = useSocket();
console.log('Socket connected:', isConnected);
```

2. **Check IMAP IDLE Status:**
```bash
curl http://localhost:3000/api/email-system/admin/realtime-monitor/status
```

3. **Check Console:**
```javascript
// Look for these logs:
✅ Connected to Socket.IO server
📧 Real-time email notification received
```

### **Email List Not Refreshing**

1. **Verify query key:**
```tsx
// Make sure your query key matches
queryClient.invalidateQueries({ queryKey: ['emails'] });
// Or whatever key you're using
```

2. **Check if hook is enabled:**
```tsx
useEmailNotifications({
  enabled: true, // Make sure this is true
  onNewEmail: ...
});
```

---

## 📚 Related Files

- **Backend:** `backend/services/emailSystem/sync/ImapIdleMonitorService.js`
- **Frontend Hook:** `frontend/src/app/(protected-pages)/dashboards/mails-v2/_hooks/useEmailNotifications.ts`
- **Socket Service:** `frontend/src/services/SocketService.ts`
- **Socket Provider:** `frontend/src/components/providers/SocketProvider.tsx`
- **Notification Config:** `NOTIFICATION_CONFIG.simple.email`

---

## ✅ Summary

**What You Get Out of the Box:**
- ✅ Instant email detection (IMAP IDLE)
- ✅ Toast notifications (automatic)
- ✅ Sound alerts (automatic)
- ✅ Notification center updates (automatic)

**What You Need to Add:**
- ✅ Call `useEmailNotifications()` in your email list component
- ✅ Refresh your email list in the `onNewEmail` callback
- ✅ Optional: Add badges, banners, or other UI enhancements

**That's it! 🎉**

---

**Questions?** Check the code examples above or review the related files.


# 🧪 Quick Test Guide - Task Management

## ⚡ 5-Minute Test Flow

### 1️⃣ **Create Task with Auto-Assignment** (2 min)

**Steps:**
1. Open any email in `/dashboards/mails-v2`
2. Click **"Assign Agent"** button
   - Select an agent (e.g., Agent A)
   - Click **"Assign"**
3. Click **"Create Task"** button
   - Enter: "Follow up with client about pricing"
   - Assign to: Same agent (Agent A)
   - Priority: High
   - Due date: Tomorrow
   - Click **"Create Task"**

**✅ Expected Result:**
- Task created successfully
- Agent A automatically added to `visible_to_agents`
- Agent A can now see this email in their inbox
- Task appears in email's task list

---

### 2️⃣ **Navigate to Task Detail Page** (1 min)

**Steps:**
1. In the email task list below the message thread
2. Click anywhere on the task card (not the checkbox!)

**✅ Expected Result:**
- Navigate to `/dashboards/tasks/[taskId]`
- See beautiful task detail page with:
  - ✅ Blue header (pending) or Green (completed)
  - ✅ Big checkbox for status toggle
  - ✅ Priority badge (High, Medium, etc.)
  - ✅ Task description
  - ✅ Created by / Assigned to
  - ✅ Related email card
  - ✅ Lead details (if exists)

---

### 3️⃣ **Mark Task as Done** (30 sec)

**Steps:**
1. On task detail page
2. Click the **big checkbox** at the top

**✅ Expected Result:**
- Checkbox fills with green checkmark
- Header changes to green background
- Text changes: "Task Completed" / "Well done!"
- Status updates across all views

---

### 4️⃣ **Navigate to Email** (30 sec)

**Steps:**
1. Still on task detail page
2. Scroll to "Related Email" section
3. Click the **email card**

**✅ Expected Result:**
- Navigate back to email in `/dashboards/mails-v2?emailId=...`
- Task shows as completed in task list
- Task is in "Completed" section

---

### 5️⃣ **Test Read-Only Lead Access** (1 min)

**Setup:** Use an email that has a lead, but task is assigned to a different agent (not lead owner)

**Steps:**
1. Create task for Agent B on email with Lead X (owned by Agent A)
2. Login as Agent B
3. Navigate to task detail page

**✅ Expected Result:**
- Lead details section visible
- **Yellow badge**: "Read-only (Temporary Access)"
- Can see: name, email, phone, address, status, notes
- No "Open Full Lead" button

**Then:**
1. Login as Agent A (lead owner)
2. Open same task

**✅ Expected Result:**
- Lead details section visible
- No read-only badge
- **"Open Full Lead"** button present
- Click button → navigate to lead page

---

## 🔍 Quick Checks

### Backend Logs
Look for these log entries:
```
Agent added to visible_to_agents for task { emailId: '...', agentId: '...' }
Email task created { taskId: '...', emailId: '...', assignedTo: '...' }
Email task updated { taskId: '...', isDone: true, updatedBy: '...' }
```

### Database Verification
```javascript
// Check email has agent in visible_to_agents
db.emails.findOne({ _id: ObjectId("...") }, { visible_to_agents: 1 })

// Check task exists
db.todos.findOne({ 
  _id: ObjectId("..."),
  todo_type: "email_task" 
})
```

---

## 🐛 Common Issues & Fixes

### Issue 1: Task not clickable
**Symptom:** Clicking task card does nothing  
**Fix:** Make sure you're not clicking the checkbox

### Issue 2: Lead details not showing
**Symptom:** No lead section on task page  
**Check:** 
- Email has `lead_id` set?
- Lead exists in database?
- Agent has permission to view?

### Issue 3: Status not updating
**Symptom:** Checkbox doesn't toggle  
**Check:**
- Network tab for PATCH request
- Backend logs for errors
- User has permission to update?

### Issue 4: Navigation not working
**Symptom:** Links don't navigate  
**Fix:**
- Check router is imported
- Verify URL format: `/dashboards/tasks/${taskId}`
- Console errors?

---

## 📊 Test Matrix

| Test Case | User | Expected Result | Status |
|-----------|------|----------------|--------|
| Create task → auto-add to visible_to_agents | Admin | Agent sees email | ⬜ |
| Click task → navigate to detail | Any | Show task page | ⬜ |
| Toggle status on detail page | Assignee | Update to done/undone | ⬜ |
| Click email card → navigate | Any | Show email page | ⬜ |
| View lead (not owner) | Agent | Read-only access | ⬜ |
| View lead (owner) | Agent | Full access button | ⬜ |
| Checkbox in task list | Any | No navigation | ⬜ |
| Click task card | Any | Navigate to task page | ⬜ |

---

## 🎯 API Testing with Postman/cURL

### 1. Create Task
```bash
POST http://localhost:3000/api/email-system/{emailId}/tasks
Content-Type: application/json
Authorization: Bearer {token}

{
  "message": "Follow up with client",
  "assigned_to": "agent_id_here",
  "priority": 3,
  "due_date": "2025-11-10",
  "lead_id": "lead_id_here"
}
```

### 2. Get Task Details
```bash
GET http://localhost:3000/api/email-system/tasks/{taskId}/details
Authorization: Bearer {token}
```

### 3. Update Task Status
```bash
PATCH http://localhost:3000/api/email-system/tasks/{taskId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "isDone": true
}
```

---

## 💡 Pro Tips

1. **Use Browser DevTools**
   - Network tab: See API calls
   - Console: Check for errors
   - React DevTools: Inspect state

2. **Test with Multiple Users**
   - Open incognito for Agent A
   - Regular window for Admin
   - Test permissions

3. **Check Real-time Updates**
   - Open email in two tabs
   - Update task in one
   - Refresh other → verify sync

4. **Test Edge Cases**
   - Task with no assignee
   - Task with no lead
   - Task with no due date
   - Completed task toggle

---

## ✅ Success Criteria

**All features working when:**
- ✅ Tasks create successfully
- ✅ Agents auto-added to visible_to_agents
- ✅ Task detail page loads and displays correctly
- ✅ Status toggle works (done/undone)
- ✅ Navigation between email/task/lead works
- ✅ Lead access permissions work correctly
- ✅ UI is responsive and looks good
- ✅ No console errors
- ✅ No backend errors

---

## 🚀 Ready to Test!

**Start here:**
1. ✅ Read this guide (you're here!)
2. 🔄 Restart backend server
3. 🔄 Restart frontend dev server
4. 🧪 Follow the 5-minute flow above
5. 🎉 Report results!

**Questions? Check:**
- `✅_TASK_MANAGEMENT_ENHANCED.md` for detailed docs
- `🎉_AGENT_TASKS_READY.md` for original task system
- Backend logs for debugging


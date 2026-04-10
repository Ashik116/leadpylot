# 📋 Task Drawer - Missive-Style Task Management

A global task drawer accessible from the header that provides a centralized view of all user tasks with quick navigation to related emails and leads.

---

## 🎯 Features

### ✅ **Core Functionality**
- **Global Access**: Available from header on all pages
- **Real-time Updates**: Fetch latest tasks on drawer open
- **Filter Views**: Pending, Completed, and All tasks
- **Quick Actions**: Toggle status, navigate to email/lead
- **Task Details**: Priority, due date, creator info
- **Responsive Design**: Works on mobile and desktop

### 🎨 **UI Components**
- Slide-in drawer from right side
- Three filter tabs with badge counts
- Empty states for each filter
- Loading states with spinner
- Task priority indicators (high/medium/low)
- Due date badges (with overdue highlighting)
- Action buttons for navigation

---

## 📁 Files Created/Modified

### **New Files**
- `frontend/src/components/shared/TaskDrawer/TaskDrawer.tsx` - Main drawer component

### **Modified Files**
- `frontend/src/components/layouts/PostLoginLayout/components/FrameLessSide.tsx` - Added task button to header
- `backend/routes/todos.js` - Added `/my-tasks` endpoint
- `backend/controllers/todoController.js` - Added `getMyTasks` controller
- `backend/services/todoService.js` - Added `getMyTasks` service method

---

## 🔌 API Integration

### **Backend Endpoint**

**GET** `/api/todos/my-tasks`

Returns all tasks assigned to or created by the current user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "task_id",
      "todo_message": "Review email attachments",
      "isDone": false,
      "priority": "high",
      "due_date": "2025-11-10T00:00:00.000Z",
      "email_id": "email_id",
      "lead_id": {
        "_id": "lead_id",
        "contact_name": "John Doe",
        "email_from": "john@example.com"
      },
      "assigned_to": {
        "_id": "user_id",
        "login": "agent1"
      },
      "created_by": {
        "_id": "creator_id",
        "login": "admin"
      },
      "email_subject": "Important: Contract Review",
      "email_from": "client@company.com",
      "createdAt": "2025-11-06T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 15,
    "pending": 8,
    "completed": 7
  }
}
```

**Query Logic:**
- Finds tasks where `assigned_to` OR `creator_id` matches current user
- Only active tasks (`active: true`)
- Populates lead and user details
- Enriches email tasks with subject and sender
- Sorted by: pending first, then by creation date (newest first)

---

## 🎨 Component Usage

### **Basic Integration**

```tsx
import TaskDrawer from '@/components/shared/TaskDrawer/TaskDrawer';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Open Tasks
      </Button>
      
      <TaskDrawer 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
}
```

### **In Header (Current Implementation)**

```tsx
// In FrameLessSide.tsx
const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);

// Header button
<Button
  onClick={() => setIsTaskDrawerOpen(true)}
  variant="default"
  size="md"
  icon={<ApolloIcon name="checklist" className="text-lg" />}
  title="My Tasks"
>
  <span className="hidden md:block">Tasks</span>
</Button>

// Drawer at bottom of layout
<TaskDrawer 
  isOpen={isTaskDrawerOpen} 
  onClose={() => setIsTaskDrawerOpen(false)} 
/>
```

---

## 📊 Task Interface

```typescript
interface Task {
  _id: string;
  todo_message: string;
  isDone: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  email_id?: string;
  lead_id?: string;
  assigned_to?: {
    _id: string;
    login: string;
  };
  created_by?: {
    _id: string;
    login: string;
  };
  createdAt: string;
}
```

---

## 🎯 Features Breakdown

### **1. Filter Tabs**

**Three Views:**
- **Pending**: Shows incomplete tasks (`isDone: false`)
- **Completed**: Shows finished tasks (`isDone: true`)
- **All**: Shows all tasks

**Badge Counts:**
- Real-time count displayed on each tab
- Updates when tasks are toggled

### **2. Task Card**

Each task displays:

**Main Info:**
- ✅ Checkbox (toggle completion)
- 📝 Task message (clickable → task detail page)

**Meta Info:**
- 🎯 Priority badge (high/medium/low with color coding)
- 📅 Due date (red if overdue)
- 👤 Creator name

**Actions:**
- 📧 "View Email" - Navigate to email in mail system
- 🔗 "Details" - Navigate to task detail page

### **3. Priority Indicators**

```tsx
// High Priority
<Badge className="bg-red-100 text-red-800 border-red-200">
  <ExclamationCircleIcon /> high
</Badge>

// Medium Priority
<Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
  <ExclamationTriangleIcon /> medium
</Badge>

// Low Priority
<Badge className="bg-blue-100 text-blue-800 border-blue-200">
  <InfoCircleIcon /> low
</Badge>
```

### **4. Due Date Display**

```tsx
// Normal due date
<Badge className="bg-gray-50 text-gray-700">
  <CalendarIcon /> Nov 10
</Badge>

// Overdue (if past due and not completed)
<Badge className="bg-red-50 text-red-700 border-red-200">
  <CalendarIcon /> Nov 10
</Badge>
```

### **5. Empty States**

Each filter has a custom empty state:

**Pending:** "No pending tasks" + "All caught up! 🎉"
**Completed:** "No completed tasks" + "Complete some tasks to see them here"
**All:** "No tasks yet" + "Tasks will appear here when created"

### **6. Navigation**

**To Email:**
```typescript
const navigateToEmail = (emailId: string) => {
  router.push(`/dashboards/mails?conversation=${emailId}`);
  onClose(); // Close drawer after navigation
};
```

**To Task Details:**
```typescript
const navigateToTask = (taskId: string) => {
  router.push(`/dashboards/tasks/${taskId}`);
  onClose();
};
```

---

## 🔧 Backend Implementation

### **Service Method**

```javascript
async getMyTasks(user) {
  // Find tasks assigned to or created by user
  const query = {
    active: true,
    $or: [
      { assigned_to: user._id },
      { creator_id: user._id },
    ],
  };

  // Fetch with populated fields
  const todos = await Todo.find(query)
    .populate('assigned_to', '_id login')
    .populate('creator_id', '_id login')
    .populate('lead_id', '_id contact_name email_from phone')
    .sort({ createdAt: -1, isDone: 1 })
    .lean();

  // Enrich email tasks with email details
  const enrichedTodos = await Promise.all(
    todos.map(async (todo) => {
      if (todo.email_id) {
        const email = await Email.findById(todo.email_id)
          .select('subject from_email')
          .lean();
        
        return {
          ...todo,
          email_subject: email?.subject,
          email_from: email?.from_email,
        };
      }
      return todo;
    })
  );

  return {
    success: true,
    data: enrichedTodos,
    meta: {
      total: enrichedTodos.length,
      pending: enrichedTodos.filter((t) => !t.isDone).length,
      completed: enrichedTodos.filter((t) => t.isDone).length,
    },
  };
}
```

---

## 🎨 Styling

### **Drawer**
- Width: 480px
- Placement: Right side
- Animation: Slide in/out
- Overlay: Semi-transparent backdrop

### **Tabs**
- Active: Blue border bottom, white background
- Inactive: Gray text, hover effect
- Badge: Inline with tab text

### **Task Cards**
- Padding: 12px 16px
- Border: Bottom divider
- Hover: Light gray background
- Completed: 60% opacity, strikethrough text

---

## 📱 Responsive Design

### **Desktop (md+)**
- Button shows "Tasks" text
- Full width drawer (480px)
- All features visible

### **Mobile**
- Button shows only icon
- Full screen drawer
- Stacked layout
- Touch-friendly targets

---

## 🔐 Security

### **Authentication**
- All API calls include `credentials: 'include'`
- Uses session cookies for auth
- 401 errors handled gracefully

### **Authorization**
- Users only see their own tasks
- Tasks filtered by `assigned_to` OR `creator_id`
- Lead access respects assignment rules

---

## 🚀 Usage Examples

### **As Agent**
1. Click "Tasks" button in header
2. See all assigned email tasks
3. Filter by pending/completed
4. Click task to see details
5. Click "View Email" to open related email
6. Toggle checkbox to mark complete

### **As Admin**
1. Click "Tasks" button in header
2. See all created and assigned tasks
3. Monitor team task progress
4. Navigate to emails/leads
5. Update task status

---

## 🎯 Future Enhancements

### **Possible Additions**
1. **Real-time Updates**: WebSocket for live task updates
2. **Filters**: Filter by priority, due date, lead
3. **Sorting**: Sort by priority, due date, creation date
4. **Bulk Actions**: Select multiple tasks, bulk complete
5. **Search**: Search task messages
6. **Notifications**: Badge count on header button
7. **Task Creation**: Quick add task from drawer
8. **Comments**: Add comments to tasks in drawer
9. **Assignee Filter**: Filter by assignee (for admins)
10. **Date Range**: Filter by due date range

---

## 🐛 Troubleshooting

### **401 Unauthorized Error**
**Problem:** API returns 401 when fetching tasks
**Solution:** Ensure `credentials: 'include'` is set in fetch options

### **Empty Task List**
**Problem:** No tasks shown even when tasks exist
**Solution:** Check if `data.data` is correctly accessed (not `data.tasks`)

### **Navigation Not Working**
**Problem:** Clicking task/email buttons doesn't navigate
**Solution:** Ensure `onClose()` is called after `router.push()`

### **Stale Data**
**Problem:** Tasks don't update after changes elsewhere
**Solution:** Call `fetchTasks()` in `useEffect` with `isOpen` dependency

---

## ✅ Complete Feature Set

- ✅ Global header button
- ✅ Slide-in drawer from right
- ✅ Three filter tabs (pending/completed/all)
- ✅ Badge counts per tab
- ✅ Task list with metadata
- ✅ Priority indicators
- ✅ Due date display
- ✅ Overdue highlighting
- ✅ Toggle task completion
- ✅ Navigate to email
- ✅ Navigate to task details
- ✅ Navigate to lead (via task detail page)
- ✅ Empty states
- ✅ Loading states
- ✅ Error handling
- ✅ Authentication
- ✅ Responsive design
- ✅ Backend API endpoint
- ✅ Service layer logic
- ✅ Controller implementation

---

## 🎉 Summary

The Task Drawer provides a **Missive-style** task management experience with:
- 📋 Centralized task view
- 🚀 Quick navigation
- ✅ Status management
- 🎯 Priority visualization
- 📧 Email integration
- 💼 Lead context

**Perfect for agents to manage their email tasks and admins to monitor team progress!**


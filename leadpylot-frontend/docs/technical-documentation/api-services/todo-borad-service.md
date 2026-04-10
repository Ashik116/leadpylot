# Todo Board Service - Technical Documentation

## Overview

The **Todo Board Service** is a TypeScript-based microservice that provides Kanban-style task management for the LeadPylot CRM system. It enables teams to organize work into boards, lists, and tasks with real-time collaboration features.

### Key Responsibilities

- 📋 **Kanban Board Management** - Create and manage boards for different entity types (Lead, Offer, Opening, Email, Custom)
- ✅ **Task Management** - Create, update, organize, and track tasks
- 🔄 **Real-time Updates** - Socket.IO-based real-time collaboration
- 👥 **User Management** - Multi-user support with role-based permissions
- 🏷️ **Label System** - Tag and categorize tasks
- 💬 **Internal Chat** - Task-specific communication
- 📊 **Activity Tracking** - Comprehensive activity logging
- 📋 **Predefined Subtasks** - Reusable task templates

### Design Philosophy

- **TypeScript First** - Full type safety with TypeScript
- **Modular Architecture** - Feature-based organization
- **RBAC System** - Role-Based Access Control
- **Real-time First** - Socket.IO for instant updates
- **Multi-Entity Support** - Tasks linked to leads, offers, openings, emails
- **Position-Based Ordering** - Drag-and-drop friendly task positioning

---

## Architecture

### System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     API Gateway                              │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│              Todo Board Service (Port 3015)                  │
│                (TypeScript + Express + MongoDB)              │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Routes     │  │ Controllers  │  │ Middleware   │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                 │                 │                │
│         ▼                 ▼                 ▼                │
│  ┌──────────────────────────────────────────────────┐        │
│  │              Features Layer                      │        │
│  │  • Board Management                              │        │
│  │  • List Management                               │        │
│  │  • Task Management                               │        │
│  │  • Label Management                              │        │
│  │  • Activity Tracking                             │        │
│  │  • Internal Chat                                 │        │
│  │  • Predefined Subtasks                           │        │
│  │  • User Management                               │        │
│  └──────────────────────────────────────────────────┘        │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────┐        │
│  │              Socket.IO Real-time Layer           │        │
│  │  • Task created/updated/deleted                  │        │
│  │  • Task moved between lists                      │        │
│  │  • Chat messages                                 │        │
│  └──────────────────────────────────────────────────┘        │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────┐        │
│  │              MongoDB Database                    │        │
│  │  • boards, lists, tasks                          │        │
│  │  • labels, activities, chats                     │        │
│  │  • predefined subtasks                           │        │
│  └──────────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐
    │ Clients │ │ Clients │ │ Clients │
    │ (Socket │ │ (HTTP)  │ │ (HTTP)  │
    │  .IO)   │ │         │ │         │
    └─────────┘ └─────────┘ └─────────┘
```

### Service Integration Pattern

**Important:** Todo Board Service uses a **shared database** architecture rather than HTTP API calls for task creation.

```
┌─────────────────────┐
│ Lead-Offer-Service  │
│ (JavaScript)        │
└──────────┬──────────┘
           │
           │ When offer/opening created
           │
           ▼
    ┌────────────────────────┐
    │  Shared MongoDB DB     │
    │  (Direct Model Access) │
    │                        |
    │  Creates:              │
    │  • Task document       │
    │  • Activity log        │
    └──────────┬─────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Todo Board Service Reads    │
│ from same database         │
│ (for real-time delivery)    │
└─────────────────────────────┘
```

---

## Technology Stack

### Core Technologies

- **Language:** TypeScript 5.9+
- **Runtime:** Node.js 22.x
- **Framework:** Express.js 5.x
- **Database:** MongoDB 8.x with Mongoose ODM
- **Real-time:** Socket.IO 4.8.x

### Development Tools

- **Build Tool:** TypeScript Compiler (tsc)
- **Dev Server:** ts-node-dev
- **Process Manager:** PM2
- **Package Manager:** pnpm 10.4.1
- **Linting:** ESLint 9.x + TypeScript ESLint
- **Formatting:** Prettier 3.5

### Additional Libraries

- **Validation:** Zod 3.24
- **Documentation:** Swagger UI Express
- **Authentication:** JWT (jsonwebtoken)
- **File Upload:** Multer
- **Logging:** Winston 3.19
- **Socket Client:** socket.io-client 4.8

---

## Setup & Installation

### Prerequisites

- Node.js >= 22.x
- MongoDB >= 6.x
- pnpm >= 10.4.1

### Local Development Setup

1. **Clone and navigate:**

```bash
cd todo-bord-service-api
```

1. **Install dependencies:**

```bash
pnpm install
```

1. **Environment configuration:**

```bash
cp .env.example .env
```

Edit `.env`:

```
# Server
PORT=3015
NODE_ENVIRONMENT=development

# Database
DATABASE_URL=mongodb://localhost:27017/leadpylot-todo

# JWT
SECRET_TOKEN=your-jwt-secret-key
ADMIN_EMAIL=admin@leadpylot.com

# Email (optional)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# File Upload (optional)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

1. **Build TypeScript:**

```bash
pnpm build
```

1. **Start development server:**

```bash
pnpm dev
```

Server will start at `http://localhost:3015`

### Docker Setup

1. **Build and run:**

```bash
docker-compose up -d
```

1. **View logs:**

```bash
docker-compose logs -f todo-bord-service
```

---

## Project Structure

```
todo-bord-service-api/
├── src/
│   ├── app.ts                          # Express app configuration
│   ├── server.ts                       # Server initialization
│   │
│   ├── config/                         # Configuration files
│   │   ├── index.ts                   # Main config
│   │   ├── cloudinary.ts              # Cloudinary setup
│   │   └── swagger.ts                 # Swagger config
│   │
│   ├── features/                       # Feature-based modules
│   │   ├── board/                     # Board management
│   │   │   ├── board.controller.ts
│   │   │   ├── board.service.ts
│   │   │   ├── board.route.ts
│   │   │   ├── board.interface.ts
│   │   │   └── board.constants.ts
│   │   │
│   │   ├── list/                      # List/Kanban column
│   │   │   ├── list.controller.ts
│   │   │   ├── list.service.ts
│   │   │   └── list.route.ts
│   │   │
│   │   ├── task/                      # Task management
│   │   │   ├── task.controller.ts
│   │   │   ├── task.service.ts
│   │   │   ├── task.route.ts
│   │   │   └── task.interface.ts
│   │   │
│   │   ├── activity/                  # Activity tracking
│   │   │   ├── activity.controller.ts
│   │   │   ├── activity.service.ts
│   │   │   └── activity.route.ts
│   │   │
│   │   ├── label/                     # Label management
│   │   │   ├── label.controller.ts
│   │   │   ├── label.service.ts
│   │   │   └── label.route.ts
│   │   │
│   │   ├── internalChat/              # Internal chat
│   │   │   ├── internalChat.controller.ts
│   │   │   ├── internalChat.service.ts
│   │   │   ├── internalChat.route.ts
│   │   │   └── internalChat.interface.ts
│   │   │
│   │   ├── predefinedSubTask/         # Reusable subtask templates
│   │   │   ├── predefinedSubTask.controller.ts
│   │   │   ├── predefinedSubTask.service.ts
│   │   │   ├── predefinedSubTask.route.ts
│   │   │   └── predefinedSubTask.interface.ts
│   │   │
│   │   ├── predefinedSubTaskCat/       # Subtask categories
│   │   │   ├── predefinedSubTaskCat.controller.ts
│   │   │   ├── predefinedSubTaskCat.service.ts
│   │   │   ├── predefinedSubTaskCat.route.ts
│   │   │   └── predefinedSubTaskCat.interface.ts
│   │   │
│   │   └── user/                      # User management
│   │       ├── user.controller.ts
│   │       ├── user.service.ts
│   │       ├── user.route.ts
│   │       └── user.interface.ts
│   │
│   ├── models/                         # Database models
│   │   ├── task.model.ts               # Task schema
│   │   ├── list.model.ts               # List schema
│   │   ├── board.mode.ts               # Board schema
│   │   ├── label.model.ts              # Label schema
│   │   ├── activity.model.ts           # Activity schema
│   │   ├── internalChat.model.ts       # Chat schema
│   │   ├── predefinedSubTask.model.ts  # Subtask template
│   │   ├── predefinedSubTaskCat.model.ts
│   │   ├── mainActivity.model.ts       # Main activity schema
│   │   ├── user.model.ts               # User schema
│   │   ├── lead.model.ts               # Lead (referenced)
│   │   ├── email.model.ts              # Email (referenced)
│   │   ├── document.model.ts           # Document (referenced)
│   │   └── index.ts                    # Model exports
│   │
│   ├── middleware/                     # Express middleware
│   │   ├── authentication.ts           # JWT verification
│   │   ├── authorize.ts                # RBAC authorization
│   │   ├── kanbanPermissions.ts       # Kanban-specific permissions
│   │   ├── validateRequest.ts         # Zod schema validation
│   │   ├── globalErrorHandler.ts      # Error handling
│   │   ├── notFoundAPI.ts             # 404 handler
│   │   └── requestLogger.middleware.ts
│   │
│   ├── lib/                           # Core libraries
│   │   ├── rbac/                       # RBAC system
│   │   │   ├── permissionValidator.ts
│   │   │   ├── roleDefinitions.ts
│   │   │   └── rolePermissions.ts
│   │   ├── pm/                         # Permission Manager
│   │   │   └── config.ts
│   │   ├── audit/                      # Audit logging
│   │   ├── logger/                    # Winston logger
│   │   └── socket/                    # Socket.IO service
│   │
│   ├── utils/                         # Utility functions
│   │   ├── sendResponse.ts            # Response formatter
│   │   ├── catchAsync.ts              # Async error wrapper
│   │   ├── positionCalculator.ts      # Task positioning
│   │   ├── socketEvents.ts            # Socket.IO event emitters
│   │   ├── notificationSetup.ts       # Notification integration
│   │   ├── createActivity.ts          # Activity creation
│   │   └── dualActivityLogger.ts      # Dual activity logging
│   │
│   ├── interface/                     # TypeScript interfaces
│   │   ├── type.ts                    # Common types
│   │   ├── error.ts                   # Error types
│   │   └── notification.ts            # Notification types
│   │
│   ├── errors/                        # Custom errors
│   │   ├── appError.ts                 # Application error
│   │   └── errorCodes.ts               # Error code constants
│   │
│   └── routes/                        # Route definitions
│       └── index.ts                   # Main router
│
├── docs/                              # Additional documentation
├── public/                            # Static assets
├── .env.example                        # Environment template
├── .prettierrc.json                   # Prettier config
├── eslint.config.mjs                  # ESLint config
├── tsconfig.json                      # TypeScript config
├── package.json                        # Dependencies
├── docker-compose.yml                  # Docker setup
├── Dockerfile                          # Docker image
└── ecosystem.config.cjs                # PM2 config
```

---

## Core Features & Services

### 1. Board Management

**Location:** `src/features/board/`

**Purpose:** Manages Kanban boards for different entity types

**Board Types:**

- `LEAD` - Lead-related tasks
- `OFFER` - Offer-related tasks
- `OPENING` - Opening-related tasks
- `EMAIL` - Email-related tasks
- `CUSTOM` - Custom tasks

**Key Features:**

- System boards (auto-created, global)
- User boards (custom, per-user)
- Board members with roles
- Position-based list ordering

**Key Methods:**

```tsx
// Initialize system boards
initializeSystemBoards();

// Create board
createBoard(boardData, userId);

// Get boards by type
getBoardsByType(boardType);

// Add/remove members
addBoardMembers(boardId, userIds);
removeBoardMember(boardId, userId);
```

### 2. List Management

**Location:** `src/features/list/`

**Purpose:** Manages Kanban columns/lists

**List Types:**

- `todo` - Default todo list
- `in_progress` - Work in progress
- `completed` - Completed items
- `cancelled` - Cancelled items

**Key Features:**

- Position-based ordering
- Task containers
- Auto-creation with boards

**Key Methods:**

```tsx
// Create list
createList(listData, userId);

// Get all lists
getAllLists(filters);

// Move task between lists
moveTaskBetweenLists(taskId, fromListId, toListId, position);
```

### 3. Task Management

**Location:** `src/features/task/`

**Purpose:** Core task CRUD operations

**Task Types:**

- `lead` - Lead tasks
- `offer` - Offer tasks
- `opening` - Opening tasks
- `email` - Email tasks
- `custom` - Custom tasks

**Task Structure:**

```tsx
{
  _id: ObjectId
  taskTitle: string
  taskDescription?: string
  task_type: 'lead' | 'offer' | 'opening' | 'email' | 'custom'
  priority: 'low' | 'medium' | 'high'
  position: number

  // Entity associations
  lead_id?: ObjectId
  offer_id?: ObjectId
  opening_id?: ObjectId
  email_id?: ObjectId

  // Board/List associations
  board_id: ObjectId[]
  list_id: ObjectId[]

  // Assignments
  assigned: ObjectId[]
  createdBy: ObjectId

  // Nested structures
  subTask: SubTask[]
  labels: Label[]
  custom_fields: CustomField[]

  // Status
  isCompleted: boolean
  status: string
}
```

**Key Methods:**

```tsx
// Create task
createTask(taskData, userId);

// Get tasks by filters
getTasks(filters);

// Update task
updateTask(taskId, updates, userId);

// Delete task
deleteTask(taskId, userId);

// Get tasks by entity
getTasksByLeadId(leadId);
getTasksByOfferId(offerId);
```

### 4. Label Management

**Location:** `src/features/label/`

**Purpose:** Tag and categorize tasks

**Key Features:**

- Board-specific labels
- Color-coded tags
- Reusable across tasks

**Key Methods:**

```tsx
createLabel(labelData, userId);
getLabelsByBoard(boardId);
updateLabel(labelId, updates, userId);
deleteLabel(labelId, userId);
```

### 5. Activity Tracking

**Location:** `src/features/activity/`

**Purpose:** Track all actions on boards, lists, tasks

**Activity Types:**

- Task: create, update, delete, move
- List: create, update, delete
- Board: create, update, delete

**Key Methods:**

```tsx
// Get activities for subject
getSubjectActivities(subjectId, subjectType, filters);

// Get activities by creator
getCreatorActivities(creatorId, filters);

// Get all activities
getAllActivities(filters);
```

### 6. Internal Chat

**Location:** `src/features/internalChat/`

**Purpose:** Task-specific communication

**Key Features:**

- Threaded conversations
- Task association
- Real-time messaging via Socket.IO

**Key Methods:**

```tsx
createChatMessage(taskId, message, userId);
getChatMessages(taskId);
```

### 7. Predefined Subtasks

**Location:** `src/features/predefinedSubTask/`

**Purpose:** Reusable subtask templates

**Key Features:**

- Template-based subtasks
- Category organization
- Nested todos
- Priority and due date defaults

**Key Methods:**

```tsx
createPredefinedSubTask(subtaskData, userId);
getPredefinedSubTasks(filters);
getPredefinedSubTaskById(id);
addToTask(taskId, subtaskId);
```

### 8. User Management

**Location:** `src/features/user/`

**Purpose:** User information and office-based filtering

**Key Features:**

- Office-based filtering
- Active user filtering
- Search functionality
- Pagination

**Key Methods:**

```tsx
getUsers(filters);
getUsersByOffice(officeId);
searchUsers(searchTerm);
```

---

## API Endpoints

**Base URL:** `/api`

**Authentication:** All endpoints require `Authorization: Bearer <jwt_token>` header

**Response Format:**

```json
{
  "success": true|false,
  "message": "Human-readable message",
  "data": { ... },
  "meta": { ... }
}
```

---

### 📋 BOARD ENDPOINTS

Boards are top-level containers for organizing tasks. Each board can have multiple lists (columns).

### POST `/api/boards/initialize-system`

**Purpose:** Initialize system default boards (LEAD, OFFER, OPENING, EMAIL, CUSTOM) if they don’t exist

**What it does:**

- Creates default system boards with standard lists (Todo, In Progress, Completed, Cancelled)
- Should be called on first setup or when boards are missing
- Creates boards with `is_system: true` flag

**Request Body:** None

**Response:**

```json
{
  "success": true,
  "message": "System boards initialized successfully",
  "data": {
    "boards": [
      {
        "_id": "board_id",
        "name": "LEAD",
        "board_type": "LEAD",
        "is_system": true,
        "lists": [...]
      }
    ]
  }
}
```

**Use when:** Setting up the system for the first time or when boards are missing

---

### POST `/api/boards/create`

**Purpose:** Create a new custom board

**What it does:**

- Creates a new Kanban board with custom name and type
- Optionally creates lists within the board
- Adds creator as board member
- Can set `onlyMe: true` to make board private (only creator and members can see)

**Request Body:**

```json
{
  "name": "My Project Board",
  "board_type": "Kanban",
  "description": "Board for tracking Q1 projects",
  "onlyMe": false,
  "members": ["user_id_1", "user_id_2"],
  "lists": [
    {
      "CardTitle": "To Do",
      "types": "todo"
    },
    {
      "CardTitle": "In Progress",
      "types": "in_progress"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Board created successfully",
  "data": {
    "_id": "new_board_id",
    "name": "My Project Board",
    "board_type": "Kanban",
    "created_by": "user_id",
    "members": [...],
    "lists": [...]
  }
}
```

**Use when:** Creating a new project board or workspace

---

### GET `/api/boards/get-all`

**Purpose:** Get all boards accessible to the authenticated user

**What it does:**

- Returns boards where user is creator or member
- Admins see all boards (except private boards with `onlyMe: true`)
- Filters out archived boards unless explicitly requested
- Returns boards with list IDs populated

**Query Parameters:**

- `is_archived` (boolean): Include archived boards

**Response:**

```json
{
  "success": true,
  "data": {
    "boards": [
      {
        "_id": "board_id",
        "name": "Project Alpha",
        "board_type": "Kanban",
        "is_system": false,
        "position": 0,
        "members": [...],
        "lists": [...]
      }
    ]
  }
}
```

**Use when:** Loading board list in sidebar or board selection screen

---

### GET `/api/boards/get-by-id/:id`

**Purpose:** Get a specific board by ID

**What it does:**

- Returns detailed board information
- Includes members and their roles
- Includes associated lists (IDs only)

**Path Parameters:**

- `id` (string): Board MongoDB ObjectId

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "board_id",
    "name": "Project Alpha",
    "description": "Q1 2024 projects",
    "board_type": "Kanban",
    "is_system": false,
    "created_by": "user_id",
    "members": [
      {
        "user_id": "user_id",
        "joined_at": "2024-01-01T00:00:00Z",
        "role": "member"
      }
    ],
    "lists": ["list_id_1", "list_id_2"]
  }
}
```

**Use when:** Viewing board details or editing board settings

---

### GET `/api/boards/:boardId/full`

**Purpose:** Get complete board data with lists and tasks (Trello-style single endpoint)

**What it does:**

- Returns board, all lists, and all tasks in one request
- Optimized for initial Kanban board load
- Tasks are grouped by list
- Supports pagination for large boards

**Path Parameters:**

- `boardId` (string): Board MongoDB ObjectId

**Query Parameters:**

- `task_limit` (integer, default: 50): Maximum tasks per list (max: 200)

**Response:**

```json
{
  "success": true,
  "data": {
    "board": {
      "_id": "board_id",
      "name": "Project Alpha",
      "board_type": "Kanban"
    },
    "lists": [
      {
        "_id": "list_id",
        "listTitle": "To Do",
        "types": "todo",
        "position": 0,
        "tasks": [
          {
            "_id": "task_id",
            "taskTitle": "Task 1",
            "position": 0,
            "assigned": [...],
            "labels": [...]
          }
        ]
      }
    ]
  }
}
```

**Use when:** Initial Kanban board load - get everything in one call

---

### GET `/api/boards/:boardId/with-lists`

**Purpose:** Get board with lists (without tasks) - optimized for Kanban UI

**What it does:**

- Returns board and list information without loading tasks
- Faster than `/full` endpoint
- Use this to render board structure, then load tasks separately

**Path Parameters:**

- `boardId` (string): Board MongoDB ObjectId

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "board_id",
    "name": "Project Alpha",
    "board_type": "Kanban",
    "lists": [
      {
        "_id": "list_id",
        "listTitle": "To Do",
        "types": "todo",
        "position": 0,
        "taskCount": 15
      }
    ]
  }
}
```

**Use when:** Rendering board structure before loading tasks (lazy loading)

---

### GET `/api/boards/:boardId/lists/:listId/tasks`

**Purpose:** Get tasks for a specific list with cursor pagination (optimized for large lists)

**What it does:**

- Returns paginated tasks for a single list
- Cursor-based pagination for efficient large list handling
- Board owners see all tasks; other users see tasks based on permissions
- Optimized for 5,000+ tasks per list

**Path Parameters:**

- `boardId` (string): Board MongoDB ObjectId
- `listId` (string): List MongoDB ObjectId

**Query Parameters:**

- `cursor` (string, optional): ISO date string of last task from previous page
- `limit` (integer, default: 30, max: 100): Tasks per page

**Response:**

```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "_id": "task_id",
        "taskTitle": "Task 1",
        "position": 0,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "nextCursor": "2024-01-02T00:00:00Z",
      "hasMore": true
    }
  }
}
```

**Use when:** Loading tasks for a specific list with pagination (large lists)

---

### PUT `/api/boards/update/:id`

**Purpose:** Update board properties

**What it does:**

- Update board name, description, type
- Add/remove board members
- Archive or soft delete board
- Update `onlyMe` privacy setting
- Set `all_agent: true` to assign all agents to board

**Path Parameters:**

- `id` (string): Board MongoDB ObjectId

**Request Body:**

```json
{
  "name": "Updated Board Name",
  "description": "Updated description",
  "board_type": "Kanban",
  "members": ["user_id_1", "user_id_2"],
  "all_agent": true,
  "is_archived": false,
  "is_deleted": false,
  "onlyMe": false
}
```

**Response:**

```json
{
  "success": true,
  "message": "Board updated successfully",
  "data": {
    "_id": "board_id",
    "name": "Updated Board Name",
    "members": [...]
  }
}
```

**Use when:** Updating board settings, adding/removing members, archiving

---

### PATCH `/api/boards/update-list-positions/:id`

**Purpose:** Update position/order of lists within a board

**What it does:**

- Reorder lists (columns) within a board
- Updates `position` field on List model
- Use for drag-and-drop list reordering

**Path Parameters:**

- `id` (string): Board MongoDB ObjectId

**Request Body:**

```json
{
  "listPositions": [
    {
      "listId": "list_id_1",
      "position": 0
    },
    {
      "listId": "list_id_2",
      "position": 1
    }
  ]
}
```

**Use when:** Reordering lists/columns via drag-and-drop

---

### DELETE `/api/boards/delete/:id`

**Purpose:** Permanently delete a board

**What it does:**

- Deletes board and all associated lists
- Tasks are NOT deleted (they become orphaned)
- Use with caution - this is permanent

**Path Parameters:**

- `id` (string): Board MongoDB ObjectId

**Response:**

```json
{
  "success": true,
  "message": "Board deleted successfully"
}
```

**Use when:** Permanently removing a board (consider archiving instead)

---

### GET `/api/boards/:board_id/members`

**Purpose:** Get all members of a board with their details

**What it does:**

- Returns list of users who are members or creators
- Includes user basic info (login, email, name, avatar)
- Indicates whether user is board creator
- Shows when each member joined

**Path Parameters:**

- `board_id` (string): Board MongoDB ObjectId

**Response:**

```json
{
  "success": true,
  "message": "Board members retrieved successfully",
  "data": [
    {
      "_id": "user_id",
      "login": "john.doe",
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "avatar": "https://...",
      "isCreator": true,
      "joinedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "boardId": "board_id",
    "boardName": "Project Alpha",
    "totalMembers": 5
  }
}
```

**Use when:** Displaying board members or managing board permissions

---

### 📝 LIST ENDPOINTS

Lists (also called cards or columns) are containers for tasks within a board.

### GET `/api/lists/get-all`

**Purpose:** Get all lists with optional filtering

**What it does:**

- Returns all lists user has access to
- Can filter by type (todo, in_progress, completed, cancelled)
- Can filter by creator
- Returns lists with task IDs populated

**Query Parameters:**

- `types` (string): Filter by list type
- `createdBy` (string): Filter by creator user ID

**Response:**

```json
{
  "success": true,
  "data": {
    "lists": [
      {
        "_id": "list_id",
        "listTitle": "To Do",
        "types": "todo",
        "board_id": "board_id",
        "position": 0,
        "tasks": ["task_id_1", "task_id_2"]
      }
    ]
  }
}
```

**Use when:** Loading all lists or filtering by type

---

### POST `/api/lists/:boardId/create-list`

**Purpose:** Create a new list under a board

**What it does:**

- Creates a new list/column within specified board
- Sets position automatically
- Adds list to board’s `lists` array

**Path Parameters:**

- `boardId` (string): Board MongoDB ObjectId

**Request Body:**

```json
{
  "CardTitle": "Review",
  "types": "in_progress"
}
```

**Response:**

```json
{
  "success": true,
  "message": "List created successfully",
  "data": {
    "_id": "new_list_id",
    "listTitle": "Review",
    "types": "in_progress",
    "board_id": "board_id",
    "position": 3
  }
}
```

**Use when:** Adding a new column to a Kanban board

---

### POST `/api/lists/:cardId/create-task`

**Purpose:** Create a new task under a list

**What it does:**

- Creates task within specified list
- Sets position automatically based on list position
- Associates task with list’s board

**Path Parameters:**

- `cardId` (string): List MongoDB ObjectId

**Request Body:**

```json
{
  "taskTitle": "Review proposal",
  "taskDescription": "Check the Q1 proposal",
  "priority": "high",
  "assigned": "user_id",
  "status": "todo",
  "subTask": [
    {
      "taskTitle": "Read document",
      "priority": "medium"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "_id": "new_task_id",
    "taskTitle": "Review proposal",
    "list_id": ["list_id"],
    "board_id": ["board_id"],
    "position": 0
  }
}
```

**Use when:** Creating task directly in a list

---

### POST `/api/lists/move-task`

**Purpose:** Move a task from one list to another

**What it does:**

- Moves task between lists (e.g., from Todo to In Progress)
- Updates task’s `list_id` array
- Removes from old list, adds to new list
- Updates position

**Request Body:**

```json
{
  "taskId": "task_id",
  "fromTodoId": "old_list_id",
  "toTodoId": "new_list_id",
  "position": 0
}
```

**Response:**

```json
{
  "success": true,
  "message": "Task moved successfully",
  "data": {
    "_id": "task_id",
    "list_id": ["new_list_id"],
    "position": 0
  }
}
```

**Use when:** Moving task between columns

---

### GET `/api/lists/get-by-id/:id`

**Purpose:** Get a specific list by ID

**What it does:**

- Returns list details with tasks populated
- Includes board information

**Path Parameters:**

- `id` (string): List MongoDB ObjectId

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "list_id",
    "listTitle": "To Do",
    "types": "todo",
    "board_id": {
      "_id": "board_id",
      "name": "Project Alpha"
    },
    "position": 0,
    "tasks": [...]
  }
}
```

**Use when:** Loading specific list details

---

### PUT `/api/lists/update/:id`

**Purpose:** Update list properties

**What it does:**

- Update list title or type
- Change list from todo to in_progress, etc.

**Path Parameters:**

- `id` (string): List MongoDB ObjectId

**Request Body:**

```json
{
  "CardTitle": "Updated List Title",
  "types": "in_progress"
}
```

**Response:**

```json
{
  "success": true,
  "message": "List updated successfully",
  "data": {
    "_id": "list_id",
    "listTitle": "Updated List Title",
    "types": "in_progress"
  }
}
```

**Use when:** Renaming a list or changing its type

---

### DELETE `/api/lists/delete/:id`

**Purpose:** Delete a list

**What it does:**

- Permanently deletes list from board
- Tasks in list remain but become orphaned (lose list association)
- Use with caution

**Path Parameters:**

- `id` (string): List MongoDB ObjectId

**Response:**

```json
{
  "success": true,
  "message": "List deleted successfully"
}
```

**Use when:** Removing a column from board

---

### PATCH `/api/lists/update-position/:id`

**Purpose:** Update list position (Trello-style drag & drop)

**What it does:**

- Supports three position modes:

1. **Trello-style (recommended):** Use `before_list_id`/`after_list_id` for automatic position calculation
2. **Direct position:** Provide specific `position` value
3. **Bulk update:** Update multiple lists at once

- Only one database update per drag operation
- Automatic rebalancing when positions get too close

**Path Parameters:**

- `id` (string): List MongoDB ObjectId

**Request Body (Trello-style):**

```json
{
  "before_list_id": "list_id_to_left",
  "after_list_id": "list_id_to_right",
  "board_id": "board_id"
}
```

**Request Body (Direct):**

```json
{
  "position": 16384
}
```

**Request Body (Bulk):**

```json
{
  "listPositions": [
    {
      "listId": "list_id_1",
      "position": 0
    },
    {
      "listId": "list_id_2",
      "position": 1
    }
  ]
}
```

**Use when:** Dragging and dropping lists to reorder columns

---

### ✅ TASK ENDPOINTS

Tasks are the core work items in the system.

### POST `/api/tasks/create`

**Purpose:** Create a new task

**What it does:**

- Creates task with title, description, priority
- Assigns to users
- Adds to specified board/list
- Supports subtasks, custom fields, labels
- Auto-assigns to system boards based on entity IDs (lead_id, offer_id, etc.)

**Request Body:**

```json
{
  "taskTitle": "Follow up with client",
  "taskDescription": "Discuss Q1 proposal",
  "priority": "high",
  "task_type": "lead",
  "lead_id": "lead_id",
  "board_id": ["board_id"],
  "list_id": ["list_id"],
  "assigned": ["user_id_1", "user_id_2"],
  "dueDate": "2024-12-31T23:59:59Z",
  "labels": ["label_id_1", "label_id_2"],
  "subTask": [
    {
      "taskTitle": "Prepare slides",
      "priority": "medium",
      "assigned": ["user_id_1"],
      "todo": [
        {
          "title": "Research",
          "priority": "low",
          "assigned": ["user_id_2"]
        }
      ]
    }
  ],
  "custom_fields": [
    {
      "title": "Budget",
      "field_type": "number",
      "value": "50000"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "_id": "new_task_id",
    "taskTitle": "Follow up with client",
    "task_type": "lead",
    "position": 0,
    "board_id": ["board_id"],
    "list_id": ["list_id"]
  }
}
```

**Use when:** Creating any type of task

---

### GET `/api/tasks/get-all`

**Purpose:** Get all tasks with advanced filtering and pagination

**What it does:**

- Returns tasks with comprehensive filtering
- Supports three modes:

1. **Inbox Mode** (`inbox=true`): Tasks with no board/list (excludes email tasks)
2. **Email Tasks Mode** (`task_type=email`): Email tasks with no board/list
3. **Normal Mode**: Standard filtering by board, list, entity IDs

- Paginated results
- Sorted by position (ascending) then createdAt (descending)

**Query Parameters:**

- `inbox` (string): “true” for inbox mode (orphaned tasks)
- `task_type` (string): “email” for email tasks mode
- `board_id` (string): Filter by board ID
- `list_id` (string): Filter by list ID
- `status` (string): Filter by status
- `assigned` (string): Filter by assigned user ID
- `priority` (string): Filter by priority (low, medium, high)
- `lead_id` (string): Filter by lead ID
- `offer_id` (string): Filter by offer ID
- `opening_id` (string): Filter by opening ID
- `email_id` (string): Filter by email ID
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 10, max: 100): Items per page

**Response:**

```json
{
  "success": true,
  "message": "Tasks retrieved successfully",
  "data": [
    {
      "_id": "task_id",
      "taskTitle": "Task 1",
      "task_type": "lead",
      "status": "todo",
      "priority": "high",
      "assigned": [...],
      "board_id": [...],
      "list_id": [...],
      "position": 0,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10,
    "offset": 0
  }
}
```

**Use when:** Loading tasks with filters, inbox, or entity-specific tasks

---

### GET `/api/tasks/by-entity`

**Purpose:** Get tasks by entity ID (email, lead, offer, or opening)

**What it does:**

- Returns paginated tasks for a single entity
- Provide exactly one of: email_id, lead_id, offer_id, opening_id
- Same response format as `/get-all`

**Query Parameters:**

- `email_id` (string): Filter by email ID
- `lead_id` (string): Filter by lead ID
- `offer_id` (string): Filter by offer ID
- `opening_id` (string): Filter by opening ID
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 10, max: 100): Items per page

**Response:** Same as `/get-all`

**Use when:** Loading all tasks for a specific entity (e.g., all tasks for a lead)

---

### GET `/api/tasks/get-by-id/:id`

**Purpose:** Get a specific task by ID

**What it does:**

- Returns full task details with all populated references
- Includes assigned users, labels, subtasks, custom fields

**Path Parameters:**

- `id` (string): Task MongoDB ObjectId

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "task_id",
    "taskTitle": "Task 1",
    "taskDescription": "Description",
    "task_type": "lead",
    "priority": "high",
    "assigned": [
      {
        "_id": "user_id",
        "login": "john.doe",
        "email": "john@example.com"
      }
    ],
    "labels": [...],
    "subTask": [...],
    "custom_fields": [...]
  }
}
```

**Use when:** Viewing full task details

---

### GET `/api/tasks/get-by-boardId` or `/api/tasks/get-by-boardId/:boardId`

**Purpose:** Get tasks by board ID (or all tasks)

**What it does:**

- If `boardId` provided: Returns tasks for that board
- If `boardId` omitted: Returns all tasks from all boards
- Two view modes:
- `view=table`: Returns grouped structure (tasks grouped by board/list)
- `view=kanban`: Returns flat array (default)
- Supports pagination

**Path Parameters:**

- `boardId` (string, optional): Board MongoDB ObjectId

**Query Parameters:**

- `view` (string, default: “table”): “table” or “kanban”
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 1000 for table, 100 for kanban): Items per page

**Response (Table View):**

```json
{
  "success": true,
  "data": {
    "flat": [...],
    "grouped": [
      {
        "board": {
          "_id": "board_id",
          "name": "Project Alpha"
        },
        "lists": [
          {
            "list": {
              "_id": "list_id",
              "listTitle": "To Do"
            },
            "tasks": [...],
            "count": 5
          }
        ]
      }
    ]
  },
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 1000,
    "view": "table"
  }
}
```

**Response (Kanban View):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "task_id",
      "taskTitle": "Task 1",
      "board_id": [...],
      "list_id": [...]
    }
  ],
  "meta": {
    "total": 100,
    "view": "kanban"
  }
}
```

**Use when:**

- Table view: Loading tasks for table/grid display
- Kanban view: Loading tasks for Kanban board

---

### PUT `/api/tasks/update/:id`

**Purpose:** Update a task (all fields supported)

**What it does:**

- Updates any task field(s)
- Supports Trello-style position updates with `before_task_id`/`after_task_id`
- Smart array updates: include `_id` to update existing items, omit to create new
- Can update subtasks, nested todos, labels, custom fields
- Move tasks between lists by updating `list_id`

**Path Parameters:**

- `id` (string): Task MongoDB ObjectId

**Request Body (Basic Update):**

```json
{
  "taskTitle": "Updated title",
  "taskDescription": "Updated description",
  "isCompleted": true,
  "status": "completed",
  "priority": "high",
  "dueDate": "2024-12-31T23:59:59Z",
  "assigned": ["user_id_1"]
}
```

**Request Body (Trello-style Position):**

```json
{
  "before_task_id": "task_id_above",
  "after_task_id": "task_id_below"
}
```

**Request Body (Update Subtasks with Smart Merge):**

```json
{
  "subTask": [
    {
      "_id": "existing_subtask_id",
      "taskTitle": "Update existing subtask",
      "assigned": ["user_id_1"],
      "dueDate": "2024-12-31T23:59:59Z",
      "isCompleted": true
    },
    {
      "taskTitle": "Create new subtask",
      "priority": "medium"
    }
  ]
}
```

**Request Body (Update Nested Todos):**

```json
{
  "subTask": [
    {
      "_id": "subtask_id",
      "todo": [
        {
          "_id": "existing_todo_id",
          "title": "Updated todo",
          "assigned": ["user_id_1"],
          "dueDate": "2024-12-31T23:59:59Z"
        },
        {
          "title": "New todo",
          "priority": "high"
        }
      ]
    }
  ]
}
```

**Request Body (Update Labels):**

```json
{
  "labels": ["label_id_1", "label_id_2"],
  "board_id": "board_id"
}
```

**Request Body (Move to Different List):**

```json
{
  "list_id": ["new_list_id"],
  "status": "in_progress"
}
```

**Use when:** Updating any task property, reordering, moving between lists

---

### GET `/api/tasks/summary/task-count`

**Purpose:** Get task count summary for a board

**What it does:**

- Returns total task count for board
- Returns task count for each list in board
- Useful for displaying task badges/counts

**Query Parameters:**

- `boardId` (string, required): Board ID

**Response:**

```json
{
  "success": true,
  "message": "Task count summary retrieved successfully",
  "data": {
    "board": {
      "boardId": "board_id",
      "boardName": "Project Alpha",
      "boardType": "Kanban",
      "taskCount": 25
    },
    "lists": [
      {
        "listId": "list_id_1",
        "listTitle": "To Do",
        "types": "todo",
        "position": 0,
        "taskCount": 10
      },
      {
        "listId": "list_id_2",
        "listTitle": "In Progress",
        "types": "in_progress",
        "position": 1,
        "taskCount": 8
      },
      {
        "listId": "list_id_3",
        "listTitle": "Completed",
        "types": "completed",
        "position": 2,
        "taskCount": 7
      }
    ]
  }
}
```

**Use when:** Displaying task counts on board/lists UI

---

### PATCH `/api/tasks/transfer/:id`

**Purpose:** Transfer a task to another board/list

**What it does:**

- Moves task from current board/list to target board/list
- Supports Trello-style position calculation
- Updates board_id and list_id arrays

**Path Parameters:**

- `id` (string): Task MongoDB ObjectId

**Request Body:**

```json
{
  "target_board_id": "target_board_id",
  "target_list_id": "target_list_id",
  "before_task_id": "task_id_above",
  "after_task_id": "task_id_below"
}
```

**Or with direct position:**

```json
{
  "target_list_id": "target_list_id",
  "position": 16384
}
```

**Response:**

```json
{
  "success": true,
  "message": "Task transferred successfully",
  "data": {
    "_id": "task_id",
    "board_id": ["target_board_id"],
    "list_id": ["target_list_id"],
    "position": 8192
  }
}
```

**Use when:** Moving task to different board/list

---

### DELETE `/api/tasks/delete/:id`

**Purpose:** Permanently delete a task

**What it does:**

- Removes task from all associated lists
- Deletes task from database
- Emits real-time deletion events
- Logs activity (for non-custom tasks)

**Path Parameters:**

- `id` (string): Task MongoDB ObjectId

**Response:**

```json
{
  "success": true,
  "message": "Task deleted successfully",
  "data": {
    "_id": "deleted_task_id"
  }
}
```

**Use when:** Permanently removing a task (consider archiving instead)

---

### POST `/api/tasks/create-from-email/:id`

**Purpose:** Create a task from an email

**What it does:**

- Finds email by ID
- Finds EMAIL system board
- Finds TODO list in that board
- Creates task with email’s subject as title
- Links task to email via `email_id`
- Adds task to TODO list

**Path Parameters:**

- `id` (string): Email MongoDB ObjectId

**Request Body:** None

**Response:**

```json
{
  "success": true,
  "message": "Email task created successfully",
  "data": {
    "_id": "new_task_id",
    "taskTitle": "Email subject",
    "task_type": "email",
    "email_id": "email_id",
    "board_id": ["email_board_id"],
    "list_id": ["todo_list_id"],
    "position": 0
  }
}
```

**Use when:** Converting an email into an actionable task

---

### DELETE `/api/tasks/:taskId/delete-item`

**Purpose:** Soft delete a subtask or nested todo

**What it does:**

- Sets `isDelete: true` on subtask or nested todo
- Three operations supported:

1. Delete subtask: Provide `taskId` and `subTaskId`
2. Delete nested todo in subtask: Provide `taskId`, `subTaskId`, `nestedTodoId`
3. Delete nested todo in custom field: Provide `taskId`, `customFieldId`, `nestedTodoId`

- Soft delete: item remains in DB but filtered from API responses

**Path Parameters:**

- `taskId` (string): Task MongoDB ObjectId

**Query Parameters:**

- `subTaskId` (string, optional): Subtask ID to delete
- `nestedTodoId` (string, optional): Nested todo ID to delete
- `customFieldId` (string, optional): Custom field ID containing nested todo

**Response (Delete Subtask):**

```json
{
  "success": true,
  "message": "Subtask deleted successfully",
  "data": {
    "taskId": "task_id",
    "deletedItem": {
      "_id": "subtask_id",
      "title": "Complete documentation",
      "type": "subtask"
    }
  }
}
```

**Use when:** Removing a subtask or nested todo (soft delete)

---

### 📊 ACTIVITY ENDPOINTS

Activities track all actions on boards, lists, and tasks.

### GET `/api/activities/subject/:subjectId/:subjectType`

**Purpose:** Get activities for a specific subject (task, list, or board)

**What it does:**

- Returns activity log for a specific entity
- Paginated results
- Shows who did what and when

**Path Parameters:**

- `subjectId` (string): Entity ID (task, list, or board)
- `subjectType` (string): “Task” | “List” | “Board”

**Query Parameters:**

- `limit` (integer, default: 50): Number of activities
- `skip` (integer, default: 0): Number to skip

**Response:**

```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "_id": "activity_id",
        "creator": {
          "_id": "user_id",
          "login": "john.doe"
        },
        "subject_id": "task_id",
        "subject_type": "Task",
        "action": "create",
        "message": "Task created",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "total": 100,
      "limit": 50,
      "skip": 0
    }
  }
}
```

**Use when:** Viewing history/audit log for a specific entity

---

### GET `/api/activities/creator/:creatorId`

**Purpose:** Get activities by a specific user (creator)

**What it does:**

- Returns all activities performed by a user
- Useful for tracking user actions

**Path Parameters:**

- `creatorId` (string): User MongoDB ObjectId

**Query Parameters:**

- `limit` (integer, default: 50): Number of activities
- `skip` (integer, default: 0): Number to skip

**Response:** Same format as `/subject` endpoint

**Use when:** Viewing user activity history

---

### GET `/api/activities`

**Purpose:** Get all activities with optional filters

**What it does:**

- Returns activities with comprehensive filtering
- Filter by subject type, action, creator, subject ID

**Query Parameters:**

- `subjectType` (string): “Task” | “List” | “Board”
- `action` (string): “create” | “update” | “delete” | “assign” | “unassign” | “transfer” | “move” | “status_change” | “priority_change” | “comment” | “archive” | “restore” | “complete” | “incomplete”
- `creator` (string): Filter by creator user ID
- `subjectId` (string): Filter by subject ID
- `limit` (integer, default: 50): Number of activities
- `skip` (integer, default: 0): Number to skip

**Response:** Same format as `/subject` endpoint

**Use when:** Viewing filtered activity logs

---

### 🏷️ LABEL ENDPOINTS

Labels are color-coded tags for categorizing tasks.

### POST `/api/labels`

**Purpose:** Create a new label

**What it does:**

- Creates a label for a specific board
- Labels are board-specific
- Can be attached to multiple tasks

**Request Body:**

```json
{
  "title": "Urgent",
  "color": "#ef4444",
  "board_id": "board_id"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Label created successfully",
  "data": {
    "_id": "new_label_id",
    "title": "Urgent",
    "color": "#ef4444",
    "board_id": "board_id"
  }
}
```

**Use when:** Creating a new label for a board

---

### GET `/api/labels/board/:boardId`

**Purpose:** Get all labels for a board

**What it does:**

- Returns all labels belonging to a specific board
- Labels can be used to tag tasks in that board

**Path Parameters:**

- `boardId` (string): Board MongoDB ObjectId

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "label_id",
      "title": "Urgent",
      "color": "#ef4444",
      "board_id": "board_id"
    },
    {
      "_id": "label_id_2",
      "title": "Bug",
      "color": "#f59e0b",
      "board_id": "board_id"
    }
  ]
}
```

**Use when:** Loading available labels for a board

---

### GET `/api/labels/:id`

**Purpose:** Get a specific label by ID

**What it does:**

- Returns label details

**Path Parameters:**

- `id` (string): Label MongoDB ObjectId

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "label_id",
    "title": "Urgent",
    "color": "#ef4444",
    "board_id": "board_id"
  }
}
```

**Use when:** Viewing label details

---

### PUT `/api/labels/:id`

**Purpose:** Update a label

**What it does:**

- Update label title or color

**Path Parameters:**

- `id` (string): Label MongoDB ObjectId

**Request Body:**

```json
{
  "title": "Critical",
  "color": "#dc2626"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Label updated successfully",
  "data": {
    "_id": "label_id",
    "title": "Critical",
    "color": "#dc2626"
  }
}
```

**Use when:** Updating label properties

---

### DELETE `/api/labels/:id`

**Purpose:** Delete a label

**What it does:**

- Permanently deletes label
- Label is removed from all tasks that reference it

**Path Parameters:**

- `id` (string): Label MongoDB ObjectId

**Response:**

```json
{
  "success": true,
  "message": "Label deleted successfully"
}
```

**Use when:** Removing unused labels

---

### 💬 INTERNAL CHAT ENDPOINTS

Internal chat allows task-specific communication between team members.

### POST `/api/internal-chat/create`

**Purpose:** Create a new chat message

**What it does:**

- Creates chat message associated with a task
- Sender is automatically set to authenticated user
- Emits real-time event to connected clients

**Request Body:**

```json
{
  "taskId": "task_id",
  "message": "Let's discuss the approach",
  "userId": "sender_user_id"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Chat message created successfully",
  "data": {
    "_id": "new_message_id",
    "taskId": "task_id",
    "message": "Let's discuss the approach",
    "sender": "user_id",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Use when:** Sending a message about a task

---

### GET `/api/internal-chat/get-by-task/:taskId`

**Purpose:** Get all chat messages for a task

**What it does:**

- Returns all chat messages for a specific task
- Ordered by creation time (oldest first)

**Path Parameters:**

- `taskId` (string): Task MongoDB ObjectId

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "message_id",
      "taskId": "task_id",
      "message": "First message",
      "sender": {
        "_id": "user_id",
        "login": "john.doe",
        "avatar": "https://..."
      },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Use when:** Loading chat history for a task

---

### PUT `/api/internal-chat/update/:messageId`

**Purpose:** Update a chat message

**What it does:**

- Update message content
- Only sender can update their own messages

**Path Parameters:**

- `messageId` (string): Chat message MongoDB ObjectId

**Request Body:**

```json
{
  "message": "Updated message content"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Chat message updated successfully",
  "data": {
    "_id": "message_id",
    "message": "Updated message content"
  }
}
```

**Use when:** Editing a sent message

---

### DELETE `/api/internal-chat/delete/:messageId`

**Purpose:** Delete a chat message

**What it does:**

- Permanently deletes chat message
- Only sender can delete their own messages

**Path Parameters:**

- `messageId` (string): Chat message MongoDB ObjectId

**Response:**

```json
{
  "success": true,
  "message": "Chat message deleted successfully"
}
```

**Use when:** Removing an incorrect message

---

### 📋 PREDEFINED SUBTASK ENDPOINTS

Predefined subtasks are reusable templates for common task checklists.

### POST `/api/predefined-subtasks/create`

**Purpose:** Create a predefined subtask template

**What it does:**

- Creates a reusable subtask template
- Can include nested todos
- Templates can be added to tasks during task creation or update

**Request Body:**

```json
{
  "taskTitle": "Initial Follow-up",
  "taskDescription": "Call lead within 24 hours",
  "priority": "high",
  "category": "category_id",
  "tags": ["followup", "critical"],
  "todo": [
    {
      "title": "Research lead",
      "priority": "medium"
    },
    {
      "title": "Prepare call script",
      "priority": "high"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Predefined subtask created successfully",
  "data": {
    "_id": "new_subtask_id",
    "taskTitle": "Initial Follow-up",
    "priority": "high",
    "isActive": true
  }
}
```

**Use when:** Creating a reusable subtask template

---

### GET `/api/predefined-subtasks/get-all`

**Purpose:** Get all predefined subtasks

**What it does:**

- Returns all predefined subtask templates
- Can filter by category, priority, active status
- Supports full-text search

**Query Parameters:**

- `category` (string): Filter by category ID
- `priority` (string): Filter by priority (low, medium, high)
- `isActive` (boolean): Filter by active status
- `search` (string): Search in title and description

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "subtask_id",
      "taskTitle": "Initial Follow-up",
      "taskDescription": "Call lead within 24 hours",
      "priority": "high",
      "category": "category_id",
      "tags": ["followup", "critical"],
      "isActive": true
    }
  ]
}
```

**Use when:** Loading available subtask templates

---

### GET `/api/predefined-subtasks/get-by-id/:id`

**Purpose:** Get a specific predefined subtask by ID

**What it does:**

- Returns full subtask template with todos

**Path Parameters:**

- `id` (string): Predefined subtask MongoDB ObjectId

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "subtask_id",
    "taskTitle": "Initial Follow-up",
    "taskDescription": "Call lead within 24 hours",
    "priority": "high",
    "category": "category_id",
    "todo": [
      {
        "title": "Research lead",
        "priority": "medium"
      }
    ]
  }
}
```

**Use when:** Viewing full template details

---

### PUT `/api/predefined-subtasks/update/:id`

**Purpose:** Update a predefined subtask

**What it does:**

- Update subtask template properties
- Supports smart merge for todos array

**Path Parameters:**

- `id` (string): Predefined subtask MongoDB ObjectId

**Request Body:**

```json
{
  "taskTitle": "Updated title",
  "taskDescription": "Updated description",
  "priority": "high",
  "todo": [
    {
      "_id": "existing_todo_id",
      "title": "Update existing todo",
      "isCompleted": false
    },
    {
      "title": "Add new todo"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Predefined subtask updated successfully",
  "data": {
    "_id": "subtask_id",
    "taskTitle": "Updated title"
  }
}
```

**Use when:** Updating a subtask template

---

### DELETE `/api/predefined-subtasks/delete/:id`

**Purpose:** Delete a predefined subtask

**What it does:**

- Soft delete by default (sets `isActive: false`)
- Hard delete if `permanent=true` query parameter provided

**Path Parameters:**

- `id` (string): Predefined subtask MongoDB ObjectId

**Query Parameters:**

- `permanent` (boolean, default: false): If true, permanently delete

**Response:**

```json
{
  "success": true,
  "message": "Predefined subtask deleted successfully"
}
```

**Use when:** Removing unused templates

---

### 📁 PREDEFINED SUBTASK CATEGORY ENDPOINTS

Categories organize predefined subtask templates.

### POST `/api/predefined-subtask-categories/create-task-category`

**Purpose:** Create a new predefined subtask category (Admin only)

**What it does:**

- Creates a category for organizing subtask templates
- Sets default priority, duration, due date for templates in category
- Can enable standalone usage

**Request Body:**

```json
{
  "taskCategoryTitle": "Lead Management",
  "taskCategoryDescription": "Tasks for managing leads",
  "tags": ["lead", "sales"],
  "priority": "medium",
  "estimatedDuration": 60,
  "dueDate": "2024-12-31T23:59:59Z",
  "isStandaloneEnabled": true,
  "isActive": true
}
```

**Response:**

```json
{
  "success": true,
  "message": "Predefined subtask category created successfully",
  "data": {
    "_id": "new_category_id",
    "taskCategoryTitle": "Lead Management",
    "priority": "medium"
  }
}
```

**Use when:** Creating a new category (Admin only)

---

### GET `/api/predefined-subtask-categories/get-all-task-categories`

**Purpose:** Get all predefined subtask categories

**What it does:**

- Returns all categories
- Can filter by priority, active status, standalone enabled

**Query Parameters:**

- `priority` (string): Filter by priority (low, medium, high)
- `isActive` (boolean): Filter by active status (default: true)
- `isStandaloneEnabled` (boolean): Filter by standalone enabled
- `search` (string): Full-text search on title, description, tags

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "category_id",
      "taskCategoryTitle": "Lead Management",
      "taskCategoryDescription": "Tasks for managing leads",
      "priority": "medium",
      "isActive": true,
      "isStandaloneEnabled": true
    }
  ]
}
```

**Use when:** Loading categories for filtering/subtask creation

---

### GET `/api/predefined-subtask-categories/get-task-category-by-id/:id`

**Purpose:** Get a specific category by ID

**What it does:**

- Returns full category details

**Path Parameters:**

- `id` (string): Category MongoDB ObjectId

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "category_id",
    "taskCategoryTitle": "Lead Management",
    "taskCategoryDescription": "Tasks for managing leads",
    "priority": "medium",
    "estimatedDuration": 60
  }
}
```

**Use when:** Viewing category details

---

### PUT `/api/predefined-subtask-categories/update-task-category/:id`

**Purpose:** Update a category (Admin only)

**What it does:**

- Update category properties

**Path Parameters:**

- `id` (string): Category MongoDB ObjectId

**Request Body:**

```json
{
  "taskCategoryTitle": "Updated Title",
  "priority": "high",
  "isActive": true
}
```

**Response:**

```json
{
  "success": true,
  "message": "Predefined subtask category updated successfully",
  "data": {
    "_id": "category_id",
    "taskCategoryTitle": "Updated Title"
  }
}
```

**Use when:** Updating category properties (Admin only)

---

### DELETE `/api/predefined-subtask-categories/delete-task-category/:id`

**Purpose:** Delete a category (Admin only)

**What it does:**

- Soft delete by default (sets `isActive: false`)
- Hard delete if `permanent=true`

**Path Parameters:**

- `id` (string): Category MongoDB ObjectId

**Query Parameters:**

- `permanent` (boolean, default: false): If true, permanently delete

**Response:**

```json
{
  "success": true,
  "message": "Predefined subtask category deleted successfully"
}
```

**Use when:** Removing unused categories (Admin only)

---

### POST `/api/predefined-subtask-categories/seed-reserved`

**Purpose:** Seed reserved categories for the current user

**What it does:**

- Automatically creates 5 reserved categories if they don’t exist:
- Lead
- Offer
- Opening
- Email
- Global
- Returns lists of created, existing, and failed categories

**Request Body:** None

**Response:**

```json
{
  "success": true,
  "message": "Reserved categories seeded successfully",
  "data": {
    "created": ["Lead", "Offer"],
    "existing": ["Opening", "Email", "Global"],
    "failed": []
  }
}
```

**Use when:** Setting up system for first time or ensuring reserved categories exist

---

### 👥 USER ENDPOINTS

User endpoints for retrieving user information.

### GET `/api/users/get-users`

**Purpose:** Get users with pagination and filters

**What it does:**

- Returns users with pagination
- **Admin:** Returns all users in system
- **Other roles:** Returns only users from same office(s)
- Supports search and active status filtering

**Query Parameters:**

- `page` (integer, default: 1): Page number
- `limit` (integer, default: 100, max: 500): Users per page
- `active` (boolean): Filter by active status
- `search` (string): Search in login, email, first_name, last_name, name fields

**Response:**

```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [
    {
      "_id": "user_id",
      "login": "john.doe",
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "name": "John Doe",
      "role": "Agent",
      "active": true,
      "status": "active",
      "offices": [...],
      "primary_office": {...},
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 100,
    "pages": 2,
    "offset": 0
  }
}
```

**Use when:** Loading users for task assignment, team member selection

---

## Data Models

### Task Model

**Collection:** `tasks`

```tsx
{
  _id: ObjectId
  board_id: ObjectId[]
  list_id: ObjectId[]

  // Task details
  taskTitle: string                    // Required
  taskDescription?: string
  task_type: 'lead' | 'offer' | 'opening' | 'email' | 'custom'
  priority: 'low' | 'medium' | 'high'
  position: number                     // For ordering within list

  // Entity references
  lead_id?: ObjectId
  offer_id?: ObjectId
  opening_id?: ObjectId
  email_id?: ObjectId

  // Assignments
  assigned: ObjectId[]
  createdBy?: ObjectId

  // Nested structures
  subTask: [{
    taskTitle: string
    taskDescription?: string
    assigned: ObjectId[]
    status: string
    priority: 'low' | 'medium' | 'high'
    dueDate?: Date
    attachment: ObjectId[]
    internalChat: ObjectId[]
    isCompleted: boolean
    is_predefined?: boolean
    predefined_subtask_id?: ObjectId
    todo: [{
      title: string
      description?: string
      isCompleted: boolean
      priority: 'low' | 'medium' | 'high'
      dueDate?: Date
      assigned: ObjectId[]
    }]
  }]

  labels: [{
    _id: ObjectId
    title: string
    color: string
    isSelected: boolean
  }]

  custom_fields: [{
    title: string
    description?: string
    value?: string
    field_type: string
    options: string[]
    todo: [{
      title: string
      description?: string
      isCompleted: boolean
      priority: 'low' | 'medium' | 'high'
      dueDate?: Date
      assigned: ObjectId[]
    }]
  }]

  // Status
  isCompleted: boolean
  status?: string

  // Timestamps
  createdAt: Date
  updatedAt: Date
}
```

### Board Model

**Collection:** `boards`

```tsx
{
  _id: ObjectId
  name: string                          // Required
  board_type: 'LEAD' | 'OFFER' | 'OPENING' | 'EMAIL' | 'CUSTOM'
  description?: string
  is_system: boolean                    // System vs user board
  position: number

  // System boards: no owner
  // User boards: has owner
  created_by?: ObjectId

  // Members
  members: [{
    user_id: ObjectId
    joined_at: Date
    role?: string
  }]

  lists: ObjectId[]

  createdAt: Date
  updatedAt: Date
}
```

### List Model

**Collection:** `lists`

```tsx
{
  _id: ObjectId
  listTitle: string                     // Required
  types: 'todo' | 'in_progress' | 'completed' | 'cancelled'
  board_id: ObjectId
  position: number                     // For ordering lists within board

  tasks: ObjectId[]

  createdAt: Date
  updatedAt: Date
}
```

---

## Real-time Communication

### Socket.IO Events

**Connection:** `ws://localhost:3015`

### Client-Side Events (Emitted by Server)

### Task Events

```tsx
// Task created
socket.on('task:created', (data) => {
  const { task, boardId, listId } = data;
  // Update UI with new task
});

// Task updated
socket.on('task:updated', (data) => {
  const { task, changes } = data;
  // Update task in UI
});

// Task deleted
socket.on('task:deleted', (data) => {
  const { taskId } = data;
  // Remove task from UI
});

// Task moved
socket.on('task:moved', (data) => {
  const { taskId, fromListId, toListId, newPosition } = data;
  // Update task position
});
```

### List Events

```tsx
// List created
socket.on('list:created', (data) => {
  const { list, boardId } = data;
  // Add new list to board
});

// List updated
socket.on('list:updated', (data) => {
  const { list, changes } = data;
  // Update list in UI
});

// List deleted
socket.on('list:deleted', (data) => {
  const { listId } = data;
  // Remove list from UI
});
```

### Chat Events

```tsx
// New chat message
socket.on('chat:message', (data) => {
  const { taskId, message, sender, timestamp } = data;
  // Display chat message
});
```

### Server-Side Events (Emitted by Server)

The server emits events through the `socketService`:

```tsx
// Task events
socketService.emit('task:created', { task, boardId, listId });
socketService.emit('task:updated', { task, changes });
socketService.emit('task:deleted', { taskId });
socketService.emit('task:moved', { taskId, fromListId, toListId, newPosition });

// List events
socketService.emit('list:created', { list, boardId });
socketService.emit('list:updated', { list, changes });
socketService.emit('list:deleted', { listId });

// Chat events
socketService.emit('chat:message', { taskId, message, sender, timestamp });
```

### Socket.IO Connection

```tsx
import { io } from 'socket.io-client';

// Connect to server
const socket = io('http://localhost:3015', {
  auth: {
    token: localStorage.getItem('token'),
  },
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to Todo Board Service');
});

socket.on('disconnect', () => {
  console.log('Disconnected from Todo Board Service');
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});
```

---

## Service Integrations

### Integration with Lead-Offer-Service

**Pattern:** Shared Database (Direct Model Access)

**How it works:**

1. **Offer Created:**
   - Lead-Offer-Service creates an offer record
   - Automatically creates a task in the `tasks` collection
   - Task is linked to the offer via `offer_id`
2. **Opening Created:**
   - Lead-Offer-Service creates an opening record
   - Automatically creates a task in the `tasks` collection
   - Task is linked to the opening via `opening_id`
3. **Task Creation Flow:**

```jsx
// In lead-offer-service-api
const { Task } = require('../models/Task');

// When offer is created
const task = new Task({
  taskTitle: `Offer "${offer.title}" -${investmentVolume}`,
  taskDescription: `Follow up on offer for lead "${leadName}"`,
  task_type: 'offer',
  offer_id: offer._id,
  lead_id: lead._id,
  priority: calculatePriority(offer.investment_volume),
  assigned: [assigned_agent_id],
  // ... other fields
});

await task.save();

// Log activity to both collections
await logTaskActivity(creator, task._id, 'CREATE', 'Task created');
```

1. **Board/List Association:**
   - Tasks are automatically associated with OFFER or OPENING board
   - Tasks go to “Todo” list by default
   - Position is automatically calculated

### Integration with Email-Service

**Pattern:** Shared Database (Direct Model Access)

**How it works:**

1. **Email Received:**
   - Email-Service receives email
   - Matches email to lead (if possible)
   - Creates a task in the `tasks` collection
   - Task is linked to email via `email_id`
2. **Task Creation Flow:**

```jsx
// In email-service-api
const { Task } = require('../models/Task');

// When email is received
const task = new Task({
  taskTitle: `New email from${fromAddress}`,
  taskDescription: `Subject:${subject}`,
  task_type: 'email',
  email_id: emailRecord._id,
  lead_id: matchedLeadId,
  priority: 'medium',
  assigned: [assigned_agent_id],
  // ... other fields
});

await task.save();

// Send notification via notification service
await emitEvent('todo:created', { todo: task, lead, assignee });
```

1. **Board/List Association:**
   - Tasks are associated with EMAIL board
   - Tasks go to “Inbox” list by default

### Integration with Notification-Service

**Pattern:** Event Emission → Notification Service

**How it works:**

1. **Todo Created Event:**

```jsx
// In todo-bord-service
const { eventEmitter, EVENT_TYPES } = require('../utils/events');

eventEmitter.emit(EVENT_TYPES.TODO.CREATED, {
  todo: task,
  lead: lead,
  assignee: assignedUser,
  creator: req.user,
});
```

1. **Notification Service Listens:**
   - Notification-service receives event
   - Creates notification for assignee
   - Sends via Socket.IO and Telegram

---

## RBAC & Security

### Permission System

**Permission Format:** `resource:action:scope`

**Kanban Permissions:**

```tsx
// Task permissions
'kanban:task:create'; // Create tasks
'kanban:task:read:all'; // Read all tasks
'kanban:task:read:assigned'; // Read assigned tasks
'kanban:task:read:own'; // Read own tasks
'kanban:task:update:all'; // Update any task
'kanban/task:update:assigned'; // Update assigned tasks
'kanban:task:update:own'; // Update own tasks
'kanban:task:delete:all'; // Delete any task
'kanban:task:delete:assigned'; // Delete assigned tasks
'kanban:task:delete:own'; // Delete own tasks

// Board permissions
'kanban:board:create'; // Create boards
'kanban:board:read:all'; // Read all boards
'kanban:board:update:all'; // Update any board
'kanban:board:delete:all'; // Delete any board

// List permissions
'kanban:list:create'; // Create lists
'kanban:list:read:all'; // Read all lists
'kanban:list:update:all'; // Update any list
'kanban:list:delete:all'; // Delete any list
```

### Role Hierarchy

**Roles:**

1. **ADMIN** - Full access to all resources
2. **USER** - Limited access to own data
3. **TRIAL_USER** - Read-only access

### Permission Middleware Usage

**In Routes:**

```tsx
import { Authentication } from '../../middleware/authentication';
import { Authorize } from '../../middleware/authorize';
import { PERMISSIONS } from '../../lib/pm/config';

// Admin only
router.post(
  '/create',
  Authentication,
  Authorize({ permissions: PERMISSIONS.KANBAN_TASK_CREATE }),
  taskController.createTask
);

// Read access (own, assigned, or all)
router.get(
  '/get-all',
  Authentication,
  authorizeKanbanTaskRead, // Custom: checks read:all, read:assigned, or read:own
  taskController.getTasks
);

// Update own or all
router.patch(
  '/:taskId',
  Authentication,
  Authorize({
    resource: { type: 'task', idParam: 'taskId', allowOwnership: true },
    permissions: PERMISSIONS.KANBAN_TASK_UPDATE_ALL,
  }),
  taskController.updateTask
);
```

### Authentication

**JWT Token Verification:**

```tsx
// Include token in Authorization header
Authorization: Bearer <jwt_token>

// Token payload
{
  userId: string
  email: string
  role: 'ADMIN' | 'USER' | 'TRIAL_USER'
  permissions: string[]
}
```

---

## Activity Logging

### Dual Activity System

Todo Board Service maintains **two** activity logs:

1. **Activities Collection** (`activities`)
   - For todos, leads, offers, etc.
   - Main activity log
2. **TaskServiceActivity Collection** (`taskserviceactivities`)
   - For tasks, boards, lists specifically
   - Kanban-focused activity log

### Activity Schema

```tsx
{
  _id: ObjectId
  creator: ObjectId                      // User who performed action
  subject_id: ObjectId                   // Entity ID (task/list/board)
  subject_type: 'Task' | 'List' | 'Board' | 'User' | 'System'
  action: 'create' | 'update' | 'delete' | 'move' | etc.
  message: string                        // Human-readable message
  visibility: 'admin' | 'self' | 'all'
  metadata: {
    board_id?: ObjectId
    list_id?: ObjectId
    lead_id?: ObjectId
    offer_id?: ObjectId
    opening_id?: ObjectId
    email_id?: ObjectId
    task_type?: string
    source?: string                      // Service that created activity
    changes?: object                   // What changed
  }
  createdAt: Date
}
```

### Logging Activities

**Manual Logging:**

```tsx
import { logTaskActivity, TASK_ACTIVITY_ACTIONS } from '../utils/dualActivityLogger';

await logTaskActivity(
  userId, // Creator
  taskId, // Subject ID
  TASK_ACTIVITY_ACTIONS.UPDATE,
  'Task "Call lead" updated',
  {
    board_id: boardId,
    list_id: listId,
    task_type: 'lead',
    changes: { isCompleted: false, isCompleted: true },
  }
);
```

**Automatic Logging:**

```tsx
import { emitTaskUpdated } from '../utils/socketEvents';

// This automatically logs activity
emitTaskUpdated(io, task, changes, userId);
```

---

## Development Guide

### Adding a New Feature

### Step 1: Create Interface

Create `src/features/yourFeature/yourFeature.interface.ts`:

```tsx
export interface IYourFeature {
  _id?: string;
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type TYourFeature = IYourFeature;
```

### Step 2: Create Model

Create `src/models/yourFeature.model.ts`:

```tsx
import mongoose, { Schema, Model } from 'mongoose';
import { IYourFeature } from '../features/yourFeature/yourFeature.interface';

const yourFeatureSchema = new Schema<IYourFeature>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const YourFeatureModel = mongoose.model('YourFeature', yourFeatureSchema);
```

### Step 3: Create Service

Create `src/features/yourFeature/yourFeature.service.ts`:

```tsx
import { YourFeatureModel } from '../../models/yourFeature.model';

async function createFeature(data: Partial<IYourFeature>) {
  return await YourFeatureModel.create(data);
}

async function getAllFeatures(filters?: any) {
  return await YourFeatureModel.find(filters);
}

async function updateFeature(id: string, data: Partial<IYourFeature>) {
  return await YourFeatureModel.findByIdAndUpdate(id, data, { new: true });
}

async function deleteFeature(id: string) {
  return await YourFeatureModel.findByIdAndDelete(id);
}

export const yourFeatureService = {
  createFeature,
  getAllFeatures,
  updateFeature,
  deleteFeature,
};
```

### Step 4: Create Controller

Create `src/features/yourFeature/yourFeature.controller.ts`:

```tsx
import { Request, Response } from 'express';
import { yourFeatureService } from './yourFeature.service';
import sendResponse from '../../utils/sendResponse';
import catchAsync from '../../utils/catchAsync';
import AppError from '../../errors/appError';

export const yourFeatureController = {
  createFeature: catchAsync(async (req: Request, res: Response) => {
    const result = await yourFeatureService.createFeature(req.body);
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Feature created successfully',
      data: result,
    });
  }),

  getAllFeatures: catchAsync(async (req: Request, res: Response) => {
    const result = await yourFeatureService.getAllFeatures(req.query);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      data: result,
    });
  }),
};
```

### Step 5: Create Route

Create `src/features/yourFeature/yourFeature.route.ts`:

```tsx
import { Router } from 'express';
import { yourFeatureController } from './yourFeature.controller';
import Authentication from '../../middleware/authentication';

const router = Router();

router.post('/create', Authentication, yourFeatureController.createFeature);
router.get('/get-all', Authentication, yourFeatureController.getAllFeatures);

export default router;
```

### Step 6: Register Route

Update `src/routes/index.ts`:

```tsx
import { YourFeatureRoute } from '../features/yourFeature/yourFeature.route';

const applicationRoutes = [
  // ... existing routes
  {
    path: '/your-features',
    route: YourFeatureRoute,
  },
];
```

### Step 7: Add Permissions

Update `src/lib/pm/config.ts`:

```tsx
export const PERMISSIONS = {
  // ... existing permissions

  // Your Feature
  YOUR_FEATURE_CREATE: 'your_feature:create',
  YOUR_FEATURE_READ_ALL: 'your_feature:read:all',
  YOUR_FEATURE_UPDATE_ALL: 'your_feature:update:all',
  YOUR_FEATURE_DELETE_ALL: 'your_feature:delete:all',
} as const;
```

---

## Testing

### Unit Testing

```bash
# Run tests (if configured)
pnpm test
```

### API Testing with Postman

Import the API documentation:

```bash
# Access Swagger UI
http://localhost:3015/api-docs
```

### Manual Testing

### Test Task Creation

```bash
curl -X POST http://localhost:3015/api/tasks/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "taskTitle": "Test Task",
    "taskDescription": "This is a test task",
    "priority": "high",
    "task_type": "custom",
    "assigned": ["user_id"]
  }'
```

### Test Board Initialization

```bash
curl -X POST http://localhost:3015/api/boards/initialize-system \
  -H "Authorization: Bearer <token>"
```

### Load Testing

```bash
# Use Apache Bench
ab -n 1000 -c 10 -H "Authorization: Bearer <token>" \
   http://localhost:3015/api/tasks/get-all
```

---

## Deployment

### Production Build

```bash
# Build TypeScript
pnpm build

# Start with PM2
pnpm pm2:start
```

### Environment Variables

**Production (.env):**

```
PORT=3015
NODE_ENVIRONMENT=production
DATABASE_URL=mongodb://your-mongodb-cluster/leadpylot-todo
SECRET_TOKEN=your-production-secret
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Docker Deployment

**docker-compose.yml:**

```yaml
version:'3.8'

services:
todo-bord-service:
build: .
ports:
-"3015:3015"
environment:
- NODE_ENV=production
- PORT=3015
- DATABASE_URL=${DATABASE_URL}
- SECRET_TOKEN=${SECRET_TOKEN}
depends_on:
- mongodb
restart: unless-stopped
```

---

## Troubleshooting

### Common Issues

### 1. Socket.IO Connection Fails

**Problem:** Client can’t connect to WebSocket

**Solutions:**

- Check CORS configuration in `src/app.ts`
- Verify Socket.IO client version matches server version
- Check firewall allows port 3015
- Verify authentication token is valid

### 2. Tasks Not Appearing

**Problem:** Task created but not visible in UI

**Solutions:**

- Check if task has valid `board_id` and `list_id`
- Verify user is member of the board
- Check `position` value is correct
- Verify filters in query parameters

### 3. Position Ordering Issues

**Problem:** Tasks not in correct order

**Solutions:**

- Check `position` field is set correctly
- Verify list’s `position` is correct
- Rebalance task positions if needed

### 4. Activity Logs Not Created

**Problem:** Activities not being logged

**Solutions:**

- Check `logger.js` configuration
- Verify `dualActivityLogger.ts` is being called
- Check database indexes exist

### Debug Mode

Enable detailed logging:

```
LOG_LEVEL=debug
```

---

**Last Updated:** March 2025
**Version:** 2.0.0

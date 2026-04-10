# Todo API Documentation

This document provides comprehensive API documentation for Todo CRUD operations, including the new individual todoType status tracking feature.

## Base URL
```
/api/todos
```

## Authentication
All endpoints require authentication. Include the authentication token in the request headers:
```
Authorization: Bearer <your-token>
```

## Authorization Levels
- **Agent/Admin**: Can create, read, update, and delete todos for leads they have access to
- **Assigned Users**: Can update todoType statuses for todos assigned to them

---

## API Endpoints

### 1. Create Todo

Create a new todo/ticket for a lead with multiple todo types. Each todo type can be individually tracked for completion status.

**Endpoint:** `POST /api/todos`

**Access:** Agent/Admin

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lead_id` | string (MongoId) | Yes | MongoDB ObjectId of the lead |
| `message` | string | Yes | Todo message/ticket description (1-500 characters) |
| `todoTypesids` | array | Yes | Array of todo types. Can be array of strings (old format) or array of objects (new format) |
| `assignto` | string (MongoId) | Yes | MongoDB ObjectId of the user to assign this todo to |
| `documents_ids` | string[] | No | Array of Document MongoDB ObjectIds (optional) |

**todoTypesids Format:**

**New Format (Recommended):**
```json
[
  {
    "todoTypeId": "507f1f77bcf86cd799439012",
    "isDone": false
  },
  {
    "todoTypeId": "507f1f77bcf86cd799439013",
    "isDone": false
  }
]
```

**Old Format (Backward Compatible):**
```json
[
  "507f1f77bcf86cd799439012",
  "507f1f77bcf86cd799439013"
]
```

**Example Request (New Format):**
```json
{
  "lead_id": "507f1f77bcf86cd799439011",
  "message": "Follow up with client regarding investment opportunity",
  "todoTypesids": [
    {
      "todoTypeId": "507f1f77bcf86cd799439012",
      "isDone": false
    },
    {
      "todoTypeId": "507f1f77bcf86cd799439013",
      "isDone": false
    }
  ],
  "assignto": "507f1f77bcf86cd799439014",
  "documents_ids": [
    "507f1f77bcf86cd799439015",
    "507f1f77bcf86cd799439016"
  ]
}
```

**Example Request (Old Format - Still Supported):**
```json
{
  "lead_id": "507f1f77bcf86cd799439011",
  "message": "Follow up with client",
  "todoTypesids": [
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013"
  ],
  "assignto": "507f1f77bcf86cd799439014"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439017",
    "creator_id": {
      "_id": "507f1f77bcf86cd799439018",
      "login": "admin@example.com",
      "first_name": "John",
      "last_name": "Doe"
    },
    "lead_id": {
      "_id": "507f1f77bcf86cd799439011",
      "contact_name": "Jane Smith",
      "email_from": "jane.smith@example.com",
      "phone": "+1234567890"
    },
    "message": "Follow up with client regarding investment opportunity",
    "isDone": false,
    "active": true,
    "assigned_to": {
      "_id": "507f1f77bcf86cd799439014",
      "login": "agent@example.com",
      "first_name": "Alice",
      "last_name": "Johnson"
    },
    "todoTypesids": [
      {
        "todoTypeId": {
          "_id": "507f1f77bcf86cd799439012",
          "name": "Follow Up",
          "description": "Follow up with client",
          "status": "active"
        },
        "isDone": false
      },
      {
        "todoTypeId": {
          "_id": "507f1f77bcf86cd799439013",
          "name": "Document Review",
          "description": "Review client documents",
          "status": "active"
        },
        "isDone": false
      }
    ],
    "documents_ids": [
      "507f1f77bcf86cd799439015",
      "507f1f77bcf86cd799439016"
    ],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Todo created successfully"
}
```

**Error Responses:**

**400 Bad Request - Validation Error:**
```json
{
  "error": "Validation failed",
  "errors": {
    "lead_id": "Valid lead_id is required",
    "message": "Message must be between 1 and 500 characters",
    "todoTypesids": "todoTypesids must be a non-empty array",
    "assignto": "Valid assignto user id is required"
  }
}
```

**404 Not Found - Lead Not Found:**
```json
{
  "error": "Lead not found"
}
```

**404 Not Found - Assignee Not Found:**
```json
{
  "error": "Assignee user not found"
}
```

**401 Unauthorized:**
```json
{
  "error": "Authentication required"
}
```

**403 Forbidden - No Access to Lead:**
```json
{
  "error": "You can only create todos for your assigned leads"
}
```

---

### 2. Update Todo

Update a todo's message, overall status, or individual todoType completion statuses.

**Endpoint:** `PUT /api/todos/:id`

**Access:** Agent/Admin (Assigned users can update todoType statuses)

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | MongoDB ObjectId of the todo |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | No | Updated message (1-500 characters) |
| `isDone` | boolean | No | Overall todo completion status |
| `todoTypesids` | array | No | Array of todo types with updated statuses |

**todoTypesids Update Format:**
```json
[
  {
    "todoTypeId": "507f1f77bcf86cd799439012",
    "isDone": true
  },
  {
    "todoTypeId": "507f1f77bcf86cd799439013",
    "isDone": false
  }
]
```

**Note:** When updating `todoTypesids`, you only need to include the todoTypes you want to update. The system will merge your updates with existing todoTypes.

**Example Request - Update Message:**
```json
{
  "message": "Updated follow up message"
}
```

**Example Request - Update Overall Status:**
```json
{
  "isDone": true
}
```

**Example Request - Update Individual TodoType Statuses:**
```json
{
  "todoTypesids": [
    {
      "todoTypeId": "507f1f77bcf86cd799439012",
      "isDone": true
    },
    {
      "todoTypeId": "507f1f77bcf86cd799439013",
      "isDone": false
    }
  ]
}
```

**Example Request - Update Multiple Fields:**
```json
{
  "message": "Updated message",
  "todoTypesids": [
    {
      "todoTypeId": "507f1f77bcf86cd799439012",
      "isDone": true
    }
  ]
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439017",
    "creator_id": {
      "_id": "507f1f77bcf86cd799439018",
      "login": "admin@example.com",
      "first_name": "John",
      "last_name": "Doe"
    },
    "lead_id": {
      "_id": "507f1f77bcf86cd799439011",
      "contact_name": "Jane Smith",
      "email_from": "jane.smith@example.com",
      "phone": "+1234567890"
    },
    "message": "Updated follow up message",
    "isDone": false,
    "active": true,
    "assigned_to": {
      "_id": "507f1f77bcf86cd799439014",
      "login": "agent@example.com",
      "first_name": "Alice",
      "last_name": "Johnson"
    },
    "todoTypesids": [
      {
        "todoTypeId": {
          "_id": "507f1f77bcf86cd799439012",
          "name": "Follow Up",
          "description": "Follow up with client",
          "status": "active"
        },
        "isDone": true
      },
      {
        "todoTypeId": {
          "_id": "507f1f77bcf86cd799439013",
          "name": "Document Review",
          "description": "Review client documents",
          "status": "active"
        },
        "isDone": false
      }
    ],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  },
  "message": "Todo updated successfully"
}
```

**Error Responses:**

**400 Bad Request - Validation Error:**
```json
{
  "error": "Validation failed",
  "errors": {
    "message": "Message must be between 1 and 500 characters",
    "todoTypesids": "Invalid todoTypesids format"
  }
}
```

**404 Not Found:**
```json
{
  "error": "Todo not found"
}
```

**403 Forbidden - No Permission:**
```json
{
  "error": "You can only update todo types for todos assigned to you or your assigned leads"
}
```

---

### 3. Toggle Todo Status

Quickly toggle the overall todo completion status.

**Endpoint:** `PATCH /api/todos/:id/status`

**Access:** Agent/Admin

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | MongoDB ObjectId of the todo |

**Request Body:**
```json
{
  "isDone": true
}
```

**Success Response (200 OK):**
Same structure as Update Todo response.

---

### 4. Get Todo by ID

Retrieve a single todo with all its details including populated todoTypes.

**Endpoint:** `GET /api/todos/:id`

**Access:** Agent/Admin

**Request Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | MongoDB ObjectId of the todo |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439017",
    "creator_id": {
      "_id": "507f1f77bcf86cd799439018",
      "login": "admin@example.com",
      "first_name": "John",
      "last_name": "Doe"
    },
    "lead_id": {
      "_id": "507f1f77bcf86cd799439011",
      "contact_name": "Jane Smith",
      "email_from": "jane.smith@example.com",
      "phone": "+1234567890"
    },
    "message": "Follow up with client",
    "isDone": false,
    "active": true,
    "assigned_to": {
      "_id": "507f1f77bcf86cd799439014",
      "login": "agent@example.com",
      "first_name": "Alice",
      "last_name": "Johnson"
    },
    "todoTypesids": [
      {
        "todoTypeId": {
          "_id": "507f1f77bcf86cd799439012",
          "name": "Follow Up",
          "description": "Follow up with client",
          "status": "active"
        },
        "isDone": false
      },
      {
        "todoTypeId": {
          "_id": "507f1f77bcf86cd799439013",
          "name": "Document Review",
          "description": "Review client documents",
          "status": "active"
        },
        "isDone": false
      }
    ],
    "documents_ids": [],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 5. Get All Todos

Retrieve all todos with filtering, pagination, and statistics.

**Endpoint:** `GET /api/todos`

**Access:** Agent/Admin

**Request Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number for pagination |
| `limit` | number | No | 20 | Number of todos per page |
| `lead_id` | string | No | - | Filter by specific lead ID |
| `creator_id` | string | No | - | Filter by todo creator (Admin only) |
| `isDone` | boolean | No | - | Filter by completion status |
| `showInactive` | boolean | No | false | Include inactive todos |
| `search` | string | No | - | Search in todo messages |

**Example Request:**
```
GET /api/todos?page=1&limit=20&isDone=false&lead_id=507f1f77bcf86cd799439011
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439017",
      "creator_id": {
        "_id": "507f1f77bcf86cd799439018",
        "login": "admin@example.com",
        "first_name": "John",
        "last_name": "Doe"
      },
      "lead_id": {
        "_id": "507f1f77bcf86cd799439011",
        "contact_name": "Jane Smith",
        "email_from": "jane.smith@example.com",
        "phone": "+1234567890"
      },
      "message": "Follow up with client",
      "isDone": false,
      "active": true,
      "assigned_to": {
        "_id": "507f1f77bcf86cd799439014",
        "login": "agent@example.com",
        "first_name": "Alice",
        "last_name": "Johnson"
      },
      "todoTypesids": [
        {
          "todoTypeId": {
            "_id": "507f1f77bcf86cd799439012",
            "name": "Follow Up",
            "description": "Follow up with client",
            "status": "active"
          },
          "isDone": false
        }
      ],
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "pages": 3
  },
  "statistics": {
    "all_todos_count": 50,
    "pending_todos_count": 35,
    "completed_todos_count": 15
  }
}
```

---

### 6. Get Todos by Lead ID

Retrieve all todos for a specific lead.

**Endpoint:** `GET /api/todos/lead/:leadId`

**Access:** Agent/Admin

**Request Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `leadId` | string | Yes | MongoDB ObjectId of the lead |

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `isDone` | boolean | No | - | Filter by completion status |
| `showInactive` | boolean | No | false | Include inactive todos |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439017",
      "message": "Follow up with client",
      "isDone": false,
      "todoTypesids": [
        {
          "todoTypeId": {
            "_id": "507f1f77bcf86cd799439012",
            "name": "Follow Up",
            "status": "active"
          },
          "isDone": false
        }
      ],
      "assigned_to": {
        "_id": "507f1f77bcf86cd799439014",
        "login": "agent@example.com",
        "first_name": "Alice",
        "last_name": "Johnson"
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "meta": {
    "total": 5,
    "lead_id": "507f1f77bcf86cd799439011"
  },
  "statistics": {
    "all_todos_count": 5,
    "pending_todos_count": 3,
    "completed_todos_count": 2
  }
}
```

---

### 7. Delete Todo

Soft delete a todo (sets active to false).

**Endpoint:** `DELETE /api/todos/:id`

**Access:** Agent/Admin

**Request Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | MongoDB ObjectId of the todo |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Todo deleted successfully"
}
```

---

## Data Structures

### Todo Object

```json
{
  "_id": "string (MongoDB ObjectId)",
  "creator_id": {
    "_id": "string",
    "login": "string",
    "first_name": "string",
    "last_name": "string"
  },
  "lead_id": {
    "_id": "string",
    "contact_name": "string",
    "email_from": "string",
    "phone": "string"
  },
  "message": "string (1-500 characters)",
  "isDone": "boolean",
  "active": "boolean",
  "assigned_to": {
    "_id": "string",
    "login": "string",
    "first_name": "string",
    "last_name": "string"
  },
  "todoTypesids": [
    {
      "todoTypeId": {
        "_id": "string",
        "name": "string",
        "description": "string",
        "status": "active|inactive"
      },
      "isDone": "boolean"
    }
  ],
  "documents_ids": ["string (MongoDB ObjectId)"],
  "createdAt": "string (ISO 8601 date)",
  "updatedAt": "string (ISO 8601 date)"
}
```

### TodoType Status Object

```json
{
  "todoTypeId": "string (MongoDB ObjectId) or Object (populated TodoType)",
  "isDone": "boolean"
}
```

---

## Validation Rules

### lead_id
- **Required**: Yes (for create)
- **Type**: String (MongoDB ObjectId)
- **Format**: Valid MongoDB ObjectId format (24 hex characters)
- **Validation**: Must exist in the database

### message
- **Required**: Yes (for create)
- **Type**: String
- **Length**: 1-500 characters (trimmed)
- **Validation**: Cannot be empty after trimming whitespace

### todoTypesids
- **Required**: Yes (for create)
- **Type**: Array
- **Minimum Items**: 1
- **Format Options**:
  - **Old Format**: Array of strings (MongoDB ObjectIds)
  - **New Format**: Array of objects with `todoTypeId` and optional `isDone`
- **Validation**: 
  - Each item must be a valid MongoDB ObjectId (if string)
  - Each object must have a valid `todoTypeId` (MongoDB ObjectId)
  - `isDone` must be boolean if provided (defaults to `false`)

### assignto
- **Required**: Yes (for create)
- **Type**: String (MongoDB ObjectId)
- **Format**: Valid MongoDB ObjectId format
- **Validation**: Must exist in the database and be a valid user

### documents_ids
- **Required**: No
- **Type**: Array of strings (MongoDB ObjectIds)
- **Validation**: Each item must be a valid MongoDB ObjectId (if provided)

### isDone
- **Required**: No
- **Type**: Boolean
- **Description**: Overall todo completion status

---

## Important Notes

### 1. Individual TodoType Status Tracking

- Each todo can have multiple todo types
- Each todo type has its own `isDone` status that can be updated independently
- When creating a todo, all todoTypes default to `isDone: false`
- The overall todo `isDone` status is separate from individual todoType statuses

### 2. Temporary Access Management

When a todo is assigned to an agent who doesn't have access to the lead:
- The system automatically grants them temporary read-only access to the lead
- This access is automatically removed when:
  - The todo is completed (overall `isDone: true`)
  - The todo is deleted
  - The todo is reassigned to another agent
  - The agent has no other pending todos for that lead

### 3. Update Behavior

When updating `todoTypesids`:
- Only include the todoTypes you want to update
- The system merges your updates with existing todoTypes
- Existing todoTypes not included in the update remain unchanged
- New todoTypes can be added by including them in the update

### 4. Permission Rules

**Create Todo:**
- Agents can only create todos for leads they have access to
- Admins can create todos for any lead

**Update Todo:**
- Agents can update todos for their assigned leads
- Assigned users can update todoType statuses for todos assigned to them
- Admins can update any todo

**Delete Todo:**
- Agents can only delete todos they created
- Admins can delete any todo

### 5. Response Population

All responses include populated data for:
- `creator_id`: User who created the todo
- `lead_id`: Lead information
- `assigned_to`: User assigned to the todo
- `todoTypesids.todoTypeId`: TodoType details (name, description, status)

---

## Error Handling

### Common HTTP Status Codes

| Status Code | Description | Common Causes |
|-------------|-------------|---------------|
| 200 | Success | Request completed successfully |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Validation error, invalid data format |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 500 | Internal Server Error | Server error |

### Error Response Format

```json
{
  "error": "Error message description",
  "errors": {
    "field_name": "Field-specific error message"
  }
}
```

### Common Error Scenarios

**Validation Errors (400)**
- Invalid MongoDB ObjectId format
- Missing required fields
- Field value out of allowed range
- Invalid data type

**Not Found Errors (404)**
- Lead not found
- Todo not found
- Assignee user not found
- TodoType not found

**Authorization Errors (403)**
- User doesn't have access to the lead
- User doesn't have permission to update/delete the todo
- User is not assigned to the todo

**Authentication Errors (401)**
- Token expired or invalid
- Missing Authorization header

---

## Example cURL Requests

### Create Todo
```bash
curl -X POST http://localhost:4003/api/todos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "lead_id": "507f1f77bcf86cd799439011",
    "message": "Follow up with client",
    "todoTypesids": [
      {
        "todoTypeId": "507f1f77bcf86cd799439012",
        "isDone": false
      },
      {
        "todoTypeId": "507f1f77bcf86cd799439013",
        "isDone": false
      }
    ],
    "assignto": "507f1f77bcf86cd799439014"
  }'
```

### Update TodoType Status
```bash
curl -X PUT http://localhost:4003/api/todos/507f1f77bcf86cd799439017 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "todoTypesids": [
      {
        "todoTypeId": "507f1f77bcf86cd799439012",
        "isDone": true
      }
    ]
  }'
```

### Get Todo by ID
```bash
curl -X GET http://localhost:4003/api/todos/507f1f77bcf86cd799439017 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get All Todos
```bash
curl -X GET "http://localhost:4003/api/todos?page=1&limit=20&isDone=false" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Migration Notes

### Backward Compatibility

The API maintains backward compatibility with the old `todoTypesids` format:
- **Old Format**: `["id1", "id2"]` - Array of strings
- **New Format**: `[{todoTypeId: "id1", isDone: false}, ...]` - Array of objects

Both formats are accepted when creating todos. The system automatically normalizes the old format to the new structure.

### Response Format

All responses now return `todoTypesids` in the new format with populated `todoTypeId` objects, regardless of how the todo was created.

---

## Integration Checklist

- [ ] Set up API service with authentication
- [ ] Implement create todo with new todoTypesids format
- [ ] Implement update todo with individual todoType status updates
- [ ] Handle both old and new todoTypesids formats (for backward compatibility)
- [ ] Implement error handling for all error scenarios
- [ ] Implement loading states for async operations
- [ ] Display individual todoType completion statuses in UI
- [ ] Allow users to toggle individual todoType statuses
- [ ] Test with valid data
- [ ] Test validation errors
- [ ] Test authorization scenarios
- [ ] Test backward compatibility with old format
- [ ] Handle edge cases (empty arrays, invalid IDs, etc.)


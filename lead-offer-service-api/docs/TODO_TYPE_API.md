# Todo Type API Documentation

This document provides comprehensive API documentation for Todo Type CRUD operations. Todo Types are used to categorize todos in the system.

## Base URL
```
/api/todos/todo-types
```

## Authentication
All endpoints require authentication. Include the authentication token in the request headers:
```
Authorization: Bearer <your-token>
```

## Authorization Levels
- **Admin Only**: Create, Update, Delete operations
- **All Authenticated Users**: Read operations (GET)

---

## API Endpoints

### 1. Create Todo Type

Create a new todo type. Only admins can create todo types.

**Endpoint:** `POST /api/todos/todo-types`

**Access:** Admin only

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "string (required, 1-100 characters)",
  "description": "string (optional, max 500 characters)",
  "status": "active|inactive (optional, default: 'active')"
}
```

**Example Request:**
```json
{
  "name": "Follow Up",
  "description": "Follow up with client after initial contact",
  "status": "active"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Follow Up",
    "description": "Follow up with client after initial contact",
    "status": "active",
    "created_by": {
      "_id": "507f1f77bcf86cd799439012",
      "login": "admin@example.com",
      "first_name": "John",
      "last_name": "Doe"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Todo type created successfully"
}
```

**Error Responses:**

**400 Bad Request - Validation Error:**
```json
{
  "error": "Validation failed",
  "errors": {
    "name": "Todo type name is required"
  }
}
```

**409 Conflict - Duplicate Name:**
```json
{
  "error": "Todo type with this name already exists"
}
```

**401 Unauthorized:**
```json
{
  "error": "Authentication required"
}
```

**403 Forbidden - Not Admin:**
```json
{
  "error": "Admin access required"
}
```

---

### 2. Get All Todo Types

Retrieve all todo types with optional filtering, pagination, and search. All authenticated users can access this endpoint.

**Endpoint:** `GET /api/todos/todo-types`

**Access:** All authenticated users

**Request Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `status` | string | No | - | Filter by status: `active` or `inactive` |
| `search` | string | No | - | Search in name or description (case-insensitive) |
| `page` | number | No | 1 | Page number for pagination |
| `limit` | number | No | 50 | Number of items per page (max: 100) |

**Example Request:**
```
GET /api/todos/todo-types?status=active&search=follow&page=1&limit=20
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Follow Up",
      "description": "Follow up with client after initial contact",
      "status": "active",
      "created_by": {
        "_id": "507f1f77bcf86cd799439012",
        "login": "admin@example.com",
        "first_name": "John",
        "last_name": "Doe"
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Email Task",
      "description": "Task generated from email",
      "status": "active",
      "created_by": {
        "_id": "507f1f77bcf86cd799439012",
        "login": "admin@example.com",
        "first_name": "John",
        "last_name": "Doe"
      },
      "createdAt": "2024-01-15T11:00:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "pages": 1
  },
  "message": "Todo types retrieved successfully"
}
```

**Error Responses:**

**401 Unauthorized:**
```json
{
  "error": "Authentication required"
}
```

---

### 3. Get Todo Type by ID

Retrieve a single todo type by its ID. All authenticated users can access this endpoint.

**Endpoint:** `GET /api/todos/todo-types/:id`

**Access:** All authenticated users

**Request Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | MongoDB ObjectId of the todo type |

**Example Request:**
```
GET /api/todos/todo-types/507f1f77bcf86cd799439011
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Follow Up",
    "description": "Follow up with client after initial contact",
    "status": "active",
    "created_by": {
      "_id": "507f1f77bcf86cd799439012",
      "login": "admin@example.com",
      "first_name": "John",
      "last_name": "Doe"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Todo type retrieved successfully"
}
```

**Error Responses:**

**404 Not Found:**
```json
{
  "error": "Todo type not found"
}
```

**400 Bad Request - Invalid ID:**
```json
{
  "error": "Validation failed",
  "errors": {
    "id": "Valid todo type ID is required"
  }
}
```

---

### 4. Update Todo Type

Update an existing todo type. Only admins can update todo types.

**Endpoint:** `PUT /api/todos/todo-types/:id`

**Access:** Admin only

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | MongoDB ObjectId of the todo type |

**Request Body:**
```json
{
  "name": "string (optional, 1-100 characters)",
  "description": "string (optional, max 500 characters)",
  "status": "active|inactive (optional)"
}
```

**Example Request:**
```json
{
  "name": "Follow Up - Updated",
  "description": "Updated description",
  "status": "active"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Follow Up - Updated",
    "description": "Updated description",
    "status": "active",
    "created_by": {
      "_id": "507f1f77bcf86cd799439012",
      "login": "admin@example.com",
      "first_name": "John",
      "last_name": "Doe"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T12:00:00.000Z"
  },
  "message": "Todo type updated successfully"
}
```

**Error Responses:**

**404 Not Found:**
```json
{
  "error": "Todo type not found"
}
```

**409 Conflict - Duplicate Name:**
```json
{
  "error": "Todo type with this name already exists"
}
```

**403 Forbidden - Not Admin:**
```json
{
  "error": "Admin access required"
}
```

---

### 5. Update Todo Type Status

Update only the status of a todo type. Only admins can update status.

**Endpoint:** `PATCH /api/todos/todo-types/:id/status`

**Access:** Admin only

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | MongoDB ObjectId of the todo type |

**Request Body:**
```json
{
  "status": "active|inactive (required)"
}
```

**Example Request:**
```json
{
  "status": "inactive"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Follow Up",
    "description": "Follow up with client after initial contact",
    "status": "inactive",
    "created_by": {
      "_id": "507f1f77bcf86cd799439012",
      "login": "admin@example.com",
      "first_name": "John",
      "last_name": "Doe"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T13:00:00.000Z"
  },
  "message": "Todo type status updated successfully"
}
```

**Error Responses:**

**404 Not Found:**
```json
{
  "error": "Todo type not found"
}
```

**400 Bad Request - Invalid Status:**
```json
{
  "error": "Validation failed",
  "errors": {
    "status": "Status must be either \"active\" or \"inactive\""
  }
}
```

---

### 6. Delete Todo Type

Delete a todo type. Only admins can delete todo types. Deletion is prevented if the todo type is being used by any todos.

**Endpoint:** `DELETE /api/todos/todo-types/:id`

**Access:** Admin only

**Request Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | MongoDB ObjectId of the todo type |

**Example Request:**
```
DELETE /api/todos/todo-types/507f1f77bcf86cd799439011
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Todo type deleted successfully"
}
```

**Error Responses:**

**404 Not Found:**
```json
{
  "error": "Todo type not found"
}
```

**400 Bad Request - Todo Type in Use:**
```json
{
  "error": "Cannot delete todo type. It is being used by 5 todo(s). Please remove or reassign these todos first."
}
```

**403 Forbidden - Not Admin:**
```json
{
  "error": "Admin access required"
}
```

---

## Frontend Implementation Examples

### React/TypeScript Example

#### 1. API Service (TypeScript)

```typescript
// services/todoTypeService.ts

interface TodoType {
  _id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  created_by?: {
    _id: string;
    login: string;
    first_name: string;
    last_name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CreateTodoTypeRequest {
  name: string;
  description?: string;
  status?: 'active' | 'inactive';
}

interface UpdateTodoTypeRequest {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive';
}

interface TodoTypeListResponse {
  success: boolean;
  data: TodoType[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  message: string;
}

interface TodoTypeResponse {
  success: boolean;
  data: TodoType;
  message: string;
}

class TodoTypeService {
  private baseUrl = '/api/todos/todo-types';

  async createTodoType(data: CreateTodoTypeRequest): Promise<TodoTypeResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create todo type');
    }

    return response.json();
  }

  async getAllTodoTypes(params?: {
    status?: 'active' | 'inactive';
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<TodoTypeListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `${this.baseUrl}${queryParams.toString() ? `?${queryParams}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch todo types');
    }

    return response.json();
  }

  async getTodoTypeById(id: string): Promise<TodoTypeResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch todo type');
    }

    return response.json();
  }

  async updateTodoType(
    id: string,
    data: UpdateTodoTypeRequest
  ): Promise<TodoTypeResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update todo type');
    }

    return response.json();
  }

  async updateTodoTypeStatus(
    id: string,
    status: 'active' | 'inactive'
  ): Promise<TodoTypeResponse> {
    const response = await fetch(`${this.baseUrl}/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update todo type status');
    }

    return response.json();
  }

  async deleteTodoType(id: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete todo type');
    }

    return response.json();
  }

  private getToken(): string {
    // Implement your token retrieval logic
    return localStorage.getItem('authToken') || '';
  }
}

export const todoTypeService = new TodoTypeService();
export type { TodoType, CreateTodoTypeRequest, UpdateTodoTypeRequest };
```

#### 2. React Component Example

```typescript
// components/TodoTypeForm.tsx

import React, { useState } from 'react';
import { todoTypeService, CreateTodoTypeRequest } from '../services/todoTypeService';

interface TodoTypeFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const TodoTypeForm: React.FC<TodoTypeFormProps> = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState<CreateTodoTypeRequest>({
    name: '',
    description: '',
    status: 'active',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await todoTypeService.createTodoType(formData);
      onSuccess?.();
      // Reset form
      setFormData({ name: '', description: '', status: 'active' });
    } catch (err: any) {
      setError(err.message || 'Failed to create todo type');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="todo-type-form">
      {error && <div className="error-message">{error}</div>}
      
      <div className="form-group">
        <label htmlFor="name">
          Name <span className="required">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          minLength={1}
          maxLength={100}
          placeholder="Enter todo type name"
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          maxLength={500}
          rows={4}
          placeholder="Enter description (optional)"
        />
        <small>{formData.description?.length || 0}/500 characters</small>
      </div>

      <div className="form-group">
        <label htmlFor="status">Status</label>
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={handleChange}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Todo Type'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};
```

#### 3. Todo Type List Component

```typescript
// components/TodoTypeList.tsx

import React, { useState, useEffect } from 'react';
import { todoTypeService, TodoType } from '../services/todoTypeService';

export const TodoTypeList: React.FC = () => {
  const [todoTypes, setTodoTypes] = useState<TodoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '' as 'active' | 'inactive' | '',
    search: '',
    page: 1,
    limit: 20,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    fetchTodoTypes();
  }, [filters]);

  const fetchTodoTypes = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        page: filters.page,
        limit: filters.limit,
      };
      
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;

      const response = await todoTypeService.getAllTodoTypes(params);
      setTodoTypes(response.data);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch todo types');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this todo type?')) {
      return;
    }

    try {
      await todoTypeService.deleteTodoType(id);
      fetchTodoTypes(); // Refresh list
    } catch (err: any) {
      alert(err.message || 'Failed to delete todo type');
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      await todoTypeService.updateTodoTypeStatus(id, newStatus);
      fetchTodoTypes(); // Refresh list
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  if (loading && todoTypes.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div className="todo-type-list">
      <div className="filters">
        <input
          type="text"
          placeholder="Search todo types..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
        />
        <select
          value={filters.status}
          onChange={(e) =>
            setFilters({
              ...filters,
              status: e.target.value as 'active' | 'inactive' | '',
              page: 1,
            })
          }
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {error && <div className="error-message">{error}</div>}

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Status</th>
            <th>Created By</th>
            <th>Created At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {todoTypes.map((todoType) => (
            <tr key={todoType._id}>
              <td>{todoType.name}</td>
              <td>{todoType.description || '-'}</td>
              <td>
                <span className={`status-badge ${todoType.status}`}>
                  {todoType.status}
                </span>
              </td>
              <td>
                {todoType.created_by
                  ? `${todoType.created_by.first_name} ${todoType.created_by.last_name}`
                  : '-'}
              </td>
              <td>{new Date(todoType.createdAt).toLocaleDateString()}</td>
              <td>
                <button
                  onClick={() =>
                    handleStatusToggle(todoType._id, todoType.status)
                  }
                >
                  Toggle Status
                </button>
                <button onClick={() => handleDelete(todoType._id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button
          disabled={pagination.page === 1}
          onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
        >
          Previous
        </button>
        <span>
          Page {pagination.page} of {pagination.pages} (Total: {pagination.total})
        </span>
        <button
          disabled={pagination.page >= pagination.pages}
          onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
        >
          Next
        </button>
      </div>
    </div>
  );
};
```

---

## Error Handling

All endpoints may return the following common errors:

### 401 Unauthorized
User is not authenticated. Redirect to login page.

### 403 Forbidden
User doesn't have admin privileges. Show appropriate message.

### 400 Bad Request
Validation error. Display specific field errors to the user.

### 404 Not Found
Resource not found. Show appropriate message.

### 409 Conflict
Duplicate name or resource conflict. Show specific error message.

### 500 Internal Server Error
Server error. Show generic error message and log details.

---

## Validation Rules

### Name
- **Required**: Yes (for create)
- **Type**: String
- **Length**: 1-100 characters
- **Unique**: Yes (cannot duplicate existing names)

### Description
- **Required**: No
- **Type**: String
- **Length**: Max 500 characters

### Status
- **Required**: No (defaults to 'active')
- **Type**: String
- **Values**: 'active' | 'inactive'

---

## Notes

1. **Todo Type Reference in Todos**: When creating or updating a todo, you can now reference a todo type by its `_id` in the `todo_type` field.

2. **Deletion Protection**: Todo types cannot be deleted if they are referenced by any todos. You must first remove or reassign those todos.

3. **Status Management**: Use the status field to soft-disable todo types without deleting them. Inactive todo types won't appear in dropdowns but existing todos using them will remain valid.

4. **Pagination**: The default limit is 50 items per page, with a maximum of 100.

5. **Search**: The search parameter searches in both the `name` and `description` fields (case-insensitive).

---

## Integration Checklist

- [ ] Set up API service with authentication
- [ ] Create TodoType interface/type definitions
- [ ] Implement create form with validation
- [ ] Implement list view with filtering and pagination
- [ ] Implement edit functionality
- [ ] Implement delete with confirmation
- [ ] Implement status toggle
- [ ] Add error handling and user feedback
- [ ] Add loading states
- [ ] Test all CRUD operations
- [ ] Test authorization (admin vs regular user)
- [ ] Handle edge cases (duplicate names, deletion protection, etc.)


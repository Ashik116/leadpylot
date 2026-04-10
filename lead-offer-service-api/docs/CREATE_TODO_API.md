# Create Todo API Documentation

This document provides comprehensive API documentation for creating a new todo/ticket for a lead.

## Base URL

```
/todos
```

## Authentication

All endpoints require authentication. Include the authentication token in the request headers:

```
Authorization: Bearer <your-token>
```

## Authorization Levels

- **Agent/Admin**: Can create todos for leads they have access to

---

## API Endpoint

### Create Todo

Create a new todo/ticket for a lead. The todo can be assigned to a specific user and can have multiple todo types and associated documents.

**Endpoint:** `POST /todos`

**Access:** Agent/Admin

**Request Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

| Field           | Type             | Required | Description                                          |
| --------------- | ---------------- | -------- | ---------------------------------------------------- |
| `lead_id`       | string (MongoId) | Yes      | MongoDB ObjectId of the lead                         |
| `message`       | string           | Yes      | Todo message/ticket description (1-500 characters)   |
| `todoTypesids`  | string[]         | Yes      | Array of TodoType MongoDB ObjectIds (minimum 1 item) |
| `assignto`      | string (MongoId) | Yes      | MongoDB ObjectId of the user to assign this todo to  |
| `documents_ids` | string[]         | No       | Array of Document MongoDB ObjectIds (optional)       |

**Example Request:**

```json
{
  "lead_id": "507f1f77bcf86cd799439011",
  "message": "Follow up with client regarding investment opportunity",
  "todoTypesids": ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"],
  "assignto": "507f1f77bcf86cd799439014",
  "documents_ids": ["507f1f77bcf86cd799439015", "507f1f77bcf86cd799439016"]
}
```

**Minimal Request (without documents):**

```json
{
  "lead_id": "507f1f77bcf86cd799439011",
  "message": "Follow up with client",
  "todoTypesids": ["507f1f77bcf86cd799439012"],
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
    "todoTypesids": ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"],
    "documents_ids": ["507f1f77bcf86cd799439015", "507f1f77bcf86cd799439016"],
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
    "todoTypesids": "todoTypesids must be a non-empty array of ids",
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

**400 Bad Request - Invalid TodoType IDs:**

```json
{
  "error": "Validation failed",
  "errors": {
    "todoTypesids": "todoTypesids must be a non-empty array of ids"
  }
}
```

---

## Frontend Implementation Examples

### React/TypeScript Example

#### 1. API Service (TypeScript)

```typescript
// services/todoService.ts

interface User {
  _id: string;
  login: string;
  first_name: string;
  last_name: string;
}

interface Lead {
  _id: string;
  contact_name: string;
  email_from: string;
  phone: string;
}

interface Todo {
  _id: string;
  creator_id: User;
  lead_id: Lead | string;
  message: string;
  isDone: boolean;
  active: boolean;
  assigned_to: User | string;
  todoTypesids: string[];
  documents_ids?: string[];
  createdAt: string;
  updatedAt: string;
}

interface CreateTodoRequest {
  lead_id: string;
  message: string;
  todoTypesids: string[];
  assignto: string;
  documents_ids?: string[];
}

interface CreateTodoResponse {
  success: boolean;
  data: Todo;
  message: string;
}

class TodoService {
  private baseUrl = '/todos';

  async createTodo(data: CreateTodoRequest): Promise<CreateTodoResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getToken()}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create todo');
    }

    return response.json();
  }

  private getToken(): string {
    // Implement your token retrieval logic
    return localStorage.getItem('authToken') || '';
  }
}

export const todoService = new TodoService();
export type { Todo, CreateTodoRequest, CreateTodoResponse };
```

#### 2. React Component Example

```typescript
// components/CreateTodoForm.tsx

import React, { useState, useEffect } from 'react';
import { todoService, CreateTodoRequest } from '../services/todoService';
import { todoTypeService } from '../services/todoTypeService';
import { userService } from '../services/userService';

interface CreateTodoFormProps {
  leadId: string;
  onSuccess?: (todo: any) => void;
  onCancel?: () => void;
}

export const CreateTodoForm: React.FC<CreateTodoFormProps> = ({
  leadId,
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState<CreateTodoRequest>({
    lead_id: leadId,
    message: '',
    todoTypesids: [],
    assignto: '',
    documents_ids: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todoTypes, setTodoTypes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoadingData(true);
      const [todoTypesResponse, usersResponse] = await Promise.all([
        todoTypeService.getAllTodoTypes({ status: 'active' }),
        userService.getAgents(), // Implement this method to get list of agents
      ]);
      setTodoTypes(todoTypesResponse.data);
      setUsers(usersResponse.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load initial data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate form
    if (!formData.message.trim()) {
      setError('Message is required');
      setLoading(false);
      return;
    }

    if (formData.todoTypesids.length === 0) {
      setError('At least one todo type is required');
      setLoading(false);
      return;
    }

    if (!formData.assignto) {
      setError('Assignee is required');
      setLoading(false);
      return;
    }

    try {
      const response = await todoService.createTodo(formData);
      onSuccess?.(response.data);
      // Reset form
      setFormData({
        lead_id: leadId,
        message: '',
        todoTypesids: [],
        assignto: '',
        documents_ids: [],
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create todo');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTodoTypeChange = (todoTypeId: string) => {
    setFormData((prev) => {
      const isSelected = prev.todoTypesids.includes(todoTypeId);
      return {
        ...prev,
        todoTypesids: isSelected
          ? prev.todoTypesids.filter((id) => id !== todoTypeId)
          : [...prev.todoTypesids, todoTypeId],
      };
    });
  };

  const handleDocumentChange = (documentId: string) => {
    setFormData((prev) => {
      const currentDocs = prev.documents_ids || [];
      const isSelected = currentDocs.includes(documentId);
      return {
        ...prev,
        documents_ids: isSelected
          ? currentDocs.filter((id) => id !== documentId)
          : [...currentDocs, documentId],
      };
    });
  };

  if (loadingData) {
    return <div>Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="create-todo-form">
      <h2>Create New Todo</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label htmlFor="message">
          Message <span className="required">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          required
          minLength={1}
          maxLength={500}
          rows={4}
          placeholder="Enter todo message (1-500 characters)"
        />
        <small>{formData.message.length}/500 characters</small>
      </div>

      <div className="form-group">
        <label>
          Todo Types <span className="required">*</span>
        </label>
        <div className="checkbox-group">
          {todoTypes.map((todoType) => (
            <label key={todoType._id} className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.todoTypesids.includes(todoType._id)}
                onChange={() => handleTodoTypeChange(todoType._id)}
              />
              <span>{todoType.name}</span>
            </label>
          ))}
        </div>
        {formData.todoTypesids.length === 0 && (
          <small className="error-text">
            At least one todo type must be selected
          </small>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="assignto">
          Assign To <span className="required">*</span>
        </label>
        <select
          id="assignto"
          name="assignto"
          value={formData.assignto}
          onChange={handleChange}
          required
        >
          <option value="">Select an assignee</option>
          {users.map((user) => (
            <option key={user._id} value={user._id}>
              {user.first_name} {user.last_name} ({user.login})
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Documents (Optional)</label>
        <div className="checkbox-group">
          {documents.length === 0 ? (
            <p className="text-muted">No documents available</p>
          ) : (
            documents.map((doc) => (
              <label key={doc._id} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={
                    formData.documents_ids?.includes(doc._id) || false
                  }
                  onChange={() => handleDocumentChange(doc._id)}
                />
                <span>{doc.filename || doc.name}</span>
              </label>
            ))
          )}
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Todo'}
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

#### 3. Using the Component

```typescript
// pages/LeadDetailPage.tsx

import React, { useState } from 'react';
import { CreateTodoForm } from '../components/CreateTodoForm';

export const LeadDetailPage: React.FC = () => {
  const [showTodoForm, setShowTodoForm] = useState(false);
  const leadId = '507f1f77bcf86cd799439011'; // Get from route params

  const handleTodoCreated = (todo: any) => {
    console.log('Todo created:', todo);
    setShowTodoForm(false);
    // Refresh todo list or show success message
  };

  return (
    <div>
      <h1>Lead Details</h1>
      {/* Lead details here */}

      <button onClick={() => setShowTodoForm(true)}>
        Create New Todo
      </button>

      {showTodoForm && (
        <div className="modal">
          <CreateTodoForm
            leadId={leadId}
            onSuccess={handleTodoCreated}
            onCancel={() => setShowTodoForm(false)}
          />
        </div>
      )}
    </div>
  );
};
```

#### 4. JavaScript/React Example (without TypeScript)

```javascript
// services/todoService.js

class TodoService {
  constructor() {
    this.baseUrl = '/todos';
  }

  async createTodo(data) {
    const token = localStorage.getItem('authToken');

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create todo');
    }

    return response.json();
  }
}

export const todoService = new TodoService();
```

```javascript
// components/CreateTodoForm.jsx

import React, { useState, useEffect } from 'react';
import { todoService } from '../services/todoService';

export const CreateTodoForm = ({ leadId, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    lead_id: leadId,
    message: '',
    todoTypesids: [],
    assignto: '',
    documents_ids: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await todoService.createTodo(formData);
      onSuccess?.(response.data);
      // Reset form
      setFormData({
        lead_id: leadId,
        message: '',
        todoTypesids: [],
        assignto: '',
        documents_ids: [],
      });
    } catch (err) {
      setError(err.message || 'Failed to create todo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}

      <div>
        <label>
          Message <span>*</span>
        </label>
        <textarea
          name="message"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          required
          minLength={1}
          maxLength={500}
        />
      </div>

      {/* Add other form fields similarly */}

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Todo'}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      )}
    </form>
  );
};
```

---

## Validation Rules

### lead_id

- **Required**: Yes
- **Type**: String (MongoDB ObjectId)
- **Format**: Valid MongoDB ObjectId format
- **Validation**: Must exist in the database

### message

- **Required**: Yes
- **Type**: String
- **Length**: 1-500 characters (trimmed)
- **Validation**: Cannot be empty after trimming whitespace

### todoTypesids

- **Required**: Yes
- **Type**: Array of strings (MongoDB ObjectIds)
- **Minimum Items**: 1
- **Validation**: Each item must be a valid MongoDB ObjectId

### assignto

- **Required**: Yes
- **Type**: String (MongoDB ObjectId)
- **Format**: Valid MongoDB ObjectId format
- **Validation**: Must exist in the database and be a valid user

### documents_ids

- **Required**: No
- **Type**: Array of strings (MongoDB ObjectIds)
- **Validation**: Each item must be a valid MongoDB ObjectId (if provided)

---

## Important Notes

1. **Temporary Access**: When a todo is assigned to an agent who doesn't have access to the lead, the system automatically grants them temporary read-only access to the lead. This access is managed automatically and will be removed when:

   - The todo is completed
   - The todo is deleted
   - The todo is reassigned to another agent
   - The agent has no other pending todos for that lead

2. **Multiple Todo Types**: A single todo can have multiple todo types. This allows for flexible categorization.

3. **Document Association**: Documents are optional. You can associate multiple documents with a todo.

4. **Authorization**:

   - Agents can only create todos for leads they have access to (assigned leads or leads they have temporary access to)
   - Admins can create todos for any lead

5. **Auto-population**: The response includes populated data for:
   - `creator_id`: User who created the todo
   - `lead_id`: Lead information
   - `assigned_to`: User assigned to the todo

---

## Error Handling

### Common Error Scenarios

1. **Validation Errors (400)**

   - Check the `errors` object in the response
   - Display field-specific error messages to the user
   - Highlight invalid fields in the form

2. **Not Found Errors (404)**

   - Lead not found: Verify the lead_id exists
   - Assignee not found: Verify the assignto user exists
   - Display appropriate error message

3. **Authorization Errors (403)**

   - User doesn't have access to the lead
   - Show message: "You can only create todos for your assigned leads"
   - Optionally redirect or show available leads

4. **Authentication Errors (401)**
   - Token expired or invalid
   - Redirect to login page
   - Clear stored authentication data

---

## Integration Checklist

- [ ] Set up API service with authentication
- [ ] Create Todo interface/type definitions
- [ ] Implement create form with all required fields
- [ ] Add validation for all fields
- [ ] Implement todo type multi-select
- [ ] Implement assignee dropdown (populate with available users)
- [ ] Implement document selection (if applicable)
- [ ] Add character counter for message field (500 max)
- [ ] Add error handling and user feedback
- [ ] Add loading states
- [ ] Test with valid data
- [ ] Test validation errors
- [ ] Test authorization (agent vs admin)
- [ ] Test with multiple todo types
- [ ] Test with and without documents
- [ ] Handle edge cases (empty arrays, invalid IDs, etc.)

---

## Example cURL Request

```bash
curl -X POST http://localhost:4003/todos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "lead_id": "507f1f77bcf86cd799439011",
    "message": "Follow up with client regarding investment opportunity",
    "todoTypesids": [
      "507f1f77bcf86cd799439012",
      "507f1f77bcf86cd799439013"
    ],
    "assignto": "507f1f77bcf86cd799439014",
    "documents_ids": [
      "507f1f77bcf86cd799439015"
    ]
  }'
```

---

## Response Data Structure

The response includes the following populated fields:

- **creator_id**: Object with `_id`, `login`, `first_name`, `last_name`
- **lead_id**: Object with `_id`, `contact_name`, `email_from`, `phone`
- **assigned_to**: Object with `_id`, `login`, `first_name`, `last_name`
- **todoTypesids**: Array of TodoType ObjectIds (not populated in response)
- **documents_ids**: Array of Document ObjectIds (not populated in response)

To get full details of todo types or documents, make separate API calls using the IDs from the response.

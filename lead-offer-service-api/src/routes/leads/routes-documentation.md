# Lead Routes Documentation

Comprehensive API endpoints for lead operations with advanced filtering and todos integration.

## Features

- **CRUD Operations**: Full lead lifecycle management
- **Advanced Filtering**: Search, status, todos, and custom filters
- **Role-Based Access Control**: Admin/Agent permissions
- **Import/Export**: Excel/CSV file handling
- **Bulk Operations**: Status updates and batch processing
- **Todo Integration**: Comprehensive todo statistics and filtering
- **Queue Management**: Agent queue with navigation tracking

## Access Control

### Admin Access
- Full access to all leads and operations
- Import/export functionality
- Permanent delete operations
- Bulk updates across all leads

### Agent Access
- Access to assigned leads only
- Personal todo management
- Queue navigation
- Status updates on assigned leads

## Query Parameters

### Common Query Parameters

All list endpoints support these parameters:

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `page` | integer | Page number for pagination | 1 |
| `limit` | integer | Number of leads per page | 50 |
| `status` | string | Filter by lead status | - |
| `search` | string | Search in lead fields | - |
| `showInactive` | boolean | Include inactive leads | false |
| `sortBy` | string | Sort field (see options below) | - |
| `sortOrder` | string | Sort order: `asc` or `desc` | - |

#### Sort Options
- `contact_name`
- `lead_source_no`
- `expected_revenue`
- `createdAt`
- `updatedAt`
- `lead_date`
- `email_from`
- `phone`

### Todo Filters

| Parameter | Type | Description |
|-----------|------|-------------|
| `has_todo` | boolean | Filter leads with todos and include statistics |
| `todo_scope` | string | Todo scope: `all`, `assigned_to_me`, `assigned_by_me` |
| `pending_todos` | boolean | Show only pending (incomplete) todos |
| `done_todos` | boolean | Show only done (completed) todos |

### Advanced Filters

| Parameter | Type | Description |
|-----------|------|-------------|
| `use_status` | string | Filter by use status: `usable`, `new`, `reusable`, `pending` |
| `has_opening` | boolean | Filter leads with openings |
| `project_name` | string | Filter by project name |
| `project_id` | ObjectId | Filter by project ID |
| `investment_volume` | string | Filter by investment volume |
| `agent_name` | string | Filter by agent name |
| `duplicate` | string | Filter duplicate leads |
| `state` | string | Filter by state: `offer`, `opening`, `confirmation`, `payment` |
| `source` | string | Filter by source name |

## Endpoints

### Query Routes

#### GET /leads
Get all leads with advanced filtering and pagination.

**Access**: Private - Admin: all leads, Agent: assigned leads only

**Query Parameters**: All common parameters + todo filters + advanced filters

**Response with has_todo=true**:
```json
{
  "data": [...],
  "statistics": {
    "leads_with_todos": 150,
    "leads_without_todos": 50,
    "todos": {
      "total_count": 300,
      "pending_count": 120,
      "completed_count": 180,
      "assigned_count": 250,
      "unassigned_count": 50,
      "completion_rate": 60
    },
    "scope": {
      "type": "assigned_to_me",
      "user_id": "..."
    }
  },
  "pagination": {...}
}
```

#### GET /leads/my-leads
Get user's assigned leads.

**Access**: Private - All authenticated users

**Query Parameters**: Common parameters + todo filters + state + source

#### GET /leads/extra
Get leads where user has assigned todos.

**Access**: Private - Agent/Admin

**Query Parameters**: Common parameters + has_todo

#### GET /leads/assigned
Get leads where user assigned todos to others.

**Access**: Private - Agent/Admin

**Query Parameters**: Common parameters + has_todo

#### GET /leads/ids
Get all lead IDs as an array.

**Access**: Private - Admins: all IDs, Agents: assigned lead IDs only

**Response**:
```json
{
  "success": true,
  "data": ["id1", "id2", "id3"]
}
```

#### GET /leads/:id
Get lead by ID with full details.

**Access**: Private - Admin: any lead, Agent: assigned leads only

### Queue Management Routes

#### GET /leads/queue/current-top
Get the current top lead in the agent's queue with navigation tracking.

**Access**: Private - Agents only

**Query Parameters**:
- `project_id` (ObjectId): Filter by project
- `project_name` (string): Filter by project name
- `source` (string): Filter by source
- `exclude_recent` (integer 0-72): Exclude leads viewed in last N hours

#### GET /leads/queue/navigate/:lead_id
Navigate to a specific lead in the queue with full navigation context.

**Access**: Private - Agents only

**Response includes**:
- Previous/next lead information
- UI hints for navigation
- Queue position

#### POST /leads/currenttop-completed
Mark current "on top" lead as completed (removes from queue).

**Access**: Private - Agents only

**Body**:
```json
{
  "lead_id": "ObjectId"
}
```

### Create Routes

#### POST /leads
Create new leads.

**Access**: Private - Admin only

**Body**: Lead data (single or array)

### Update Routes

#### PUT /leads/:id
Update a single lead.

**Access**: Private - Users with LEAD_UPDATE permission

**Body**: Partial lead data

#### PUT /leads/:id/status
Update lead status by stage and status name or ID.

**Access**: Private - Users with LEAD_UPDATE permission

**Body**:
```json
{
  "stage_name": "string",
  "status_name": "string",
  "stage_id": "ObjectId",
  "status_id": "ObjectId"
}
```

#### PUT /leads/bulk-update
Update multiple leads with the same data.

**Access**: Private - Admin only

**Body**: Same as single lead update

#### PUT /leads/bulk-status-update
Update status for multiple leads.

**Access**: Private - Users with LEAD_UPDATE permission

**Body**:
```json
{
  "leadIds": ["ObjectId"],
  "stage_name": "string",
  "status_name": "string",
  "stage_id": "ObjectId",
  "status_id": "ObjectId",
  "project_id": "ObjectId"
}
```

### Delete Routes

#### DELETE /leads/:id
Soft delete a single lead.

**Access**: Private - Admin only

#### DELETE /leads
Soft delete multiple leads (provide IDs in body).

**Access**: Private - Admin only

#### DELETE /leads/permanent-delete/:id
Permanently delete a single lead from database.

**Access**: Private - Admin only

#### DELETE /leads/permanent-delete
Permanently delete multiple leads (provide IDs in body).

**Access**: Private - Admin only

### Import/Export Routes

#### POST /leads/import
Import leads from Excel or CSV file.

**Access**: Private - Admin only

**Content-Type**: `multipart/form-data`

**Body**:
- `file`: Excel/CSV file (required)
- `source_id`: Source ID for imported leads (optional)

**File Requirements**:
- Formats: `.xlsx`, `.xls`, `.csv`
- Max size: 10MB

#### GET /leads/import
Get import history.

**Access**: Private - Admin only

**Response**: List of all import operations with status and metadata

#### POST /leads/import/:id/revert
Revert a lead import - undoes all operations performed during import.

**Access**: Private - Admin only

**Parameters**:
- `id`: Import history ID

#### GET /leads/download/*
Download import files with smart filename handling.

**Access**: Private - Admin only

**Features**:
- Downloads original import file or error file
- Filename based on import status:
  - Success: `original_filename_original.ext`
  - Failed: `original_filename_failed.ext`
  - Processing: `original_filename.ext`

### Search Routes

#### POST /leads/search-by-partner-ids
Search leads by partner IDs (lead_source_no values).

**Access**: Private - All authenticated users (filtered by role)

**Body**:
```json
{
  "partnerIds": ["string"]
}
```

**Query Parameters**: `showInactive`, `sortBy`, `sortOrder`

**Response**: All matching leads without pagination

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": {...}
}
```

### Common Error Codes

- `400`: Bad Request - Invalid parameters
- `401`: Unauthorized - Authentication required
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource doesn't exist
- `422`: Validation Error - Invalid data
- `500`: Internal Server Error

## Todo Integration

When `has_todo=true` is set, the response includes comprehensive statistics:

### Statistics Object

```json
{
  "leads_with_todos": 150,
  "leads_without_todos": 50,
  "todos": {
    "total_count": 300,
    "pending_count": 120,
    "completed_count": 180,
    "assigned_count": 250,
    "unassigned_count": 50,
    "completion_rate": 60
  },
  "scope": {
    "type": "all|assigned_to_me|assigned_by_me",
    "user_id": "ObjectId"
  }
}
```

### Todo Scopes

- **all**: All todos on leads user has access to
- **assigned_to_me**: Todos assigned to the requesting user
- **assigned_by_me**: Todos created by the requesting user

### Filtering Todos

Combine todo filters for precise queries:

```
GET /leads?has_todo=true&todo_scope=assigned_to_me&pending_todos=true
```

This returns leads with pending todos assigned to the current user.


# Quick Actions API Reference

Complete API reference for Quick Actions endpoints. This document covers all available endpoints for both Chat UI consumption and administrative management.

## Table of Contents

- [Overview](#overview)
- [Part 1: Chat UI Endpoints](#part-1-chat-ui-endpoints)
- [Part 2: Admin API Endpoints](#part-2-admin-api-endpoints)
- [Data Models](#data-models)
- [Error Responses](#error-responses)

---

## Overview

**Quick Actions** are preset chat chips/buttons that allow users to send predefined messages to the AI with a single click. The system consists of:

- **Chat UI Endpoint**: Returns active quick action chips for end users
- **Admin API**: Full CRUD operations for managing quick actions
- **Two-Level Visibility**: `available` (UI visibility) and `is_active` (enabled/disabled)

### Base URL
```
https://your-api-domain.com
```

### Authentication

**Admin endpoints require:**
```http
X-API-Key: your-system-api-key
X-User-Id: crm-user-id
```

Alternatively, pass `user_id` as a query parameter.

**Chat UI endpoints** use query-based authentication with `user_id` and `lead_id`.

---

## Part 1: Chat UI Endpoints

### Get Quick Actions

Returns the list of suggested chat chips for the current conversation context.

```
GET /api/conversation/quick-actions
```

**Query Parameters:**

| Parameter | Type   | Required | Description                        |
| :-------- | :----- | :------- | :--------------------------------- |
| `user_id` | string | **Yes**  | The CRM User ID of the person chatting |
| `lead_id` | string | **Yes**  | The CRM Lead ID for the current conversation |

**Response 200 OK:**

```json
{
  "actions": [
    {
      "slug": "lead_summary",
      "label": "Lead Summary",
      "message": "Give me a detailed summary of this lead.",
      "available": true
    },
    {
      "slug": "next_steps",
      "label": "Next Steps",
      "message": "What are the recommended next steps for this contact?",
      "available": true
    },
    {
      "slug": "sentiment_analysis",
      "label": "Sentiment Analysis",
      "message": "Analyze the sentiment of this lead's communications.",
      "available": false
    }
  ]
}
```

**Error Responses:**

| Code | Description |
| :--- | :---------- |
| 400  | Missing or invalid query parameters |
| 401  | Unauthorized |
| 403  | Forbidden (invalid user/lead access) |

---

## Part 2: Admin API Endpoints

All endpoints in this section require admin authentication.

---

### List All Quick Actions

```
GET /api/quick-actions
```

**Query Parameters:**

| Parameter    | Type    | Default | Description                           |
| :----------- | :------ | :------ | :------------------------------------ |
| `page`       | integer | 1       | Page number (≥ 1)                     |
| `limit`      | integer | 20      | Items per page (1-100)                |
| `search`     | string  | null    | Filter by label/message text          |
| `is_active`  | boolean | null    | Filter by active status               |
| `is_visible` | boolean | null    | Filter by available flag (UI visible) |

**Response 200 OK:**

```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "slug": "lead_summary",
      "label": "Lead Summary",
      "message": "Give me a detailed summary of this lead.",
      "available": true,
      "is_active": true,
      "sort_order": 0,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 20
}
```

---

### Create Quick Action

```
POST /api/quick-actions
```

**Request Body:**

```json
{
  "label": "Analysis",
  "message": "Analyze the sentiment of this lead.",
  "slug": "custom_analysis"
}
```

| Field   | Type   | Required | Description                                  |
| :------ | :----- | :------- | :------------------------------------------- |
| `label` | string | **Yes**  | Label shown on the button (min 1 character)  |
| `message`| string | **Yes**  | Message sent to AI when clicked (min 1 char) |
| `slug`  | string | No       | Unique slug; auto-generated from label if omitted |

**Validation:** `slug` must match pattern `[a-z0-9_]+` if provided.

**Response 201 Created:**

Returns the created `QuickActionResponse` object.

---

### Get Single Quick Action

```
GET /api/quick-actions/{mongo_id}
```

**Path Parameters:**

| Parameter  | Type   | Description                        |
| :--------- | :----- | :--------------------------------- |
| `mongo_id` | string | MongoDB ObjectId as hex string     |

**Response 200 OK:**

Returns `QuickActionResponse` object.

**Response 404 Not Found:**

```json
{
  "detail": "Quick action not found"
}
```

---

### Update Quick Action

```
PATCH /api/quick-actions/{mongo_id}
```

**Path Parameters:**

| Parameter  | Type   | Description                        |
| :--------- | :----- | :--------------------------------- |
| `mongo_id` | string | MongoDB ObjectId as hex string     |

**Request Body:** (All fields optional)

```json
{
  "label": "Updated Label",
  "message": "Updated message text",
  "available": false,
  "is_active": true,
  "sort_order": 5,
  "slug": "new_slug_name"
}
```

**Response 200 OK:**

Returns updated `QuickActionResponse` object.

---

### Toggle Visibility

```
POST /api/quick-actions/{mongo_id}/toggle-visible
```

Flips the `available` flag (controls UI visibility).

**Path Parameters:**

| Parameter  | Type   | Description                        |
| :--------- | :----- | :--------------------------------- |
| `mongo_id` | string | MongoDB ObjectId as hex string     |

**Response 200 OK:**

Returns updated `QuickActionResponse` object with flipped `available` value.

---

### Toggle Active State

```
POST /api/quick-actions/{mongo_id}/toggle-active
```

Flips the `is_active` flag (enables/disables the action).

**Path Parameters:**

| Parameter  | Type   | Description                        |
| :--------- | :----- | :--------------------------------- |
| `mongo_id` | string | MongoDB ObjectId as hex string     |

**Response 200 OK:**

Returns updated `QuickActionResponse` object with flipped `is_active` value.

---

### Delete Quick Action

```
DELETE /api/quick-actions/{mongo_id}
```

Permanently deletes the quick action from the database.

**Path Parameters:**

| Parameter  | Type   | Description                        |
| :--------- | :----- | :--------------------------------- |
| `mongo_id` | string | MongoDB ObjectId as hex string     |

**Response 200 OK:**

```json
{
  "ok": true
}
```

**Response 404 Not Found:**

```json
{
  "detail": "Quick action not found"
}
```

---

### Bulk Delete

```
POST /api/quick-actions/bulk-delete
```

Permanently deletes multiple quick actions.

**Request Body:**

```json
{
  "_ids": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
}
```

**Field Aliases:** `ids` or `mongo_ids` (all map to `_ids`)

| Field | Type   | Required | Description                     |
| :---- | :----- | :------- | :------------------------------ |
| `_ids` | array  | **Yes**  | MongoDB ObjectId hex strings    |

**Response 200 OK:**

```json
{
  "ok": true,
  "deleted": 2
}
```

---

### Reorder Actions

```
POST /api/quick-actions/reorder
```

Sets the display order from an ordered list of IDs.

**Request Body:**

```json
{
  "_ids": ["id1_hex", "id2_hex", "id3_hex"]
}
```

**Field Aliases:** `ids` or `mongo_ids` (all map to `_ids`)

| Field | Type   | Required | Description                           |
| :---- | :----- | :------- | :------------------------------------ |
| `_ids` | array  | **Yes**  | Ordered MongoDB ObjectId hex strings  |

**Response 200 OK:**

```json
{
  "ok": true,
  "updated": 3
}
```

---

### Get Default Catalog

```
GET /api/quick-actions/defaults
```

Returns built-in default quick actions catalog (read-only template).

**Response 200 OK:**

```json
{
  "items": [
    {
      "slug": "lead_summary",
      "label": "Lead Summary",
      "message": "Give me a detailed summary of this lead."
    },
    {
      "slug": "next_steps",
      "label": "Next Steps",
      "message": "What are the recommended next steps for this contact?"
    }
  ]
}
```

---

### Seed Defaults

```
POST /api/quick-actions/seed
```

Inserts default catalog items if they don't exist. Does not overwrite existing items.

**Response 200 OK:**

```json
{
  "ok": true,
  "message": "Seeding logic executed"
}
```

---

## Data Models

### QuickActionItem

Chat UI response model for a single quick action chip.

| Field     | Type    | Description                                   |
| :-------- | :------ | :-------------------------------------------- |
| `slug`    | string  | Unique identifier for analytics/UI keys       |
| `label`   | string  | Text displayed on the button                  |
| `message` | string  | Message sent to AI when clicked               |
| `available`| boolean | Whether the chip should be shown              |

### QuickActionResponse

Admin API response model with full quick action details.

| Field       | Type    | Description                                  |
| :---------- | :------ | :------------------------------------------- |
| `_id`       | string  | MongoDB ObjectId as hex string               |
| `slug`      | string  | Unique slug (analytics/UI keys)              |
| `label`     | string  | Label shown on the button                    |
| `message`   | string  | Message sent to AI when clicked              |
| `available` | boolean | Dynamic availability toggle (UI visibility)  |
| `is_active` | boolean | Soft-delete flag (enabled/disabled)          |
| `sort_order`| integer | Display priority (ascending order)           |
| `created_at`| string  | ISO 8601 timestamp                           |
| `updated_at`| string  | ISO 8601 timestamp                           |

### QuickActionCreate

Request model for creating a new quick action.

| Field     | Type   | Required | Description                                           |
| :-------- | :----- | :------- | :---------------------------------------------------- |
| `label`   | string | **Yes**  | Label shown on the button                             |
| `message` | string | **Yes**  | Message sent to AI when clicked                       |
| `slug`    | string | No       | Optional unique slug; auto-generated if omitted       |

### QuickActionUpdate

Request model for updating an existing quick action (all fields optional).

| Field       | Type    | Description                                  |
| :---------- | :------ | :------------------------------------------- |
| `label`     | string  | Updated label text                           |
| `message`   | string  | Updated message text                         |
| `available` | boolean | Updated availability flag                    |
| `is_active` | boolean | Updated active status                        |
| `sort_order`| integer | Updated display order                        |
| `slug`      | string  | Updated unique slug                          |

### QuickActionListResponse

Paginated list response model.

| Field  | Type    | Description                     |
| :----- | :------ | :------------------------------ |
| `data` | array   | Array of `QuickActionResponse` objects |
| `total`| integer | Total number of items           |
| `page` | integer | Current page number             |
| `limit`| integer | Items per page                  |

### QuickActionReorderRequest

Request model for reordering quick actions.

| Field | Type   | Required | Description                           |
| :---- | :----- | :------- | :------------------------------------ |
| `_ids` | array  | **Yes**  | Ordered MongoDB ObjectId hex strings  |

**Aliases:** `ids` or `mongo_ids` (all accepted)

### QuickActionBulkDeleteRequest

Request model for bulk deletion.

| Field | Type   | Required | Description                           |
| :---- | :----- | :------- | :------------------------------------ |
| `_ids` | array  | **Yes**  | MongoDB ObjectId hex strings to delete |

**Aliases:** `ids` or `mongo_ids` (all accepted)

---

## Error Responses

All endpoints may return standard HTTP error responses.

### Error Response Format

```json
{
  "detail": "Error message description",
  "status_code": 400
}
```

### HTTP Status Codes

| Code | Description                  |
| :--- | :--------------------------- |
| 200  | Success                      |
| 201  | Created                      |
| 400  | Bad Request                  |
| 401  | Unauthorized                 |
| 403  | Forbidden                    |
| 404  | Not Found                    |
| 422  | Validation Error             |
| 500  | Internal Server Error        |

---

## Endpoint Summary

### Chat UI Endpoints

| Method | Endpoint                          | Description                      |
| :----- | :-------------------------------- | :------------------------------- |
| GET    | `/api/conversation/quick-actions` | Get quick action chips for chat  |

### Admin Endpoints

| Method | Endpoint                                   | Description                    |
| :----- | :----------------------------------------- | :----------------------------- |
| GET    | `/api/quick-actions`                       | List/search with pagination    |
| POST   | `/api/quick-actions`                       | Create new quick action        |
| GET    | `/api/quick-actions/{mongo_id}`            | Get single quick action        |
| PATCH  | `/api/quick-actions/{mongo_id}`            | Update quick action            |
| DELETE | `/api/quick-actions/{mongo_id}`            | Delete quick action            |
| POST   | `/api/quick-actions/{mongo_id}/toggle-visible` | Toggle visibility flag    |
| POST   | `/api/quick-actions/{mongo_id}/toggle-active`  | Toggle active flag        |
| POST   | `/api/quick-actions/reorder`               | Reorder actions               |
| POST   | `/api/quick-actions/bulk-delete`           | Bulk delete actions           |
| GET    | `/api/quick-actions/defaults`              | Get default catalog           |
| POST   | `/api/quick-actions/seed`                  | Seed default actions          |

---

## Interactive Documentation

- **Swagger UI**: `/docs`
- **OpenAPI Spec**: `/openapi.json`
- **ReDoc**: `/redoc`

---

Generated: 2026-04-01

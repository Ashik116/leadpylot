# Platform Credentials Access API Documentation

## Overview

This document describes the API endpoints for managing and accessing user platform credentials with full audit tracking. The system provides secure encrypted storage for external platform credentials and comprehensive logging of all credential access events.

## Key Features

- **AES-256-GCM Encryption**: Platform passwords are encrypted using AES-256-GCM (reversible encryption)
- **Full Audit Trail**: Every credential access is logged with admin info, IP address, user agent, and timestamps
- **Rate Limiting**: Suspicious activity detection prevents abuse (20 password views per 5 minutes)
- **Access Control**: Only administrators with proper permissions can view credentials

---

## Data Models

### User Platform Credential Structure

Each user can have multiple platform credentials stored in `other_platform_credentials` array:

```json
{
  "userName": "john_salesforce",
  "userEmail": "john@company.com",
  "userPass": "encrypted_string_here",
  "link": "https://company.salesforce.com",
  "platform_name": "Salesforce"
}
```

### Credential Access Log Structure

Every credential access creates a log entry:

```json
{
  "action": "credentials:view_password",
  "accessedBy": "ObjectId",
  "adminSnapshot": {
    "userId": "admin_id",
    "login": "admin@company.com",
    "role": "Admin",
    "name": "Admin Name",
    "email": "admin@company.com"
  },
  "targetUser": "ObjectId",
  "targetUserSnapshot": {
    "userId": "user_id",
    "login": "user@company.com",
    "role": "Agent",
    "name": "User Name"
  },
  "platformCredential": {
    "index": 0,
    "platform_name": "Salesforce",
    "userName": "john_salesforce",
    "userEmail": "john@company.com",
    "link": "https://company.salesforce.com"
  },
  "requestInfo": {
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "method": "POST",
    "path": "/credentials/user/123/decrypt/0"
  },
  "accessedAt": "2024-01-15T10:30:00.000Z",
  "status": "success"
}
```

---

## API Endpoints

### 1. Get User Platform Credentials (Encrypted)

Retrieves all platform credentials for a user with passwords remaining encrypted.

**Endpoint:** `GET /credentials/user/:userId`

**Access:** Admin only (requires `USER_READ_ALL` permission)

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "login": "john@example.com",
    "credentials": [
      {
        "index": 0,
        "platform_name": "Salesforce",
        "userName": "john_salesforce",
        "userEmail": "john@company.com",
        "link": "https://company.salesforce.com",
        "hasPassword": true
      },
      {
        "index": 1,
        "platform_name": "HubSpot",
        "userName": "john_hubspot",
        "userEmail": "john@company.com",
        "link": "https://app.hubspot.com",
        "hasPassword": true
      }
    ],
    "totalCredentials": 2
  }
}
```

**cURL Example:**
```bash
curl -X GET "https://api.example.com/credentials/user/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

---

### 2. Decrypt Platform Credential Password

Retrieves a specific platform credential with the password decrypted. **This action is logged for security audit purposes.**

**Endpoint:** `POST /credentials/user/:userId/decrypt/:credentialIndex`

**Access:** Admin only (requires `USER_READ_ALL` permission)

**Parameters:**
- `userId` - The ID of the user whose credential to decrypt
- `credentialIndex` - The index of the credential in the array (0-based)

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "userLogin": "john@example.com",
    "credential": {
      "index": 0,
      "platform_name": "Salesforce",
      "userName": "john_salesforce",
      "userEmail": "john@company.com",
      "userPass": "actual_plain_text_password",
      "link": "https://company.salesforce.com"
    }
  },
  "message": "This access has been logged for security purposes."
}
```

**Rate Limit Response (429 Too Many Requests):**
```json
{
  "status": "error",
  "error": "Too many credential access requests. Please wait before trying again.",
  "details": {
    "accessCount": 25,
    "timeWindow": "5 minutes",
    "threshold": 20
  }
}
```

**cURL Example:**
```bash
curl -X POST "https://api.example.com/credentials/user/507f1f77bcf86cd799439011/decrypt/0" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

---

### 3. Get Credential Access Logs

Retrieves all credential access logs with filtering options.

**Endpoint:** `GET /credentials/access-logs`

**Access:** Super Admin only (requires `AUDIT_READ` permission)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 50) |
| `accessedBy` | string | Filter by admin ID who accessed |
| `targetUser` | string | Filter by target user ID |
| `action` | string | Filter by action type |
| `ipAddress` | string | Filter by IP address |
| `startDate` | string | Filter logs from this date (ISO format) |
| `endDate` | string | Filter logs until this date (ISO format) |
| `status` | string | Filter by status: success, failed, denied |

**Response (200 OK):**
```json
{
  "status": "success",
  "logs": [
    {
      "_id": "log_id_here",
      "action": "credentials:view_password",
      "accessedBy": {
        "_id": "admin_id",
        "login": "admin@company.com",
        "role": "Admin"
      },
      "adminSnapshot": {
        "userId": "admin_id",
        "login": "admin@company.com",
        "role": "Admin",
        "name": "Admin Name"
      },
      "targetUser": {
        "_id": "user_id",
        "login": "user@company.com",
        "role": "Agent"
      },
      "targetUserSnapshot": {
        "userId": "user_id",
        "login": "user@company.com",
        "role": "Agent",
        "name": "User Name"
      },
      "platformCredential": {
        "index": 0,
        "platform_name": "Salesforce",
        "userName": "john_salesforce",
        "userEmail": "john@company.com",
        "link": "https://company.salesforce.com"
      },
      "requestInfo": {
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "method": "POST",
        "path": "/credentials/user/123/decrypt/0"
      },
      "accessedAt": "2024-01-15T10:30:00.000Z",
      "status": "success"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

**cURL Example:**
```bash
curl -X GET "https://api.example.com/credentials/access-logs?page=1&limit=20&status=success" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

---

### 4. Get Access Logs by Admin

Retrieves credential access logs for a specific admin.

**Endpoint:** `GET /credentials/access-logs/admin/:adminId`

**Access:** Super Admin or the admin viewing their own logs

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 50) |
| `startDate` | string | Filter logs from this date |
| `endDate` | string | Filter logs until this date |

**cURL Example:**
```bash
curl -X GET "https://api.example.com/credentials/access-logs/admin/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

---

### 5. Get Access Logs by Target User

Retrieves all credential access logs for a specific user (who had their credentials viewed).

**Endpoint:** `GET /credentials/access-logs/user/:userId`

**Access:** Super Admin only (requires `AUDIT_READ` permission)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 50) |
| `startDate` | string | Filter logs from this date |
| `endDate` | string | Filter logs until this date |

**cURL Example:**
```bash
curl -X GET "https://api.example.com/credentials/access-logs/user/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

---

### 6. Get Access Statistics

Retrieves credential access statistics for monitoring and reporting.

**Endpoint:** `GET /credentials/access-logs/statistics`

**Access:** Super Admin only (requires `AUDIT_READ` permission)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `days` | number | Number of days to analyze (default: 30) |

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "period": "30 days",
    "totalAccesses": 1250,
    "byAction": [
      { "_id": "credentials:view_password", "count": 800 },
      { "_id": "credentials:view_all", "count": 350 },
      { "_id": "credentials:view_single", "count": 100 }
    ],
    "topAdmins": [
      { "_id": "admin_id_1", "count": 450, "adminLogin": "admin1@company.com" },
      { "_id": "admin_id_2", "count": 300, "adminLogin": "admin2@company.com" }
    ],
    "byStatus": [
      { "_id": "success", "count": 1200 },
      { "_id": "denied", "count": 35 },
      { "_id": "failed", "count": 15 }
    ],
    "byDay": [
      { "_id": "2024-01-15", "count": 45 },
      { "_id": "2024-01-14", "count": 52 }
    ]
  }
}
```

**cURL Example:**
```bash
curl -X GET "https://api.example.com/credentials/access-logs/statistics?days=30" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

---

## Security Features

### Encryption

- **Algorithm**: AES-256-GCM (Advanced Encryption Standard with Galois/Counter Mode)
- **Key Derivation**: Uses `crypto.scryptSync` for secure key derivation
- **IV**: Random 16-byte initialization vector for each encryption
- **Auth Tag**: 16-byte authentication tag for integrity verification

### Environment Configuration

Set the encryption key in your environment:

```bash
CREDENTIAL_ENCRYPTION_KEY=your-secure-encryption-key-here
```

⚠️ **IMPORTANT**: Always set a strong encryption key in production. The default key is only for development.

### Rate Limiting

The system implements suspicious activity detection:

- **Threshold**: 20 password decryption requests per 5 minutes
- **Response**: Returns 429 Too Many Requests when threshold exceeded
- **Logging**: All rate-limited attempts are logged with status "denied"

### Audit Trail Information

Each access log captures:

| Field | Description |
|-------|-------------|
| `action` | Type of access (view_all, view_single, view_password) |
| `accessedBy` | Admin user ID who accessed the credential |
| `adminSnapshot` | Complete snapshot of admin details at access time |
| `targetUser` | User ID whose credentials were accessed |
| `targetUserSnapshot` | Complete snapshot of target user details |
| `platformCredential` | Details of the specific platform accessed |
| `requestInfo.ipAddress` | IP address of the request |
| `requestInfo.userAgent` | Browser/client user agent |
| `requestInfo.method` | HTTP method used |
| `requestInfo.path` | API path accessed |
| `accessedAt` | Timestamp of access |
| `status` | success, failed, or denied |
| `failureReason` | Reason for failure/denial (if applicable) |

---

## Action Types

| Action | Description |
|--------|-------------|
| `credentials:view_all` | Viewed all credentials for a user (passwords encrypted) |
| `credentials:view_single` | Viewed a single credential (password encrypted) |
| `credentials:view_password` | Viewed decrypted password for a credential |

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized. Please login to continue."
}
```

### 403 Forbidden
```json
{
  "error": "You do not have permission to view decrypted credentials"
}
```

### 404 Not Found
```json
{
  "error": "User not found"
}
```
or
```json
{
  "error": "Credential not found at the specified index"
}
```

### 429 Too Many Requests
```json
{
  "status": "error",
  "error": "Too many credential access requests. Please wait before trying again.",
  "details": {
    "accessCount": 25,
    "timeWindow": "5 minutes",
    "threshold": 20
  }
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Required Permissions

| Endpoint | Required Permission |
|----------|---------------------|
| `GET /credentials/user/:userId` | `USER_READ_ALL` |
| `POST /credentials/user/:userId/decrypt/:index` | `USER_READ_ALL` |
| `GET /credentials/access-logs` | `AUDIT_READ` |
| `GET /credentials/access-logs/admin/:adminId` | `AUDIT_READ` (or own logs) |
| `GET /credentials/access-logs/user/:userId` | `AUDIT_READ` |
| `GET /credentials/access-logs/statistics` | `AUDIT_READ` |

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/utils/credentialEncryption.js` | AES encryption/decryption utilities |
| `src/models/CredentialAccessLog.js` | Audit log model for credential access |
| `src/controllers/credentialController.js` | API controller logic |
| `src/routes/credentials.js` | Route definitions |
| `src/auth/roles/permissions.js` | Permission definitions |

---

## Example Workflow

### Step 1: Admin Views User's Credentials

```bash
curl -X GET "https://api.example.com/credentials/user/USER_ID" \
  -H "Authorization: Bearer <admin_token>"
```

This returns a list of credentials without passwords.

### Step 2: Admin Decrypts Specific Password

```bash
curl -X POST "https://api.example.com/credentials/user/USER_ID/decrypt/0" \
  -H "Authorization: Bearer <admin_token>"
```

This returns the decrypted password and logs the access.

### Step 3: Super Admin Reviews Access Logs

```bash
curl -X GET "https://api.example.com/credentials/access-logs?accessedBy=ADMIN_ID" \
  -H "Authorization: Bearer <super_admin_token>"
```

This shows all credential accesses by that admin.


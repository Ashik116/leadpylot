# Saved filters API — frontend integration guide

This document describes the **user-scoped saved filter presets** exposed by the Configuration Service. Each preset stores a **title**, a **page** context (which screen it belongs to), and either a **domain** (`type=filter`) or **groupBy** (`type=grouping`) payload.

**Service:** `configuration-service-api`  
**Resource path on the service:** `/saved-filters`  
**Auth:** JWT Bearer (same as other protected routes on this service)

If your app reaches this API through an API gateway, prefix paths accordingly (for example `/api/config/saved-filters`). The examples below use the **direct service path**.

---

## Concepts

| Concept | Description |
|--------|-------------|
| **Saved filter** | One document per user: a named preset with a `domain` you can re-apply when loading a list or search. |
| **`page` (field)** | Short string identifying the **UI context** (e.g. `lead`, `offer`). Use the same convention as your routes or feature flags so you can list “all presets for this screen.” |
| **`domain`** | JSON array of **conditions** and optional **logical tokens** (`\|`, `&`, `!`). Each condition is a triple: `[field, operator, value]`. This matches what you typically send as `domain` to search / universal query endpoints. |
| **Ownership** | Rows are tied to `user_id` from the JWT. Users only see and mutate their own presets. |

---

## Authentication

Every request must include:

```http
Authorization: Bearer <access_token>
```

The token payload must include the user id used by the service (`_id` or `id`), as with other authenticated routes.

---

## Response shape

Successful writes and reads return JSON with:

```json
{ "success": true, "data": { ... } }
```

List endpoints additionally include `meta`:

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

Note: `meta.page` here is the **pagination page number** (from query `page`), **not** the saved filter’s `page` field.

Errors typically look like:

```json
{ "success": false, "error": "Human-readable message" }
```

HTTP status codes: `400` validation, `401` missing/invalid token, `403` forbidden, `404` not found.

---

## Data model (client-facing)

| Field | Type | Required | Max length | Notes |
|-------|------|----------|------------|--------|
| `_id` | string (ObjectId) | — | — | Set by server. |
| `user_id` | string | — | — | Set by server from JWT. |
| `title` | string | create / update | 200 | Display name of the preset. |
| `page` | string | create / update | 200 | Screen/context key (e.g. `lead`). |
| `type` | string | optional on create/update | — | `filter` (default) or `grouping`. |
| `description` | string | optional | 2000 | Optional notes. |
| `domain` | array | required when `type=filter`; forbidden for `type=grouping` | — | See [Domain format](#domain-format). |
| `groupBy` | string[] | required when `type=grouping`; forbidden for `type=filter` | — | Field list such as `["team_id","user_id"]`. |
| `createdAt` | string (ISO date) | — | — | |
| `updatedAt` | string (ISO date) | — | — | |

---

## Domain format

The API validates `domain` on **create** and whenever **`domain`** is sent on **update**.

### Structure

- `domain` **must** be an **array**.
- It **must** contain **at least one** leaf condition `[field, operator, value]` (after expanding nested arrays).
- Allowed top-level entries:
  - **Logical operators** (strings): `'|'`, `'&'`, `'!'`
  - **Condition tuples** (arrays of length **3**): `[field, operator, value]`
  - **Nested arrays** for grouping (same rules inside)

### Field name (`field`)

- Non-empty string, must match:

  `^[a-zA-Z_][a-zA-Z0-9_.:]*$`

Examples: `team_id`, `status_id`, `lead_id.stage`, `lead_transfer:day`.

### Operators

Operators are matched **case-insensitively** (after trim). Supported set includes:

`=` `!=` `in` `not in` `not_in` `notin` `between` `>` `<` `>=` `<=` `contains` `like` `ilike` `is_empty` `is_not_empty` `is_null` `equals` `not equals` `not_equals` `greater` `greater than` `greater_than` `less` `less than` `less_than` `greater_equals` `greater than or equals` `less_equals` `less than or equals`

### Value (`value`)

- Must not be **`undefined`**. **`null`** is allowed where your search layer allows it.
- For `in` / `not in` family: value is often an **array** of ids; list length is capped at **500** entries.
- For `between`: value must be a 2-item array: `[lowerBound, upperBound]`.
- For `is_empty` / `is_not_empty` / `is_null`: clients can safely send `null`.

### Limits

- Maximum **nesting depth:** 16  
- Maximum **total elements** walked in the array: **500**

### Example (minimal)

```json
{
  "title": "My team filter",
  "page": "lead",
  "domain": [
    ["team_id", "in", ["686e76249084eed90292b0e8"]],
    ["status_id", "in", ["699d1f30c9f42bed49935bd8"]],
    ["user_id", "in", ["686e6def781309ae8c3b1935"]]
  ]
}
```

### Example (with OR)

```json
{
  "title": "New or open",
  "page": "lead",
  "domain": [
    "|",
    ["status", "=", "new"],
    ["status", "=", "open"]
  ]
}
```

---

## Endpoints

### 1. Create — `POST /saved-filters`

**Body (JSON):**

| Field | Required | Description |
|-------|----------|-------------|
| `title` | yes | Non-empty string. |
| `page` | yes | Non-empty string (screen key). |
| `type` | no | `filter` (default) or `grouping`. |
| `domain` | yes for `type=filter` | Valid domain array (see above); not allowed for `type=grouping`. |
| `groupBy` | yes for `type=grouping` | Non-empty array of field names; not allowed for `type=filter`. |
| `description` | no | Optional string. |

**Response:** `201` with `{ success: true, data: <saved document> }`.

**Example (fetch):**

```javascript
const res = await fetch(`${CONFIG_BASE}/saved-filters`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    title: 'Hot leads',
    page: 'lead',
    type: 'filter',
    description: 'Optional',
    domain: [
      ['team_id', 'in', [teamId]],
      ['status_id', 'in', [statusId]],
    ],
  }),
});
const json = await res.json();
if (!res.ok) throw new Error(json.error || res.statusText);
const created = json.data;
```

#### Grouping preset example

```json
{
  "title": "Pipeline grouping",
  "page": "lead",
  "type": "grouping",
  "groupBy": ["team_id", "user_id", "stage_id", "status_id", "source_id"]
}
```

---

### 2. List — `GET /saved-filters`

Returns the current user’s presets with pagination and optional filters.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | `1` | Pagination page index (1-based). |
| `limit` | number | `20` | Page size (max **100**). |
| `type` | string | — | Exact type filter: `filter` or `grouping`. |
| `search` | string | — | Case-insensitive substring match on **`title`** OR **`page`**. |
| `sortBy` | string | `createdAt` | One of: `title`, `page`, `type`, `createdAt`, `updatedAt`. |
| `sortOrder` | string | `desc` | `asc` or `desc`. |

**Response:** `200` with `{ success: true, data: [...], meta }`.

**Example:**

```javascript
const params = new URLSearchParams({
  page: '1',
  limit: '20',
  type: 'filter',
  search: 'team',
  sortBy: 'updatedAt',
  sortOrder: 'desc',
});
const res = await fetch(`${CONFIG_BASE}/saved-filters?${params}`, {
  headers: { Authorization: `Bearer ${accessToken}` },
});
const { data, meta } = await res.json();
```

---

### 3. List by page (path) — `GET /saved-filters/by-page/:page`

Same behavior as **List**, but the **screen `page`** is taken from the **path** (exact match). Useful for a dedicated “presets for this screen” call.

**Path:** `:page` is the same value you store in `page` (e.g. `lead`). URL-encode if it contains special characters.

**Query:** Same as list (`page`, `limit`, `type`, `search`, `sortBy`, `sortOrder`). Here, `page` is pagination and screen context comes from path `:page`.

**Example:**

```javascript
const pageKey = encodeURIComponent('lead');
const res = await fetch(
  `${CONFIG_BASE}/saved-filters/by-page/${pageKey}?type=grouping&page=1&limit=100`,
  { headers: { Authorization: `Bearer ${accessToken}` } }
);
```

**Routing note:** This route is registered **before** `GET /saved-filters/:id` so `by-page` is not parsed as an id.

---

### 4. Get one — `GET /saved-filters/:id`

**`:id`** — MongoDB ObjectId string.

**Response:** `200` with `{ success: true, data: { ... } }`.

---

### 5. Update — `PUT /saved-filters/:id`

**Body:** Must include **`title`** and **`page`** (both non-empty strings). Optionally **`type`**, **`description`**, **`domain`**, and/or **`groupBy`**.

Validation rules on update are strict:
- If `type=filter`, `domain` must be present/valid and `groupBy` must not be sent.
- If `type=grouping`, `groupBy` must be present/non-empty and `domain` must not be sent.

**Response:** `200` with `{ success: true, data: <updated document> }`.

**Example:**

```javascript
await fetch(`${CONFIG_BASE}/saved-filters/${id}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    title: 'Updated title',
    page: 'lead',
    description: '',
    domain: [['team_id', 'in', [teamId]]],
  }),
});
```

---

### 6. Delete — `DELETE /saved-filters/:id`

**Response:** `200` with `{ success: true, id: "<id>" }`.

---

## Applying a preset in the UI

Typical flow:

1. User picks a saved filter (from list or by-page).
2. If `preset.type === "filter"`, read `preset.domain` and pass it to your list/search request.
3. If `preset.type === "grouping"`, read `preset.groupBy` and use it for grouped list views.
4. Optionally persist **last selected preset id** in local state only; the backend already stores the preset per user.

Keep **`page`** in sync: only show presets whose `page` matches the current screen, or use `GET /saved-filters/by-page/:page` when entering that screen.

---

## TypeScript types (reference)

```typescript
export type DomainOperator =
  | '='
  | '!='
  | 'in'
  | 'not in'
  | 'not_in'
  | 'notin'
  | '>'
  | '<'
  | '>='
  | '<='
  | 'contains'
  | 'like'
  | 'ilike'
  | string; // other allowed aliases — validate against backend rules in production

export type DomainLeaf = [field: string, operator: string, value: unknown];

export type Domain = Array<
  | '|'
  | '&'
  | '!'
  | DomainLeaf
  | Domain // nested groups
>;

export interface SavedFilter {
  _id: string;
  user_id: string;
  title: string;
  page: string;
  type: 'filter' | 'grouping';
  description?: string;
  domain?: Domain;
  groupBy?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SavedFilterListMeta {
  total: number;
  page: number; // pagination page (from query `page`)
  limit: number;
  pages: number;
}
```

---

## Checklist for frontend

- [ ] Send `Authorization: Bearer` on all calls.
- [ ] Use **`page`** for pagination on list endpoints.
- [ ] Use **`GET /saved-filters/by-page/:page`** to scope results to the current screen.
- [ ] Use `type=filter` or `type=grouping` when you need separate tabs/lists.
- [ ] On **PUT**, always send **`title`** and **`page`**.
- [ ] For `type=filter`, build **`domain`** as JSON arrays of triples.
- [ ] For `type=grouping`, send **`groupBy`** as a non-empty field array.

---

## Related code (backend)

| Area | Location |
|------|----------|
| Routes | `src/routes/savedFilters.js` |
| Service | `src/services/savedFilterService.js` |
| Model | `src/models/SavedFilter.js` |
| Domain validation | `src/utils/domainValidation.js` |

---

## Changelog

| Date | Notes |
|------|--------|
| 2026-03 | Initial saved-filters API and validation rules. |

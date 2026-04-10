# Leadbot API Documentation

Documentation for the Leadbot API, extracted from Notion.

## Contents

| Document | Description |
|----------|-------------|
| [Leadbot API Doc](./Leadbot-API-Doc.md) | Request/response reference for each endpoint (Postman-style) |
| [Leadbot API Use Case Reference](./Leadbot-API-Use-Case-Reference.md) | Use case flows and workflows by feature area |
| [Leadbot Service API](./Leadbot-Service-API.md) | Complete service API with frontend integration tips |

## Quick Start

- **Base URL (local):** `http://localhost:8000` or `http://localhost:6009`
- **Auth:** `X-API-Key` header on all `/api/*` endpoints
- **Interactive docs:** `{BASE_URL}/docs` (Swagger UI)

## Environment Variables

Add to `.env`:

```env
NEXT_PUBLIC_LEADBOT_API_BASE=http://localhost:8000
NEXT_PUBLIC_LEADBOT_API_KEY=your-api-key-here
NEXT_PUBLIC_LEADBOT_MOCK=true   # Set false when backend is ready
```

- `NEXT_PUBLIC_LEADBOT_API_BASE` — API base URL
- `NEXT_PUBLIC_LEADBOT_API_KEY` — API key for authentication
- `NEXT_PUBLIC_LEADBOT_MOCK` — When `true`, uses mock adapter instead of real API

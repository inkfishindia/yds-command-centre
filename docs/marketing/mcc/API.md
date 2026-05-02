# MCC API Reference

## Base URL
```
/api/mcc
```

## Endpoints

### Posts

#### GET /posts
List all posts with optional filters.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| status | string | Filter by status |
| brand | string | Filter by brand |
| platform | string | Filter by platform (instagram, linkedin) |
| limit | number | Max results (default: 50) |

**Response:**
```json
[
  {
    "id": "page-id",
    "title": "Post Title",
    "body": "Post caption...",
    "platforms": ["instagram", "linkedin"],
    "status": "draft|scheduled|awaiting-approval|publishing|published|failed",
    "scheduledFor": "2026-05-15T10:00:00.000Z",
    "mediaUrls": ["https://..."],
    "owner": "Dan",
    "brand": "YDS",
    "publishedAt": null,
    "platformPostIds": {},
    "failureReason": null
  }
]
```

#### GET /posts/:id
Get single post by ID.

#### POST /posts
Create new draft. **SSE approval-gated.**

**Request Body:**
```json
{
  "title": "Post Title",
  "body": "Post caption...",
  "platforms": ["instagram", "linkedin"],
  "brand": "YDS",
  "mediaUrls": ["https://..."]
}
```

#### PATCH /posts/:id
Update draft. **SSE approval-gated.**

#### POST /posts/:id/schedule
Schedule post for future. **SSE approval-gated.**

**Request Body:**
```json
{
  "scheduledFor": "2026-05-15T10:00:00.000Z"
}
```

#### POST /posts/:id/publish-now
Trigger immediate publish. **SSE approval-gated.**

---

### Scheduler

#### POST /scheduler/tick
Scan for due posts and trigger publishing. Manual/cron stub.

**Response:**
```json
{
  "scanned": 5,
  "triggered": 2,
  "errors": []
}
```

---

### OAuth

#### GET /oauth/:platform/start
Start OAuth flow for platform.

**Parameters:** `platform` — `instagram` or `linkedin`

**Response:**
```json
{
  "authUrl": "https://...",
  "state": "abc123",
  "redirectUri": "http://localhost:3000/api/mcc/oauth/instagram/callback"
}
```

#### GET /oauth/:platform/callback
OAuth callback handler. Exchanges code for tokens.

---

### Status

#### GET /status
Get post counts by status.

**Response:**
```json
{
  "draft": 5,
  "scheduled": 3,
  "awaiting-approval": 1,
  "publishing": 0,
  "published": 12,
  "failed": 2
}
```

#### GET /platforms
List available platforms.

**Response:**
```json
[
  { "id": "instagram", "name": "Instagram" },
  { "id": "linkedin", "name": "LinkedIn" }
]
```

---

## SSE Events

Approval-gated endpoints stream SSE:

| Event | Payload |
|-------|---------|
| `approval` | `{ approvalId, toolName, toolInput, message }` |
| `text` | `{ text: "Operation completed" }` |
| `done` | `{ message, result }` |
| `error` | `{ error: "Error message" }` |

---

## Error Responses

```json
{ "error": "Post not found" }
{ "error": "Invalid platform: foo" }
{ "error": "Scheduled time must be in the future" }
{ "error": "At least one platform is required" }
```
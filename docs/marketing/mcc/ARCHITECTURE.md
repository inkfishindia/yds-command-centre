# MCC Architecture

## System Design

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Alpine.js)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ mcc.js      │  │ mcc.html    │  │ mcc.css             │ │
│  │ Module      │  │ Partial     │  │ View styles         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │ fetch('/api/mcc/*')
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Express Server (server.js)                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ routes/mcc.js                                          ││
│  │ - SSE approval gate (runWithApproval)                  ││
│  │ - CRUD routes                                          ││
│  │ - OAuth handlers                                       ││
│  └─────────────────────────────────────────────────────────┘│
│                           │                                  │
│         ┌───────────────┼───────────────┐                    │
│         ▼               ▼               ▼                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │
│  │ social/     │ │ mcc/        │ │ notion/     │             │
│  │ Provider    │ │ Domain      │ │ Notion SDK  │             │
│  │ Layer       │ │ Service     │ │ Service     │             │
│  └─────────────┘ └─────────────┘ └─────────────┘             │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                       Notion API                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ MCC Posts   │ │ IG Tokens   │ │ LI Tokens   │           │
│  │ DB          │ │ DB          │ │ DB          │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Social Provider Layer (`server/services/social/`)

Pure modules implementing the provider interface:
- `instagram.js` — Instagram Graph API (stub in P1)
- `linkedin.js` — LinkedIn Marketing API (stub in P1)
- `validate-media.js` — Media constraint validation
- `media-constraints.json` — Platform-specific rules

**Interface Contract:**
```javascript
{
  getProviderInfo() → { id, name },
  login(redirectUri) → { authUrl, state },
  refreshToken(refreshToken) → { accessToken, expiresAt },
  post(accessToken, payload) → { platformPostId, url },
  getAnalytics(accessToken, postId) → { likes, comments, shares, views }
}
```

### 2. MCC Domain Service (`server/services/mcc/`)

- `read-model.js` — Lists posts by status, filters
- `drafter.js` — Create/update/delete drafts
- `scheduler.js` — Schedule/unschedule with validation
- `publisher.js` — Publish workflow with approval

### 3. Routes (`server/routes/mcc.js`)

Thin route layer with:
- SSE-based approval gate (`runWithApproval`)
- CRUD operations
- OAuth start/callback

### 4. Frontend (`src/js/modules/mcc.js`)

Alpine.js module with:
- Post list by status (kanban)
- Composer modal with preview
- Platform selection
- OAuth connection status

## State Machine

```
draft → scheduled → awaiting-approval → publishing → published
                                          ↘ failed
```

## Approval Gate Flow

1. **Request** — User triggers action (create, schedule, publish)
2. **SSE Response** — Server emits `approval` event
3. **UI Shows** — Dan sees approval prompt with summary
4. **Decision** — Dan approves/rejects via `/api/chat/approve`
5. **Execute** — On approval, operation runs → Notion updated

## Patterns Used

- **Thin routes** — HTTP validation only, business logic in services
- **Pure modules** — No classes, no inheritance in social providers
- **Read-model** — Lists use read-model pattern, single fetches use direct Notion
- **SSE streaming** — Approval gate uses Server-Sent Events
- **Lazy loading** — Module and CSS loaded on first view access
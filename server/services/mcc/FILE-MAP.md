# MCC Service - File Map

## Purpose
Marketing Content Center domain service. Handles CRUD, scheduling, and publishing for social posts to Instagram + LinkedIn.

## Architecture

```
server/services/mcc/
├── index.js          # Public exports
├── read-model.js     # Read posts from Notion (lists, filters, counts)
├── drafter.js        # Create/update/delete drafts, status updates
├── scheduler.js      # Schedule/unschedule posts, conflict checking
├── publisher.js      # Publish to social platforms, approval workflow
└── FILE-MAP.md       # This file
```

## Dependencies

- **Internal**: 
  - `../notion` - Notion service for DB operations
  - `../social` - Social provider layer
- **External**: None

## Routes

See `server/routes/mcc.js` for HTTP endpoints.

| Method | Endpoint | Handler |
|--------|----------|---------|
| GET | `/api/mcc/posts` | listPosts |
| GET | `/api/mcc/posts/:id` | getPost |
| POST | `/api/mcc/posts` | createDraft |
| PATCH | `/api/mcc/posts/:id` | updateDraft |
| POST | `/api/mcc/posts/:id/schedule` | schedulePost |
| POST | `/api/mcc/posts/:id/publish-now` | publishNow |
| POST | `/api/mcc/scheduler/tick` | runSchedulerTick |

## State Machine

```
draft → scheduled → awaiting-approval → publishing → published
                                          ↘ failed
```

## Approval Gate

All write operations (create, update, schedule, publish) go through SSE approval gate:
1. Route creates SSE response
2. Emits `approval` event with post summary
3. Waits for Dan's approval via `/api/chat/approve`
4. On approval, executes the operation

## Notion DBs (to be created)

- **MCC Posts** DB: Main post storage
  - Title, Body, Platforms, Status, Scheduled For, Media URLs, Owner, Brand, Published At, Platform Post IDs, Failure Reason

- **Instagram Tokens** DB: OAuth tokens
- **LinkedIn Tokens** DB: OAuth tokens

## Environment

- `MCC_POSTS_DB_ID` - Notion DB ID for posts (placeholder in code)
- `SOCIAL_TOKEN_KEY` - Encryption key for stored tokens

## Phase Status

| Feature | P1 | P2 | P3 |
|---------|----|----|-----|
| Post CRUD | ✅ | | |
| Status pipeline | ✅ | | |
| Schedule post | ✅ | | |
| Manual publish | ✅ | | |
| OAuth flow | ✅ (stub) | | |
| Media validation | ✅ | | |
| Real cron scheduler | | ❌ | |
| Analytics | | ❌ | |
| Media upload | | | ❌ |

## Notes

- All Notion writes use `notion.createPage`, `notion.updatePageProperties`
- Read operations use `notion.queryDatabase` and `notion.getPage`
- Token storage is encrypted using Node's `crypto` module
- Phase 1 publishing is simulated - real API calls need OAuth credentials
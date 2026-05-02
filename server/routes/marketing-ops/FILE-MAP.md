# FILE-MAP — server/routes/marketing-ops/

## Public exports

| Export | Returns | Used by |
|--------|---------|---------|
| `require('../marketing-ops')` (shim) | Express Router | `server.js` at `app.use('/api/marketing-ops', ...)` |
| `require('./index')` | Express Router (same) | shim only |

All route URL paths under `/api/marketing-ops` are owned by this package.

## Files

| File | Owns | DO NOT add |
|------|------|------------|
| `index.js` | Express router creation, route registration order | Business logic, validation constants, service calls |
| `validators.js` | All VALID_* constants (statuses, types, channels, pillars, IG fields, MCC fields) | Route handlers, Express logic, service calls |
| `campaigns.js` | GET /campaigns, PATCH /campaigns/:id, GET /campaigns/:id/commitments | Content, sequence, session, task, or metric handlers |
| `content.js` | GET /content/calendar, GET /content, POST /content, PATCH /content/:id | Campaign, sequence, session, task, or metric handlers |
| `sequences.js` | GET /sequences | All other domain handlers |
| `sessions.js` | GET /sessions | All other domain handlers |
| `tasks.js` | GET /tasks/summary, GET /tasks | All other domain handlers |
| `metrics.js` | GET / (summary), GET /metrics | All other domain handlers |
| `FILE-MAP.md` | This index | Code |

## Want to add a feature?

| Intent | File to edit |
|--------|-------------|
| New campaign field validation | `campaigns.js` + `validators.js` if new constant needed |
| New content field or validation | `content.js` + `validators.js` if new constant needed |
| New sequence filter | `sequences.js` |
| New task filter or aggregation | `tasks.js` |
| New metric endpoint | `metrics.js` |
| New top-level route | `index.js` (registration) + new or existing leaf file (handler) |
| Change VALID_STATUSES or any enum | `validators.js` only — content.js and campaigns.js both import from here |

## Dep graph

```
index.js
  ├── metrics.js    → marketing-ops-service, read-model/marketing-ops
  ├── campaigns.js  → marketing-ops-service
  ├── content.js    → marketing-ops-service, validators.js
  ├── sequences.js  → marketing-ops-service
  ├── sessions.js   → marketing-ops-service
  └── tasks.js      → marketing-ops-service

validators.js  (no internal deps — leaf node)
```

All edges are acyclic. No file imports from a sibling that imports back.

## Constraining decisions

- Route registration uses direct handlers (not sub-router nesting) so that
  `router.stack` exposes `l.route` on every layer. Tests in
  `test/content-calendar.test.js` and `test/marketing-ig.test.js` rely on
  `router.stack.find/filter` with `l.route` truthy checks. See also
  `data/sessions/decisions.md` for the split decision row.
- Mount order is load-bearing: `/content/calendar` before `/content`,
  `/tasks/summary` before `/tasks`, `/campaigns/:id/commitments` before
  `/campaigns/:id` PATCH.

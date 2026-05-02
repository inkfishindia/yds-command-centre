# Notion Package — File Map

This package is the source of truth for all Notion access. Read this file
BEFORE editing — it tells you which file owns each concern, what the public
contracts are, and where NOT to put new code.

## Public exports (from `index.js` / `../notion.js` shim)

56 keys. All consumers use `require('../services/notion')` — never reach into
sub-files directly.

| Export | Returns | Used by |
|---|---|---|
| `DB` | object of DB UUIDs | all reads, routes, tests |
| `getClient` | Notion SDK client | infra files only |
| `simplify` | flatten Notion property object | pages.js, reads/ |
| `resolveRelations` | resolved properties object | index.js (getPage), tests |
| `resolveRelationIdsToNamedItems` | `{id → {id,name}}` map | tool-handler, notion-tools |
| `listDatabases` | DB metadata array | notion route |
| `queryDatabase` | raw Notion query result | dashboard-summary, reads/ |
| `getKeyPages` | key pages array | notion route |
| `getPage` | page with resolved relations | notion route, tools |
| `getPageContent` | `{blocks, markdown}` | documents route |
| `getRelatedPages` | `{propName → [{id,name,…}]}` | notion route |
| `clearCache` | void | cache routes, tests |
| `invalidateCommitmentCaches` | void | writes/ after mutations |
| `setCachedWithTime` | void | testing, manual cache sets |
| `deduplicatedFetch` | Promise<data> | shared infra, tests |
| `getCommitments` | commitment array | tools, routes |
| `getOverdueCommitments` | commitment array | dashboard-summary, tools |
| `getUpcomingCommitments` | commitment array | dashboard-summary, tools |
| `getAllCommitments` | commitment array | tools, routes |
| `getActiveCommitments` | commitment array | dashboard-summary |
| `getCommitmentsForKanban` | commitment array | kanban route |
| `getFocusAreas` | focus area array | dashboard-summary, tools |
| `getPeople` | people array | dashboard-summary, tools |
| `getProjects` | project array | dashboard-summary, tools |
| `getRecentDecisions` | decision array | dashboard-summary, tools |
| `getCampaigns` | campaign array | marketing routes |
| `getContentCalendar` | calendar item array | marketing routes |
| `getContentCalendarByMonth` | calendar item array | marketing routes |
| `getUnscheduledContent` | calendar item array | marketing routes |
| `resolveCampaignNames` | `{id → name}` map | marketing routes |
| `getSequences` | sequence array | marketing routes |
| `getSessionsLog` | session log array | marketing routes |
| `getMarketingOpsSummary` | summary object | marketing routes |
| `getCampaignCommitments` | commitment array | marketing routes |
| `getSprintItems` | sprint item array | tech-team routes |
| `getSpecLibrary` | spec array | tech-team routes |
| `getTechDecisions` | decision array | tech-team routes |
| `getSprintArchive` | archive array | tech-team routes |
| `getTechTeamSummary` | summary object | tech-team routes |
| `getAITeam` | AI team array | tech-team routes |
| `getMarketingTasks` | task array | task routes |
| `getTechBacklog` | backlog array | task routes |
| `getIgPerformance` | IG performance row array | marketing-ig routes |
| `getHookPatternLog` | hook pattern row array | marketing-ig routes |
| `getTemplateLibrary` | template row array | marketing-ig routes |
| `getApprovalsLog` | approval log row array | marketing-ig routes |
| `getWeeklyOpsLog` | weekly ops log row array | marketing-ig routes |
| `createCommitment` | created page object | writes, approval gate |
| `createDecision` | created page object | writes, approval gate |
| `updateCommitmentStatus` | updated page object | writes, approval gate |
| `updateCommitmentPriority` | updated page object | writes, approval gate |
| `updateCommitmentDueDate` | updated page object | writes, approval gate |
| `updateCommitmentAssignee` | updated page object | writes, approval gate |
| `appendCommitmentNote` | updated page object | writes, approval gate |
| `createContentCalendarItem` | created page object | writes, approval gate |
| `updateContentCalendarItem` | updated page object | writes, approval gate |
| `updateCampaignProperty` | updated page object | writes, approval gate |
| `updateSprintItemProperty` | updated page object | writes, approval gate |
| `getDashboardSummary` | enriched dashboard payload | notion route, morning brief |
| `buildMorningBriefFromDashboard` | brief object (sync) | notion route, tests |
| `getMorningBrief` | brief object (async) | notion route |

## Files

### `index.js` — public re-export shim + getPage composer (177 lines)
Owns: module.exports for all 56 keys; `getPage` function (composes
  `getPageRaw` + `resolveRelations` — lives here to avoid the
  `pages.js ↔ relations.js` dep cycle).
DO NOT add: business logic, new reads/writes, cache infra. Re-export block only
  plus `getPage`. Everything else belongs in a sibling.

### `client.js` — Notion SDK singleton (leaf)
Owns: `getClient()` — lazy-init of `@notionhq/client`. One client for the process.
DO NOT add: any business logic, retry, cache.

### `simplify.js` — property flattener (leaf)
Owns: `simplify(properties)` — converts raw Notion property objects to plain JS values.
DO NOT add: relation resolution (relations.js), domain logic.

### `databases.js` — DB UUID constants + low-level query helpers (leaf)
Owns: `DB` const (all database IDs), `listDatabases`, `queryDatabase`, `getKeyPages`.
DO NOT add: domain reads (reads/), cache logic.

### `retry.js` — rate-limit retry wrapper (leaf)
Owns: `withRetry(fn)` — exponential back-off for Notion API calls.
DO NOT add: cache, client init, domain logic.

### `cache.js` — stale-while-revalidate cache + dedup (leaf)
Owns: `cache` Map, `getCacheEntry`, `getCached`, `setCache`, `setCachedWithTime`,
  `getCachedWithTTL`, `stableStringify`, `deduplicatedFetch`, `clearCache`,
  `inFlight` Map, `CACHE_TTL`, `CACHE_HARD_EXPIRY`, `DASHBOARD_CACHE_KEY`,
  `DASHBOARD_CACHE_TTL`.
DO NOT add: client init, domain reads, retry logic.

### `cache-invalidation.js` — targeted cache invalidation (leaf)
Owns: `invalidateCommitmentCaches()` — deletes commitment-related cache keys after writes.
DO NOT add: cache infrastructure (cache.js), write logic.

### `pages.js` — raw page + block fetching (leaf)
Owns: `getPageRaw`, `getPageContent`, `fetchBlockChildren`, `blocksToMarkdown`,
  `richTextToPlain`, `EXPANDABLE_BLOCK_TYPES`, `getRelatedPages`.
DO NOT add: `getPage` (lives in index.js — adding it here creates pages ↔ relations
  cycle), relation resolution (relations.js), DB constants (databases.js).

### `relations.js` — relation ID resolution (leaf)
Owns: `resolveRelations`, `resolveRelationIdsToNamedItems`.
Depends on `pages.js` for `getPageRaw` — this edge is why `getPage` cannot live
  in `pages.js`.
DO NOT add: cache infra, DB constants, domain reads.

### `write-queue.js` — serialised write queue (leaf)
Owns: write-queue infrastructure for sequencing Notion mutations.
DO NOT add: read logic, cache, client init.

### `reads/commitments.js` — commitment reads
Owns: `getCommitments`, `getOverdueCommitments`, `getUpcomingCommitments`,
  `getAllCommitments`, `getActiveCommitments`, `getRecentlyCompletedCommitments`,
  `getCommitmentsForKanban`.
DO NOT add: writes (writes/commitments.js), dashboard composition.

### `reads/focus-areas.js` — focus area reads
Owns: `getFocusAreas`.
DO NOT add: dashboard composition.

### `reads/people.js` — people reads
Owns: `getPeople`.

### `reads/projects.js` — project reads
Owns: `getProjects`.

### `reads/decisions.js` — decision reads
Owns: `getRecentDecisions`.

### `reads/marketing-ops.js` — marketing reads
Owns: `getCampaigns`, `getContentCalendar`, `getContentCalendarByMonth`,
  `getUnscheduledContent`, `resolveCampaignNames`, `getSequences`,
  `getSessionsLog`, `getMarketingOpsSummary`, `getCampaignCommitments`.

### `reads/tech-team.js` — tech team reads
Owns: `getSprintItems`, `getSpecLibrary`, `getTechDecisions`, `getSprintArchive`,
  `getTechTeamSummary`.

### `reads/ai-team.js` — AI team reads
Owns: `getAITeam`.

### `reads/tasks.js` — task reads
Owns: `getMarketingTasks`, `getTechBacklog`.

### `reads/marketing-ig.js` — IG playbook reads (Phase B, 2026-05-02)
Owns: `getIgPerformance`, `getHookPatternLog`, `getTemplateLibrary`, `getApprovalsLog`,
  `getWeeklyOpsLog`.
DO NOT add: Content Calendar reads (reads/marketing-ops.js), write operations,
  dashboard composition. All 5 DBs are env-var-gated at runtime — each function
  throws if its env var is missing. `simplify()` now handles `formula` and `rollup`
  types required by IG Performance.

### `writes/commitments.js` — commitment writes
Owns: `createCommitment`, `createDecision`, `updateCommitmentStatus`,
  `updateCommitmentPriority`, `updateCommitmentDueDate`, `updateCommitmentAssignee`,
  `appendCommitmentNote`.
All writes go through approval gate. Must call `invalidateCommitmentCaches` after
  any mutation.
DO NOT add: reads (reads/commitments.js).

### `writes/marketing-ops.js` — marketing writes
Owns: `createContentCalendarItem`, `updateContentCalendarItem`, `updateCampaignProperty`.

### `writes/tech-team.js` — tech team writes
Owns: `updateSprintItemProperty`.

### `dashboard-summary.js` — dashboard summary composer (~293 lines)
Owns: `getDashboardSummary` — fetches all domain reads in parallel, enriches
  focus areas / people / commitments, caches result via `getCachedWithTTL`.
  Uses the typed cache helper (not raw Map access) — Decision #79 behavior tightening.
DO NOT add: morning brief logic (morning-brief.js), raw Notion SDK calls,
  new domain reads (add to reads/ and import here).

### `morning-brief.js` — morning brief composer (~202 lines)
Owns: `buildMorningBriefFromDashboard`, `getMorningBrief`. Internal helpers:
  `PRIORITY_WEIGHTS`, `computeCommitmentScore` (not on public surface).
  Derives brief from already-cached dashboard — no extra Notion requests.
DO NOT add: dashboard data fetching (dashboard-summary.js), cache infra.

## Want to add a feature?

| What you're adding | Edit |
|---|---|
| New Notion DB | `databases.js` (add to `DB` const) |
| New cached read (existing domain) | matching `reads/<area>.js` |
| New cached read (new domain) | new `reads/<area>.js` + import + re-export in `index.js` |
| New IG playbook read | `reads/marketing-ig.js` |
| New IG playbook write | `writes/marketing-ops.js` (Phase D) |
| New write through approval gate | `writes/<area>.js` + add to `WRITE_TOOLS` Set in tool-handler |
| New dashboard aggregation or signal | `dashboard-summary.js` |
| New morning brief signal (uses existing dashboard data) | `morning-brief.js` |
| New morning brief signal (needs new payload field) | `dashboard-summary.js` first, then `morning-brief.js` |
| Bug in cache TTL / stale window | `cache.js` |
| Bug in retry / rate-limit handling | `retry.js` |
| Bug in write serialization | `write-queue.js` |
| New page-content block rendering type | `pages.js` (`blocksToMarkdown` switch) |
| New relation resolution shape | `relations.js` |
| Adding getPage-like composition (needs both pages + relations) | `index.js` only — adding to pages.js creates a cycle |

## Dependency graph (acyclic)

```
client.js          (leaf — no internal deps)
retry.js           (leaf — no internal deps)
simplify.js        (leaf — no internal deps)
cache.js           (leaf — no internal deps)
write-queue.js     (leaf — no internal deps)

databases.js       → client.js, retry.js, cache.js, simplify.js
pages.js           → client.js, retry.js, cache.js, simplify.js
relations.js       → pages.js
cache-invalidation.js → cache.js

reads/commitments.js   → databases.js, cache.js, retry.js, client.js
reads/focus-areas.js   → databases.js
reads/people.js        → databases.js
reads/projects.js      → databases.js
reads/decisions.js     → databases.js
reads/marketing-ops.js  → databases.js
reads/marketing-ig.js   → databases.js, client.js, cache.js, retry.js, simplify.js
reads/tech-team.js      → databases.js
reads/ai-team.js        → databases.js
reads/tasks.js          → databases.js

writes/commitments.js   → databases.js, cache-invalidation.js, write-queue.js
writes/marketing-ops.js → databases.js, write-queue.js
writes/tech-team.js     → databases.js, write-queue.js

dashboard-summary.js   → cache.js, databases.js, reads/commitments.js,
                         reads/focus-areas.js, reads/people.js, reads/projects.js,
                         reads/decisions.js

morning-brief.js       → dashboard-summary.js

index.js               → ALL of the above (composer + re-export layer)
                         getPage defined here: uses pages.js + relations.js
```

No file `require('./index')`. Graph is strictly acyclic.
Key cycle that MUST NOT be introduced: `pages.js → relations.js → pages.js`.
`getPage` (which composes both) lives in `index.js` for this reason.

## Constraining decisions

- **#74** — FILE-MAP.md format (this file's structure and maintenance rules).
- **#75** — file-discipline: size ceilings, split methodology, refactor contract.
- **#79** — god-file split methodology: pure mechanical extraction, public API +
  behavior frozen during split, tests are the contract.
- **Behavior tightening (PR3 only):** `getDashboardSummary` now uses
  `getCachedWithTTL(key, ttl)` from `cache.js` instead of raw `cache.get()` +
  manual age check. Byte-equivalent behavior; eliminates raw Map access from
  domain code. This is the only intentional change in PR3.

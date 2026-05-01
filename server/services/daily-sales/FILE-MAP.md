# Daily Sales — File Map

This package is the source of truth for the Daily Sales dashboard. Read this
file BEFORE editing — it tells you which file owns each concern, what the
public contracts are, and where NOT to put new code.

## Public exports (from `index.js`)

| Export | Returns | Used by |
|---|---|---|
| `getDashboard({ filterSpec, nowMs })` | composed dashboard payload | `server/routes/daily-sales.js` via `daily-sales-service.js` |
| `getFilteredOrders({ filterSpec, limit, offset, nowMs })` | `{ orders: Order[], total, hasMore }` | drill-down endpoint in `server/routes/daily-sales.js` |
| `clearCache()` | clears in-memory dashboard cache | tests, manual invalidation |
| `parseDDMMYYYY`, `getISTNow`, `toISTDateKey`, `fyDisplayLabel` | re-exported helpers | tests (imported from `daily-sales-service.js`) |

`getDashboard` also accepts a positional `nowMs` number for backward-compat
(test injection). Prefer the object form `{ filterSpec, nowMs }` for new callers.

## Files

### `index.js` — entry shim (75 lines)
Owns: public exports + backward-compat signature normalization. Also calls
`clearCache()` at module load, which resets the in-memory cache on every
require-cache miss (ensures test isolation when `clearMocks()` deletes `index.js`
from Node's require cache).
DO NOT add: any business logic. If you're tempted, you want a different file.

### `taxonomy.js` — taxonomy lookups + canonicalisation helpers (98 lines) [NEW Pass 2 A1]
Owns: `PRINT_METHOD_MAP`, `PARTNER_LOOKUP`, `CHANNEL_GROUP_MAP`,
`getChannelGroup(orderType)`, `normalisePrintMethod(raw)`.
Pure data + pure functions. No I/O. No parsing. No status taxonomy.
`parse.js` imports from here and re-exports everything for backward compat.
Note: `detectUnknownTags` in `data-quality.js` requires `normalisePrintMethod`
lazily (inside function body) to honour test mock injection.
DO NOT add: parsing, status sets, date math.

### `parse.js` — Order schema + parser (~324 lines)
Owns: `parseOrder`, `parseDDMMYYYY`, `toISTDateKey`, `parseRevenue`,
`normalizeOrderType`, status taxonomy Sets (`REALIZED_STATUSES`,
`IN_FLIGHT_STATUSES`, `CANCELLED_STATUSES`, `DRAFT_STATUSES`),
`statusBucket(rawStatus)`, `printMethodRaw` field on Order (raw first tag,
preserved pre-normalisation — used by `detectUnknownTags`).
Re-exports (for backward compat): `PRINT_METHOD_MAP`, `PARTNER_LOOKUP`,
`CHANNEL_GROUP_MAP`, `getChannelGroup`, `normalisePrintMethod` from taxonomy.js.
All derived Order fields from §12: channelGroup, isB2C, isCorporate, isDS,
isStores, isPartner, madeBy, isArun, accountTier, accountManager, fyWeek,
printMethod, printMethod2, printMethodRaw, revenueTier, isB2BClient,
hasPartnerRef, isTagged, isMadeByBlank, gstin, partnerOrderNumber.
Pure functions only. DO NOT add: I/O, HTTP, mutation. Adding a new status bucket goes here.

### `filters.js` — FilterSpec + applier (226 lines)
Owns: `DEFAULT_FILTER_SPEC`, `parseFilterSpec(query)`, `validateFilterSpec`,
`applyFilters(orders, spec)`, `summarizeFilterApplied`, `resolveStatusList`.
DO NOT add: aggregation math (use `aggregations.js`).

### `aggregations.js` — pure aggregation helpers (439 lines) ⚠ AT HARD CAP
Owns: `aggregate`, `delta`, `buildMix`, `buildMixByFn`, `buildTrend30d`,
`buildTrend30dLong`, `buildConcerns` (Pass 2: new spec §7 — pendingAcceptance
/ rejectedOrders / stuckOrders / pendingRevenue / rejectedRevenue),
`buildTopStates`, `buildTodaysOrders` (Pass 2: extended with channelGroup /
shippingState / acceptanceStatus / madeBy), `buildWeeklyTrend` (Pass 2),
`parseTime12h`. Each takes `Order[]` → plain object.
DO NOT add: filter logic (use `filters.js`), fetching (use `fetch.js`).
⚠ SPLIT PROPOSED (see "Pending split" section below).

### `data-quality.js` — diagnostics (252 lines)
Owns: `detectIntraTabDuplicates`, `detectAcceptanceMix`,
`summarizeRealizedRatio` (Pass 1), plus Pass 2 additions:
`detectTagCoverage` (overall + byOrderType tag coverage),
`detectUnknownTags` (raw tags that didn't normalise — requires lazy-require of taxonomy),
`detectUnattributedPartnerOrders` (isMadeByBlank count),
`detectUnexpectedStatusCombinations` (Rule 1/2/3 violations, capped at 50).
Read-only diagnostics over `Order[]`.
Note: `detectUnknownTags` requires `normalisePrintMethod` lazily inside the function body.

### `fy.js` — FY date math (84 lines)
Owns: `IST_OFFSET_MS`, `getISTNow`, `lastDayOfMonth`, `fyDisplayLabel`,
`fyMonthIndex`, `fyOrdinal`. Pure date helpers.

### `cache.js` — in-memory dashboard cache (86 lines)
Owns: `_cacheMap`, `buildCacheKey`, `getCached`, `setCache`, `clearCache`,
LRU + TTL constants (5-min TTL, 50 entry max).
Note: depends on `filters.js` only for the `DEFAULT_FILTER_SPEC` reference
equality check in `buildCacheKey` — this is the only non-leaf dependency.
DO NOT add: business logic — cache only knows about (key, payload) pairs.

### `fetch.js` — Sheets fetch + dedup (115 lines)
Owns: `fetchAllOrders(istNowDate)`, `deduplicateIntraTab(orders)`,
`deduplicateCrossTab(ytdOrders, monthOrders)`.
Reads three tabs (YTD, current month, last FY). Blank-Order# rows pass
through as unique (Decision #71).
Note: `../sheets` is required lazily inside `fetchAllOrders` (not at module
top) so that test mocks injected into `require.cache` are always honoured,
even when this module is cached between test runs.
DO NOT add: aggregation, payload shaping.

### `available-filters.js` — filter dropdown options (85 lines)
Owns: `buildAvailableFilters(allOrders)` — case-insensitive grouping for
`printMethods` and `statuses` (Decision #70). Returns the `filters.available`
sub-object only.

### `dashboard-builder.js` — payload composition orchestrator (435 lines)
Owns: `buildDashboard({ filterSpec, nowMs })` (composes the full response
payload), `buildFilteredOrders` (drill-down). Calls into fetch, cache,
filters, aggregations, available-filters, and data-quality to assemble.
This is THE place where the response shape is decided.
New payload fields (Pass 2): `weeklyTrend`, `concerns.rejectedOrders`,
`concerns.pendingRevenue`, `concerns.rejectedRevenue`,
`dataQuality.tagCoverage`, `dataQuality.unknownTags`,
`dataQuality.unattributedPartnerOrders`, `dataQuality.unexpectedStatusCombinations`.
Extended: `mtdByChannel` groups now have no `_skippedRows` field (UI Spec §10).
Extended: `todaysOrders` rows include `channelGroup`, `shippingState`,
  `acceptanceStatus`, `madeBy` (UI Spec Panel 10).
Note: `../sheets` is required lazily inside `buildDashboard` (for
`getSpreadsheetId`) so test mocks are always honoured.
DO NOT add: low-level data access, pure aggregation. Those go in their
own files; this file orchestrates.

## Dependency graph (acyclic)

```
taxonomy.js                    (leaf — no internal deps)
  ↓
parse.js, fy.js              (leaves — parse imports taxonomy; re-exports it)
  ↓               ↓
filters.js     aggregations.js     data-quality.js → (lazy: taxonomy.js)
  ↓
cache.js        (no service deps beyond filters.js for DEFAULT_FILTER_SPEC)

fetch.js        (depends on parse.js; ../sheets required lazily at call time)

available-filters.js   (no internal deps — operates on Order[] directly)

dashboard-builder.js   (depends on ALL the above — the orchestrator)
  ↓
index.js               (depends on cache.js, dashboard-builder.js, parse.js, fy.js)
```

No file `require('./index')`. The graph is strictly acyclic.

## ⚠ Pending split: aggregations.js (439 lines, at hard cap)

`aggregations.js` is at 439 lines — over the 400-line hard cap for
single-concern files. The next feature addition MUST be preceded by this split:

**Proposed structure:**

```
aggregations/
  revenue.js    — aggregate, delta (pure number math, ~60 lines)
  mix.js        — buildMix, buildMixByFn (~80 lines)
  trend.js      — buildTrend30d, buildTrend30dLong, buildWeeklyTrend (~130 lines)
  concerns.js   — buildConcerns, TERMINAL_STATUSES (~90 lines)
  today.js      — buildTodaysOrders, parseTime12h (~50 lines)
  topstates.js  — buildTopStates (~40 lines)
  index.js      — re-exports all of the above (shim, ~30 lines)
```

The original `aggregations.js` becomes a shim that re-exports from the new
structure. External callers (`dashboard-builder.js`, tests via `AGG_PATH`) must
not change. Dep graph stays acyclic. Tests are the contract — don't modify them
during the split.

## Want to add a feature?

| What you're adding | Edit |
|---|---|
| New status bucket / classification | `parse.js` (Sets + `statusBucket`) |
| New filter dimension (e.g., `urgency`) | `filters.js` (FilterSpec, parser, applier) + `available-filters.js` (dropdown options) |
| New aggregation (e.g., revenue-by-day-of-week) | `aggregations.js` (the helper) + `dashboard-builder.js` (call it, add to payload) |
| New API field on the response payload | `dashboard-builder.js` only |
| New cached endpoint | `cache.js` if cache infra changes; otherwise just call `getCached`/`setCache` from your endpoint |
| Bug in dedup | `fetch.js` |
| New diagnostic | `data-quality.js` |
| New caller of the package | Use exports from `index.js` only — never reach into specific files |
| New channel group / partner tier | `taxonomy.js` (CHANNEL_GROUP_MAP / PARTNER_LOOKUP) |
| New print method canonical value | `taxonomy.js` (PRINT_METHOD_MAP) |
| New segmentation / derived field on Order | `parse.js` |
| Taxonomy lookup (channel group / print method) | `taxonomy.js` |

## Want to refactor?

The dependency graph is acyclic — see above. If you need to introduce a
circular dep, you're putting code in the wrong file.

Decisions that constrain this package:
- #56 (data-defined statuses)
- #58 (apples-to-apples deltas)
- #59 (realized vs allStatuses semantics)
- #69 (status bucket taxonomy)
- #70 (read-side casing fix for printMethods/statuses — canonicalisation now in taxonomy.js per Master Spec §10, re-exported from parse.js for backward compat)
- #71 (blank-Order# dedup bypass)
- #73 (lazy-require for mocked external services — `../sheets` required inside function body in fetch.js and dashboard-builder.js; `./taxonomy` required inside function body in detectUnknownTags)

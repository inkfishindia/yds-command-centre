# Sheets Package — File Map

This package is the source of truth for all Google Sheets access. Read this file
BEFORE editing — it tells you which file owns each concern, what the public
contracts are, and where NOT to put new code.

## Public exports (from `index.js` / `../sheets.js` shim)

16 keys. All consumers use `require('../services/sheets')` — never reach into
sub-files directly.

| Export | Returns | Used by |
|---|---|---|
| `getPipelineData` | pipeline object `{ available, totalLeads, b2b, other, statusBreakdown, … }` | dashboard routes |
| `getStrategyCascade` | `{ available, levels }` | strategy route |
| `isConfigured` | boolean | bmc-service, other routes, tests |
| `clearCache` | void | tests, manual cache invalidation |
| `SHEET_REGISTRY` | registry object (all sheet entries) | hydration service, tool-handler, routes |
| `SPREADSHEET_KEYS` | object of string keys | hydration service, routes |
| `isSpreadsheetConfigured` | boolean | routes, tool-handler |
| `getSpreadsheetId` | string (spreadsheet ID or '') | crud.js, pipeline.js, tool-handler |
| `fetchSheet` | `{ available, headers, rows }` or `{ available: false, reason }` | daily-sales, google-ads-service, bmc-service |
| `appendRow` | `{ success, updates }` | write tools via approval gate |
| `updateRow` | `{ success, updatedCells }` | write tools via approval gate |
| `deleteRow` | `{ success }` | write tools via approval gate |
| `getSheetHeaders` | string[] | crud.js (internal), routes |
| `parseRows` | object[] | hydration service, d2c-service |
| `resolveSheetName` | string | hydration service, tests |
| `getSheetLink` | `{ url, sheetName, spreadsheetTitle, label }` or null | daily-sales route, google-ads route |

## Files

### `index.js` — public re-export shim (~35 lines)
Owns: `module.exports` of all 16 exports. No logic.
DO NOT add: business logic, cache infra, domain reads. If you're adding logic here, it belongs in a sibling.

### `cache.js` — in-memory cache (leaf, ~35 lines)
Owns: `cache` Map, `getCached`, `setCache`, `clearCache`, `CACHE_TTL` (5 min), `HEADER_CACHE_TTL` (60 min).
Both main sheet cache and header cache share the single Map — header entries use key prefix `headers_`.
DO NOT add: tab-meta cache (tab-meta.js owns its own Map), client init, registry.

### `client.js` — Google API client singletons (leaf, ~75 lines)
Owns: `isConfigured`, `authOptions`, `getClient` (RO singleton), `getReadWriteClient` (RW singleton).
Both clients lazy-require `googleapis` inside the function body (not at module top).
DO NOT add: domain reads, cache, registry data.

### `parse-rows.js` — row → object converter (leaf, ~20 lines)
Owns: `parseRows(rows)`. Pure helper. Lowercases header row, replaces spaces with underscores.
DO NOT add: client, cache, registry.

### `resolve-sheet-name.js` — dynamic sheetName resolver (leaf, ~25 lines)
Owns: `resolveSheetName(entry, now)`. Pure helper. Returns string from either string sheetName or function sheetName.
DO NOT add: registry data, client, cache.

### `registry.js` — spreadsheet key constants + SHEET_REGISTRY map (~160 lines)
Owns: `SPREADSHEET_KEYS`, `SHEET_REGISTRY` (the giant map of all sheet entries), `getSpreadsheetId`, `isSpreadsheetConfigured`.
Depends on `../config` only.
DO NOT add: client init, cache, CRUD ops.

### `tab-meta.js` — tab metadata cache + getSheetLink (~100 lines)
Owns: `tabMetaCache` (separate 1-hour TTL Map), `getTabMetaCached`, `setTabMetaCache`, `getSheetLink`.
DO NOT add: main sheet cache (cache.js), CRUD ops (crud.js).

### `crud.js` — sheet CRUD operations (~195 lines)
Owns: `getSheetHeaders`, `fetchSheet`, `appendRow`, `updateRow`, `deleteRow`.
Depends on cache + client + registry + resolve-sheet-name + (implicitly) parse-rows via inline logic.
Note: `getSheetHeaders` uses the main `cache` Map directly (not `getCached`) because it has its own TTL (HEADER_CACHE_TTL, 60 min) rather than CACHE_TTL (5 min).
DO NOT add: domain-level reads (pipeline.js, strategy-cascade.js), tab-meta (tab-meta.js).

### `pipeline.js` — CRM lead pipeline domain read (~110 lines)
Owns: `getPipelineData`, `getSheetData` (private helper — range fetch against GOOGLE_SHEETS_ID).
Depends on cache + client + parse-rows.
DO NOT add: strategy-cascade logic, CRUD ops, registry reads beyond what client needs.

### `strategy-cascade.js` — strategy hierarchy domain read (~75 lines)
Owns: `getStrategyCascade`.
PRESERVE INLINE CLIENT: this function builds its own GoogleAuth client because it uses
`STRATEGY_SHEETS_ID` (not `GOOGLE_SHEETS_ID`). DO NOT refactor to use `getReadWriteClient` —
behavior is frozen per refactor contract (Decision #79).
Depends on cache + parse-rows + client (for `authOptions`) + ../config.

## Want to add a feature?

| What you're adding | Edit |
|---|---|
| New spreadsheet key / ID | `registry.js` (`SPREADSHEET_KEYS` + `getSpreadsheetId` map) |
| New sheet entry in the registry | `registry.js` (`SHEET_REGISTRY`) |
| New CRUD operation | `crud.js` |
| New domain read (new sheet source) | new `<domain>.js` + import + re-export in `index.js` |
| Bug in 5-min TTL or header 60-min TTL | `cache.js` |
| Bug in client auth (keyFile vs inline JSON) | `client.js` |
| New tab-link feature | `tab-meta.js` |
| Dynamic sheetName logic | `registry.js` (the `sheetName` function on the entry) + `resolve-sheet-name.js` if resolver changes |
| Bug in row parsing | `parse-rows.js` |

## Dependency graph (acyclic)

```
Leaves (no internal sibling deps):
  cache.js
  parse-rows.js
  resolve-sheet-name.js
  client.js          → ../../config
  registry.js        → ../../config

Mid-layer:
  tab-meta.js        → client, registry, resolve-sheet-name
  crud.js            → cache, client, registry, resolve-sheet-name

Domain composers:
  pipeline.js        → cache, client, parse-rows, ../../config
  strategy-cascade.js → cache, parse-rows, client (authOptions only), ../../config

Entry:
  index.js           → ALL of the above (re-export only — no logic)
```

No file `require('./index')`. Graph is strictly acyclic.

## Constraining decisions

- **#43** — function sheetName: registry entries may set `sheetName` to a `(now: Date) => string`
  function. Always call `resolveSheetName(entry, now)` — never access `entry.sheetName` directly.
- **#64** — `getSheetLink` rationale: deep-link URLs must resolve the gid dynamically by fetching
  spreadsheet metadata, not by relying on the static `gid` field in registry entries (which can
  go stale when Google reassigns tab IDs).
- **#73** — lazy-require for external callers: `daily-sales/fetch.js` and
  `daily-sales/dashboard-builder.js` require `../sheets` lazily inside function bodies (not at
  module top) so test mocks injected into `require.cache` at `server/services/sheets.js` are
  always honoured. Do not add new module-top `require('../sheets')` in any consumer that gets
  mocked by tests.
- **#74** — FILE-MAP.md format (this file's structure and maintenance rules).
- **#75** — file-discipline: size ceilings, split methodology, refactor contract.
- **#79** — split methodology: pure mechanical extraction, public API + behavior frozen during
  split. `strategy-cascade.js` inline client is the canonical example of "preserve don't refactor."

# Daily Sales Dashboard — Data Specification

**Audience:** YDS data team (sheet owners) + tech team. Mixed technical / non-technical.
**Purpose:** Single source of truth for what data the Daily Sales dashboard reads, how it flows through the system, and how every visible number is calculated. Use this when the dashboard says something surprising — to find out whether the answer is in the sheet, in the code, or in this spec.
**Last verified against live API:** 2026-04-30 (FY 26-27, day 30 — `April 2026` tab).
**Code path:** `server/services/daily-sales/` (10 files). Public entry: `require('server/services/daily-sales-service')`. HTTP: `GET /api/daily-sales`.

---

## 1. Source

### 1.1 Workbook

| Field | Value |
|---|---|
| Workbook title | **YDC - sales report** |
| Spreadsheet ID | `1fQ4kWvh4J6s5tsnSFJ5ulvdNxVmtQs5lI6WGLjipA_A` |
| Env var | `DAILY_SALES_SPREADSHEET_ID` |
| Sheets API URL | `https://docs.google.com/spreadsheets/d/1fQ4kWvh4J6s5tsnSFJ5ulvdNxVmtQs5lI6WGLjipA_A/edit` |
| Auth | Google service account (read-only). Backend pulls; nothing is written back. |

### 1.2 Tab structure (3 tabs read on every dashboard request)

The dashboard reads three tabs in parallel and stitches them together. Tab names are resolved at request time from the IST clock.

| Logical role | Registry key | Resolved tab name (today) | Why this name |
|---|---|---|---|
| **Current month** | `SALES_CURRENT_MONTH` | `April 2026` | Rolling monthly tab. Name = `<MonthName> YYYY` in IST. Auto-rotates at IST midnight on the 1st. |
| **FY year-to-date (cumulative)** | `SALES_YTD` | `2027` | Indian FY end-year. FY 26-27 = April 2026 → March 2027 → tab named `2027`. Rotates April 1 IST. |
| **Last FY archive (lookback only)** | `SALES_LAST_FY` | `2026` | Prior FY end-year. Used for `vs last FY same period` deltas and for April's `vs last month` (March lives here). |

Tab-name resolution code: [`server/services/sheets.js:398-436`](../server/services/sheets.js).

### 1.3 Refresh cadence

- **Source:** YDS Admin → Orders. Dan exports daily, evening / night IST, batch.
- **Cadence:** Once per day. **There is no live or hourly sync.**
- **Implication:** at 11am IST, "today" is empty by design; "yesterday" is the freshest complete day. The whole v4/v5 dashboard IA was designed around this (Decision #61).
- **Stale detection:** if `freshness.dataCutoff` lags `yesterday.date` by ≥2 days, the freshness banner switches to amber stale state.
- **Backend cache:** dashboard payloads are cached in memory for 5 min, keyed by `(filterSpec, IST date bucket)`. LRU bounded at 50 entries. Forcing a fresh fetch = restart server or call `clearCache()`.

### 1.4 Admin → Sheet pipeline

- Source of truth for raw rows = **YDS Admin → Orders** export. Anything not in that export will not appear on the dashboard.
- Each export overwrites the current-month tab. The cumulative FY tab (`2027`) is appended to manually as part of Dan's monthly close ritual (Decision #48 — "consolidate as you go").
- The dedup logic below tolerates overlap during the transfer window: if April rows briefly exist in both `April 2026` and `2027`, the month tab wins (freshest data).

---

## 2. Sheet Schema — Columns Read

The parser reads these column headers verbatim from each tab. Header = exact string in row 1 of the sheet. **All other columns are ignored.** Code: [`server/services/daily-sales/parse.js`](../server/services/daily-sales/parse.js).

| Column header | Used as | Normalization | Notes |
|---|---|---|---|
| `Order #` | `orderNumber` | trimmed | **Blank rows pass through unique** (Decision #71) — drafts/manual entries that pre-date order assignment. |
| `Date` | `date` (IST date key) | `DD-MM-YYYY` parsed via explicit `Date.UTC` math | Bad/empty values → `null`; row still parsed but excluded from date-bucketed views. |
| `Time` | `time` | trimmed | Format `HH:MM AM/PM` (12-hour). Used for "latest order" and Today's Orders feed sort. |
| `Customer` | `customer` | trimmed | |
| `Email` | `email` | trimmed | Read but not surfaced on dashboard. |
| `Phone` | `phone` | trimmed | Read but not surfaced. |
| `Order Type` | `orderType` | trimmed; blank → `(unknown)` | **Data-defined, not enum-defined** (Decision #56). Live values: B2C, DS, Manual, Stores. |
| `Sales Channel` | `salesChannel` | trimmed | Live values: Admin, yourdesignstore.in, Dashboard, Etsy, Shopify, etc. Comparison case-insensitive. |
| `Shipping Name/Phone/Address/City/State/Country/Pincode` | `shipping.*` | trimmed | `shipping.state` powers the Top States table. |
| `Billing Name/Phone/Address/City/State/Country/Pincode` | `billing.*` | trimmed | Read but not surfaced. |
| `Total No of Products` | `totalProducts` | `parseInt`, NaN → 0 | |
| `Total Quantity of all the products` | `totalQuantity` | `parseInt`, NaN → 0 | |
| `Total Amount with tax` | `amountWithTax` | strip `₹`, commas, whitespace; `parseFloat` | **The revenue number.** Unparseable → row counted in `_skippedRows`, excluded from revenue but counted in some places. See §6. |
| `Status` | `status` | trimmed (display casing preserved) | Drives the Realized lens, status mix, status filter. See §4 for taxonomy. |
| `Acceptance Status` | `acceptanceStatus` | trimmed | Drives `concerns.pendingAcceptance` and the Acceptance Mix bar. Buckets: accepted / rejected / awaiting (= "pending" or "awaiting") / other. |
| `Payment Mode` | `paymentMode` | trimmed | Live values include `(unknown)`/blank, Cash, Cheque, plus gateway names. |
| `Shipping Type` | `shippingType` | trimmed | Read but not surfaced. |
| `Shipping Cost` | `shippingCost` | `parseRevenue`; NaN → 0 | Read but not surfaced. |
| `Tags` | `printMethod` | first comma-split token; blank → `(unknown)` | **First tag only.** "DTG, eco" → `printMethod = 'DTG'`. Powers Print Method mix and filter. Casing collapsed at read side (Decision #70). |

### Derived fields (added during parse)

| Field | Derivation |
|---|---|
| `istDateKey` | `YYYY-MM-DD` in IST, derived from `Date` column. `null` if Date column unparseable. |
| `fyOrdinal` | Days since April 1 of FY start (1-indexed). FY-day 1 = April 1; FY-day 365 = March 31. Used for like-for-like FY deltas. |
| `isRealized` | `true` if `Status` ∈ Realized bucket (case-insensitive). |
| `statusBucket` | `'realized' \| 'in_flight' \| 'cancelled' \| 'draft' \| 'other'`. See §4. |
| `_sourceTab` | Which tab the row came from (`2027`, `April 2026`, `2026`). Used by intra-tab dedup diagnostic. |

---

## 3. Pipeline — One Row, End to End

This is what happens to every row from the moment the dashboard is requested.

```
HTTP GET /api/daily-sales
  ↓
parseFilterSpec(req.query)         ← convert URL params to a FilterSpec
  ↓
buildDashboard({ filterSpec })     ← server/services/daily-sales/dashboard-builder.js
  ↓
fetchAllOrders(istNow)             ← parallel: read 3 tabs from Sheets API
  ↓
parseOrder(rawRow)                 ← row-by-row: normalize, derive istDateKey,
                                      classify into statusBucket
  ↓
deduplicateIntraTab                ← per tab: collapse same Order # → last-write-wins
                                      blanks pass through (Decision #71)
  ↓
deduplicateCrossTab(ytd, month)    ← month tab wins on overlap (freshest data)
                                      blanks pass through
  ↓
applyFilters(orders, spec)         ← filter by date, channel, orderType, paymentMode,
                                      status, state, printMethod, excludeStatuses
  ↓
aggregate(orders) / buildMix /     ← compute today/MTD/YTD totals, deltas, mix,
buildTrend30d / buildTopStates /     trend, concerns, top states, todays orders
buildConcerns / buildTodaysOrders
  ↓
data-quality diagnostics           ← duplicates, acceptance mix, realized ratio
                                      (these are computed UNFILTERED — diagnostic)
  ↓
compose payload object             ← single JSON tree (see §6)
  ↓
setCache(key, payload)             ← in-memory, 5-min TTL, 50-entry LRU
  ↓
res.json(payload)
```

### Worked example — one row through every step

Take a real row from the live sheet:

```
Order #: YD-300426-220507
Date: 30-04-2026
Time: 12:57 PM
Customer: Aryan ...
Order Type: B2C
Sales Channel: yourdesignstore.in
Shipping State: Karnataka
Total Amount with tax: ₹1,499
Status: Order Placed
Acceptance Status: Pending
Payment Mode: Razorpay
Tags: DTG, mug
Source tab: April 2026
```

| Step | Effect on this row |
|---|---|
| 1. `parseDDMMYYYY('30-04-2026')` | Returns `Date(2026-04-30 UTC)`. |
| 2. `toISTDateKey(date)` | Returns `'2026-04-30'`. |
| 3. `parseRevenue('₹1,499')` | Strips `₹` and `,` → `1499`. |
| 4. `statusBucket('Order Placed')` | Returns `'in_flight'`. `isRealized = false`. |
| 5. `fyOrdinal(...)` | April 30 is FY-day 30 (April 1 = day 1). |
| 6. First tag of `Tags` | `'DTG'`. |
| 7. Intra-tab dedup | `orderNumber = 'YD-300426-220507'` is unique within `April 2026` → kept. |
| 8. Cross-tab dedup | If same Order # appeared in `2027`, this `April 2026` copy wins. Otherwise pass-through. |
| 9. `applyFilters` with default spec (`status: 'realized'`) | **Excluded** (status ≠ realized). Row is filtered OUT of `today.orders`, `mtd.*`, `ytd.*`, `trend30d`, `topStates`. |
| 10. `applyFilters` with `status: 'all'` (the `today.allStatuses` aggregator) | Kept. Row contributes 1 order, ₹1,499 to `today.allStatuses.revenue`. |
| 11. `buildMix` (uses **unfiltered** `sourceOrders`) | Contributes to mix.salesChannel `yourdesignstore.in`, mix.orderType `B2C`, mix.printMethod `DTG`, mix.status `Order Placed`. |
| 12. `buildConcerns` | `acceptanceStatus = 'Pending'` → appears in `concerns.pendingAcceptance`. `daysAgo = 0` (today) → not in `stuckOrders`. |
| 13. `buildTodaysOrders` | `istDateKey === todayKey` → appears in Today's Orders feed (sorted by time desc, top 50). |
| 14. `buildTopStates` (filter-applied) | Filtered out by status filter at step 9 → does not contribute to topStates. |

This row visually appears in: **Today (placed)**, **Today's Orders feed**, **Pending Acceptance**, **Sales Channel mix**, **Order Type mix**, **Print Method mix**, **Status mix (Order Placed)**.
This row does **not** appear in: today realized, MTD realized, YTD realized, 30-day trend (default lens), Top States.
On switching to the **All** lens it then also appears in MTD, YTD, trend, and Top States.

---

## 4. Status Taxonomy — The Four Buckets

Code: [`server/services/daily-sales/parse.js:18-68`](../server/services/daily-sales/parse.js). Decision #69.

All comparisons are **case-insensitive**. Source-data display casing is preserved on the dashboard.

| Bucket | Member statuses (lowercased) | Live counts (current FY 26-27 as of 2026-04-30) | What it means |
|---|---|---|---|
| **Realized** | `delivered`, `fulfilled`, `fullfilled` (typo), `partially fulfilled`, `partially fullfilled` | Delivered 699, Fullfilled 284, Partially Fullfilled 6 | Money realized. Counts in financial reports. |
| **In Flight** | `order placed`, `processing` | Order Placed 144, Processing 76 | Placed but not yet shipped/delivered. Will (probably) realize. |
| **Cancelled** | `cancelled`, `rto`, `returned`, `lost` | Cancelled 10, RTO 9 | Will not realize. Excluded from Active lens. |
| **Draft** | `draft order` | Draft Order 2 | Pre-order entries, often pre-date assignment of an Order #. |
| **Other** | anything else | 0 today | Surfaces in dashboard as the raw status. Should be 0 in clean data. |

### "What about X?" edge cases

- **`Fullfilled` (typo)** — accepted as Realized. The source sheet has 284 such rows in current FY. Decision is to fix the column at write side, not at read side, and the read side accepts both spellings until that happens (Decision #51).
- **`Lost`** — placed in Cancelled (current FY data semantics). Appears only in the FY 25-26 archive today, so does not surface in `filters.available.statuses` for the current view.
- **Empty / blank `Status`** — bucketed as `other`. Row is still parsed; isRealized = false. Surfaces in `dataQuality.excludedByStatus` as `(empty)`.
- **`Returned`, `Refunded`** — Returned is in Cancelled bucket. Refunded is currently in `other` (no rows today).

### Lens vs. Status mix

The Status mix breakdown (panel 5 on the page) is **always unfiltered** — it shows the full status spread across all rows in the current FY (excl. last-FY archive). This is intentional: the mix IS the diagnostic; filtering it would hide the cancellation/draft volume that motivates the Realized filter (Decision #51, see also `dashboard-builder.js:171`).

---

## 5. The Lens Model — Realized / Active / All

The lens segment-control above the filter strip is a 1-of-N preset that patches the FilterSpec. Decision #68. UX: [`design-system/daily-sales-v5.md`](../design-system/daily-sales-v5.md) §A.

| Lens | FilterSpec patch | Numbers it produces today (FY 26-27, all-time) | Question it answers |
|---|---|---|---|
| **Realized** *(default)* | `{ status: 'realized', excludeStatuses: [] }` | Orders 989, Revenue ₹21.51L, AOV ₹2,175 | "What money did we actually make?" |
| **Active** | `{ status: 'all', excludeStatuses: ['Cancelled', 'RTO', 'Lost', 'Draft Order'] }` | Realized + In Flight (≈ 1,209 orders, larger revenue) | "What will probably realize?" |
| **All** | `{ status: 'all', excludeStatuses: [] }` | Every row in the FY (~1,230 orders) | "What came through the door?" |

### Lens vs. filter strip

The filter strip below the lens (date range, channel, orderType, paymentMode, status, state, printMethod) **layers on top of** the lens. Examples:

- Lens = Realized + Channel = Etsy → realized Etsy orders only.
- Lens = Active + Order Type = B2C → realized + in-flight B2C orders.
- User clicks an individual status chip in the strip → lens auto-deselects to "Custom".

### Important semantic details

- The Realized filter is a **server-side applier**, not a frontend hide. The numbers in `today.revenue`, `mtd.*`, `ytd.*`, `trend30d`, `topStates`, `concerns` are all already filter-applied when the API responds (see `dashboard-builder.js:121-127`).
- The "all-statuses" companion fields (`today.allStatuses`, `yesterday.allStatuses`) bypass the **status** filter only — every other active filter (channel, orderType, etc.) still applies. That's why "Today (placed): 38" can coexist with "Today (realized): 4" while a Channel filter is on (Decision #59).
- Decisions #58, #59, #60 enforce **apples-to-apples deltas** — both sides of every `vsX` comparison are filtered identically. Don't trust any third-party calculation that mixes filtered and unfiltered aggregates.

---

## 6. What Each Dashboard Card Shows — Literal Formulas

Source code anchor for each: [`dashboard-builder.js:243-352`](../server/services/daily-sales/dashboard-builder.js).

### Top of page — Freshness banner

- **`Data through {date}`** — anchors to `yesterday.date` (= today minus 1 IST), with fallback to `freshness.dataCutoff`. NOT the import timestamp. Decision #62.
- **`Last order at HH:MM`** — `freshness.latestOrder.time`, computed as `MAX(istDateKey + ' ' + time)` lexicographic across all unfiltered orders.
- **Stale state** — banner turns amber when `dataCutoff < yesterday.date − 2 days`.
- **Error state** — banner turns red when both `yesterday.date` AND `dataCutoff` are null (Sheets unreachable).

### Realized badge

- `dataQuality.realized / dataQuality.total · realizedPct%`
- Numerator = count of rows where `isRealized = true` in the **unfiltered** cross-FY-tab union (current FY only).
- Denominator = total row count after dedup (current FY only).
- Expanding the badge shows `dataQuality.excludedByStatus` — count by raw status display value.

### 1. Today strip (3 cards: Orders, Revenue, AOV)

Each card shows two metrics and a delta. "Placed" is the loud number; "realized" is the secondary line.

| Field | Formula |
|---|---|
| `Today (placed) Orders` | `count` of rows where `istDateKey === todayKey` AND all non-status filters match (status filter lifted). |
| `Today (placed) Revenue` | `SUM(amountWithTax)` over the same row set. |
| `Today (placed) AOV` | `revenue / orders` rounded. 0 when orders = 0. |
| `Today (realized) Orders` | Same row set, but additionally requires `isRealized === true`. |
| `Today (realized) Revenue` | `SUM(amountWithTax)` over the realized row set. |
| `Today (realized) AOV` | `revenue / orders` over the realized row set. |
| `vs yesterday` delta | `today.allStatuses.X − yesterday.allStatuses.X` AND `pct = round(delta / previous * 1000) / 10`. Both sides identical filter state. |

`todayKey` is computed in IST (UTC + 5:30) at the moment the request hits.

### 2. Yesterday strip (3 cards)

Identical formula to Today, but `istDateKey === yesterdayKey` (= today minus 1 day, IST). Delta is `vsDayBefore` (yesterday vs day-before-yesterday).

`yesterday.date` is exposed at the top level (`yesterday.date = '2026-04-29'` today) — used by the freshness banner and tooltip.

### 3. Month-to-Date strip (3 cards)

| Field | Formula |
|---|---|
| `MTD Orders` | `count` of rows where `mtdStart ≤ istDateKey ≤ mtdEnd` AND filter matches. `mtdStart = first of current IST month`, `mtdEnd = todayKey`. |
| `MTD Revenue` | `SUM(amountWithTax)` over the same set. |
| `MTD AOV` | `revenue / orders`. |
| `vs last month same-date` | Compares against rows where `lmStart ≤ istDateKey ≤ lmEnd` (= prior month, day 1 to **same day-of-month** as today, capped at last day). Source pool = `[currentFY, lastFYArchive]` — concat without dedup, since the two pools are date-disjoint. Decision #60. |

MTD has **no `allStatuses` companion** — financial report, realized only by design.

### 4. Year-to-Date strip (3 cards) — labeled with FY (e.g. "FY 26-27 Year-to-Date · through Apr 29")

| Field | Formula |
|---|---|
| `YTD Orders` | `count` of all rows in `allOrders` (= current-FY tab + current-month tab, cross-tab deduped) AND filter matches. |
| `YTD Revenue` | `SUM(amountWithTax)`. |
| `YTD AOV` | `revenue / orders`. |
| `vs last FY same period` | Compares against rows in `lastFYOrders` filtered to **FY-ordinal ≤ today's FY-ordinal** (i.e., April 1 → today's FY-day-of-year). Both sides go through `applyFilters` with the active spec (Decision #58). |

`vsLastFY.lastFYDisplayLabel` is the human label used in the delta suffix (e.g. "FY 25-26 same period").

### 5. 30-Day Trend chart

- Source: `applyFilters(allOrders, activeFilter)`.
- Shape: 30 buckets, `today − 29 ... today`, IST-bucketed by `istDateKey`.
- Per bucket: `orders = count`, `revenue = SUM(amountWithTax)`, `aov = revenue / orders`.
- Emitted in **two formats** simultaneously — wide (`trend30d`, used by the current SVG) and long (`trend30dLong`, three records per date for future Plot/ECharts swap, Decision #53).

### 6. Mix Breakdowns (5 cards)

Each card shows `(name, orders, revenue, pctRevenue)` rows sorted by revenue desc.

- **All five mix breakdowns use UNFILTERED `sourceOrders`** (current month if available, else YTD). They are diagnostic — they show the spread regardless of the lens (Decision #51).
- `pctRevenue` is per-card (sums to 100%), based on that card's total revenue.
- `(unknown)` is filtered out of filter-strip chips but appears in mix rows.
- Card 5 (`Status`) is the diagnostic that motivates the Realized lens — keep it visible.

### 7. Top States (table, top 10)

- Source: `applyFilters(sourceOrders, activeFilter)` — filter-applied.
- Group by `shipping.state` (literal sheet value, no canonicalization beyond trim).
- Sort: revenue desc, then orders desc, then state name asc.
- Shows top 10 only.

### 8. Today's Orders feed

- Source: `sourceOrders.filter(o => o.istDateKey === todayKey)` — **NOT filter-applied** (intentional: surfaces all orders that came in today regardless of lens).
- Sort: time desc (12-hour `HH:MM AM/PM` parsed into minutes; bad/empty time sorts last).
- Capped at 50 rows.
- Each row shows: order#, customer, amount, status, channel, first tag, time.

### 9. Concerns (Pending Acceptance + Stuck Orders)

- Source: `allOrders` (current FY only; **NOT filter-applied** — diagnostic).
- **Pending Acceptance** = `acceptanceStatus.toLowerCase() ∈ {'pending', 'awaiting', 'rejected'}`.
- **Stuck Orders** = `daysAgo > 5` AND `status NOT IN {Delivered, Cancelled, Returned, Refunded}`. (Note: `RTO` is currently NOT in the terminal set; consider adding.)

### 10. Data Quality section

- **Acceptance Mix bar** — `dataQuality.acceptanceMix.{accepted, rejected, awaiting, other, total}` over `allOrders` (current FY).
- **Duplicate Order #s** — `dataQuality.duplicates`: same `(orderNumber, sourceTab)` appearing twice within the SAME tab. Cross-tab "duplicates" are expected and silently deduped earlier.

---

## 7. Known Data-Quality Findings

These are the rough edges discovered while building the dashboard. Each is annotated with the decision row that addresses it and whether the fix lives in code or in the sheet.

| Finding | Where it surfaces | Resolution | Decision |
|---|---|---|---|
| **Blank-Order# rows** were colliding on key `''` and being silently dropped (3 of 4 Drafts in current FY were lost). | `dataQuality.total` was 1198, should be 1201; `mix.status` "Draft Order" was 1, should be 4. | Fixed in code: blanks bypass dedup map (`fetch.js:78-86`). | #71 |
| **`Fullfilled` typo** in Status column (260+ rows). | Appears in `mix.status` as `Fullfilled` next to `Delivered`. Counts as Realized. | Code accepts both spellings (Realized Set has both). Sheet not mutated. | #51 |
| **`Partially Fullfilled` typo** also accepted. | Same as above. | Realized Set has both. | #51 |
| **Casing variants in `Tags` and `Status`** (e.g. `DTG`/`dtg`/`Dtg`). | Would otherwise show as 3 separate filter chips. | Map keys lowercased; first-seen casing kept for display (`available-filters.js`, `aggregations.js:buildMixByFn`). | #70 |
| **Order-Type code wrongly whitelisted** to B2C/B2B only (live sheet has DS, Manual, Stores). | 647 orders worth ₹36.87L were mislabelled `(unknown)`. | Code rewritten to pass through any non-empty trimmed value. Was a code bug, not a data bug. | #56 |
| **`Lost` / `Cash` / `Cheque` and 130+ Shipping State variants** live only in the FY 25-26 archive. | Don't appear in `filters.available.statuses` etc. for the current view. | Intentional — `filters.available` is scoped to current FY + current month. The `2026` archive is read for `vsLastFY` aggregations only. | #57 |
| **`Tags` column has 200+ free-text variants.** | Print Method mix has long tail. | Read-side normalizer collapses casing; sheet hygiene needed for further cleanup. | (deferred — see Open Questions) |
| **`COMMMERCE` typo** in Sales Channel (3 m's). | Appears in mix as separate channel. | Read-side does NOT correct this — would mask source-data hygiene. Sheet edit needed. | (open — see Open Questions) |
| **Cross-tab Order# overlap** during month-end transfer. | Same Order# in both `April 2026` and `2027`. | Intra-tab dedup → cross-tab dedup with month-tab winning. Tested. | #44, #71 |
| **`RTO` not in `TERMINAL_STATUSES`** for Stuck Orders. | RTO orders >5 days old surface as "stuck". | Behavior debatable; flagged. See [`aggregations.js:163`](../server/services/daily-sales/aggregations.js). | (open) |
| **Date column locale-sensitive parsers banned.** | Code uses explicit `Date.UTC` math, never `Date.parse(string)` or `new Date(string)`. | Code-level constraint. | #45 |

---

## 8. Open Questions for the Team

These are unresolved or under-defined. **Each is phrased as a question, not an assertion** — the owner of the answer is the data team unless noted.

### Order Type definitions

1. What is the canonical definition of each value in `Order Type`? Today's live values are **B2C, DS, Manual, Stores** — but only an internal convention defines them. We need a one-line definition per value, ideally in a `README` tab in the workbook.
2. Should there be a **B2B** category? The original code whitelisted `B2B` but no current row uses it. Is this aspirational, deprecated, or an alias for one of the existing four?
3. Is `Manual` a flag (manually entered), a channel (manual order), or a customer type (custom order)? It dominates revenue (₹30L+ on 107 orders, AOV ~₹28k) — high-value but ambiguous.

### Status bucket edges

4. Should `RTO` (Return to Origin) be treated as **terminal** for the Stuck-Orders calculation? Today an RTO order >5 days old surfaces as "stuck", which double-counts attention.
5. Is `Lost` truly a terminal cancellation, or should some of those be follow-ups? It currently sits in the Cancelled bucket but only appears in the FY 25-26 archive.
6. Should `Returned` and `Refunded` be one bucket or two? `Returned` is in Cancelled today; `Refunded` falls into `other`.
7. Is `Draft Order` a status that should ever realize, or is it a permanent "abandoned" state?

### Channel canonicalization

8. **`COMMMERCE` (3 m's)** — typo in source sheet. Should the dashboard correct it, or should the sheet be fixed? (Recommendation: fix the sheet, keep code data-defined.)
9. `Admin` vs `Dashboard` vs `yourdesignstore.in` — these all appear distinctly in `mix.salesChannel`. Are they three real channels, or operational sources for the same channel (e.g., admin-entered vs. customer-entered)?
10. Are `Etsy`, `Shopify`, etc. always present in current-FY data, or seasonal? Filter chips don't surface them when zero rows match.

### Tag normalization

11. **Who owns the Tags column?** Today it has 200+ free-text variants and the dashboard uses only the **first comma-split tag** as `printMethod`. If multi-tag classification matters, we need an explicit ownership and a cleanup plan.
12. Should the dashboard split Tags into separate dimensions (e.g., `printMethod`, `productType`, `season`) instead of using `firstTag`? That requires schema agreement.

### Payment Mode signal

13. What is the canonical list of `Payment Mode` values? Today the dashboard sees `(unknown)`/blank, plus various gateway names. Blank is currently **62%+ of orders** — is this an ingestion gap or expected (e.g., Sheet entry doesn't carry the gateway name)?

### Missing fields (for future phases)

14. **Margin / cost-of-goods?** No COGS column today. Without it, Revenue is gross; we can't show profitability. Question: does the Admin export carry it? If yes, what's the column name?
15. **TAT (turnaround time)?** No `accepted_at` / `shipped_at` / `delivered_at` columns — only `Date` (= placed). Stuck-order detection uses placement date as a proxy. Question: can the export include lifecycle timestamps?
16. **Customer LTV / repeat?** `Email` and `Phone` are read but never aggregated. Question: should the dashboard surface a cohort/LTV view, and if so, are these columns reliable enough as customer keys?
17. **Discount / promo code?** Not in the schema. Important for understanding revenue mix. Question: is this in Admin and just not exported?
18. **Currency?** All revenue is treated as INR. Are there ever non-INR rows? Today, no. Worth confirming.

### Refresh & reliability

19. Can the **batch import** be moved earlier in the day, or split into 2-3 imports? Today it lands evening/night IST, so the dashboard at 9am is showing yesterday-and-earlier. The whole IA reorganized around this (Decision #61), but a faster cycle is still on the table.
20. Should there be a **"last successful import" timestamp** in the sheet itself (e.g., a hidden cell `A1` or a `_meta` tab)? The dashboard currently infers it from the latest `istDateKey` — fragile if the import partially fails.

---

## 9. Quick Reference — Data Lineage by Card

| Dashboard element | Source rows | Filter? | Aggregation |
|---|---|---|---|
| Freshness banner ("Data through X") | All current-FY rows | n/a | MAX `istDateKey` (with `yesterday.date` preferred) |
| Realized badge | All current-FY rows | unfiltered | count `isRealized` / count all |
| Today (placed) | sourceOrders, `istDateKey === today` | non-status filters only | count, sum, avg |
| Today (realized) | sourceOrders, `istDateKey === today` | full filter | count, sum, avg |
| Yesterday | sourceOrders, `istDateKey === yesterday` | full filter (+ `allStatuses` variant) | count, sum, avg |
| MTD | sourceOrders, current month range | full filter | count, sum, avg |
| YTD | allOrders (cross-FY-tab dedup) | full filter | count, sum, avg |
| vsLastFY | lastFYOrders, FY-ordinal ≤ today | full filter | delta |
| 30-day trend | allOrders, last 30 days | full filter | per-day count + sum |
| Mix (5 cards) | sourceOrders | unfiltered | group + sum, top by revenue |
| Top States | sourceOrders | full filter | group + sum, top 10 |
| Today's Orders | sourceOrders, `istDateKey === today` | unfiltered | sort by time desc, top 50 |
| Concerns | allOrders | unfiltered | acceptance ∈ {pending,awaiting,rejected} OR daysAgo>5 |
| Data Quality | allOrders (current FY) | unfiltered | counts |

---

## 10. Files & Code References

| Topic | File |
|---|---|
| Public package contract | [`server/services/daily-sales/FILE-MAP.md`](../server/services/daily-sales/FILE-MAP.md) |
| Row parser, status taxonomy | [`server/services/daily-sales/parse.js`](../server/services/daily-sales/parse.js) |
| FilterSpec + applier | [`server/services/daily-sales/filters.js`](../server/services/daily-sales/filters.js) |
| Aggregation helpers | [`server/services/daily-sales/aggregations.js`](../server/services/daily-sales/aggregations.js) |
| Sheets fetch + dedup | [`server/services/daily-sales/fetch.js`](../server/services/daily-sales/fetch.js) |
| Payload composition | [`server/services/daily-sales/dashboard-builder.js`](../server/services/daily-sales/dashboard-builder.js) |
| Diagnostics | [`server/services/daily-sales/data-quality.js`](../server/services/daily-sales/data-quality.js) |
| FY/IST date math | [`server/services/daily-sales/fy.js`](../server/services/daily-sales/fy.js) |
| Filter dropdown options | [`server/services/daily-sales/available-filters.js`](../server/services/daily-sales/available-filters.js) |
| HTTP route | [`server/routes/daily-sales.js`](../server/routes/daily-sales.js) |
| Sheet tab resolver | [`server/services/sheets.js:398-436`](../server/services/sheets.js) |
| Frontend partial | [`public/partials/daily-sales.html`](../public/partials/daily-sales.html) |
| Latest UX spec (lens + tooltips) | [`design-system/daily-sales-v5.md`](../design-system/daily-sales-v5.md) |
| Active decisions | [`data/sessions/decisions.md`](../data/sessions/decisions.md) rows #42–75 |

---

*This spec is a living document. When the schema, taxonomy, or pipeline changes, update this file in the same PR.*

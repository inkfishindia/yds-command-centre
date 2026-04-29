# Daily Sales — Evolution Path

This document describes the current architecture of the Daily Sales service and the planned evolution through Phase 3.

For broader platform direction see: [target-architecture.md](./target-architecture.md), [database-schema-plan.md](./database-schema-plan.md), [phased-refactor-roadmap.md](./phased-refactor-roadmap.md).

---

## 1. Current state (Phase 1 + 2)

```
Google Sheets (3 tabs)
  SALES_YTD          ← "2027" (FY end-year tab)
  SALES_CURRENT_MONTH ← "April 2026"
  SALES_LAST_FY      ← "2026"
         |
         v
  server/services/sheets.js  (fetchSheet — 5-min cache)
         |
         v
  server/services/daily-sales/
    parse.js         → parseOrder(rawRow) → Order
    fy.js            → IST helpers, fyOrdinal, fyDisplayLabel
    filters.js       → applyFilters(orders, filterSpec)
    aggregations.js  → aggregate, buildMix, buildTrend30d, buildConcerns...
    data-quality.js  → detectIntraTabDuplicates, detectAcceptanceMix, summarizeRealizedRatio
    index.js         → getDashboard(), getFilteredOrders(), clearCache()
         |
         v
  server/routes/daily-sales.js
    GET /api/daily-sales          → dashboard payload
    GET /api/daily-sales/orders   → paginated Order[]
```

**Key invariants at this layer:**
- `parseOrder(rawRow)` is the single row-normalization boundary. All aggregation helpers take `Order[]`.
- `FilterSpec` is the public API surface for all financial queries.
- The `REALIZED_STATUSES` set (delivered / fulfilled / fullfilled / partially fulfilled / partially fullfilled) is the realized-revenue definition. Do not change without coordinating with finance.
- Intra-tab dedup happens before cross-tab merge. Month tab wins on cross-tab overlap.
- `dataQuality` and `filters.available` blocks are always computed from unfiltered orders.
- `trend30dLong` mirrors `trend30d` in long format (date, metric, value) for Observable Plot.

**Current limitations:**
- Sheets is the read path on every non-cached request. If Sheets is slow or rate-limited, the dashboard stalls.
- No persistent order history — the YTD tab rolls over on April 1, so FY-prior data depends on the prior-year tab being kept alive.
- No write-back path — order mutations happen in Shopify/Notion, not here.

---

## 2. Phase 3a: Postgres mirror

**What changes:** Only the data source in `index.js`. `parseOrder`, `filters.js`, and `aggregations.js` stay unchanged.

**Migration plan:**

1. Add a `daily_sales_orders` table to Postgres (see schema below).
2. Write a daily sync job (`scripts/sync-daily-sales.js`) that:
   - Calls `fetchSheet` for all three tabs.
   - Calls `parseOrder()` on each row.
   - Upserts into `daily_sales_orders` on `order_number` conflict.
3. Switch `fetchAllOrders()` in `index.js` to read from Postgres instead of Sheets.
4. Keep Sheets as the write-back source — sync job runs on a schedule (e.g. every 15 minutes via `read-model-scheduler.js`).

**Schema target:**

```sql
CREATE TABLE daily_sales_orders (
  id              SERIAL PRIMARY KEY,
  order_number    TEXT NOT NULL UNIQUE,
  order_date      DATE,                   -- IST date, null if unparseable
  order_time      TEXT,
  ist_date_key    TEXT,                   -- YYYY-MM-DD IST (indexed)
  fy_ordinal      INT,                    -- days since April 1 of FY start
  customer        TEXT,
  email           TEXT,
  phone           TEXT,
  order_type      TEXT,                   -- B2C | B2B | (unknown)
  sales_channel   TEXT,
  shipping_state  TEXT,
  shipping_city   TEXT,
  shipping_country TEXT,
  amount_with_tax NUMERIC(12,2),
  status          TEXT,
  is_realized     BOOLEAN,
  acceptance_status TEXT,
  payment_mode    TEXT,
  shipping_type   TEXT,
  shipping_cost   NUMERIC(10,2),
  print_method    TEXT,                   -- first tag
  source_tab      TEXT,                   -- e.g. "2027", "April 2026"
  raw_payload     JSONB,                  -- full original row
  synced_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_daily_sales_ist_date ON daily_sales_orders(ist_date_key);
CREATE INDEX idx_daily_sales_status   ON daily_sales_orders(status);
CREATE INDEX idx_daily_sales_channel  ON daily_sales_orders(sales_channel);
```

This schema maps 1:1 to the `Order` type in `parse.js`. The `raw_payload` column is for debugging and future field additions without migration.

**No changes needed to:** `parse.js`, `filters.js`, `aggregations.js`, `data-quality.js`, the route, or the frontend. The `index.js` swap is the only change.

---

## 3. Phase 3b: Metabase

Two options:

**Option A — Direct Postgres connection:**
Connect Metabase to the `daily_sales_orders` table. Build dashboards against the normalized columns. This is the recommended path — Metabase can use SQL and its question builder directly on `ist_date_key`, `is_realized`, `sales_channel`, etc.

**Option B — JSON data source:**
Point Metabase at `GET /api/daily-sales/orders?status=all&limit=500` as a JSON data source. Limited to 500 rows per request; only useful for small datasets or spot checks.

**Recommended:** Option A. The Postgres mirror is already the right shape. No additional API work needed.

---

## 4. Phase 3c: Observable Plot / ECharts

The `trend30dLong` field in the dashboard payload is already in the format Observable Plot consumes natively:

```js
[
  { date: '2026-04-01', metric: 'orders',  value: 27  },
  { date: '2026-04-01', metric: 'revenue', value: 185601 },
  ...
]
```

When the frontend chart layer is ready to swap from the current SVG-path renderer to Observable Plot:

1. Switch the chart render function to use `trend30dLong` instead of `trend30d`.
2. `Plot.line(data, { x: 'date', y: 'value', stroke: 'metric' })` — standard faceted line chart.
3. Remove the old SVG path renderer.

The `trend30d` (wide format) remains in the payload for the current frontend bindings. Both formats are derived from the same aggregation — no performance cost.

---

## 5. Invariants — do not break without migrating consumers

| Contract | Where defined | Consumers |
|---|---|---|
| `Order` field names | `server/services/daily-sales/parse.js` | aggregations.js, data-quality.js, index.js, Postgres schema, Metabase |
| `FilterSpec` query params | `server/services/daily-sales/filters.js` | route, frontend filter UI, Metabase JSON source |
| `REALIZED_STATUSES` set | `server/services/daily-sales/parse.js` | dataQuality.realized, financial aggregations |
| `trend30dLong` format | `aggregations.js` `buildTrend30dLong()` | frontend chart layer (when switched to Plot) |
| `/api/daily-sales/orders` response shape | route | any Metabase JSON source, mobile clients |

**Adding a new field to Order:** Add it in `parse.js`, add a column to the Postgres schema, update the sync job. Aggregation helpers and the route don't need to change unless they reference the new field.

**Renaming a field:** Update `parse.js`, `database-schema-plan.md`, the Postgres migration, any Metabase questions that reference it, and the frontend. Use a phased rename (add new name, keep old, then remove old) to avoid breaking in-flight requests.

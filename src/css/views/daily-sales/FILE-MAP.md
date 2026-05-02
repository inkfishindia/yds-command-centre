# daily-sales CSS — File Map

This package owns all styles for the Daily Sales dashboard view.
Read this file BEFORE editing — it maps every prefix family to its owning leaf,
and tells you what NOT to add to each file.

## Public exports

The public surface is `src/css/views/daily-sales.css` (entry shim).
esbuild inlines all @imports at build time into `public/css/views/daily-sales.css`.
External callers (the frontend view loader at `src/js/app.js:149`) use that
built path — never import from the leaves directly.

| File | Owns (prefixes) | Used by panel in `public/partials/daily-sales.html` |
|---|---|---|
| `base.css` | `.daily-sales-view`, `.ds-page-*`, `.ds-refresh-*`, `.ds-freshness-*`, `.ds-content`, `.ds-notice`, `.ds-period-*`, `.ds-hero-strip`, `.ds-section-*`, `.ds-loading`, `.skeleton-*`, `.ds-empty*`, `.ds-error*`, `.ds-footer*`, `.ds-tooltip-*`, `.ds-status-badge`, `.ds-status-{delivered,shipped,processing,cancelled,returned}` | All panels (view shell, header, footer, status badges) |
| `filter-strip.css` | `.ds-filter-*`, `.ds-date-*`, `.ds-filter-label`, `.ds-filter-date-panel`, `.ds-filter-panel-divider`, `.ds-filter-row`, `.ds-filter-state-search` | Filter strip (Panel 0) |
| `lens.css` | `.ds-lens-*`, `.ds-realized-*`, `.ds-stat-*`, `.ds-delta-*`, `.ds-acceptance-badge`, `.ds-acceptance--*`, `.ds-acceptance-bar*`, `.ds-stat-card__*` | Lens strip + stat KPI cards + acceptance widget (Panels 1–2) |
| `mtd-channel.css` | `.ds-mtd-*` (incl. `.ds-mtd-strip`), `.ds-ytd-*` (incl. `.ds-ytd-strip`), `.ds-channel-*` (incl. compound `.ds-channel-pill, .ds-tag-method` rule), `.ds-weekly-*`, `.ds-cg-*` | MTD by channel grid + weekly bar + CG pills (Panel 3) |
| `trends.css` | `.ds-trend-*` | 30-day trend chart (Panel 4) |
| `mix.css` | `.ds-mix-*`, `.ds-mix-row-empty` | Mix breakdown cards (Panel 5) |
| `top-states.css` | `.ds-state-*`, `.ds-geo-*`, `.ds-geo-row--drillable` | Top states geographic table + state search input (Panel 6) |
| `todays-orders.css` | `.ds-orders-*`, `.ds-order-*`, `.ds-drill-*` | Today's orders feed + drill sheet (Panel 7) |
| `concerns.css` | `.ds-concerns*`, `.ds-concern-*` | Concerns block + collapsible sections (Panel 8) |
| `data-quality.css` | `.ds-data-quality*`, `.ds-data-*`, `.ds-duplicate-*`, `.ds-dq-*` | Data quality section (Panel 9) |

## Files

### `base.css` — view shell + layout primitives + status badges + tooltip
Owns: view wrapper, page header, refresh button, freshness banner (all modifiers),
inner scroll area, notice banner, period labels, hero strip (grid layout only),
section labels, loading skeletons, empty/error states, footer, global @media
breakpoints (≥480, ≥768, ≥1200), reduced-motion overrides, tooltip backdrop,
status badges (`.ds-status-badge` + color modifiers used by orders panel).
DO NOT add: any `.ds-filter-*`, `.ds-lens-*`, `.ds-trend-*`, `.ds-mix-*`,
`.ds-geo-*`, `.ds-order-*`, `.ds-concern-*`, `.ds-dq-*`, `.ds-mtd-*`, `.ds-ytd-*`.

### `filter-strip.css` — filter UI components
Owns: sticky filter strip, filter chips, dropdown trigger + panel + items,
reset button, date inputs, filter row variants, state search, utility wrappers.
Includes mobile bottom-sheet @media and reduced-motion overrides for filter elements.
DO NOT add: lens pills, stat cards, any rule not starting with `.ds-filter-*` or `.ds-date-*`.

### `lens.css` — lens strip, stat cards, realized badge, acceptance widget
Owns: realized badge + breakdown, stat card (all variants + dual metric),
delta indicators, lens pills, stat-card info icon, all acceptance variants
(`.ds-acceptance-badge`, `.ds-acceptance--*`, `.ds-acceptance-bar*` chart widget),
desktop/mobile @media for stat values + lens pills.
DO NOT add: filter strip, trend, mix, geo, orders, concerns, dq, tooltip-backdrop
(that's base.css).

### `mtd-channel.css` — MTD/YTD strips + channel grid + weekly bars + CG pills
Owns: `.ds-mtd-*` (incl. strip layout), `.ds-ytd-*` (incl. strip layout),
`.ds-channel-*`, `.ds-weekly-*`, `.ds-cg-*`. Channel-colour modifiers
(d2c/corporate/ds/stores) also live here.
**Compound rule exception**: `.ds-channel-pill, .ds-tag-method { ... }` is one rule
serving two prefix families. Kept here intact (no-rule-edits contract); FILE-MAP
flags `.ds-tag-method` as a tag-family selector that lives here for compound reasons.
DO NOT add: stand-alone `.ds-tag-*` rules (those go to base.css if they exist).

### `trends.css` — 30-day trend chart
Owns: all `.ds-trend-*` selectors (section, header, toggle, chart, SVG elements,
axis, tooltip, legend). Desktop height @media lives here.
DO NOT add: weekly bar chart (mtd-channel.css), any non-trend selector.

### `mix.css` — mix breakdown cards
Owns: `.ds-mix-*`, `.ds-mix-row-empty`, mix drillable row interactions,
@media for tablet 2-col and desktop 5-col grid.
DO NOT add: geo table, orders, concerns, dq.

### `top-states.css` — geographic state table + state search
Owns: `.ds-state-*` (incl. state search input), `.ds-geo-*` (container, table,
cells), `.ds-geo-row--drillable`.
DO NOT add: mix rows, order rows, concerns.

### `todays-orders.css` — orders feed + drill sheet
Owns: orders feed header + list, order row (all variants + acceptance bg),
drill sheet (panel, header, body, skeleton), drill utility classes.
Desktop panel shape and mobile @media also here.
DO NOT add: status badges (base.css), channel/tag pills (mtd-channel.css),
acceptance bar (lens.css), concerns, dq.

### `concerns.css` — concerns block + collapsible tables
Owns: `.ds-concerns*`, `.ds-concern-*` (all variants including collapsible
section headers, tables, action buttons, count pills).
DO NOT add: dq section, acceptance bar, duplicate list (those are data-quality.css).

### `data-quality.css` — data quality section
Owns: `.ds-data-quality*`, `.ds-data-*`, `.ds-duplicate-*`, `.ds-dq-*`.
DO NOT add: per-order acceptance badge OR acceptance bar widget (both live in
lens.css), concerns table (concerns.css).

## Want to add a rule?

| What you're adding | Edit |
|---|---|
| Rule for the sticky header area (freshness, view shell) | `base.css` |
| Rule for filter chips, dropdowns, date inputs | `filter-strip.css` |
| Rule for lens pills or stat card KPIs | `lens.css` |
| Rule for MTD channel cards, weekly bars, channel-group pills | `mtd-channel.css` |
| Rule for the 30-day trend chart | `trends.css` |
| Rule for mix breakdown cards | `mix.css` |
| Rule for the top-states table | `top-states.css` |
| Rule for today's orders feed or drill sheet | `todays-orders.css` |
| Rule for the concerns block or collapsible sections | `concerns.css` |
| Rule for acceptance bar, duplicate list, tag coverage | `data-quality.css` |
| Global @media breakpoint that touches multiple sections | `base.css` (use targeted selectors, not catch-all) |

## Dep graph

The @import order in `daily-sales.css` is the cascade order.
Later imports can override earlier ones. Rules currently follow this order
(matching the original source file's document order):

```
daily-sales.css (shim)
  ↓ @import base.css         (no deps on other leaves)
  ↓ @import filter-strip.css (no deps on other leaves)
  ↓ @import lens.css         (no deps on other leaves)
  ↓ @import mtd-channel.css  (no deps on other leaves)
  ↓ @import trends.css       (no deps on other leaves)
  ↓ @import mix.css          (no deps on other leaves)
  ↓ @import top-states.css   (no deps on other leaves)
  ↓ @import todays-orders.css (no deps on other leaves)
  ↓ @import concerns.css     (no deps on other leaves)
  ↓ @import data-quality.css (no deps on other leaves)
```

No leaf imports another leaf. The graph is strictly acyclic.
Changing @import order in the shim changes cascade specificity — do not reorder
without verifying no unintended overrides result.

## Constraining decisions

- **#72** — Split methodology: mechanical only, public API frozen, tests untouched.
- **#79** — File-size discipline: 600-line hard cap for CSS view files.
- **#80** — Cascade order preserved from original source to avoid unintended specificity changes.
- See also `data/sessions/decisions.md` for active entries referencing `daily-sales`.

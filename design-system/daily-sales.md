# Design Brief: Daily Sales Dashboard

## Context

YDS founder (Dan) needs a 3-second glance at sales health: daily, month-to-date, year-to-date. No digging. Actionable at a glance.

**Route:** `/daily-sales`  
**Data source:** Google Sheets order-grain log (YDC - sales report workbook)  
**Mobile-first:** Dan often opens on phone  
**Theme:** Dark (existing YDS tokens)

---

## Visual Hierarchy

```
┌─────────────────────────────────────────┐
│ Header (Today strip)                     │
├─────────────────────────────────────────┤
│ Month-to-date strip                     │
├─────────────────────────────────────────┤
│ Year-to-date strip                      │
├─────────────────────────────────────────┤
│ 30-day trend chart (line dual-axis)     │
├─────────────────────────────────────────┤
│ Mix breakdowns (5 compact cards)         │
├─────────────────────────────────────────┤
│ Geographic top 10 states                │
├─────────────────────────────────────────┤
│ Today's orders feed                     │
├─────────────────────────────────────────┤
│ Concerns block (action items)           │
├─────────────────────────────────────────┤
│ Data freshness footer                   │
└─────────────────────────────────────────┘
```

---

## Section Specifications

### 1. Today Strip (Hero Stats)

**Layout:** Horizontal strip, 3 cards on desktop / 1 column on mobile (<768px)

**Cards:** Orders count, Revenue (₹), AOV (₹)

**Card structure:**
```
┌──────────────────────┐
│ Orders               │
│ 47                   │ ← value, mono/tabular-nums
│ +12 (34%) ↑ green    │ ← delta: % and absolute
└──────────────────────┘
```

**Classes:**
- `.ds-hero-strip` — container, 3-col grid desktop / 1-col mobile
- `.ds-stat-card` — individual card
- `.ds-stat-label` — "Orders", "Revenue", "AOV" (12px, --text-secondary)
- `.ds-stat-value` — bold number (18px–24px, --text-primary, font-variant: tabular-nums)
- `.ds-stat-delta` — smaller text (13px), with color based on sign
- `.ds-delta-up` — --green for positive
- `.ds-delta-down` — --red for negative
- `.ds-delta-neutral` — --text-secondary for zero
- `.ds-delta-arrow` — arrow symbol (↑/↓/−) inline before number

**Tokens:**
- Background: `--bg-card`
- Border: `--border` (1px solid)
- Text primary: `--text-primary`
- Text secondary: `--text-secondary`
- Success: `--green` for positive deltas
- Danger: `--red` for negative deltas
- Spacing: 16px padding inside, 12px gap between cards
- Border-radius: `--radius` (6px)

**Mobile adjustments (<768px):**
- Single column, full width minus 16px margin
- Same card height and structure

---

### 2. Month-to-Date Strip

**Layout:** Identical to Today strip, 3 cards (Orders, Revenue, AOV)

**Delta comparison:** vs same day of previous month (like-for-like)

**Classes:**
- `.ds-mtd-strip` — container
- Reuse `.ds-stat-card`, `.ds-stat-value`, `.ds-delta-*` classes
- `.ds-period-label` — "Month-to-Date" or "MTD" (12px muted, above the strip)

**Tokens:** Same as Today strip

---

### 3. Year-to-Date Strip

**Layout:** Same 3-card structure

**Data source:** `2026` tab (or current year tab) in YDC - sales report

**Delta comparison:** Growth % vs prior year (if 2025 tab available; else just totals)

**Classes:**
- `.ds-ytd-strip` — container
- Reuse stat card classes
- `.ds-period-label` — "Year-to-Date" or "YTD"

**Tokens:** Same as above

---

### 4. 30-Day Trend Chart

**Chart type:** Dual-axis line chart (revenue left axis, order count right axis)

**X-axis:** Last 30 days (daily buckets)

**Y-axes:**
- Left: Revenue (₹) — green
- Right: Order count — blue (--accent)

**Lines:**
- Revenue: --green, solid, 2px width
- Orders: --accent, solid, 2px width
- Both with 20% fill opacity below

**Interactivity:**
- Hover to show tooltip (date + both metrics)
- No zoom on mobile (touch too small)

**Mobile adjustments:**
- Chart height: 250px on mobile, 300px on desktop
- Font-size on axis labels: 12px

**Library decision:** Use **CSS + SVG sparkline approach** (lightweight, no deps). Build dual-line SVG using data points; render axis labels in plain text. Keep client-side data aggregation minimal — server provides daily buckets already.

**Classes:**
- `.ds-trend-chart` — outer container
- `.ds-trend-svg` — SVG element
- `.ds-trend-axes` — axis labels container
- `.ds-trend-tooltip` — hover tooltip (position: absolute, hidden until hover)

**Tokens:**
- Background: `--bg-card`
- Revenue line: `--green`
- Orders line: `--accent`
- Fill opacity: 0.2
- Axis text: `--text-secondary`

---

### 5. Mix Breakdowns (5 compact cards)

Grid of 5 cards, each showing a breakdown by category:

1. **Sales Channel** (e.g., yourdesignstore.in, Etsy, Shopify, etc.)
2. **Order Type** (B2C / B2B)
3. **Print Method** (DTF, DTG, screen print, etc. — from Tags column)
4. **Payment Mode** (Online / COD)
5. **Status** (Delivered, Shipped, Processing, Cancelled, etc.)

**Card layout:**
```
┌─────────────────────┐
│ Sales Channel       │  ← title (12px, mono, muted)
│                     │
│ yourdesignstore 40% │  ← category + %
│ Etsy             25%│
│ Shopify          20%│
│ (others)         15%│
└─────────────────────┘
```

**Classes:**
- `.ds-mix-grid` — container, grid 5 columns desktop / 2 columns tablet / 1 column mobile
- `.ds-mix-card` — individual card
- `.ds-mix-title` — category title (12px, --text-secondary, uppercase)
- `.ds-mix-row` — category + % line (13px, --text-primary)
- `.ds-mix-percent` — % portion (--text-secondary, tabular-nums, align-right)

**Tokens:**
- Background: `--bg-card`
- Border: `--border`
- Text: `--text-primary` / `--text-secondary`
- Spacing: 12px padding, 12px gap
- Border-radius: `--radius`

**Mobile adjustments:**
- 1 column on mobile, 2 columns on tablet (>480px)
- Card min-height: 120px

---

### 6. Geographic (Top 10 States)

**Layout:** Sortable table or list; 10 states by revenue descending

**Columns:**
- State (name)
- Order Count
- Revenue (₹)

**Classes:**
- `.ds-geo-container` — outer div
- `.ds-geo-table` — table element
- `.ds-geo-row` — table row
- `.ds-geo-state` — state name (13px, --text-primary)
- `.ds-geo-count` — order count (13px, --text-secondary, mono/tabular-nums)
- `.ds-geo-revenue` — revenue amount (13px, --text-primary, mono/tabular-nums, text-align: right)

**Mobile adjustments:**
- Collapse to 2 columns: State | Revenue (omit order count on mobile)
- Font-size: 12px

**Tokens:**
- Background: `--bg-card`
- Border: `--border`
- Text: `--text-primary` / `--text-secondary`

---

### 7. Today's Orders Feed

**Layout:** Scrollable vertical list (max-height 300px, overflow-y auto)

**Cards per order:**
```
┌────────────────────────────────────────┐
│ #OD-12345    Customer    ₹999    10:35 PM
│ Delivered    yourdesignstore.in  DTF
└────────────────────────────────────────┘
```

**Fields per row (in order):**
- Order number (monospace, --text-secondary)
- Customer name (--text-primary, truncate if long)
- Amount (--text-primary, mono/tabular-nums, right-aligned)
- Time (12px, --text-secondary)
- Status badge (inline, colored per status)
- Channel pill (compact, colored per channel)
- Print method tag (compact)

**Status colors:**
- Delivered: `--green`
- Shipped: `--accent`
- Processing: `--amber`
- Cancelled: `--red`

**Classes:**
- `.ds-orders-feed` — container with scroll
- `.ds-order-row` — individual order item
- `.ds-order-number` — monospace, muted
- `.ds-order-customer` — primary text, flex: 1 (grow)
- `.ds-order-amount` — mono, primary, right-aligned
- `.ds-order-time` — secondary text, small
- `.ds-status-badge` — inline colored status
- `.ds-channel-pill` — compact pill
- `.ds-tag-method` — print method tag

**Mobile adjustments:**
- Stack fields vertically instead of horizontal row
- Omit time field on mobile (show only in desktop)
- Font-size: 12px

**Tokens:**
- Background: `--bg-card`
- Border: `--border`
- Text: `--text-primary` / `--text-secondary`
- Status: `--green` / `--amber` / `--red` / `--accent`

---

### 8. Concerns Block

**Purpose:** Orders that need attention — action items for founder

**Show conditions:**
1. Acceptance Status ≠ "Accepted" (e.g., Pending, Rejected)
2. Status not in {Delivered, Cancelled, Returned} AND age > 5 days

**Layout:** Alert box + list of problematic orders

**Header:**
```
⚠️ Concerns (3 items)  [Dismiss]
```

**List items (simplified order rows):**
```
Order #OD-12345 | Customer | ₹999 | Processing (8 days) | Acceptance: Pending
```

**Classes:**
- `.ds-concerns` — outer container
- `.ds-concerns-header` — title + count
- `.ds-concerns-list` — list of concern items
- `.ds-concern-item` — individual concern
- `.ds-concern-icon` — warning icon (SVG, not emoji)
- `.ds-concern-badge` — inline badge (Pending, Rejected, Stuck)

**Colors:**
- Background: `--red-dim` (low opacity alert tint)
- Text: `--text-primary`
- Badge: `--red` for concerns
- Border: `--red` or `--amber` depending on severity

**Tokens:**
- Alert tint: `--red-dim`
- Icon: SVG Heroicons (alert-triangle or exclamation-circle)

---

### 9. Data Freshness Footer

**Layout:** Small text bar at bottom, right-aligned

**Content:**
```
Updated 10:35 AM | Source: YDC - sales report > April 2026
```

(The second tab name is dynamically populated from the current-month sheet)

**Classes:**
- `.ds-footer` — container
- `.ds-footer-timestamp` — "Updated 10:35 AM"
- `.ds-footer-source` — "Source: ..."

**Tokens:**
- Text color: `--text-secondary`
- Font-size: 11px
- Padding: 8px 16px

---

## Component Token Reference

| Component | Token | Value |
|-----------|-------|-------|
| Card background | `--bg-card` | #161616 |
| Card border | `--border` | #222222 |
| Primary text | `--text-primary` | #e5e5e5 |
| Secondary text | `--text-secondary` | #888888 |
| Muted text | `--text-muted` | #777777 |
| Success indicator | `--green` | #22c55e |
| Success background | `--green-dim` | #0a3d1f |
| Danger indicator | `--red` | #ef4444 |
| Danger background | `--red-dim` | #3d0a0a |
| Primary action/line | `--accent` | #3b82f6 |
| Warning indicator | `--amber` | #f59e0b |
| Warning background | `--amber-dim` | #3d2800 |
| Border-radius standard | `--radius` | 6px |
| Padding standard | — | 12px–16px |
| Gap between elements | — | 12px–16px |
| Transition timing | `--transition-normal` | 200ms ease |

---

## Typography Rules

**Font stacks** (already defined in global styles):
- UI: `--font-ui` = Inter, -apple-system, BlinkMacSystemFont, sans-serif
- Mono: `--font-mono` = IBM Plex Mono, SF Mono, Fira Code, monospace

**Scale for Daily Sales:**

| Element | Size | Weight | Line-height | Font-family |
|---------|------|--------|-------------|-------------|
| Stat value (KPI) | 20–24px | 600 | 1.2 | --font-mono |
| Card title | 12px | 500 | 1.4 | --font-ui, uppercase |
| Body/Label | 13–14px | 400 | 1.5 | --font-ui |
| Small/Muted | 11–12px | 400 | 1.4 | --font-ui |
| Numbers/Amount | 13–14px | 500 | 1.4 | --font-mono, tabular-nums |
| Order number/ID | 12px | 500 | 1.4 | --font-mono |

**CSS property for numbers:**
```css
font-variant-numeric: tabular-nums;
```

---

## Spacing & Layout Rules

**8px baseline grid:**

| Use | Value |
|-----|-------|
| Compact (chips, small gaps) | 4px–8px |
| Standard (card padding, section gaps) | 12px–16px |
| Large (between sections) | 24px–32px |

**Container max-widths:**
- Mobile (<768px): full width minus 16px margin (8px each side)
- Tablet (768px–1024px): 90% width, centered
- Desktop (>1024px): 1200px max, centered

**Grid patterns:**
- Hero stats: 3 columns (desktop), 1 column (mobile)
- Mix breakdown: 5 columns (desktop), 2 columns (tablet), 1 column (mobile)
- Geographic table: full width, horizontally scrollable on mobile if needed

---

## States & Error Handling

### Loading state

**Global loading:**
- Display skeleton loaders for each section (cards, charts, table rows)
- Skeleton style: `.skeleton` class with animated gradient pulse (respect prefers-reduced-motion)
- Show 3–5 skeleton cards in place of data while fetching

**Specific section loading:**
- Each section can show a shimmer placeholder

**Classes:**
- `.ds-loading` — container with loading state
- `.skeleton` — individual skeleton element
- `.skeleton-stat-card` — stat card height (60px)
- `.skeleton-chart` — chart container height (300px)
- `.skeleton-row` — table row height (40px)

### Empty state

**No orders today yet:**
```
Orders
No orders recorded yet. Check back later or view historical data.
[Refresh]
```

**Current month tab not found:**
```
Error loading current month sheet. Sheet "April 2026" not found.
Using fallback data or update the sheet name.
```

**Classes:**
- `.ds-empty` — empty state container
- `.ds-empty-icon` — SVG icon (calendar, inbox, etc.)
- `.ds-empty-title` — heading
- `.ds-empty-text` — explanatory text
- `.ds-empty-action` — call-to-action button (e.g., Refresh)

### Error state

If data fetch fails:
```
Unable to load sales data. Please try again.
[Refresh] [View logs]
```

**Classes:**
- `.ds-error` — error container
- `.ds-error-icon` — warning SVG
- `.ds-error-message` — error text
- `.ds-error-actions` — button group

---

## Motion & Accessibility

### Reduced motion

Respect `prefers-reduced-motion: reduce`:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- Skeleton pulse animation: disabled
- Hover transitions: disabled (instant)
- Chart line draws: disabled

### Focus states

All interactive elements (buttons, links, clickable cards):
```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

### Contrast & readability

All text meets WCAG AA (4.5:1 minimum contrast):
- Primary text (#e5e5e5) on dark background (#161616) ✓ 11.8:1
- Secondary text (#888888) on dark background ✓ 5.8:1
- Numbers in mono font for clarity

---

## Mobile-First Implementation

**Default layout (mobile, <480px):**
- Single column for all sections
- Cards: full width
- Stat values: 18px (readable without pinch-zoom)
- Spacing: 12px gaps, 12px padding
- Font-size: 13px body, 12px secondary

**Tablet (480px–768px):**
- Mix breakdown: 2 columns
- Hero stats: may expand to 2 or stay 1 column (test with Dan)
- Spacing: 16px gaps
- Font-size: 14px body

**Desktop (>768px):**
- Hero stats: 3 columns side-by-side
- Mix breakdown: 5 columns
- Geographic table: full-width, no scroll
- Spacing: 16px–24px gaps
- Font-size: 14px body

**Don't break on:**
- Portrait/landscape flip: use `max-width` + `margin: auto`, not fixed widths
- Notches/safe-area: use standard padding, not custom safe-area-inset

---

## Chart Implementation (SVG Approach)

**Why no Chart.js:**
- Adds dependency weight; YDS Command Centre is lightweight
- SVG + vanilla JS sufficient for dual-line trend
- Mobile SVG is touch-friendly without extra config

**Approach:**
1. Server provides last 30 days of daily aggregates: `{date, revenue, orderCount}`
2. Frontend computes SVG path for both lines using data points
3. Draw as two `<path>` elements with different stroke colors
4. Fill below lines with 20% opacity `<polygon>` elements
5. Show simple axis labels (date ticks on bottom, currency/count on left/right)
6. On hover over chart area: show tooltip with both metrics for that day

**SVG structure:**
```html
<div class="ds-trend-chart">
  <svg viewBox="0 0 800 300" preserveAspectRatio="xMidYMid meet">
    <!-- Grid lines (optional, light gray) -->
    <line class="grid-line" x1="0" y1="50" x2="800" y2="50" />
    
    <!-- Revenue area fill (green, 0.2 opacity) -->
    <polygon class="ds-trend-fill ds-trend-fill--revenue" points="..." />
    
    <!-- Orders area fill (blue, 0.2 opacity) -->
    <polygon class="ds-trend-fill ds-trend-fill--orders" points="..." />
    
    <!-- Revenue line (green, solid) -->
    <path class="ds-trend-line ds-trend-line--revenue" d="..." />
    
    <!-- Orders line (blue, solid) -->
    <path class="ds-trend-line ds-trend-line--orders" d="..." />
    
    <!-- Invisible hover target for tooltip -->
    <rect class="ds-trend-hover-target" x="0" y="0" width="800" height="300" />
  </svg>
  
  <!-- Tooltip (hidden by default) -->
  <div class="ds-trend-tooltip" style="display: none;">
    <div class="ds-trend-tooltip-date">2026-04-28</div>
    <div class="ds-trend-tooltip-revenue">Revenue: ₹12,340</div>
    <div class="ds-trend-tooltip-orders">Orders: 15</div>
  </div>
  
  <!-- Axis labels -->
  <div class="ds-trend-x-axis">
    <span>Apr 1</span> ... <span>Apr 30</span>
  </div>
</div>
```

**CSS for SVG:**
```css
.ds-trend-chart {
  position: relative;
  width: 100%;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
}

.ds-trend-svg {
  width: 100%;
  height: 300px;
}

.ds-trend-fill--revenue {
  fill: var(--green);
  fill-opacity: 0.2;
}

.ds-trend-fill--orders {
  fill: var(--accent);
  fill-opacity: 0.2;
}

.ds-trend-line--revenue {
  stroke: var(--green);
  stroke-width: 2;
  fill: none;
}

.ds-trend-line--orders {
  stroke: var(--accent);
  stroke-width: 2;
  fill: none;
}

.ds-trend-hover-target {
  fill: transparent;
  cursor: crosshair;
}

.ds-trend-tooltip {
  position: absolute;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 12px;
  font-size: 12px;
  pointer-events: none;
  z-index: 10;
}

@media (prefers-reduced-motion: reduce) {
  .ds-trend-line, .ds-trend-fill {
    animation: none !important;
  }
}
```

---

## Anti-patterns to Avoid

1. **No emoji icons** — use SVG (Heroicons/Lucide) for warnings, indicators, etc.
2. **No hardcoded colors** — reference CSS variables only
3. **No new fonts** — stick to Inter (UI) and IBM Plex Mono (numbers)
4. **No drop shadows on dark cards** — cards already have border; shadow is redundant
5. **No rounded corners >8px** — keep it to `--radius` (6px)
6. **No blur/glassmorphism** — keep design clean and legible
7. **No percentage widths without max-width** — use grid or flex with max-width container
8. **No animation loops >300ms** — feels sluggish on mobile
9. **No color as only indicator** — always pair with text (e.g., "Pending" badge, not just red dot)
10. **No hover-only interactions** — touch users can't hover; make interactions visible by default or use focus states

---

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `public/partials/daily-sales.html` | HTML partial with all 9 sections + loading/empty/error states |
| `src/js/modules/daily-sales.js` | State variables, methods for data fetch, chart rendering, formatting |
| `src/css/daily-sales.css` | All component styles, grid layouts, responsive rules |
| `server/routes/sales.js` | New backend route POST `/api/sales` to fetch from Google Sheets |
| `server/services/sales-service.js` | Service to query YDC - sales report, aggregate daily/monthly/yearly metrics |

**No changes needed to:**
- `public/index.html` — add nav button referencing `#daily-sales` view
- `src/js/app.js` — add `dailySalesLoading`, `dailySalesData`, `loadDailySales()` to global state

---

## QA Checklist

- [ ] All text meets 4.5:1 contrast (dark mode)
- [ ] All interactive elements have visible focus ring (Tab navigation)
- [ ] Hover states don't cause layout shift
- [ ] Mobile (<480px): no horizontal scroll, all content fits
- [ ] Skeleton loaders appear while fetching
- [ ] Empty state displays if no today orders
- [ ] Error state displays if data fetch fails
- [ ] Deltas show correctly (positive=green↑, negative=red↓)
- [ ] Chart renders on mobile without zoom-in
- [ ] prefers-reduced-motion: skeleton pulse disabled, transitions instant
- [ ] Concerns block highlights orders needing action
- [ ] Geographic table sorts by revenue descending
- [ ] Today's orders feed scrolls if >10 orders
- [ ] Data freshness timestamp updates on refresh
- [ ] All CSS variables used, no hardcoded colors


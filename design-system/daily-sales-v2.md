# Daily Sales Dashboard — Design Spec v2 (Phase 1 + Phase 2 Enhancements)

**Scope:** Layers on v1 (`daily-sales.md`). Only v2 deltas documented here. All unchanged specs (existing token usage, chart rendering, concern block styling) refer to v1. **Status:** Ready for backend-builder (API design) → frontend-builder (UI implementation) handoff.

---

## Summary of Changes

**Phase 1 (Data Quality & Realization):**
1. **Realized badge** — "934 of 1,159 realized · 80.6%" label near YTD strip, collapsible breakdown by excluded status
2. **Data quality section** — Acceptance mix (stacked bar) + duplicate order # detection, below Concerns block
3. **API endpoint for realized filters** — Server filters order grain to Status ∈ {Delivered, Fulfilled, Partially Fulfilled}

**Phase 2 (Interactivity & Drill):**
4. **Filter strip** — Sticky horizontal chip bar (date range, channel, order type, payment mode, status)
5. **Click-to-drill** — Top-state rows + mix cards + today's order rows open slide-in drill sheet
6. **URL hash state** — Filter state persists in `#daily-sales?from=2026-04-01&to=2026-04-29&type=B2B&channel=etsy`
7. **Mobile bottom-sheet drill** — Drill sheets slide up from bottom on mobile, side-in on desktop (>768px)

---

## A. Realized Badge (Phase 1)

**Placement:** Above or next to the FY 26-27 period label (YTD strip), right-aligned on desktop / below label on mobile.

**Visual:**
```
934 of 1,159 realized · 80.6%  [↓ expand]
```
- **Compact form:** Single-line label with arrow icon to toggle breakdown
- **Expanded form:** Card showing breakdown by excluded status
  ```
  Realized: 934 (80.6%) ✓
  Cancelled: 10 (0.9%)
  Draft: 5 (0.4%)
  Pending: 210 (18.1%)
  Rejected: 0 (0%)
  ```

**Classes:**
- `.ds-realized-badge` — compact container, flex row, cursor-pointer
- `.ds-realized-badge__count` — "934 of 1,159 realized · 80.6%"
- `.ds-realized-badge__arrow` — expand/collapse icon, rotates on toggle
- `.ds-realized-badge__breakdown` — expanded card (hidden by default, slide-down animation)
- `.ds-realized-badge__breakdown-row` — status + count + percent line

**Token usage:**
- Text: `--text-secondary` (not alarming, diagnostic tone)
- Background: transparent (no card background)
- Border: none
- Expand card background: `--bg-card`
- Expand card border: 1px `--border`

**Styling:**
```css
.ds-realized-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  user-select: none;
}

.ds-realized-badge__arrow {
  display: inline-block;
  width: 16px;
  height: 16px;
  transition: transform 200ms ease;
}

.ds-realized-badge__arrow.ds-realized-badge--expanded {
  transform: rotate(180deg);
}

.ds-realized-badge__breakdown {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px;
  margin-top: 8px;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-height 200ms ease, opacity 200ms ease;
}

.ds-realized-badge__breakdown.ds-realized-badge--expanded {
  max-height: 200px;
  opacity: 1;
}

.ds-realized-badge__breakdown-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
}

.ds-realized-badge__breakdown-row:last-child {
  border-bottom: none;
}

.ds-realized-badge__breakdown-status {
  color: var(--text-primary);
  font-weight: 500;
}

.ds-realized-badge__breakdown-stats {
  display: flex;
  gap: 12px;
  margin-left: auto;
}

.ds-realized-badge__breakdown-count {
  font-family: var(--font-mono);
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.ds-realized-badge__breakdown-pct {
  font-family: var(--font-mono);
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  min-width: 50px;
  text-align: right;
}

@media (prefers-reduced-motion: reduce) {
  .ds-realized-badge__arrow,
  .ds-realized-badge__breakdown {
    transition: none;
  }
}
```

**State additions:**
```javascript
dsRealizedBadgeOpen: false,  // Toggle breakdown visibility
```

**Data shape (from API):**
```javascript
{
  realized: { count: 934, pct: 80.6 },
  total: 1159,
  breakdown: [
    { status: 'Cancelled', count: 10, pct: 0.9 },
    { status: 'Draft', count: 5, pct: 0.4 },
    { status: 'Pending', count: 210, pct: 18.1 },
    { status: 'Rejected', count: 0, pct: 0 }
  ]
}
```

---

## B. Filter Strip (Phase 2)

**Placement:** Sticky, below page header, above Today strip. Z-index: 9 (stays below header at z-10).

**Layout (desktop):** Horizontal flex row, left-to-right order:
1. **Date range chips** (Today / Yesterday / 7d / 30d / MTD / FY YTD / Custom)
2. **Channel multi-select** (dropdown, sorted by revenue desc, checkboxes)
3. **Order Type** (pills: All / B2C / B2B)
4. **Payment Mode** (pills: All / Online / COD)
5. **Status filter** (dropdown: Realized / All / Custom picker)
6. **Reset button** (visible only when filters active)

**Mobile layout (<640px):** Horizontal scrollable chip bar, same order, sticky.

**Classes:**
- `.ds-filter-strip` — sticky container
- `.ds-filter-group` — logical group (gap 4px between chips/dropdowns)
- `.ds-filter-chip` — individual date/type/mode chip
- `.ds-filter-chip--active` — active state
- `.ds-filter-chip--active-count` — badge showing number selected (for multi-select dropdowns)
- `.ds-filter-dropdown` — custom dropdown container (date picker, channel, status)
- `.ds-filter-dropdown__trigger` — clickable button to open dropdown
- `.ds-filter-dropdown__panel` — popover panel (positioned absolute)
- `.ds-filter-dropdown__close` — close button inside panel
- `.ds-filter-reset` — reset all filters button

**Styling:**
```css
.ds-filter-strip {
  position: sticky;
  top: 0;
  z-index: 9;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}

.ds-filter-strip::-webkit-scrollbar {
  height: 4px;
}

.ds-filter-strip::-webkit-scrollbar-track {
  background: transparent;
}

.ds-filter-strip::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 2px;
}

.ds-filter-group {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.ds-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 16px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 150ms ease;
}

.ds-filter-chip:hover {
  color: var(--text-primary);
  border-color: var(--border-light);
}

.ds-filter-chip:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.ds-filter-chip--active {
  background: var(--blue-a08);
  border-color: var(--accent);
  color: var(--accent);
}

.ds-filter-chip--active-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  margin-left: 2px;
  background: var(--accent);
  color: #fff;
  border-radius: 9px;
  font-size: 10px;
  font-weight: 600;
}

.ds-filter-dropdown {
  position: relative;
}

.ds-filter-dropdown__trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 16px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 150ms ease;
}

.ds-filter-dropdown__trigger:hover {
  color: var(--text-primary);
  border-color: var(--border-light);
}

.ds-filter-dropdown__trigger:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.ds-filter-dropdown__trigger--active {
  background: var(--blue-a08);
  border-color: var(--accent);
  color: var(--accent);
}

.ds-filter-dropdown__trigger-chevron {
  display: inline-block;
  transition: transform 150ms ease;
}

.ds-filter-dropdown__trigger--open .ds-filter-dropdown__trigger-chevron {
  transform: rotate(180deg);
}

.ds-filter-dropdown__panel {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 50;
  min-width: 240px;
  max-height: 320px;
  overflow-y: auto;
  animation: slideDown 150ms ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.ds-filter-dropdown__panel-header {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ds-filter-dropdown__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
}

.ds-filter-dropdown__close:hover {
  color: var(--text-primary);
}

.ds-filter-dropdown__item {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
  transition: background 150ms ease;
}

.ds-filter-dropdown__item:last-child {
  border-bottom: none;
}

.ds-filter-dropdown__item:hover {
  background: var(--bg-hover);
}

.ds-filter-dropdown__item--selected {
  background: var(--blue-a08);
  color: var(--accent);
  font-weight: 500;
}

.ds-filter-dropdown__item input {
  margin-right: 8px;
  cursor: pointer;
}

.ds-filter-reset {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--red);
  border-radius: 16px;
  color: var(--red);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 150ms ease;
}

.ds-filter-reset:hover {
  background: var(--red-dim);
  border-color: var(--red-a15);
}

.ds-filter-reset:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .ds-filter-chip,
  .ds-filter-dropdown__trigger,
  .ds-filter-dropdown__item,
  .ds-filter-reset,
  .ds-filter-dropdown__trigger-chevron {
    transition: none;
  }
  
  .ds-filter-dropdown__panel {
    animation: none;
  }
}

/* ── Mobile: Horizontal scroll, collapse date range if needed ── */
@media (max-width: 640px) {
  .ds-filter-strip {
    padding: 8px 12px;
    gap: 6px;
  }

  .ds-filter-dropdown__panel {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    max-height: 70vh;
    border-radius: var(--radius) var(--radius) 0 0;
    animation: slideUp 200ms ease-out;
  }
  
  @keyframes slideUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
}
```

**State additions:**
```javascript
dsFilterState: {
  dateRange: { from: null, to: null },  // ISO 8601 strings or null for default
  channel: [],                          // Array of channel names
  orderType: null,                      // 'B2C' | 'B2B' | null (all)
  paymentMode: null,                    // 'Online' | 'COD' | null (all)
  status: 'realized',                   // 'realized' | 'all' | custom array
},
dsFilterDropdownOpen: null,             // Which dropdown is open: 'date' | 'channel' | 'status' | null
dsDatePickerState: {
  fromDate: null,
  toDate: null,
},
```

**Methods:**
```javascript
// Apply filter, update URL hash, trigger reload
applyFilter(field, value) {
  this.dsFilterState[field] = value;
  this.updateFilterHash();
  this.loadDailySales();
}

// Reset all filters to default
resetFilters() {
  this.dsFilterState = {
    dateRange: { from: null, to: null },
    channel: [],
    orderType: null,
    paymentMode: null,
    status: 'realized',
  };
  this.updateFilterHash();
  this.loadDailySales();
}

// Parse URL hash into filter state on mount
parseFilterHash() {
  const params = new URLSearchParams(window.location.hash.split('?')[1]);
  this.dsFilterState = {
    dateRange: {
      from: params.get('from') || null,
      to: params.get('to') || null,
    },
    channel: params.getAll('channel'),
    orderType: params.get('type') || null,
    paymentMode: params.get('payment') || null,
    status: params.get('status') || 'realized',
  };
}

// Serialize filter state to URL hash
updateFilterHash() {
  const params = new URLSearchParams();
  if (this.dsFilterState.dateRange.from) params.set('from', this.dsFilterState.dateRange.from);
  if (this.dsFilterState.dateRange.to) params.set('to', this.dsFilterState.dateRange.to);
  this.dsFilterState.channel.forEach(c => params.append('channel', c));
  if (this.dsFilterState.orderType) params.set('type', this.dsFilterState.orderType);
  if (this.dsFilterState.paymentMode) params.set('payment', this.dsFilterState.paymentMode);
  if (this.dsFilterState.status !== 'realized') params.set('status', this.dsFilterState.status);
  
  const newHash = `daily-sales?${params.toString()}`;
  window.location.hash = newHash;
}

// Check if any filter is active
isFilterActive() {
  return !!(
    this.dsFilterState.dateRange.from ||
    this.dsFilterState.dateRange.to ||
    this.dsFilterState.channel.length > 0 ||
    this.dsFilterState.orderType ||
    this.dsFilterState.paymentMode ||
    this.dsFilterState.status !== 'realized'
  );
}
```

---

## C. Click-to-Drill (Phase 2)

**Targets (clickable):**
- Top-state table rows (e.g., "Maharashtra" row → drill into Maharashtra orders)
- Mix breakdown card rows (e.g., "yourdesignstore 40%" → drill into yourdesignstore channel orders)
- Today's orders feed rows (each order card → opens order detail panel, read-only)

**Drill sheet (right-side slide-in on desktop, bottom-up on mobile):**

**Desktop (>768px):**
- Position: `position: fixed`, right side, `width: 60%`, `max-width: 600px`
- Z-index: 40
- Slides in from right (animation: 250ms ease-out)
- Header sticky at top with filter context
- Body scrollable, list of orders matching the filtered slice
- Close: ESC key or click backdrop

**Mobile (<640px):**
- Position: `position: fixed`, bottom-up, `height: 80vh`
- Full width
- Slides up from bottom (animation: 250ms ease-out)
- Same header + scrollable list

**Classes:**
- `.ds-drill-sheet` — outer container
- `.ds-drill-sheet--visible` — shows when open
- `.ds-drill-sheet__backdrop` — click to close
- `.ds-drill-sheet__panel` — main panel
- `.ds-drill-sheet__header` — sticky header with context
- `.ds-drill-sheet__header-title` — filter label (e.g., "Maharashtra · April 2026")
- `.ds-drill-sheet__header-count` — "234 orders"
- `.ds-drill-sheet__header-revenue` — "₹1,23,456 total"
- `.ds-drill-sheet__header-close` — close button (X icon)
- `.ds-drill-sheet__body` — scrollable list container
- `.ds-drill-sheet__order-row` — same structure as today's-orders feed rows

**Styling:**
```css
.ds-drill-sheet {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  display: none;
  background: rgba(0, 0, 0, 0.5);
}

.ds-drill-sheet--visible {
  display: flex;
}

.ds-drill-sheet__backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  cursor: pointer;
  z-index: 0;
}

.ds-drill-sheet__panel {
  position: relative;
  z-index: 1;
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Desktop: right-side slide-in */
@media (min-width: 768px) {
  .ds-drill-sheet__panel {
    position: fixed;
    top: 0;
    right: -600px;
    width: 60%;
    max-width: 600px;
    height: 100vh;
    animation: slideInRight 250ms ease-out forwards;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.3);
    border-radius: 0;
  }
  
  @keyframes slideInRight {
    to {
      right: 0;
    }
  }
}

/* Mobile: bottom-up slide */
@media (max-width: 640px) {
  .ds-drill-sheet__panel {
    position: fixed;
    bottom: -80vh;
    left: 0;
    right: 0;
    height: 80vh;
    animation: slideUpFromBottom 250ms ease-out forwards;
    border-radius: var(--radius) var(--radius) 0 0;
  }
  
  @keyframes slideUpFromBottom {
    to {
      bottom: 0;
    }
  }
}

.ds-drill-sheet__header {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ds-drill-sheet__header-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.ds-drill-sheet__header-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.ds-drill-sheet__header-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 4px;
  transition: all 150ms ease;
}

.ds-drill-sheet__header-close:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.ds-drill-sheet__header-close:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.ds-drill-sheet__body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.ds-drill-sheet__order-row {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 150ms ease;
}

.ds-drill-sheet__order-row:hover {
  background: var(--bg-hover);
}

.ds-drill-sheet__order-row:last-child {
  border-bottom: none;
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .ds-drill-sheet__panel {
    animation: none;
    right: 0;
    bottom: 0;
  }
  
  .ds-drill-sheet__order-row {
    transition: none;
  }
}

/* Empty state in drill */
.ds-drill-sheet__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 24px;
  text-align: center;
  color: var(--text-secondary);
}

.ds-drill-sheet__empty-icon {
  width: 32px;
  height: 32px;
  color: var(--text-secondary);
  opacity: 0.6;
}

.ds-drill-sheet__empty-text {
  font-size: 13px;
}
```

**State additions:**
```javascript
dsDrillSheetOpen: false,
dsDrillSheetData: {
  title: '',          // "Maharashtra · April 2026"
  filterLabel: '',    // Human-readable filter description
  orders: [],         // Filtered order list
  totalCount: 0,
  totalRevenue: 0,
},
dsDrillSheetLoading: false,
```

**Methods:**
```javascript
// Open drill sheet for a specific slice
openDrillSheet(filterKey, filterValue) {
  // filterKey: 'state' | 'channel' | 'orderType' | 'paymentMode' | 'status'
  // filterValue: string or array
  
  this.dsDrillSheetOpen = true;
  this.dsDrillSheetLoading = true;
  
  // Apply temporary filter on top of existing filters
  const drillFilter = {
    ...this.dsFilterState,
    [filterKey]: filterValue,
  };
  
  // Fetch filtered orders (see API section below)
  fetch('/api/daily-sales/drill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(drillFilter),
  })
    .then(r => r.json())
    .then(data => {
      this.dsDrillSheetData = {
        title: this.formatDrillTitle(filterKey, filterValue),
        filterLabel: `${filterValue}`,
        orders: data.orders,
        totalCount: data.count,
        totalRevenue: data.totalRevenue,
      };
    })
    .finally(() => {
      this.dsDrillSheetLoading = false;
    });
}

// Close drill sheet
closeDrillSheet() {
  this.dsDrillSheetOpen = false;
}

// Format drill sheet title (e.g., "Maharashtra · April 2026")
formatDrillTitle(filterKey, filterValue) {
  const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  switch (filterKey) {
    case 'state': return `${filterValue} · ${month}`;
    case 'channel': return `${filterValue} · ${month}`;
    case 'orderType': return `${filterValue} Orders · ${month}`;
    case 'paymentMode': return `${filterValue} Payments · ${month}`;
    case 'status': return `${filterValue} Orders · ${month}`;
    default: return `Drill · ${month}`;
  }
}

// Close on ESC key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && this.dsDrillSheetOpen) {
    this.closeDrillSheet();
  }
});
```

---

## D. Data Quality Section (Phase 1)

**Placement:** New section below Concerns block, above Data Freshness Footer.

**Subsections:**

### D.1 Acceptance Mix (Stacked Bar)

**Visual:**
```
┌────────────────────────────────┐
│ Acceptance Mix                 │
│ [████████] [█] [██]            │
│  Accepted Rejected Awaiting    │
│  450 (85%) 45 (8%) 30 (7%)     │
└────────────────────────────────┘
```

- Horizontal stacked bar (100% width)
- Three segments: Accepted (green), Rejected (red), Awaiting (amber)
- On hover over each segment, show count + percent in a tooltip
- Small chart card, no border shadow (just border)

**Classes:**
- `.ds-data-quality` — container
- `.ds-data-quality-title` — "Data quality" with ⓘ icon
- `.ds-acceptance-bar` — stacked bar container
- `.ds-acceptance-bar__segment` — individual segment (flex-basis set to percent)
- `.ds-acceptance-bar__segment--accepted` — green
- `.ds-acceptance-bar__segment--rejected` — red
- `.ds-acceptance-bar__segment--awaiting` — amber
- `.ds-acceptance-bar__tooltip` — hover tooltip

**Styling:**
```css
.ds-data-quality {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 16px;
}

.ds-data-quality-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.ds-data-quality-title svg {
  width: 14px;
  height: 14px;
  opacity: 0.6;
  cursor: help;
}

.ds-acceptance-bar {
  display: flex;
  height: 24px;
  background: var(--border);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.ds-acceptance-bar__segment {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 150ms ease;
}

.ds-acceptance-bar__segment:hover {
  opacity: 0.9;
  filter: brightness(1.1);
}

.ds-acceptance-bar__segment--accepted {
  background: var(--green);
}

.ds-acceptance-bar__segment--rejected {
  background: var(--red);
}

.ds-acceptance-bar__segment--awaiting {
  background: var(--amber);
}

.ds-acceptance-bar__segment-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 11px;
  color: var(--text-primary);
  white-space: nowrap;
  pointer-events: none;
  z-index: 20;
  opacity: 0;
  transition: opacity 150ms ease;
  margin-bottom: 8px;
}

.ds-acceptance-bar__segment:hover .ds-acceptance-bar__segment-tooltip {
  opacity: 1;
}

.ds-acceptance-bar-labels {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--text-primary);
}

.ds-acceptance-bar-label {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
}

.ds-acceptance-bar-label-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}

.ds-acceptance-bar-label-dot--accepted { background: var(--green); }
.ds-acceptance-bar-label-dot--rejected { background: var(--red); }
.ds-acceptance-bar-label-dot--awaiting { background: var(--amber); }

.ds-acceptance-bar-label-text {
  display: flex;
  align-items: baseline;
  gap: 2px;
  font-variant-numeric: tabular-nums;
}

.ds-acceptance-bar-label-count {
  font-weight: 500;
}

.ds-acceptance-bar-label-pct {
  font-size: 11px;
  color: var(--text-secondary);
}
```

### D.2 Duplicate Order #s List

**Visual:**
```
┌────────────────────────────────────────┐
│ Duplicate Order #s (4 found)           │
├────────────────────────────────────────┤
│ OD-12345 | Customer A | ₹999           │
│          [Open in Sheet] ↗️             │
├────────────────────────────────────────┤
│ OD-12346 | Customer B | ₹1,234         │
│          [Open in Sheet] ↗️             │
└────────────────────────────────────────┘
```

- Only shown if count > 0
- Compact list, each order has: Order #, Customer, Amount, link to open in sheet
- Link opens the order in the source Google Sheet (deep-link to row if possible)
- Row styling matches today's-orders feed for consistency

**Classes:**
- `.ds-duplicate-list` — container
- `.ds-duplicate-list-title` — title with count badge
- `.ds-duplicate-list-item` — order row
- `.ds-duplicate-list-number` — order # (mono)
- `.ds-duplicate-list-customer` — customer name
- `.ds-duplicate-list-amount` — amount (mono, right-aligned)
- `.ds-duplicate-list-link` — "Open in Sheet" button/link

**Styling:**
```css
.ds-duplicate-list {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.ds-duplicate-list-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.ds-duplicate-list-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  background: var(--red);
  color: #fff;
  border-radius: 9px;
  font-size: 10px;
  font-weight: 600;
}

.ds-duplicate-list-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  font-size: 12px;
}

.ds-duplicate-list-item:last-child {
  border-bottom: none;
}

.ds-duplicate-list-number {
  font-family: var(--font-mono);
  color: var(--text-secondary);
  font-size: 11px;
  white-space: nowrap;
}

.ds-duplicate-list-customer {
  color: var(--text-primary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ds-duplicate-list-amount {
  font-family: var(--font-mono);
  color: var(--text-primary);
  font-weight: 500;
  text-align: right;
  white-space: nowrap;
}

.ds-duplicate-list-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 3px;
  color: var(--text-secondary);
  font-size: 10px;
  cursor: pointer;
  text-decoration: none;
  transition: all 150ms ease;
  white-space: nowrap;
  margin-left: auto;
}

.ds-duplicate-list-link:hover {
  background: var(--bg-hover);
  color: var(--accent);
  border-color: var(--accent);
}

.ds-duplicate-list-link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.ds-duplicate-list-link svg {
  width: 10px;
  height: 10px;
}
```

**Data shape (from API):**
```javascript
{
  acceptanceMix: {
    accepted: { count: 450, pct: 85 },
    rejected: { count: 45, pct: 8 },
    awaiting: { count: 30, pct: 7 },
  },
  duplicateOrders: [
    {
      orderNumber: 'OD-12345',
      customer: 'Customer A',
      amount: 999,
      sheetUrl: 'https://docs.google.com/spreadsheets/.../edit#gid=0&range=A5:Z5',
    },
    // ...
  ]
}
```

---

## E. API Contracts (Backend Handoff)

### E.1 GET /api/daily-sales (Updated)

**Query params:**
```
?from=2026-04-01&to=2026-04-29&channel=etsy&channel=shopify&type=B2B&payment=Online&status=delivered
```

**Response additions (Phase 1):**
```javascript
{
  // ... existing fields ...
  realized: {
    count: 934,
    total: 1159,
    pct: 80.6,
    breakdown: [
      { status: 'Cancelled', count: 10, pct: 0.9 },
      { status: 'Draft', count: 5, pct: 0.4 },
      { status: 'Pending', count: 210, pct: 18.1 },
      { status: 'Rejected', count: 0, pct: 0 },
    ]
  },
  dataQuality: {
    acceptanceMix: {
      accepted: { count: 450, pct: 85 },
      rejected: { count: 45, pct: 8 },
      awaiting: { count: 30, pct: 7 },
    },
    duplicateOrders: [
      {
        orderNumber: 'OD-12345',
        customer: 'Customer A',
        amount: 999,
        sheetUrl: '...',
      },
      // ...
    ]
  },
}
```

### E.2 POST /api/daily-sales/drill (New, Phase 2)

**Request:**
```javascript
{
  // Current filter state (same shape as dsFilterState in frontend)
  dateRange: { from: '2026-04-01', to: '2026-04-29' },
  channel: ['etsy', 'shopify'],
  orderType: 'B2B',
  paymentMode: 'Online',
  status: 'realized',
  
  // Drill target: "drill by X = Y"
  drillKey: 'state',      // or 'channel', 'orderType', 'paymentMode', 'status'
  drillValue: 'Maharashtra',  // or array for multi-select
}
```

**Response:**
```javascript
{
  orders: [
    {
      orderNumber: 'OD-12345',
      customer: 'Customer Name',
      amount: 999,
      time: '10:35 AM',
      status: 'Delivered',
      salesChannel: 'etsy',
      tag: 'DTF',
    },
    // ...
  ],
  count: 45,
  totalRevenue: 44955,
  title: 'Maharashtra · April 2026',
  filterLabel: 'Maharashtra',
}
```

---

## F. URL Hash State Management

**Example URLs:**
```
localhost:3000#daily-sales
localhost:3000#daily-sales?from=2026-04-01&to=2026-04-29
localhost:3000#daily-sales?type=B2B&payment=COD
localhost:3000#daily-sales?from=2026-04-01&channel=etsy&channel=shopify&status=all
```

**Hash parsing (on view mount):**
- Extract query string from hash
- Parse into `dsFilterState` object
- Apply filters to data fetch
- Re-render filter chips with active states

**Hash serialization (when filter changes):**
- Serialize `dsFilterState` to URLSearchParams
- Omit default values (null, empty array, 'realized')
- Update window.location.hash
- Do NOT reload page; use Alpine.js reactivity

**Share-friendly:**
- User can copy URL and share; recipient sees same filtered view
- Useful for Dan to bookmark specific slices (e.g., "B2B orders from last week")

---

## G. Interaction Patterns

### Keyboard Support:
- **ESC** — Close drill sheet
- **Tab** — Navigate filter chips and dropdowns (standard keyboard nav)
- **Enter** — Open filter dropdown, select chip, close drill sheet
- **Space** — Toggle checkbox in multi-select dropdown

### Focus Management:
- Filter chips and buttons: 2px accent outline, 2px offset
- Drill sheet close button: same focus style
- On drill sheet open: focus moves to close button (trap focus? optional)
- On drill sheet close: focus returns to the element that opened it

### Debouncing:
- Filter changes: Debounce API call by 500ms (user may click multiple chips in quick succession)
- Show spinner in drill sheet while loading
- Disable filter chips while loading to prevent double-requests

### Loading States:
- Filter strip: Chips remain interactive but disabled during fetch
- Drill sheet: Show skeleton loaders for order rows while fetching
- Stats/badge: Show skeleton for realized count while fetching

---

## H. Mobile Breakpoints

| Breakpoint | Behavior |
|---|---|
| <480px | Filter strip: 1-line horizontal scroll. Drill sheet: 100% width, slides up from bottom, 80vh height. |
| 480–768px | Filter strip: may wrap to 2 lines if space tight. Drill sheet: still bottom-up, 60vh height. |
| >768px | Filter strip: unwraps to single line. Drill sheet: right-side slide-in, 60% width max 600px. |

**Specific changes:**
- Drill sheet position changes from fixed-bottom to fixed-right
- Drill sheet animation changes from slideUp to slideInRight
- Filter dropdown panel changes from bottom-sheet to absolute-positioned popover

---

## I. Component Token Reference

| Component | Token | Value |
|---|---|---|
| Filter chip background | `--bg-card` or transparent | Default transparent, active `--blue-a08` |
| Filter chip border | `--border` or `--accent` | Default `--border`, active `--accent` |
| Drill sheet background | `--bg-primary` | #0a0a0a |
| Drill sheet header | `--bg-secondary` | #141414 |
| Data quality section | `--bg-card` | #161616 |
| Realized badge text | `--text-secondary` | #888888 |
| Acceptance: Accepted | `--green` | #22c55e |
| Acceptance: Rejected | `--red` | #ef4444 |
| Acceptance: Awaiting | `--amber` | #f59e0b |

---

## J. States & Error Handling

### Loading state
- Filter strip: Chips disabled, spinner in Reset button (if active)
- Drill sheet: Skeleton rows with shimmer animation (respect prefers-reduced-motion)
- Stats: Realized badge shows skeleton placeholder

### Empty state (drill sheet)
```
No orders match this filter.
Try adjusting filters or dates.
```

### Error state (filter/drill)
```
Failed to load orders. Try again.
[Retry button]
```

---

## K. Accessibility Checklist

| Item | Implementation |
|---|---|
| **Focus rings** | 2px `--accent` outline, 2px offset on all interactive elements |
| **Keyboard nav** | Tab order matches visual order (filter chips → dropdowns → drill close) |
| **ARIA labels** | Filter dropdowns have aria-label; drill sheet header has aria-label |
| **Color contrast** | All text meets 4.5:1 minimum. Acceptance bar segments check contrast against segment bg. |
| **prefers-reduced-motion** | Disable all animations (slide-in, slide-up, fadeIn). Instant state changes. |
| **Touch targets** | Filter chips ≥44×44px (padding 6px 12px + font size = ~32px height; increase if needed). |
| **Screen reader** | Filter state changes announced via aria-live="polite" on filter-strip region. Drill sheet count announced in header. |

---

## L. Files to Create/Modify (Builders' Handoff)

| File | Purpose | Owner |
|---|---|---|
| `src/js/modules/daily-sales.js` | State + methods for filter, drill, data quality | frontend-builder |
| `public/partials/daily-sales.html` | Template: filter strip, realized badge, drill sheet, data quality section | frontend-builder |
| `src/css/views/daily-sales.css` | Styles for v2 elements (filter, drill, data quality) + responsive | frontend-builder |
| `server/services/daily-sales-service.js` | Aggregate realized, acceptance mix, duplicates; apply filters | backend-builder |
| `server/routes/daily-sales.js` | GET /api/daily-sales (updated) + POST /api/daily-sales/drill (new) | backend-builder |

---

## M. Summary: V1→V2 Deltas

**Phase 1 (Data Quality):**
- Realized badge with collapsible breakdown
- Data quality section: acceptance mix bar + duplicate order detection
- API returns realized count, breakdown, and data quality metrics

**Phase 2 (Interactivity):**
- Sticky filter strip with date, channel, type, payment, status filters
- URL hash state for shareable filtered views
- Click-to-drill on table rows, mix cards, order rows
- Drill sheet: right-side slide-in (desktop), bottom-up (mobile)
- Debouncing on filter changes, skeleton loaders on fetch

All existing layout, token usage, and styling patterns from v1 remain unchanged. v2 adds new surfaces + interactivity + data quality indicators.

---

## Handoff to Builders

**Backend-Builder first:** Design the API shape (realized filters, drill endpoint, data quality aggregation). Ensure `GET /api/daily-sales` returns the v2 response shape. Implement `POST /api/daily-sales/drill` for slice drill-down.

**Frontend-Builder second:** Read this spec + v1 spec. Build filter strip (state parsing, URL hash management), realized badge, data quality section, drill sheet. Integrate with backend API. Test keyboard nav, mobile bottom-sheet, drill animation.

**No new fonts, no Tailwind utilities, dark theme only, mobile-first CSS.**

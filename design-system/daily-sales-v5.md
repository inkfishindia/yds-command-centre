# Daily Sales Dashboard — Design Spec v5 (Lens Segment Control + Surface Validation)

**Scope:** Build on v4 foundation (freshness banner + yesterday hero) with three new components: lens segment-control for quick context switching, stat-card tooltips for validation transparency, and finalize three pending banner states.

**Status:** Design spec complete. Backend provides all required data. Frontend-builder to implement components and styles. No code changes in this spec—CSS, HTML, and JS are builder responsibility.

---

## Summary of Changes

**Context:** v4 shipped the batch-reality IA. v5 surfaces why the metrics matter by adding lenses (multiple views of the same data) and explainers (validation tooltips on cards). Three cleanup items finalize the error/stale-state banners.

1. **Lens segment-control** — Three named buttons (Realized | Active | All) between freshness banner and filter strip. Clicking a lens re-evaluates the entire view's status/excludeStatuses filter. Syncs to URL hash for deep linking.
2. **Stat-card info tooltip** — Info `i` icon top-right of Yesterday, MTD, YTD cards. Hover/tap reveals: data window, included statuses, excluded statuses, and math explanation.
3. **Banner state cleanup** — Formalize error/unavailable/stale copy + colors. Remove orphaned CSS rule. Finalize interaction model for each state.

---

## A. Lens Segment-Control (New Component)

**Purpose:** Let Dan instantly switch between three curated views of the same data without touching the filter strip below. Lens = preset status filter; visual model = iOS-style segment control.

### A.1 Three Lenses (Immutable)

| Lens | Label | Filter Patch | Semantic Intent | Example Use |
|------|-------|--------------|-----------------|------------|
| Realized | **Realized** | `{ status: 'realized', excludeStatuses: [] }` | Only orders in final state (Delivered, Fulfilled). | "What money did we actually make?" Financial truth. |
| Realized + In Flight | **Active** | `{ status: 'all', excludeStatuses: ['Cancelled', 'RTO', 'Lost', 'Draft Order'] }` | Orders placed + in transit/processing. Excludes cancelled/returned/lost/draft. | "What will realize?" Operational pipeline. |
| All | **All** | `{ status: 'all', excludeStatuses: [] }` | Every order ever created. | "What came through the door?" Gross volume. |

**Custom lens (not visible unless active):** If user manually changes filters below (e.g., clicks individual status chips), the lens auto-deselects and a "Custom" label appears inline (optional, design decision below).

### A.2 Visual Design

**Container:**
```
.ds-lens-strip
  position: sticky
  top: <freshness-banner-bottom> (60px + ~40px banner height = ~100px estimated)
  z-index: 8.5  (between freshness at 8, filter-strip at 9)
  display: flex
  align-items: center
  gap: 12px
  padding: 8px 16px
  background: var(--bg-card)
  border-bottom: 1px solid var(--border)
  flex-shrink: 0
```

**Segment control (pill-row, not dropdown):**
```
┌─ Realized ─ Active ─ All ─┐ (three pills, 1 selected, no dividers)
│ ┌─────────┐ ┌──────┐ ┌──┐ │
│ │ REALIZED│ │Active│ │All│
│ └─────────┘ └──────┘ └──┘
└────────────────────────────┘
```

**Individual pill:**
```
.ds-lens-pill
  display: inline-flex
  align-items: center
  justify-content: center
  padding: 8px 14px
  min-height: 36px
  background: transparent
  border: 1px solid var(--border)
  border-radius: 16px
  color: var(--text-secondary)
  font-family: var(--font-ui)
  font-size: 13px
  font-weight: 500
  cursor: pointer
  transition: all 150ms ease
  user-select: none

.ds-lens-pill:hover
  color: var(--text-primary)
  border-color: var(--border-light)
  background: var(--bg-hover)

.ds-lens-pill:focus-visible
  outline: 2px solid var(--accent)
  outline-offset: 2px

.ds-lens-pill--active
  background: var(--accent-dim)  /* faint blue tint */
  border-color: var(--accent)
  color: var(--accent)
  font-weight: 600

.ds-lens-pill:disabled,
.ds-lens-pill[disabled]
  opacity: 0.5
  cursor: not-allowed
```

### A.3 Mobile & Responsive

**375px–767px (mobile/tablet):**
- Full-width row, three pills stretch evenly or compress
- Option 1: Pills shrink font to 12px, padding to 6px 10px, to fit
- Option 2: Horizontal scroll if needed (add `overflow-x: auto` to `.ds-lens-strip`)
- Recommend Option 1 for simplicity—3 pills fit comfortably at 375px

**768px+ (desktop):**
- Fixed width, left-aligned, no scroll
- Pills at full size

### A.4 Interaction & State

**Click behavior:**
1. User clicks a pill (e.g., "Active")
2. Frontend calls `applyLensFilter('active')` which patches `dailySalesFilters` with the corresponding status/excludeStatuses
3. Filter strip below re-renders to show the new status chips (visual confirmation)
4. All stat cards + tables refresh with new data
5. URL hash updates to `?lens=active` so the view is bookmarkable
6. Selected pill gains `.ds-lens-pill--active` class

**Switching between lenses:**
- Clicking a different lens instantly clears the previous selection
- If user then clicks an individual status chip below (custom filter), the lens auto-deselects and "Custom" appears (optional implementation)

### A.5 ARIA & Keyboard

**Container (implicit):**
```html
<div class="ds-lens-strip" role="radiogroup" aria-label="Data view lenses">
```

**Each pill:**
```html
<button
  class="ds-lens-pill"
  :class="{ 'ds-lens-pill--active': selectedLens === 'realized' }"
  @click="applyLensFilter('realized')"
  role="radio"
  :aria-checked="selectedLens === 'realized'"
  aria-label="Realized orders lens"
>
  Realized
</button>
```

**Keyboard:** Tab through pills. Space/Enter selects. Auto-focus first pill on component mount (optional, design judgment).

### A.6 Label Final Copy

**Recommended final names:**
- "Realized" (v4 default, financial reporting term, clear)
- "Active" (clearer than "Pipeline"; implies "in play" / "will realize")
- "All" (highest-level aggregation; inclusive)

**Alternate if Dan prefers:**
- "Realized" | "Placed + In Flight" | "All" (more explicit, longer)
- "Final" | "In Progress" | "Total" (less domain-specific)

**Use recommendation: Realized | Active | All** (concise, scan-friendly).

### A.7 No helper text / tooltips on pills

Keep the strip compact. If Dan needs context, a brief help text in the page header or a collapsible info panel below the nav. Avoid tooltips on the pills themselves—they'd occlude the filter strip below on hover.

### A.8 URL Hash Persistence

**Format:** `#view=daily-sales&lens=active&filters=...` (or add `&lens` as a new query param in the hash).

**Behavior:**
- On page load, check hash for `lens` param
- Apply the corresponding lens filter to initial state
- Clicking a lens updates the hash
- Browser back/forward respect the lens state

### A.9 When Custom filters are detected

**Optional behavior (defer to builder judgment):**
- If user clicks a status chip below, the lens auto-deselects
- Show inline label: "Custom" next to the segment control (or highlight in the filter strip)
- Clicking a lens again resets to that lens (clears custom)

**Or:** Always show selected lens even if custom filters are active (simpler, may be confusing).

**Recommendation:** Auto-deselect lens + show "Custom" label. More transparent.

---

## B. Stat-Card Info Tooltip (Phase 3 Surface Validation)

**Purpose:** On each of Yesterday, MTD, YTD hero cards, surface: what data window, which statuses are included, which are excluded, how the number is calculated.

### B.1 Trigger Affordance

**Small info icon `i` top-right of card title:**

```css
.ds-stat-card {
  position: relative;
  /* ... existing styles ... */
}

.ds-stat-card__info-icon {
  position: absolute;
  top: 12px
  right: 12px
  width: 18px
  height: 18px
  display: flex
  align-items: center
  justify-content: center
  background: transparent
  border: none
  border-radius: 50%
  color: var(--text-secondary)
  cursor: pointer
  font-size: 12px
  font-weight: 600
  transition: color 150ms ease, background 150ms ease
  padding: 0

.ds-stat-card__info-icon:hover
  color: var(--accent)
  background: var(--accent-dim)

.ds-stat-card__info-icon:focus-visible
  outline: 2px solid var(--accent)
  outline-offset: 2px
```

**Mobile:** Tap to toggle. Desktop: hover to show (no need to toggle, popover disappears on mouse-out).

### B.2 Popover Content & Copy

**Trigger:** Click/tap the `i` icon. Popover appears above the card on desktop, below on mobile.

**Content template:**

```
┌──────────────────────────────────────┐
│ Orders                               │
├──────────────────────────────────────┤
│ Window: Apr 28 → Apr 28 (IST)        │
│                                      │
│ Includes: Delivered, Fulfilled       │
│                                      │
│ Excludes (status): —                 │
│                                      │
│ Other filters: None (or list applied)│
├──────────────────────────────────────┤
│ Math: Sum of "Total Amount with tax" │
│ across 127 matching orders           │
└──────────────────────────────────────┘
```

**Copy details:**

| Field | Data Source | Format | Example |
|-------|-------------|--------|---------|
| Title | Card's title | String | "Orders", "Revenue", "AOV" |
| Window | Yesterday: `yesterday.date` to `yesterday.date`. MTD: `mtd.startDate` to `mtd.endDate`. YTD: `ytd.startDate` to `ytd.endDate` | "Apr 28 → Apr 28" or "Apr 1 → Apr 30" | "Apr 28 → Apr 28 (IST)" |
| Includes | `filters.appliedStatusList` (from backend) | Comma-separated, sorted | "Delivered, Fulfilled" or "All statuses" if `status === 'all'` |
| Excludes (status) | `filters.applied.excludeStatuses` (from backend) | Comma-separated or "—" if empty | "Cancelled, RTO, Lost" or "—" |
| Other filters | Any active channel, orderType, payment method filters | Comma-separated or "None" | "Etsy, Shopify" or "None" |
| Math | Card type (Orders = count, Revenue = sum with tax, AOV = revenue ÷ orders) | Plain text | "Sum of 'Total Amount with tax' across 127 matching orders" |

**Optional:** Add a "Data Sources" footer showing "Last updated: [freshness.fetchedAt]" for transparency.

### B.3 Popover CSS

```css
.ds-stat-card__tooltip {
  position: absolute
  top: -8px  /* sits above card, with small gap */
  right: 0
  background: var(--bg-elevated)
  border: 1px solid var(--border)
  border-radius: var(--radius)
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3)
  padding: 12px 14px
  font-family: var(--font-ui)
  font-size: 12px
  color: var(--text-primary)
  line-height: 1.5
  z-index: 50
  min-width: 280px
  max-width: 360px
  pointer-events: auto
  animation: ds-fadeIn 150ms ease-out

.ds-stat-card__tooltip-row {
  display: flex
  flex-direction: column
  gap: 2px
  padding: 6px 0
  border-bottom: 1px solid var(--border)

.ds-stat-card__tooltip-row:last-child {
  border-bottom: none

.ds-stat-card__tooltip-label {
  font-size: 10px
  font-weight: 600
  text-transform: uppercase
  letter-spacing: 0.06em
  color: var(--text-secondary)

.ds-stat-card__tooltip-value {
  font-size: 12px
  color: var(--text-primary)
  font-family: var(--font-mono)  /* for dates/counts */
  /* or var(--font-ui) for text */

@keyframes ds-fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### B.4 Mobile Bottom-Sheet Variant (Optional)

**Option A (Simple):** Use the same popover, but position it `bottom: auto; top: calc(100% + 8px)` and let it scroll within the card area.

**Option B (Better UX):** On mobile (≤640px), render as a full-width bottom sheet instead of a popover:

```css
@media (max-width: 640px) {
  .ds-stat-card__tooltip {
    position: fixed
    bottom: 0
    left: 0
    right: 0
    top: auto
    width: 100%
    max-width: 100%
    border-radius: var(--radius-lg) var(--radius-lg) 0 0
    padding: 16px 16px 32px
    animation: ds-slideUpFromBottom 200ms ease-out
    max-height: 60vh
    overflow-y: auto
  }

  .ds-stat-card__tooltip::before {
    content: ''
    position: absolute
    top: 8px
    left: 50%
    transform: translateX(-50%)
    width: 32px
    height: 3px
    background: var(--border)
    border-radius: 2px
  }
}
```

**Recommendation:** Use Option B for better mobile UX. Requires Alpine show/hide logic to manage backdrop + dismiss.

### B.5 Dismiss Behavior

**Desktop:**
- Click the `i` icon again: toggle off
- Click outside the popover: close
- ESC key: close

**Mobile (bottom sheet):**
- Click outside (backdrop): close
- Swipe down: close (nice-to-have, not required)
- ESC key: close
- Click the title or a "Close" button: close

### B.6 ARIA & Accessibility

```html
<button
  class="ds-stat-card__info-icon"
  @click="toggleTooltip('revenue')"
  aria-label="Information about Revenue"
  aria-expanded="tooltipOpen === 'revenue'"
  aria-haspopup="dialog"
  aria-controls="tooltip-revenue"
>
  <span aria-hidden="true">ℹ</span>
</button>

<div
  v-if="tooltipOpen === 'revenue'"
  id="tooltip-revenue"
  class="ds-stat-card__tooltip"
  role="dialog"
  aria-modal="true"
  aria-labelledby="tooltip-title-revenue"
>
  <h3 id="tooltip-title-revenue" class="ds-stat-card__tooltip-title">
    Revenue
  </h3>
  <!-- content -->
</div>
```

### B.7 Apply to Three Cards Only

**Card targets:**
- Yesterday (hero card, left position)
- MTD (summary card)
- YTD (summary card)

**Skip:**
- Today pill (if visible in freshness banner)—it's already explained by freshness context
- vs-delta pills—over-engineered, would clutter UI

### B.8 Styling: Which cards get the icon?

The info icon sits in the card title row, repositioning the layout slightly:

```css
.ds-stat-card {
  display: flex
  flex-direction: column
  gap: 4px
  position: relative  /* allows absolute positioning of icon */
}

.ds-stat-card--with-info {
  padding-right: 32px  /* reserve space for icon */
}
```

Or, keep padding standard and let the icon float over the card edge (icon within card bounds, z-index 2).

**Recommendation:** Padding reservation. Cleaner, less Z-fighting.

---

## C. Banner State Cleanup (Three Pending Items)

### C.1 Error / Unavailable State

**When:** `dailySales?.yesterday?.date === null && dailySales?.freshness?.dataCutoff === null`

**Current banner (v4):**
```
Data unavailable — Sheets unreachable
```

**Enhanced copy + color (v5):**
```css
.ds-freshness-banner--error {
  background: var(--red-dim)
  border-bottom-color: var(--red)
}

.ds-freshness-banner--error .ds-freshness-banner__primary {
  color: var(--red)
  font-weight: 600
}

.ds-freshness-banner--error .ds-freshness-banner__secondary {
  color: var(--text-secondary)
}
```

**Copy:**
```
Primary: "Data unavailable — Sheets unreachable"
Secondary: "Attempting to reconnect… [↻ Retry manually]"
```

**Retry button:** Optional refresh button in the banner (same pattern as v4).

### C.2 Stale-Data State

**When:** `dataCutoff < yesterday.date` AND `delta >= 2 days`

**Rule:** 1-day lag is normal (yesterday's data not yet in Sheets). ≥2 days = stale.

**Copy:**
```
Primary: "Data is stale — last import was 3 days ago"
Secondary: "Check Sheets sync status or reimport manually. [↻ Retry]"
```

**Styling:**
```css
.ds-freshness-banner--stale {
  background: var(--amber-dim)
  border-bottom-color: var(--amber)
}

.ds-freshness-banner--stale .ds-freshness-banner__primary {
  color: var(--amber)
  font-weight: 600
}
```

### C.3 Remove `.ds-stat-secondary` CSS Rule

**Current:** `src/css/views/daily-sales.css` line 181 has orphaned `.ds-stat-secondary` and siblings that are never used.

**Action:** Delete these rules:
```
/* Line 181–182 */
/* .ds-stat-secondary removed — referenced nonexistent --text-tertiary token and had no HTML usage */
```

Verify with grep that no HTML templates reference `.ds-stat-secondary*`. If none found, delete from CSS.

---

## D. Class Additions & Removals

| Action | Class | Location | Rationale |
|--------|-------|----------|-----------|
| **Add** | `.ds-lens-strip` | `src/css/views/daily-sales.css` | Container for segment control |
| **Add** | `.ds-lens-pill` | `src/css/views/daily-sales.css` | Individual lens button |
| **Add** | `.ds-lens-pill--active` | `src/css/views/daily-sales.css` | Active lens state |
| **Add** | `.ds-stat-card__info-icon` | `src/css/views/daily-sales.css` | Info button on stat cards |
| **Add** | `.ds-stat-card__tooltip` | `src/css/views/daily-sales.css` | Tooltip popover container |
| **Add** | `.ds-stat-card__tooltip-row` | `src/css/views/daily-sales.css` | Row in tooltip |
| **Add** | `.ds-stat-card__tooltip-label` | `src/css/views/daily-sales.css` | Label in tooltip row |
| **Add** | `.ds-stat-card__tooltip-value` | `src/css/views/daily-sales.css` | Value in tooltip row |
| **Add** | `.ds-freshness-banner--error` | `src/css/views/daily-sales.css` | Error state modifier |
| **Add** | `.ds-freshness-banner--stale` | `src/css/views/daily-sales.css` | Stale data modifier |
| **Modify** | `.ds-freshness-banner` | `src/css/views/daily-sales.css` | Add error/stale conditional styling |
| **Delete** | `.ds-stat-secondary` (if orphaned) | `src/css/views/daily-sales.css` | Unused rule |
| **Delete** | `.ds-stat-secondary--*` (if any) | `src/css/views/daily-sales.css` | Unused variants |

---

## E. Token Usage (No New Tokens Required)

All colors, spacing, and typography reuse existing tokens from `design-system/TOKENS.md`:

| Component | Token | Value |
|-----------|-------|-------|
| Lens pill (default) | `--border` | #222222 |
| Lens pill (hover) | `--text-primary` | #e5e5e5 |
| Lens pill (active) | `--accent` | #3b82f6 |
| Lens pill (active bg) | `--accent-dim` | #1e3a5f |
| Info icon (default) | `--text-secondary` | #888888 |
| Info icon (hover) | `--accent` | #3b82f6 |
| Tooltip bg | `--bg-elevated` | #1a1a1a |
| Tooltip border | `--border` | #222222 |
| Error banner bg | `--red-dim` | #3d0a0a |
| Error banner border | `--red` | #ef4444 |
| Stale banner bg | `--amber-dim` | #3d2800 |
| Stale banner border | `--amber` | #f59e0b |

**No new tokens needed.** Lean on existing palette.

---

## F. Mobile vs Desktop Differences

| Aspect | Mobile (≤640px) | Desktop (≥768px) |
|--------|-----------------|-----------------|
| **Lens strip** | Full-width, 3 pills compressed or wrapping | Fixed-width row, pills at full size |
| **Lens pill height** | 36–44px (touch target) | 36px |
| **Lens pill font** | 12px, padding 6px 10px | 13px, padding 8px 14px |
| **Tooltip (stat card)** | Bottom sheet, full-width, swipeable | Popover above/below card, fixed width |
| **Tooltip max-width** | 100%, minus padding | 360px |
| **Freshness banner** | Single-column, wrapping secondary text | Two-line (primary + secondary inline) |
| **Info icon** | Larger touch target (24px) | 18px |
| **Filter strip position** | Sticky below lens strip | Sticky below lens strip |

---

## G. ARIA & Keyboard Contract

### G.1 Lens Segment Control

- **Container:** `role="radiogroup"`, `aria-label="Data view lenses"`
- **Each pill:** `role="radio"`, `aria-checked="true|false"` (updated on click)
- **Keyboard:** Tab through pills. Space or Enter to select.
- **Focus management:** Focus stays on selected pill after click.

### G.2 Info Tooltip (Stat Cards)

- **Icon button:** `aria-label="Information about [metric name]"`, `aria-expanded="true|false"`, `aria-haspopup="dialog"`, `aria-controls="tooltip-[id]"`
- **Tooltip container:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby="tooltip-title-[id]"`
- **Keyboard:** ESC to dismiss. Tab within tooltip is allowed; after last element, focus should return to icon button (optional focus trap).
- **Screen reader:** Announce "Information about Revenue, dialog" on icon focus.

### G.3 Error / Stale Banners

- **Container:** `role="status"`, `aria-live="polite"` (already in v4)
- **Copy:** Plain text, no complex nesting
- **Keyboard:** No interaction required; read as alert.

---

## H. Handoff Checklist for Frontend-Builder

Frontend-builder reads this spec + v4 spec before writing code. These are the ordered tasks:

1. **Lens segment-control:**
   - [ ] Add `.ds-lens-strip` container CSS (sticky, flexbox, z-index 8.5)
   - [ ] Add `.ds-lens-pill` and `.ds-lens-pill--active` styles
   - [ ] Render 3 pills in HTML (Realized | Active | All) with Alpine `x-for` or hardcoded
   - [ ] Bind click handler: `@click="applyLensFilter('...')"` (method in app.js)
   - [ ] Add `role="radiogroup"` + `role="radio"` ARIA
   - [ ] Sync selected lens to URL hash (implement `?lens=realized|active|all`)
   - [ ] Test on mobile 375px: verify pills fit without wrapping or scroll
   - [ ] Test keyboard: Tab, Space/Enter to select, focus visible

2. **Stat-card info tooltips:**
   - [ ] Add `.ds-stat-card__info-icon` styles (18px button, absolute positioned)
   - [ ] Add `.ds-stat-card__tooltip*` styles (popover container + rows)
   - [ ] Render info icon top-right of Yesterday, MTD, YTD card titles only
   - [ ] Create tooltip template (window, includes, excludes, math explanation)
   - [ ] Bind Alpine toggle: `@click="toggleTooltip('revenue')"` etc.
   - [ ] Desktop: show on hover, hide on mouse-out or icon click
   - [ ] Mobile: show on tap, hide on click icon again or backdrop click
   - [ ] Implement ESC key dismiss (add to view's @keydown.escape listener)
   - [ ] Add `aria-label`, `aria-expanded`, `role="dialog"`, `aria-modal="true"`
   - [ ] Mobile: render bottom sheet variant on ≤640px (fixed position, full-width, slide-up animation)
   - [ ] Test: verify tooltip doesn't overflow screen; readable max-width on mobile

3. **Banner cleanup:**
   - [ ] Remove `.ds-stat-secondary` and siblings from CSS (verify no HTML usage with grep)
   - [ ] Add `.ds-freshness-banner--error` modifier (red tint, error text)
   - [ ] Add `.ds-freshness-banner--stale` modifier (amber tint, stale text)
   - [ ] Update freshness banner template: add conditional x-show for error/stale states
   - [ ] Implement error state: check if `dataCutoff === null && yesterday.date === null`
   - [ ] Implement stale state: check if `dataCutoff < yesterday.date` AND delta ≥ 2 days
   - [ ] Test: trigger mock error via dev console, verify banner color + copy

4. **Integration:**
   - [ ] Ensure lens changes don't conflict with manual filter-chip clicks below
   - [ ] Ensure lens filter persists on page reload (via URL hash)
   - [ ] Ensure data fetches include `filters.appliedStatusList` + `filters.applied.excludeStatuses` for tooltip
   - [ ] Test: click lens → filter strip updates → stat cards re-fetch → tooltip shows new statuses
   - [ ] Verify freshness banner position doesn't occlude stat card info icon (use z-index layering)

5. **Accessibility & Testing:**
   - [ ] Run axe scan: no ARIA errors, proper role hierarchy
   - [ ] Test keyboard navigation: Tab through lens pills → filter chips → stat card info icons
   - [ ] Test screen reader: announces lens selection, tooltip role, error state
   - [ ] Test mobile (iPhone 13): touch targets ≥44px, bottom sheet appears, swipe/dismiss works
   - [ ] Test reduced-motion: tooltip animations disabled, lens transitions instant

6. **Visual Polish:**
   - [ ] Verify all colors match tokens (no hardcoded hex)
   - [ ] Verify transitions smooth (150–200ms, not jittery)
   - [ ] Verify hover/focus states consistent across all interactive elements
   - [ ] Test dark mode (already dark, verify contrast ratios)
   - [ ] Screenshot on mobile, tablet, desktop breakpoints

---

## I. Backend Contract (Already Shipped v4)

No new fields required. v5 assumes backend already provides (from v4):

```javascript
{
  filters: {
    applied: {
      excludeStatuses: string[]  // e.g., ['Cancelled', 'RTO']
    },
    appliedStatusList: string[]  // e.g., ['Delivered', 'Fulfilled']
  },
  yesterday: {
    date: "2026-04-28",
    // ... rest of structure
  },
  mtd: { startDate, endDate, ... },
  ytd: { startDate, endDate, ... },
  freshness: {
    dataCutoff: "2026-04-28" (or null if error),
    fetchedAt: "2026-04-29T11:32:00Z"
  }
}
```

**Frontend-builder:** If these fields are missing or have unexpected shapes, coordinate with backend-builder to add them.

---

## J. Design Rationale

**Why lens segment-control?** Three standard views (Realized for finance, Active for ops, All for volume) let Dan switch context instantly. Segment control is a familiar pattern (iOS, Android, modern web). No dropdown needed—three options fit easily.

**Why stat-card tooltips?** Numbers without context are ambiguous. "₹1.23L" could mean anything. Transparency tooltip explains the window, filters, and math. Builds trust in the dashboard.

**Why error/stale modifiers?** Batch-imported data can lag or fail. Color-coding the banner signals the issue clearly. Stale = amber (caution), error = red (stop).

---

## K. Migration Notes (v4 → v5)

| Component | Carries Forward? | Notes |
|-----------|------------------|-------|
| Freshness banner | Yes | Add error/stale modifiers; no structural change |
| Yesterday/MTD/YTD cards | Yes | Add info icon button; no layout change |
| Filter strip | Yes | No change; lens strip sits above it |
| Realized badge | Yes | No change |
| Drill sheet | Yes | No change |
| Data quality section | Yes | No change |
| Trend chart | Yes | No change |
| All v3/v4 rules | Yes | Preserved; new rules are additive |

**Deletions:**
- `.ds-stat-secondary*` (orphaned, never used)

---

## L. CSS Outline (Additions Only)

**In `src/css/views/daily-sales.css`, add after v4 styles:**

```css
/* ── v5 Lens Segment Control ── */
.ds-lens-strip { /* see A.2 */ }
.ds-lens-pill { /* see A.2 */ }
.ds-lens-pill:hover { /* see A.2 */ }
.ds-lens-pill:focus-visible { /* see A.2 */ }
.ds-lens-pill--active { /* see A.2 */ }
.ds-lens-pill:disabled { /* see A.2 */ }

/* ── v5 Stat-Card Info Tooltip ── */
.ds-stat-card__info-icon { /* see B.3 */ }
.ds-stat-card__info-icon:hover { /* see B.3 */ }
.ds-stat-card__info-icon:focus-visible { /* see B.3 */ }
.ds-stat-card__tooltip { /* see B.3 */ }
.ds-stat-card__tooltip-row { /* see B.3 */ }
.ds-stat-card__tooltip-label { /* see B.3 */ }
.ds-stat-card__tooltip-value { /* see B.3 */ }
@keyframes ds-fadeIn { /* see B.3 */ }

/* ── v5 Banner Modifiers ── */
.ds-freshness-banner--error { /* see C.1 */ }
.ds-freshness-banner--error .ds-freshness-banner__primary { /* see C.1 */ }
.ds-freshness-banner--stale { /* see C.2 */ }
.ds-freshness-banner--stale .ds-freshness-banner__primary { /* see C.2 */ }

/* ── Mobile Adjustments ── */
@media (max-width: 640px) {
  .ds-lens-strip { /* compress pills */ }
  .ds-lens-pill { /* touch target 44px */ }
  .ds-stat-card__info-icon { /* larger touch target */ }
  .ds-stat-card__tooltip { /* bottom sheet variant */ }
}

@media (max-width: 767px) {
  .ds-stat-card__tooltip { /* full-width sheet */ }
}
```

---

## M. Open Questions / Decisions Left to Builder

1. **Lens pill compression (mobile):** Shrink font + padding vs horizontal scroll? **Recommend:** shrink (fewer moving parts).
2. **Custom lens label:** Show "Custom" when user clicks status chips below? **Recommend:** yes, adds clarity.
3. **Info icon style:** Use Unicode `ℹ` or SVG Lucide `info`? **Recommend:** SVG (consistent with app icons).
4. **Tooltip animation:** Fade-in only, or slide-up too? **Recommend:** fade-in (less motion, fast).
5. **Bottom-sheet swipe:** Include swipe-to-dismiss on mobile? **Recommend:** defer if tight on time (click dismiss button is sufficient).
6. **Stale-data threshold:** 2 days or 1 day? **Recommend:** 2 days (1-day lag from Sheets batch is normal).
7. **Retry button UI:** Refresh icon + text, or text only? **Recommend:** match existing refresh button pattern (icon + text).

---

## N. Files to Modify (Frontend-Builder Responsibility)

| File | Changes |
|------|---------|
| `public/partials/daily-sales.html` | Add lens segment-control HTML between freshness banner and filter strip. Add info icon buttons to stat card titles. Add tooltip popover/bottom-sheet template. Update error/stale conditional rendering in freshness banner. |
| `src/css/views/daily-sales.css` | Add all `.ds-lens-*`, `.ds-stat-card__*`, `.ds-freshness-banner--*` rules (see L). Remove `.ds-stat-secondary*` orphans. Add mobile @media rules. |
| `src/js/modules/daily-sales.js` | Add `applyLensFilter()` method. Add `toggleTooltip()` state. Add URL hash persistence for lens. Compute `staleDaysDelta()` for stale-state detection. Populate tooltip data from response. |

**Backend-builder:** Verify that `filters.applied.excludeStatuses` and `filters.appliedStatusList` are returned by `GET /api/daily-sales`. If not, add them (they were added in v4).

---

## O. Summary: V4 → V5 Deltas

| Layer | Change |
|-------|--------|
| **Lenses** | New segment control (3 pills). Instant filter override. URL-persistent. |
| **Validation** | Info tooltips on Yesterday/MTD/YTD cards. Shows window, filters, math. |
| **Error handling** | Finalized error (red) + stale (amber) banner states. Clear copy. |
| **Cleanup** | Remove orphaned `.ds-stat-secondary` rule. Verify no usage. |
| **Tokens** | Zero new tokens. Reuse existing palette. |
| **Accessibility** | Segment = radiogroup. Tooltip = dialog. ARIA complete. |
| **Mobile** | Lens pills compress. Tooltip converts to bottom sheet. Touch targets 44–48px. |
| **Keyboard** | Tab through lenses + icons. Space/Enter to select. ESC to dismiss tooltip. |

All v3/v4 IA (filter strip, drill, data quality, charts) carries forward unchanged.

---

**Status:** Design spec complete. Frontend-builder to implement HTML, CSS, and Alpine.js logic. Backend already provides required data fields. No code written—this is the spec only.

---

**Files written:**
- `design-system/daily-sales-v5.md` (this document)

# Daily Sales Dashboard — Design Spec v3 (Top Section Rebalance)

**Scope:** Deltas-only spec for top stat strip + three period cards (Today/MTD/YTD). Only changes to `daily-sales-v2.md`. All specs in v2 remain authoritative for filters, drill sheet, data quality, mix, trend, concerns. **Status:** Ready for frontend-builder (UI rebalance only, no backend changes).

---

## Summary of Changes

**Context:** Three backend fixes now surface truthful data where cards were previously sparse or broken:

1. **Today card** — Now exposes dual metrics: `realized` (0) and `placed` (12). Layout was designed for single value; secondary treatment (11px muted) is too lightweight.
2. **MTD card** — Now reliable year-round (delta: +27 orders / −25.9% revenue / −28% AOV vs March same date). Was often empty in early months.
3. **YTD card** — Carries the headline: volume growing (+2.8%), revenue shrinking (−17.7%), AOV down (−19.9%). **The divergence is the story.**

**Changes:**
- Rebalance Today card IA: place "placed today" number at higher visual weight
- Introduce subtle visual hierarchy to YTD card (optional emphasis on delta to signal headline importance)
- Desktop layout: introduce optional 3-column grid for stat strips (cleaner on larger screens)
- Edge case: clarify behavior when realized=0 but placed>0 (common early in day)

---

## A. Today Card — Information Architecture

**Problem:** Realized count is often 0 early in the day, but "placed today" (12) is operationally relevant. Current rendering:
```
Orders
0                         ← realized, primary value
12 placed today           ← secondary, 11px muted (too light)
```

**Solution:** Restructure as "placed/realized" dual-metric card with balanced visual weight:

```
Orders
12 placed today
0 realized
─────────────
↓ n vs yesterday (delta)
```

**New Class/Element Structure:**

Add new classes to `.ds-stat-card` context:
```html
<div class="ds-stat-card ds-stat-card--dual">
  <span class="ds-stat-label">Orders</span>
  
  <!-- Placed metric (primary for early-day ops) -->
  <div class="ds-stat-metric-group">
    <span class="ds-stat-metric-value" x-text="dailySales?.today?.allStatuses?.orders ?? '—'"></span>
    <span class="ds-stat-metric-label">placed today</span>
  </div>
  
  <!-- Realized metric (secondary for fulfillment ops) -->
  <div class="ds-stat-metric-group ds-stat-metric-group--secondary">
    <span class="ds-stat-metric-value" x-text="dailySales?.today?.orders ?? '—'"></span>
    <span class="ds-stat-metric-label">realized</span>
  </div>
  
  <!-- Delta (vs yesterday, always on realized realized-vs-yesterday) -->
  <div class="ds-stat-delta" :class="deltaClass(dailySales?.today?.vsYesterday?.orders?.delta)">
    <span class="ds-delta-arrow" x-text="deltaArrow(dailySales?.today?.vsYesterday?.orders?.delta)"></span>
    <span x-text="Math.abs(dailySales?.today?.vsYesterday?.orders?.delta ?? 0)"></span>
    <span>(<span x-text="formatPct(dailySales?.today?.vsYesterday?.orders?.pct)"></span>)</span>
    <span style="color: var(--text-secondary); margin-left: 2px">vs yesterday</span>
  </div>
</div>
```

**New CSS:**
```css
.ds-stat-card--dual {
  gap: 6px;  /* tighter spacing within dual card */
}

.ds-stat-metric-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.ds-stat-metric-value {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.ds-stat-metric-label {
  font-family: var(--font-ui);
  font-size: 11px;
  font-weight: 400;
  line-height: 1.4;
  color: var(--text-secondary);
}

.ds-stat-metric-group--secondary {
  opacity: 0.7;  /* subtle de-emphasis without losing readability */
}

.ds-stat-metric-group--secondary .ds-stat-metric-value {
  font-size: 18px;  /* slightly smaller than primary */
}
```

**Behavior:**
- Always show both placed + realized (no conditional rendering)
- If `placed == realized`, the secondary group still renders (no harm, shows they're equal)
- Delta always compares vs yesterday on the **placed** count (front-of-house metric)
- On revenue and AOV cards, use same structure (placed vs realized pair)

**Design rationale:** Dan sees "12 placed" immediately and knows it's a good sales morning, even if fulfillment is behind.

---

## B. MTD Card — Visual Weight on Divergent Deltas

**Current state:** All three cards (Orders, Revenue, AOV) now have deltas (+27, −25.9%, −28%). The cards are equal visual weight, but the **story is in the divergence** — volume growing, money shrinking.

**Decision:** Keep cards equal-height/equal-weight, but use **delta styling to surface the contradiction** naturally. No extra emphasis card needed; the red and green colors do the work.

**Delta styling (already in v2):**
- Positive deltas: `--green`
- Negative deltas: `--red`
- Neutral (0): `--text-secondary`

**Implementation:** No new CSS. The existing `.ds-delta-up`/`.ds-delta-down` classes in v2 already render in color. MTD card deltas will be:
- Orders: `+27` (green)
- Revenue: `−₹7.24L` (red)
- AOV: `−₹865` (red)

**Frontend task:** When rendering MTD card, ensure `deltaClass()` is applied correctly (existing helper already does this). The red revenue + red AOV against green orders volume creates visual tension **without typographic hierarchy change**. This is the right amount of emphasis.

---

## C. YTD Card — Headline Emphasis (Optional, Designer's Call)

**The story:** +2.8% orders but −17.7% revenue and −19.9% AOV. **Volume up, money down.** This divergence is the headline.

**Design decision — two options:**

### Option C1: Equal weight (current v2 pattern)
Keep all three cards equal. The red deltas on revenue + AOV naturally draw the eye. Simplest to implement.

**Implementation:** No change. Existing styling handles it.

### Option C2: Subtle visual hierarchy (emphasize the headline)
Add a `.ds-ytd-strip--headline` variant that:
- Emphasizes the divergence story in a visual way
- Uses a background tint or slight border highlight
- Does **not** break the 3-col layout

**Recommended approach (C2):** Add subtle background tint to the YTD strip to signal "this is the big picture":

```css
.ds-ytd-strip {
  /* From v2, unchanged */
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  
  /* NEW v3: subtle background for YTD headline emphasis */
  background: var(--bg-primary);
  padding: 12px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  margin-top: 8px;  /* visual separation from MTD */
}

@media (min-width: 768px) {
  .ds-ytd-strip {
    grid-template-columns: repeat(3, 1fr);
    padding: 12px;
  }
}
```

**Rationale:** The subtle card background + border creates a visual frame around the three YTD cards, signaling "these three numbers tell the whole year story." It's not loud (no color tint), just a visual grouping.

**Default recommendation:** Use Option C2. Dan's standing order: "use judgment, don't block on clarifications." The 1px border + padding makes YTD feel like a cohesive unit (year-in-a-glance), which is the right message.

---

## D. Mobile Layout (≤640px) — No Changes

Today/MTD/YTD cards remain:
```css
.ds-hero-strip,
.ds-mtd-strip,
.ds-ytd-strip {
  display: grid;
  grid-template-columns: 1fr;  /* single column on mobile */
  gap: 8px;
}
```

Each card (with dual metrics in Today) still fits in a single column. The "placed today / realized" structure in Today card is narrower than a 3-col grid, so it suits mobile perfectly.

---

## E. Desktop Layout (≥768px) — Optional 3-Column Grid

**Current:** Cards stack even on desktop (inherited from mobile-first default).

**Enhancement:** Introduce 3-column grid on desktop for more efficient space use:

```css
@media (min-width: 768px) {
  .ds-hero-strip,
  .ds-mtd-strip,
  .ds-ytd-strip {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
}
```

Each strip already has exactly 3 cards, so the grid feels natural. Cards are narrower but legible (stat values are 22px, still readable). Reduces vertical scroll.

**Optional refinement:** On very wide screens (>1200px), increase gap to 16px for more breathing room.

```css
@media (min-width: 1200px) {
  .ds-hero-strip,
  .ds-mtd-strip,
  .ds-ytd-strip {
    gap: 16px;
  }
}
```

---

## F. Edge Cases & Defaults

### Today Card: Realized = 0, Placed > 0 (current state)
**Current:** Shows "0 realized / 12 placed"  
**Rendering:** Both metrics render, secondary has opacity: 0.7. No special handling needed.  
**Behavior:** Correct — this is common 8AM–4PM IST.

### MTD Card: Deltas all null (no last-month data — hypothetically)
**Current:** v2 spec shows `x-show="dailySales?.mtd?.vsLastMonthSameDate?.orders != null"` for each delta.  
**Rendering:** Deltas don't show, just the values.  
**Behavior:** Graceful. Keep as-is.

### Extreme deltas (>100%)
**Example:** AOV dropped from ₹2000 to ₹800 (−60%).  
**Rendering:** `−₹1,200` (−60%). The delta text is already sized to flex (12px base, no min-width).  
**Behavior:** No truncation expected; fits in a 3-col card. If longer than 40 chars, it wraps to second line (OK).

### Null stat values (e.g., AOV is null if orders = 0)
**Current:** v2 uses `x-text="formatINR(dailySales?.today?.aov)" ?? '—'`.  
**Rendering:** Shows "—" (dash).  
**Behavior:** Correct.

---

## G. Class Additions Summary

**New classes (added to existing stylesheet):**
```css
.ds-stat-card--dual                  /* Today card wrapper for dual metrics */
.ds-stat-metric-group                /* Placed/Realized metric container */
.ds-stat-metric-value                /* 22px or 18px metric value */
.ds-stat-metric-label                /* 11px metric label ("placed today", "realized") */
.ds-stat-metric-group--secondary     /* opacity: 0.7 de-emphasis */
```

**Existing classes reused (no changes):**
- `.ds-stat-card` — base card styling
- `.ds-stat-label` — "Orders", "Revenue", "AOV" header
- `.ds-stat-delta` — delta container
- `.ds-delta-up`/`.ds-delta-down`/`.ds-delta-neutral` — color classes
- `.ds-delta-arrow` — arrow symbol

**Updated classes (v3 deltas):**
```css
/* YTD strip: add border + padding for headline emphasis */
.ds-ytd-strip {
  background: var(--bg-primary);
  padding: 12px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  margin-top: 8px;
}

/* Desktop: 3-column grid for all stat strips */
@media (min-width: 768px) {
  .ds-hero-strip,
  .ds-mtd-strip,
  .ds-ytd-strip {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
}

@media (min-width: 1200px) {
  .ds-hero-strip,
  .ds-mtd-strip,
  .ds-ytd-strip {
    gap: 16px;
  }
}
```

---

## H. HTML Restructure (Today Card Only)

### Before (v2):
```html
<div class="ds-stat-card">
  <span class="ds-stat-label">Orders</span>
  <span class="ds-stat-value" x-text="dailySales?.today?.orders ?? '—'"></span>
  <span class="ds-stat-secondary" x-show="(dailySales?.today?.allStatuses?.orders ?? 0) > (dailySales?.today?.orders ?? 0)">
    <span x-text="dailySales?.today?.allStatuses?.orders"></span> placed today
  </span>
  <div class="ds-stat-delta" :class="deltaClass(...)">...</div>
</div>
```

### After (v3):
```html
<div class="ds-stat-card ds-stat-card--dual">
  <span class="ds-stat-label">Orders</span>
  
  <!-- Placed (primary) -->
  <div class="ds-stat-metric-group">
    <span class="ds-stat-metric-value" x-text="dailySales?.today?.allStatuses?.orders ?? '—'"></span>
    <span class="ds-stat-metric-label">placed today</span>
  </div>
  
  <!-- Realized (secondary) -->
  <div class="ds-stat-metric-group ds-stat-metric-group--secondary">
    <span class="ds-stat-metric-value" x-text="dailySales?.today?.orders ?? '—'"></span>
    <span class="ds-stat-metric-label">realized</span>
  </div>
  
  <!-- Delta -->
  <div class="ds-stat-delta" :class="deltaClass(dailySales?.today?.vsYesterday?.orders?.delta)">
    <span class="ds-delta-arrow" x-text="deltaArrow(dailySales?.today?.vsYesterday?.orders?.delta)"></span>
    <span x-text="Math.abs(dailySales?.today?.vsYesterday?.orders?.delta ?? 0)"></span>
    <span>(<span x-text="formatPct(dailySales?.today?.vsYesterday?.orders?.pct)"></span>)</span>
    <span style="color: var(--text-secondary); margin-left: 2px">vs yesterday</span>
  </div>
</div>
```

**Same structure for Revenue and AOV:**
- Placed → Realized, always
- Delta compares placed count (or revenue/AOV on respective cards)

---

## I. Accessibility Notes

### Focus and keyboard navigation
- All cards remain non-interactive (no tab stops), so focus rings are not needed
- If future drill-down adds click handlers to cards, add `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`

### Color contrast
- Placed value: 22px `--text-primary` on `--bg-card` ✓ 11.8:1
- Realized value (secondary): 18px `--text-primary` at opacity 0.7 → still ≥4.5:1 ✓
- Metric labels (11px): `--text-secondary` on `--bg-card` ✓ 5.8:1
- Deltas: `--green` / `--red` on `--bg-card` ✓ ≥4.5:1

### Reduced motion
```css
@media (prefers-reduced-motion: reduce) {
  /* no animations on these cards, so no change needed */
}
```

---

## J. Open Questions Resolved (Designer's Defaults)

| Question | Decision | Rationale |
|----------|----------|-----------|
| **Primary metric in Today card?** | "Placed today" is primary. | Operationally relevant early in day; fulfillment lags. |
| **Desktop layout: 3-col or keep stacked?** | Introduce 3-col grid ≥768px. | Efficient space use, natural for 3-card layout, doesn't break mobile. |
| **YTD emphasis: visual special treatment?** | Yes, subtle card-level border + padding. | Signals "year-in-a-glance"; doesn't require typography changes. |
| **Realized secondary opacity?** | 0.7 (60% brightness). | Visually distinct but still legible; avoids `--text-tertiary` (too muted). |
| **Realized font size vs placed?** | 18px (vs 22px placed). | Subtle size difference reinforces hierarchy without jarring. |
| **Gap between placed/realized metrics?** | 1px (tight). | Shows they're a pair; no visual separation. |

---

## K. Files to Modify (Frontend-Builder)

| File | Changes |
|------|---------|
| `public/partials/daily-sales.html` | Lines ~430–495: Today card HTML restructure (dual metric groups). Revenue & AOV cards: same structure (placed/realized pairs). |
| `src/css/views/daily-sales.css` | Add new classes: `.ds-stat-card--dual`, `.ds-stat-metric-group`, `.ds-stat-metric-value`, `.ds-stat-metric-label`, `.ds-stat-metric-group--secondary`. Update `.ds-ytd-strip` with border + padding. Add 3-col grid for all strips ≥768px. |

**No backend changes.** API payload locked.

---

## L. Summary: V2→V3 Deltas

**Today card:**
- Restructure as dual-metric card: "placed / realized" side-by-side
- Placed value: 22px primary
- Realized value: 18px secondary (opacity: 0.7)
- Delta: always on placed count (vs yesterday)

**MTD card:**
- No structural change; rely on existing `--green` / `--red` delta colors to show divergence

**YTD card:**
- Add border + padding for subtle visual grouping (headline emphasis)
- No typography changes

**Desktop layout:**
- Introduce 3-column grid for all stat strips (Today/MTD/YTD) ≥768px
- Mobile: remains 1-column

**Accessibility:**
- Maintain 4.5:1 contrast throughout
- No new focus states (cards not interactive)
- `prefers-reduced-motion`: no change (no animations)

---

## Handoff to Frontend-Builder

**Read first:** `design-system/daily-sales-v2.md` for unchanged specs (filters, drill sheet, data quality, mix, trend, concerns).

**Then implement:**
1. Today card: Replace single metric with dual-metric structure (placed/realized)
2. Revenue & AOV cards: Apply same dual-metric structure
3. YTD strip: Add border + padding for headline emphasis
4. All strips: Introduce 3-column grid ≥768px

**Existing helpers:** `deltaArrow()`, `deltaClass()`, `formatINR()`, `formatPct()` — reuse as-is.

**Test checklist:**
- [ ] Today card: Placed (12) is primary visual weight, realized (0) is secondary
- [ ] Today card: Gap between placed/realized is 1px (tight pair)
- [ ] MTD/YTD: Deltas render in correct colors (green/red) for divergence story
- [ ] YTD strip: Border + padding visible, separates from MTD above
- [ ] Desktop ≥768px: All three strips render as 3-column grids
- [ ] Mobile <768px: All strips remain single-column
- [ ] Contrast: All text ≥4.5:1 (check secondary at opacity 0.7)
- [ ] Focus: If cards become clickable later, add focus rings

---

**Status:** Ready for frontend-builder.

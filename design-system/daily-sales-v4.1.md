# Daily Sales Dashboard — Design Spec v4.1 (Today as Secondary Strip)

**Scope:** Deltas-only spec layered on v4. v4 demoted Today to an inline pill in the freshness banner (effective but aggressive). v4.1 brings Today back as a **quiet secondary strip below Yesterday hero**, same dual-metric card structure as v3, renders only when data exists. All unchanged elements (freshness banner, Yesterday hero, MTD/YTD, filter, drill, data quality) remain per v4.

**Status:** Ready for frontend-builder (UI rebalance only, no backend changes; `today.allStatuses.*` already exposed).

---

## Summary of Changes

**Context:** v4 correctly identified batch reality (Yesterday is hero, Freshness at top) but over-corrected on Today. An inline pill in the freshness banner is minimal—too minimal when orders accumulate mid-day and you want to see the gap between placed and realized at a glance. 

1. **Today pill in freshness banner** — Removed (v4 artifact). Redundant with the new Today strip.
2. **Today secondary strip** — New block below Yesterday hero (3 cards: Orders/Revenue/AOV, placed/realized dual metrics). Renders only when `today?.allStatuses?.orders > 0`.
3. **Period label** — "Today (in progress)" signals partial-day data. No special styling.
4. **Visual weight** — Same `.ds-stat-card--dual` structure as Yesterday but with subtle quietness: no wrapper border/padding (naked cards), optional opacity 0.92 on the strip (almost imperceptible dimming), same grid layout (3-col on desktop, 1-col mobile).
5. **Delta decision** — Keep `today?.allStatuses?.vsYesterday.*` (placed vs placed) with suffix "vs yesterday so far" to communicate partial-day comparison.
6. **Render gate** — `today?.allStatuses?.orders > 0` only; vanishes entirely if zero (no empty state).

---

## A. Today Secondary Strip (Conditional, New)

**Placement:** Below Yesterday hero strip, above MTD strip. Renders only if `today.allStatuses.orders > 0`.

**Visual (example with data):**
```
Today (in progress)
┌──────────────────────────────┐
│ Orders    Revenue    AOV     │
│ 12 placed ₹9.2k placed ₹766  │
│ 2 realized ₹1.8k realized ₹900│
│ ↑ 3 vs yesterday so far       │
│ (25%)                          │
└──────────────────────────────┘
```

**Visual (when zero):**
Strip does not render. Page shows Yesterday hero → MTD → YTD directly.

**HTML structure (reuse v3 patterns):**
```html
<div class="ds-period-label">Today (in progress)</div>

<div class="ds-today-strip">
  <!-- Orders card -->
  <div class="ds-stat-card ds-stat-card--dual">
    <span class="ds-stat-label">Orders</span>
    
    <div class="ds-stat-metric-group">
      <span class="ds-stat-metric-value" x-text="dailySales?.today?.allStatuses?.orders ?? '—'"></span>
      <span class="ds-stat-metric-label">placed</span>
    </div>
    
    <div class="ds-stat-metric-group ds-stat-metric-group--secondary">
      <span class="ds-stat-metric-value" x-text="dailySales?.today?.orders ?? '—'"></span>
      <span class="ds-stat-metric-label">realized</span>
    </div>
    
    <div class="ds-stat-delta" :class="deltaClass(dailySales?.today?.allStatuses?.vsYesterday?.orders?.delta)">
      <span class="ds-delta-arrow" x-text="deltaArrow(...)"></span>
      <span x-text="Math.abs(dailySales?.today?.allStatuses?.vsYesterday?.orders?.delta ?? 0)"></span>
      <span>(<span x-text="formatPct(dailySales?.today?.allStatuses?.vsYesterday?.orders?.pct)"></span>)</span>
      <span class="ds-stat-delta-suffix">vs yesterday so far</span>
    </div>
  </div>
  
  <!-- Revenue card: same structure -->
  <!-- AOV card: same structure -->
</div>
```

**Data contract (backend, no changes from v4):**
Already exposed:
- `today.allStatuses.{orders, revenue, aov}` (placed metrics, filter-aware)
- `today.orders, today.revenue, today.aov` (realized, filter-aware)
- `today.allStatuses.vsYesterday.{orders, revenue, aov}` with `{delta, pct}`

**Rendering gate:**
```javascript
x-show="dailySales?.today?.allStatuses?.orders > 0"
```

**Viewport visibility:** The strip vanishes cleanly from the DOM when condition fails. No skeleton, no "0 placed today" message.

---

## B. CSS for Today Strip (Minimal)

**New class:**
```css
.ds-today-strip {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  /* Optional quietness: subtle opacity dimming */
  opacity: 0.92;
  /* Or remove opacity entirely if you prefer no dimming */
}

@media (min-width: 768px) {
  .ds-today-strip {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
}

@media (min-width: 1200px) {
  .ds-today-strip {
    gap: 16px;
  }
}
```

**Visual weight decisions:**
- **No wrapper border/padding** — cards render naked (same as within a flex/grid, no background container). This keeps them quiet and distinct from Yesterday's implicit "hero" framing.
- **Opacity 0.92** — nearly imperceptible dimming. Feel free to omit entirely (opacity: 1) if you think it reads cleaner without the subtle reduction.
- **Period label** — same `.ds-period-label` styling from v4 ("Yesterday (April 28)"). "Today (in progress)" uses identical treatment; the label text does the work.
- **No transitions** — grid cards are static; no fade-in animation when data arrives (keeps it low-key).

**Token usage:**
- Reuse all existing `.ds-stat-card`, `.ds-stat-metric-group`, `.ds-stat-delta` classes from v3/v4.
- No new tokens. Opacity is allowed as a literal (0.92) since it's not color.

---

## C. Freshness Banner Today Pill (Removal)

**v4 had:** Inline pill in `.ds-freshness-banner__secondary`:
```
Data through April 28 · Fetched 11:32 PM
      [↻ 12 placed since refresh]
```

**v4.1 removes:** Delete the `.ds-freshness-banner__today-pill` element entirely from the banner. The banner now shows only date cutoff + fetch time + optional "Last row aggregates" (unchanged from v4).

**Rationale:** The new Today strip is the primary signal. A duplicate pill in the freshness banner creates cognitive friction (two sources of truth for the same data). The banner stays diagnostic/informational; the strip is the operational view.

**CSS cleanup:** `.ds-freshness-banner__today-pill` and related styling become orphaned (same as `.ds-stat-secondary` from v3). Flag for future cleanup, but don't remove now (might be referenced in templates).

---

## D. Placement & Flow (Full Page Order)

**Top-to-bottom:**
1. Page header (unchanged)
2. Freshness banner (sticky, from v4, no pill)
3. Filter strip (unchanged, from v2)
4. **Yesterday hero strip** (from v4)
5. **Today secondary strip** [conditional, new in v4.1]
6. MTD strip (unchanged)
7. YTD strip (unchanged)
8. Trend chart (unchanged)
9. Mix breakdown (unchanged)
10. Top states table (unchanged)
11. Today's orders feed (unchanged)
12. Concerns (unchanged)
13. Data quality section (unchanged)

---

## E. Mobile Layout (<640px)

**Today strip on mobile:** Inherits `.ds-today-strip { grid-template-columns: 1fr; }`. Each card stacks vertically, same as Yesterday mobile behavior. Cards are narrower (full-width minus padding), still legible.

**Period label:** "Today (in progress)" sits above the cards, same as "Yesterday (April 28)".

**No special handling:** Same responsive pattern as Yesterday hero (carried forward from v3/v4 unchanged).

---

## F. Desktop Layout (≥768px)

**Today strip on desktop:** 3-column grid (Orders, Revenue, AOV cards side-by-side), gap 12px (same as Yesterday hero from v4).

**Visual symmetry:** Yesterday hero and Today strip align vertically (same column widths), making the progression clear: settled → in-progress.

---

## G. Open Questions Resolved (Designer's Defaults)

| # | Question | Default | Rationale |
|---|----------|---------|-----------|
| **1** | **Strip placement?** | Below Yesterday, above MTD. | Narrative: settled → in-progress → cumulative. Reading top-to-bottom makes sense. |
| **2** | **Visual weight vs Yesterday?** | Same `.ds-stat-card--dual` structure, no border/padding wrapper, optional opacity 0.92. | Quietness via absence (no container styling) rather than new "compact card" variant. Reduces CSS surface. |
| **3** | **Delta suffix?** | "vs yesterday so far" — communicate partial-day comparison. | Honest about mid-day volatility; user interprets knowingly. |
| **4** | **Render gate?** | `today?.allStatuses?.orders > 0`. | `allStatuses` is broadest signal (includes pre-shipment), lights up earliest. Vanishes cleanly when zero. |
| **5** | **Today pill in freshness banner?** | Remove entirely. | Duplicate source; the strip is primary. Banner stays diagnostic. |
| **6** | **Period label styling?** | Identical to "Yesterday (April 28)": `.ds-period-label`. | No special treatment needed; the text itself ("Today (in progress)") does the work. |
| **7** | **Empty state for Today strip?** | No rendering, no message, no skeleton. | Cleaner UX. User understands: no data yet = data hasn't arrived for today. |
| **8** | **Freshness & Today interplay?** | Freshness banner shows "Data through Apr 28" (yesterday cutoff). Today strip shows in-progress activity "since last refresh". | Two complementary signals: official truth (banner) + live accumulation (strip). |
| **9** | **3-col vs 2-col on desktop?** | Keep 3-col (Orders, Revenue, AOV). | Symmetric with Yesterday hero; AOV volatility mid-day is fine—user sees it's in-progress. |

---

## H. Migration Notes (Backend: No Changes)

**API contract:** `/api/daily-sales` already exposes:
- `today.allStatuses.{orders, revenue, aov}` — placed, filter-aware
- `today.{orders, revenue, aov}` — realized, filter-aware
- `today.allStatuses.vsYesterday.{orders, revenue, aov}` with `{delta, pct}`

**No new fields needed.** v4.1 is a UI rebalance only.

---

## I. Files to Modify (Frontend-Builder)

| File | Changes |
|------|---------|
| `public/partials/daily-sales.html` | Remove `.ds-freshness-banner__today-pill` from freshness banner (delete element). Add new `.ds-today-strip` block with 3 cards (Orders/Revenue/AOV dual metrics) below `.ds-hero-strip`. Wrap both in `x-show="dailySales?.today?.allStatuses?.orders > 0"`. |
| `src/css/views/daily-sales.css` | Add `.ds-today-strip` class with grid + responsive (same pattern as `.ds-hero-strip`/`.ds-mtd-strip`). Optional opacity: 0.92. Keep all v3/v4 classes unchanged. |
| `src/js/modules/daily-sales.js` | No new state or methods. Rendering of Today strip is a simple conditional (existing binding). |

**No backend changes.**

---

## J. CSS Additions Summary

**New class (minimal):**
```css
.ds-today-strip {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  opacity: 0.92;  /* Optional; remove if cleaner without dimming */
}

@media (min-width: 768px) {
  .ds-today-strip {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
}

@media (min-width: 1200px) {
  .ds-today-strip {
    gap: 16px;
  }
}
```

**Unchanged classes (carry from v3/v4):**
- `.ds-stat-card`, `.ds-stat-card--dual`, `.ds-stat-metric-group`, `.ds-stat-metric-value`, `.ds-stat-metric-label`, `.ds-stat-metric-group--secondary`, `.ds-stat-delta`, `.ds-delta-arrow`, `.ds-stat-delta-suffix`, `.ds-period-label`

**Orphaned CSS (from v4, flag for cleanup):**
- `.ds-freshness-banner__today-pill` — remove or leave as legacy

---

## K. Accessibility & Responsiveness

**Focus & keyboard:** No new interactive elements. Today strip is read-only display (same as Yesterday).

**Color contrast:** Reuse all v3 classes; contrast already verified (4.5:1 minimum).

**Reduced motion:** No animations added; strip is static. Existing `prefers-reduced-motion` rules (freshness banner, filter chips) unchanged.

**Touch targets:** Cards are non-interactive (no tap/click). If future drill-down adds click handlers, add focus rings.

**Mobile:** Cards stack 1-col on mobile, same as Yesterday. No horizontal scroll. Period label and cards all fit in viewport width.

---

## L. Summary: V4→V4.1 Deltas

| Layer | Change |
|-------|--------|
| **Today representation** | Inline pill in freshness banner → Secondary strip below Yesterday hero (conditional render, dual-metric cards). |
| **Today visibility** | Always in banner → Renders only when `today.allStatuses.orders > 0`. |
| **Visual hierarchy** | Pill is footnote → Strip is operational view with period label ("Today (in progress)") and deltas ("vs yesterday so far"). |
| **Page flow** | Yesterday → MTD → YTD → [rest] | Yesterday → **Today** [if data] → MTD → YTD → [rest] |
| **CSS** | `.ds-freshness-banner__today-pill` (removed) | `.ds-today-strip` (added, mirrors `.ds-hero-strip` grid pattern, optional opacity 0.92) |
| **Freshness banner** | Shows today pill | Shows date cutoff + fetch time + last row aggregates only (no today signal) |
| **Backend** | No changes. v4 API already exposes `today.allStatuses.*` and `.vsYesterday.*` | No changes. Same contract. |

All v4 elements unchanged: Freshness banner structure (minus pill), Yesterday hero, MTD/YTD, filter strip, drill, data quality, trend, mix, concerns, top states, today's orders feed.

---

## M. Design Rationale

**Why Today needed to return:** v4's inline pill was correct (batch reality, demoted today), but it was _too_ demoted. An inline note in the freshness banner disappears in scrolling. Today's numbers (placed vs realized, especially for AOV) are operationally relevant mid-day.

**Why a secondary strip, not a card:** Consistency with v3/v4's stat card language. Dan already knows how to read "placed / realized" dual metrics from Yesterday hero. Today strip uses identical structure, so it's low-cognition.

**Why conditional rendering:** "No data = no visual" is cleaner than a skeleton or "0 placed today" message. User understands why Today isn't visible (batch import hasn't happened yet).

**Why optional opacity 0.92:** Subtle dimming (if used) signals "this is secondary" without being jarring. Feel free to drop it (use opacity: 1) if you think the full-brightness cards read better.

**Why "Today (in progress)":** Explicit framing. No ambiguity. The parenthetical is worth the two words.

---

## N. Handoff to Frontend-Builder

**Read first:** `design-system/daily-sales-v4.md` for unchanged spec (freshness banner, Yesterday hero structure, MTD/YTD, filter strip, drill sheet, data quality, all patterns carry forward).

**Then implement:**
1. Remove `.ds-freshness-banner__today-pill` element and styling from freshness banner.
2. Add new `.ds-today-strip` block with 3 stat cards (Orders, Revenue, AOV) below Yesterday hero.
3. Conditionally render Today strip on `x-show="dailySales?.today?.allStatuses?.orders > 0"`.
4. Apply 3-column grid on desktop (≥768px), 1-column on mobile (<768px).
5. Use period label "Today (in progress)" above the strip.
6. Deltas use "vs yesterday so far" suffix (reuse existing `.ds-stat-delta-suffix` class or inline style).

**Existing helpers:** `deltaArrow()`, `deltaClass()`, `formatINR()`, `formatPct()` — reuse as-is.

**Test checklist:**
- [ ] Today strip hidden when `today.allStatuses.orders === 0`
- [ ] Today strip visible when `today.allStatuses.orders > 0`
- [ ] Cards render in order: Orders, Revenue, AOV (left-to-right desktop)
- [ ] Placed metric is primary (22px), realized is secondary (18px, opacity 0.7)
- [ ] Delta shows "vs yesterday so far" suffix
- [ ] Desktop ≥768px: 3-column grid with gap 12px
- [ ] Mobile <768px: single-column cards, stacked vertically
- [ ] Contrast: all text ≥4.5:1 (already verified in v3)
- [ ] Freshness banner pill is deleted
- [ ] Period label "Today (in progress)" sits above cards

---

## O. Deleted or Deprecated

- **`.ds-freshness-banner__today-pill`** — Entire element and CSS removed from freshness banner. Orphaned class in stylesheet should be deleted (or left as legacy reference).

---

**Status:** Ready for frontend-builder (UI rebalance only, no backend changes).

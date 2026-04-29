# Daily Sales Dashboard — Design Spec v4 (Batch Reality: Yesterday Hero)

**Scope:** Deltas-only spec layered on v3. Google Sheet is batch-imported nightly (typically evening/night IST). "Today" is empty/sparse during business hours. The IA must reflect this reality: Yesterday is the hero, Today is a small ephemeral sidecar. Freshness banner moves to top-of-page prominence to signal data cutoff.

**Status:** Ready for backend-builder (new `yesterday` block + `dataCutoff` field) → frontend-builder (IA rebalance only, no structural rework on v3 skeleton).

---

## Summary of Changes

**Context:** The system works correctly—data arrives in a batch, not live. The UI was designed for live data (Today hero). We're correcting the IA to match the actual data flow.

1. **Freshness banner** — Moves to top-of-page, shows "Data through Apr 28 · Fetched 11pm" (actual data cutoff + relative refresh time)
2. **Yesterday card** — Becomes the hero (3 metrics: Orders/Revenue/AOV, placed/realized pairs per v3)
3. **Today card** — Demoted to small sidecar (inline pill or slim card, only when data > 0) showing "since last refresh" activity
4. **MTD/YTD unchanged** — Keep v3's treatment (color deltas, subtle border/padding for YTD)
5. **Empty states clarified** — Distinguish "Sheets unavailable" from "no data yet today"

---

## A. Freshness Banner (Top-of-Page)

**Placement:** Static at top, between page header and stat strip. Sticky on scroll (stays visible). Z-index: 8 (below header at 10, above content).

**Visual:**
```
┌─────────────────────────────────────────┐
│ Data through April 28 · Fetched 11:32 PM IST
│ Last row: 127 orders · ₹1,23,456 revenue
│                                [↻ Refresh]
└─────────────────────────────────────────┘
```

**Copy hierarchy:**
- **Primary (16px semibold):** "Data through [date]"
- **Secondary (13px regular):** "Fetched [relative time] IST" (e.g., "Fetched 11pm" or "Fetched 2 hours ago")
- **Tertiary (12px muted):** Last row aggregates — "127 orders · ₹1.2L revenue" (quick scan of freshness)
- **CTA (optional):** Refresh button (manual re-fetch, e.g., if user imports fresh data mid-day)

**Semantic intent:** "The data you're seeing is accurate **through this date.** It will update again tonight." Not a warning, just a fact.

**Classes:**
- `.ds-freshness-banner` — container
- `.ds-freshness-banner__primary` — "Data through [date]"
- `.ds-freshness-banner__secondary` — fetch time + relative
- `.ds-freshness-banner__last-row` — aggregates (optional)
- `.ds-freshness-banner__refresh-btn` — manual refresh

**Styling:**
```css
.ds-freshness-banner {
  position: sticky;
  top: 60px;  /* below header */
  z-index: 8;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border);
  line-height: 1.4;
}

.ds-freshness-banner__primary {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-ui);
}

.ds-freshness-banner__secondary {
  font-size: 13px;
  font-weight: 400;
  color: var(--text-secondary);
  font-family: var(--font-ui);
}

.ds-freshness-banner__last-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-tertiary);
  font-family: var(--font-ui);
}

.ds-freshness-banner__last-row-metric {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.ds-freshness-banner__last-row-value {
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--text-secondary);
}

.ds-freshness-banner__refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 150ms ease;
  width: fit-content;
  margin-top: 4px;
}

.ds-freshness-banner__refresh-btn:hover {
  background: var(--bg-hover);
  border-color: var(--accent);
  color: var(--accent);
}

.ds-freshness-banner__refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ds-freshness-banner__refresh-icon {
  width: 14px;
  height: 14px;
  display: inline-block;
}

.ds-freshness-banner__refresh-icon.ds-refreshing {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .ds-freshness-banner__refresh-icon.ds-refreshing {
    animation: none;
  }
}

@media (max-width: 640px) {
  .ds-freshness-banner {
    gap: 6px;
    padding: 10px 12px;
  }

  .ds-freshness-banner__primary {
    font-size: 14px;
  }

  .ds-freshness-banner__secondary {
    font-size: 12px;
  }

  .ds-freshness-banner__last-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
```

---

## B. Yesterday Card (Hero Stat Strip)

**Replaces Today as the first headline card.** Yesterday's data is complete and final. Use v3's dual-metric structure (placed/realized) for Orders, Revenue, AOV.

**Visual:**
```
Yesterday (April 28)
┌──────────────────────────┐
│ Orders      Revenue    AOV     │
│ 127 placed  ₹1.23L placed ₹9.7k placed
│ 120 realized ₹1.20L realized ₹10k realized
│ ↑ 8 (6.3%)  ↓ ₹2.1L (-15%)   ↓ ₹1.2k (-11%)
│ vs day-before-yesterday
└──────────────────────────┘
```

**Layout:**
- Always 3 cards (Orders / Revenue / AOV)
- Each card: placed (primary) / realized (secondary) dual-metric structure from v3
- Delta: vs **day-before-yesterday** (DBY) — maintains "vs yesterday" pattern consistency
- Period label: "Yesterday (April 28)" in small print above or inline

**Delta decision:** vs DBY, not same-day-last-week. Reasoning: consistency with v3's "vs yesterday" language on other cards, and DBY is closer to actual business context (not smoothed by weekly seasonality).

**Classes:** Reuse v3's `.ds-stat-card`, `.ds-stat-card--dual`, `.ds-stat-metric-group`, `.ds-stat-metric-value`, `.ds-stat-metric-label`, `.ds-stat-metric-group--secondary`. No new classes.

**HTML structure (v3 pattern, applied to yesterday data):**
```html
<div class="ds-period-label">Yesterday (April 28)</div>

<div class="ds-hero-strip">
  <!-- Orders card -->
  <div class="ds-stat-card ds-stat-card--dual">
    <span class="ds-stat-label">Orders</span>
    
    <div class="ds-stat-metric-group">
      <span class="ds-stat-metric-value" x-text="dailySales?.yesterday?.allStatuses?.orders ?? '—'"></span>
      <span class="ds-stat-metric-label">placed</span>
    </div>
    
    <div class="ds-stat-metric-group ds-stat-metric-group--secondary">
      <span class="ds-stat-metric-value" x-text="dailySales?.yesterday?.orders ?? '—'"></span>
      <span class="ds-stat-metric-label">realized</span>
    </div>
    
    <div class="ds-stat-delta" :class="deltaClass(dailySales?.yesterday?.vsDBY?.orders?.delta)">
      <span class="ds-delta-arrow" x-text="deltaArrow(...)"></span>
      <span x-text="Math.abs(dailySales?.yesterday?.vsDBY?.orders?.delta ?? 0)"></span>
      <span>(<span x-text="formatPct(dailySales?.yesterday?.vsDBY?.orders?.pct)"></span>)</span>
      <span style="color: var(--text-secondary)">vs day before</span>
    </div>
  </div>
  
  <!-- Revenue + AOV: same structure -->
</div>
```

**Data shape (from backend, new `yesterday` block):**
```javascript
{
  yesterday: {
    allStatuses: {
      orders: 127,
      revenue: 123456,
      aov: 9700,
    },
    orders: 120,        // realized
    revenue: 120000,    // realized
    aov: 10000,         // realized
    vsDBY: {            // vs day-before-yesterday
      orders: { delta: 8, pct: 6.3 },
      revenue: { delta: -21000, pct: -15 },
      aov: { delta: -1200, pct: -11 },
    }
  },
  // ... rest of spec (today, mtd, ytd, etc.)
}
```

---

## C. Today Card (Demoted, Conditional Sidecar)

**Placement:** Optional, only when `today.allStatuses.orders > 0`. Appears after Freshness banner, before Yesterday hero—or inline with freshness banner as a pill (two layout options below).

**Three options (pick one):**

### Option C1: Inline pill in freshness banner (RECOMMENDED)
**When today has data (e.g., 12 orders placed since last refresh):**
```
Data through April 28 · Fetched 11:32 PM
      [↻ 12 placed since refresh]
```

**When today has 0:** Pill vanishes entirely.

**Pros:** Minimal screen real estate, contextual (only shows when relevant). **Cons:** Freshness line gets crowded if many orders.

**Implementation:** Add optional `.ds-freshness-banner__today-pill` element inside `.ds-freshness-banner__secondary`. Show/hide with `x-show`.

```css
.ds-freshness-banner__today-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--blue-a08);
  border: 1px solid var(--accent);
  border-radius: 12px;
  color: var(--accent);
  font-size: 12px;
  font-weight: 500;
  margin-left: 8px;
  white-space: nowrap;
}

.ds-freshness-banner__today-pill svg {
  width: 12px;
  height: 12px;
}
```

### Option C2: Slim card below freshness
Standalone card slot, rendered if `today.allStatuses.orders > 0`, sits between Freshness banner and Yesterday hero.

**Visual:**
```
┌─────────────────────────┐
│ Today (partial)         │
│ 12 placed · ₹9.2k       │
└─────────────────────────┘
```

**Single-line layout:** No dual metrics, no delta. Just "X placed · ₹Y revenue" for quick scan.

**Pros:** Clear separation, familiar card shape. **Cons:** Uses screen real estate when might be zero later.

### Option C3: Hidden until data > 0
No card rendered when `today.allStatuses.orders == 0`. Vanishes from page until evening import.

**Pros:** Cleanest. **Cons:** Dashboard feels incomplete at 11am if user doesn't know why.

**Recommendation:** Use **Option C1** (inline pill). It's zero-friction: shows context when relevant, disappears when not. Cost is minimal.

---

## D. MTD/YTD Unchanged

**Keep v3's design entirely:**
- MTD card: 3 metrics (Orders/Revenue/AOV), deltas in color (green/red) to show divergence story
- YTD card: 3 metrics, subtle border + padding for headline emphasis (year-in-a-glance grouping)
- No structural changes

**Desktop 3-col grid:** Kept from v3 ≥768px.

---

## E. Filter, Drill, Data Quality, Concerns: Unchanged

All v2 + v3 patterns (filter strip, drill sheet, data quality section, concerns block) remain exactly as specified. No visual or structural changes.

---

## F. Empty States & Error Messaging

**When data is unavailable (Sheets import failed):**
```
Freshness banner shows:
"Data unavailable. Last imported: April 27 at 11:04 PM
[Retry]"
```
**Copy tone:** Factual, not alarming. System is trying again.

**When all data is zero (e.g., Sunday, no orders placed):**
```
Yesterday: 0 orders, ₹0 revenue, — AOV
(no change to card structure, just zero values)
```

**When today has zero AND yesterday is zero (Sheets lag or import failure):**
```
Freshness banner primary:
"Data through April 27 (not yet updated today)
[↻ Refresh to check for new data]"
```
**Copy tone:** Neutral. Explains why both are empty.

---

## G. Backend Contract (New Fields)

**Add to `GET /api/daily-sales` response:**

```javascript
{
  // New in v4:
  dataCutoff: "2026-04-28",  // ISO date (IST-bucketed), latest istDateKey with any orders
  fetchedAt: "2026-04-29T11:32:00Z",  // ISO timestamp when API pulled data

  // New block: yesterday aggregates (same shape as today block)
  yesterday: {
    allStatuses: {
      orders: 127,
      revenue: 123456,
      aov: 9700,
    },
    orders: 120,        // realized (Status ∈ {Delivered, Fulfilled})
    revenue: 120000,
    aov: 10000,
    vsDBY: {
      orders: { delta: 8, pct: 6.3 },
      revenue: { delta: -21000, pct: -15 },
      aov: { delta: -1200, pct: -11 },
    }
  },

  // Existing fields (unchanged):
  today: { /* ... */ },
  mtd: { /* ... */ },
  ytd: { /* ... */ },
  // ... rest of v3 response
}
```

**Filter semantics:** Does `yesterday.allStatuses` apply channel/type/payment filters applied to the view, or only status? **Answer: Apply all filters except status.** Reasoning: a user filtering to "Etsy only" should see yesterday's Etsy data, but "yesterday" includes all order statuses (for fairness—we don't want to misrepresent yesterday as "realized only" if filters are active).

---

## H. Open Questions: Defaults

| # | Question | Default | Rationale |
|---|----------|---------|-----------|
| 1 | **Today sidecar option?** | Option C1 (inline pill) | Minimal footprint, contextual disappearance. Flag if you disagree. |
| 2 | **Today vs DBY or vs same-day-last-week?** | vs DBY | Consistency with "vs yesterday" language on all other cards. |
| 3 | **Freshness "fetched at" = `fetchedAt` (API pull) or "last data row date"?** | Both (dataCutoff + fetchedAt in response). Frontend shows dataCutoff as the truth. | dataCutoff is the user's semantic date; fetchedAt is diagnostic. |
| 4 | **Freshness sticky on scroll?** | Yes, stays at top during scroll. | User needs to know data cutoff while drilling. |
| 5 | **YTD frame + border from v3: keep?** | Yes, keep. | Subtle visual grouping is still valuable; doesn't conflict with Yesterday hero. |
| 6 | **MTD label "Month to Date (through Apr 28)"?** | Yes, add "(through Apr 28)" | Removes ambiguity; zero extra density cost. |
| 7 | **Trend30d last point label: "yesterday" or date?** | Date (e.g., "Apr 28"). | Avoid confusion; the chart already makes it clear it's the last 30 days ending yesterday. |
| 8 | **Refresh button in freshness banner: auto-refresh interval or manual only?** | Manual only (user clicks [Refresh]). | API-heavy if auto; user can manually refresh if they import new data mid-day. |

---

## I. CSS Additions (Minimal)

**New classes:**
```css
.ds-freshness-banner { /* full spec above */ }
.ds-freshness-banner__primary { /* above */ }
.ds-freshness-banner__secondary { /* above */ }
.ds-freshness-banner__last-row { /* above */ }
.ds-freshness-banner__last-row-metric { /* above */ }
.ds-freshness-banner__last-row-value { /* above */ }
.ds-freshness-banner__refresh-btn { /* above */ }
.ds-freshness-banner__refresh-icon { /* above */ }
.ds-freshness-banner__refresh-icon.ds-refreshing { /* animation */ }
.ds-freshness-banner__today-pill { /* option C1 only */ }
.ds-period-label { /* "Yesterday (April 28)" */ }
```

**For `.ds-period-label` (reuse if exists, else add):**
```css
.ds-period-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
  font-family: var(--font-ui);
}
```

**Tokens used:**
- `--bg-primary`, `--bg-hover`, `--border`, `--text-primary`, `--text-secondary`, `--text-tertiary`
- `--accent`, `--blue-a08`
- `--font-ui`, `--font-mono`
- No new tokens needed

---

## J. Migration Notes (Follow-Up, Not This PR)

**Deletable if confident:**
- Remove v2 footer "Data Freshness" line (replaced by top banner)
- Remove v3 empty `<div class="ds-today-empty"></div>` placeholder if it exists

**Keep:**
- Today card skeleton (structure remains, just demoted)
- All v3 stat card classes (dual metrics, deltas, etc.)
- Filter, drill, data quality sections (untouched)

---

## K. Summary: V3→V4 Deltas

| Layer | Change |
|-------|--------|
| **Freshness** | Footer → top-of-page sticky banner. Adds `dataCutoff` (IST date) + relative time. Shows last-row aggregates. Optional refresh button. |
| **Yesterday** | New block. Becomes hero stat strip (3 cards, placed/realized dual metrics per v3). Delta vs day-before-yesterday. |
| **Today** | Demoted. Optional inline pill in freshness banner (only when > 0 orders). No card rendering. |
| **MTD/YTD** | Unchanged. Keep v3 styling, deltas, border emphasis. |
| **Labels** | Add "(through Apr 28)" to MTD label for cutoff clarity. |
| **Backend** | New `yesterday` block (match `today` shape). New `dataCutoff: "YYYY-MM-DD"` field. Filter semantics: `yesterday.allStatuses` applies all filters except status. |

All v3 patterns (filter strip, drill, data quality, concerns, 3-col grid) carried forward unchanged.

---

## L. Files to Modify (Frontend-Builder)

| File | Changes |
|------|---------|
| `public/partials/daily-sales.html` | Add freshness banner at top. Swap Today hero → Yesterday hero. Optionally move Today to inline pill in freshness. Adjust period labels. |
| `src/css/views/daily-sales.css` | Add `.ds-freshness-banner*` classes (full spec above). Optional `.ds-freshness-banner__today-pill`. Update `.ds-period-label` if needed. Keep v3 classes unchanged. |
| `src/js/modules/daily-sales.js` | Add `yesterday` data binding. Add relative-time helper for "Fetched X ago". Optional refresh button click handler. Condition Today pill rendering on `today.allStatuses.orders > 0`. |

**No backend changes in this PR; backend-builder adds the new `yesterday` and `dataCutoff` fields to the response.**

---

## M. Handoff to Builders

**Backend-builder first:** Extend `GET /api/daily-sales` to expose a new `yesterday` block (with same structure as `today`: `allStatuses.{orders,revenue,aov}`, realized counts, `vsDBY` deltas). Add `dataCutoff: "YYYY-MM-DD"` (ISO date of latest istDateKey with orders, IST-bucketed). Ensure filter semantics match: `yesterday.allStatuses` applies all current filters except status. Test with real data.

**Frontend-builder second:** Read this spec + v3 spec. Render freshness banner at top (sticky). Swap stat strip so Yesterday is hero (3 cards, dual metrics). Demote Today to optional inline pill in freshness. Update period labels to include date cutoff. Integrate with backend API. Test on mobile (freshness banner should not occlude content). Manual refresh button is optional—defer if not needed for v4 MVP.

---

## N. Design Rationale

**Why batch reality matters:** The old IA (Today hero) was accurate for live-fed dashboards but misleading here. At 11am, "0 placed today" looks like a system failure—it's not, it's tomorrow's import not having happened yet. By making Yesterday the hero and Freshness prominent, we're saying: "Your system is working. This is the most recent complete data. It will update overnight."

**Why not smoothed deltas (same-day-last-week)?** It would require more backend computation and introduce semantic confusion. "vs yesterday" is simpler and matches user intent: "How did today perform vs the day before?"

**Why freshness at top, not in footer?** Users scroll down through filters/tables/drill without seeing footer. Top placement is glanceable before any action. Sticky behavior means it's always visible, never lost during scroll.

---

**Status:** Ready for backend-builder (API contract) → frontend-builder (IA rebalance).

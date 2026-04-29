# Session Handoff — Command Centre

## 2026-04-29 16:00
**Accomplished:** Scoped "Open in Sheets" link button feature across all sheet-backed views (Daily Sales, D2C, CRM, BMC, Competitor Intel, Ops, Tech Team, Dashboard). Recon mapped sheets-consuming services and routes; proposed 3-step plan (sheets.getSheetUrl helper with cached gid lookup → routes return `meta.sheetUrl` + `meta.sheetName` → view headers get reusable "↗ Open in Sheets" button class).
**Decisions:** Dan confirmed scope = "all" sheet-backed pages and deep-link to specific tab (not spreadsheet root). Logged as decision #38.
**Next:** Dispatch backend-builder (helper + route meta), then frontend-builder (button class + per-view placement), then code-reviewer. Pause for Dan to test before ux-auditor/tester per standing skip-UI-gates preference.

## 2026-04-29 18:35

**Accomplished:**

(1) **Daily Sales v3 stat-strip rebalance.** Top three cards (Today/MTD/YTD) re-architected to absorb three backend data fixes (dual placed/realized on Today, year-round MTD deltas, sign-flipped YTD deltas after apples-to-apples FY compare). Pipeline: design-planner → frontend-builder → code-reviewer APPROVED. Spec at [design-system/daily-sales-v3.md](design-system/daily-sales-v3.md).

(2) **Channel filter bug fix.** Dan reported Today numbers don't change when filtering by channel. Root cause in [server/services/daily-sales/index.js](server/services/daily-sales/index.js): `today.allStatuses.*` was computed from unfiltered aggregates. Comment said "no STATUS filter" but implementation applied **no filters at all**. V3 made it user-visible by promoting `allStatuses` to primary. Fix: introduced `{ ...activeFilter, status: 'all' }` spec variant, rebuilt `allStatuses` block from filtered orders. APPROVED.

(3) **Daily Sales v4 — Yesterday-as-hero (batch-data IA).** Dan flagged that the data is **batch-imported once a day** (evening/night IST), not live-fed. v3's Today-as-hero was wrong for that reality — at 11am, "0 placed today" looks broken when it's actually the system working as designed. v4 reframes:
- **Yesterday becomes the hero strip** (full settled data) with `vsDayBefore` deltas
- **Today demotes** to a small "↻ 12 placed since refresh" pill in the freshness banner — only renders when `today.allStatuses.orders > 0`
- **Freshness banner** moved from page footer to sticky top, prominent — shows "Data through Apr 28, 2026 · Fetched N minutes ago"
- **MTD/YTD labels** now say "· through Apr 28" so cutoff is unambiguous on every card

Pipeline: design-planner → backend-builder → frontend-builder → coherence fix (yesterday.date over dataCutoff) → code-reviewer APPROVED. Spec at [design-system/daily-sales-v4.md](design-system/daily-sales-v4.md).

Backend (`server/services/daily-sales/index.js`): added `dayBeforeKey`/`dayBeforeOrdersAll`, `dayBeforeAggFinal`/`dayBeforeAggAllStatus` (filter-aware), `freshness.dataCutoff` (latest istDateKey with orders, null when empty), top-level `yesterday` block mirroring `today` shape with `vsDayBefore` deltas + `allStatuses` filter-except-status semantics. 9 new tests, all pass.

Frontend ([public/partials/daily-sales.html](public/partials/daily-sales.html), [src/css/views/daily-sales.css](src/css/views/daily-sales.css), [src/js/modules/daily-sales.js](src/js/modules/daily-sales.js)): added `.ds-freshness-banner` (5 classes, sticky z-index 8 below filter-strip's 9), repointed hero strip from `today.*` to `yesterday.*` reusing v3's `.ds-stat-card--dual` structure, added 3 helpers (`formatDataCutoff`, `formatCutoffShort`, `formatRelativeTime`), harmonized all 6 pre-existing inline-styled MTD/YTD "vs last month / vs FY same period" suffixes to `.ds-stat-delta-suffix` class — closes the v3 consistency gap. Build clean, no new lint errors.

(4) **Dev server restart this session.** Killed deadlocked listener (PID 71720, pre-edit code) + two stale `--watch` watchers (38819, 31271 fighting EADDRINUSE). Started fresh `npm run dev` (PID 74547). Brief Sheets API outage during testing ("Internal error encountered" on YTD/month/last-FY tabs) — transient, resolved. Latent UX issue surfaced: when Sheets is unavailable, dashboard renders zeros silently rather than an error banner.

**Decisions** (3 new — see decisions.md #35–37):
- **#35**: Daily Sales redesigned around batch-import reality (Yesterday hero) instead of pursuing a live-feed pipeline. Path A over B per Dan's "a" call.
- **#36**: Banner "Data through {date}" anchored to `yesterday.date`, not `freshness.dataCutoff`. Reason: dataCutoff = latest day with any orders, which can be today (partial); using yesterday.date keeps the banner coherent with the Yesterday hero card.
- **#37**: Inline `style="color:..."` consistency gap on MTD/YTD delta suffixes — closed in v4 instead of deferred. All 6 spans now use `.ds-stat-delta-suffix`.

**Next:**
1. Dan reloads `/daily-sales` desktop + 375px mobile. Three eyeball calls: (a) banner sticky behavior on real scroll — clears the filter strip? (b) today pill copy "↻ 12 placed since refresh" — keep or rewrite? (c) v3-flagged 22px (Yesterday primary) vs 24px (MTD/YTD desktop) type mismatch still live — harmonize now or leave?
2. After Dan signs off: scribe to update `.claude/docs/app-reference.md` for v3 + v4 (new classes `.ds-stat-card--dual`, `.ds-stat-metric-group{,--secondary}`, `.ds-stat-metric-value`, `.ds-stat-metric-label`, `.ds-stat-delta-suffix`, `.ds-freshness-banner{,__primary,__secondary,__today-pill,--unavailable}`; new API fields `yesterday.*`, `freshness.dataCutoff`; new module helpers `formatDataCutoff`, `formatCutoffShort`, `formatRelativeTime`; v3 channel-filter fix semantics on `today.allStatuses` and v4 parallel on `yesterday.allStatuses`).
3. Optional follow-ups (deferred):
   - Strip orphaned `.ds-stat-secondary` class (line ~181 of `src/css/views/daily-sales.css`).
   - Sheets-unavailable banner: when `dataCutoff === null`, show a clear "Upstream unreachable, retry" instead of silent zeros.
   - Stale-import detection: when `dataCutoff < yesterday.date`, surface "last import lagging" warning (the dataCutoff field is wired and ready for this).
   - Path B (smaller-batch import schedule, e.g. every 2-4h) if Dan ever wants today's data live-ish — not started.
4. Pre-existing prior-session items still pending (unchanged): patch `server/services/notion.js:983-986` silent-swallow, scribe DB-ID fixes for Dan↔Colin, `.claude/rules/api-schemas.md` tightening.

---

## Earlier sessions

Full history (2026-04-08 Vercel env audit, null-deref fix; 2026-04-22 System Map + schema capture; 2026-04-23 Dan↔Colin Queue v1+v2, agent-efficiency tightening, dashboard optimization #1-#4, tab-navigation fix; 2026-04-29 12:12 Daily Sales v3 + channel-filter fix) trimmed — see git: `git log data/sessions/handoff.md`.

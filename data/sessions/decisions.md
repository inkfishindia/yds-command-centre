# Decision Register — Command Centre

| # | Date | Decision | Rationale | Status |
|---|------|----------|-----------|--------|
| 1 | 2026-03-21 | Only map spreadsheet IDs when evidence is exact — never guess strategy wiring | Incorrect wiring causes silent data corruption in dashboards | Active |
| 2 | 2026-03-21 | Keep Google Sheets as short-term source of truth (no immediate Notion migration) | Sheets already working, migration would stall feature dev | Active |
| 3 | 2026-03-21 | Use service-account auth for Sheets, not browser OAuth | Backend-only access, no user-facing Sheets flows needed | Active |
| 4 | 2026-03-21 | Redesign BMC as hybrid executive canvas (classic BMC + dashboard + detail drawer) | Plain BMC too static for CEO daily use; needs interactivity | Active |
| 5 | 2026-03-21 | Build marketing content features into Command Centre, not as separate MCC app | Reduces context-switching, leverages existing infrastructure | Active |
| 6 | 2026-04-08 | Fix frontend x-show→x-if for lazy module views | Alpine evaluates all x-show expressions on load including uninitialised lazy modules, causing 246 errors and empty panels; x-if removes from DOM until active | Pending |
| 7 | 2026-04-08 | Reconcile conflicting Stop hooks into single per-action format | Two Stop hooks had contradictory requirements (one summary row vs per-action rows) causing infinite loop at session end | Active |
| 8 | 2026-04-08 | Use esbuild for JS code splitting (not Vite/Webpack) | Zero-config, single dependency, 50ms builds, stays within Alpine.js stack — no framework change needed | Proposed |

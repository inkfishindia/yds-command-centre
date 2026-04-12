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
| 9 | 2026-04-08 | Diagnosed live "data not loading" as auth-gate cookie encoding regression in commit 4979625; no code change yet | URL-encoding cookie on set + decodeURIComponent on read locks out users holding pre-deploy raw cookies until re-login. Vercel logs confirm all API endpoints return 200 after fresh login | Pending fix |
| 10 | 2026-04-08 | Added CRM_CONFIG_SPREADSHEET_ID and OPS_WAREHOUSE_SPREADSHEET_ID to Vercel Production env; deferred STRATEGY_SPREADSHEET_ID | Two were missing from prod but present in local .env causing silent data gaps. STRATEGY value doesn't exist locally — needs clarification from Dan before adding | Active |
| 11 | 2026-04-08 | Fix dashboard nav badge null-deref with optional chaining (not x-if wrapper) | Alpine evaluates x-text independently of x-show; old guard relied on x-show but x-text still threw. Optional chaining is smallest surface-area fix — one line in public/index.html:105 | Active |
| 12 | 2026-04-08 | No code change for "exports is not defined" error in notion-browser chunk — diagnosed as stale browser cache | Local + git-committed chunk is pure ESM with zero exports references. Dan's commit ffe0fef already fixed cache headers (app.js no-cache, hashed chunks immutable), so hard refresh resolves it and prevents recurrence | Active |
| 13 | 2026-04-11 | Monorepo: merge ERP React frontend into CC repo as `app/`, replace Alpine.js frontend | 3 separate apps too much to manage. ERP has best UI (React, 78 pages). CC has the backend. One repo, one deploy, one URL. | Active |
| 14 | 2026-04-12 | Remove ACCESS_PASSWORD gate from CC on Vercel | Dan forgot the password; simpler auth story; React app will handle auth internally via Google OAuth later | Active |

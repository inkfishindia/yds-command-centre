# Session Handoff — Command Centre

## 2026-05-02 15:45 — Local test instructions delivered (no code changes)

**What Was Accomplished:** Dan asked "can i test it on local?" Provided 2-command local-test sequence (`npm run build && npm run dev` → open `http://localhost:3000` → sidebar Growth → IG Playbook). Documented two expected outcome paths: (a) integration has YDS Marketing Hub access → real data renders + SWPS hero color-codes; (b) no access → amber banner persists. Provided step-by-step access-grant procedure: Notion page `323247aa-0d7b-81a5-b85d-ce421c959f3b` → `…` menu → Connections → add the same integration that owns existing `NOTION_TOKEN` (likely "YD-render" based on prior error log evidence). All 5 child DBs inherit access automatically via the parent-page connection.

**Key Decisions:** None.

**What To Do Next:** Awaiting Dan's local-test report. Once `/ig` renders correctly: dispatch code-reviewer + ux-auditor in parallel for Phase C, then proceed to Phase D (P0 automations, requires per-DB split of reads/marketing-ig.js first).

---

## 2026-05-02 15:40 — Hardcoded 5 IG DB UUIDs (supersedes Decision #98) — env-var setup no longer required

**What Was Accomplished:** Per Dan's "go" → flipped 5 IG-playbook DBs from `process.env.X || null` to hardcoded UUIDs in [server/services/notion/databases.js:36-40](server/services/notion/databases.js#L36-L40), matching the existing 18 DBs pattern. Extended [listDatabases()](server/services/notion/databases.js#L72-L76) to include all 5 new DBs (now returns 23 entries, was 18). Updated [test/notion-service.test.js:32-46](test/notion-service.test.js#L32-L46) to assert 23 entries + new IG names. Deleted obsolete env-var-guard test from `test/marketing-ig.test.js` (the throw path no longer fires since DB constants are always truthy); cleaned up unused `READS_IG_PATH` constant. Lint clean, 1035/1035 tests pass (was 1036; net -1 from deleted obsolete test).

`requireDbId()` defensive check in `reads/marketing-ig.js` kept as no-op for now; will be cleaned during Phase D per-DB split. The 5 env vars I previously asked Dan to set in `.env` are no longer needed for `/ig` to work — only `NOTION_TOKEN` (already set) + integration access to YDS Marketing Hub.

**Key Decisions:** Decision #100 logged (supersedes #98). Net effect: simpler config story matching existing DBs, eliminates Dan's env-setup blocker, IDs become single source of truth in code (already-public information).

**What To Do Next:**
1. Dan to restart dev server, hard-reload `/ig`. **Banner should clear** if NOTION_TOKEN integration has access to "YDS Marketing Hub" page `323247aa-0d7b-81a5-b85d-ce421c959f3b`. If banner persists, the access-grant blocker is the only remaining issue.
2. On real-data confirm: dispatch code-reviewer + ux-auditor in parallel.
3. Phase D (P0 automations) ready when Phase C signed off. Still requires splitting `reads/marketing-ig.js` per-DB first (395/400 hard cap).
4. `.env.example` patch I provided earlier — only `MCC_POSTS_DB_ID=` line still relevant (Dan can add it whenever MCC Posts DB is created).

---

## 2026-05-02 15:30 — Env audit (read-only) — IG DB IDs confirmed missing from local .env

**What Was Accomplished:** Dan asked "notion env already set up right? n local?" Audited `.env` keys (no values exposed). Confirmed: `NOTION_TOKEN` set ✅; all 5 IG-playbook DB IDs (`IG_PERFORMANCE_DB_ID`, `HOOK_PATTERN_LOG_DB_ID`, `TEMPLATE_LIBRARY_DB_ID`, `APPROVALS_LOG_DB_ID`, `WEEKLY_OPS_LOG_DB_ID`) absent ❌; `MCC_POSTS_DB_ID` absent ❌. Provided Dan with paste-able 6-line block (real DB UUIDs from NOTION-SETUP.md, MCC blank for now). On dev-server restart `/ig` view should populate if server NOTION_TOKEN integration has YDS Marketing Hub access; if banner persists post-restart, that confirms the access-grant blocker rather than env.

**Key Decisions:** None. Pure audit + handoff.

**What To Do Next:**
1. Dan to paste the 5 IG DB IDs into `.env`, restart dev server, reload `/ig`.
2. If banner clears → Phase C real-data verification done; ready for code-reviewer + ux-auditor + Phase D.
3. If banner persists → grant server NOTION_TOKEN integration access to "YDS Marketing Hub" page `323247aa-0d7b-81a5-b85d-ce421c959f3b`.
4. All other in-flight loops from prior 15:25 entry unchanged.

---

## 2026-05-02 15:25 — Phase C shipped — new `/ig` view (IG Playbook) — awaiting Dan UI test

**What Was Accomplished:** Per Dan's "go" → built brand-new `/ig` view ("IG Playbook") instead of embedding in `/marketingOps` (which would have forced 3-file refactor first). Frontend-builder delivered: (1) [src/js/modules/ig.js](src/js/modules/ig.js) — 199 lines, Alpine state slice + 6 parallel fetchers + helpers (formatSwps, swpsTone, igPillarClass, igIsEnvEmpty); (2) [src/css/views/ig.css](src/css/views/ig.css) — 363 lines, full styles under soft cap; (3) [public/partials/ig.html](public/partials/ig.html) — 346 lines, 8-section view (header / SWPS hero / kill-rule alerts / ad candidates / weekly ops / posts table / hooks catalog / templates catalog) under soft cap; (4) [src/js/modules/command-shell.js](src/js/modules/command-shell.js) +2 lines (registered in `partialViews` + `initIg()` branch); (5) [src/js/app.js](src/js/app.js) +2 lines (LAZY_MODULE_FACTORIES + view-style map); (6) [public/index.html](public/index.html) +11 lines (Growth-group sidebar button at line 178, view panel at 571-578, mobile drawer at 1168-1170).

All endpoints already existed from Phase B — no backend work. SWPS hero color-codes by 3.5% target (green/amber/red). Kill-rule banner only renders if `killRuleTriggerCount > 0`; sibling "Clear" card balances the 2-col grid otherwise. Hook + template catalogs collapsed by default. Pillar colors match NOTION-SETUP.md §4 option colors verbatim. Default empty state when env vars not set: amber banner pointing at NOTION-SETUP.md §7 + per-section empty messages (page is fully functional, just empty). Lint clean, 1036/1036 tests pass.

**Key Decisions:** 1 logged to decisions.md (#99). Highlights: (a) chose new `/ig` view over embed-in-marketingOps to avoid forced 3-file refactor; (b) `igIsEnvEmpty()` checks rows across all 6 fetches (not "all 6 empty") so partial env setup doesn't confuse the banner.

**What To Do Next:**
1. **Dan to manually test `/ig`** before reviewer dispatch (per his standing pref). Specific checks: (a) navigate Growth → IG Playbook, expect "0 posts this week · SWPS —" subtitle initially; (b) without env vars, amber NOTION-SETUP.md §7 banner appears; (c) with env vars set, SWPS hero color-codes; (d) Hook Pattern Catalog expand chevron rotates; (e) Template Library expand same; (f) posts-table SWPS column tints by tone, Hit Target shows ✓/✗; (g) Refresh button clears + reloads all 6 fetches; (h) mobile drawer route works.
2. **On Dan's confirm:** dispatch `code-reviewer` + `ux-auditor` in parallel (per CLAUDE.md "independent review agents can run as parallel foreground calls").
3. **Phase D (P0 automations):** A1+A2+A3, ~4-6 hrs, requires splitting `reads/marketing-ig.js` per-DB first (at 395/400 hard cap). Pending Dan's go after C is signed off.
4. **Pre-existing blockers unchanged:** env-var patch, server NOTION_TOKEN access, smoke test.

---

## 2026-05-02 15:05 — Phase C blocked on architecture pick (no code changes)

**What Was Accomplished:** Started Phase C (frontend IG sections). Discovered `/marketingOps` surface is 3-for-3 over file-discipline hard caps: `public/partials/marketingOps.html` 1761 lines (3.5× the 500 cap), `src/js/modules/marketing-ops.js` 1085 (2.2× over), `src/css/views/marketingOps.css` exactly 600 (at cap). Per file-discipline.md "next change MUST be a split — no exceptions" — adding IG sections in-place forces splitting all 3 files first (full session of pure mechanical refactor, nothing visible to Dan). Surfaced architectural pivot to Dan with recommendation: build IG as its own `/ig` view (sidebar entry "IG Playbook" under Growth, mirror `/mcc` separation pattern). Awaiting Dan's thumb.

**Key Decisions:** None made — pending Dan's pick between (a) new `/ig` view (recommended, ~3 hrs, no forced refactor) or (b) embed in `/marketingOps` (~6+ hrs, splits 3 files first).

**What To Do Next:**
1. Dan picks: new `/ig` view OR embed-in-marketingOps (latter forces split work first).
2. On thumb: dispatch frontend-builder with chosen scope.
3. All Phase B blockers from prior 14:55 entry unchanged — env-var patch, server NOTION_TOKEN access, smoke test.

---

## 2026-05-02 14:55 — Marketing-system Phases A+B shipped (5 DB readers + 9 endpoints + additive CC validators)

**What Was Accomplished:** Per Dan's "go" pacing, executed Phases A+B of the marketing-system wire-up off [docs/marketing/NOTION-SETUP.md](docs/marketing/NOTION-SETUP.md) (5 new IG-playbook DBs created 2026-05-02).

**Phase A (foundation, read-only):** (1) Verified all 5 new DBs reachable via Notion MCP — fetched live schemas confirming property-name parity with NOTION-SETUP.md §4.1–4.5. (2) Updated [.claude/docs/notion-hub.md](.claude/docs/notion-hub.md): added 5 rows to DATABASE MAP table + 5 detail subsections in PROPERTY REFERENCE with property/type/options tables (`Verified: 2026-05-02 via Notion MCP` stamps). (3) `.env.example` patch surfaced for Dan to apply manually — project deny rule (`Edit(.env.*)`) blocks me. Code-reviewer PASS (one false-positive path concern verified false).

**Phase B (backend reads, delegated to backend-builder):** Shipped: (1) [server/services/notion/reads/marketing-ig.js](server/services/notion/reads/marketing-ig.js) — 395 lines (AT 400 hard cap), 5 raw readers using existing cache+retry+`simplify()` infrastructure with rollup/formula handling for SWPS/Hit Target/Pillar/Hook Pattern/Format. (2) [server/services/marketing-ig-service.js](server/services/marketing-ig-service.js) — 171 lines composition layer with derived fields (`avgSWPS`, `hitTargetCount`, `killRuleTriggerCount`, ISO-week range helpers). (3) [server/routes/marketing-ig.js](server/routes/marketing-ig.js) — 181 lines, 9 GET endpoints under `/api/marketing-ops/ig` (`/performance` [+this-week, +ad-candidates], `/hooks`, `/templates`, `/approvals` [+kill-rule-triggers], `/weekly-ops` [+latest]) with input validation. (4) Additive validator extension on [server/routes/marketing-ops.js](server/routes/marketing-ops.js) POST/PATCH `/content` — accepts new optional `igPillar`/`hookPattern`/`publishedSlot` fields without disturbing old `VALID_CONTENT_PILLARS`. (5) 5 env-var-gated DB ID constants in `notion/databases.js` (returns `null` if env unset → `requireDbId()` throws clear pointer to NOTION-SETUP.md §7). (6) 349-line unit test file. Lint clean, 1036/1036 tests pass. Code-reviewer PASS, no changes requested.

**Key Decisions:** 4 logged to decisions.md (#95–98). Highlights: (a) phased wire-up A→D for blast-radius control; (b) marketing-ig.js as NEW file (marketing-ops.js already at 312, over 250 soft cap); (c) additive-only CC validators (old + new pillar enums coexist); (d) env-var-gated DB constants with throw-at-request-time pattern.

**What To Do Next:**
1. **Dan blockers (must do before Phase C real-data dev):** (a) apply 6-line env-var patch to `.env.example` (full block in transcript above); (b) populate `.env` locally + Vercel with real IDs; (c) confirm server's `NOTION_TOKEN` integration has access to "YDS Marketing Hub" page `323247aa-0d7b-81a5-b85d-ce421c959f3b` (different integration than the MCP one I verified with).
2. **Smoke test once env is set:** `curl http://localhost:3000/api/marketing-ops/ig/weekly-ops/latest`. Any endpoint returns `[]` or 500 w/ friendly env-missing error if env unset.
3. **Phase C (frontend, ~3-4 hrs):** frontend-builder adds IG sections to `/marketingOps` view (this-week SWPS card, ad candidates, kill-rule alerts, weekly ops log, hook + template browsers). **Awaiting Dan's pick** on whether to start now against empty-state shapes, or wait until env confirmed for real-data dev loop.
4. **Phase D (P0 automations, ~4-6 hrs):** A1 (CC Published → IG Performance row), A2 (CC Brand Review → Approvals Log), A3 (Friday cron → Weekly Ops Log). Will require splitting `reads/marketing-ig.js` per-DB first (at 395/400 hard cap).
5. **scribe doc-pass deferred:** new endpoints not yet in `app-reference.md`/`tech-brief.md`. Batch with Phase C completion.
6. All in-flight loops from earlier 14:20/13:40/13:10 entries unchanged.

---

## 2026-05-02 14:20 — NOTION-SETUP.md surfaced for review (read-only, no changes)

**What Was Accomplished:** Dan pointed to [docs/marketing/NOTION-SETUP.md](docs/marketing/NOTION-SETUP.md) "for marketing pages." Read the full 367-line tech-handoff doc and summarized for Dan: 15 marketing DBs total (9 pre-existing strategic/ops + 5 new IG-playbook DBs created 2026-05-02 + MCC Posts already wired); 5 new env vars required (`IG_PERFORMANCE_DB_ID`, `HOOK_PATTERN_LOG_DB_ID`, `TEMPLATE_LIBRARY_DB_ID`, `APPROVALS_LOG_DB_ID`, `WEEKLY_OPS_LOG_DB_ID`); 6 automations needing wire-up (A1–A3 P0, A4–A5 P1, A6 P2). Surfaced 5 candidate next-step actions: (1) wire env vars + Vercel; (2) update `.claude/docs/notion-hub.md` with the 5 new DB rows; (3) implement A1 `Published → IG Performance row`; (4) build `/marketing` view that reads SWPS / ad candidates / weekly ops; (5) verify Notion integration access against `5959753f-b4ff-4b7a-9d16-c4e1ec46a811`. Awaiting Dan's pick.

**Key Decisions:** None. Read-only context-load — no code, env, or Notion writes.

**What To Do Next:**
1. Dan to pick one of the 5 candidate actions above (or redirect — "for marketing pages" was ambiguous: read it, build a UI from it, or hand it to an agent).
2. All in-flight loops from prior 13:40 + 13:10 entries unchanged: EA brief format pick, MCC OAuth path A/B/C, MCC Posts DB creation + bundled deploy.

---

## 2026-05-02 13:40 — EA briefing assembled (read-only, no code changes)

**What Was Accomplished:** Dan asked for "a structured, accurate breakdown of app, components, n data links for my ea." Built the briefing from authoritative sources only — no guessing: (1) read `.claude/AGENT_PRIMER.md` (auto-generated, current as of commit c1aee8b) for routes/modules/Notion DBs/Sheets keys; (2) grep'd `public/index.html` for the 5 sidebar nav-groups + their button labels to mirror exactly what the EA will see in the UI. Delivered a 5-section markdown brief: (1) plain-English what-it-is + how-it-works one-liner; (2) the 5 nav groups (Command/Operations/Growth/Strategy/Systems) with screen lists + purpose; (3) data links — 19 Notion DBs + 13 Google Sheets + GitHub/Anthropic/Vercel/MCC OAuth integrations; (4) critical patterns (approval gate, SSE streaming, read-model layer in flight, auto-built docs); (5) repo layout for engineer cross-reference; (6) current focus snapshot (Phase 1 read-model migration + MCC Phase 1 + open-loops pointer). Closed with format question — PDF / Notion page / Google Doc / non-technical trim — awaiting Dan's pick.

**Key Decisions:** None. Pure information assembly from existing primers.

**What To Do Next:**
1. Dan to pick destination format (PDF / Notion page / Google Doc / non-technical version) for the EA brief.
2. All in-flight loops from the prior 13:10 entry remain unchanged: MCC Posts DB creation + OAuth path pick (A/B/C) + bundled deploy still pending.

---

## 2026-05-02 13:10 — MCC Phase 1 wired end-to-end + docs reviewed + OAuth gap diagnosed (uncommitted)

**What Was Accomplished:** Took /mcc from "untracked scaffolding" to "renders styled, kanban + composer functional, empty state correct." Three coordinated workstreams in this session:

1. **CSS leaf created (12:50).** Caught runtime bug — [src/js/app.js:127](src/js/app.js#L127) registered `mcc: 'mcc'` in lazy view-style map but neither `src/css/views/mcc.css` nor the built copy existed. Frontend-builder created [src/css/views/mcc.css](src/css/views/mcc.css) (486 lines, 14 sections: outer wrapper, OAuth bar, kanban with 5 status-color top borders, post cards, card-actions, platform badges, composer modal + grid, form primitives, preview panel, responsive). Built output 6,917 bytes. Zero collisions on the 6 form primitives across `src/css/`. Form-primitive-in-leaf is a deliberate placement (no second consumer yet — premature abstraction to move to core.css; logged to open-loops).

2. **3-bug wiring fix (13:10).** Dan reported "/mcc not loading." Diagnosed: scaffolding authored against a `mccModule.X` Alpine namespace that the merge pattern (`Object.assign(this, mod)` at [src/js/app.js:398](src/js/app.js#L398)) doesn't expose — daily-sales/google-ads/d2c partials all have **0** hits for `*Module.`. Fixed: (a) added `'mcc'` to `partialViews` at [src/js/modules/command-shell.js:74](src/js/modules/command-shell.js#L74) so `_loadPartial('mcc')` fires; (b) added `else if (action === 'mcc') this.initMcc();` at [src/js/modules/command-shell.js:130](src/js/modules/command-shell.js#L130); (c) rewrote 39 `mccModule.X` refs in [public/partials/mcc.html](public/partials/mcc.html) to direct property access. Live verified: served partial has 0 `mccModule` refs, `/api/mcc/{status,posts,platforms}` all 200, MCC Posts DB exists and is empty. 1014/1014 tests pass, lint clean.

3. **docs/marketing/ review (12:15).** Read all 5 files (README/SETUP/ARCHITECTURE/API/USER_GUIDE) against actual code. Surfaced 1 bug + 5 inconsistencies + 3 nits. **Bug:** [SETUP.md:46-55](docs/marketing/SETUP.md#L46-L55) instructs hardcoding the DB ID at `read-model.js` line 8 with `const MCC_POSTS_DB_ID = '...'` — but actual code at [server/services/mcc/read-model.js:13](server/services/mcc/read-model.js#L13) reads from env. Step 2 should be deleted; line number is also stale. Inconsistencies: README ✅+(stub) for OAuth, API.md POST /posts approval-gated claim needs verification, ARCHITECTURE "read-model pattern" terminology collides with Phase 1 cross-domain layer, SETUP notion-hub.md two-step trap, USER_GUIDE OAuth flow missing prereq pointer.

**Read/write surface delivered:** Full inventory provided to Dan covering every Notion DB read/written, env var consumed, external HTTP call (currently zero — IG/LI `.post()` is a stub), and state-machine transitions. Phase 1 reality: drafts/scheduling/status writes all hit Notion for real; **OAuth + actual social-network publishing are stubs** — `getToken`/`storeToken` at [publisher.js:30-50](server/services/mcc/publisher.js#L30) are TODO no-ops; the documented Instagram/LinkedIn Tokens DBs in SETUP.md have **no code** reading or writing them; `instagram.js`/`linkedin.js` `.post()` synthesize a placeholder ID without HTTP calls.

**OAuth "Invalid app ID" diagnosis (final issue).** Dan clicked "Connect" — Meta returned "Invalid app ID." Reproduced server-side: auth URL is `client_id=` (empty) because `INSTAGRAM_APP_ID`/`INSTAGRAM_APP_SECRET`/`LINKEDIN_CLIENT_ID`/`LINKEDIN_CLIENT_SECRET` not set in `.env`. Even with creds set, OAuth still won't complete because token-storage path is stubbed. **Awaiting Dan's pick** between three paths: (A) hide/disable Connect buttons until Phase 2, ~5 min — recommended; (B) server-side guard with friendly error, ~10 min; (C) wire Phase 2 OAuth fully — hours, needs Meta/LinkedIn dev apps + token DBs + encrypt/decrypt with `SOCIAL_TOKEN_KEY`.

**Key Decisions:** None new — bug fix + scaffolding completion follow established patterns (lazy-module merge, file-discipline file-size caps, premature-abstraction rule for form primitives). Two minor frontend-builder agent deviations flagged to open-loops: (a) `x-if="!mccLoading || mccPosts"` truthiness guard at mcc.html:36/43 — `mccPosts=[]` is truthy, so loading skeleton never shows (functional fine, polish issue); (b) unrequested 🚀/🗑️ → HTML-entity cleanup at lines 68/71.

**Doc shipped (13:25): [docs/marketing/NOTION-SETUP.md](docs/marketing/NOTION-SETUP.md)** — 187 lines, 7 sections. Authoritative DB-setup doc that supersedes SETUP.md §1-2 (which has the hardcoded-line-8 bug). Phase 1 needs only §1 (MCC Posts DB schema with all 11 properties cross-linked to source-code line numbers), §2 (one env var, no file edits), §3 (notion-hub.md update for AGENT_PRIMER discovery), §7 (8-step verification checklist). §4-6 (Token DBs, OAuth dev apps, Vercel prod env) are honest "Phase 2 — no code reads/writes this yet, skip in P1" sections. Two schema gotchas explicitly called out: Status options must include the hyphens verbatim (`awaiting-approval` not `Awaiting Approval`), Media URLs is rich_text storing JSON, not Notion's URL or Files property. Pre-flight inventoried exact Notion property names from [drafter.js:30-35,118-154](server/services/mcc/drafter.js#L30) and [read-model.js:57-67](server/services/mcc/read-model.js#L57) — schema is grep-verified against current code, not invented from memory.

**What To Do Next:**
1. Dan creates the MCC Posts DB per NOTION-SETUP.md §1, sets `MCC_POSTS_DB_ID` per §2, runs §7 checklist. Total ~15 min.
2. Dan picks OAuth path (A hide buttons / B server-side guard / C wire P2 fully). Recommended: A.
3. Dan picks docs/marketing/ remediation. NOTION-SETUP.md now exists, so §1-2 of SETUP.md should either be deleted or rewritten to point at the new doc.
4. After Dan visually confirms /mcc renders correctly: dispatch code-reviewer + ux-auditor in parallel.
5. Truthiness guard tweak: `!mccPosts` → `!mccPosts.length` at mcc.html:36/43 — deferred polish.
6. Bundled deploy still pending: mcc.css + mcc wiring + docs/marketing/ (now incl. NOTION-SETUP.md) + earlier inline-style migrations + cell-truncate utilities + cockpit fix + sidebar scrollbar + `/api/*` 404 handler.
7. Deferred tech debt: dashboard.css (691) + google-ads.css (672) splits; mcc.css form-primitive migration to core.css when 2nd composer view ships.

---

## 2026-05-02 06:15 — dashboard/techTeam/overview inline-style migration shipped — 26 styles → 8 classes + new overview.css (uncommitted)

Selective extraction across 3 partials. dashboard.css 676→691 (+3 classes: `dashboard-skeleton-stat`, `dashboard-skeleton-chart`, `dashboard-ml-auto`), techTeam.css 414→425 (+2: `tech-empty-text`, `tech-meta-text`), new [src/css/views/overview.css](src/css/views/overview.css) 24 lines (3 classes). Registered overview at `_viewStyleFile()` map [src/js/app.js:119](src/js/app.js#L119). Inline-style counts: dashboard 47→38, techTeam 17→11, overview 16→5. Build clean, 1014/1014 tests, lint clean. Trimmed 3 zero-gain spacing utilities from initial proposal. **Decisions:** None new — mechanical extraction following marketingOps/ops/daily-sales pattern. **Next:** Dan hard-refresh /dashboard, /tech-team, /overview; dashboard.css split (691→target 4-6 leaves) deferred — bundle with google-ads.css (672) split when next view-CSS work lands.

## 2026-05-02 05:30 — daily-sales.css split shipped — 2836 → 1 shim + 10 leaves (uncommitted)

[src/css/views/daily-sales.css](src/css/views/daily-sales.css) reduced from 2836 lines to an 18-line `@import` shim. 10 leaves at [src/css/views/daily-sales/](src/css/views/daily-sales/): base (412), filter-strip (387), lens (493), mtd-channel (232), trends (193), mix (118), top-states (103), todays-orders (393), concerns (293), data-quality (254). FILE-MAP.md with public-exports table, per-file Owns/DO-NOT-add lines, dep graph, constraining-decisions pointer. esbuild's `bundle: true` inlines @imports natively — single bundled `public/css/views/daily-sales.css` (40367 bytes) preserves the public API. 4 misplacement clusters caught + fixed across 2 builder passes + manual finishing. **Decision #90** logged. **Next:** Dan hard-refresh `/daily-sales`; daily-sales.html inline-style migration (22 instances) now unblocked.

## 2026-05-02 05:10 — ops.html inline-style migration (Set 2) shipped (uncommitted)

Migrated ~30 inline-style instances in [public/partials/ops.html](public/partials/ops.html) to 11 named classes appended to [src/css/views/ops.css:159-209](src/css/views/ops.css#L159-L209). 82 total `ops-*` class applications. ops.css 156→210 lines. code-reviewer APPROVED. **Next:** Dan hard-refresh `/ops` (5 tabs).

## 2026-05-02 04:35 — marketingOps.html inline-style migration shipped (uncommitted)

Migrated 28 inline-style instances in [public/partials/marketingOps.html](public/partials/marketingOps.html) to 7 named classes added at [src/css/views/marketingOps.css:560-600](src/css/views/marketingOps.css#L560-L600). marketingOps.css now at **exactly 600 lines (hard cap)** — next addition requires split first. **Next:** Dan hard-refresh `/marketing-ops`.

## 2026-05-02 03:15-04:10 — Cockpit fix + cell-truncate utilities (uncommitted)

(03:15) Moved `.mktops-area-metrics` grid rule from `views/marketingOps.css` to [src/css/core.css:10542-10546](src/css/core.css#L10542-L10546) so /dashboard cockpit cards sit side-by-side. (04:10) Added `.cell-truncate` + `.flex-row-tight` utilities at [src/css/core.css:2505](src/css/core.css#L2505); migrated 9 inline-style instances across ops/actionQueue/commitments. **Next:** Dan hard-refresh /dashboard.

## 2026-05-02 02:40 — `/api/*` 404 JSON handler — fixed (uncommitted)

Added a JSON 404 scoped to `/api` before the SPA fallback at [server.js:177-183](server.js#L177-L183). **Decision #89** logged. **Next:** Bundled deploy pending.

## 2026-05-02 07:59
**Accomplished:** Marketing Notion DB audit/plan request — read existing `docs/marketing/NOTION-SETUP.md` (MCC-only scope), ARCHITECTURE.md, and IG Playbook §3 ops spec from marketing-team workspace. Confirmed gap: 9 marketing DBs registered in marketing-team CLAUDE.md + 5 IG-playbook DBs spec'd-but-unbuilt vs current setup doc which only covers MCC Posts. Presented 3-phase Clarity Gate plan (Audit → Plan → Execute) to Dan; awaiting answer on scope question (augment vs replace existing NOTION-SETUP.md) before proceeding to read-only Phase A.
**Decisions:** none — gated on Dan's reply.
**Next:** On Dan's "go" + scope answer: run Phase A (read-only schema audit of 9 existing marketing DBs via Notion MCP), return diff proposal, then Phase C writes + final tech-handoff doc.

## 2026-05-02 14:15
**Accomplished:** Marketing Notion system map shipped end-to-end. Audited 9 existing marketing DBs; created 5 new DBs (Hook Pattern Log, Template Library, Approvals Log, Weekly Ops Log, IG Performance) under YDS Marketing Hub; extended Content Calendar with `Pillar (IG)` / `Hook Pattern` / `Published Slot` selects + 4 auto-back-relations; added `Decisions ↔ Campaigns` relation; expanded Campaigns Owner enum (+Evergreen, Closer, Wire, Nik); wired SWPS / Hit Target / Week Of formulas on IG Performance with workarounds for two Notion 2.0 limits; seeded one EXAMPLE row per new DB; verified IG Performance row via re-fetch (formulas evaluating). Restructured `docs/marketing/`: moved 5 MCC files into `mcc/` subfolder, renamed old `NOTION-SETUP.md` → `mcc/POSTS-DB.md`, wrote new top-level `NOTION-SETUP.md` (21KB, 11 sections — DB inventory, relation graph, schemas, formula caveats, 6 automations, env vars, cheat-sheet, setup checklist), updated `README.md` to index new structure. Fixed 6 relative paths in moved POSTS-DB.md (../../ → ../../../).
**Decisions:**
- (D-91) Use separate `Pillar (IG)` SELECT on Content Calendar instead of expanding existing `Content Pillar` enum — keeps IG taxonomy independent from cross-channel taxonomy. Why: 5 IG pillars don't map cleanly to existing 6 (Education/Social Proof/Product/BTS/Community/Promotional). Reversal cost: low (drop column).
- (D-92) Inline SWPS math inside `Hit Target` formula instead of `prop("SWPS") >= 0.035`. Why: Notion 2.0 errors on `Type error with formula` when one formula references another via prop() in a comparison. If SWPS formula renames, must update Hit Target's inlined copy too.
- (D-93) `Week Of` formula uses flat `YYYY-MM-DD` instead of ISO `YYYY-WW`. Why: Notion's formatDate doesn't accept `WW` token and there's no `week()` function. Workaround: use Notion's built-in "Group by Week" view filter on Published Date.
- (D-94) Augment, not replace: `docs/marketing/NOTION-SETUP.md` is now the marketing-system index; the old MCC-only doc preserved as `mcc/POSTS-DB.md`. Why: MCC code path is wired to live env var; renaming the file would have been gratuitous churn.
**Next:** Tech (Wire/Nirmal) to wire 6 automations per § 6 of new NOTION-SETUP.md (A1+A2+A3 are P0, unblock daily IG ops once playbook ships Apr 13). Add 5 env vars per § 7. Manually delete EXAMPLE seed rows in 5 new DBs before going live. Set IG Performance.SWPS display format to Percent in Notion UI. Build 5 IG Performance views (This Week / Ad Candidates / By Pillar / Rolling 30-day / Misses) per IG Playbook §3.4.

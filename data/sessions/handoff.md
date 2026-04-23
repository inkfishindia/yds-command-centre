# Session Handoff — Command Centre

## Last Session: 2026-04-23

## What Was Accomplished

Built the **Dan ↔ Colin Queue** view end-to-end against Notion DB `00969f07-8b4d-4c88-8a45-ec1e95b3bacb` (title: "Dan ↔ Colin Queue"). Schema verified via Notion MCP before building: Body(title), Answer(text), Recommendation(text), Section(select: 🔥 Now / ⚡ Waiting on You / 📥 Drop / 👀 Watch / ✅ Closed), Owner(Colin/Dan), Status(Open/Resolved/Archived), Focus Area(relation → 66ca7a48...), Created/Updated.

**Design spec** (design-planner, Haiku) → [design-system/dan-colin-queue.md](design-system/dan-colin-queue.md). Mapped spec's light-mode hex palette onto existing dark-theme tokens (`--amber`, `--red`, `--accent`, `--text-secondary`); added one new `--amber-muted` for 👀 Watch. 17px mobile body, 14px italic Rec: line, 2s answer debounce → 1.5s fade-to-✅ animation, FAB 56×56 safe-area-aware, bottom-sheet composer with 300ms cubic-bezier slide-up, all motion respects `prefers-reduced-motion`.

**Backend** (backend-builder, Sonnet):
- [server/services/dan-colin-service.js](server/services/dan-colin-service.js) — `getQueue()`, `submitAnswer()` (auto-closes ⚡ rows when answer goes empty→non-empty), `createDrop()` (Section=📥, Owner=Colin, Status=Open). 5-min cache, invalidates on writes.
- [server/routes/dan-colin.js](server/routes/dan-colin.js) — `GET /api/dan-colin`, `POST /api/dan-colin/:id/answer`, `POST /api/dan-colin/drop`. Both writes go through SSE + approval gate (reuses `POST /api/chat/approve` for resolution).
- Mounted at [server.js:130](server.js#L130).
- [test/dan-colin-service.test.js](test/dan-colin-service.test.js) — 16/16 pass (mocked Notion, no live calls). Full suite 764/764.
- [.claude/docs/app-reference.md](.claude/docs/app-reference.md) updated with the new view.

**Frontend** (frontend-builder, Sonnet):
- [src/js/modules/dan-colin.js](src/js/modules/dan-colin.js) — Alpine module factory: state (danColin, draft answers, saving/saved/exiting maps, sheet state, toast), `loadDanColin()`, `answerDebounce()` + `submitAnswer()` (reuses `_addApprovalWithTimer` from chat module), `openDropSheet()`/`submitDrop()`, toggle helpers.
- [public/partials/dan-colin.html](public/partials/dan-colin.html) — 5 sections mobile-first, desktop 60/40 two-column ≥768px. FAB, drop sheet with disabled voice/attach stubs ("coming soon" tooltip — no transcription infra yet).
- [src/css/views/dan-colin.css](src/css/views/dan-colin.css) — section-accent left borders, slide-fade-to-✅ keyframes, FAB + bottom sheet styling.
- Nav entry added in [public/index.html](public/index.html) (Command group).
- `npm run build` clean, new chunk `dan-colin-QCILC3QT.js` emitted.

## Key Decisions

- **#13**: Verified Notion DB schema via MCP before building (per `.claude/rules/api-schemas.md`). Schema matched spec exactly — proceeded without modification.
- **#14**: Kept the Dan ↔ Colin view on the existing dark theme rather than the light `#FAFAFA` in the spec. Reason: light island inside a dark app causes context loss; all other section colors map cleanly onto existing tokens.
- **#15**: Voice + attach buttons rendered as disabled stubs. Spec calls them out but no transcription backend exists; stubbing preserves surface fidelity without blocking the ship.
- **#16**: Drop-create routes through the approval gate same as answers, even though Dan is dropping into his own assistant's queue. Consistency with the "all writes gated" rule beats the marginal friction; can add auto-approve later if annoying.
- **#17**: Paused the pipeline before `ux-auditor` / `tester` at Dan's instruction — he tests the UI himself first. Saved as a feedback memory for future UI work.

## Optimization note (for next session)

Dan asked about reducing agent token overhead. Three levers identified: (1) **use `SendMessage` to continue agents across pipeline steps** instead of respawning — biggest win, not currently doing this; (2) tighten `.claude/agents/*.md` pre-flight to lean harder on `AGENT_PRIMER.md` rather than re-reading CLAUDE.md + rules + app-reference + MASTER on every spawn; (3) orchestrator-provided context bundles (handoff artifacts) so downstream agents skip source re-reads. Recommendation to Dan: start with #1 on next review/docs pass; #2 is a one-session cleanup if he greenlights it.

## What To Do Next

1. **Dan manually tests `/dan-colin` in browser** — verify loading, approval flow on answer + drop, mobile 375px vs desktop 1024px layout, FAB + bottom sheet UX.
2. **After test**: `code-reviewer` on backend (service + routes + approval SSE pattern) and frontend (SSE handling, Alpine reactivity, exit-row timing). Use SendMessage to keep the reviewer warm across both.
3. **After review**: `scribe` to update `.claude/docs/tech-brief.md` (app-reference already updated by backend-builder).
4. **Deferred**: pull-to-refresh (native feel, non-blocking), voice-transcription backend, auto-approve on drops.
5. If Dan greenlights the agent optimization: tighten the 7 `.claude/agents/*.md` pre-flights to trust `AGENT_PRIMER.md` (regenerated at every `npm run build`).

## Previous Session: 2026-04-08 ~20:15 IST


---

## Earlier sessions

Previous handoff detail (2026-04-08 Vercel env audit, null-deref fix, cache diagnosis; 2026-04-22 System Map build, schema capture) trimmed — full history in git: `git log data/sessions/handoff.md`.

## 2026-04-23 — Tab navigation bug fix
**Accomplished:** Diagnosed and fixed "pages not loading when switching between tabs." Root cause: 12 nav buttons in `public/index.html` (5 desktop sidebar + 7 mobile bottom-nav/drawer) used the legacy `view = 'X'; loadX()` pattern. Setting `view` directly bypasses `openNavigationTarget()`, which is the only path that calls `_loadPartial()` to inject the partial HTML and `_ensureModule()` to initialize the lazy module. Affected views: chat, dashboard, actionQueue, decisions, knowledge — all rendered an empty container after navigation since the partial container at `public/index.html:273-426` is just a skeleton until a partial is fetched into it. Fix was 12 single-line `@click` swaps; verified zero `@click="view = ` remain in the file. No JS changes — `openNavigationTarget()` already does the right thing in [src/js/modules/command-shell.js:72-119](src/js/modules/command-shell.js#L72-L119).
**Decisions:** None — straightforward bug fix, used the existing routing helper rather than introducing new logic.
**Next:** (a) Dan to refresh browser and confirm chat / dashboard / action queue / decisions / knowledge tabs render. (b) Same `view = 'X'` bypass pattern lives in command-palette actions in [src/js/modules/command-shell.js:233-235](src/js/modules/command-shell.js#L233) ("New Commitment", "New Decision") — not currently breaking because they piggyback on already-loaded views, but worth a follow-up sweep. (c) Pending from prior sessions: dashboard manual test + scribe + tester for v2 Dan↔Colin; `notion.js:983-986` silent-swallow patch; `api-schemas.md` tightening; pre-existing lint errors in 3 test files.

## 2026-04-23 04:57
**Accomplished:** Executed the agent-efficiency plan #2 (pre-flight tightening) + #1 (SendMessage pattern) flagged in the prior handoff. (1) Stripped redundant `Read CLAUDE.md` from 7 agent pre-flights (backend-builder, code-reviewer, design-planner, devops-infra, frontend-builder, scribe, tester) — CLAUDE.md is already inlined via `claudeMd` system context, so re-reading it was pure waste. Made `tech-brief.md` conditional in scribe. Tightened primer-first messaging so agents know the primer replaces grepping for route/module inventory. Line count across 9 agents: 834 → 829 (-5), but real per-spawn token saving is ~3–8k from avoiding the CLAUDE.md re-read + speculative grep/read calls. (2) Added a new "Continue agents across pipeline steps via `SendMessage`" rule to CLAUDE.md's Dispatch rules with a full worked example (backend-builder → spawn code-reviewer → SendMessage on subsequent frontend diff, same pattern for scribe). (3) Audited `scripts/generate-agent-primer.mjs` coverage against the 5-requirement gap analysis (routes, modules+state, Notion DBs+schemas, sheets, last 3 sessions). Found one partial gap (Alpine state shape — primer shows exports only, not inner state/methods) but correctly mitigated by the primer's footer pointer to `app-reference.md` which scribe maintains as the full inventory. No generator changes needed. Regenerated primer: 379 lines, 21.2 KB, commit 36064ee. Tests 764/764 pass. Lint errors (5) are pre-existing in files I did not touch.
**Decisions:** Two new — see #29 and #30 in decisions.md.
**Next:** (a) Dan still has the pending Dan↔Colin manual test + code-reviewer/scribe pipeline from the 2026-04-23 handoff — now cheaper thanks to these changes. (b) Optional: extend the primer generator to parse Alpine state shape from `createXModule()` factories via AST if the app-reference.md pointer turns out to be insufficient in practice. (c) Optional: fix pre-existing lint errors in `test/dan-colin-service.test.js`, `test/integration/system-map-http.test.js`, `test/system-map.test.js` (5 `no-unused-vars` errors). (d) Optional: diagnose flaky `test/projection-job-store.test.js` — fails on first run with `expected 1 got 4` assertion error, clean on rerun (likely test-isolation bug).

## 2026-04-23 13:40 — Dan ↔ Colin Queue v2 UI/UX pass

**Accomplished:** Full v2 improvement pass on the live `/dan-colin` view. Pipeline: design-planner (Haiku) → frontend-builder (Sonnet) → code-reviewer (Haiku) → 2 critical fixes → code-reviewer re-verify → APPROVED. Stopped before ux-auditor/tester per Dan's standing rule.

**Design spec v2** → [design-system/dan-colin-queue-v2.md](design-system/dan-colin-queue-v2.md) (552 lines, deltas-only; references v1 for anything unchanged). Resolved 5 open questions with defaults: scroll+expand on chip tap, deterministic focus-area hash, view-scoped keyboard only, center-modal cheatsheet, 3d stale threshold.

**10 improvements shipped** (all in [src/js/modules/dan-colin.js](src/js/modules/dan-colin.js), [public/partials/dan-colin.html](public/partials/dan-colin.html), [src/css/views/dan-colin.css](src/css/views/dan-colin.css)):
1. Body/Rec/Answer typographic hierarchy (line-height 1.6, rec contrast bumped).
2. Sticky `.dc-chip-nav` (mobile only, IntersectionObserver scroll-spy, smooth-scroll + expand on tap).
3. Age pills replace timestamps; `--stale` red variant for ⚡ rows >3d.
4. 6px focus-area colour dot + 8-colour deterministic hash + collapsible legend.
5. View-scoped keyboard layer: `j`/`k`/`Enter`/`a`/`Esc`/`⌘K`/`?` cheatsheet modal. Mount/unmount clean.
6. Enriched empty states; Drop gets dashed-border + inbox icon.
7. Closed section count promoted to muted pill chip.
8. 3s slow-network neutral toast ("Notion is slow…") with auto-dismiss on resolve.
9. Inline saving microstate: debounce-dot → "Saving…" → "✓ Saved" right of textarea.
10. FAB 20px inset + safe-area; hides on answer-textarea focus via Alpine state.

**Two critical fixes after first code-review** (both flagged as blockers, both verified fixed on re-review):
- FAB hide selector rewritten: original `.dc-body:has(.dc-answer-textarea:focus) .dc-fab` was broken (`.dc-fab` is sibling of `.dc-body`, not descendant). Replaced with Alpine `:class="dcAnswerFocused && 'dc-fab--hidden'"` + `@focus`/`@blur` on the textarea. Reduced-motion branch keeps the state toggle without transition.
- `dcUnmount()` now clears `_dcDebounceTimers` so pending 2s debounce timers don't POST against an unmounted view.

**Build:** `npm run build` clean. JS chunk hash QCILC3QT → NZ3JAQTS → HRN2CRSM (two rebuilds). No new lint errors in touched files. No backend/server changes.

## Key Decisions this session

- **#32**: Spec the v2 as `design-system/dan-colin-queue-v2.md` (deltas only) instead of rewriting v1. v1 stays authoritative for unchanged specs; v2 only documents the 10 improvements. Keeps the spec surface small and auditable.
- **#33**: Use Alpine state (`dcAnswerFocused`) + `:class` binding to hide the FAB on answer focus, instead of the spec's pure-CSS `:has()` selector. Root cause: `.dc-fab` is a DOM sibling of `.dc-body`, not a descendant, so `:has()` was a no-op. Alpine also gives us state awareness for future features (e.g. "FAB reappears 200ms after blur").
- **#34**: Resolved design-planner's 5 open questions with defaults rather than blocking on Dan, per his "use your judgment" standing rule. Defaults captured in the frontend-builder brief so they're auditable.

## What To Do Next

1. **Dan manually tests `/dan-colin`** on mobile (375px) and desktop. Focus checks: chip nav scroll-spy, age pill stale variant on old ⚡ rows, focus dot colour stability across reloads, `⌘K` + `?` shortcuts, drop empty-state box, FAB hide on answer focus.
2. **After Dan's pass**: run `ux-auditor` (visual/consistency check) + `scribe` (update `.claude/docs/app-reference.md` + `tech-brief.md` for v2 state additions: `dcAnswerFocused`, `dcFocusedRowIndex`, `dcCheatsheetOpen`, `dcChipNav.activeSection`, slow-network timer, focus-area hash helper).
3. **Optional**: `tester` to cover the keyboard handler mount/unmount and the debounce-timer cleanup (both previously broken, now fixed — regression-worthy).
4. **Deferred from prior session** (still pending): patch `server/services/notion.js:983-986` so `queryDatabase` doesn't silently swallow 403/404 — cost ~20min of diagnosis on 04-23 morning. Update `.claude/rules/api-schemas.md` to require live row-query alongside schema fetch when hardcoding a DB ID.
5. **Not self-verifiable** by this session: slow-network toast (needs devtools throttling), `prefers-reduced-motion` behavior (needs devtools media emulation), scroll-spy `rootMargin: -84px` tuning on short sections.

## 2026-04-23 12:58
**Accomplished:** Read-only audit of dashboard stack (service → route → module → template). Verified claims with grep. Flagged 6 optimizations ranked by impact: #1 memoize render-path getters in [dashboard.js:370-522](../../src/js/modules/dashboard.js#L370-L522) (`getDashboardSavedViewItems`, `getDashboardPriorityCards` rebuild on every Alpine render inside `x-for` at [dashboard.html:104](../../public/partials/dashboard.html#L104) and [:120](../../public/partials/dashboard.html#L120)); #2 consolidate 3-fetch waterfall at [dashboard.js:70-74](../../src/js/modules/dashboard.js#L70-L74) by bundling pipeline into `getDashboardPayload()`; #3 coordinate backend caches in dashboard-service.js; #4 add in-flight guard to auto-refresh interval; #5 deduplicate `capacityLabel` (exists in both backend and frontend); #6 state-shape leakage (raw Notion payload bound to template). Explicitly rejected Explore agent's "orphaned methods" claim — `openFocusAreaView`/`loadFocusArea`/`openPersonView`/`loadPersonView`/`getCapacityLabel` are all live (used in `dashboard.html:446`, `team.html`, `personView.html`, crm.js, marketing-ops.js, command-shell.js).
**Decisions:** none — awaiting Dan's go-ahead before implementing.
**Next:** Dan to confirm whether to kick off #1 + #2 as a full-stack pass (backend-builder bundles pipeline into dashboard payload → frontend-builder memoizes getters + consumes new shape → code-reviewer). Rest of items are cleanup that can ride along or defer.

## 2026-04-23 13:30
**Accomplished:** Shipped dashboard optimizations #1-#4 from the 12:58 audit via batched agents (backend-builder → frontend-builder → self-review after code-reviewer hit rate limit). **Backend** (`server/services/dashboard-service.js` + `server/read-model/dashboard.js`): (a) `getDashboardPayload()` now fires a 4th parallel promise `sheetsService.getPipelineData()` and adds `pipeline` as a new top-level key — `null` on unavailable/error, degrades gracefully; `/api/sheets/pipeline` route preserved for direct callers. (b) Added 60s top-level cache on full dashboard payload; sub-caches preserved; existing `clearCache()` extended to null out top-level cache — all write-path invalidation hooks work automatically. Test 764/765 (1 pre-existing flake). **Frontend** (`src/js/modules/dashboard.js` + `public/partials/dashboard.html`): (a) `loadDashboard()` now fires 2 parallel fetches instead of 3 — reads bundled `this.dashboard.pipeline`; `loadPipeline()` kept as escape hatch. (b) Memoized 3 render-path getters (`getDashboardSavedViewItems`, `getDashboardPriorityCards`, `getActivityFeedItems`) via `_cachedSavedViewItems`/`_cachedPriorityCards`/`_cachedActivityFeedItems` state slots + `_invalidateDashboardCaches()` helper. Invalidation wired at 5 sites: `loadDashboard()` finally, `loadActionQueue()` finally, `loadMorningBrief()` finally, `applyDashboardSavedView()`, `toggleOverdueGroup()`. (c) Template guard merged — removed dead `x-if="pipeline && !pipeline.available"` branch (backend normalizes false→null), changed `x-if="pipeline && pipeline.available"` → `x-if="pipeline"`. Frontend +21 LOC. `npm run build` clean, 765/765 tests, 0 new lint errors. **Self-review verified** (code-reviewer agent hit Opus rate limit at 7pm IST): memoization coverage is clean — every source-state mutation that affects a cached getter is invalidated; `loadPipeline()`'s pipeline write needs no invalidation since no memoized getter reads `this.pipeline`. Template null-safety clean — all `pipeline.*` dereferences guarded.
**Decisions:** Deferred optimization #5 (capacityLabel dedup) — crosses into person-detail-service, broader scope than this pass. Deferred #6 (state-shape leakage) — requires template-wide refactor. Kept `loadPipeline()` instead of deleting — unused now but valid escape hatch at near-zero cost.
**Next:** (a) Dan to manually test dashboard at http://localhost:3000 — verify pipeline card renders (or shows "unavailable" gracefully), all 4 priority-card tones still correct under different data states, saved-view switching still works (today/overdue/waiting/overloaded tabs), auto-refresh doesn't double-fire. Per standing rule, `ux-auditor` and `tester` will NOT run automatically. (b) After Dan confirms: resume `code-reviewer` via `SendMessage` to `ab7754c9ea6b70b4b` after Opus resets 7pm IST, OR re-spawn on Sonnet if reviewer definition allows. (c) Then: `scribe` to update `.claude/docs/app-reference.md` (dashboard payload now includes `pipeline` key) + `tester` for cache-hit/cache-miss integration test. (d) Backend-builder reported the new `dashboard-service.test.js` cache test is minimal (only asserts `clearCache()` doesn't throw) — tester should add proper invalidation-after-write coverage. (e) Flag for separate session: `.claude/rules/frontend-patterns.md` says "no build step" — contradicts current architecture where `src/js/modules/*` compiles to `public/js/*`. Rules file is stale; CLAUDE.md is authoritative. Scribe cleanup.

## Previous Session: 2026-04-23 07:45

## 2026-04-23 07:45
**Accomplished:** Dan attempted manual test of Dan↔Colin Queue and hit "Failed to load queue." Three-stage diagnosis: (1) stale dev server (started 00:26, before the route was added at line 130 of server.js) returning SPA fallback for `/api/dan-colin` — fixed by restart. (2) After restart, endpoint returned `200 { counts: {total: 0} }` with empty arrays — Notion error was being silently swallowed by `server/services/notion.js:983-986` (`queryDatabase` catches all errors and returns `{ results: [] }` — a latent bug worth fixing separately). Direct curl to Notion API exposed the real error: `object_not_found` for DB `00969f07-8b4d-4c88-8a45-ec1e95b3bacb`, integration `Rube`. (3) After Dan connected Rube to what he thought was the right DB, still 404 — Notion `/v1/search` revealed the actual "Dan ↔ Colin Queue" DB ID is `43d71386-85a1-4582-a2dd-6d541bdcc5d3`, not `00969f07...`. The original ID yesterday's build used was mis-transcribed at spec time — schema matched perfectly but the ID pointed at a non-existent DB. Fixed hardcoded DB_ID in `server/services/dan-colin-service.js:5` (comment) + `:21` (constant), updated assertion in `test/dan-colin-service.test.js:377` to match. After final restart: `/api/dan-colin` returns 20 real rows (now: 2 · waiting: 4 · drop: 0 · watch: 7 · closed: 7).
**Decisions:** One new — see #31 in decisions.md.
**Next:** (a) Dan to reload `/dan-colin` and complete manual UI test (approval flow on answer, drop sheet UX, mobile vs desktop layout). (b) `scribe` pass: `.claude/docs/app-reference.md` still references the wrong DB ID `00969f07` in two places (lines 5 + 126) — trivial fix but scribe-owned. (c) Worth patching `server/services/notion.js:983-986` so `queryDatabase` doesn't silently swallow 403/404 — should propagate as thrown error, let caller decide. This cost us ~20 minutes of diagnosis today. (d) Update `.claude/rules/api-schemas.md` to require BOTH schema verification AND a live row-query when hardcoding a DB ID, not just schema fetch — would have caught this at build time.

## 2026-04-23 14:12
**Accomplished:** Fixed tab-navigation bug — switching to chat / dashboard / actionQueue / decisions / knowledge rendered empty containers. Root cause: 12 nav buttons in `public/index.html` (5 desktop sidebar + 7 mobile bottom-nav/drawer) used the legacy `view = 'X'; loadX()` pattern, bypassing `openNavigationTarget()` which is the only path that calls `_loadPartial()` to inject partial HTML and `_ensureModule()` to init the lazy module. Replaced all 12 with `openNavigationTarget('X')`; verified zero `@click="view = ` remain. Confirmed dev server (pid 89467) serves the patched HTML — `openNavigationTarget('chat')` appears 3× in served response.
**Decisions:** none
**Next:** (a) Dan hard-refreshes (Cmd+Shift+R) and clicks each affected tab to confirm. (b) Same bypass pattern lives in command-palette "New Commitment" / "New Decision" actions at [src/js/modules/command-shell.js:233-235](src/js/modules/command-shell.js#L233) — not currently breaking (commitments view typically loaded), but worth a follow-up sweep. (c) All carry-overs from prior sessions still pending (notion.js silent-swallow, api-schemas tightening, Dan↔Colin v2 scribe/tester, dashboard manual test, lint cleanup in 3 test files).

---

## 2026-04-23 15:12
**Accomplished:** Scanned ERP app at `~/Downloads/copy-of-your-design-lab_-erp`, picked 3 features to port. #1 shipped: System Map now has a "Views & Status" section — parses `public/index.html` for all `view === 'X'` expressions, cross-references a 24-entry `VIEW_REGISTRY` in `server/services/system-map-service.js`, returns `views[]` with `functional | beta | mock | unknown` status + file-existence checks (`hasPartial`, `hasModule`). Frontend renders collapsible card grid with status pills, search-filter, count badge. +5 backend tests, 13/13 system-map tests pass. `npm run build` clean. #2 (UTM Builder in Marketing Ops) and #3 (Activity Feed on Dashboard backend) launched as background builder agents (af4ec43914987e316, af52ea4c187317b0b) — not yet returned.
**Decisions:** none — scoping choices only (skip orders/production/AI-studio/workspace integrations from ERP as out-of-scope; skip design-planner + ux-auditor + tester per standing instruction).
**Next:** Wait for background builder agents. Then fire frontend-builder for #3 dashboard feed integration (needs backend endpoint shape), then code-reviewer across #2+#3. Dan to visually test #1 now.

## 2026-04-23 16:45
**Accomplished:** Shipped #2 (UTM Builder in Marketing Ops — new "UTM Builder" tab, localStorage-persisted presets at `yds.utmPresets`, live URL preview + copy, frontend-only) and #3 (Activity Feed — new `GET /api/activity-feed?days=N` endpoint merging decisions + commitments + Dan↔Colin resolutions with 60s cache + per-source graceful degradation; new section on Dashboard with 7d/14d/30d/90d chips, source health banner, Notion page links). Combined build: 2 new server files, 1 new test file (+14 tests), 3 partials modified, 3 modules modified, 3 CSS files modified. Full suite 784/784. `npm run build` clean. code-reviewer verdict: PASS WITH NOTES — all 14 gates pass (CommonJS, approval-gate N/A, Notion-via-service, no SSE-leak, Alpine-clean, dark-tokens, no state clobber, error handling, cache keys, input validation, no regressions, security, a11y, tests).
**Decisions:** none material — pipeline choices only (skipped design-planner + ux-auditor + tester per standing instruction; used code-reviewer as quality gate).
**Next:** Dan to visually test: reload app → System Map view (new Views & Status section), Marketing Ops → UTM Builder tab, Dashboard (scroll to Recent Activity). Non-blocking cleanup: (1) days-clamping is duplicated in both route and service — could deduplicate to route-only; (2) old `recentActivity` widget at `dashboard.html:602` is now superseded by new Activity Feed at line 774 — consider removing the old one once Dan confirms new one covers the use case.

## 2026-04-23 18:01
**Accomplished:** Answered Dan's question on how to push live to Vercel. Confirmed project is already linked (`.vercel/project.json` → team_kjWMf99NLuEVb2PisA6evobt / prj_DolL9DEtxJ6yKYkudRIL62EMYLCw / yds-command-centre), `vercel.json` routes all requests through `server.js` via `@vercel/node`. Vercel CLI not installed locally. Gave two options: (A) `git push` if Git integration is connected, or (B) `npm i -g vercel && vercel --prod`. Flagged three pre-deploy checks: ~40 modified files + many untracked in working tree (Dan↔Colin routes, system-map, schema scripts, activity feed, UTM builder) — confirm intent before shipping; env vars needed in Vercel dashboard (ANTHROPIC_API_KEY, NOTION_TOKEN, plus anything the new routes read); `npm run build` is not wired into vercel.json — `public/js/chunks/*` must be committed or the build step added. No code changes this session.
**Decisions:** none
**Next:** Dan to decide deploy path (A or B) and confirm working-tree state before shipping. If deploying: verify env vars in Vercel dashboard and confirm built chunks in `public/js/chunks/` are current (`npm run build` first if unsure).

# Open Loops

Work started but not completed. SessionStart surfaces these first.

| Date | Loop | Context | Status | Age |
|------|------|---------|--------|-----|
| 2026-04-08 | App Split & Optimization | Phase 1 shipped; Phase 2 complete; Phase 3 started with `core.css` plus lazy view CSS for factory, registry, knowledge, marketing ops, tech team, BMC, CRM, ops, and Claude usage | In Progress | 0d |
| 2026-04-08 | x-show→x-if verification | 14 views converted, reviewers never returned results | Pending | 0d |
| 2026-04-08 | Activity log cleanup | ~150 stale `file-write \| unknown` entries from Mar 26–31 | Pending | 13d |

---

## App Split & Optimization Plan (Proposed 2026-04-08)

### Phase 1: JS Code Splitting (completed 2026-04-08)
- Replace hand-rolled bundler (`scripts/build-assets.mjs`) with **esbuild** (`splitting: true`)
- `npm install --save-dev esbuild`
- **Core bundle (eager):** app.js shell, dashboard, chat, command-shell, overview, toasts, detail-drawer, inline-actions, notion-browser, markdown (~120 KB → ~35 KB gzip)
- **13 lazy chunks (on navigation):** bmc, crm, factory, marketing-ops, ops, tech-team, competitor-intel, projects, claude-usage, documents, team, registry, commitments
- Change `LAZY_MODULE_FACTORIES` (app.js:33-48) → dynamic `import()` paths
- Make `_ensureModule` (app.js:224) async, add `await` in `openNavigationTarget` (command-shell.js:72)
- Change `<script>` tag in index.html to `<script type="module">`

### Phase 2: HTML Partial Extraction (completed 2026-04-08)
- Existing shell partials retained in `public/partials/` (dashboard, factory, marketingOps, ops, bmc, techTeam)
- Extracted inline views: chat, overview, actionQueue, focusArea, team, personView, docs, notion, knowledge, decisions, projects, registry, commitments, crm, claude-usage
- `partialViews` in `command-shell.js` now covers the extracted views and partial loading is cached/re-initialized safely
- `index.html` reduced substantially, with only shared shell/modals/overlays left inline

### Phase 3: CSS Splitting
- Started 2026-04-08:
  `src/css/core.css` now carries the eager shell/shared UI styles
  `src/css/views/{view}.css` now exists for factory, registry, knowledge, marketing ops, tech team, BMC, CRM, ops, and Claude usage
  `public/index.html` now loads `/css/core.css`
  Lazy view CSS is loaded on first navigation via `app.js`
- Remaining work:
  move the rest of the view-specific CSS out of the legacy monolith and retire `src/css/styles.css` as the source snapshot

### Phase 4: Build Pipeline Polish
- Content hashing → `app.[hash].js`, `styles.[hash].css`
- Generate `public/manifest.json` with hashed filenames
- Template hashed names into index.html at build time
- Cache headers: `max-age=31536000` for hashed assets
- esbuild watch mode for dev

### Phase 5: Backend Cleanup (minor)
- Extract cache middleware (server.js:28-66) → `server/middleware/cache-control.js`
- Add partial-specific cache headers for `/partials/*.html`
- Optional: auto-load routes from `server/routes/` directory

### Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| Initial JS (gzip) | ~80 KB | ~35 KB |
| index.html | 3,924 lines | ~260 lines |
| CSS initial load | 216 KB | ~60 KB core |
| Console errors | 246 | 0 |
| Build time | ~200ms | ~50ms |

### Key Files to Touch
- `scripts/build-assets.mjs` — rewrite bundler
- `src/js/app.js` — dynamic imports, async _ensureModule
- `src/js/modules/command-shell.js` — extend partialViews, await _ensureModule
- `public/index.html` — extract views, change script tag
- `src/css/styles.css` — split into core + views
- `package.json` — add esbuild devDependency

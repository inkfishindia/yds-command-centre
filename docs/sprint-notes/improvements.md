# Sprint Backlog — Frontend & Architecture Improvements

Logged: 29-Apr-2026

## Priority 1 (High) — Extract Monolithic app()

**Problem:** `src/js/app.js` is 1,873 lines — a single Alpine component with all state, routing, partial loading, notification system, keyboard nav, global filters, etc. tangled together. The `Object.assign` lazy-module pattern pollutes the shared namespace (any module can overwrite another's state).

**Recommendation:** Split `app()` into composable stores:
- `createNavigationStore()` — view switching, partial loading, URL routing
- `createNotificationStore()` — browser notifications, quiet hours, digest, center
- `createDataFetchStore()` — request abort/management, auto-refresh intervals
- `createGlobalFilterStore()` — owner/focus-area/mode context filters

Each store returns a clean object with its own state slice and methods. The main `app()` just composes them: `...createNavigationStore(), ...createNotificationStore(), ...`

## Priority 2 (High) — Unified View Registry

**Problem:** Three separate maps must be kept in sync for every new view:
- `LAZY_MODULE_FACTORIES` (l.39-58) — module import factories
- `_viewStyleFile()` (l.104-121) — CSS file mapping
- `_partialViewClass()` (l.195-220) — DOM container class mapping

Adding a view requires updating all three. This is fragile and easy to forget.

**Recommendation:** Single declarative registry:
```js
const VIEW_REGISTRY = {
  'daily-sales': {
    module: () => import('./modules/daily-sales.js').then(m => m.createDailySalesModule()),
    style: 'daily-sales',
    container: 'daily-sales-view',
  },
  // ... all views
};
```

## Priority 3 (Medium) — Frontend Test Suite

**Problem:** Zero tests for 27 frontend modules (82KB built JS). The 3 failing backend tests suggest test hygiene could slip further.

**Recommendation:** Add DOM-based smoke tests for critical paths:
- Navigation (view switching works)
- Notification center (open, dismiss, snooze)
- Dashboard rendering (data renders without errors)
- Lazy module loading (partial fetch + Alpine init)

## Priority 4 (Medium) — Eliminate Stub State Boilerplate

**Problem:** Lines 244-327 are ~80 lines of manually maintained stub declarations. Every new module's properties must be declared here or Alpine throws binding errors. Easy to miss when adding state.

**Recommendation:** Use Alpine's `$el` attribute-based initialization or a proxy wrapper so modules declare their own state without central stubs. Alternatively, auto-generate stubs from module factory return values.

## Priority 5 (Low) — CSS Loading Strategy

**Problem:** 300KB of CSS across per-view files, loaded on-demand via `document.createElement('link')`. Causes flash-of-unstyled-content while stylesheet loads.

**Recommendation:** Bundle critical CSS inline or use a single CSS file with view-scoped selectors. Remove the dynamic `_ensureViewStyles()` infrastructure (~50 lines).

## Priority 6 (Low) — TypeScript

**Problem:** Complex nested state shapes (union status types, nested payload objects) with no type safety. The `Object.assign` pattern makes this harder to retrofit.

**Recommendation:** Introduce TypeScript incrementally — start with service interfaces and API DTOs, then module state shapes. Use `.d.ts` files before converting files to `.ts`.
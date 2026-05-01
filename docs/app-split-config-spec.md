# YDS Command Centre — App Split Config Spec

**Status:** DRAFT — for Dan + Tech review
**Author:** OpenCode CLI scan of existing codebase
**Date:** 2026-05-01

---

## Principle

Every view is a self-contained unit. The shell only orchestrates — it does not own view logic. Backend (`server/`) is the stable contract. Frontend views are dumb display layers.

---

## 1. Current State

```
src/js/app.js             1,879 lines  ← monolith
src/js/modules/            39 files    ← 11,867 lines (already well split)
public/partials/            26 files    ← view HTML
src/css/                    3 files + 14 per-view CSS files
```

**Problems:**
- `app.js` holds all shared state (nav, notifications, SSE, global filters, keyboard nav, data fetches) tangled with view stubs
- 3 separate maps must stay in sync for every new view: `LAZY_MODULE_FACTORIES` + `_viewStyleFile()` + `_partialViewClass()`
- ~80 lines of manually maintained empty stub declarations
- No URL ↔ view sync
- Frontend-patterns.md rule is stale ("no build step" but build exists)
- 12,240 lines of frontend JS have zero tests

---

## 2. Proposed Structure

```
app/                          ← replaces src/js/ + public/partials/
│   ├── shell. js              ← Shell: nav, notifications, SSE, keyboard
│   ├── shell. css             ← Shell: nav, toasts, layout, theme vars
│   ├── router. js             ← View switching + URL ↔ view sync
│   ├── registry. js           ← Single declarative map (THE source of truth)
│   │
│   ├── stores/              ← NEW: composable stores
│   │   ├��─ navigation. js    ← currentView, partial loading, view switching
│   │   ├── notifications. js← toasts, digest, quiet hours, center
│   │   ├── filters. js     ← owner/focus- area/mode/global context
│   │   ├── data. js      ← request management, auto-refresh intervals
│   │   └── session. js   ← conversation history, pending approvals
│   │
│   └── views/
│       ├── dashboard/
│       ├── daily-sales/
│       ├── marketing-ops/
│       ├── tech-team/
│       ├── commitments/
│       ├── crm/
│       ├── ops/
│       ├── factory/
│       ├── bmc/
│       ├── chat/
│       ├── dan-colin/
│       ├── d2c/
│       ├── competitor-intel/
│       ├── notion-browser/
│       ├── registry/
│       ├── projects/
│       ├── team/
│       ├── claude-usage/
│       ├── google-ads/
│       ├── system-map/
│       ├── system-status/
│       ├── overview/
│       ├── documents/
│       ├── decisions/
│       └── focus-area/
│
public/                      ← Static assets (built output)
    ├── js/
    │   └── app. js          ← Built from app/ shell + stores + router
    └── css/
        ├── shell. css        ← Built from app/ shell. css
        └── views/           ← Built from app/ views/*/ view. css
```

Each view directory:
```
views/daily-sales/
├── module. js     ← createDailySalesModule() — the Alpine data factory
├── view. html    ← Partial HTML
├── view. css    ← View- specific styles
└── meta. json   ← View metadata
```

---

## 3. Registry — Single Source of Truth

```js
// app/registry. js
import { createDailySalesModule }   from './views/daily-sales/module. js';
import { createMarketingOpsModule } from './views/marketing-ops/module. js';
// ... all 27 views

export const VIEW_REGISTRY = {
  'dashboard': {
    module:    () => ({ ...createDashboardModule() }),
    viewHtml:  'views/dashboard/view. html',
    css:      'views/dashboard/view. css',
    route:    'dashboard',
    label:    'Dashboard',
    icon:     '📊',
    navGroup: 'main',
    priority: 'high',
    fetchOnEnter: ['/api/read-models/dashboard'],
  },
  'daily-sales': {
    module:    () => createDailySalesModule(),
    viewHtml:  'views/daily-sales/view. html',
    css:      'views/daily-sales/view. css',
    route:    'daily-sales',
    label:    'Daily Sales',
    icon:     '💰',
    navGroup: 'main',
    priority: 'high',
    fetchOnEnter: ['/api/ops/sales'],
  },
  'marketing-ops': {
    module:    () => createMarketingOpsModule(),
    viewHtml:  'views/marketing-ops/view. html',
    css:      'views/marketing-ops/view. css',
    route:    'marketing-ops',
    label:    'Marketing Ops',
    icon:     '📣',
    navGroup: 'main',
    priority: 'medium',
    fetchOnEnter: ['/api/marketing-ops/tasks'],
  },
  // ... one entry per view
};
```

Adding a new view now = update ONE file (registry. js) instead of 3 maps in `app. js`.

---

## 4. Router

```js
// app/router. js
import { VIEW_REGISTRY } from './registry. js';

export function switchView(viewName, opts = {}) {
  const entry = VIEW_REGISTRY[viewName];
  if (!entry) return;

  // 1. Load CSS if not yet loaded
  // 2. Load HTML partial if not yet loaded
  // 3. Mount module into Alpine scope
  // 4. Update URL hash
  // 5. Fire fetchOnEnter if set
}

export function initRouter() {
  // Read initial view from URL hash or default to 'dashboard'
  // Listen for popstate → switchView
  // Register nav button handlers from registry
}
```

---

## 5. Module Factory Contract

Every `module. js` MUST export:

```js
// Required
export function createDailySalesModule() {
  return {
    // State
    viewData: {},
    viewLoading: false,
    viewError: null,

    // Lifecycle
    init() {},      // runs once on mount
    destroy() {},   // cleanup on unmount

    // ... view-specific state + methods
  };
}
```

Lifecycle hooks (optional):
```js
export function createDailySalesModule() {
  return {
    ...createBaseModule(),

    async onEnter() {
      // auto-fetch data, start intervals
    },

    onLeave() {
      // cancel fetch, clear intervals
    },
  };
}
```

---

## 6. View Meta Contract

```js
// views/daily-sales/ meta. json
{
  "id":          "daily-sales",
  "label":       "Daily Sales",
  "description": "Sales performance, product mix, channel breakdown",
  "icon":        "💰",
  "navGroup":    "main",           // main | ops | tech | knowledge | admin | dan-colin
  "priority":    "high",           // high | medium | low
  "routes":      ["daily-sales"],
  "readsFrom": [
    "/api/ops/sales",
    "/api/read-models/ops"
  ],
  "writesTo": []
}
```

Nav is generated from `meta. json` entries. No separate nav config.

---

## 7. View Groups

| Group | Views | Priority |
|-------|-------|----------|
| **Main** | dashboard, overview, commitments, chat | High |
| **Ops** | ops, daily-sales, factory, bmc | High |
| **Marketing** | marketing-ops, competitor-intel, google-ads, d2c, crm | High |
| **Tech** | tech-team, system-map, system-status | Medium |
| **Knowledge** | notion-browser, documents, registry, projects, team, decisions, focus-area | Medium |
| **Admin** | claude-usage | Low |
| **Dan ↔ Colin** | dan-colin | High |

---

## 8. Shell Contract

The shell (app/shell. js) OWNS:
- Navigation buttons and active state
- Toast notifications (via stores/notifications. js)
- SSE connection (text, tool_use, approval, error, done events)
- Keyboard shortcuts
- Global error handler
- Notification center toggle
- Quiet hours toggle
- Global fetch abort

The shell DOES NOT own:
- Any view-specific state
- Any view-specific methods
- Any view-specific data

---

## 9. Stores Detail

### stores/navigation. js
```js
export function createNavigationStore() {
  return {
    currentView: 'dashboard',
    viewCache: {},          // loaded module instances
    htmlCache: {},          // loaded partial HTML
    cssLoaded: {},          // which CSS files are in the DOM

    async loadView(name) {
      const entry = VIEW_REGISTRY[name];
      await loadCss(entry.css);
      await loadHtml(entry.viewHtml);
      const module = await entry.module();
      return mountModule(module);
    },
  };
}
```

### stores/notifications. js
```js
export function createNotificationStore() {
  return {
    toasts: [],
    quietHoursActive: false,
    digestPending: false,

    addToast(msg, type) { ... },
    showDigest() { ... },
  };
}
```

### stores/filters. js
```js
export function createFilterStore() {
  return {
    owner: null,
    focusArea: null,
    mode: 'all',      // all | active | overdue
    globalSearch: '',

    setFilter(key, val) { ... },
    clearFilters() { ... },
  };
}
```

### stores/data. js
```js
export function createDataStore() {
  return {
    pendingRequests: new Map(),

    async fetchWithAbort(url, opts) {
      const ctrl = new AbortController();
      this.pendingRequests.set(url, ctrl);
      try {
        return await fetch(url, { ...opts, signal: ctrl.signal });
      } finally {
        this.pendingRequests.delete(url);
      }
    },

    cancelAll() {
      this.pendingRequests.forEach(ctrl => ctrl.abort());
    },
  };
}
```

---

## 10. Build Config

```js
// scripts/build-app. mjs (NEW — replaces build-assets. mjs)
import { VIEW_REGISTRY } from '../app/registry. js';

for (const [name, entry] of Object. entries(VIEW_REGISTRY)) {
  // 1. Bundle entry.module() → public/js/views/{name}. js
  // 2. copy entry.viewHtml  → public/html/{name}. html
  // 3. copy entry.css      → public/css/views/{name}. css
}

// Bundle all of app/ (shell + stores + router + registry)
// → public/js/app. js
// Shell-level CSS bundle → public/css/shell. css
```

Each view ships as a lazy bundle. Shell is tiny (~300 lines).

---

## 11. What Changes for Devs

| Before | After |
|--------|-------|
| Edit `app. js` (1,879 lines) | Edit `app/views/daily-sales/module. js` |
| Update 3 separate maps for new view | Edit `app/registry. js` (ONE file) |
| Add stub to `app. js` for every module | Module declares its own state |
| `src/js/` + `public/partials/` split | `app/views/{name}/` co-locates everything |
| `npm run build` (opaque) | Build is generated from registry |
| No URL routing | URL hash ↔ view sync |

---

## 12. Migration Phases

| Phase | Action | Risk | Effort |
|-------|--------|------|--------|
| **1** | Create `app/` directory. Move `src/js/modules/` → `app/views/{name}/module. js`. Move `public/partials/*. html` → `app/views/{name}/view. html`. Move `src/css/views/*. css` → `app/views/{name}/view. css`. | Low | 1 day |
| **2** | Write `app/registry. js` — maps all 27 views | Medium | 2-4 hrs |
| **3** | Write `app/router. js` — reads registry, handles view switching + URL sync | Medium | 2-4 hrs |
| **4** | Write `app/stores/` — extract navigation + notifications + filters + data + session from `app. js` | High | 1 day |
| **5** | Slim `app/shell. js` to ~300 lines by removing view stubs + store methods | High | 1 day |
| **6** | Write `meta. json` per view | Low | 2-3 hrs |
| **7** | Write TypeScript `.d. ts` for registry + stores | Medium | 2-3 hrs |
| **8** | Write frontend smoke tests (3-5 key flows) | Low | 1 day |

**Phase 1-3 can ship in 1 sprint.** Phase 4-8 in the next.

---

## 13. Decisions Needed (Open Questions)

**A. Factory export name?**
- Option 1: Rename all to `createModule()` — cleaner, 27 renames upfront
- Option 2: Keep `createXxxModule()` — less initial work

**B. CSS strategy?**
- Option 1: Single shell bundle — one HTTP request, zero FOUC, simplest build
- Option 2: Per-view lazy CSS — more requests, but views own their assets

**C. TypeScript upfront?**
- Option 1: Write `.d. ts` files before Phase 4 (stores extraction)
- Option 2: Skip — registry stays JS, types added later

**D. Test structure?**
- Keep `test/unit/` + `test/integration/` as-is
- Add `test/e2e/` for frontend smoke tests (view switching, notifications, lazy load)

---

## 14. What Doesn't Change

- `server/` — routes, services, read-models, tools — all unchanged
- Backend API contract — all existing endpoints stable
- `AGENTS. md` / `CLAUDE. md` / rules in `.claude/rules/` — all unchanged
- `package. json` scripts — build command updated to `scripts/build-app. mjs`
- Test files — already reference `server/services/` directly, no change needed
# UI Overhaul — Phase 1: Component Library & Navigation Redesign

**Project:** YDS Command Centre
**Date:** 2026-03-22
**Scope:** Reusable component system + sidebar reorganization
**Stack:** HTML + Alpine.js (SPA) + CSS Variables (no Tailwind)
**Theme:** Dark mode (existing palette)

---

## Design Principles

1. **Information Density** — Pack more data per viewport without clutter
2. **Consistency** — Reusable primitives across all 16+ views
3. **Fast Scanning** — Color, status badges, and typography hierarchy guide the eye
4. **Keyboard & A11y** — All interactions keyboard-accessible, focus states visible
5. **Dark Excellence** — Leverage dark mode for high contrast and reduced eye strain
6. **Alpine.js Native** — No framework overhead; use Alpine directives naturally

---

## Color Reference

Existing CSS variables in `:root` (do not duplicate):

```css
--bg-primary: #0a0a0a          /* Page background */
--bg-secondary: #111111        /* Secondary surfaces (header, input bg) */
--bg-card: #161616             /* Card backgrounds */
--bg-hover: #1c1c1c            /* Hover state */
--bg-input: #1a1a1a            /* Input field background */
--bg-elevated: #1a1a1a         /* Elevated panels/drawers */
--border: #222222              /* Standard border */
--border-light: #2a2a2a        /* Light border (divider) */
--text-primary: #e5e5e5        /* Primary text */
--text-secondary: #888888      /* Secondary text (labels) */
--text-muted: #777777          /* Muted text (hints) */
--accent: #3b82f6              /* Brand accent (blue) */
--accent-dim: #1e3a5f          /* Accent background tint */
--accent-glow: rgba(59, 130, 246, 0.08)  /* Accent glow background */
--green: #22c55e               /* Success color */
--green-dim: #0a3d1f           /* Success background tint */
--amber: #f59e0b               /* Warning color */
--amber-dim: #3d2800           /* Warning background tint */
--red: #ef4444                 /* Danger/error color */
--red-dim: #3d0a0a             /* Danger background tint */
--purple: #a855f7              /* Secondary accent (purple) */
--purple-dim: #2d1854          /* Purple background tint */
--yellow: #eab308              /* Tertiary accent (yellow) */
--yellow-dim: #3d3200          /* Yellow background tint */
--teal: #14b8a6                /* Tertiary accent (teal) */
--teal-dim: rgba(20, 184, 166, 0.1)  /* Teal background tint */
--text-inverse: #fff           /* Inverse text (buttons, overlays) */
```

**No new colors added** — all components use existing palette.

---

## Typography

**Existing Stack:** Inter (body) + IBM Plex Mono (code)

**CSS Variables to add:**

```css
/* Already defined in :root */
--font-ui: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'IBM Plex Mono', 'SF Mono', 'Fira Code', monospace;

/* Scale (optional additions) */
--font-size-xs: 11px;   /* Small labels, hints */
--font-size-sm: 12px;   /* Secondary text */
--font-size-base: 14px; /* Body text (current default) */
--font-size-lg: 16px;   /* Card titles, larger labels */
--font-size-xl: 18px;   /* Section headings */
--font-size-2xl: 20px;  /* Page headings */

/* Font weights */
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
```

---

## Animation Timing

```css
--transition-fast: 150ms ease;     /* Micro-interactions */
--transition-normal: 200ms ease;   /* Standard transitions */
--transition-slow: 300ms ease;     /* Drawer/modal entrance */
```

---

## Spacing Scale

```css
--space-xs: 4px;     /* Tight gaps, icon spacing */
--space-sm: 8px;     /* Small padding */
--space-md: 12px;    /* Default padding (changed from 16px for density) */
--space-lg: 16px;    /* Medium gap */
--space-xl: 24px;    /* Large gap */
--space-2xl: 32px;   /* Section gap */
```

---

## Component Library Specs

### 1. DataCard

**Purpose:** Display a single metric with label, value, trend, and optional sparkline.

**Dimensions:** Variable width (grid), 120px min-height

**CSS Classes:**

```css
.data-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  transition: all var(--transition-normal);
}

.data-card:hover {
  background: var(--bg-hover);
  border-color: var(--border-light);
}

.data-card.accent {
  border-left: 3px solid var(--accent);
}

.data-card.success {
  border-left: 3px solid var(--green);
}

.data-card.warning {
  border-left: 3px solid var(--amber);
}

.data-card.danger {
  border-left: 3px solid var(--red);
}

.data-card-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.data-card-value {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  line-height: 1.2;
}

.data-card-trend {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--font-size-xs);
}

.data-card-trend.up {
  color: var(--green);
}

.data-card-trend.down {
  color: var(--red);
}

.data-card-trend.neutral {
  color: var(--text-muted);
}

.data-card-sparkline {
  height: 20px;
  margin-top: var(--space-xs);
}
```

**Alpine Template:**

```html
<div class="data-card" :class="item.status">
  <span class="data-card-label" x-text="item.label"></span>
  <span class="data-card-value" x-text="item.value"></span>
  <div class="data-card-trend" :class="item.trendDirection">
    <span x-show="item.trendDirection === 'up'">↑</span>
    <span x-show="item.trendDirection === 'down'">↓</span>
    <span x-text="item.trendPercent + '%'"></span>
  </div>
</div>
```

---

### 2. DataTable

**Purpose:** Sortable, scrollable table with status badges, row actions, hover states.

**Columns:** Flexible, header background distinct from rows

**CSS Classes:**

```css
.data-table {
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
  font-size: var(--font-size-sm);
}

.data-table thead {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.data-table th {
  padding: var(--space-md);
  text-align: left;
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  user-select: none;
}

.data-table th:hover {
  color: var(--text-primary);
}

.data-table th.sortable::after {
  content: " ⇅";
  opacity: 0.5;
  font-weight: normal;
}

.data-table th.sorted::after {
  content: " ↓";
  opacity: 1;
}

.data-table tbody tr {
  border-bottom: 1px solid var(--border);
  transition: background var(--transition-fast);
}

.data-table tbody tr:hover {
  background: var(--bg-hover);
}

.data-table td {
  padding: var(--space-md);
  color: var(--text-primary);
}

.data-table td.muted {
  color: var(--text-muted);
}

.data-table-actions {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.data-table tbody tr:hover .data-table-actions {
  opacity: 1;
}

.data-table-empty {
  padding: var(--space-2xl);
  text-align: center;
  color: var(--text-muted);
}

.data-table-loading {
  display: contents;
}

.data-table-loading tr {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

**Alpine Template:**

```html
<table class="data-table">
  <thead>
    <tr>
      <th class="sortable" @click="sort('name')">Name</th>
      <th class="sortable" @click="sort('status')">Status</th>
      <th class="sortable" @click="sort('date')">Due Date</th>
      <th style="width: 40px;"></th>
    </tr>
  </thead>
  <tbody>
    <template x-if="items.length === 0">
      <tr>
        <td colspan="4" class="data-table-empty">
          <p>No items found</p>
        </td>
      </tr>
    </template>
    <template x-for="item in items" :key="item.id">
      <tr>
        <td x-text="item.name"></td>
        <td>
          <span class="status-badge" :class="item.status" x-text="item.statusLabel"></span>
        </td>
        <td x-text="formatDate(item.dueDate)"></td>
        <td>
          <button class="btn-icon context-menu-trigger" @click="openContextMenu($event, item)">⋮</button>
        </td>
      </tr>
    </template>
  </tbody>
</table>
```

---

### 3. StatusBadge

**Purpose:** Colored pill-shaped badge for status indication (success, warning, danger, info, neutral, purple).

**Variants:** `default` (9px height), `small` (6px height)

**CSS Classes:**

```css
.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
  text-transform: capitalize;
  transition: all var(--transition-fast);
}

.status-badge.success {
  background: var(--green-dim);
  color: var(--green);
}

.status-badge.warning {
  background: var(--amber-dim);
  color: var(--amber);
}

.status-badge.danger {
  background: var(--red-dim);
  color: var(--red);
}

.status-badge.info {
  background: var(--accent-dim);
  color: var(--accent);
}

.status-badge.neutral {
  background: var(--border);
  color: var(--text-secondary);
}

.status-badge.purple {
  background: var(--purple-dim);
  color: var(--purple);
}

.status-badge.small {
  padding: 1px 6px;
  font-size: 10px;
}
```

**Alpine Template:**

```html
<span class="status-badge" :class="[item.status, size === 'small' && 'small']" x-text="statusLabel(item.status)"></span>
```

---

### 4. DetailDrawer

**Purpose:** Slide-out panel from right edge containing detailed view of a record.

**Dimensions:** 400px wide, full height from header to bottom

**CSS Classes:**

```css
.detail-drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 40;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition-normal);
}

.detail-drawer-overlay.open {
  opacity: 1;
  pointer-events: auto;
}

.detail-drawer {
  position: fixed;
  right: 0;
  top: 48px;
  bottom: 0;
  width: 400px;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border);
  z-index: 50;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform var(--transition-slow);
}

.detail-drawer.open {
  transform: translateX(0);
}

.detail-drawer-header {
  padding: var(--space-lg);
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.detail-drawer-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.detail-drawer-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 20px;
  padding: 4px;
  line-height: 1;
}

.detail-drawer-close:hover {
  color: var(--text-primary);
}

.detail-drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-lg);
}

.detail-drawer-body::-webkit-scrollbar {
  width: 6px;
}

.detail-drawer-body::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

.detail-drawer-body::-webkit-scrollbar-thumb:hover {
  background: var(--border-light);
}

.detail-drawer-footer {
  padding: var(--space-lg);
  border-top: 1px solid var(--border);
  display: flex;
  gap: var(--space-md);
  flex-shrink: 0;
}

.detail-drawer-section {
  margin-bottom: var(--space-xl);
}

.detail-drawer-section-title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--space-md);
}

.detail-drawer-field {
  margin-bottom: var(--space-md);
}

.detail-drawer-field-label {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  margin-bottom: var(--space-xs);
}

.detail-drawer-field-value {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  word-break: break-word;
}
```

**Alpine Template:**

```html
<!-- Overlay -->
<div class="detail-drawer-overlay" :class="detailDrawerOpen && 'open'" @click="detailDrawerOpen = false" x-cloak></div>

<!-- Drawer -->
<div class="detail-drawer" :class="detailDrawerOpen && 'open'" x-cloak>
  <div class="detail-drawer-header">
    <h2 class="detail-drawer-title" x-text="selectedItem?.name"></h2>
    <button class="detail-drawer-close" @click="detailDrawerOpen = false" aria-label="Close drawer">×</button>
  </div>
  <div class="detail-drawer-body">
    <template x-if="selectedItem">
      <div>
        <div class="detail-drawer-section">
          <div class="detail-drawer-field">
            <div class="detail-drawer-field-label">Status</div>
            <div class="detail-drawer-field-value">
              <span class="status-badge" :class="selectedItem.status" x-text="selectedItem.statusLabel"></span>
            </div>
          </div>
          <div class="detail-drawer-field">
            <div class="detail-drawer-field-label">Due Date</div>
            <div class="detail-drawer-field-value" x-text="formatDate(selectedItem.dueDate)"></div>
          </div>
        </div>
      </div>
    </template>
  </div>
  <div class="detail-drawer-footer">
    <button class="btn btn-secondary" @click="detailDrawerOpen = false">Close</button>
    <button class="btn btn-primary" @click="saveDrawerChanges()">Save</button>
  </div>
</div>
```

---

### 5. LoadingSkeleton

**Purpose:** Shimmer animation placeholder while data loads.

**Variants:** `text-line`, `card`, `table-row`, `stat-card`

**CSS Classes:**

```css
.loading-skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-card) 0%,
    var(--bg-hover) 50%,
    var(--bg-card) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
  border-radius: var(--radius);
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton-text-line {
  height: 14px;
  width: 100%;
  margin-bottom: var(--space-sm);
}

.skeleton-text-line.short {
  width: 60%;
}

.skeleton-card {
  height: 160px;
  border-radius: var(--radius);
}

.skeleton-table-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.skeleton-table-row > div {
  height: 14px;
}

.skeleton-stat-card {
  height: 120px;
  border-radius: var(--radius);
}
```

**Alpine Template:**

```html
<!-- Text skeleton -->
<div class="loading-skeleton skeleton-text-line"></div>

<!-- Card skeleton -->
<div class="loading-skeleton skeleton-card"></div>

<!-- Table row skeleton -->
<div class="skeleton-table-row">
  <div class="loading-skeleton"></div>
  <div class="loading-skeleton"></div>
  <div class="loading-skeleton"></div>
  <div class="loading-skeleton"></div>
</div>
```

---

### 6. EmptyState

**Purpose:** Centered placeholder when a view has no data.

**CSS Classes:**

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-2xl);
  min-height: 300px;
  text-align: center;
  color: var(--text-muted);
}

.empty-state-icon {
  font-size: 48px;
  margin-bottom: var(--space-lg);
  opacity: 0.5;
}

.empty-state-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  margin-bottom: var(--space-sm);
}

.empty-state-subtitle {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  max-width: 300px;
  margin-bottom: var(--space-lg);
}

.empty-state-cta {
  display: inline-block;
}
```

**Alpine Template:**

```html
<div class="empty-state">
  <div class="empty-state-icon">📭</div>
  <h3 class="empty-state-title">No items found</h3>
  <p class="empty-state-subtitle">Create your first item to get started</p>
  <button class="btn btn-primary empty-state-cta" @click="openCreateModal()">Create Item</button>
</div>
```

---

### 7. ContextMenu

**Purpose:** Dropdown triggered by "..." button, positioned relative to trigger, with items, dividers, and danger variants.

**CSS Classes:**

```css
.context-menu-wrapper {
  position: relative;
}

.context-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-elevated);
  min-width: 180px;
  z-index: 100;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-8px);
  transition: all var(--transition-fast);
  overflow: hidden;
}

.context-menu.open {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: background var(--transition-fast);
}

.context-menu-item:hover {
  background: var(--bg-hover);
}

.context-menu-item.danger {
  color: var(--red);
}

.context-menu-item.danger:hover {
  background: var(--red-dim);
}

.context-menu-divider {
  height: 1px;
  background: var(--border);
  margin: var(--space-xs) 0;
}

.context-menu-item-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  opacity: 0.7;
}
```

**Alpine Template:**

```html
<div class="context-menu-wrapper">
  <button class="btn-icon" @click.stop="toggleContextMenu($event, item)" aria-label="Actions menu">⋮</button>
  <div class="context-menu" :class="contextMenuOpen && 'open'" @click.away="contextMenuOpen = false" x-cloak>
    <button class="context-menu-item" @click="editItem(item)">Edit</button>
    <button class="context-menu-item" @click="duplicateItem(item)">Duplicate</button>
    <div class="context-menu-divider"></div>
    <button class="context-menu-item danger" @click="deleteItem(item)">Delete</button>
  </div>
</div>
```

---

### 8. Toast Notification

**Purpose:** Slide-in notification from top-right with auto-dismiss.

**Variants:** `success`, `error`, `info`

**CSS Classes:**

```css
.toast-container {
  position: fixed;
  top: var(--space-lg);
  right: var(--space-lg);
  z-index: 1000;
  pointer-events: none;
}

.toast {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-md) var(--space-lg);
  margin-bottom: var(--space-md);
  display: flex;
  align-items: center;
  gap: var(--space-md);
  box-shadow: var(--shadow-elevated);
  animation: slideIn 300ms ease;
  pointer-events: auto;
  max-width: 320px;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(400px);
    opacity: 0;
  }
}

.toast.exiting {
  animation: slideOut 300ms ease forwards;
}

.toast-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.toast.success .toast-icon {
  color: var(--green);
}

.toast.error .toast-icon {
  color: var(--red);
}

.toast.info .toast-icon {
  color: var(--accent);
}

.toast-message {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  flex: 1;
}

.toast-close {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px;
  line-height: 1;
}

.toast-close:hover {
  color: var(--text-primary);
}
```

**Alpine Template:**

```html
<div class="toast-container">
  <template x-for="toast in toasts" :key="toast.id">
    <div class="toast" :class="[toast.type, toast.exiting && 'exiting']">
      <span class="toast-icon" x-show="toast.type === 'success'">✓</span>
      <span class="toast-icon" x-show="toast.type === 'error'">✕</span>
      <span class="toast-icon" x-show="toast.type === 'info'">ℹ</span>
      <span class="toast-message" x-text="toast.message"></span>
      <button class="toast-close" @click="removeToast(toast.id)">×</button>
    </div>
  </template>
</div>
```

---

## Navigation Redesign

### Structure

Group 16 views into **5 logical domains** with collapsible sections:

| Domain | Icon | Views |
|--------|------|-------|
| **Command** | ⌘ (terminal) | Chat, Dashboard, Action Queue |
| **Operations** | ⚙ (gear) | Projects, Commitments, Registry, Team |
| **Growth** | 📈 (trending-up) | Marketing Ops, CRM, Content Calendar* |
| **Strategy** | 🧭 (compass) | BMC, Decisions, Documents, Knowledge |
| **Systems** | 🔧 (chip) | Tech Team, Factory, Notion Browser, Overview |

*Content Calendar is new (pending dev); placeholder for future expansion.

### Sidebar CSS

**Dimensions:** 72px wide (collapsed), 240px wide (expanded)

```css
.sidebar {
  width: 72px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  padding: var(--space-sm) 0;
  display: flex;
  flex-direction: column;
  transition: width var(--transition-normal);
  overflow: hidden;
}

.sidebar.expanded {
  width: 240px;
}

.nav-section {
  display: flex;
  flex-direction: column;
  margin-bottom: var(--space-lg);
}

.nav-section-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  user-select: none;
  transition: color var(--transition-fast);
  white-space: nowrap;
  overflow: hidden;
}

.nav-section-header:hover {
  color: var(--text-secondary);
}

.nav-section-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.nav-section-toggle {
  margin-left: auto;
  font-size: 12px;
  transition: transform var(--transition-normal);
}

.nav-section.collapsed .nav-section-toggle {
  transform: rotate(-90deg);
}

.nav-section-items {
  display: flex;
  flex-direction: column;
  max-height: 500px;
  overflow: hidden;
  transition: max-height var(--transition-slow), opacity var(--transition-normal);
  opacity: 1;
}

.nav-section.collapsed .nav-section-items {
  max-height: 0;
  opacity: 0;
  pointer-events: none;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  border-left: 3px solid transparent;
  position: relative;
  white-space: nowrap;
  overflow: hidden;
}

.nav-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.nav-btn.nav-active {
  color: var(--accent);
  border-left-color: var(--accent);
  background: var(--accent-glow);
}

.nav-icon-svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-label {
  flex: 1;
  font-size: var(--font-size-sm);
}

.nav-badge {
  background: var(--red);
  color: var(--text-inverse);
  font-size: 10px;
  font-weight: var(--font-weight-semibold);
  padding: 1px 4px;
  border-radius: 2px;
  min-width: 16px;
  text-align: center;
  flex-shrink: 0;
}

.nav-badge-warn {
  background: var(--amber);
}

.nav-section.collapsed .nav-label {
  display: none;
}

.nav-section.collapsed .nav-badge {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
}

/* Bottom spacer and controls */
.nav-spacer {
  flex: 1;
}

.nav-footer {
  display: flex;
  flex-direction: column;
  padding: var(--space-md) 0;
  border-top: 1px solid var(--border);
  gap: var(--space-sm);
}

.nav-footer-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.nav-footer-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.sidebar.expanded .nav-footer-btn {
  justify-content: flex-start;
}
```

### Navigation HTML Structure

```html
<nav class="sidebar" :class="sidebarExpanded && 'expanded'" x-cloak>

  <!-- Command Section -->
  <div class="nav-section" :class="!commandExpanded && 'collapsed'">
    <button class="nav-section-header" @click="commandExpanded = !commandExpanded" aria-label="Toggle Command section">
      <span class="nav-section-icon">⌘</span>
      <span>Command</span>
      <span class="nav-section-toggle">▼</span>
    </button>
    <div class="nav-section-items">
      <button class="nav-btn" :class="view === 'chat' && 'nav-active'" @click="view = 'chat'" title="Chat (⌘K)">
        <svg class="nav-icon-svg" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v6a2 2 0 01-2 2H6l-4 4V5z"/>
        </svg>
        <span class="nav-label">Chat</span>
      </button>
      <button class="nav-btn" :class="view === 'dashboard' && 'nav-active'" @click="view = 'dashboard'; loadDashboard()" title="Dashboard (⌘D)">
        <svg class="nav-icon-svg" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm9 0a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1V4zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm9 0a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-3z"/>
        </svg>
        <span class="nav-label">Dashboard</span>
        <span class="nav-badge" x-show="dashboard && dashboard.overdue && dashboard.overdue.length > 0" x-text="dashboard.overdue.length"></span>
      </button>
      <button class="nav-btn" :class="view === 'actionQueue' && 'nav-active'" @click="view = 'actionQueue'; loadActionQueue()" title="Action Queue (⌘A)">
        <svg class="nav-icon-svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M3 4a1 1 0 000 2h14a1 1 0 100-2H3zm0 4a1 1 0 000 2h14a1 1 0 100-2H3zm0 4a1 1 0 000 2h8a1 1 0 100-2H3zm0 4a1 1 0 000 2h4a1 1 0 100-2H3z" clip-rule="evenodd"/>
        </svg>
        <span class="nav-label">Action Queue</span>
        <span class="nav-badge" x-show="actionQueue && actionQueue.dansQueueCount > 0" x-text="actionQueue.dansQueueCount"></span>
      </button>
    </div>
  </div>

  <!-- Operations Section -->
  <div class="nav-section" :class="!operationsExpanded && 'collapsed'">
    <button class="nav-section-header" @click="operationsExpanded = !operationsExpanded" aria-label="Toggle Operations section">
      <span class="nav-section-icon">⚙</span>
      <span>Operations</span>
      <span class="nav-section-toggle">▼</span>
    </button>
    <div class="nav-section-items">
      <button class="nav-btn" :class="view === 'projects' && 'nav-active'" @click="openNavigationTarget('projects')">
        <svg class="nav-icon-svg" viewBox="0 0 20 20" fill="currentColor">
          <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
        </svg>
        <span class="nav-label">Projects</span>
      </button>
      <button class="nav-btn" :class="view === 'commitments' && 'nav-active'" @click="openNavigationTarget('commitments')">
        <svg class="nav-icon-svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
        </svg>
        <span class="nav-label">Commitments</span>
      </button>
      <button class="nav-btn" :class="view === 'registry' && 'nav-active'" @click="openNavigationTarget('registry')">
        <svg class="nav-icon-svg" viewBox="0 0 20 20" fill="currentColor">
          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
        </svg>
        <span class="nav-label">Registry</span>
      </button>
      <button class="nav-btn" :class="view === 'team' && 'nav-active'" @click="openNavigationTarget('team')">
        <svg class="nav-icon-svg" viewBox="0 0 20 20" fill="currentColor">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zm5 2a2 2 0 11-4 0 2 2 0 014 0zm-4 7a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zm10 7a3.99 3.99 0 00-1.46-3.08A3.98 3.98 0 0118 15v1h-2zM3.08 11.92A3.99 3.99 0 002 15v1h2v-1c0-.88.28-1.69.76-2.36-.37-.24-.7-.53-.99-.85l.31.13z"/>
        </svg>
        <span class="nav-label">Team</span>
        <span class="nav-badge nav-badge-warn" x-show="getOverloadedCount() > 0" x-text="getOverloadedCount()"></span>
      </button>
    </div>
  </div>

  <!-- Growth Section -->
  <div class="nav-section" :class="!growthExpanded && 'collapsed'">
    <button class="nav-section-header" @click="growthExpanded = !growthExpanded" aria-label="Toggle Growth section">
      <span class="nav-section-icon">📈</span>
      <span>Growth</span>
      <span class="nav-section-toggle">▼</span>
    </button>
    <div class="nav-section-items">
      <button class="nav-btn" :class="view === 'marketingOps' && 'nav-active'" @click="openNavigationTarget('marketingOps')">
        <svg class="nav-icon-svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0114 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L7.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 016 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.789l1.599.799L10 4.323V3a1 1 0 011-1z" clip-rule="evenodd"/>
        </svg>
        <span class="nav-label">Marketing Ops</span>
        <span class="nav-badge" x-show="mktops?.stats?.blockedCampaigns?.length > 0" x-text="mktops?.stats?.blockedCampaigns?.length"></span>
      </button>
      <button class="nav-btn" :class="view === 'crm' && 'nav-active'" @click="openNavigationTarget('crm')">
        <svg class="nav-icon-svg" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
        </svg>
        <span class="nav-label">CRM</span>
      </button>
    </div>
  </div>

  <!-- Strategy Section -->
  <div class="nav-section" :class="!strategyExpanded && 'collapsed'">
    <button class="nav-section-header" @click="strategyExpanded = !strategyExpanded" aria-label="Toggle Strategy section">
      <span class="nav-section-icon">🧭</span>
      <span>Strategy</span>
      <span class="nav-section-toggle">▼</span>
    </button>
    <div class="nav-section-items">
      <button class="nav-btn" :class="view === 'bmc' && 'nav-active'" @click="openNavigationTarget('bmc')">
        <svg class="nav-icon-svg" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 5a1 1 0 011-1h5a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9zm8 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1V9z"/>
        </svg>
        <span class="nav-label">Business Canvas</span>
      </button>
      <button class="nav-btn" :class="view === 'decisions' && 'nav-active'" @click="view = 'decisions'; loadDecisions()">
        <svg class="nav-icon-svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>
        <span class="nav-label">Decisions</span>
        <span class="nav-badge" x-show="dashboard && dashboard.recentDecisions && dashboard.recentDecisions.length > 0" x-text="dashboard?.recentDecisions?.length"></span>
      </button>
      <button class="nav-btn" :class="view === 'docs' && 'nav-active'" @click="openNavigationTarget('docs')">
        <svg class="nav-icon-svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/>
        </svg>
        <span class="nav-label">Documents</span>
      </button>
      <button class="nav-btn" :class="view === 'knowledge' && 'nav-active'" @click="view = 'knowledge'; loadNotebooks()">
        <svg class="nav-icon-svg" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/>
        </svg>
        <span class="nav-label">Knowledge</span>
      </button>
    </div>
  </div>

  <!-- Systems Section -->
  <div class="nav-section" :class="!systemsExpanded && 'collapsed'">
    <button class="nav-section-header" @click="systemsExpanded = !systemsExpanded" aria-label="Toggle Systems section">
      <span class="nav-section-icon">🔧</span>
      <span>Systems</span>
      <span class="nav-section-toggle">▼</span>
    </button>
    <div class="nav-section-items">
      <button class="nav-btn" :class="view === 'techTeam' && 'nav-active'" @click="openNavigationTarget('techTeam')">
        <svg class="nav-icon-svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
        </svg>
        <span class="nav-label">Tech Team</span>
        <span class="nav-badge" x-show="techTeam?.stats?.blocked > 0" x-text="techTeam?.stats?.blocked"></span>
      </button>
      <button class="nav-btn" :class="view === 'factory' && 'nav-active'" @click="openNavigationTarget('factory')">
        <svg class="nav-icon-svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
        </svg>
        <span class="nav-label">Factory</span>
      </button>
      <button class="nav-btn" :class="view === 'notion' && 'nav-active'" @click="openNavigationTarget('notion')">
        <svg class="nav-icon-svg" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z"/>
        </svg>
        <span class="nav-label">Notion</span>
      </button>
      <button class="nav-btn" :class="view === 'overview' && 'nav-active'" @click="openNavigationTarget('overview')">
        <svg class="nav-icon-svg" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"/>
        </svg>
        <span class="nav-label">Overview</span>
      </button>
    </div>
  </div>

  <!-- Footer -->
  <div class="nav-spacer"></div>
  <div class="nav-footer">
    <button class="nav-footer-btn" @click="openSettings()" aria-label="Settings" title="Settings">
      <svg class="nav-icon-svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.371-.836-2.583.029-3.084 1.317-.501 1.288.236 2.393 1.366 2.461.027 0 .052.007.078.01.363.027.708.268.832.589.163.524.455 1.069.816 1.477.728.822 1.21 1.319 1.437 1.82.228.501.335 1.114.335 2.034 0 .904-.155 1.81-.457 2.691-.776 2.113-2.443 3.594-4.043 3.594-.10 0-.196-.004-.29-.013-1.805-.140-3.476-1.162-4.677-2.766-.434-.596-.616-1.404-.578-2.364.039-1.068.188-2.054.557-2.938.368-.884.926-1.655 1.624-2.246.154-.129.301-.24.441-.328a1.535 1.535 0 00.676-2.859c-.502-.285-.955-.594-1.349-.922-.899-.731-1.544-1.692-1.822-2.816-.278-1.124-.072-2.368.644-3.51 1.271-1.989 3.546-2.75 5.455-1.993 1.908.758 2.945 2.697 2.945 4.412 0 1.264-.428 2.577-1.243 3.844-.078.129-.162.248-.251.358a1.536 1.536 0 002.364 1.973c.484-.526.880-1.128 1.17-1.793.296-.665.425-1.393.425-2.159 0-1.845-.504-3.51-1.386-4.736z" clip-rule="evenodd"/>
      </svg>
      <span class="nav-label">Settings</span>
    </button>
    <button class="nav-footer-btn" @click="toggleSidebarWidth()" aria-label="Collapse sidebar" :title="sidebarExpanded ? 'Collapse' : 'Expand'">
      <svg class="nav-icon-svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/>
      </svg>
      <span class="nav-label">Toggle</span>
    </button>
  </div>
</nav>
```

### Navigation State (Alpine)

Add to `app()` function:

```javascript
// Navigation state
sidebarExpanded: true,
commandExpanded: true,
operationsExpanded: true,
growthExpanded: true,
strategyExpanded: true,
systemsExpanded: true,

toggleSidebarWidth() {
  this.sidebarExpanded = !this.sidebarExpanded;
  localStorage.setItem('sidebarExpanded', this.sidebarExpanded);
},

openSettings() {
  // TODO: Implement settings drawer
  console.log('Settings');
}
```

---

## Badge Counts — Rollup Behavior

When a section is collapsed, badge counts aggregate at the section header:

```javascript
getCommandBadgeCount() {
  let count = 0;
  if (this.dashboard?.overdue?.length) count += this.dashboard.overdue.length;
  if (this.actionQueue?.dansQueueCount) count += this.actionQueue.dansQueueCount;
  return count;
},

getOperationsBadgeCount() {
  let count = 0;
  if (this.getOverloadedCount()) count += this.getOverloadedCount();
  return count;
},

getGrowthBadgeCount() {
  let count = 0;
  if (this.mktops?.stats?.blockedCampaigns?.length) count += this.mktops.stats.blockedCampaigns.length;
  return count;
},

getSystemsBadgeCount() {
  let count = 0;
  if (this.techTeam?.stats?.blocked) count += this.techTeam.stats.blocked;
  return count;
}
```

Add to section header:

```html
<span class="nav-badge" x-show="!sectionExpanded && getCommandBadgeCount() > 0" x-text="getCommandBadgeCount()"></span>
```

---

## Anti-patterns to Avoid

1. **No fixed heights on drawers** — Use flex with min-height
2. **No nested modals** — Only one modal/drawer at a time; close before opening another
3. **No inline styles** — All styling via CSS classes and variables
4. **No hardcoded colors** — Always reference CSS variables (`var(--*`)
5. **No opacity for disabled state** — Use explicit `.disabled` class with clear visual treatment
6. **No hover transforms that shift layout** — Use color/shadow only, not scale/translate
7. **No instant state changes** — All transitions > 150ms
8. **No tooltip chaos** — Use only on icon-only buttons; show on `:hover`
9. **No auto-expanding sections** — Let user control collapse state, persist in localStorage
10. **No badge spam** — Consolidate related counts; show count at 5+

---

## Implementation Roadmap

### Phase 1a: Component Foundation (Week 1)
- Add CSS for all 8 components (data-card, data-table, status-badge, detail-drawer, loading-skeleton, empty-state, context-menu, toast)
- No HTML changes yet; just CSS infrastructure

### Phase 1b: Navigation Refactor (Week 2)
- Replace current flat 64px sidebar with grouped 72px → 240px expandable version
- Migrate all 16 nav buttons into 5 sections
- Add section collapse/expand with localStorage persistence
- Test keyboard navigation

### Phase 1c: Component Integration (Week 3+)
- Systematically replace dashboard cards with `.data-card` class
- Replace inline tables with `.data-table` component
- Replace hardcoded status indicators with `.status-badge`
- Add `.loading-skeleton` to all data-fetching views
- Add `.empty-state` fallback to views with no data
- Convert action menus to `.context-menu` pattern

---

## Files to Create/Modify

1. **public/css/styles.css** — Add all component CSS classes (no existing rules changed)
2. **public/index.html** — Update sidebar structure (navigation redesign)
3. **public/js/app.js** — Add navigation state + toggle methods (no view logic changed)

---

## Key Metrics

- **CSS Size Increase**: ~800-1000 lines (component definitions)
- **HTML Bloat**: ~200 lines (sidebar expansion)
- **Performance Impact**: Negligible (CSS-only, no JS execution increase)
- **Browser Support**: All modern browsers (CSS Grid, Flexbox, CSS Variables)

---

## Handoff Notes

This spec defines:
1. **8 reusable component primitives** with exact CSS class names and Alpine templates
2. **Navigation grouped into 5 logical domains** with collapsible sections
3. **Consistent dark-mode styling** using existing color palette
4. **Clear integration path** for systematic replacement of hardcoded UI

All components are CSS-first with minimal Alpine.js directives. No breaking changes to existing views.


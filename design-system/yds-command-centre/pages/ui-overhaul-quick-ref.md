# UI Overhaul Phase 1 — Quick Reference

**Last Updated:** 2026-03-22
**Status:** Ready for frontend-builder
**Full Spec:** `design-system/yds-command-centre/pages/ui-overhaul-phase1.md`

---

## Component Classes Cheat Sheet

| Component | Class | Purpose | States |
|-----------|-------|---------|--------|
| **DataCard** | `.data-card` | Metric display | `.accent`, `.success`, `.warning`, `.danger` |
| **DataTable** | `.data-table` | Data grid | thead sticky, tbody hover, sortable headers |
| **StatusBadge** | `.status-badge` | Status pill | `.success`, `.warning`, `.danger`, `.info`, `.neutral`, `.purple`, `.small` |
| **DetailDrawer** | `.detail-drawer` | Slide panel | `.open` (with overlay) |
| **LoadingSkeleton** | `.loading-skeleton` | Shimmer placeholder | `.skeleton-text-line`, `.skeleton-card`, `.skeleton-table-row`, `.skeleton-stat-card` |
| **EmptyState** | `.empty-state` | No data fallback | N/A |
| **ContextMenu** | `.context-menu` | Dropdown actions | `.open`, `.danger` on items |
| **Toast** | `.toast` | Notification | `.success`, `.error`, `.info`, `.exiting` |

---

## CSS Variables (Ready to Use)

```css
/* Colors */
--bg-primary: #0a0a0a          /* Page bg */
--bg-card: #161616             /* Cards */
--bg-hover: #1c1c1c            /* Hover state */
--text-primary: #e5e5e5        /* Body text */
--text-secondary: #888888      /* Labels */
--text-muted: #777777          /* Hints */
--accent: #3b82f6              /* Brand blue */
--green: #22c55e               /* Success */
--amber: #f59e0b               /* Warning */
--red: #ef4444                 /* Danger */
--purple: #a855f7              /* Secondary */

/* Animations */
--transition-fast: 150ms ease
--transition-normal: 200ms ease
--transition-slow: 300ms ease

/* Spacing */
--space-xs: 4px
--space-sm: 8px
--space-md: 12px
--space-lg: 16px
--space-xl: 24px
--space-2xl: 32px
```

---

## Navigation Structure (5 Domains)

```
sidebar (72px → 240px)
├─ Command (⌘)
│  ├─ Chat
│  ├─ Dashboard
│  └─ Action Queue
├─ Operations (⚙)
│  ├─ Projects
│  ├─ Commitments
│  ├─ Registry
│  └─ Team
├─ Growth (📈)
│  ├─ Marketing Ops
│  └─ CRM
├─ Strategy (🧭)
│  ├─ BMC
│  ├─ Decisions
│  ├─ Documents
│  └─ Knowledge
├─ Systems (🔧)
│  ├─ Tech Team
│  ├─ Factory
│  ├─ Notion Browser
│  └─ Overview
└─ Footer
   ├─ Settings
   └─ Toggle Sidebar
```

Each section is collapsible. Badge counts roll up when collapsed.

---

## Alpine.js Snippets

### DataCard
```html
<div class="data-card" :class="item.status">
  <span class="data-card-label">Open Items</span>
  <span class="data-card-value">42</span>
  <div class="data-card-trend up">↑ 12%</div>
</div>
```

### StatusBadge
```html
<span class="status-badge" :class="item.status">Active</span>
```

### DetailDrawer (with overlay)
```html
<div class="detail-drawer-overlay" :class="open && 'open'" @click="open = false"></div>
<div class="detail-drawer" :class="open && 'open'">
  <div class="detail-drawer-header">
    <h2 class="detail-drawer-title">Item Title</h2>
    <button class="detail-drawer-close" @click="open = false">×</button>
  </div>
  <div class="detail-drawer-body"><!-- content --></div>
</div>
```

### LoadingSkeleton
```html
<div class="loading-skeleton skeleton-card"></div>
<div class="loading-skeleton skeleton-text-line"></div>
```

### Toast
```html
<div class="toast success">
  <span class="toast-icon">✓</span>
  <span class="toast-message">Saved successfully</span>
  <button class="toast-close" @click="removeToast(id)">×</button>
</div>
```

---

## Sizing Reference

| Element | Width | Height | Padding |
|---------|-------|--------|---------|
| Sidebar (collapsed) | 72px | 100vh | — |
| Sidebar (expanded) | 240px | 100vh | — |
| DetailDrawer | 400px | 100vh | — |
| DataCard | Variable (grid) | 120px min | 12px |
| StatusBadge | Auto | 20px | 2px 8px |
| Toast | 320px max | Auto | 12px 16px |
| ContextMenu | 180px min | Auto | 0 |

---

## Animation Timings

| Transition | Duration | Easing |
|-----------|----------|--------|
| Micro (hover, badge) | 150ms | ease |
| Standard (drawer close, card fade) | 200ms | ease |
| Entrance (drawer slide, modal appear) | 300ms | ease |
| Loading shimmer | 2s infinite | cubic-bezier(0.4, 0, 0.6, 1) |
| Toast slide-in | 300ms | ease |
| Toast slide-out | 300ms | ease |

---

## Color Coding Rules

**StatusBadge + DataCard borders:**
- `.success` → `--green` (#22c55e)
- `.warning` → `--amber` (#f59e0b)
- `.danger` → `--red` (#ef4444)
- `.info` / `.accent` → `--accent` (#3b82f6)
- `.neutral` → `--text-secondary` (#888888)
- `.purple` → `--purple` (#a855f7)

**Background tints:**
- Green: `--green-dim` (#0a3d1f)
- Amber: `--amber-dim` (#3d2800)
- Red: `--red-dim` (#3d0a0a)
- Accent: `--accent-dim` (#1e3a5f), `--accent-glow` (rgba 8% opacity)
- Purple: `--purple-dim` (#2d1854)

---

## Do's & Don'ts

### Do ✓
- Use CSS variables for all colors
- Transitions > 150ms for smooth feel
- Add `.nav-active` class to current view button
- Consolidate badge counts (show 5+ as single count)
- Persist sidebar expand/collapse to localStorage
- Use semantic HTML (`<button>`, `<table>`, etc.)
- Add `:focus-visible` outline on all interactive elements

### Don't ✗
- Hardcode hex colors
- Use opacity for disabled state (use explicit `.disabled` class)
- Create nested modals (one at a time only)
- Apply transforms on hover (use color/shadow instead)
- Skip focus states for keyboard nav
- Add tooltips to text-heavy buttons (icon-only only)
- Use inline styles

---

## File Locations

- **Full Spec:** `/design-system/yds-command-centre/pages/ui-overhaul-phase1.md` (1426 lines)
- **Master Design System:** `/design-system/yds-command-centre/MASTER.md`
- **CSS Target:** `/public/css/styles.css`
- **HTML Target:** `/public/index.html` (sidebar nav)
- **JS State:** `/public/js/app.js` (navigation state + methods)

---

## Validation Checklist Before Commit

- [ ] All 8 component CSS classes added to styles.css
- [ ] All color assignments use `var(--*)`
- [ ] All transitions >= 150ms
- [ ] Sidebar sections collapsible with localStorage
- [ ] Focus states visible (2px outline) on all buttons
- [ ] Toast auto-dismisses after 4s
- [ ] DetailDrawer overlay clickable to close
- [ ] LoadingSkeleton shimmer loops infinitely
- [ ] Empty state displays when data is empty
- [ ] Status badges color-coded per rules above
- [ ] No hardcoded hex values in new CSS
- [ ] No inline styles in HTML
- [ ] Badge counts consolidated (5+ as single number)

---

## Next Steps

1. **frontend-builder:** Read the full spec at `design-system/yds-command-centre/pages/ui-overhaul-phase1.md`
2. **Phase 1a:** Add component CSS to `public/css/styles.css`
3. **Phase 1b:** Refactor sidebar navigation in `public/index.html` and `public/js/app.js`
4. **Phase 1c:** Systematically apply component classes across all views

All sizing, colors, and behaviors are locked in. No guessing.


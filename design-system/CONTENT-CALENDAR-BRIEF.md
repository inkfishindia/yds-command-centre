# Design Brief: Content Calendar View

## Context
- Product: YDS Command Centre marketing-ops module
- Target: Alpine.js SPA with existing dark theme
- Data source: Notion content calendar table
- Scope: Monthly calendar grid, filters, quick add, detail modal, side list view

---

## Design Pattern

**Calendar-Driven Ops Dashboard**

A monthly calendar view layered with filterable content events. Primary interaction is date-based discovery and quick add-to-date creation. Secondary interaction is channel/status filtering and detail inspection. All actions (create, update, publish) route through the approval gate.

---

## Color Palette

All colors are CSS variables defined in `:root` of `public/css/styles.css`. **Do not hardcode hex values.**

### Dark Theme Foundation
Use existing YDS theme tokens without modification:

```css
/* Backgrounds */
--bg-primary: #0a0a0a          /* Page background */
--bg-secondary: #111111         /* Sidebar background */
--bg-card: #161616              /* Card/panel background */
--bg-hover: #1c1c1c             /* Hover state */
--bg-input: #1a1a1a             /* Input field background */
--bg-elevated: #1a1a1a          /* Elevated panel (modals, popovers) */

/* Borders */
--border: #222222               /* Standard border */
--border-light: #2a2a2a         /* Lighter/secondary border */

/* Text */
--text-primary: #e5e5e5         /* Primary text, headings */
--text-secondary: #888888       /* Secondary text, labels */
--text-muted: #777777           /* Muted text, hints */

/* Semantic Colors */
--accent: #3b82f6              /* Blue — primary actions, links */
--accent-dim: #1e3a5f          /* Blue background tint for cards */
--green: #22c55e               /* Success, Published status, Create actions */
--green-dim: #0a3d1f           /* Green background tint */
--amber: #f59e0b               /* Warning, In Progress status */
--amber-dim: #3d2800           /* Amber background tint */
--red: #ef4444                 /* Danger, Archived status, Delete */
--red-dim: #3d0a0a             /* Red background tint */
--teal: #14b8a6                /* Scheduled, Secondary accent */
--teal-dim: rgba(20, 184, 166, 0.1) /* Teal background tint */
--purple: #a855f7              /* Campaign, tertiary accent */
--purple-dim: #2d1854          /* Purple background tint */
--yellow: #eab308              /* Planned status */
--yellow-dim: #3d3200          /* Yellow background tint */

/* Utility */
--shadow-card: 0 1px 3px rgba(0,0,0,0.3)       /* Card shadow */
--shadow-elevated: 0 4px 16px rgba(0,0,0,0.4)  /* Elevated panel */
--shadow-overlay: 0 16px 48px rgba(0,0,0,0.6)  /* Modal overlay */
--transition-fast: 150ms ease
--transition-normal: 200ms ease
--transition-slow: 300ms ease
--radius: 6px
--radius-lg: 10px
```

### Channel-Specific Chip Colors

Each channel gets a distinct color for quick visual scanning:

```
Email      → --accent (#3b82f6)        — Blue
LinkedIn   → --teal (#14b8a6)         — Teal
Instagram  → --purple (#a855f7)       — Purple
Twitter/X  → --text-secondary (#888888) — Gray
Website    → --green (#22c55e)        — Green
Video      → --red (#ef4444)          — Red
```

### Status Badge Colors (Notion field: Status)

```
Planned      → --yellow (#eab308)     + --yellow-dim background
In Progress  → --amber (#f59e0b)      + --amber-dim background
Scheduled    → --teal (#14b8a6)       + --teal-dim background
Published    → --green (#22c55e)      + --green-dim background
Archived     → --text-muted (#777777) + transparent background
```

---

## Typography

Use the existing YDS typography stack. No new imports needed.

```css
--font-ui: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'IBM Plex Mono', 'SF Mono', 'Fira Code', monospace;
```

### Sizing & Scale

```
Heading (Calendar month label)  → 18px, bold (font-weight: 600-700)
Card title (Content name)        → 14px, medium (font-weight: 500)
Body text (Notes, meta)          → 14px, regular (font-weight: 400)
Label (Channel, Status)          → 12px, regular (font-weight: 400)
Mono (Dates, counts)             → 12px, monospace (--font-mono), font-weight: 500
Tab/Button text                  → 13px, medium (font-weight: 500)
```

### Line Height & Spacing

```
Heading:  1.2 (tight, for month label)
Body:     1.5 (comfortable, for notes)
List:     1.4 (compact, for content items)
```

---

## Layout & Spacing

### Calendar Grid Structure

```
┌─────────────────────────────────────────────────────┐
│ Header: Month Nav + Today Button                     │
├─────────────────────────────────────────────────────┤
│ Filters: Channels | Status | Content Type           │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Cal Grid (7-column week × 6 rows)                  │
│  Each day cell: 80px h (or flexible), contains:     │
│  - Date number (top-right, small, muted)           │
│  - Content chips stacked (max 3 visible, +X more)   │
│                                                      │
├─────────────────────────────────────────────────────┤
│ Optional: Weekly list (collapsible or side panel)   │
└─────────────────────────────────────────────────────┘
```

### Day Cell Dimensions

```
Width:             Full column width (calc(100% / 7) in 7-column grid)
Min Height:        100px
Padding:           8px (internal)
Border:            1px solid --border
Background:        --bg-card (normal), --bg-hover (hover/today)
Border radius:     --radius (6px)
```

### Chip (Content Item) Sizing

```
Height:            24px (padding 4px, 14px font)
Padding:           4px 8px
Font:              12px, --font-ui, font-weight: 500
Border radius:     12px (pill shape)
Border:            1px solid (channel color, faded)
Background:        (channel color) at 15% opacity
Margin:            2px 0 (stack in column)
Truncation:        max-width: 100%, text-overflow: ellipsis, white-space: nowrap
```

### Card & Modal Padding

```
Standard card:     1rem (16px)
Compact card:      0.75rem (12px)
Modal padding:     1.5rem (24px)
Form field gap:    1rem (16px)
```

---

## Key Components & Patterns

### 1. Calendar Grid Header

```html
<div class="calendar-header">
  <button class="btn-ghost">← Prev Month</button>
  <h2>March 2026</h2>
  <button class="btn-primary">Today</button>
  <button class="btn-ghost">Next Month →</button>
</div>
```

- Month label: --text-primary, 18px bold
- Buttons: .btn-ghost style from existing CSS
- Today button: highlights current month or resets if on different month

### 2. Filter Bar

```html
<div class="filter-bar">
  <div class="filter-group">
    <label>Channels:</label>
    <div class="filter-chips">
      <button class="filter-chip" data-channel="email">Email</button>
      <button class="filter-chip" data-channel="linkedin">LinkedIn</button>
      <!-- ... -->
    </div>
  </div>
  <div class="filter-group">
    <label>Status:</label>
    <select>
      <option value="">All</option>
      <option value="Planned">Planned</option>
      <option value="In Progress">In Progress</option>
      <!-- ... -->
    </select>
  </div>
</div>
```

- Chip width: auto, min-width 60px
- Selected chip: border-color: --accent, background: --accent-dim
- Unselected: border-color: --border, background: transparent
- Transition: --transition-fast (150ms)

### 3. Day Cell (Content Chips)

```html
<div class="calendar-day" data-date="2026-03-15">
  <span class="day-number">15</span>
  <div class="content-chips">
    <div class="content-chip" style="--channel-color: var(--accent);">
      <span class="chip-icon">📧</span> Blog Launch
    </div>
    <div class="content-chip" style="--channel-color: var(--teal);">
      LinkedIn Post
    </div>
    <button class="chip-add">+ Add</button>
  </div>
</div>
```

**Important: Use SVG icons, not emojis. The emoji is placeholder above; replace with Lucide/Heroicons SVG.**

- Day cell with border: var(--border), background: var(--bg-card)
- Today's cell: border-color: var(--accent), background: var(--accent-dim) at 20% opacity
- Day number: --text-muted, 11px, positioned top-right
- Chip hover: opacity 0.9, cursor pointer, transition 150ms
- Overflow: If >3 items, show "+2 more" pill instead of 4th item

### 4. Content Detail Modal

```html
<dialog class="modal" open>
  <div class="modal-content">
    <div class="modal-header">
      <h3>Create Content Item</h3>
      <button class="btn-close" aria-label="Close">✕</button>
    </div>

    <form class="form">
      <div class="form-group">
        <label for="name">Name</label>
        <input type="text" id="name" placeholder="Content title">
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="status">Status</label>
          <select id="status">
            <option>Planned</option>
            <option>In Progress</option>
            <option>Scheduled</option>
            <option>Published</option>
            <option>Archived</option>
          </select>
        </div>

        <div class="form-group">
          <label for="type">Content Type</label>
          <select id="type">
            <option>Blog</option>
            <option>Email</option>
            <option>Social</option>
            <option>Video</option>
            <option>Guide</option>
            <option>Case Study</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Channels</label>
        <div class="checkbox-group">
          <label class="checkbox">
            <input type="checkbox" name="channel" value="Email">
            <span>Email</span>
          </label>
          <!-- ... -->
        </div>
      </div>

      <div class="form-group">
        <label for="date">Publish Date</label>
        <input type="date" id="date">
      </div>

      <div class="form-group">
        <label for="campaign">Campaign</label>
        <select id="campaign">
          <option value="">None</option>
          <!-- Options from Notion campaigns -->
        </select>
      </div>

      <div class="form-group">
        <label for="notes">Notes</label>
        <textarea id="notes" rows="3"></textarea>
      </div>

      <div class="form-actions">
        <button type="button" class="btn-ghost">Cancel</button>
        <button type="submit" class="btn-primary">Save</button>
      </div>
    </form>
  </div>
</dialog>
```

- Modal background overlay: rgba(0,0,0,0.8)
- Modal panel: background var(--bg-elevated), border 1px var(--border), shadow: --shadow-overlay
- Form inputs: background var(--bg-input), border 1px var(--border), focus border-color var(--accent)
- Labels: --text-primary, 12px, font-weight: 500, margin-bottom: 6px
- Select/textarea: same input style as text inputs

### 5. Weekly List Panel (Optional, Below or Beside Calendar)

```html
<div class="weekly-list">
  <h3>Week of March 17–23</h3>
  <ul class="content-list">
    <li class="content-item">
      <div class="item-header">
        <span class="item-date">Mar 17</span>
        <span class="item-type-badge">Blog</span>
        <span class="item-status-badge">In Progress</span>
      </div>
      <h4>Spring Campaign Kickoff</h4>
      <div class="item-channels">
        <span class="channel-tag">Email</span>
        <span class="channel-tag">LinkedIn</span>
      </div>
      <p class="item-notes">Update hero images with latest brand assets</p>
    </li>
    <!-- ... -->
  </ul>
</div>
```

- List item: padding 12px, border-bottom 1px var(--border-light), background var(--bg-card), hover: background var(--bg-hover)
- Date column: 60px, mono font, --text-secondary
- Badges: 12px, pill shape (border-radius 12px), colored per status
- Title: 14px, --text-primary, margin 4px 0

---

## Interactive States & Micro-interactions

### Focus States
All interactive elements (buttons, inputs, chips) must have visible focus rings:
```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

### Hover Effects
- Calendar day cell: background shifts to var(--bg-hover), border stays same
- Chip: opacity 0.9, cursor pointer, smooth transition (150ms)
- Button: background shifts, border-color brightens, transition (150ms)
- Filter chip (selected): keep --accent-dim bg, no further change
- Filter chip (unselected → selected): border-color var(--border) → var(--accent), background transparent → --accent-dim

### Loading States
- Calendar grid loading: skeleton cards (pulsing animation at --transition-slow)
- Modal form submit: button disabled, shows spinner or "Saving..." text
- Content chip: fade-in animation (200ms) when new item added to day

### Approval Gate Integration
When user clicks "Save" in modal, show approval UI similar to chat approval card:
- Alert banner with amber background (--amber-dim), border (--amber)
- Show summary of change
- Approve / Reject buttons
- Timer (from existing approval patterns in CSS)

---

## Anti-patterns to Avoid

### Do NOT
- Use bright white or light grey for day cells — use --bg-card consistently
- Hardcode any color hex values — always use CSS variables
- Add shadows deeper than --shadow-card on day cells — keep minimal
- Use emoji icons — replace all emoji with SVG (Lucide/Heroicons)
- Break calendar grid into multiple rows per day — stack chips vertically in one cell per day
- Add blur/glassmorphism effects — YDS uses flat cards with borders
- Use more than 6 distinct accent colors per view — 5 channels max in visible chips
- Truncate content names without tooltip — add title attribute or hover reveal
- Animate chip transitions beyond 200ms — keep it snappy
- Add dropshadows on text — use subtle text colors instead

---

## Responsive Breakpoints

```
Desktop (1440px+): Full 7-column calendar grid, side list panel optional
Tablet (768-1024px): Full calendar, list panel moves below or off-screen
Mobile (375-768px): Simplified calendar (5-column or 4-column), stacked list below, filters collapse into dropdown
```

On mobile, consider:
- Week view instead of month view as an option
- Filter dropdown instead of inline chips
- Full-width day cell tap to open detail modal
- Sticky header with month navigation

---

## File Locations & Ownership

- **Backend API**: `server/routes/marketing-ops.js` — implement `GET /api/marketing-ops/content/calendar?month=YYYY-MM`
- **Backend Service**: `server/services/marketing-ops-service.js` — compose calendar payload
- **Frontend Module**: `src/js/modules/marketing-ops.js` — add calendar state (activeMonth, selectedDay, filters, contentList) and methods (loadContentCalendar, addContentItem, filterCalendar)
- **Frontend HTML**: `public/index.html` — add calendar template under marketingOps view
- **Frontend CSS**: `public/css/styles.css` — add .calendar-*, .filter-*, .content-chip, .modal styles
- **Build**: Run `npm run build` to copy `src/js/*` → `public/js/*`

---

## Handoff Notes

This brief specifies:
- Exact color tokens to use (all CSS variables, no hardcoding)
- Typography scale and spacing grid (8px baseline)
- Component structure (grid, chips, modal, list)
- Interactive states (focus, hover, loading, approval)
- Responsive strategy

**Do NOT:**
- Create new color variables
- Invent new spacing values
- Add new fonts
- Use framework utilities (Tailwind, etc.)

Follow the existing dark theme pattern. Use the provided CSS variable names exactly.

---

**Design Persistence Date**: 2026-03-21
**Status**: Ready for frontend-builder

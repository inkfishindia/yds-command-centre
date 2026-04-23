# Design Spec: Dan ↔ Colin Queue

**Database:** `00969f07-8b4d-4c88-8a45-ec1e95b3bacb` (Dan ↔ Colin Queue)
**Stack:** Alpine.js + Tailwind (inline CSS only — no Tailwind utilities due to project constraints)
**Primary View:** Mobile-first, thumb-friendly. Secondary: desktop two-column.
**Status:** Design phase — ready for frontend-builder handoff.

---

## Core Pattern

**Mobile-First Personal Queue** — Single-column list of 5 sections (⚡ → 🔥 → 👀 → 📥 → ✅), zero-click read, two Dan actions: drop (clear) and answer (inline save). Desktop: two-column (left 60% = ⚡ Waiting, right 40% = 🔥 + 👀 stacked).

**Principle:** Content visible without expanding (except ✅ Closed and 👀 Watch when collapsed). Read time <2 seconds per row. No modals—inline inputs or bottom sheets only.

---

## Color Mapping

**Existing tokens** (from `src/css/styles.css` :root):

| Section | Dan's Hex | Mapped Token | Token Hex | Use |
|---------|-----------|--------------|-----------|-----|
| ⚡ Waiting on You | #F59E0B | `--amber` | #f59e0b | left border + count badge |
| 🔥 Now | #EF4444 | `--red` | #ef4444 | count badge only (no section border) |
| 👀 Watch | #D97706 @ 60% | `--amber` @ 60% opacity | new: `--amber-muted` | section header text only |
| 📥 Drop Queue | #3B82F6 | `--accent` | #3b82f6 | FAB button, composer header |
| ✅ Closed | #6B7280 | `--text-secondary` | #888888 | faded past-tense |

**Backgrounds:**
- Card: `--bg-card` (#161616) — existing dark theme, **NOT** white/#FAFAFA (Dan's spec was light; CC is dark throughout)
- Section separator: `--border-light` (#2a2a2a)
- Input: `--bg-input` (#1a1a1a)

**Rationale:** Command Centre is fully dark-themed. This queue integrates as a native view, not a light island. Using existing palette maintains consistency; all dark-theme apps that went light internally created UX friction (eye strain, context loss). Dan reads on phone in varied lighting — dark mode adapts better than light.

**New token to declare (add to :root if needed):**
```css
--amber-muted: rgba(245, 158, 11, 0.6);  /* 60% opacity for 👀 header */
```

---

## Typography

**Base:** `--font-ui: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif` (already loaded, no new imports).

| Element | Size | Weight | Line-height | Letter-spacing | Notes |
|---------|------|--------|-------------|-----------------|-------|
| Section header (⚡ Waiting on You) | 14px | 500 | — | 0.05em uppercase | Sticky top on mobile |
| Row body (main text) | 16px mobile / 17px desktop | 400 | 1.5 | — | Primary content, zero-click visible |
| Recommendation line (italic, muted) | 14px | 400 italic | 1.4 | — | "Rec: Colin says..." gray-600 equivalent |
| Timestamp (top-right) | 12px | 400 | — | — | `--text-muted` (#777777) |
| Count badge (⚡ N, 🔥 N) | 12px | 600 | — | — | badge color (amber or red) |
| Empty state text | 16px | 400 | 1.5 | — | Encouraging message, `--text-secondary` |

**Mobile responsive:** No size delta below 640px (target: 16px min for readability). Desktop (768px+): body font may increase to 17px per Dan's spec, but Inter handles this gracefully.

---

## Component Specs

### 1. Sticky Header (always visible)

```
Layout: Flex row, space-between
Height: 44px (iOS safe-area aware)
Padding: 12px 16px
Border-bottom: 1px solid --border-light
Background: --bg-secondary (#111111)
Content:
  [Left] "Today" or short date (e.g. "Wed, Apr 23")
  [Right] Pull-to-refresh indicator (iOS only, on scroll-up)
```

**Sticky:** `position: sticky; top: 0; z-index: 10` — stays above all sections on scroll.

---

### 2. Section Header (⚡ Waiting on You, 🔥 Now, etc.)

```
Layout: Flex row, space-between
Padding: 12px 16px
Font: 14px 500 uppercase, letter-spacing 0.05em
Color: 
  ⚡ --amber (#f59e0b)
  🔥 --red (#ef4444)
  👀 --amber-muted (new token, rgba 60%)
  📥 --accent (#3b82f6)
  ✅ --text-muted (#777777)
Border-top: 1px solid --border-light
Background: --bg-card (#161616)
[Right] Collapsible indicator (👀, ✅) or count badge (⚡, 🔥)
  If count: badge pill 20px h, accent color bg, white text, 12px 600wt
```

**Collapse toggle (👀 Watch, ✅ Closed):** Click header → toggle `aria-expanded`. Icon rotates 180° (transition 200ms).

---

### 3. Row Card (per queue item)

**Structure:**
```
┌─ 3px left border (section color) ─────────────┐
│ Body text (16px, 1.5 line-height)             │
│ Rec: [italic, 14px, gray] (if present)        │
│ Timestamp [12px, muted, top-right corner]     │
│ [For ⚡ Waiting] Inline answer textarea        │
│ [All rows] Actions: Drop (📥), Answer (⚡)     │
└──────────────────────────────────────────────┘
```

**Padding:** 12px 16px (consistent with header)
**Margin-bottom:** 8px (compact spacing between rows)
**Background:** `--bg-card` (#161616)
**Border:** 
  - Left: 3px solid [section color]
  - Bottom/top/right: 1px solid `--border-light`
  - Border-radius: `--radius` (6px)
**Shadow:** `--shadow-card` (0 1px 2px rgba(0,0,0,0.04)) — minimal, already defined

**Timestamp placement:** absolutely positioned top-right inside card, 8px from corner.

### 3a. ⚡ Waiting on You (Row with answer input)

```
[Row Header]
  Body text (16px)
  Timestamp (12px, muted)

[Rec line] (if present)
  "Rec: Colin says..." (14px italic gray)

[Answer Input Area] (appears below body, visible without expand)
  Textarea: full width, 56px h (2 lines visible), 
    placeholder "Your answer...",
    font 16px,
    padding: 8px 12px,
    border: 1px --border,
    bg: --bg-input (#1a1a1a),
    border-radius: 4px
  
  [Auto-save flow]
    State: idle (placeholder visible)
    → User types
    → 2s debounce timer starts
    → [Saving...] indicator appears (12px gray, fade in 150ms)
    → API POST /api/dan-colin-queue/:id/answer { body }
    → ✓ checkmark appears, 1s fade-in
    → 1.5s later: entire row animates out (slide-left + fade-out 300ms)
    → Row removed from DOM, moves to ✅ Closed section
```

**Debounce logic:** Save only after 2s of inactivity. Clear timer on keystroke.
**Animations:**
  - Save indicator fade-in: `opacity: 0 → 1` over 150ms
  - Checkmark: SVG icon, green (#22c55e), 16px
  - Row exit: `transform: translateX(-100%); opacity: 0` over 300ms, `ease-out`

---

### 3b. 🔥 Now (Read-only, tap-to-Notion)

```
Body text (16px)
Timestamp (12px)
[No Rec line — minimal info]
[No input — read-only]

Interaction: Tap row → Open Notion page in new tab
  Cursor: pointer
  Hover: bg-hover (#1c1c1c), transition 150ms
```

**Bottom action bar (always visible on row):** 
  - Left: [No answer input]
  - Right: "Tap to open →" (12px, muted, fade on hover)

---

### 3c. 👀 Watch (Collapsed by default, expandable)

```
Section header: "👀 Watch (N)" 
  [Click to expand]
  aria-expanded="false" (default)
  Icon: chevron-right (rotates to chevron-down on expand)

[When collapsed]
  No rows visible

[When expanded]
  Same row structure as 🔥 (read-only, tap-to-Notion)
  Rows slide-down and fade-in (animation 200ms)
```

---

### 3d. 📥 Drop Queue (inline composer)

```
Section header: "📥 Drop Queue"
Sticky FAB: position fixed, bottom-right 
  Size: 56px h × 56px w (touch target ≥44px)
  Border-radius: --radius-lg (10px, not circular — aligns with card aesthetic)
  Background: --accent (#3b82f6)
  Icon: "+" (Lucide Plus or Heroicons), 24px, white
  Shadow: --shadow-elevated (0 4px 16px rgba(0,0,0,0.4))
  Hover: opacity 0.9, transition 150ms
  Z-index: 50 (above all content)

[Tap FAB]
  Bottom sheet slides up from bottom
  Backdrop: overlay-dark (rgba(0,0,0,0.6)), click-to-dismiss
  
[Sheet Contents]
  Header (16px, 600wt): "Drop into Colin's queue"
  Color: --accent
  
  Textarea: 
    Placeholder: "What's on your mind?"
    Full width - 32px padding
    Min-height: 120px (3-4 lines)
    Font: 16px, --text-primary
    Border: 1px --border
    bg: --bg-input
    Padding: 12px
    Border-radius: 4px
  
  [Voice button (optional)]
    Icon: 🎤 (or Lucide Mic)
    "Push to talk" label
    Tap to record → auto-transcribe
    (Backend implementation scope — capture here for completeness)
  
  [Attach button (optional)]
    Icon: 📎 (or Lucide Paperclip)
    "Attach file" label
  
  [Action buttons at bottom]
    2-column grid:
      [Cancel] (secondary, --border background, --text-primary text)
      [Drop] (primary, --accent background, white text)
    
    Button sizing: 44px h (touch-safe), full width each column
    Border-radius: --radius (6px)
    Hover: opacity 0.9

[On Drop submit]
  Validation: Require min 10 chars (or no validation?)
  POST /api/dan-colin-queue { section: "📥", owner: "Colin", status: "Open", body }
  Sheet stays open (no instant dismiss)
  [Sending...] spinner in Drop button (disable button during request)
  On success:
    Button shows ✓ checkmark (green, --green #22c55e), 1s dwell
    Toast notification: "In Colin's queue → processed midday" (green, top-center)
    Sheet dismisses after toast, 500ms delay
    Textarea clears for next input
  On error:
    Error message appears below textarea (red, 14px)
    Button remains enabled, user can retry
```

**Sheet animation:** Slide up from bottom with easing:
```css
animation: slideUp 300ms cubic-bezier(0.16, 1, 0.3, 1);
@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

**Dismiss:** Tap backdrop or press Escape → slide down + fade out 200ms.

---

### 3e. ✅ Closed this week (Collapsed by default)

```
Section header: "✅ Closed this week (N)"
[Click to expand]
aria-expanded="false" (default)
Icon: chevron-right (rotates to chevron-down)

[When collapsed]
  No rows visible

[When expanded]
  Rows appear with faded styling:
    Border-left: 1px (thinner than active rows)
    Color: --text-muted (#777777)
    Text opacity: 0.7
    Background: slightly darker, e.g. --bg-primary (#0a0a0a)
  
  No actions (answer, drop) — read-only
  Timestamp shows completion date instead of original date
```

---

## Mobile Layout (< 768px)

```
[Sticky Header: Today's date]
[⚡ Waiting on You section]
  [Section header, count badge]
  [Rows: body + rec + timestamp + answer input]
  [Pull-to-refresh swipe area above header]

[🔥 Now section]
  [Section header, count badge]
  [Rows: body + timestamp]

[👀 Watch section]
  [Section header (collapsed) + chevron]
  [No rows visible until expand]

[📥 Drop Queue section]
  [Section header]
  [FAB: bottom-right corner, fixed]

[✅ Closed this week section]
  [Section header (collapsed) + chevron]
  [No rows visible until expand]

[Floating FAB: always visible in bottom-right]
```

**Viewport:** Full screen, no nav overlap. Safe area: top (notch) + bottom (home indicator).

---

## Desktop Layout (≥768px)

```
[Sticky Header: Today's date]

[2-column grid]
  [Left 60%]
    ⚡ Waiting on You (full height, scrollable)
    Rows same structure
  
  [Right 40%]
    [Top: 🔥 Now]
      Section header + rows
    [Below: 👀 Watch]
      Section header + rows (expanded by default on desktop)
    [Bottom drawer: ✅ Closed]
      Collapsible drawer at page bottom

[FAB position]
  Option A: Top-right corner (above keyboard)
  Option B: Inline in right column, sticky below 🔥 section
  Recommend: Top-right (56px from edge) to avoid content conflict
```

**Breakpoint:** 768px (Tailwind `md:` equivalent). CSS media query:
```css
@media (min-width: 768px) {
  .queue-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    /* etc */
  }
}
```

---

## Animations & Transitions

| Element | Event | Animation | Duration | Easing |
|---------|-------|-----------|----------|--------|
| Answer row → save | User input → 2s idle | Debounce timer runs silently | 2000ms | — |
| Save indicator | API pending | Fade in "Saving..." | 150ms | ease-in-out |
| Checkmark | API success | Fade in ✓ | 200ms | ease-in-out |
| Row exit | 1.5s after checkmark | Slide-left + fade | 300ms | ease-out |
| Section expand | Click header | Chevron rotate + rows fade-in | 200ms | ease-out |
| FAB tap | Tap + button | Opacity dip (0.9) | 100ms | ease-out |
| Bottom sheet slide | FAB tap | Slide up from bottom | 300ms | cubic-bezier(0.16, 1, 0.3, 1) |
| Sheet dismiss | Backdrop tap or Esc | Slide down + fade | 200ms | ease-in |
| Drop button success | POST success | Checkmark flash + 1s dwell | 1000ms | — |
| Toast notification | Success | Fade in top-center, auto-dismiss 3s | fade-in 150ms, fade-out 150ms | ease-in-out |
| Pull-to-refresh | Scroll up on mobile | Native iOS bounce + spinner | system | — |

**Motion principles:**
- Micro-interactions: 150–200ms (button hover, checkbox toggle)
- Page transitions: 200–300ms (section expand, row disappear)
- Loading feedback: 300–500ms (sheet slide, spinner spin)
- All animations honor `prefers-reduced-motion: reduce` (fade only, no slide)

---

## Breakpoints & Responsive

| Screen Size | Grid Cols | Padding | Font Mobile Adjustment | FAB Position |
|-------------|-----------|---------|------------------------|--------------|
| 320px (iPhone SE) | 1 | 12px | 16px (no delta) | 16px from corner |
| 375px (iPhone 12) | 1 | 16px | 16px | 16px from corner |
| 640px (iPad mini portrait) | 1 | 16px | 16px | 16px from corner |
| 768px+ (tablet/desktop) | 2 (60/40) | 20px | 17px (per Dan spec) | 20px from corner |

**Safe-area insets:** Use `env(safe-area-inset-*)` on mobile (iPhone X+).
```css
@media (max-width: 767px) {
  .fab {
    bottom: calc(16px + env(safe-area-inset-bottom, 0));
    right: calc(16px + env(safe-area-inset-right, 0));
  }
}
```

---

## Empty States

| Section | Empty Message | Icon/Color |
|---------|---------------|-----------|
| ⚡ Waiting | "No open asks. Clean slate. 🧠" | Gray, 14px italic |
| 🔥 Now | "Nothing active right now." | Gray |
| 👀 Watch | "Nothing on the radar." | Gray |
| 📥 Queue | "Nothing dropped. Tap + when something hits. 💭" | Gray, with FAB hint |
| ✅ Closed | "No completions this week yet." | Gray, faded |

**Rendering:** If section has 0 rows, show empty state instead of rows. Center, vertical alignment. No icons (SVG would clutter; text is enough).

---

## Interactions & Micro-behaviors

### Answer Debounce (⚡ Waiting)
```javascript
state: {
  answerText: '',
  isSaving: false,
  debounceTimer: null
}

On textarea input:
  1. Clear debounceTimer
  2. Update state.answerText
  3. Set debounceTimer = setTimeout(save, 2000ms)

On save (debounceTimer fires):
  1. state.isSaving = true
  2. Render "Saving..." indicator
  3. POST /api/dan-colin-queue/:id/answer { body: answerText }
  4. On success: render ✓, state.isSaving = false
  5. After 1500ms: animate row out (slide-left 300ms)
  6. Remove row from DOM, move to ✅ section
```

**User expectations:**
- Type → no visual feedback yet (just textarea state)
- Stop typing 2s → "Saving..." appears
- 0.5s later → "✓ Saved" checkmark
- 1.5s later → row vanishes with animation

### Pull-to-Refresh (Mobile)
```javascript
On scroll y-offset > 40px (pull down):
  Show spinner icon below header
  On release:
    Fetch /api/dan-colin-queue
    Refresh all sections
    Spinner fades out
```
**Implementation:** Use native iOS/Android pull-to-refresh if available (via Intersection Observer + scroll event), else fake with manual scroll detection.

### Collapse/Expand Sections
```javascript
On section header click:
  Toggle aria-expanded
  If collapsed → expanded:
    Render rows with fade-in animation (200ms)
  If expanded → collapsed:
    Fade out rows (200ms) → remove from DOM (still in state)
```

### Drop Sheet Lifecycle
```javascript
On FAB click:
  state.showDropSheet = true
  Render backdrop + sheet
  Sheet slides up (300ms)
  Textarea auto-focus

On textarea input:
  state.dropText = updated value
  Validate length (if needed)

On Cancel:
  state.showDropSheet = false
  Backdrop fade out (200ms)
  Sheet slide down (200ms)
  state.dropText reset to ''

On Drop:
  Validate dropText (min 10 chars? up to backend)
  state.isDropping = true
  Button shows spinner (or disable + spinner)
  POST /api/dan-colin-queue { section: "📥", owner: "Colin", status: "Open", body: dropText }
  On success:
    Button shows ✓ (green, 1s dwell)
    Toast: "In Colin's queue → processed midday" (green, fade in 150ms, auto-dismiss 3s)
    state.showDropSheet = false
    Backdrop fade out (200ms)
    Sheet slide down + dismiss (200ms, after toast starts)
    state.dropText = ''
  On error:
    Show error message (red, 14px) below textarea
    state.isDropping = false
    Button re-enabled, user can retry
```

---

## Cursor & Focus States

| Element | Cursor | Focus Ring | Hover Feedback |
|---------|--------|-----------|-----------------|
| Answer textarea | text | `outline: 2px var(--accent); outline-offset: 2px` | border-color → --accent (150ms) |
| Row (🔥/👀) | pointer | outline as above | bg → --bg-hover (150ms) |
| Button (Cancel/Drop) | pointer | outline as above | opacity 0.9 (150ms) |
| FAB | pointer | outline as above | opacity 0.9 (100ms) |
| Section header (collapse) | pointer | outline as above | text-color slight brighten (150ms) |

**All interactive elements:** `cursor-pointer` or `cursor-text` (textarea).
**All buttons/clickables:** `button:disabled { opacity: 0.5; cursor: not-allowed; }`

---

## Accessibility

- **ARIA labels:** All icon buttons get `aria-label` (e.g., "Drop into queue", "Collapse Watch section")
- **Keyboard nav:** Tab order follows visual flow (left-to-right, top-to-bottom). Can answer, drop, and collapse sections via Enter.
- **Screen readers:** Section headers announce count. Rows announce body + rec + timestamp. Actions get labels.
- **Color contrast:** All text ≥4.5:1 (dark theme helps). Badges tested against background.
- **Motion:** Animations conditional on `prefers-reduced-motion: reduce` → fade only (no slide/scale).
- **Touch targets:** All buttons ≥44×44px (FAB, section headers, input fields). Row body is 1 column, touch-friendly padding.

---

## Implementation Notes for Frontend-Builder

1. **No Tailwind utilities** — Use inline `style` attributes or class-based CSS in `src/css/views/dan-colin-queue.css`. Project constraint per CLAUDE.md.
2. **Alpine directives:** `x-data`, `x-show`, `x-bind:class`, `x-on:click`, etc. Keep state in module.
3. **Debounce helper:** Write a small utility function (`debounce(fn, delay)`) or use Alpine's `@change` event with manual timer.
4. **API endpoints:** Assume `POST /api/dan-colin-queue/answer/:id`, `POST /api/dan-colin-queue/drop`, `GET /api/dan-colin-queue` (fetch all sections).
5. **Backend will provide:** Section structure with Notion DB fields mapped to `{ id, body, section, owner, status, rec?, timestamp }`.
6. **Module structure:** `src/js/modules/dan-colin-queue.js` exports `createDanColinQueueModule()`. State: sections (object keyed by section name), rows (array per section), UI states (showDropSheet, isSaving, isDropping, expandedSections).
7. **CSS split:** `src/css/views/dan-colin-queue.css` for all styles (animations, responsive, dark-theme colors). Import in main styles or lazy-load with view.
8. **Mobile-first CSS:** Write base styles for mobile (< 768px), then `@media (min-width: 768px)` for desktop overrides.
9. **SVG icons:** Use Lucide (or Heroicons from existing project deps). No emoji icons.
10. **Animations:** Use CSS keyframes for slide/fade, Alpine for state-driven visibility. Prefer `transform` + `opacity` for performance (GPU acceleration).

---

## Design Decisions & Tradeoffs

| Decision | Chosen | Rejected | Reason |
|----------|--------|----------|--------|
| Dark or light background? | Dark (CC theme) | Light (#FAFAFA per Dan) | Consistency, no eye strain, native to app |
| Left border on all rows? | Yes, color-coded | No, just header accent | Visual hierarchy, quick section scanning |
| Recommendation line always visible? | Yes | Hidden behind expand | Zero-click read principle |
| Answer input always visible? | Yes (⚡ only) | In a modal/drawer | Inline editing faster than open → type → close |
| Debounce or save-on-blur? | 2s idle debounce | On blur | Habit: users expect auto-save UX, not form-submit |
| Bottom sheet vs modal for composer? | Bottom sheet | Modal | Mobile standard, takes less vertical space |
| Collapse 👀/✅ by default? | Yes | Expanded | Less cognitive load, user can expand if needed |
| Count badge: pill or text? | Pill badge | Text only | Easier to scan, color-coded by section |
| FAB position: fixed or inline? | Fixed bottom-right | Inline in right column | Always reachable, no scroll-to-action |

---

## Files to Create/Modify

| File | Agent | Purpose |
|------|-------|---------|
| `src/js/modules/dan-colin-queue.js` | frontend-builder | Main module (state, methods, lifecycle) |
| `src/css/views/dan-colin-queue.css` | frontend-builder | All styles (animations, responsive, colors) |
| `public/partials/dan-colin-queue.html` | frontend-builder | Alpine template (view structure) |
| `src/js/app.js` | frontend-builder | Wire module into main app, register route |
| `server/routes/dan-colin-queue.js` | backend-builder | API endpoints (fetch, answer, drop) |
| `server/services/dan-colin-queue-service.js` | backend-builder | Notion DB queries, section composition |
| `test/dan-colin-queue.test.js` | tester | Unit tests for state/animations |
| `test/integration/dan-colin-queue-http.test.js` | tester | API route integration tests |

---

## Success Criteria (QA Checklist)

- [ ] Mobile: All text readable at 16px, no horizontal scroll
- [ ] Mobile: FAB and answer textarea touch targets ≥44×44px
- [ ] Mobile: Pull-to-refresh works (native or polyfill)
- [ ] Mobile: Rows respond to answer input within 100ms
- [ ] Mobile: Save indicator appears after 2s idle
- [ ] Mobile: Row exits with slide-left animation on success
- [ ] Mobile: Bottom sheet slides up smoothly on FAB tap
- [ ] Desktop: 2-column layout active at ≥768px
- [ ] Desktop: 🔥 and 👀 visible together in right column
- [ ] Accessibility: All buttons/inputs have visible focus rings
- [ ] Accessibility: Screen reader announces section counts and row actions
- [ ] Accessibility: Keyboard navigation (Tab, Enter) fully functional
- [ ] Animations: All respect `prefers-reduced-motion: reduce`
- [ ] Colors: All text ≥4.5:1 contrast in dark mode
- [ ] Dark mode: No light backgrounds, all --css-vars used
- [ ] Network: Error state on drop shows user message, button re-enables
- [ ] Network: Debounce prevents rapid-fire saves (test by typing, then stopping)
- [ ] Responsive: Tested at 320px, 375px, 640px, 768px, 1024px, 1440px

---

**Handoff ready:** Frontend-builder can start coding from this spec. Backend-builder should prepare Notion DB queries and the 4 API endpoints (fetch all, answer submit, drop submit, refresh). No CSS or JS written yet — this is the design spec only.

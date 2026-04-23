# Dan ↔ Colin Queue — Design Spec v2 (Improvement Pass)

**Scope:** Layers on v1 (`dan-colin-queue.md`). Only v2 deltas documented here. All unchanged specs (layout, color mapping, animation base timings) refer to v1. **Status:** Ready for frontend-builder handoff.

---

## Summary of Changes

1. **Typographic hierarchy tune** — Body/Rec/Answer cadence refined for readability at 60+ char lines.
2. **Sticky section-chip nav (mobile)** — Horizontal chip bar under header with live counts + scroll-spy.
3. **Age pills** — 6px pills in row top-right (replace timestamp) showing relative time + stale-state red for >3d.
4. **Focus Area colour dot + legend** — 6px dot per row colored by first focus area; collapsible legend in header.
5. **Keyboard shortcut layer** — j/k nav, Enter expand, a for answer, Esc dismiss, ⌘K drop, ? cheatsheet.
6. **Empty state per section** — Enrich with icons, dashed borders, copy tuned per section.
7. **Closed section count-badge styling** — Promote muted-variant count to proper pill chip.
8. **Loading + error states** — Skeleton audit + slow-network toast (>3s) via existing toast mechanism.
9. **Answer field saving microstate** — Inline save indicator with debounce-running dot, typing → saving → saved visual flow.
10. **Mobile FAB thumb-reach audit** — Increase padding to 20px, hide on textarea focus.

---

## Token Additions

**Declare in `:root` (alongside existing --amber-muted):**

```css
/* Focus Area color palette: 8 deterministic colors from existing tokens */
--dc-fa-color-1: var(--amber);           /* #f59e0b */
--dc-fa-color-2: var(--red);             /* #ef4444 */
--dc-fa-color-3: var(--accent);          /* #3b82f6 */
--dc-fa-color-4: var(--green);           /* #22c55e */
--dc-fa-color-5: var(--purple);          /* #a855f7 */
--dc-fa-color-6: var(--teal);            /* #14b8a6 */
--dc-fa-color-7: var(--yellow);          /* #eab308 */
--dc-fa-color-8: color-mix(in srgb, var(--indigo) 60%, var(--accent) 40%);

/* Age pill stale threshold */
--dc-age-stale: var(--red);              /* Red for >3 days old */

/* Chip nav active state */
--dc-chip-active: var(--accent);         /* #3b82f6 */
--dc-chip-active-underline: 2px solid var(--dc-chip-active);

/* Slow-network toast variant */
--dc-toast-neutral: #888888;             /* Muted gray, not red */
```

---

## 1. Typographic Hierarchy

**Goal:** Make the Body → Rec → Answer flow visually obvious. Real data shows body text often 50–70 chars. Rec line adds context. Answer input is secondary action.

| Element | Size | Weight | Line-height | Letter-spacing | Color | Notes |
|---------|------|--------|-------------|-----------------|-------|-------|
| **Body (Row)** | 16px mobile / 17px desktop | 400 | **1.6** | 0 | `--text-primary` | Increased line-height from 1.5 to 1.6 for breathing room on long text. Tighter than 1.75 to avoid gaps. |
| **Rec line** | 14px | 400 italic | **1.5** | 0 | **`--text-secondary` @ full opacity** (was 60% opacity) | Promotion: now 4.5:1 contrast (#888888 on #161616). Strong enough to be read as connected advice, not whisper. |
| **Answer textarea** | 16px | 400 | 1.5 | 0 | `--text-primary` | Matches body. Placeholder: `--text-muted`. |
| **Age pill text** | 11px | 500 | 1 | 0 | token-dependent (red if stale, muted if fresh) | Compact, right-aligned, high-frequency reference. |
| **Timestamp (hidden in v2)** | — | — | — | — | — | Replaced by age pill. |

**Line-length principle:** At 16px Inter with 1.6 line-height, 50–70 chars per line = ideal. Mobile 375px viewport (16px padding ea side = 343px content) ≈ 60 chars. Desktop 768px (20px padding ea side per v1) ≈ 80 chars. No forced breaks; let text wrap naturally.

---

## 2. Sticky Section-Chip Nav (Mobile Only)

**Placement:** Sticky below `.dc-sticky-header` (z-index 9, let header stay at 10).

**Structure:**
```
[Header: "Wed, Apr 23" | "2 waiting"]
[Chip nav: 🔥 2 · ⚡ 4 · 📥 0 · 👀 7 · ✅ 7]  ← sticky, scrolls with content
[⚡ Waiting section]
...
```

**Chip bar layout:**
- Height: 40px (touch-friendly)
- Padding: 0 16px (match header)
- Flex row, `gap: 8px`, `align-items: center`, `overflow-x: auto` (scroll if cramped)
- Each chip: `min-width: 50px`, centered text, flex-shrink: 0
- Background: `--bg-secondary` (blend with header)
- Border-bottom: 1px `--border-light` (visual closure)

**Chip styling:**
```css
.dc-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: all 150ms ease;
}
.dc-chip--active {
  color: var(--dc-chip-active);
  background: var(--blue-a08);  /* Subtle blue tint behind active chip */
  border-bottom: var(--dc-chip-active-underline);
}
```

**Scroll-spy via IntersectionObserver:**
- On mount, attach observer to each section header (⚡, 🔥, 👀, 📥, ✅).
- When section enters viewport, set `.dc-chip--active` on matching chip.
- Tap chip → smooth-scroll to section (use `element.scrollIntoView({ behavior: 'smooth' })`) + set active state.
- **Hide on desktop** (≥768px): `@media (min-width: 768px) { .dc-chip-nav { display: none; } }`

**State additions to module:**
```javascript
dcChipNav: {
  activeSection: 'waiting',  // 'waiting' | 'now' | 'watch' | 'drop' | 'closed'
}
```

---

## 3. Age Pills (Every Row)

**Placement:** Top-right corner of row, 6px from edge (replace `.dc-row-timestamp`).

**Compute logic:**
```javascript
function computeAgePill(updatedAt, createdAt) {
  const now = Date.now();
  const dateToUse = updatedAt || createdAt;
  const ageMs = now - new Date(dateToUse).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const ageDays = ageHours / 24;

  if (ageHours < 1) return 'just now';
  if (ageHours < 24) return `${Math.floor(ageHours)}h ago`;
  if (ageDays < 7) return `${Math.floor(ageDays)}d ago`;
  return `${Math.floor(ageDays / 7)}w ago`;
}
```

**Stale threshold:** If `ageDays ≥ 3` → apply `.dc-age-pill--stale`.

**Styling:**
```css
.dc-age-pill {
  position: absolute;
  top: 8px;
  right: 10px;
  height: 6px;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  background: transparent;
  white-space: nowrap;
  line-height: 1;
}
.dc-age-pill--stale {
  color: var(--dc-age-stale);  /* var(--red) */
  background: var(--red-a08);  /* 8% red tint */
}
```

**Template change:** Remove `.dc-row-timestamp` span, replace with:
```html
<span class="dc-age-pill" :class="dcIsAgePillStale(row) && 'dc-age-pill--stale'" x-text="dcComputeAgePill(row.updatedAt || row.createdAt)" aria-label="Last updated"></span>
```

---

## 4. Focus Area Colour Dot + Legend

**Visual:** 6px circular dot at row top-left (inside left 3px border gap or as separate element), colored by first focus area in `row.focusAreaNames[0]`.

**Color mapping:**
```javascript
function getFocusAreaColor(focusAreaName) {
  const hash = focusAreaName
    .split('')
    .reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  const colorIndex = Math.abs(hash) % 8 + 1;  // 1–8
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--dc-fa-color-${colorIndex}`)
    .trim();
}
```

**Dot styling:**
```css
.dc-row-focus-dot {
  position: absolute;
  top: 12px;
  left: 6px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  z-index: 1;
  /* background set by inline :style="color: ..." */
}
```

**Legend (collapsible on mobile, sticky on desktop):**
- **Mobile:** Collapse toggle in sticky header or below it, slide-down card listing all 8 colors + sample FA names.
- **Desktop:** Visible always, inline in sticky header right section, small pill list.
- **Structure:** `[●  Focus Area 1] [●  Focus Area 2] ... [●  Other]`
- Layout: Flex wrap, `gap: 6px`, `font-size: 11px`, muted color.

**State additions:**
```javascript
dcFocusAreaLegendOpen: false,  // Mobile only
```

---

## 5. Keyboard Shortcut Layer

**Scope:** Module-level event listener, attached on view mount, detached on unmount. **Not global** (avoid leaking to other views).

**Shortcuts:**

| Key | Action | Scope | Fallback |
|-----|--------|-------|----------|
| `j` | Move focus to next row | All sections | No-op if at bottom |
| `k` | Move focus to prev row | All sections | No-op if at top |
| `Enter` | Expand/open focused row | ⚡ → focus answer; others → open detail panel | Calls existing `openDetailPanel` |
| `a` | Jump focus to answer textarea | ⚡ Waiting only | No-op if not in Waiting |
| `Esc` | Blur current input / dismiss drop sheet | Global | Calls existing `closeDropSheet()` |
| `⌘K` or `Ctrl+K` | Open drop sheet | Global | Calls existing `openDropSheet()` |
| `?` | Toggle cheatsheet overlay | Global | Shows/hides card |

**State additions:**
```javascript
dcFocusedRowIndex: null,        // null or number (index in current section)
dcCheatsheetOpen: false,        // Toggle via ?
dcKeyboardAttached: false,      // Prevent double-attach on hot-reload
```

**Focused row styling:**
```css
.dc-row--focused {
  outline: 2px solid var(--accent);
  outline-offset: 0;
}
```

**Cheatsheet overlay:**
- Fixed position, top-right / center-right, `z-index: 55`
- Compact card (280px wide), dark bg matching sheet, monospace code examples
- Close: click outside or press Esc
- Animation: fade-in 150ms

**Keyboard handler attachment (pseudocode):**
```javascript
// In module mount lifecycle
if (!this.dcKeyboardAttached) {
  this._dcKeydownHandler = (e) => { ... };
  window.addEventListener('keydown', this._dcKeydownHandler);
  this.dcKeyboardAttached = true;
}

// In module unmount
window.removeEventListener('keydown', this._dcKeydownHandler);
this.dcKeyboardAttached = false;
```

---

## 6. Empty State Per Section

**Principle:** Each section signals "what goes here" via icon + copy + visual cue.

| Section | Icon | Headline | Subheadline | Border Cue |
|---------|------|----------|-------------|-----------|
| **⚡ Waiting** | (none, keep minimal) | "No open asks." | "Clean slate." | None |
| **🔥 Now** | (none) | "Nothing active." | "Check back soon." | None |
| **👀 Watch** | (none) | "Nothing on radar." | "Items you're monitoring go here." | None |
| **📥 Drop** | 📥 Lucide `inbox` (16px, muted) | "Nothing dropped yet." | "Tap + or press ⌘K to drop." | Dashed 1px border box, 12px padding, rounded, center-align icon above text |
| **✅ Closed** | (none) | "No completions yet." | "Items move here when answered." | None |

**Drop-specific styling:**
```css
.dc-empty--drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  border: 1px dashed var(--border-light);
  border-radius: var(--radius);
  background: transparent;
}
.dc-empty--drop svg {
  width: 16px;
  height: 16px;
  color: var(--text-muted);
  margin-bottom: 4px;
}
```

**Copy rendering:**
```html
<div class="dc-empty" :class="section === 'drop' && 'dc-empty--drop'">
  <template x-if="section === 'drop'">
    <i data-lucide="inbox" style="width:16px;height:16px" aria-hidden="true"></i>
  </template>
  <p x-text="dcEmptyHeadline(section)"></p>
  <p style="font-size:13px;color:var(--text-muted)" x-text="dcEmptySubheadline(section)"></p>
</div>
```

**Animation:** Fade-in 200ms on render (no slide — subtle presence).

---

## 7. Closed Section Count-Badge Styling

**Change:** The count in `.dc-section-header--closed` (currently plain `--text-muted` at 12px) becomes a proper `.dc-count-badge--closed` pill.

**Styling:**
```css
.dc-count-badge--closed {
  background: transparent;
  border: 1px solid var(--border-light);
  color: var(--text-muted);
  font-size: 11px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
}
```

**Template:**
```html
<span x-show="dcClosedCount() > 0" class="dc-count-badge dc-count-badge--closed" x-text="dcClosedCount()" aria-label="Closed count"></span>
```

---

## 8. Loading + Error States

**Skeleton audit:** Existing `.dc-skeleton-card` (80px height, pulse animation) is solid. Keep as-is.

**Slow-network toast:**
- **Trigger:** If `loadDanColin()` takes >3000ms without resolving.
- **Show:** "Notion is slow… still loading" toast, neutral gray (`--dc-toast-neutral`), bottom-aligned (not top).
- **Dismiss:** Auto-hide when request completes (success or error).
- **Implementation:** Wrap fetch with a 3s timer, show toast on timeout, clear on response.

```javascript
async loadDanColin() {
  const timer = setTimeout(() => {
    this._showDcToast('Notion is slow… still loading', 'neutral');
  }, 3000);
  
  try {
    // fetch...
    clearTimeout(timer);
    if (dcToast?.type === 'neutral') {
      this.dcToast = null;  // dismiss slow-network toast
    }
  } catch (err) {
    clearTimeout(timer);
    this._showDcToast('Failed to load queue. Try again.', 'error');
  }
}
```

**Toast neutral styling:**
```css
.dc-toast--neutral {
  background: var(--dc-toast-neutral);
  color: #fff;
}
```

---

## 9. Answer Field Saving Microstate

**Flow:** idle → typing (debounce timer silent) → debounce running (dot pulse) → saving (text + spinner) → saved (checkmark + "Saved") → fade.

**Debounce-running indicator:** Add a second visual next to `.dc-save-indicator`:

```html
<div class="dc-answer-wrap">
  <textarea class="dc-answer-textarea" ...></textarea>
  
  <!-- Debounce indicator: visible while timer is running, before "Saving..." -->
  <div x-show="dcIsDebounceRunning(row.id)" class="dc-debounce-dot" aria-hidden="true"></div>
  
  <!-- Save indicator: "Saving..." or "✓ Saved" -->
  <div x-show="dcIsSaving(row.id) || dcIsSaved(row.id)" class="dc-save-indicator" :class="dcIsSaved(row.id) && 'dc-save-indicator--saved'" aria-live="polite">
    ...
  </div>
</div>
```

**Styling:**
```css
.dc-debounce-dot {
  display: inline-block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--text-muted);
  margin-left: 6px;
  animation: dcDotPulse 1.5s ease-in-out infinite;
  vertical-align: middle;
}
@keyframes dcDotPulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.dc-save-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
  font-size: 12px;
  color: var(--text-muted);
  animation: dcFadeIn 150ms ease-in-out;
}
.dc-save-indicator--saved {
  color: var(--green);
}
```

**State & logic:**
```javascript
// When typing
answerDebounce(rowId, text) {
  this.danColinDraftAnswer[rowId] = text;
  clearTimeout(this._dcDebounceTimers[rowId]);
  if (text.trim()) {
    this._dcDebounceTimers[rowId] = setTimeout(() => {
      this.submitAnswer(rowId, text);
    }, 2000);
  }
}

dcIsDebounceRunning(rowId) {
  return !!this._dcDebounceTimers[rowId];  // Timer exists but hasn't fired
}
```

---

## 10. Mobile FAB Thumb-Reach Audit

**Changes:**
- **Spacing:** Increase from `16px` to `20px` right and bottom.
- **Safe-area adjustment:** Keep `env(safe-area-inset-*)` additive.
- **Hide on textarea focus:** When `.dc-answer-textarea` is focused, hide FAB.

**Updated CSS:**
```css
.dc-fab {
  position: fixed;
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  right: calc(20px + env(safe-area-inset-right, 0px));
  width: 56px;
  height: 56px;
  z-index: 50;
  /* rest unchanged from v1 */
}

/* Hide FAB when answer textarea is focused */
.dc-answer-wrap:focus-within ~ .dc-fab,
.dc-body:has(.dc-answer-textarea:focus) .dc-fab {
  opacity: 0;
  pointer-events: none;
  transition: opacity 150ms ease;
}
```

**Rationale:** iPhone 15 Pro (393 × 852px) has button at (393-20-56=317, 852-20-56=776), thumb-reachable. 20px avoids clip on notch and home indicator. `:focus-within` on answer wrap toggles FAB visibility so it doesn't occlude the "Saved" indicator.

---

## Keyboard Shortcut Reference (For Cheatsheet Card)

```
NAVIGATION
  j / k         Move to next / previous row
  Enter         Expand or open focused row

WRITING
  a             Jump to answer field
  ⌘K / Ctrl+K   Open drop sheet
  Esc           Close sheet or blur input

HELP
  ?             Toggle this cheatsheet
```

---

## Accessibility Checklist

| Item | v1 Status | v2 Change | Implementation |
|------|-----------|-----------|-----------------|
| **Focus ring on rows** | Outline 2px accent | Unchanged | Keep `.dc-row--focused` outline |
| **Keyboard nav (j/k)** | Not present | ✅ NEW | Module-level handler, avoid global leak |
| **ARIA labels** | Buttons labeled | Expanded | Age pill: aria-label "Last updated". Focus dot: aria-hidden. |
| **Color contrast** | 4.5:1 checked | ✅ Improved | Rec line now full `--text-secondary` (was 60%), stale age pill red on background. Test at >4.5:1. |
| **prefers-reduced-motion** | Honored | Unchanged | Debounce dot pulse → no animation; cheatsheet fade only. |
| **Touch targets** | 44×44px+ | FAB 56×56 + safe-area | Same as v1. Age pill & focus dot non-interactive. |
| **Screen reader** | Section headers announce counts | Expanded | Chip nav: aria-current="page" on active chip. Cheatsheet: role="dialog" + aria-label. |

---

## Files to Create/Modify (v2 Phase)

| File | Purpose | Notes |
|------|---------|-------|
| `src/js/modules/dan-colin.js` | State + methods for age pills, keyboard, focus tracking | Add: `dcChipNav`, `dcFocusedRowIndex`, `dcCheatsheetOpen`, `dcIsDebounceRunning()`, etc. |
| `public/partials/dan-colin.html` | Template: age pills, chip nav, focus dots, cheatsheet, improved empty states | Replace timestamp spans with age-pill spans. Add chip-nav section below header. |
| `src/css/views/dan-colin.css` | Styles for v2 elements (age pill, chip nav, focus dot, cheatsheet, improved empty states) | Add all new class definitions + animations. |

---

## Summary: V1→V2 Deltas

- **Typography:** Line-height bumped to 1.6 for body, rec line promoted to full contrast.
- **Navigation:** Sticky chip bar on mobile with scroll-spy.
- **Time display:** Age pill replaces timestamp, stale state red.
- **Visual hierarchy:** Focus area color dots indexed by focus area name.
- **Keyboard:** Full shortcut layer (j/k/Enter/a/Esc/⌘K/?).
- **UX feedback:** Debounce-running dot, slow-network toast, cheatsheet overlay.
- **Empty states:** Icon + dashed border for Drop section, copy tweaked per section.
- **Mobile thumb-reach:** FAB 20px padding, hides when answer textarea focused.

---

## Handoff to Frontend-Builder

Build order:
1. **State module** (`src/js/modules/dan-colin.js`) — Add all new state vars + helper methods (age pill compute, focus tracking, keyboard handler, etc.).
2. **Template** (`public/partials/dan-colin.html`) — Add age pills, chip nav, focus dots, cheatsheet modal, updated empty states. Swap timestamp for age-pill.
3. **Styles** (`src/css/views/dan-colin.css`) — Implement all v2 class definitions, animations, responsive breakpoints.
4. **Integration test** — Verify keyboard shortcuts don't leak across views, scroll-spy works, age pill stale state triggers at 3 days.

All v1 layout, color tokens, animation base timings remain unchanged. v2 is additive (new chips, dots, pills, keyboard) + refinements (typography, empty states, microstate visuals).

**No new font imports, no Tailwind utilities, dark theme only, mobile-first CSS.**

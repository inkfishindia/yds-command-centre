# Design System — YDS Command Centre

## Purpose

This directory contains the design specification for the YDS Command Centre and its modules. It ensures visual consistency, accessibility, and implementation clarity across the application.

## Files

### Primary Documents

1. **CONTENT-CALENDAR-BRIEF.md** ← **START HERE**
   - Full design specification for the Content Calendar view
   - Component structure, layouts, colors, typography, spacing
   - Interactive states, micro-interactions, anti-patterns
   - Responsive strategy and file ownership
   - **Status**: Ready for frontend-builder

2. **TOKENS.md**
   - Quick reference for all CSS variables
   - Color mapping (semantics + channels + statuses)
   - Typography scale and sizing
   - Component dimensions
   - Spacing grid (8px baseline)
   - **Use when**: Implementing styles or checking color hex values

3. **CSS-PATTERNS.md**
   - Exact CSS class structures to implement
   - Copy-paste ready patterns for common components
   - Grid, flexbox, animation, form, modal patterns
   - BEM naming convention
   - **Use when**: Writing styles in `public/css/styles.css`

### Generated Files (from ui-ux-pro-max skill)

- `MASTER.md` — Global design system recommendations (for reference)
- `pages/content-calendar.md` — Page-specific overrides (for reference)

## How to Use

### For Frontend Builder

1. **Before writing any CSS or HTML**, read `CONTENT-CALENDAR-BRIEF.md` in full.
2. Reference `TOKENS.md` for exact color values and spacing.
3. Copy patterns from `CSS-PATTERNS.md` into `public/css/styles.css`.
4. Check component sizes and margins against the brief.
5. Test focus states, hover states, and mobile breakpoints.

### For Design Changes

If a design direction needs adjustment:

1. Update `CONTENT-CALENDAR-BRIEF.md` with the new specifications.
2. Update `TOKENS.md` with any new color or spacing values.
3. Update `CSS-PATTERNS.md` with new or modified CSS patterns.
4. Do NOT delete `MASTER.md` or `pages/` (they are reference docs).

## Hierarchy

Design tokens are applied in this order:

```
CONTENT-CALENDAR-BRIEF.md (full spec)
    ↓
TOKENS.md (quick reference for values)
    ↓
CSS-PATTERNS.md (implementation patterns)
    ↓
public/css/styles.css (final CSS)
```

When building, always check the brief first, then tokens, then patterns.

## Key Principles

1. **No Hardcoding** — All colors are CSS variables. Hex values only appear in `TOKENS.md`.
2. **Dark Mode Only** — No light mode support. All backgrounds use `--bg-*` variables.
3. **No Frameworks** — No Tailwind, Bootstrap, or other utilities. Vanilla CSS only.
4. **No New Fonts** — Use Inter (--font-ui) and IBM Plex Mono (--font-mono) only.
5. **No Emoji Icons** — All icons must be SVG (Lucide or Heroicons).
6. **Accessibility First** — All interactive elements must have visible focus states.
7. **Approval Gate** — All writes (create, update, delete) go through the approval queue.
8. **Alpine.js Only** — Frontend is SPA with x-data, x-show, x-for, etc. No React or Vue.

## Component Inventory

| Component | Status | Location |
|-----------|--------|----------|
| Calendar Grid (7 cols) | Ready | Brief + Patterns |
| Day Cells | Ready | Brief + Patterns |
| Content Chips | Ready | Brief + Patterns |
| Filter Bar | Ready | Brief + Patterns |
| Modal / Form | Ready | Brief + Patterns |
| Weekly List | Ready | Brief + Patterns |
| Approval Banner | Ready | Patterns |
| Loading States | Ready | Patterns |

## Color Reference (Quick Copy)

```css
/* Backgrounds */
--bg-primary: #0a0a0a;
--bg-secondary: #111111;
--bg-card: #161616;
--bg-hover: #1c1c1c;
--bg-input: #1a1a1a;
--bg-elevated: #1a1a1a;

/* Text */
--text-primary: #e5e5e5;
--text-secondary: #888888;
--text-muted: #777777;

/* Channels (Content Calendar) */
Email:    --accent (#3b82f6)
LinkedIn: --teal (#14b8a6)
Instagram: --purple (#a855f7)
Twitter:  --text-secondary (#888888)
Website:  --green (#22c55e)
Video:    --red (#ef4444)

/* Statuses */
Planned:     --yellow (#eab308)
In Progress: --amber (#f59e0b)
Scheduled:   --teal (#14b8a6)
Published:   --green (#22c55e)
Archived:    --text-muted (#777777)
```

## CSS Grid Breakpoints

```
Mobile:    375–768px   (1-column or 4-column calendar)
Tablet:    768–1024px  (full calendar + optional list)
Desktop:   1024px+     (7-column calendar + side list)
```

## Responsive Images & Icons

- All icons: **SVG from Lucide or Heroicons**, no emojis
- Icon size: 16px–24px (w-4, w-6 equivalent)
- Content images: Lazy load with `loading="lazy"`
- No WebP required (dark theme, low image volume)

## Performance Notes

- Calendar grid uses CSS Grid (no JavaScript layout)
- Day cells are static HTML, filtered via Alpine `x-show` (no DOM reflow)
- Modals use `<dialog>` with Alpine `x-show` (minimal overhead)
- Animations max 200–300ms (--transition-normal, --transition-slow)
- No infinite scroll — pagination or fixed month view

## Accessibility Checklist

- [x] Focus rings: 2px solid --accent, 2px offset
- [x] Color contrast: 4.5:1 minimum (WCAG AA)
- [x] Touch targets: 44px minimum (calendar day cells are 100px min-height)
- [x] Keyboard nav: Tab order matches visual order
- [x] Form labels: Associated via `<label for="id">`
- [x] Alt text: All images (if any) have descriptive alt
- [x] Error feedback: Near problem field, clear text
- [x] Reduced motion: prefers-reduced-motion respected (no auto-play)

## Future Expansions

If extending Content Calendar later:

1. **Week view**: Toggle between month/week (modify grid-template-columns)
2. **Drag & drop**: Calendar day → day (add `draggable` + Alpine events)
3. **Bulk edit**: Multi-select chips → batch status change
4. **Integrations**: Sync to email calendar (iCal), Slack, Teams
5. **Analytics**: Content performance dashboard per item

## File Ownership

| File | Owner | Task |
|------|-------|------|
| design-system/* | design-planner | Specification (this is it!) |
| public/css/styles.css | frontend-builder | CSS implementation |
| public/index.html | frontend-builder | HTML + Alpine templates |
| src/js/modules/marketing-ops.js | frontend-builder | Frontend state/methods |
| server/routes/marketing-ops.js | backend-builder | API endpoints |
| server/services/marketing-ops-service.js | backend-builder | Data composition |

## Questions?

1. **Color question** → Check `TOKENS.md`
2. **Component structure** → Check `CONTENT-CALENDAR-BRIEF.md` + `CSS-PATTERNS.md`
3. **Font/sizing** → Check `TOKENS.md` typography table
4. **Responsive behavior** → Check `CONTENT-CALENDAR-BRIEF.md` Responsive Breakpoints section
5. **Focus/hover** → Check `CSS-PATTERNS.md` Focus & Hover section

---

**Design System Version**: 1.0
**Last Updated**: 2026-03-21
**Status**: Ready for Implementation
**Next Phase**: Code Review (after frontend-builder completes)

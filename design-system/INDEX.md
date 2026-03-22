# Design System Index

Content Calendar feature — YDS Command Centre

**Location**: `/design-system/`
**Status**: Complete & Ready for Implementation
**Created**: 2026-03-21
**Lead**: design-planner

---

## Quick Navigation

### For Developers Starting Now
1. Read this file (you're here)
2. Open **CONTENT-CALENDAR-BRIEF.md** (full spec)
3. Bookmark **TOKENS.md** (quick reference)
4. Copy patterns from **CSS-PATTERNS.md**

### For Design Review
- Review **CONTENT-CALENDAR-BRIEF.md** (comprehensive)
- Check **VISUAL-REFERENCE.md** (ASCII diagrams)
- Verify colors in **TOKENS.md**

### For Quality Assurance
- Test against **CONTENT-CALENDAR-BRIEF.md** Anti-patterns
- Verify focus/hover from **CSS-PATTERNS.md**
- Check accessibility in **README.md**

---

## Files

| File | Size | Purpose |
|------|------|---------|
| **CONTENT-CALENDAR-BRIEF.md** | 16 KB | Full specification — colors, typography, components, layout, interactions |
| **TOKENS.md** | 4.2 KB | Quick reference — CSS variables, color palette, sizing grid |
| **CSS-PATTERNS.md** | 11 KB | Implementation patterns — ready-to-use CSS snippets |
| **VISUAL-REFERENCE.md** | 7 KB | ASCII diagrams — component layouts, colors, states |
| **README.md** | 5.3 KB | Navigation & principles — how to use this system |
| **INDEX.md** | This file | Quick navigation & overview |
| **MASTER.md** | 1 KB | Generated reference (skill output, not modified) |
| **pages/content-calendar.md** | 1 KB | Generated reference (skill output, not modified) |

---

## Design At A Glance

**Pattern**: Calendar-Driven Ops Dashboard
**Theme**: Dark mode (YDS standard)
**Grid**: 7-column calendar (monthly view)
**Colors**: All CSS variables, no hardcoding
**Icons**: SVG only (no emoji)
**Framework**: Alpine.js + vanilla CSS (no Tailwind)

### Key Components
- Calendar grid (100px+ min-height day cells)
- Content chips (24px height, channel-colored pills)
- Filter bar (channels, status, type)
- Create/edit modal (form with approval integration)
- Weekly list (companion view)

### Data Source
Notion content calendar table with fields:
- Name, Status, Content Type, Channel(s), Publish Date
- Owner, Campaign, Notes

### API Endpoints Needed
```
GET /api/marketing-ops/content/calendar?month=2026-03&filters=...
POST /api/marketing-ops/content (create)
PATCH /api/marketing-ops/content/:id (update)
DELETE /api/marketing-ops/content/:id (delete)
```

---

## What Frontend Builder Should Do

1. **Read**: CONTENT-CALENDAR-BRIEF.md completely
2. **Reference**: TOKENS.md while coding (colors, sizes)
3. **Copy**: CSS-PATTERNS.md patterns into `public/css/styles.css`
4. **Implement**:
   - HTML template in `public/index.html`
   - Alpine state/methods in `src/js/modules/marketing-ops.js`
   - CSS using patterns (no hardcoding colors)
5. **Build**: `npm run build`
6. **Test**: Focus states, hover, mobile breakpoints
7. **Review**: Against anti-patterns in brief

---

## What Backend Builder Should Do

1. **Route**: GET /api/marketing-ops/content/calendar (fetch + filter)
2. **Route**: POST /api/marketing-ops/content (create + approval)
3. **Route**: PATCH /api/marketing-ops/content/:id (update + approval)
4. **Route**: DELETE /api/marketing-ops/content/:id (delete + approval)
5. **Service**: Compose calendar data, resolve relations (Owner, Campaign)
6. **Integration**: Hook into approval gate for all writes

---

## Key Principles (Strict)

1. **No hardcoded colors** — All colors use CSS variables (--accent, --teal, etc.)
2. **No emoji icons** — All icons must be SVG (Lucide/Heroicons)
3. **No new fonts** — Use Inter (--font-ui) + IBM Plex Mono (--font-mono) only
4. **No frameworks** — Vanilla CSS with BEM naming, Alpine.js only
5. **No modified variables** — Use existing YDS CSS variables, create none new
6. **Accessibility mandatory** — Focus rings, contrast 4.5:1, 44px touch targets
7. **Approval gate required** — All writes go through amber banner + confirm
8. **8px baseline** — All spacing multiples of 4px or 8px

---

## Color Palette (Quick Copy)

```css
/* Backgrounds */
--bg-primary: #0a0a0a
--bg-card: #161616
--bg-hover: #1c1c1c
--bg-input: #1a1a1a
--bg-elevated: #1a1a1a

/* Text */
--text-primary: #e5e5e5
--text-secondary: #888888
--text-muted: #777777

/* Channels */
Email → --accent (#3b82f6)
LinkedIn → --teal (#14b8a6)
Instagram → --purple (#a855f7)
Twitter → --text-secondary (#888888)
Website → --green (#22c55e)
Video → --red (#ef4444)

/* Statuses */
Planned → --yellow (#eab308)
In Progress → --amber (#f59e0b)
Scheduled → --teal (#14b8a6)
Published → --green (#22c55e)
Archived → --text-muted (#777777)
```

---

## Responsive Breakpoints

| Device | Grid | List | Notes |
|--------|------|------|-------|
| Mobile (375–768px) | Week view or 4-col | Full width below | Simplified, touch-friendly |
| Tablet (768–1024px) | Full 7-col calendar | Below or collapsible | Compact layout |
| Desktop (1024px+) | Full 7-col calendar | Side panel | Optimal space usage |

---

## Timeline & Ownership

| Phase | Owner | Files |
|-------|-------|-------|
| Design (COMPLETE) | design-planner | design-system/* |
| Frontend build | frontend-builder | public/*, src/js/modules/marketing-ops.js |
| Backend build | backend-builder | server/routes/marketing-ops.js, server/services/marketing-ops-service.js |
| Code review | code-reviewer | All files |
| UX audit | ux-auditor | public/*, CSS, accessibility |

---

## Frequently Asked Questions

**Q: Where do I find exact color hex values?**
A: TOKENS.md (quick reference table)

**Q: What CSS classes should I create?**
A: CSS-PATTERNS.md has all the classes with structure

**Q: Can I use Tailwind?**
A: No. Vanilla CSS only with BEM naming

**Q: Can I add a new font?**
A: No. Use Inter (--font-ui) and IBM Plex Mono (--font-mono) only

**Q: What about emoji icons?**
A: No emoji. Use SVG icons from Lucide or Heroicons

**Q: Do I hardcode colors?**
A: No. All colors use CSS variables like var(--accent)

**Q: How long should animations be?**
A: Max 200–300ms (use --transition-normal or --transition-slow)

**Q: What if I need to change the design?**
A: Update CONTENT-CALENDAR-BRIEF.md, not the CSS directly

**Q: Do all writes need approval?**
A: Yes. All create/update/delete go through amber approval banner

---

## Pre-Implementation Checklist

Before frontend-builder starts:
- [ ] Read CONTENT-CALENDAR-BRIEF.md completely
- [ ] Understand the 8 key principles
- [ ] Know where colors come from (TOKENS.md)
- [ ] Know where CSS patterns come from (CSS-PATTERNS.md)
- [ ] Understand approval gate pattern
- [ ] Confirm Alpine.js x-data, x-show, x-for usage
- [ ] Have Lucide/Heroicons SVG icons ready

---

## Sign-Off

**Design System**: ✅ COMPLETE
**Specification**: ✅ FINALIZED
**Status**: ✅ READY FOR IMPLEMENTATION

All files are in `/design-system/`. No wireframes or Figma files needed.
Frontend builder has everything required to implement.

---

**For questions, reference CONTENT-CALENDAR-BRIEF.md § File Locations & Ownership**

Created by: design-planner (Haiku 4.5)
Date: 2026-03-21
Version: 1.0

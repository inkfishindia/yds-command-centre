# Design Tokens — Quick Reference

## Colors (CSS Variables)

### Backgrounds
- `--bg-primary`: #0a0a0a (page)
- `--bg-secondary`: #111111 (sidebar)
- `--bg-card`: #161616 (cards, default)
- `--bg-hover`: #1c1c1c (hover state)
- `--bg-input`: #1a1a1a (form inputs)
- `--bg-elevated`: #1a1a1a (modals, panels)

### Text
- `--text-primary`: #e5e5e5 (headings, main)
- `--text-secondary`: #888888 (secondary)
- `--text-muted`: #777777 (hints, muted)

### Semantic
- `--accent`: #3b82f6 (blue, primary actions)
- `--accent-dim`: #1e3a5f (blue tint background)
- `--green`: #22c55e (success, Published)
- `--green-dim`: #0a3d1f
- `--amber`: #f59e0b (warning, In Progress)
- `--amber-dim`: #3d2800
- `--red`: #ef4444 (danger, Archived/Delete)
- `--red-dim`: #3d0a0a
- `--teal`: #14b8a6 (secondary, Scheduled/LinkedIn)
- `--teal-dim`: rgba(20, 184, 166, 0.1)
- `--purple`: #a855f7 (tertiary, Instagram/Campaign)
- `--purple-dim`: #2d1854
- `--yellow`: #eab308 (Planned status)
- `--yellow-dim`: #3d3200

### Borders & Shadows
- `--border`: #222222 (standard)
- `--border-light`: #2a2a2a (secondary)
- `--shadow-card`: 0 1px 3px rgba(0,0,0,0.3)
- `--shadow-elevated`: 0 4px 16px rgba(0,0,0,0.4)
- `--shadow-overlay`: 0 16px 48px rgba(0,0,0,0.6)

### Utility
- `--transition-fast`: 150ms ease
- `--transition-normal`: 200ms ease
- `--transition-slow`: 300ms ease
- `--radius`: 6px
- `--radius-lg`: 10px

## Typography

Font families (no imports needed):
```css
--font-ui: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'IBM Plex Mono', 'SF Mono', 'Fira Code', monospace;
```

Scale:
| Use | Size | Weight | Line-height |
|-----|------|--------|-------------|
| Heading (Month) | 18px | 600–700 | 1.2 |
| Card title | 14px | 500 | 1.4 |
| Body / Label | 14px | 400 | 1.5 |
| Small text | 12px | 400–500 | 1.4 |
| Mono / Date | 12px | 500 | 1.4 |

## Spacing (8px baseline)

```
4px:  0.25rem (button padding small)
6px:  0.375rem (chip padding)
8px:  0.5rem (compact spacing)
12px: 0.75rem (standard padding)
16px: 1rem (normal padding)
24px: 1.5rem (modal/form padding)
32px: 2rem (section gaps)
```

## Component Sizing

### Calendar Day Cell
- Width: calc(100% / 7) (7-column grid)
- Min-height: 100px
- Padding: 8px
- Border: 1px solid --border
- Border-radius: --radius (6px)

### Content Chip
- Height: 24px
- Padding: 4px 8px
- Font: 12px, 500 weight
- Border-radius: 12px (pill)
- Background: channel-color at 15% opacity

### Form Input
- Height: 40–44px
- Padding: 0.5rem 0.75rem
- Font: 14px
- Border: 1px solid --border
- Focus border-color: --accent

### Button
- Height: 40px
- Padding: 0.5rem 1rem
- Font: 13px, 500 weight
- Border-radius: --radius (6px)

## Status Colors (Notion field)

| Status | Color | Background |
|--------|-------|------------|
| Planned | --yellow | --yellow-dim |
| In Progress | --amber | --amber-dim |
| Scheduled | --teal | --teal-dim |
| Published | --green | --green-dim |
| Archived | --text-muted | transparent |

## Channel Colors (Notion field)

| Channel | Color |
|---------|-------|
| Email | --accent (blue) |
| LinkedIn | --teal |
| Instagram | --purple |
| Twitter/X | --text-secondary (gray) |
| Website | --green |
| Video | --red |

## Focus & Hover

All interactive elements:
```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

Hover state:
```css
transition: all var(--transition-fast);
```

## Rules

1. Use CSS variables for all colors — never hardcode hex
2. No new fonts or imports
3. No Tailwind or framework utilities
4. No emoji icons — use SVG (Lucide/Heroicons)
5. Spacing: multiples of 4px or 8px
6. Border-radius: --radius (6px) for most elements, --radius-lg (10px) for messages/cards
7. Transitions: max 200–300ms (--transition-normal or --transition-slow)
8. Shadows: use defined shadow variables only
9. All dark mode, no light mode support
10. Approval gate integration for all writes

## Files Modified

- `public/css/styles.css` — add calendar/modal styles
- `src/js/modules/marketing-ops.js` — add calendar state/methods
- `public/index.html` — add calendar template
- `server/routes/marketing-ops.js` — add calendar endpoint
- `server/services/marketing-ops-service.js` — compose calendar data

---

Persistent Document: `/design-system/CONTENT-CALENDAR-BRIEF.md`
Tokens Updated: 2026-03-21

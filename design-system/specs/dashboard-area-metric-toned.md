# Dashboard Area Metric Cards — Tone Spec

Pressure-toned variant of `.mktops-area-metric-card` for **dashboard.html** (lines 82–90). Backend returns `tone: 'critical' | 'warning' | 'healthy' | 'neutral'` per metric; CSS applies visual hierarchy via color, border, and typography treatment. Mirrors `.mktops-hero--*` pattern from core.css.

## Tokens Used

All from `:root` in core.css:

| Token | Use |
|-------|-----|
| `--red`, `--red-a50`, `--red-a12` | Critical tone: border, bg tint, glow |
| `--amber`, `--amber-a40`, `--amber-a15` | Warning tone: border, bg tint, glow |
| `--green`, `--green-a35` | Healthy tone: border, text |
| `--text-primary`, `--text-secondary`, `--text-muted` | Typography hierarchy |
| `--bg-card`, `--border` | Card base (neutral fallback) |
| `--font-mono` | Value typeface (unchanged) |
| `--radius`, `--transition-normal` | Spacing / motion |

## Class Definitions

Base `.mktops-area-metric-card` (unchanged):
- `background: var(--bg-card)`
- `border: 1px solid var(--border)`
- `border-radius: 10px`
- `padding: 1rem`
- `cursor: pointer`

### Tone Modifiers

#### `.mktops-area-metric-card--critical`

```css
.mktops-area-metric-card--critical {
  border-color: var(--red-a50);
  background:
    radial-gradient(circle at top right, rgba(239, 68, 68, 0.12), transparent 40%),
    var(--bg-card);
}

.mktops-area-metric-card--critical .mktops-area-metric-label {
  color: var(--red);
}

.mktops-area-metric-card--critical .mktops-area-metric-value {
  color: var(--red);
}

.mktops-area-metric-card--critical .mktops-area-metric-note {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.55rem;
  padding: 0.35rem 0.6rem;
  background: var(--red-a12);
  border: 1px solid var(--red-a50);
  border-radius: 4px;
  font-size: 11px;
  color: var(--red);
  font-weight: 500;
}
```

#### `.mktops-area-metric-card--warning`

```css
.mktops-area-metric-card--warning {
  border-color: var(--amber-a40);
  background:
    radial-gradient(circle at top right, rgba(245, 158, 11, 0.1), transparent 40%),
    var(--bg-card);
}

.mktops-area-metric-card--warning .mktops-area-metric-label {
  color: var(--amber);
}

.mktops-area-metric-card--warning .mktops-area-metric-value {
  color: var(--amber);
}

.mktops-area-metric-card--warning .mktops-area-metric-note {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.55rem;
  padding: 0.35rem 0.6rem;
  background: var(--amber-a15);
  border: 1px solid var(--amber-a40);
  border-radius: 4px;
  font-size: 11px;
  color: var(--amber);
  font-weight: 500;
}
```

#### `.mktops-area-metric-card--healthy`

```css
.mktops-area-metric-card--healthy {
  border-color: var(--green-a35);
}

.mktops-area-metric-card--healthy .mktops-area-metric-label {
  color: var(--green);
}

.mktops-area-metric-card--healthy .mktops-area-metric-value {
  color: var(--green);
}

.mktops-area-metric-card--healthy .mktops-area-metric-note {
  color: var(--text-muted);
}
```

#### `.mktops-area-metric-card--neutral` (default, no modifier)

Base styles from `.mktops-area-metric-card`:
- Label: `var(--text-secondary)` (11px uppercase)
- Value: `var(--text-primary)` (28px mono)
- Note: `var(--text-muted)` (12px muted text)

## Typography Hierarchy Bump

All tones: increase value size from **28px → 46px** to dominate the card and match the "signal urgency" intent.

```css
.mktops-area-metric-card .mktops-area-metric-value {
  font-size: 46px;
  line-height: 1;
  font-weight: 700;
  font-family: var(--font-mono);
}
```

Label and note sizes unchanged (11px, 12px respectively).

## Icon Slot (top-left)

Add optional icon before label in markup (Lucide icon, 16px):

```html
<div class="mktops-area-metric-icon-slot"></div>
<span class="mktops-area-metric-label">…</span>
```

```css
.mktops-area-metric-icon-slot {
  width: 16px;
  height: 16px;
  margin-bottom: 0.3rem;
  color: inherit; /* Inherits tone color from parent card tone */
}
```

Frontend-builder maps metric `id` → Lucide icon name. Icon color auto-inherits from `.mktops-area-metric-card--{tone}` via CSS cascade.

## Hover / Focus State

```css
.mktops-area-metric-card {
  transition: all var(--transition-normal);
}

.mktops-area-metric-card:hover {
  border-color: color-mix(in srgb, currentColor 40%, var(--border));
  background: color-mix(in srgb, currentColor 8%, var(--bg-card));
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.mktops-area-metric-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Chevron indicator (top-right, hidden by default, shown on hover) */
.mktops-area-metric-card::after {
  content: '→';
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  font-size: 14px;
  color: var(--text-secondary);
  opacity: 0;
  transition: opacity var(--transition-normal);
}

.mktops-area-metric-card:hover::after {
  opacity: 1;
  color: currentColor;
}
```

**Focus-visible:** Outlined in `--accent` with 2px offset. Keyboard users see clear focus ring.

## Mobile Responsive

At **768px (tablet)**:
- `.mktops-area-metrics` grid: `repeat(4, ...)` → `repeat(2, ...)`
- All tone treatments scale unchanged (same border colors, same pill treatment for critical/warning notes)

At **390px (mobile)**:
- `.mktops-area-metrics` grid: `repeat(2, ...)` → `repeat(1, ...)`
- Value font: stays **46px** (readable on single-column layout)
- Pill note padding: tighten to `0.3rem 0.5rem` if space is tight

No layout breaks; tone visual hierarchy is preserved end-to-end.

## Note-as-Chip Rules

| Tone | Rendering |
|------|-----------|
| `critical` | Pill: red bg (`--red-a12`), red border (`--red-a50`), red text (`--red`), 11px bold, radius 4px, pad `0.35rem 0.6rem` |
| `warning` | Pill: amber bg (`--amber-a15`), amber border (`--amber-a40`), amber text (`--amber`), 11px bold, radius 4px, pad `0.35rem 0.6rem` |
| `healthy` | Muted text: `var(--text-muted)`, 12px regular — no pill |
| `neutral` | Muted text: `var(--text-muted)`, 12px regular — no pill |

Pills used for **critical** and **warning** only. Healthy and neutral stay as quiet body text to avoid visual noise.

## Layout & Spacing

- Card padding: 1rem (unchanged)
- Gap between cards: 0.75rem (unchanged)
- Icon slot above label: margin-bottom 0.3rem (new)
- Label to value: margin-top 0.45rem (unchanged)
- Value to note: margin-top 0.55rem (unchanged, adjusted for pill baseline if pill used)

## Files to Edit

- `src/css/views/marketingOps.css` — tone modifier rules (critical, warning, healthy) + pill styling
- `src/css/core.css` `:root` — (no new tokens; all existing)
- `public/partials/dashboard.html` — add icon slot to card markup (frontend-builder controls)

No new CSS files. All rules stay in `marketingOps.css` alongside the base `.mktops-area-metric-card` definition.

## Anti-patterns to Avoid

- **No drop shadows on tone borders.** Glow is via radial-gradient, not box-shadow.
- **No rounded corners >10px on card.** Matches existing hero card (10px).
- **No opacity flicker on hover.** Use transform + box-shadow for elevation; don't change opacity of the entire card.
- **No hardcoded hex colors.** All values via CSS custom properties (--red, --amber, etc.).
- **No pill treatment for healthy/neutral notes.** Quiet text only — reserve pill for high-signal tones.
- **Don't scale icon with zoom.** Icon slot is fixed 16px — scales with responsive breakpoints, but not on interaction.

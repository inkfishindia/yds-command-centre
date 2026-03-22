# Visual Reference — Content Calendar Components

ASCII diagrams and color references for quick visual validation during implementation.

---

## Calendar Grid Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│ HEADER: March 2026  [← Prev] [Today] [Next →]                         │
├────────────────────────────────────────────────────────────────────────┤
│ Channels: [Email] [LinkedIn] [Instagram] [Twitter] [Website] [Video]   │
│ Status: [All] [Planned] [In Progress] [Scheduled] [Published] [...]   │
├────────────────────────────────────────────────────────────────────────┤
│
│  SUN              MON              TUE              WED              THU
│ ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ │     1    │    │     2    │    │     3    │    │     4    │    │     5    │
│ │          │    │ [Blog]   │    │          │    │ [Email]  │    │ [Social] │
│ │          │    │ [Social] │    │          │    │ [LinkedIn]    │ [Video]  │
│ │          │    │ +1 more  │    │          │    │          │    │ +2 more  │
│ │          │    │  [+ Add] │    │          │    │  [+ Add] │    │  [+ Add] │
│ └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
│
│  FRI              SAT            [TODAY→SUN]      MON              TUE
│ ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ │     6    │    │     7    │    │    8     │    │     9    │    │    10    │
│ │          │    │          │    │ [Guide]  │    │          │    │ [Blog]   │
│ │          │    │ [+ Add]  │    │ [Email]  │    │ [+ Add]  │    │ [Email]  │
│ │ [+ Add]  │    │          │    │ [LinkedIn]    │          │    │ [+ Add]  │
│ │          │    │          │    │ [+ Add]  │    │          │    │          │
│ └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
│
│ [Days continue through month...]
│
└────────────────────────────────────────────────────────────────────────┘
```

### Day Cell Anatomy (100px+ min-height, 16px padding)

```
┌──────────────────────┐
│               15     │  ← Date number (11px, muted, mono)
│                      │
│ [Email]              │  ← Chip 1 (24px h, channel-colored)
│ [LinkedIn Post...]   │  ← Chip 2 (truncated)
│ +1 more              │  ← Overflow indicator if >3
│                      │
│ [+ Add]              │  ← Quick add button
└──────────────────────┘
```

---

## Content Chip Examples

By Channel (background 15% opacity, border 30% opacity of channel color):

```
Email/Blue:
┌──────────────────────┐
│ [envelope] Blog Post │  ← 12px font, 24px height
└──────────────────────┘
Colors: bg=rgba(59,130,246,0.15), border=rgba(59,130,246,0.3)

LinkedIn/Teal:
┌──────────────────────┐
│ [briefcase] LinkedIn │  ← Same sizing
└──────────────────────┘
Colors: bg=rgba(20,184,166,0.15), border=rgba(20,184,166,0.3)

Instagram/Purple:
┌──────────────────────┐
│ [camera] Instagram   │
└──────────────────────┘
Colors: bg=rgba(168,85,247,0.15), border=rgba(168,85,247,0.3)

Website/Green:
┌──────────────────────┐
│ [globe] Website Post │
└──────────────────────┘
Colors: bg=rgba(34,197,94,0.15), border=rgba(34,197,94,0.3)

Video/Red:
┌──────────────────────┐
│ [play] Video Promo   │
└──────────────────────┘
Colors: bg=rgba(239,68,68,0.15), border=rgba(239,68,68,0.3)

Twitter/Gray:
┌──────────────────────┐
│ [bird] Twitter Post  │
└──────────────────────┘
Colors: bg=rgba(136,136,136,0.15), border=rgba(136,136,136,0.3)
```

---

## Status Badge Examples

```
Status PLANNED (yellow):
┌───────────────┐
│  Planned      │  12px font, pill shape (border-radius: 12px)
└───────────────┘  bg=--yellow-dim, text=--yellow

Status IN PROGRESS (amber):
┌───────────────┐
│ In Progress   │
└───────────────┘  bg=--amber-dim, text=--amber

Status SCHEDULED (teal):
┌───────────────┐
│  Scheduled    │
└───────────────┘  bg=--teal-dim, text=--teal

Status PUBLISHED (green):
┌───────────────┐
│ Published     │
└───────────────┘  bg=--green-dim, text=--green

Status ARCHIVED (muted):
┌───────────────┐
│  Archived     │
└───────────────┘  bg=transparent, text=--text-muted
```

---

## Filter Bar Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ Channels:                                                             │
│   [Email] [LinkedIn] [Instagram] [Twitter] [Website] [Video]        │
│                                                                       │
│ Status: [All ▾] (or chips: [Planned] [In Progress] [Scheduled]...)  │
│                                                                       │
│ Content Type: [All ▾]                                                │
└──────────────────────────────────────────────────────────────────────┘

Unselected chip:
┌──────────┐
│  Email   │  border=--border, bg=transparent, text=--text-secondary
└──────────┘

Selected chip:
┌──────────┐
│  Email   │  border=--accent, bg=--accent-dim, text=--text-primary
└──────────┘
```

---

## Create/Edit Modal

```
┌────────────────────────────────────────────────────────────────┐
│ Create Content Item                                         [×] │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Name                                                           │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ [Spring Campaign Blog Post_________]                     │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                                │
│ Status              Content Type                              │
│ ┌──────────────┐    ┌──────────────┐                          │
│ │ Planned ▾    │    │ Blog ▾       │                          │
│ └──────────────┘    └──────────────┘                          │
│                                                                │
│ Channels                                                       │
│ ☑ Email    ☐ LinkedIn   ☑ Instagram   ☐ Twitter             │
│ ☐ Website  ☐ Video                                            │
│                                                                │
│ Publish Date                                                   │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ 2026-03-15                                               │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                                │
│ Campaign                                                       │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Spring 2026 Launch ▾                                     │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                                │
│ Notes                                                          │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │                                                          │ │
│ │ Update hero images with latest branding assets.         │ │
│ │                                                          │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                                │
│                                           [Cancel]  [Save]    │
└────────────────────────────────────────────────────────────────┘

Colors:
  Modal background: --bg-elevated (#1a1a1a)
  Border: --border (#222222)
  Text: --text-primary (#e5e5e5)
  Input bg: --bg-input (#1a1a1a)
  Input focus border: --accent (#3b82f6)
```

---

## Approval Banner (appears after Save click)

```
┌────────────────────────────────────────────────────────────────┐
│ APPROVAL REQUIRED                                     2m 14s    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Save content item: "Spring Campaign Blog Post"               │
│ Channels: Email, Instagram                                    │
│ Publish Date: 2026-03-15                                      │
│                                                                │
│                                        [Approve] [Reject]      │
└────────────────────────────────────────────────────────────────┘

Colors:
  Background: --amber-dim (#3d2800)
  Border: --amber (#f59e0b)
  Text: --amber (#f59e0b)
  Timer: --text-primary (#e5e5e5)
```

---

## Weekly List (Below or Side Panel)

```
Week of March 17–23

┌────────────────────────────────────────────────┐
│ Mar 17 | Blog      | In Progress              │
│ [Blog] Spring Kickoff                          │
│ Email, LinkedIn                                │
│ Update hero images with brand assets           │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ Mar 18 | Email     | Scheduled                │
│ [Email] Welcome Series Part 1                  │
│ Email                                           │
│ Confirm email addresses from signup form       │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ Mar 20 | Social    | Published                │
│ [Social] LinkedIn/Instagram Carousel           │
│ LinkedIn, Instagram                            │
│ Post live, monitor engagement 2h               │
└────────────────────────────────────────────────┘

Colors:
  Container bg: --bg-card (#161616)
  Border: --border (#222222)
  Hover: --bg-hover (#1c1c1c)
  Date: --text-muted (#777777)
  Title: --text-primary (#e5e5e5)
  Tags: --text-secondary (#888888)
```

---

## Focus & Hover States

### Button Focus
```
Before:
┌──────────┐
│  Save    │
└──────────┘

After :focus-visible:
┌──────────┐
│  Save    │
└──────────┘
▲ 2px solid --accent outline, 2px offset
```

### Chip Hover
```
Before:
[Blog Post]  (opacity 1.0, border --border)

After :hover:
[Blog Post]  (opacity 0.95, cursor pointer, transition 150ms)
```

### Day Cell Hover
```
Before:
┌──────────┐
│     15   │
│ [Blog]   │
└──────────┘  bg=--bg-card, border=--border

After :hover:
┌──────────┐
│     15   │
│ [Blog]   │
└──────────┘  bg=--bg-hover, border=--border-light
  (transition 150ms)
```

---

## Color Palette Display

```
BACKGROUNDS
--bg-primary: ████ #0a0a0a  (Main page bg)
--bg-secondary: ████ #111111  (Sidebar)
--bg-card: ████ #161616  (Cards, default)
--bg-hover: ████ #1c1c1c  (Hover state)
--bg-input: ████ #1a1a1a  (Form inputs)
--bg-elevated: ████ #1a1a1a  (Modal panels)

TEXT
--text-primary: ████ #e5e5e5  (Headings, main)
--text-secondary: ████ #888888  (Secondary)
--text-muted: ████ #777777  (Hints)

CHANNELS & SEMANTICS
--accent (Email): ████ #3b82f6  (Blue)
--teal (LinkedIn): ████ #14b8a6  (Teal)
--purple (Instagram): ████ #a855f7  (Purple)
--green (Website): ████ #22c55e  (Green)
--red (Video): ████ #ef4444  (Red)
--text-secondary (Twitter): ████ #888888  (Gray)

STATUSES
--yellow (Planned): ████ #eab308  (Yellow)
--amber (In Progress): ████ #f59e0b  (Amber)
--teal (Scheduled): ████ #14b8a6  (Teal)
--green (Published): ████ #22c55e  (Green)
--text-muted (Archived): ████ #777777  (Gray)
```

---

## Responsive Behavior

### Mobile (375–768px)
```
Week view (7 days only):

┌──────────────────────────┐
│ Week of Mar 15–21 [<] [>]│
├──────────────────────────┤
│ SUN │ MON │ TUE │ WED    │
├─────┼─────┼─────┼────────┤
│ 15  │ 16  │ 17  │ 18     │
│[B]  │     │[B]  │ [E]    │
│     │     │[L]  │ [L]    │
├─────┼─────┼─────┼────────┤
│  THU│  FRI│ SAT │ SUN    │
├─────┼─────┼─────┼────────┤
│     │     │     │ [V]    │
│     │     │[S]  │ [I]    │
│     │     │     │        │
└─────┴─────┴─────┴────────┘

Weekly List (full width below):
┌──────────────────────────┐
│ Mar 15 | Blog | [Badge] │
│ [Blog] Spring Kickoff    │
│ Email, LinkedIn          │
│ Update hero images...    │
└──────────────────────────┘
```

### Tablet (768–1024px)
```
Full calendar grid (7 cols), optional list below

┌──────────────────────────────────┐
│ Month calendar                     │
│ 7-column grid (full width)        │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ Weekly list (full width, below)   │
└──────────────────────────────────┘
```

### Desktop (1024px+)
```
┌─────────────────────┬──────────────┐
│                     │              │
│  Month calendar     │ Weekly List  │
│  (7-col grid)       │ (side panel) │
│                     │              │
└─────────────────────┴──────────────┘
```

---

## Typography Scale

```
18px / 600–700 weight
└─ Heading (month label)

16px / 600 weight
└─ Modal title, card title

14px / 500 weight
└─ Card title, button text

14px / 400 weight
└─ Body text, item names

13px / 500 weight
└─ Tab labels, button text

12px / 500 weight (mono)
└─ Dates, counts, timestamps

12px / 400 weight
└─ Label text, hints

11px / 500–600 weight
└─ Filter labels, badges

11px / 400 weight
└─ Small text, muted copy
```

---

**Visual Reference Created**: 2026-03-21
**Used for**: Quick validation during CSS implementation

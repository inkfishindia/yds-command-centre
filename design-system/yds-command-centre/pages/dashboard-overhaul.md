# Dashboard Overhaul — Design Spec

**Date:** 2026-03-23
**Purpose:** Restructure CEO command view into 3 health zones: Morning Brief (hero), Business + Execution Health (dual lanes), Activity Feed + Overdue Triage (bottom)

---

## Design Brief

### Pattern
Dark mode operations dashboard with hero-first layout. Morning Brief elevated to top banner (always visible). Two-column health zones (Business/Execution) with metric focus. Grouped overdue triage at bottom with activity feed sidebar.

### Colors
Existing YDS Command Centre dark theme:
- `--bg-primary: #0a0a0a` — Page background
- `--bg-card: #161616` — Card background
- `--bg-hover: #1c1c1c` — Hover state
- `--text-primary: #e5e5e5` — Main text
- `--text-secondary: #888888` — Labels
- `--accent: #3b82f6` — Blue/info
- `--green: #22c55e` — Success/healthy
- `--amber: #f59e0b` — Warning/at-risk
- `--red: #ef4444` — Danger/overdue
- `--purple: #a855f7` — Neutral/secondary

All card backgrounds use `--bg-card` with `--shadow-card` elevation.

### Typography
- **Heading Font:** Fira Code (mono for dashboard feel)
- **Body Font:** Fira Sans (readable at small sizes)
- **Import:** Already in styles.css
- **Sizes:**
  - Section headers: `14px / 600w` (uppercase)
  - Card values: `24px / 600w` (data emphasis)
  - Card labels: `12px / 500w` (secondary)
  - List items: `13px / 400w` (readable)

---

## Layout Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│  📊  Dashboard | Today (timestamp)    [+ Commitment] [+ Decision] [↻] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  ZONE A: Morning Brief Banner (Compact Hero)                    │ │
│  │  ─────────────────────────────────────────────────────────────  │ │
│  │  OVERDUE (red): 3 items  │  TOP 3 TODAY: Tasks 1,2,3  │ FLAGS  │ │
│  │  Flags: Team overload (amber), CRM pipeline stalled (amber)    │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Open Commitments │ Overdue │ Active Projects │ Decisions │      │ │
│  │        24        │    3    │       8         │    12     │ ...  │ │
│  │ 2 at risk        │ Needs ↑ │ 1 blocked       │ (this mo) │      │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────┬────────────────────────────────┐ │
│  │ ZONE B: Business Health         │ Execution Health              │ │
│  ├────────────────────────────────┼────────────────────────────────┤ │
│  │ CRM Pipeline Summary            │ Commitment Velocity + Workload │
│  │                                 │                                │
│  │ Total Leads: 88                 │ Closed Last 7d: 8             │ │
│  │ ┌─────────────────────────────┐ │ ┌──────────────────────────┐  │ │
│  │ │ Status Breakdown (donut)     │ │ │ Team Workload Strip      │  │ │
│  │ │ Active: 34  (39%)            │ │ │                          │  │ │
│  │ │ Qualified: 28 (32%)          │ │ │ Dan ▓▓▓░░░ Moderate     │  │ │
│  │ │ Stalled: 15  (17%)           │ │ │ Arun ▓░░░░ Light        │  │ │
│  │ │ New: 11     (12%)            │ │ │ Team ▓▓▓▓░ Loaded       │  │ │
│  │ │                              │ │ │                          │  │ │
│  │ │ Recently Won: 4              │ │ │ Focus Areas (horiz scr)  │  │ │
│  │ │ Recently Lost: 1             │ │ │ Design ▓ | Ops ░ | Mkt ░ │  │ │
│  │ └─────────────────────────────┘ │ │ │ Content ▓▓▓ | Admin ░   │  │ │
│  │                                 │ │ └──────────────────────────┘  │ │
│  │ Key Metrics:                    │ │                                │ │
│  │ • Avg. deal size: $2,400        │ │ Velocity Trend:                │ │
│  │ • Win rate: 18%                 │ │ ↑ 12% vs last week             │ │
│  │ • Pipeline value: $211k         │ │                                │ │
│  └────────────────────────────────┴────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────┬────────────────────────────────┐ │
│  │ ZONE C: Activity + Triage       │ (Right-side Activity Feed)    │ │
│  ├────────────────────────────────┼────────────────────────────────┤ │
│  │ Overdue Commitments             │ Recent Activity                │ │
│  │ Grouped by Focus Area:          │                                │ │
│  │                                 │ ✓ Q4 Content launch (DONE)    │ │
│  │ Design (2 overdue):             │ ✓ Product pivot decision OK   │ │
│  │ • Logo redesign (Dan, 5d)       │ ⚠ CRM stalled (ALERT)         │ │
│  │ • Brand guidelines (Arun, 3d)   │ ✓ New partnership signed      │ │
│  │                                 │ ⚠ Team capacity overload      │ │
│  │ Operations (1 overdue):         │ → Next: Review OKRs (Nov 1)   │ │
│  │ • Monthly review (Dan, 2d)      │                                │ │
│  │                                 │                                │ │
│  │ [Bulk: Done All | Snooze +3d]   │ [Refresh] Last: 5m ago        │ │
│  └────────────────────────────────┴────────────────────────────────┘ │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Zone Breakdown

### Zone A: Morning Brief Banner (Hero)

**Purpose:** First thing CEO sees — critical alerts + today's top 3 + flags

**Component:** `.dashboard-morning-brief-banner`

**Content:**
1. **Overdue Section** (left)
   - Count badge (red if > 0)
   - Max 2-3 items inline (name + owner + days)
   - If more than 3, show count + "view all"

2. **Top 3 Today** (center)
   - Numbered list (1-3) with commitment names
   - Clickable to drill down

3. **Flags** (right, collapsible)
   - Type: overload, blocked, stalled, alert
   - Message + severity color
   - Max 2-3, rest in dropdown

**Height:** ~100px (compact, but substantial)
**Scroll behavior:** Sticky above main content (position sticky, z-index: 50)
**Mobile:** Stack vertical, flags collapse by default

---

### Zone B-Left: Business Health

**Component:** `.dashboard-business-health`

**Sections:**

#### 1. CRM Pipeline Summary
- **Data source:** `/api/sheets/pipeline` → `b2b` object
- **Display:**
  - **Total Leads:** large stat card
  - **Status Donut:** (Active / Qualified / Stalled / New) with legend
  - **Key Metrics:** Avg deal size, win rate, pipeline value (3 small metric cards below donut)
  - **Recent Activity:** (Recently Won count) + (Recently Lost count)

**Cards:**
- `.crm-pipeline-donut` — Donut chart + legend in `.health-metric-grid`
- `.health-metric-card` — 3-column grid below: "Avg Deal Size | Win Rate | Pipeline Value"

#### 2. CRM Velocity Callout
- **Data source:** Computed from `/api/crm/tasks` (closed this week vs last week)
- **Display:** "↑ 12% vs last week" (or down arrow if declining)
- **Color:** Green if up, amber if stable, red if down

---

### Zone B-Right: Execution Health

**Component:** `.dashboard-execution-health`

**Sections:**

#### 1. Commitment Velocity (Burndown Mini)
- **Data source:** `/api/notion/dashboard` → commitment stats
- **Display:** "Closed Last 7d: X" with trend indicator
- **Chart:** Tiny sparkline (width: 100%, height: 40px) showing 7-day trend

#### 2. Team Workload Strip
- **Data source:** `/api/notion/people/:id/detail` → `metrics.capacity` per person
- **Component:** `.team-workload-strip` (horizontal scrollable)
- **Each person:**
  - Name (13px)
  - Capacity bar (width 120px, height 6px, rounded)
  - Status label (Light / Moderate / Overloaded)
  - Colors: `--green` (light), `--amber` (moderate), `--red` (overloaded)

#### 3. Focus Area Health Strip
- **Existing component:** `.health-strip` + `.health-chip`
- **Keep as-is:** Horizontal scrollable chips with dot + name + stats
- **Add color coding:** Light/moderate/overloaded states based on focus area capacity

#### 4. Execution Metrics (3-column grid)
- "Velocity Trend" (↑/↓ % vs last period)
- "Team Capacity" (X% utilized)
- "Blocked Items" (count + list of top blockers)

---

### Zone C-Left: Overdue Triage (Grouped)

**Component:** `.dashboard-overdue-triage`

**Structure:**
```
Overdue Commitments (grouped by Focus Area)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Focus Area 1 (red badge: 3 overdue)
├─ Item 1 | Owner | 5d overdue
├─ Item 2 | Owner | 3d overdue
└─ Item 3 | Owner | 1d overdue

Focus Area 2 (amber badge: 1 overdue)
└─ Item | Owner | 2d overdue

[Bulk Actions] [Done All] [Snooze +3d] [Snooze +7d]
```

**Classes:**
- `.overdue-group` — Section per focus area
- `.overdue-group-header` — Focus area name + count badge
- `.overdue-item` — Individual commitment row (compact)
- `.overdue-item-actions` — Inline: Done, Snooze, Reassign buttons (show on hover)

**Inline Actions (existing):**
- Done button (green, quick close)
- Snooze picker (day presets + date input)
- Reassign person dropdown
- Priority/status inline edit

**Mobile behavior:** Stack overdue items, actions collapse into dropdown

---

### Zone C-Right: Activity Feed (Sidebar)

**Component:** `.dashboard-activity-feed` or `.activity-sidebar`

**Data source:** Computed from recent activity:
- Recent Notion updates (decisions made, commitments marked done, projects updated)
- Alerts (blockers, overdue count changes, CRM pipeline alerts)
- Upcoming critical items

**Structure:**
```
Activity Feed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Q4 Content Launch marked DONE (22 Nov)
✓ Product Pivot approved (decision) (21 Nov)
⚠ CRM Pipeline: 3 stalled deals (ALERT) (20 Nov)
✓ New Partnership Signed (19 Nov)
⚠ Team at capacity (Ops focus area) (19 Nov)
→ Review OKRs due (27 Nov)

[Refresh] Last: 5m ago
```

**Items:**
- Type icon (✓ = done/success, ⚠ = alert/warning, → = upcoming)
- Title + date (small, secondary text)
- Clickable to open detail panel

**Max height:** Scroll within container (not full page)

---

## CSS Classes — New & Modified

### New Classes

| Class | Purpose | Parent | Notes |
|-------|---------|--------|-------|
| `.dashboard-container-3zone` | Main wrapper | view-panel | Grid: Zone A full-width, Zone B 2-col, Zone C 2-col |
| `.dashboard-morning-brief-banner` | Hero brief | Zone A | Sticky top, compact, flex row of 3 sections |
| `.dashboard-business-health` | CRM + pipeline | Zone B-left | Card container with donut + metrics grid |
| `.dashboard-execution-health` | Commitment + team | Zone B-right | Card container with velocity + workload strip |
| `.crm-pipeline-donut` | Donut chart | business-health | SVG inline, 100px diameter, centered |
| `.health-metric-grid` | 3-col metrics | business-health | Below donut, 3 metric cards |
| `.health-metric-card` | Single metric | health-metric-grid | Value + label + trend |
| `.team-workload-strip` | Workload bars | execution-health | Horizontal scroll, flex row of people |
| `.workload-person` | Individual person | team-workload-strip | Name + capacity bar + label |
| `.workload-bar` | Capacity visual | workload-person | Width: dynamic per capacity, colored |
| `.dashboard-overdue-triage` | Grouped overdue | Zone C-left | Flex column of focus-area groups |
| `.overdue-group` | Focus area section | overdue-triage | Collapsible, grouped list |
| `.overdue-group-header` | FA name + count | overdue-group | Flex: name on left, badge count on right |
| `.overdue-item` | Single commitment | overdue-group | Row: checkbox + title + owner + days + actions |
| `.overdue-item-actions` | Action buttons | overdue-item | Inline flex, show on hover mobile: dropdown |
| `.dashboard-activity-feed` | Sidebar feed | Zone C-right | Flex column, scrollable, max-height: 500px |
| `.activity-item` | Feed entry | activity-feed | Type icon + title + date, clickable |
| `.activity-item-success` | Success state | activity-item | Icon: ✓, color: --green |
| `.activity-item-alert` | Alert state | activity-item | Icon: ⚠, color: --amber |
| `.activity-item-upcoming` | Future state | activity-item | Icon: →, color: --accent |

### Modified Classes (Existing)

| Class | Change | Reason |
|-------|--------|--------|
| `.data-card-grid` | Reduce from 6 to 5 cards (remove "Focus Areas" stat, kept in Zone B) | Focus Areas now part of Execution Health health strip |
| `.health-strip` | Stays in Zone B-right (Execution Health) | Moved up from bottom, consolidated with execution metrics |
| `.dashboard-grid-2col` | Becomes Zone C layout (left: overdue, right: activity) | Overdue + activity feed now paired |
| `.morning-brief` | Becomes `.dashboard-morning-brief-banner` (new class) | Relocate from Zone C to Zone A, style as compact hero |
| `.health-chip` | No change | Reused in Zone B-right (Focus Area Health Strip) |

---

## Data Requirements

### Zone A: Morning Brief
**Endpoint:** `GET /api/notion/morning-brief` (existing)
```json
{
  "overdueCount": 3,
  "overdueItems": [...],  // {name, owner, daysOverdue}
  "topThree": [...],      // {name}
  "flags": [...]          // {type: 'overload'|'blocked'|'stalled'|'alert', message}
}
```

### Zone B-Left: Business Health
**Endpoint:** `GET /api/sheets/pipeline` (new or enhance)
```json
{
  "available": true,
  "b2b": {
    "totalLeads": 88,
    "statusBreakdown": {
      "active": 34,
      "qualified": 28,
      "stalled": 15,
      "new": 11
    },
    "recentWon": 4,
    "recentLost": 1,
    "avgDealSize": 2400,
    "winRate": 0.18,
    "pipelineValue": 211000
  }
}
```

### Zone B-Right: Execution Health
**Endpoints:**
1. `GET /api/notion/dashboard` → commitments + focus-areas data
2. `GET /api/notion/people` + `/api/notion/people/:id/detail` → capacity metrics
3. Compute: velocity trend (closed last 7d vs. prior 7d)

**Data shape:**
```json
{
  "executionVelocity": {
    "closedLast7d": 8,
    "trendPercent": 12,
    "trendDirection": "up"
  },
  "teamWorkload": [
    {
      "personId": "...",
      "name": "Dan",
      "utilization": 0.75,  // 0-1
      "status": "moderate"   // light|moderate|overloaded
    }
  ],
  "focusAreas": [...]  // existing, with capacity calculations
}
```

### Zone C-Left: Overdue Triage
**Endpoint:** `GET /api/notion/commitments/overdue` (existing) + group by Focus Area

### Zone C-Right: Activity Feed
**Data source:** Computed from recent Notion activity
- Last 5 decisions (with status)
- Last 5 commitments marked done
- Recent blockers
- Upcoming critical items (next 5 days)

**Compute logic (in frontend or backend service):**
- Type: decision_made, task_completed, blocker_created, alert_triggered, upcoming_due
- Timestamp: recent first
- Max 10 items

---

## Responsive Behavior

### Desktop (1024px+)
- Zone A: Full width, sticky top
- Zone B: 2-column (equal width)
- Zone C: 2-column (left: overdue 60%, right: activity 40%)
- All scrollable independently

### Tablet (768px–1023px)
- Zone A: Full width, sticky
- Zone B: Stack vertical (Business Health first, Execution Health second)
- Zone C: Stack vertical (Overdue first, Activity second)
- Reduced padding, smaller fonts

### Mobile (< 768px)
- Zone A: Full width, compact (flags collapse)
- Zone B: Single column (both sections stack)
  - CRM donut smaller (80px)
  - Metrics cards stack 2–1 or single column
  - Workload strip shows first 4 people, horizontal scroll
  - Focus area strip horizontal scroll
- Zone C: Single column
  - Overdue items: compact rows, actions in dropdown
  - Activity feed: collapsible

---

## Key Effects & Interactions

### Card Animations
- **Hover lift:** `transform: translateY(-2px)`, `box-shadow: var(--shadow-elevated)`
- **Duration:** `var(--transition-normal)` (200ms)
- **No layout shift** on hover

### Color Coding
- **Status indicators:**
  - Healthy/on-track: `--green`
  - At-risk/warning: `--amber`
  - Overdue/blocked: `--red`
  - Neutral/pending: `--text-secondary`

### Focus States
- **Focus rings:** 2px solid `--accent`, offset 2px (WCAG AAA)
- **Keyboard nav:** Tab order matches visual order

### Reduced Motion
- All transitions respect `prefers-reduced-motion` (remove transforms, keep opacity)

---

## Mobile Shortcuts Bar

**Keep existing shortcuts:**
```
[Action Queue] [Projects] [Tasks]
```

**Add optional shortcut:**
```
[CRM Pipeline]  (shows 88 leads count)
```

---

## Files to Write

1. **This file** → `design-system/yds-command-centre/pages/dashboard-overhaul.md` ✓
2. **Backend:** No new API routes needed. Use existing:
   - `/api/notion/morning-brief` (has data)
   - `/api/sheets/pipeline` (has CRM data)
   - `/api/notion/people`, `/api/notion/people/:id/detail` (has capacity)
   - `/api/notion/dashboard`, `/api/notion/commitments/overdue` (has overdue grouping)

3. **Frontend module changes:**
   - `src/js/modules/dashboard.js` — Add zone state + activity feed logic + team workload computation
   - `public/css/styles.css` — Add 15 new CSS classes (see table above)
   - `public/index.html` — Restructure dashboard template into 3-zone layout

---

## Anti-Patterns to Avoid

- ❌ **No emoji icons** — Use SVG status icons (checkmark, alert, arrow)
- ❌ **No color-only indicators** — All status uses icon + color + label
- ❌ **No hardcoded hex colors** — Use CSS variables only
- ❌ **No instant state changes** — All transitions use `--transition-normal` (200ms)
- ❌ **No missing focus states** — All interactive elements visible on focus
- ❌ **No invisible borders** — Use `--border` or `--border-light` for contrast
- ❌ **No horizontal scroll on mobile** — Stacks / wraps / collapses instead
- ❌ **No cutoff content** — Respect safe areas on all devices

---

## Handoff Checklist

- [x] Design brief complete with 3-zone layout
- [x] Component specs with class names and data requirements
- [x] CSS classes table (new + modified)
- [x] Data API endpoints mapped
- [x] Responsive behavior detailed
- [x] Mobile shortcuts identified
- [x] Focus states, accessibility, animations specified
- [x] Anti-patterns listed

**Ready for:** `frontend-builder` to implement template changes + CSS + module logic

---

**Next Step:** Frontend builder reads this spec, then:
1. Update `public/index.html` dashboard template to 3-zone layout
2. Add new CSS classes to `public/css/styles.css`
3. Enhance `src/js/modules/dashboard.js` to compute execution metrics, activity feed, team workload
4. Test on desktop (1440px), tablet (768px), mobile (375px)

# Organisation Dashboard Design Spec

> **Purpose:** Landing page for YDS Command Centre — comprehensive operational overview for CEO Dan
> **Scope:** Enhanced dashboard adding team/department blocks to existing health cards and action queue
> **Stack:** Alpine.js SPA, CSS custom properties, dark theme
> **Generated:** 2026-03-22

---

## Layout Architecture

### Page Sections (Top to Bottom)

1. **Header + Navigation** — Sticky, minimal (handles view switching)
2. **Attention Banner** — Focus areas in crisis, overdue commitments count, action queue summary
3. **Executive KPIs** — 4–6 large metric cards (focus areas health, projects, marketing, tech, ai team, CRM)
4. **Quick Actions** — Button row (New commitment, New decision, etc.)
5. **Team Department Grid** — 4 blocks with overview cards (Marketing, Tech, AI Team, Factory/Operations)
6. **Recent Activity** — Decisions, commitments, activity timeline
7. **Action Queue** — Dan's queue, runner's queue summary

### Responsive Behavior

| Breakpoint | Layout |
|---|---|
| **Mobile (375–480px)** | Single column, stacked cards, horizontal scroll for KPIs |
| **Tablet (481–768px)** | 2-column grid, department cards stack horizontally |
| **Desktop (769–1024px)** | 3-column grid for department cards, full KPI row |
| **Wide (1025px+)** | 4-column grid for department cards, expanded detail |

---

## Section Specs

### 1. Attention Banner

**Purpose:** Immediate visibility of critical items
**Height:** 60–80px
**Background:** `--red-glow` (#ef444408) with `--border: #222` divider
**Content:**

```
[Alert Icon] Focus Areas in Crisis (2) | Overdue Commitments (5) | Action Queue (3)
[Dismiss Button]
```

**Interaction:** Click section navigates to that view (e.g., click "Overdue" → commitments filtered to overdue)

---

### 2. Executive KPIs Row

**Purpose:** At-a-glance health and capacity snapshot
**Layout:** Horizontal scrollable row on mobile, grid on desktop
**Card Count:** 4–6 cards (configurable)
**Card Dimensions:** Min 260px × 120px

**Cards:**

| Title | Data Source | Display | Status Indicator |
|-------|-------------|---------|------------------|
| Focus Areas | `dashboard.healthDistribution` | `X at risk` + bar | ● red if >30% unhealthy |
| Projects | `dashboard.focusAreas[]` | `X projects, Y% avg health` | ● green/amber/red |
| Marketing | `marketing` | `X active campaigns` | count |
| Tech Team | `tech` | `Sprint: X% complete` | progress bar |
| AI Team | `aiTeam` | `X agents running` | count |
| CRM Pipeline | `pipeline.available ? b2b + dropship : unavailable` | Deal value or "No data" | — |

**Card Structure:**

```html
<div class="org-kpi-card">
  <div class="org-kpi-header">
    <h3>Focus Areas</h3>
    <span class="org-status-badge">● At Risk</span>
  </div>
  <div class="org-kpi-metric">
    <span class="org-metric-value">3</span>
    <span class="org-metric-label">at risk</span>
  </div>
  <div class="org-health-bar">
    <!-- Small bar showing 30% red, 20% amber, 50% green -->
  </div>
</div>
```

**Styles:**

```css
.org-kpi-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  min-width: 260px;
  cursor: pointer;
  transition: var(--transition-fast);
}

.org-kpi-card:hover {
  background: var(--bg-hover);
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: var(--shadow-card);
}

.org-kpi-metric {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 12px 0;
}

.org-metric-value {
  font-size: 32px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.org-metric-label {
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.org-status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  background: var(--red-dim);
  color: var(--red);
}

.org-health-bar {
  display: flex;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  gap: 1px;
  background: var(--bg-secondary);
}

.org-health-segment {
  flex: 1;
  background: var(--green); /* Override per segment */
}
```

---

### 3. Team Department Grid

**Purpose:** Department-level summary and quick access
**Layout:** CSS Grid, responsive: 1 col (mobile) → 2 cols (tablet) → 4 cols (desktop)
**Card Count:** 4 (Marketing, Tech, AI Team, Factory/Operations)

**Card Structure for Each Department:**

```html
<div class="org-dept-block">
  <div class="org-dept-header">
    <h2>Marketing</h2>
    <span class="org-dept-badge">5 active</span>
  </div>

  <div class="org-dept-stat">
    <span class="org-stat-label">Campaigns</span>
    <span class="org-stat-value">8</span>
  </div>

  <div class="org-dept-stat">
    <span class="org-stat-label">In Pipeline</span>
    <span class="org-stat-value">12</span>
  </div>

  <div class="org-dept-stat">
    <span class="org-stat-label">Overdue</span>
    <span class="org-stat-value org-stat-alert">2</span>
  </div>

  <div class="org-dept-footer">
    <button class="org-view-btn">View Details →</button>
  </div>
</div>
```

**Grid Setup:**

```css
.org-dept-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin: 24px 0;
}

.org-dept-block {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: var(--transition-normal);
  display: flex;
  flex-direction: column;
}

.org-dept-block:hover {
  background: var(--bg-hover);
  border-color: var(--accent);
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.4);
}

.org-dept-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
  padding-bottom: 12px;
}

.org-dept-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.org-dept-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: var(--accent-dim);
  color: var(--accent);
}

.org-dept-stat {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 13px;
}

.org-stat-label {
  color: var(--text-secondary);
}

.org-stat-value {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--text-primary);
}

.org-stat-alert {
  color: var(--red);
}

.org-dept-footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}

.org-view-btn {
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--accent);
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-fast);
}

.org-view-btn:hover {
  background: var(--accent-dim);
  border-color: var(--accent);
}
```

**Data Mappings by Department:**

#### Marketing Department Card

```javascript
{
  title: "Marketing",
  stats: {
    activeCampaigns: 8,      // from /api/sheets/CAMPAIGNS
    contentInPipeline: 12,    // from /api/sheets/CONTENT_CALENDAR
    tasksOverdue: 2,          // from /api/notion/dashboard (filtered to Marketing focus area)
    tasksTotal: 24            // calculated from commitments
  },
  badge: "5 active",          // active campaigns or in-progress tasks
  action: () => this.view = 'marketing-ops'
}
```

#### Tech Team Card

```javascript
{
  title: "Tech Team",
  stats: {
    sprintPctComplete: 65,    // from /api/sheets/SPRINTS
    sprintBlocked: 2,         // from /api/sheets/TASKS (blocked status)
    backlogTotal: 18,         // from /api/sheets/BACKLOG
    specsInReview: 3          // from /api/sheets/SPECS
  },
  badge: "In Sprint",
  action: () => this.view = 'tech-team'
}
```

#### AI Team Card

```javascript
{
  title: "AI Team",
  stats: {
    activeAgents: 5,          // from /api/chat or tracking state
    totalAgents: 7,           // total registered agents
    byFunction: "Design/UX: 2, Frontend: 1, ...", // breakdown
    tasksInProgress: 8
  },
  badge: "5 running",
  action: () => this.view = 'command-shell'
}
```

#### Factory/Operations Card

```javascript
{
  title: "Factory/Ops",
  stats: {
    ordersToday: 23,          // from /api/sheets/FACTORY_ORDERS
    printRunsActive: 3,       // from /api/sheets/PRODUCTION
    qualityIssues: 1,         // from /api/sheets/QA_LOG
    shippingPending: 12       // from /api/sheets/SHIPPING
  },
  badge: "3 active runs",
  action: () => this.view = 'factory'
}
```

---

### 4. Recent Decisions + Commitments

**Purpose:** Quick reference to latest actions
**Layout:** Two-column (desktop) or stacked (mobile)

**Decisions Column:**

```html
<div class="org-recent-section">
  <h3>Recent Decisions</h3>
  <div class="org-decision-list">
    <div class="org-decision-item" @click="viewDecision(d)">
      <div class="org-decision-title">{{ d.name }}</div>
      <div class="org-decision-meta">{{ d.focusArea }} • {{ formatDate(d.createdAt) }}</div>
    </div>
  </div>
</div>
```

**Styles:**

```css
.org-recent-section {
  flex: 1;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
}

.org-recent-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.org-decision-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.org-decision-item {
  padding: 12px;
  border-radius: 6px;
  background: var(--bg-hover);
  cursor: pointer;
  transition: var(--transition-fast);
  border-left: 3px solid var(--accent);
}

.org-decision-item:hover {
  background: var(--bg-secondary);
  transform: translateX(4px);
}

.org-decision-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.org-decision-meta {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}
```

---

### 5. Action Queue Summary

**Purpose:** Dan's approval queue visibility
**Layout:** Minimal summary card or expandable section
**Data:** `GET /api/notion/action-queue`

```html
<div class="org-action-queue">
  <h3>Action Queue</h3>
  <div class="org-queue-counts">
    <span>Dan: {{ actionQueue.counts.dan }} pending</span>
    <span>Runner: {{ actionQueue.counts.runner }} pending</span>
  </div>
  <div class="org-queue-preview">
    <template x-for="item in actionQueue.dansQueue.slice(0, 3)">
      <div class="org-queue-item">{{ item.title }}</div>
    </template>
  </div>
</div>
```

---

## Interaction Patterns

### Navigation from Dashboard

| Element | Click Action | Target |
|---------|--------------|--------|
| KPI Card (e.g., "Focus Areas") | Navigate to Focus Areas view | `view = 'focusAreas'` |
| Department Card (Marketing) | Navigate to Marketing Ops | `view = 'marketing-ops'` |
| Department Card (Tech) | Navigate to Tech Team | `view = 'tech-team'` |
| Department Card (AI) | Navigate to Command Shell | `view = 'command-shell'` |
| Decision Item | Open decision detail modal | `openDecision(id)` |
| Commitment Item | Open commitment detail | `openCommitment(id)` |

---

## CSS Class Naming Convention

All organisation dashboard classes use `org-` prefix:

```
.org-kpi-card          — KPI metric card
.org-kpi-header        — KPI card title row
.org-kpi-metric        — Large metric value + label
.org-status-badge      — Status pill (at risk, on track, etc.)
.org-health-bar        — Horizontal health/completion bar
.org-dept-block        — Department card container
.org-dept-header       — Department title + badge
.org-dept-stat         — Label + value pair in dept card
.org-view-btn          — "View Details" button
.org-recent-section    — Decisions/commitments section
.org-decision-item     — Single decision in recent list
.org-action-queue      — Action queue summary card
.org-queue-item        — Single queue item
```

---

## Data Loading & State

### Initial Load (on view = 'dashboard')

```javascript
async loadDashboard() {
  // Fires in parallel:
  // 1. GET /api/notion/dashboard → dashboard payload
  // 2. GET /api/sheets/pipeline → CRM data
  // 3. GET /api/sheets/CAMPAIGNS → Marketing campaigns
  // 4. GET /api/sheets/SPRINTS → Tech sprint data
  // 5. GET /api/notion/action-queue → approval queue

  this.dashboardLoading = true;
  // ... collect all payloads
  this.dashboardLoading = false;
}
```

### Refresh Interval

- Auto-refresh dashboard every **5 minutes** (configurable)
- Show last refresh timestamp
- Cancel refresh on navigation away from dashboard

---

## Anti-Patterns — Do NOT Use

- ❌ **Emojis as icons** — Use Heroicons/Lucide SVG only
- ❌ **Missing cursor-pointer** — All clickable cards must have `cursor: pointer`
- ❌ **Instant state changes** — Always use `transition: var(--transition-fast)` or `--transition-normal`
- ❌ **Layout-shifting hovers** — Avoid `transform: scale()` that shifts grid
- ❌ **Too many colors** — Stick to the 13 existing CSS variables
- ❌ **Small touch targets** — Buttons and cards must be ≥44px height
- ❌ **Low contrast text** — Maintain existing text-primary/secondary variables
- ❌ **Hardcoded hex values** — Always use CSS variables from `:root`
- ❌ **Skipped focus states** — All interactive elements need visible focus outline

---

## Accessibility & Responsive Checklist

- [ ] All clickable elements have `cursor: pointer`
- [ ] Hover states visible and distinct
- [ ] Focus states visible with `outline: 2px solid var(--accent)`
- [ ] Touch targets ≥44px (buttons, card click areas)
- [ ] Text meets 4.5:1 contrast ratio (already built into theme)
- [ ] No emojis used; SVG icons only
- [ ] Prefers-reduced-motion respected (remove `transform` animations if set)
- [ ] Responsive: works at 375px (mobile), 768px (tablet), 1024px (desktop)
- [ ] No horizontal scroll on mobile
- [ ] Skeleton loaders for async data (use `animate-pulse`)

---

## Implementation Notes for Frontend Builder

1. **Keep state in dashboard module** — `src/js/modules/dashboard.js` manages all org-dashboard data
2. **Use existing CSS variables** — Never hardcode colors; all 13 variables already exist in `:root`
3. **Template in index.html** — Create a `<div x-show="view === 'dashboard'">` template with sections above
4. **Alpine data binding** — Use `x-for`, `x-text`, `x-bind:class`, `x-on:click`
5. **No images** — This is a data dashboard; all visuals are CSS shapes (bars, badges, status dots)
6. **SVG Icons** — Use Heroicons (already available or load from CDN)
7. **Fallback for missing data** — Show "—" or "No data" if API returns null

---

## Color Role Reference (for context)

| Role | Variable | Hex |
|------|----------|-----|
| Primary background | `--bg-primary` | `#0a0a0a` |
| Card background | `--bg-card` | `#161616` |
| Hover background | `--bg-hover` | `#1c1c1c` |
| Primary text | `--text-primary` | `#e5e5e5` |
| Secondary text | `--text-secondary` | `#888888` |
| Accent (blue) | `--accent` | `#3b82f6` |
| Success (green) | `--green` | `#22c55e` |
| Warning (amber) | `--amber` | `#f59e0b` |
| Danger (red) | `--red` | `#ef4444` |

---

## Example API Response Shape

```javascript
{
  "dashboard": {
    "focusAreas": [
      {
        "id": "fa-123",
        "name": "Product Launch",
        "health": "at_risk",
        "commitmentCount": 12,
        "overdueCount": 3
      }
    ],
    "projects": [ /* ... */ ],
    "healthDistribution": { "healthy": 60, "at_risk": 30, "blocked": 10 },
    "overdue": [ /* ... */ ],
    "upcoming": [ /* ... */ ],
    "recentDecisions": [ /* ... */ ],
    "morningBrief": { /* ... */ }
  },
  "marketing": {
    "activeCampaigns": 8,
    "contentInPipeline": 12,
    "tasksOverdue": 2,
    "tasksTotal": 24
  },
  "tech": {
    "sprintPctComplete": 65,
    "sprintBlocked": 2,
    "backlogTotal": 18,
    "specsInReview": 3
  },
  "aiTeam": {
    "activeAgents": 5,
    "totalAgents": 7
  },
  "actionQueue": {
    "dansQueue": [ /* items waiting for Dan approval */ ],
    "runnersQueue": [ /* items waiting for runner action */ ],
    "counts": { "dan": 3, "runner": 2 }
  }
}
```

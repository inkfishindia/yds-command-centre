# Connected Dashboard Implementation Plan

**Date:** 2026-03-25
**Goal:** Turn YDS Command Centre into a connected hub-and-spoke dashboard system with one org overview, one operational dashboard per area, and shared drill-downs.
**Context:** The current repo already has strong area modules and services, but the top-level experience is split between a light `overview` page and a heavier `dashboard` page.

---

## Outcome We Want

The product should answer three different levels of questions:

1. **Org Overview**
   "Where does Dan need to look right now?"

2. **Area Dashboard**
   "What is happening inside Marketing / CRM / Tech / Factory / Ops / Projects?"

3. **Detail Drill-Down**
   "Which person, commitment, campaign, lead, or focus area is causing the signal?"

This gives us a system that feels connected instead of a set of isolated pages.

---

## Current Repo Reality

### What already exists

- `overview` route and module:
  - `GET /api/overview`
  - `src/js/modules/overview.js`
  - `server/services/overview-service.js`

- `dashboard` route and module:
  - `GET /api/notion/dashboard`
  - `src/js/modules/dashboard.js`
  - `public/partials/dashboard.html`
  - `server/services/dashboard-service.js`

- Area dashboards already exist for:
  - Marketing Ops
  - CRM
  - Tech Team
  - Factory
  - Ops
  - Projects
  - BMC
  - Team

- Drill-down patterns already exist for:
  - Focus area detail
  - Person detail
  - Notion detail drawer

### Core problem

The app has two competing top-level concepts:

- `overview` is meant to be the landing layer
- `dashboard` is where most of the useful operational intelligence already lives

This makes the experience feel fragmented:

- the landing page is not yet the most useful page
- department dashboards do not roll up into one consistent executive model
- navigation is page-based, not signal-based

---

## Proposed Information Architecture

### Level 1: Org Overview

This becomes the default landing page and the command centre front door.

It should include:

- **Attention bar**
  - Waiting on Dan
  - Overdue commitments
  - Blocked work
  - Team overload

- **Executive KPI row**
  - Commitments health
  - Projects health
  - CRM pipeline health
  - Marketing throughput
  - Tech delivery health
  - Factory / ops health

- **Area cards**
  - Marketing
  - CRM
  - Tech
  - Factory / Ops
  - Projects / Focus Areas
  - AI Team if active enough to justify its own tile

- **Cross-functional feed**
  - Recent decisions
  - Newly blocked items
  - Completions
  - Escalations

- **Action layer**
  - View area
  - Open queue
  - Open commitments
  - Open person / focus area / project detail

### Level 2: Area Dashboards

Every area dashboard should use the same mental model:

- Health
- Throughput
- Blockers
- Workload / capacity
- Upcoming milestones
- Recent changes
- Recommended next actions

This consistency matters more than visual complexity.

### Level 3: Shared Drill-Downs

All cards and alerts should drill into the same reusable detail layers:

- Person
- Focus area
- Commitment
- Campaign
- Lead / flow
- Project

We should avoid creating one-off drill-down patterns per dashboard.

---

## Recommended Navigation Model

### Primary nav

- Overview
- Action Queue
- Commitments
- Projects
- Team

### Secondary nav grouped by domain

- Marketing
- CRM
- Tech
- Factory
- Ops
- Knowledge / Documents

### Navigation rule

The user should be able to move in three ways:

1. from overview to an area
2. from an area to a filtered list
3. from a list to a single item

That means every high-level card needs a clear click target and a predictable landing page.

---

## Canonical Area Card Contract

Each area card in the org overview should use the same payload shape.

```js
{
  id: 'marketing',
  label: 'Marketing',
  status: 'healthy' | 'at-risk' | 'critical' | 'unknown',
  owner: 'Corey',
  headlineMetric: {
    label: 'Active campaigns',
    value: 5
  },
  secondaryMetrics: [
    { label: 'Blocked', value: 1 },
    { label: 'Due this week', value: 7 }
  ],
  topRisk: '2 brand reviews are overdue',
  nextMilestone: 'Spring offer launches on 2026-03-29',
  href: 'marketingOps',
  filters: {
    status: 'Blocked'
  }
}
```

This lets the overview page render every area with one component instead of one custom template per department.

---

## Proposed Backend Shape

### 1. Make `/api/overview` the canonical org rollup

Today `overview-service.js` already composes data from multiple services. That should become the single source for:

- attention counts
- executive KPIs
- normalized area cards
- cross-functional activity feed
- quick links

### 2. Keep area endpoints as specialists

Area routes should continue to own detailed data:

- `/api/marketing-ops`
- `/api/crm`
- `/api/tech-team`
- `/api/factory`
- `/api/ops`
- `/api/projects`

### 3. Add a normalization layer, not a mega-endpoint

Do not move all logic into one giant route.

Instead, add a small adapter layer inside `overview-service.js` that transforms each domain summary into the shared area card contract:

- `buildMarketingAreaCard(summary)`
- `buildCrmAreaCard(summary)`
- `buildTechAreaCard(summary)`
- `buildFactoryAreaCard(summary)`
- `buildProjectsAreaCard(summary)`

This keeps domain logic local and overview rendering simple.

---

## Frontend Restructure

### Option to implement

Use:

- `overview` as the org landing page
- `dashboard` as the execution dashboard

But reposition them clearly:

- **Overview**
  - executive rollup
  - area cards
  - cross-functional health

- **Dashboard**
  - operating cockpit
  - morning brief
  - business health lane
  - execution health lane
  - overdue triage

This is the least disruptive path because it respects existing code.

### What not to do

Do not delete the current dashboard and try to merge everything into one monster page. That would make the product slower, harder to scan, and harder to maintain.

---

## Implementation Phases

### Phase 1: Make Overview the Real Landing Page

**Goal:** Turn `overview` into the actual executive summary.

Work:

- Expand `GET /api/overview` to return:
  - `attention`
  - `executiveKpis`
  - `areaCards`
  - `activityFeed`
  - `quickLinks`

- Replace the current lightweight overview UI with:
  - attention banner
  - KPI row
  - area grid
  - recent activity

- Keep visual density lower than the operational dashboard

Files likely involved:

- `server/services/overview-service.js`
- `server/routes/overview.js`
- `src/js/modules/overview.js`
- new partial for overview if needed
- `public/index.html`
- `src/css/styles.css`

### Phase 2: Standardize Area Dashboards

**Goal:** Make each area page feel like part of one system.

Work:

- define a shared section order for area pages:
  - hero stats
  - blockers
  - workload
  - pipeline / work in progress
  - recent changes
  - actions

- add a reusable `area-header` pattern
- add shared status chips, health scales, and empty states
- normalize metric card spacing, naming, and severity colors

Priority pages:

1. Marketing Ops
2. CRM
3. Tech Team
4. Factory / Ops

### Phase 3: Make Cross-Linking First-Class

**Goal:** Let signals travel across the app.

Work:

- clicking a KPI opens the relevant area or filtered list
- clicking a blocker opens the item detail
- clicking an owner opens the person view
- clicking a focus area opens the focus area view

- add route-like state or a navigation helper so cards can pass:
  - target view
  - filters
  - selected entity

### Phase 4: Introduce Shared Filters and Saved Views

**Goal:** Let Dan move across the system by question, not by page.

Examples:

- "Show everything overdue"
- "Show everything waiting on Dan"
- "Show blocked items across all teams"
- "Show launches due this week"

This can start as query/state filters before becoming a full command-centre search experience.

---

## Recommended Data Definitions

To make the system feel connected, these entities need shared meaning across pages:

- `status`
- `health`
- `priority`
- `owner`
- `dueDate`
- `blocked`
- `overdue`
- `capacity`

### Standard health scale

Use the same labels everywhere:

- `healthy`
- `at-risk`
- `critical`
- `unknown`

Map local domain labels into this scale in adapters.

### Standard capacity scale

Use:

- `light`
- `moderate`
- `loaded`
- `overloaded`

Do not let each page invent its own workload language.

---

## What Success Looks Like

After this work, Dan should be able to do this in under 30 seconds:

1. open the app
2. see what needs attention
3. identify which area is unhealthy
4. click into that area
5. see the specific items and owner causing the problem
6. take an action without hunting across multiple sections

If we cannot do that, the dashboard is still a collection of screens, not a command centre.

---

## Suggested Build Order For This Repo

1. Strengthen `overview-service.js` into the canonical org rollup
2. Build a richer overview page partial and module
3. Keep the current `dashboard` as the operational cockpit
4. Normalize area page structure starting with Marketing and Tech
5. Add click-through filters and shared drill-down behavior

This is the fastest route to a connected dashboard without throwing away current work.

---

## Immediate Next Step

If we move into implementation, the first slice should be:

**Ship a real Overview page**

That gives the whole app a clear front door and forces us to define the shared area-card contract the rest of the system can build around.

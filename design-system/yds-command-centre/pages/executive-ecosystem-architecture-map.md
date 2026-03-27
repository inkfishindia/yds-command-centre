# Executive Ecosystem Architecture Map

**Date:** 2026-03-26  
**Goal:** Define the ideal dashboard ecosystem as a set of separate but interconnected areas, with `CEO` as the executive hub and all domain surfaces sharing one interaction model.

---

## Core Decision

Yes, the system should have separate areas.

But they should not behave like separate products.

The right model is:

1. **Executive hub**
2. **Domain operating surfaces**
3. **Shared entity layers**
4. **Cross-system actions**

That gives us:

- clearer mental models
- faster scanning
- more trustworthy signals
- stronger navigation
- less clutter on any one page

---

## Product Shape

### Layer 1: Executive Hub

This is the `CEO` surface.

It answers:

- What needs Dan right now?
- What is stuck?
- What needs review?
- What is strategically off-track?
- Where should Dan jump next?

This surface should stay focused on:

- attention
- decisions
- delegation
- approvals
- strategy
- operating rhythm

### Layer 2: Domain Surfaces

Each major area gets its own operating system page.

Recommended domains:

- `CEO`
- `Marketing`
- `CRM`
- `Tech`
- `Factory`
- `Ops`
- `Projects`
- `Team`
- `Docs / Review`

Optional future domains:

- `Finance`
- `AI Team`
- `BMC / Strategy`

### Layer 3: Shared Entity Views

These should be reused across all surfaces:

- `Person`
- `Focus Area`
- `Project`
- `Commitment`
- `Decision`
- `Output`
- `Campaign`
- `Lead / Flow`
- `Vendor / Product`

This is the main thing that keeps the system connected.

### Layer 4: Cross-System Actions

The ecosystem should support action loops everywhere:

- assign
- approve
- reject
- mark blocked
- move stage
- create decision
- create draft
- open source
- jump to owner

---

## Area Map

### 1. CEO

**Role:** executive command layer  
**Primary outcomes:**

- run the day
- clear reviews
- validate decisions
- spot risks
- steer priorities

**Sections:**

- Attention Rail
- Executive Modes
- Dan’s Today
- Review Queue
- Strategy
- System Map
- Velocity & Meta
- Document Forge

**Should link to:**

- Action Queue
- Decisions
- Docs
- Projects
- Team
- every domain page

### 2. Marketing

**Role:** growth execution layer  
**Primary outcomes:**

- keep launches moving
- manage content flow
- identify approval bottlenecks
- track campaign health

**Sections:**

- Status Hero
- Campaign Health
- Calendar
- Content Pipeline
- Review Pressure
- Sessions / Sequences
- Next Actions

**Should link to:**

- CEO
- Team
- Projects
- Docs
- CRM

### 3. CRM

**Role:** pipeline operating layer  
**Primary outcomes:**

- spot stalled flow
- monitor owner load
- improve conversion movement
- surface revenue risk

**Sections:**

- Status Hero
- Pipeline Health
- Leads
- Flows
- Team Load
- Config / Routing
- Next Actions

**Should link to:**

- CEO
- Team
- Projects
- Marketing

### 4. Tech

**Role:** product delivery layer  
**Primary outcomes:**

- manage sprint pressure
- clear blockers
- track bug severity
- review specs and decisions

**Sections:**

- Status Hero
- Sprint Health
- Bugs
- Specs
- Decisions
- Agent / Tooling signals
- Next Actions

**Should link to:**

- CEO
- Projects
- Team
- Docs
- Marketing

### 5. Factory

**Role:** production capacity layer  
**Primary outcomes:**

- identify constraints
- understand staffing/capacity
- compare scenarios
- track bottlenecks

**Sections:**

- Status Hero
- Capacity Summary
- Bottlenecks
- Zones
- Shared Resources
- Simulation
- Next Actions

**Should link to:**

- CEO
- Ops
- Projects
- Team

### 6. Ops

**Role:** supply and inventory operating layer  
**Primary outcomes:**

- spot stock risk
- manage vendor exposure
- monitor product pressure
- review POs and sales demand

**Sections:**

- Status Hero
- Stock Alerts
- Purchase Orders
- Vendors
- Products
- Sales Summary
- Next Actions

**Should link to:**

- CEO
- Factory
- Projects
- Team

### 7. Projects

**Role:** cross-functional planning and execution layer  
**Primary outcomes:**

- manage focus areas
- track cross-team work
- identify milestone drift
- connect commitments to outcomes

**Sections:**

- Focus Area Summary
- Project Health
- Commitments
- Milestones
- Risks / Decisions
- Owners

**Should link to:**

- CEO
- every domain
- Team
- Docs

### 8. Team

**Role:** accountability and capacity layer  
**Primary outcomes:**

- see owner load
- identify overload
- review responsibility splits
- trace accountability

**Sections:**

- Team Health
- Workload
- Overload / Underload
- People Detail
- Delegation Map

**Should link to:**

- CEO
- Projects
- all domain surfaces

### 9. Docs / Review

**Role:** output, approval, and knowledge layer  
**Primary outcomes:**

- review deliverables
- manage draft state
- keep SOPs/briefs available
- close executive output loops

**Sections:**

- Review Queue
- Drafts
- Briefs
- SOPs
- Handoffs
- Decision Docs

**Should link to:**

- CEO
- Projects
- Team
- all domain surfaces

---

## Shared Entity Model

This is the minimum canonical model the whole system should use.

### Person

```js
{
  id,
  name,
  role,
  capacity,
  openCount,
  overdueCount,
  domains: [],
  focusAreas: [],
}
```

### Focus Area

```js
{
  id,
  name,
  health,
  owner,
  projectCount,
  commitmentCount,
  overdueCount,
  blockedCount,
}
```

### Project

```js
{
  id,
  name,
  status,
  owner,
  focusArea,
  milestone,
  risk,
}
```

### Commitment

```js
{
  id,
  name,
  status,
  priority,
  owner,
  dueDate,
  focusAreas: [],
}
```

### Decision

```js
{
  id,
  title,
  status,
  rationale,
  owner,
  date,
}
```

### Output

```js
{
  id,
  title,
  type,
  status,
  path,
  createdAt,
  reviewedAt,
}
```

---

## Interaction Rules

The ecosystem should feel interactive in the same way everywhere.

### Rule 1: Every KPI must open something real

No dead metrics.

Examples:

- overdue count -> commitments view
- blocked campaigns -> marketing blockers
- stalled flows -> CRM flow list
- low stock -> ops stock alerts

### Rule 2: Every alert needs an action

Alerts should support:

- open
- assign
- approve
- snooze
- route

### Rule 3: Every area uses the same six-question frame

Each area should answer:

1. What is the status?
2. What needs attention now?
3. What is blocked?
4. What is moving this week?
5. Who owns the pressure?
6. What should happen next?

### Rule 4: Every entity should cross-link

Clicking the same entity in different areas should land on the same context.

Examples:

- `Dan` in CEO, Team, or Projects -> same person context
- `Growth` in CEO or Projects -> same focus-area context
- `Draft spec` in CEO or Docs -> same output context

### Rule 5: Every area should support saved modes

Baseline modes:

- `Today`
- `Blocked`
- `Needs Review`
- `At Risk`
- `Waiting on Dan`

### Rule 6: Review state must persist

Executive actions are part of the ecosystem, not transient UI:

- approve
- reject
- needs edit
- reviewedAt
- review note

---

## Route Map

### Executive and core surfaces

- `/` -> main command centre
- `/ceo` -> CEO executive hub
- `/?view=overview`
- `/?view=dashboard`
- `/?view=actionQueue`
- `/?view=projects`
- `/?view=team`
- `/?view=docs`

### Domain surfaces

- `/?view=marketingOps`
- `/?view=crm`
- `/?view=techTeam`
- `/?view=factory`
- `/?view=ops`
- `/?view=bmc`

### Shared context routing

Use URL params to preserve interconnected behavior:

- `?view=team&owner=Dan`
- `?view=projects&focusArea=Growth`
- `?view=dashboard&mode=today`
- `?view=docs&mode=review`

---

## UI Contract

Areas should remain visually aligned.

### Shared page structure

- header
- status hero
- summary strip
- attention / saved modes
- primary section grid
- detail sections

### Shared components

- hero card
- metric card
- status pill
- attention card
- saved-mode chip
- item card
- detail drawer
- forge / action drawer

### Shared signal vocabulary

- `healthy`
- `warning`
- `critical`
- `unknown`

---

## Current Repo Mapping

### Already implemented or close

- `CEO`
- `Overview`
- `Dashboard`
- `Marketing`
- `CRM`
- `Tech`
- `Factory`
- `Ops`
- `Projects`
- `Team`
- `Docs`

### Shared connective tissue already present

- cross-links between CEO and main app
- shared owner/focus-area jumps
- clickable KPIs
- saved views in major domain pages
- forge / review flow beginnings

### Still structurally weak

- Docs / Review as a stronger standalone executive workflow
- Projects as the canonical cross-functional layer
- more unified entity detail behavior for outputs and decisions
- deeper global filtering across all pages

---

## Recommended Rollout

### Phase 1: Lock the ecosystem shape

- finalize area list
- finalize shared entity model
- finalize route rules

### Phase 2: Strengthen the executive hub

- CEO modes
- attention rail
- review actions
- daily brief generation

### Phase 3: Strengthen shared entities

- person context
- focus area context
- output context
- decision context

### Phase 4: Harden domain consistency

- same section frame in every area
- same saved-view system
- same quick-action model

### Phase 5: Cross-system orchestration

- global filters
- better handoff routing
- deeper docs/review integration
- subdomain deployment model if desired

---

## Recommended Build Principle

We should think of this as:

**one operating system with multiple areas**

not:

**many dashboards living side by side**

That means every new section should be judged by two questions:

1. Does it make one area clearer?
2. Does it stay connected to the rest of the system?

If both are true, it belongs.

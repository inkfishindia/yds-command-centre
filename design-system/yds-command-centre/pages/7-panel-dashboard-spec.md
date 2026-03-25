# 7-Panel CEO Dashboard — Architecture Spec

## Data Layer: What Feeds What

```
NOTION (live)
  Commitments · Focus Areas · Decisions · People
  Projects · Tech Backlog · Marketing · Ops · Sales
  Campaigns · Content Calendar · Sequences · Sessions

KNOWLEDGE (local reference)
  business-memory · team-directory · routing-map
  decision-log · focus-area-master · segments
  slack-channels · project-registry · notion-reference
  alex-lens · friedman-lens · operating-manual
  colin-operating-principles

SESSION STATE (volatile)
  data/sessions/handoff.md
  data/sessions/activity-log.md
  data/sessions/decisions.md
  MEMORY.md

OUTPUTS (deliverables)
  Strategic docs · Handoffs · Audits · SOPs · Specs
```

---

## Panel 1: PULSE BAR (persistent top strip)

| Widget | Source | Behavior |
|--------|--------|----------|
| Focus Area Health (7 dots) | knowledge/focus-area-master.md + Notion Focus Areas DB | Color = Health field. Tap → drill into that focus area |
| Overdue Badge | Notion Commitments (Status ≠ Done, Due < today) | Red number. Tap → overdue list |
| Decisions Pending Rationale | Notion Decisions (Rationale = "TBD") | Amber count. Tap → decision queue |
| Team Load | Notion Commitments grouped by Assigned To | Heatmap: name × open count. Red if Nirmal >8 or Ashwini >5 |
| System Health | data/sessions/activity-log.md | Green/yellow/red based on: last session age, handoff freshness, overdue trend |
| Clock/Cadence | Current time mapped to knowledge/operating-manual.md cadence | Shows: "CEO Sprint" / "Brief Window" / "Brain Dump" / "Evening Prep" |

---

## Panel 2: DAN'S TODAY (left column, primary)

| Section | Source | Frontend |
|---------|--------|----------|
| Morning Brief | /morning-brief skill output → Notion parallel pull | Auto-rendered at 10am. Collapsible sections matching knowledge/templates/morning-brief.md template |
| Review Queue | outputs/ files with status=pending | Card list: title, type (handoff/SOP/6-pager/spec), created date, "Approve / Edit / Reject" buttons |
| Brain Dump Inbox | Unprocessed items from /brain-dump skill | Raw text cards with "Triage" button → runs triage agent → shows classified items |
| Decisions to Validate | Notion Decisions where Rationale = "TBD" | Card per decision: gut call shown, fields for rationale/alternatives/risks. "Confirm" saves back |
| Calendar | Google Calendar via MCP | Today's blocks. Red highlight if conflicts with CEO Sprint (8-10am) |
| Delegation Alerts | /delegate skill triggers | Banner when Dan starts execution work: "Is this CEO work?" with suggested owner + route button |

---

## Panel 3: COLIN'S WORKSPACE (right column)

| Section | Source | Frontend |
|---------|--------|----------|
| Active Agents | .claude/agents/*.md definitions + runtime state | Live status: which agent is running, what it's doing, ETA |
| Recent Actions | data/sessions/activity-log.md | Timestamped feed: "Created commitment: X", "Logged decision: Y", "Routed to Nirmal: Z" |
| Pending Outputs | outputs/ directory listing | Files awaiting Dan's review, grouped by type |
| Memory Updates | MEMORY.md diffs per session | "Colin learned: [new feedback/preference]" with undo button |
| Session Handoff | data/sessions/handoff.md | Current state summary, what happened last session, what's queued for next |
| Knowledge Staleness | All knowledge/*.md last-modified dates | Yellow flag if any file >14 days stale. "Refresh" button triggers re-audit |

---

## Panel 4: SYSTEM MAP (center, expandable overlay)

| Node | Source | Data Shown |
|------|--------|------------|
| Dan | Notion Commitments assigned to Dan | Open count, overdue count, delegation ratio |
| Colin | knowledge/colin-operating-principles.md + session state | Skills available, last action, current mode |
| Emily (Marketing) | knowledge/routing-map.md + Notion Marketing Tracker | Active campaigns, content calendar items, team members under her |
| Arjun (Tech) | knowledge/routing-map.md + Notion Tech Backlog | Sprint items, P0 count, team (Nirmal, Tamil, Suraj) |
| Factory OS | knowledge/routing-map.md + Notion Ops Tracker | Production queue, team (Diwakar, Surath, Janak, Gowri) |
| Jessica (Design) | knowledge/routing-map.md | Active briefs, pending creative |
| Each Person | knowledge/team-directory.md + Notion People DB | Role, Slack ID, capacity flag, open commitments, Notion page link |

Edges between nodes = active delegations/handoffs. Click any node → drill into their domain tracker.

Routing rules from knowledge/routing-map.md shown as tooltips on edges: "Via Arun first" for ops, "Ashwini at capacity" warnings.

---

## Panel 5: STRATEGIC LAYER (tab, not always visible)

| Section | Source Files | Frontend |
|---------|-------------|----------|
| Operating Model | outputs/dan-os-operating-model.md | Rendered markdown, always accessible as "the constitution" |
| Demand-Side View | knowledge/alex-lens.md + outputs/demand-side-100m-roadmap.md | Strategic perspective: D2C growth levers, audience strategy, brand positioning |
| Supply-Side View | knowledge/friedman-lens.md + outputs/100m-supply-side-roadmap.md | Strategic perspective: factory capacity, B2B scaling, ops bottlenecks |
| Platform Synthesis | outputs/yds-100m-platform-strategy.md | Combined view: 4-pillar architecture, phase gates, revenue targets |
| Agent Architecture | outputs/yds-complete-agent-architecture.md | 87-agent map — filterable by team/domain |
| Segments & Flywheels | knowledge/segments-flywheels.md | 4 segments with AOV/ROI, 3 flywheels with defensibility scores, 18 channels |
| Brand Contradictions | outputs/brand-contradictions-register.md | Open issues requiring alignment session — status tracker |

---

## Panel 6: VELOCITY & META (bottom strip)

| Metric | Source | Visualization |
|--------|--------|---------------|
| Decisions/week | Notion Decisions DB (Date field, rolling 7d) | Sparkline |
| Commitments created vs closed | Notion Commitments (created_time vs Status=Done date) | Dual bar chart, 7d rolling |
| Avg days overdue | Notion Commitments (Due Date vs today, Status ≠ Done) | Single number + trend arrow |
| Delegation ratio | Commitments created this week: % assigned to team vs Dan | Pie chart |
| Session frequency | data/sessions/activity-log.md timestamps | Dots on timeline — gaps = blind spots |
| Knowledge freshness | knowledge/*.md last-modified dates | Heat strip — green (fresh) to red (stale) |
| Handoff completeness | outputs/*handoff*.md — delivered vs pending | Progress bar per domain |

---

## Panel 7: DOCUMENT FORGE (slide-out drawer)

| Tool | Source | Frontend |
|------|--------|----------|
| Write 6-Pager | /write-6-pager skill → outputs/ | Template selector, topic input, "Generate" → saves to outputs/, shows in Review Queue |
| Write PR/FAQ | /write-pr-faq skill → outputs/ | Same flow |
| Brain Dump | /brain-dump skill | Text area + voice note upload → triage → Notion |
| Decision Capture | /decision skill | Quick form: what, why, alternatives → Notion + knowledge/decision-log.md |
| SOP Builder | /delegate skill's SOP generation | Select task → auto-generates SOP → saves to outputs/sops/ |
| Expert Panel Log | knowledge/templates/expert-handoff-log.md | Pipeline tracker: Rory → JW+Copy → Tech → status per stage |

---

## File-to-Panel Map

| File/Folder | Panel | Role |
|-------------|-------|------|
| CLAUDE.md | System Map, Strategic | Colin's identity/rules — rendered as "About Colin" |
| MEMORY.md | Colin's Workspace | Displayed as learned preferences, editable |
| knowledge/business-memory.md | Pulse (revenue), Strategic | Company facts feed widgets |
| knowledge/team-directory.md | System Map, Pulse (team load) | Node data for every person |
| knowledge/routing-map.md | System Map (edges), Delegation Alerts | Routing rules shown on connections |
| knowledge/decision-log.md | Velocity (decisions/week), Strategic | Historical decisions feed + new ones append |
| knowledge/focus-area-master.md | Pulse (health dots) | 7 active focus areas with health colors |
| knowledge/operating-manual.md | Pulse (cadence clock), Colin's Workspace | Defines what mode we're in |
| knowledge/colin-operating-principles.md | Colin's Workspace | Meta-rules for how Colin operates |
| knowledge/notion-reference.md | (backend only) | Schema reference for all Notion queries |
| knowledge/alex-lens.md | Strategic (demand tab) | Demand-side perspective |
| knowledge/friedman-lens.md | Strategic (supply tab) | Supply-side perspective |
| knowledge/segments-flywheels.md | Strategic | Customer segments + growth flywheels |
| knowledge/slack-channel-registry.md | System Map (channel labels) | Where comms route |
| knowledge/project-registry.md | System Map (domain nodes) | Project workspace definitions |
| knowledge/templates/*.md | Document Forge | Templates for briefs/decisions/handoffs |
| data/sessions/handoff.md | Colin's Workspace | Cross-session state |
| data/sessions/activity-log.md | Colin's Workspace, Velocity | Action feed + session frequency |
| data/sessions/decisions.md | Dan's Today (decisions queue) | Session-level decision register |
| data/*.xlsx, *.gsheet | Pulse (business metrics) | Order data, sales reports feed numbers |
| outputs/dan-os-operating-model.md | Strategic (constitution) | Always accessible reference |
| outputs/*handoff*.md | Colin's Workspace (pending) | Domain handoff documents |
| outputs/*roadmap*.md | Strategic | Long-range plans |
| outputs/*audit*.md | Velocity (system health) | Notion/workspace health checks |
| outputs/*spec*.md | Colin's Workspace (delivered) | Build specs sent to domains |
| outputs/sops/ | Document Forge | Generated SOPs |
| .claude/agents/*.md | Colin's Workspace (active agents) | Agent definitions + runtime status |
| .claude/skills/*.md | Document Forge (tool buttons) | Each skill = a dashboard action |
| .claude/rules/*.md | (backend only) | Govern behavior, not displayed |
| .claude/settings.json | (backend only) | Hooks, permissions — system plumbing |

---

## State Flow

```
Dan speaks/types/voice-notes
       │
       ▼
  [Brain Dump Inbox] ──→ triage agent classifies
       │
       ├──→ Commitment → Notion Commitments DB → Pulse + Today
       ├──→ Decision → Notion Decisions DB + decision-log.md → Velocity
       ├──→ Delegation → routing-map lookup → System Map edge lights up
       └──→ Idea → parked in session handoff → surfaces in next brief

Colin processes
       │
       ▼
  [Activity Log] ──→ Colin's Workspace feed
  [Outputs/] ──→ Review Queue in Dan's Today
  [MEMORY.md] ──→ Memory Updates panel
  [Handoff.md] ──→ Session state for next conversation
```

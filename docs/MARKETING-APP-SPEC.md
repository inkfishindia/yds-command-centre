# YDS Marketing App — Full Structure Spec

**Source:** Dan, 2026-05-03. This is the authoritative build target for the marketing surface inside Command Centre.

Cross-references:
- DB IDs + schemas: [`docs/marketing/NOTION-SETUP.md`](marketing/NOTION-SETUP.md) § 3.1, § 4.1-4.5
- Wiring punch list: [`docs/TECH-WIRE-UP.md`](TECH-WIRE-UP.md)
- Phase 1 pre-Phase 2 alignment: [`docs/MARKETING-ALIGNMENT.md`](MARKETING-ALIGNMENT.md)
- Hardcoded DB constants: [`server/services/notion/databases.js`](../server/services/notion/databases.js#L38-L45)

## App Shell

- Lives inside Command Centre (Vercel app, Alpine.js frontend)
- Sidebar group: **Growth** (existing)
- Auth: Dan only (single user; approval gate already wired)
- Approval-gate pattern: every Notion write pauses for Dan's confirm via SSE

## Pages (8) — Daily-Driver Priority Order

| # | Page | Route | Primary DBs | Why it exists |
|---|---|---|---|---|
| 1 | Marketing Dashboard | `/marketing` | Content Calendar, Campaigns, IG Performance, Weekly Ops Log, Approvals Log | Dan's morning view |
| 2 | Content Calendar | `/marketing/content` | Content Calendar | Pipeline kanban for all channels |
| 3 | IG Command Center ✨ | `/marketing/ig` | IG Performance, Hook Pattern Log, Template Library, Weekly Ops Log, Content Calendar | IG playbook §3 surface |
| 4 | Campaigns | `/marketing/campaigns` | Campaigns, Decisions, Sequences, Content Calendar | Stage-pipeline tracker |
| 5 | Approvals Queue | `/marketing/approvals` | Content Calendar, Approvals Log | Brand Editor batch + Dan exceptions |
| 6 | Lifecycle | `/marketing/lifecycle` | Sequences, Audiences | Email + WA performance |
| 7 | MCC Composer | `/mcc` (existing) | MCC Posts | Pre-publish drafts → IG/LI |
| 8 | Performance | `/marketing/performance` | IG Performance, Weekly Ops Log, Sequences, Campaigns | Cross-channel rollup |

---

## Page 1 — Marketing Dashboard

| Module | Section | DB | CRUD |
|---|---|---|---|
| Today's Shipping | Posts publishing today + tomorrow | Content Calendar | R |
| Campaign Status Board | Active campaigns grouped by Stage; P0 + blocked surfaced | Campaigns | R |
| Yesterday's Pulse | IG SWPS 7-day rolling, top 3 posts, ad-spend delta | IG Performance, Weekly Ops Log | R |
| Action Inbox | Items where Status=Needs Dan or Verdict pending | Campaigns, Approvals Log | R + Update verdict |
| Hook Graduation Strip | This week's ad candidates ready for Kasim | IG Performance | R + Update Ad Candidate checkbox |

## Page 2 — Content Calendar

| Module | Section | DB | CRUD |
|---|---|---|---|
| Pipeline Kanban | 8 columns: Idea → Briefed → Drafted → In Design → Brand Review → Approved → Scheduled → Published | Content Calendar | R + drag-update Status (gated for Brand Review→Approved) |
| Calendar View | Monthly grid by Publish Date | Content Calendar | R |
| Filter Strip | Pillar (IG) / Channel / Owner / Brand Review Status / Hook Pattern / Audience Segment | Content Calendar | R |
| New Content modal | Title, Body, Pillar (IG), Channel, Hook, Hook Pattern, Owner, Publish Date, Visual Brief, Campaign relation | Content Calendar | C (approval-gated) |
| Inline edit drawer | All properties | Content Calendar | U (approval-gated) |
| "Open in Notion" button | Deep link | — | — |

## Page 3 — IG Command Center ✨

| Module | Section | DB | CRUD |
|---|---|---|---|
| SWPS Tracker | Weekly chart, Tier 1 (3 numbers: SWPS / Hook Graduation Count / Email captures), Day-60 progress | IG Performance, Weekly Ops Log | R |
| This Week's Posts | 6 posts shipping with current status | Content Calendar (filter Channel=Instagram) | R |
| Hook Pattern Win-Rate | 5 patterns + variants, SWPS rollup, use count | Hook Pattern Log + IG Performance rollup | R + Update Status (Active/Testing/Retired) |
| Templates | Active templates with usage count + last-used date | Template Library | R + C / U / archive |
| Ad Candidates Queue | Posts where Hit Target=true AND Ad Candidate=false | IG Performance | R + Update Ad Candidate checkbox (Emily) |
| Graduated Hooks | Posts where Graduated to Ads=true | IG Performance | R + Update Graduated to Ads checkbox (Kasim) |
| Friday Pulse Composer | Auto-generated draft for current week | Weekly Ops Log | R + Update Insight/Question for Dan/Status=Sent |
| Performance Entry | Manual Reach/Saves/Shares form, Mon 10am IST | IG Performance | U (Corey enters numbers) |

## Page 4 — Campaigns

| Module | Section | DB | CRUD |
|---|---|---|---|
| Stage Pipeline | 6 columns: Briefing → Strategy → Build → Live → Optimize → Complete | Campaigns | R + drag-update Stage (gated) |
| Campaign Detail Drawer | Brief, Owner, Channel, Budget, Status, related CC rows, related Decisions, related Sequences | Campaigns + cross-DB rollups | R + U (approval-gated) |
| New Campaign modal | Name, Owner, Channel, Budget, Target Launch, Focus Area, Target Segment | Campaigns | C (approval-gated) |
| Health Strip | On Track / Blocked / Needs Dan / Paused counts | Campaigns | R |

## Page 5 — Approvals Queue

| Module | Section | DB | CRUD |
|---|---|---|---|
| Brand Review Queue | CC posts in Status=Brand Review, due Wed batch | Content Calendar | R |
| Approve / Revision / Kill | 3-button action with Reason field + 3 checkboxes (Litmus / Banned-words / No-fake-UGC) | Content Calendar (Status update) + Approvals Log (auto-create) | U + auto-C via Automation A2 |
| Approval History | Recent Approvals Log entries | Approvals Log | R |
| Two-Revision Watchlist | Posts at Revision Round=2, alert for kill decision | Approvals Log | R |
| Dan Exceptions | Items escalated to Dan (≤1/month expected) | Content Calendar (filter) | R + Update Status |

## Page 6 — Lifecycle

| Module | Section | DB | CRUD |
|---|---|---|---|
| Sequence Performance | Live sequences w/ open / click / conversion / unsub / revenue | Sequences | R |
| Sequence Detail | Steps count, Segment, Channel, Trigger, Launch Date, Notes | Sequences | R + U (approval-gated) |
| New Sequence | Name, Channel, Trigger, Segment, Steps | Sequences | C (approval-gated) |
| Status changes | Draft → In Review → Live → Paused / Retired | Sequences | U (approval-gated) |

## Page 7 — MCC Composer (already wired)

| Module | Section | DB | CRUD |
|---|---|---|---|
| Posts Kanban | 6 columns: draft / scheduled / awaiting-approval / publishing / published / failed | MCC Posts | R + drag-update Status |
| Composer modal | Title, Body, Platforms, Media URLs, Scheduled For | MCC Posts | C / U |
| OAuth bar | IG / LinkedIn connection status | (Phase 2 token DBs) | — |

## Page 8 — Performance (cross-channel)

| Module | Section | DB | CRUD |
|---|---|---|---|
| Weekly Pulse Archive | All Weekly Ops Log rows, sortable by Week Of | Weekly Ops Log | R |
| Hook → Ad Funnel | IG hooks graduated to ads w/ ad-side ROAS overlay (when Kasim wires) | IG Performance, Hook Pattern Log | R |
| Email List Growth | Captures from source=ig-bio | external (GA4 + email platform) | R |
| Sequence Revenue | Lifecycle revenue rollup | Sequences | R |
| Campaign Spend vs Budget | Active campaigns burn rate | Campaigns | R |

---

## CRUD-by-DB Contract

| DB | Read surfaces | Create | Update | Delete |
|---|---|---|---|---|
| Content Calendar | All marketing pages | New Content modal (gated) | Status moves + property edits (gated for Brand Review→Approved) | Status=Cancelled (soft) |
| Campaigns | Dashboard, Campaigns page | New Campaign modal (gated) | Stage / Owner / Status (gated) | Status=Paused / Complete (soft) |
| Decisions | Strategy + drill-downs | Log Decision (Cmd+Shift+J, gated) | Inline edits (gated) | Never |
| Commitments | Action Queue (filter Focus Area = D2C Marketing & Content) | New Commitment (Cmd+Shift+N, gated) | Status / owner / due date (gated) | Status=Cancelled (soft) |
| IG Performance | IG Command Center, Performance, Dashboard | Auto via Automation A1 (CC→Published trigger) | Manual metric entry by Corey; Ad Candidate by Emily; Graduated to Ads by Kasim | Never |
| Hook Pattern Log | IG Command Center | New pattern (gated) | Definition edits, Status | Status=Retired (soft) |
| Template Library | IG Command Center | New template (gated) | Asset Link / Status / Last Used | Status=Retired (soft) |
| Approvals Log | Approvals Queue, Dashboard | Auto via Automation A2 (Brand Review verdict trigger) | Never (append-only) | Never |
| Weekly Ops Log | IG Command Center, Performance | Auto via Automation A3 (Friday cron) | Insight / Question for Dan / Status=Sent (gated) | Never |
| Sequences | Lifecycle, Performance | New Sequence (gated) | Status, performance metrics (manual entry) | Status=Retired (soft) |
| MCC Posts | MCC Composer | New draft | Pipeline status / Scheduled For / Media | Delete drafts only |
| Audiences | Strategy, segment selectors | New segment (gated) | Profile edits (gated) | Never |
| Focus Areas | Strategy, drilldowns | New focus area (gated, rare) | Health / Blockers updates | Never |
| Projects | Operations, Strategy | New project (gated) | Status, Owner | Status=Cancelled (soft) |
| Sessions Log | Sessions browser | Auto-create on /session-wrap | Never (append-only) | Never |

## Cross-Cutting Modules

| Module | Where it appears | Function |
|---|---|---|
| Approval Gate | Every write surface | SSE prompt → Dan confirms → write commits |
| Command Palette | Cmd+K global | Quick-jump to any page; New Commitment, Log Decision, New Content, New Campaign |
| Notion deep-link | Every row | "Open in Notion" button (no rebuild of comments — use Notion's native) |
| Verify-before-confirming | All write paths | Re-fetch after write, render success only on echo |

---

## Per-Page DB Wire-Up Cheat Sheet

All 14 marketing DBs + MCC Posts: IDs locked, schemas captured.

| Page | DBs needed | Data Source IDs | Schema spec |
|---|---|---|---|
| 1 Dashboard | Content Calendar, Campaigns, IG Performance, Weekly Ops Log, Approvals Log | a3066b81…2ad7c5, cff40f34…b0b88, 5959753f…6a811, 450968bb…d03d, 352b4779…ed94 | NOTION-SETUP § 3.1 + § 4.1, 4.4, 4.5 |
| 2 Content Calendar | Content Calendar | a3066b81-c26c-453d-aed2-4588c92ad7c5 | § 3.1 (existing 21 props + 4 new from 2026-05-02) |
| 3 IG Command Center | IG Performance, Hook Pattern Log, Template Library, Weekly Ops Log, Content Calendar | 5959753f…6a811, 3a32a0ae…ec9e0, ff498859…ffc19, 450968bb…d03d, a3066b81…2ad7c5 | § 4.1, 4.2, 4.3, 4.5 |
| 4 Campaigns | Campaigns, Decisions, Sequences, Content Calendar | cff40f34…b0b88, 158108d0…2597be, aaee75a9…2a4b9b, a3066b81…2ad7c5 | Existing schemas via `notion-fetch collection://{id}` |
| 5 Approvals Queue | Content Calendar, Approvals Log | a3066b81-c26c-453d-aed2-4588c92ad7c5, 352b4779-a937-42e5-9553-f9247317ed94 | § 3.1 + § 4.4 |
| 6 Lifecycle | Sequences, Audiences | aaee75a9-fc51-41ba-8f45-8ad1e72a4b9b, 97e9f674-484e-4117-ba18-4357e12879a1 | Fetch live (existing) |
| 7 MCC Composer | MCC Posts | env `MCC_POSTS_DB_ID` | `mcc/POSTS-DB.md` — already wired |
| 8 Performance | IG Performance, Weekly Ops Log, Sequences, Campaigns | All above | § 4.1 + § 4.5 + existing |

### Cross-cutting (not page-specific)

| DB | Data Source ID | Used by |
|---|---|---|
| Focus Areas | 66ca7a48-f238-481f-a794-8353222b1b84 | Filters on every page (Focus Area = D2C Marketing & Content) |
| Commitments | 71914093-29c0-492f-bab3-5e493a5c7173 | Action Inbox, Marketing tasks filter |
| Sessions Log | b1d04b58-2c40-4091-8f6d-d2ccc1c1b2f1 | Read-only history |
| Projects | 1ae0f102-2c16-401f-b2a4-1eee6b993ab1 | Strategic context |

### Schema discovery — copy-paste for any agent

```
# Returns full schema (all properties, types, options, relations) for any DB:
notion-fetch collection://{data_source_id}

# Example — IG Performance:
notion-fetch collection://5959753f-b4ff-4b7a-9d16-c4e1ec46a811
```

Returns Notion-flavored Markdown with property names, types, select options, formula expressions, relation targets, rollup definitions.

---

## Build Sequencing (dependency-ordered)

1. **TECH-WIRE-UP §1-3** (env doc + Hub verify + parent-chain crawler) — quick, unblocks everything below
2. **A1/A2/A3 automations** (TECH-WIRE-UP §4-6) — Pages 1, 5, 8 depend on these write-paths
3. **Page 2 — Content Calendar** — most-used surface; foundational for Pages 3/4/5/8
4. **Page 3 — IG Command Center** finish — fills out the half-shipped view
5. **Page 5 — Approvals Queue** — once A2 is live
6. **Pages 4 + 6 — Campaigns + Lifecycle** — independent, parallelizable
7. **Pages 1 + 8 — Dashboard + Performance** — rollups; build last when source pages exist

## Current Shipped State (as of 2026-05-03)

| Page | Status |
|---|---|
| 1 Marketing Dashboard | partial — `/marketing` shell exists; needs Today's Shipping + Yesterday's Pulse + Hook Graduation Strip |
| 2 Content Calendar | not built |
| 3 IG Command Center | partial — IG playbook view shipped 2026-05-02; needs SWPS tracker + hook win-rate + template mgmt + ad-candidate queue |
| 4 Campaigns | not built |
| 5 Approvals Queue | not built (depends on A2) |
| 6 Lifecycle | not built |
| 7 MCC Composer | shipped (2026-05-02) |
| 8 Performance | not built (depends on A1+A3) |

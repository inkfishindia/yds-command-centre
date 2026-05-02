# Marketing Notion Setup — Tech Handoff

**Scope:** Full marketing-system Notion map. All databases, IDs, schemas, formulas, relations, and automations needed to wire the marketing layer of the command centre.

**Last updated:** 2026-05-02 — IG playbook v1 DBs landed (Hook Pattern Log, Template Library, Approvals Log, Weekly Ops Log, IG Performance).

**For code-level MCC Posts DB integration** (the social-posting backend that's already wired) — see [mcc/POSTS-DB.md](mcc/POSTS-DB.md). That doc remains authoritative for the MCC code path; this doc is the higher-level system map.

---

## TL;DR for Wire / Nirmal

You have **15 marketing DBs** total: 9 strategic/ops DBs that pre-existed, 5 IG-playbook DBs created 2026-05-02, plus the MCC Posts DB (already wired).

Two things tech needs to do to make this real:
1. **Add 5 env vars** for the new IG-playbook DB IDs (§ Env Vars).
2. **Wire 6 automations** (§ Automations) — most are status-trigger webhooks from Notion → command-centre.

Everything below is written so you can copy-paste IDs and property names verbatim. Property names are **case- and space-sensitive** — Notion's API matches by exact string.

---

## 1. Database Inventory

| # | DB | Data Source ID | Notion Page ID | Purpose |
|---|---|---|---|---|
| 1 | 🎯 Projects | `1ae0f102-2c16-401f-b2a4-1eee6b993ab1` | `85c1b292-0563-4f43-b50d-c16fc7466faa` | Mission briefs / initiatives / experiments |
| 2 | 🎟️ Commitments | `71914093-29c0-492f-bab3-5e493a5c7173` | `0b50073e-5449-42aa-b109-9fc559b390fb` | Task tracking with type/priority/source |
| 3 | 🗨️ Decisions | `158108d0-623d-4dda-8e5c-2f6ade2597be` | `3c8a9b22-ba92-4f20-bfdc-ab4cc7a46478` | Strategic decision log |
| 4 | 🎯 Focus Areas | `66ca7a48-f238-481f-a794-8353222b1b84` | `274fc2b3-b6f7-430f-bb27-474320eb0f96` | Business-area-level themes |
| 5 | 👬 Audiences | `97e9f674-484e-4117-ba18-4357e12879a1` | `63ec25ca-e3b0-4320-93fa-639d4c8b5809` | Customer segment definitions |
| 6 | Campaigns | `cff40f34-13a8-4c64-b5bf-edafeffb0b88` | `9f5f3da6-20e6-4bf0-bcee-f7f9a3465925` | Channel campaigns w/ stage pipeline |
| 7 | Content Calendar | `a3066b81-c26c-453d-aed2-4588c92ad7c5` | `227f3365-feab-476e-8879-1f2a4d0a72b9` | Cross-channel content pipeline |
| 8 | Sequences | `aaee75a9-fc51-41ba-8f45-8ad1e72a4b9b` | `e580d12c-ac8c-43bd-8901-76fc0985518e` | Email/WA lifecycle perf |
| 9 | Sessions Log | `b1d04b58-2c40-4091-8f6d-d2ccc1c1b2f1` | `dffaf6eb-2164-4485-8981-203915991c22` | Session memory + decisions/tasks links |
| 10 | **Hook Pattern Log** ✨ | `3a32a0ae-a45b-4537-b73e-76015c8ec9e0` | `3d71c78e-f566-4312-bc70-d7d72a3cd5a1` | Catalog of IG hook patterns |
| 11 | **Template Library** ✨ | `ff498859-fead-4048-b9d6-ea250b4ffc19` | `10996869-d1e2-49fd-b01d-16085f908015` | Reusable carousel/reel/single/story templates |
| 12 | **Approvals Log** ✨ | `352b4779-a937-42e5-9553-f9247317ed94` | `e305be59-e448-4d5e-899f-d4aeb636a7d9` | Append-only Brand Editor decisions log |
| 13 | **Weekly Ops Log** ✨ | `450968bb-4a50-42d4-bab2-590d99b3d03d` | `24e5ae2d-b9f6-4f38-b11a-c7beee4f0357` | Friday IG pulse rollup |
| 14 | **IG Performance** ✨ | `5959753f-b4ff-4b7a-9d16-c4e1ec46a811` | `21476f90-9d33-4661-b2f6-9ec825162ba6` | One row per published IG feed post (SWPS) |
| 15 | MCC Posts | _see [mcc/POSTS-DB.md](mcc/POSTS-DB.md)_ | _see env_ | Social-posting backend (already wired) |

✨ = created 2026-05-02. Each row in DBs 10-14 was seeded with one example row tagged `EXAMPLE` so the wire-up shape is visible. Delete or filter them out before going live.

**Parent page** for all new DBs: `YDS Marketing Hub` = `323247aa-0d7b-81a5-b85d-ce421c959f3b`. Notion integration must have access to this page (which propagates).

### 1.1 Do Not Wire — Deprecated DBs (all archived 2026-05-03)

These DBs exist in Notion but must NOT be wired to the dashboard or read-model crawler. **All renamed `[ARCHIVED]` in title** as of 2026-05-03 — title prefix is the in-Notion deprecation signal.

| DB | ID | Status | Replace with |
|---|---|---|---|
| `[ARCHIVED] Marketing Campaigns (old)` | `2e213a71-33a1-423c-a4ed-686c0cf7a04d` | ✅ Archived | Canonical `Campaigns` (`cff40f34…`) |
| `[ARCHIVED] Campaign Decisions` | `36f79d19-dbfe-4fdd-b593-f919db15e8b2` | ✅ Archived | `Decisions` (`158108d0…`) — filter by Domain |
| `[ARCHIVED] Marketing Log` | `3ca17008-a299-4dcf-a662-300438a9e295` | ✅ Archived (0 rows) | `Sessions Log` (`b1d04b58…`) |
| `[ARCHIVED] Marketing Tasks` | `b44daab1-c281-4e88-8ea4-6e9371370c28` | ✅ Archived (6 rows migrated to Commitments YDS-262 → YDS-267) | `Commitments` filtered by Focus Area = D2C Marketing & Content |
| `[ARCHIVED] Campaigns (Hub A)` | `25c247aa-0d7b-81de-9a09-000bd2154509` | ✅ Archived (Hub A child) | `Campaigns` (`cff40f34…`) |
| `[ARCHIVED] Marketing Sprints (A)` | `25c247aa-0d7b-8118-ab5f-000b231de3ad` | ✅ Archived (Hub A child) | (none — sprints in Commitments + Sessions Log) |
| `[ARCHIVED] YD Marketing Campaigns (A)` | `25c247aa-0d7b-813c-8765-000bfa63286f` | ✅ Archived (Hub A child) | `Campaigns` |
| `[ARCHIVED] Campaigns & Series (A)` | `34e3a22a-1577-43bd-9fab-32145d99b5d9` | ✅ Archived | `Campaigns` |
| `[ARCHIVED] Marketing Tracker` | `db0ca2ff-ae2d-4037-b73b-b3c39ab2d68f` | ✅ Archived (0 rows; was tech dashboard prototype) | Capabilities split: content → Content Calendar, approvals → Approvals Log, tasks → Commitments |
| `[ARCHIVED] Marketing Operations Hub (Aug 2025)` (page) | `25c247aa-0d7b-811c-bc15-c1835457425b` | ✅ Archived (Hub A parent page renamed) | `YDS Marketing Hub` (`323247aa…`) |

**Crawler filter (one rule excludes all of the above):** scope Notion crawler to parent chain `307247aa-0d7b-8102-bfa0-f8a18d8809d9` (YDS Operating System v2). Hub A and YD Home tree are siblings in the workspace, not children of OS v2 — this filter excludes them wholesale.

**Belt-and-braces filter:** also exclude any DB whose title starts with `[ARCHIVED]`.

> **Note (2026-05-03):** This crawler-filter rule applies to *any future* workspace-discovery code. The current command-centre code path does not crawl Notion — it only queries DBs whose IDs are explicitly hardcoded in [`server/services/notion/databases.js`](../../server/services/notion/databases.js)'s `DB` object. That hardcoded list is the de-facto filter and already excludes all 10 entries above. No filter wire-up is needed today; the rule above is preserved here as the contract for any future crawler.

---

## 2. Cross-DB Relation Graph

```
                  ┌──────────────────┐
                  │  Focus Areas (4) │◄────────┐
                  └────────▲─────────┘         │
                           │ relations         │
                           │                   │
       ┌──────────────┐    │    ┌───────────┐  │
       │ Audiences (5)│◄───┼────┤Campaigns(6)├──┘
       └──────▲───────┘    │    └─────▲─────┘
              │            │          │ ┌──────────────┐
              └────────────┼──────────┼─┤Sequences (8) │
                           │          │ └──────────────┘
                  ┌────────┴─────┐    │
                  │ Decisions(3) │◄───┘─────┐
                  └──────▲───────┘          │
                         │                  │
                  ┌──────┴───────┐    ┌─────┴───────┐
                  │ Sessions (9) │    │ Projects (1)│
                  └──────────────┘    └─────────────┘
                         ▲
                         │
                  ┌──────┴──────────────┐
                  │ Commitments (2)     │
                  └─────────────────────┘

  IG playbook layer (new):

  ┌─────────────────────┐         ┌──────────────────┐
  │ Content Calendar (7)│◄────────┤ IG Performance(14)│  1-to-1
  └────┬────────┬───────┘         └────────▲─────────┘
       │        │                          │
       │        │   ┌────────────┐         │
       │        └──►│ Approvals  │         │ rollups via CC
       │            │  Log (12)  │         │ (Pillar / Hook
       │            └────────────┘         │  Pattern / Format)
       │
       │       ┌──────────────────┐
       ├──────►│ Hook Pattern (10)│
       │       └──────────────────┘
       │
       │       ┌──────────────────┐
       └──────►│ Template Lib (11)│
               └──────────────────┘

           ┌──────────────────┐    ┌──────────────┐
           │ Weekly Ops Log(13)├───►│ Decisions (3)│
           └──────────────────┘    └──────────────┘
```

---

## 3. Schema — Existing DBs (added/changed properties only)

These DBs existed before 2026-05-02. Only delta is shown. For complete pre-existing schemas, query each `data_source_id` directly — they haven't been altered destructively.

### 3.1 Content Calendar — 4 properties added

| Property | Type | Options | Used by |
|---|---|---|---|
| `Pillar (IG)` | Select | `Permission`, `Napkin`, `In-the-Wild`, `Craft`, `Educational` | Rolled up by IG Performance.Pillar. Leave null on non-IG content. |
| `Hook Pattern` | Select | `Permission`, `Reframe`, `Anti-claim`, `Tribe-name`, `Question` | Rolled up by IG Performance.Hook Pattern. Plus filterable for hook-pattern win-rate slicing. |
| `Published Slot` | Select | 11 slots: `Mon 1PM`, `Mon 8:30PM`, `Tue 1PM`, `Tue 8:30PM`, `Wed 1PM`, `Wed 8:30PM`, `Fri 1PM`, `Fri 8:30PM`, `Sat 11AM`, `Sat 8:30PM`, `Sun 8:30PM` | IG-specific publishing slot. |

Plus 3 auto-created back-relations from new DBs:
- `Hook Pattern Ref` (Relation → Hook Pattern Log)
- `Template` (Relation → Template Library)
- `Approvals` (Relation → Approvals Log)
- `IG Performance` (Relation → IG Performance)

### 3.2 Decisions — 1 relation added

| Property | Type | Target | Used by |
|---|---|---|---|
| `Campaign` | Relation (DUAL) | Campaigns DB | Closes the loop so campaign retrospectives can pull governing decisions. |

Auto-created back-relation on Campaigns: `Decisions`.

### 3.3 Campaigns — Owner select expanded

`Owner` enum now includes:
`Emily`, `Kasim`, `Jessica`, `Rory`, `Pulse`, `Evergreen`, `Closer`, `Wire`, `Nik`

(Was: Emily/Kasim/Jessica/Rory/Pulse only. Added Evergreen, Closer, Wire, Nik so all leads can be assigned.)

---

## 4. Schema — New DBs (5)

### 4.1 IG Performance (`5959753f-b4ff-4b7a-9d16-c4e1ec46a811`)

One row per published IG feed post. North-star measurement DB per IG Playbook §3.4.

| Property | Type | Notes |
|---|---|---|
| `Post` | Title | Format: `YYYY-MM-DD — [pillar] — [hook first 5 words]` |
| `Content Calendar` | Relation (DUAL → CC) | One-to-one link. Load-bearing — all rollups depend on it. |
| `Pillar` | Rollup (`Content Calendar` → `Pillar (IG)`, `show_original`) | Auto |
| `Hook Pattern` | Rollup (`Content Calendar` → `Hook Pattern`, `show_original`) | Auto |
| `Format` | Rollup (`Content Calendar` → `Content Type`, `show_original`) | Auto |
| `Published Date` | Date | IST |
| `Published Slot` | Select (11 slots — same as CC) | |
| `Reach` | Number | Manual entry from Meta Business Suite |
| `Saves` | Number | Manual |
| `Shares` | Number | Manual |
| `Likes` | Number | Manual (Tier 3, light) |
| `Comments` | Number | Manual (Tier 3, light) |
| `Profile Visits Attributed` | Number | Manual (Tier 3) |
| `Link Clicks` | Number | Manual |
| `SWPS` | Formula | `if(prop("Reach") == 0, 0, (prop("Saves") + 2 * prop("Shares")) / prop("Reach"))` |
| `Hit Target` | Formula | `if(prop("Reach") == 0, false, (prop("Saves") + 2 * prop("Shares")) / prop("Reach") >= 0.035)` ⚠ inlined — see § Formula caveats |
| `Week Of` | Formula | `formatDate(prop("Published Date"), "YYYY-MM-DD")` ⚠ flat date — see § Formula caveats |
| `Ad Candidate` | Checkbox | Emily flags Friday if Hit Target=true and hook is ad-compatible |
| `Graduated to Ads` | Checkbox | Kasim ticks when hook ships to a live ad group (closes the loop) |
| `Learning Note` | Rich text | Optional — one line from Jessica when post is an outlier |
| `Entered By` | Person | Default Corey |
| `Entered On` | Last edited time | Auto, for pulse latency checks |

### 4.2 Hook Pattern Log (`3a32a0ae-a45b-4537-b73e-76015c8ec9e0`)

| Property | Type | Notes |
|---|---|---|
| `Pattern Name` | Title | e.g., `Permission` |
| `Pattern Type` | Select | `Foundational` (one of 5 from §2.3), `Variant`, `Experimental` |
| `Description` | Rich text | What it is, when it works |
| `Example Hook` | Rich text | Best-in-class instance |
| `Reverse Pattern` | Rich text | What this pattern is NOT (the boundary) |
| `Status` | Select | `Active`, `Testing`, `Retired` |
| `Posts Using` | Relation (DUAL → CC) | Back-relation on CC = `Hook Pattern Ref` |
| `Notes` | Rich text | |

### 4.3 Template Library (`ff498859-fead-4048-b9d6-ea250b4ffc19`)

| Property | Type | Notes |
|---|---|---|
| `Template Name` | Title | |
| `Template Type` | Select | `Carousel`, `Reel`, `Single`, `Story` |
| `Pillar (IG)` | Select (5 pillars) | |
| `Status` | Select | `Active`, `WIP`, `Retired` |
| `Frame Count` | Number | for carousels |
| `Asset Link` | URL | Figma/Canva |
| `Brand-Code Notes` | Rich text | Brand codes in use |
| `Last Used` | Date | |
| `Posts Using` | Relation (DUAL → CC) | Back-relation on CC = `Template` |
| `Notes` | Rich text | |

### 4.4 Approvals Log (`352b4779-a937-42e5-9553-f9247317ed94`)

| Property | Type | Notes |
|---|---|---|
| `Item` | Title | e.g., `2026-04-13 Permission carousel #1` |
| `Content Calendar` | Relation (DUAL → CC) | Back-relation on CC = `Approvals` |
| `Reviewer` | Select | `Brand Editor`, `Jessica (self)`, `Dan` |
| `Verdict` | Select | `Approved`, `Revision`, `Killed` |
| `Reason` | Rich text | |
| `Litmus check` | Checkbox | Pune 23-yr-old screenshot test passed |
| `Banned-words check` | Checkbox | No banned terms or `YDS` |
| `No-fake-UGC check` | Checkbox | In-the-Wild posts pass honesty test |
| `Decided At` | Date (datetime) | |
| `Revision Round` | Number | 1 or 2; Revision at round 2 triggers two-revision-kill rule |

### 4.5 Weekly Ops Log (`450968bb-4a50-42d4-bab2-590d99b3d03d`)

| Property | Type | Notes |
|---|---|---|
| `Week Of` | Title | Format: `YYYY-WW` |
| `Week Start Date` | Date | Monday of the week |
| `Posts Shipped` | Number | |
| `Pillar Balance` | Rich text | Format: `P:2 N:1 W:1 C:1 E:1` |
| `Weekly SWPS` | Number (percent) | Rolled up from IG Performance — manually entered v1, automated v2 |
| `Hook Graduation Count` | Number | |
| `Email Captures (IG bio)` | Number | |
| `Pipeline Health` | Rich text | "5/6 on time, 1 slip" |
| `Insight` | Rich text | Emily's 1-sentence observation |
| `Question for Dan` | Rich text | |
| `Status` | Select | `Draft`, `Sent`, `Manual fallback` |
| `Sent At` | Date | |
| `Decisions Triggered` | Relation (DUAL → Decisions) | Back-relation on Decisions = `Weekly Ops Log` |

---

## 5. Formula caveats (read this before refactoring)

Notion formula 2.0 has limits we hit during creation. Documented here so future-you doesn't re-debug.

### 5.1 ⚠ `prop("SWPS") >= 0.035` does NOT work as a separate Hit Target formula

Notion 2.0 errors with `Type error with formula` when one formula references another formula property via `prop()` in a comparison. **Workaround:** inline the SWPS calculation inside Hit Target, repeated. Both formulas now do the same math.

If you ever rename the SWPS formula, update Hit Target's inlined version too.

### 5.2 ⚠ ISO week format is not supported in `formatDate`

The IG Playbook §3.4 spec calls for `Week Of = formatDate(prop("Published Date"), "YYYY-WW")`. Notion's `formatDate` doesn't accept `WW` (ISO week). It also has no `week()` date function. **Workaround:** `Week Of` is currently a flat date string (`YYYY-MM-DD`).

For week grouping in views, use Notion's built-in **Group by** filter on the `Published Date` property with `Week` granularity. The Week Of formula is decorative until/unless Notion ships ISO-week support.

### 5.3 ⚠ Number-format on a formula that returns mixed types

`SWPS` formula returns `0` (integer) when Reach is 0, otherwise a fraction. Notion infers number type and applies "Number" formatting. To display as percent in the Notion UI, set the formula property's display format manually to **Percent** (one click in property settings — can't be set via DDL).

---

## 6. Required Automations (6)

Tech needs to wire these. Order by priority — A1 unblocks daily ops; A6 is nice-to-have.

| # | Trigger | Action | Priority |
|---|---|---|---|
| **A1** | CC.Status changes to `Published` | Create IG Performance row with: Post title autogen (`{date} — {pillar} — {hook[:5]}`), Content Calendar relation set to triggering CC row, Published Date copied, Published Slot copied, Entered By = Corey | P0 — manual entry without this is too painful |
| **A2** | CC.Brand Review Status changes to `Approved` or `Revision` | Create Approvals Log row: Item = CC.Title, Content Calendar = relation, Reviewer = `Brand Editor`, Verdict copied, Decided At = now, Revision Round = increment if exists | P0 — required for two-revision kill rule |
| **A3** | Friday 5:00 PM IST cron | Generate Weekly Ops Log row for current ISO week. Pull Posts Shipped + Pillar Balance from CC.Status=`Published` AND Pillar (IG) is set. Roll up Weekly SWPS from IG Performance.SWPS where Week Of in current week. Set Status=`Draft` until Emily confirms. | P0 — north-star metric tracking |
| **A4** | CC.Pillar (IG) is set + CC.Hook Pattern is set | Find matching Hook Pattern Log row by `Pattern Name == CC.Hook Pattern`. Populate CC.Hook Pattern Ref with that page. (Manual fallback if no match: leave null, surface in weekly review.) | P1 — auto-link pattern catalog |
| **A5** | IG Performance.Hit Target = true AND Ad Candidate not yet flagged AND >= 7 days old | Slack/email Emily: "Ad candidate ready: {Post}. SWPS = {SWPS}". She manually checks Ad Candidate. | P1 — closes ad-handoff loop without polling |
| **A6** | IG Performance.Graduated to Ads = true | Update related Hook Pattern Log row's Notes with "{date}: graduated to Kasim's {ad group}". Close-the-loop tracking. | P2 — pattern-level learning trail |

**Implementation pattern:** Notion webhook → command-centre `/api/marketing/notion-event` endpoint → handler dispatches by trigger property. Auth via existing `NOTION_TOKEN` (read-write). Write through `notion-local` MCP for property updates, or direct Notion API.

---

## 7. Env Vars to Add

Add to `.env`:

```
# IG playbook v1 DBs (created 2026-05-02)
IG_PERFORMANCE_DB_ID=5959753f-b4ff-4b7a-9d16-c4e1ec46a811
HOOK_PATTERN_LOG_DB_ID=3a32a0ae-a45b-4537-b73e-76015c8ec9e0
TEMPLATE_LIBRARY_DB_ID=ff498859-fead-4048-b9d6-ea250b4ffc19
APPROVALS_LOG_DB_ID=352b4779-a937-42e5-9553-f9247317ed94
WEEKLY_OPS_LOG_DB_ID=450968bb-4a50-42d4-bab2-590d99b3d03d
```

The 9 pre-existing marketing DBs are already accessible via the marketing-team `notion-local` MCP. You don't need env vars for those unless command-centre code needs to read/write them directly (currently it doesn't).

For the MCC Posts DB env var (`MCC_POSTS_DB_ID`) — see [mcc/POSTS-DB.md](mcc/POSTS-DB.md).

For Vercel deployment, add the same 5 vars to the project's environment.

---

## 8. Property name → API path cheat sheet

Notion API filter format examples for the 3 most common reads command-centre will do.

### 8.1 IG Performance — current week SWPS

```json
{
  "data_source_id": "5959753f-b4ff-4b7a-9d16-c4e1ec46a811",
  "filter": {"and": [
    {"property": "Published Date", "date": {"on_or_after": "2026-04-13"}},
    {"property": "Published Date", "date": {"on_or_before": "2026-04-19"}}
  ]},
  "sorts": [{"property": "Published Date", "direction": "descending"}],
  "page_size": 20
}
```

Extract SWPS: `properties.SWPS.formula.number` (formula returns number type).

### 8.2 IG Performance — ad candidates not yet graduated

```json
{
  "data_source_id": "5959753f-b4ff-4b7a-9d16-c4e1ec46a811",
  "filter": {"and": [
    {"property": "Ad Candidate", "checkbox": {"equals": true}},
    {"property": "Graduated to Ads", "checkbox": {"equals": false}}
  ]}
}
```

### 8.3 Approvals Log — failed-twice posts (two-revision kill rule trigger)

```json
{
  "data_source_id": "352b4779-a937-42e5-9553-f9247317ed94",
  "filter": {"and": [
    {"property": "Verdict", "select": {"equals": "Revision"}},
    {"property": "Revision Round", "number": {"equals": 2}}
  ]}
}
```

When this returns rows, the related CC row should be auto-killed (or surfaced to Jessica for kill-or-rescue decision).

---

## 9. Tech Setup Checklist

- [ ] Notion integration has access to `YDS Marketing Hub` (page `323247aa-0d7b-81a5-b85d-ce421c959f3b`). All 5 new DBs inherit access. Verify by fetching one IG Performance row via API.
- [ ] Add 5 env vars (§ 7) to `.env` and Vercel environment
- [ ] Update `.claude/docs/notion-hub.md` with rows for the 5 new DBs (so agents discover them when triaging)
- [ ] Run `npm run agent-primer` (or `npm run build`) to regenerate `AGENT_PRIMER.md`
- [ ] Wire automation A1 (CC `Published` → IG Performance row) — P0
- [ ] Wire automation A2 (CC Brand Review verdict → Approvals Log row) — P0
- [ ] Wire automation A3 (Friday cron → Weekly Ops Log row) — P0
- [ ] Wire automation A4 (CC Pillar+Hook → auto-link Hook Pattern Log) — P1
- [ ] Wire automation A5 (Ad candidate alert) — P1
- [ ] Wire automation A6 (Graduated to Ads → Hook Pattern notes) — P2
- [ ] Manually delete or filter `EXAMPLE` seed rows in each new DB before going live
- [ ] In Notion UI: set `IG Performance.SWPS` display format to `Percent`
- [ ] In Notion UI: build the 5 views Emily specified for IG Performance — `This Week`, `Ad Candidates`, `By Pillar`, `Rolling 30-day`, `Misses` (filter specs in IG Playbook §3.4)

---

## 10. Source Documents

- **IG Playbook §3 (Ops & Measurement):** `YDS - marketing-team/workspace/playbooks/drafts/ig-playbook-s3-ops-measurement.md` — authoritative spec for SWPS, 3-tier metrics, approval gate, 60-day milestones, and the IG Performance schema.
- **MCC code path:** [mcc/POSTS-DB.md](mcc/POSTS-DB.md), [mcc/ARCHITECTURE.md](mcc/ARCHITECTURE.md), [mcc/API.md](mcc/API.md), [mcc/SETUP.md](mcc/SETUP.md), [mcc/USER_GUIDE.md](mcc/USER_GUIDE.md). Independent of this doc — MCC reads/writes its own DB by env var.
- **Marketing-team agent rules:** `YDS - marketing-team/CLAUDE.md` and `YDS - marketing-team/.claude/rules/notion.md` — reference for Notion MCP routing rules used by marketing agents.

---

## 11. Future channels — placeholder

When Ads / Lifecycle / Site CRO need their own DB layer, create a sibling subfolder under `docs/marketing/` (e.g., `docs/marketing/ads/`, `docs/marketing/lifecycle/`) and update §1 inventory + §2 graph here. Keep this top-level doc as the index; don't grow it past ~500 lines.

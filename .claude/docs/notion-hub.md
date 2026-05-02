# Notion Hub — Command Centre Data Layer

**Scope:** Full YDS operating system. All databases, all focus areas, all team members.

---

## DATABASE MAP

| Database | ID | Data Source ID | COS Use |
|---|---|---|---|
| Focus Areas | 274fc2b3b6f7430fbb27474320eb0f96 | 66ca7a48-f238-481f-a794-8353222b1b84 | Health checks, strategic tracking |
| Projects | 85c1b29205634f43b50dc16fc7466faa | 1ae0f102-2c16-401f-b2a4-1eee6b993ab1 | Mission briefs, initiative tracking |
| Commitments | 0b50073e544942aab1099fc559b390fb | 71914093-29c0-492f-bab3-5e493a5c7173 | Task tracking, accountability |
| People | de346469925e4d1a825a849bc9f5269f | ec930f9a-add8-4418-b7bb-78199f774b3d | Assignment, routing |
| Decisions | 3c8a9b22ba924f20bfdcab4cc7a46478 | 158108d0-623d-4dda-8e5c-2f6ade2597be | Decision logging |
| Platforms | 1fcf264fd2cd4308bcfd28997d171360 | 0e7a29d5-e583-44fd-a7bf-78c12af0b670 | System tracking |
| Audiences | 63ec25cae3b0432093fa639d4c8b5809 | 97e9f674-484e-4117-ba18-4357e12879a1 | Segment targeting |
| Campaigns | 9f5f3da620e64bf0bceef7f9a3465925 | 9f5f3da6-20e6-4bf0-bcee-f7f9a3465925 | Marketing campaign tracking |
| Content Calendar | 227f3365feab476e88791f2a4d0a72b9 | 227f3365-feab-476e-8879-1f2a4d0a72b9 | Content scheduling & status |
| Sequences | e580d12cac8c43bd890176fc0985518e | e580d12c-ac8c-43bd-8901-76fc0985518e | Email/automation sequences |
| Sessions Log | dffaf6eb216444858981203915991c22 | dffaf6eb-2164-4485-8981-203915991c22 | Session tracking & analytics |
| Sprint Board (Tech) | 2c459dc96d804bce913547e02b78776c | 2c459dc9-6d80-4bce-9135-47e02b78776c | Tech sprint items, bugs, tasks |
| Spec Library | 5be6d7cf5607407cbca010b422bceb7e | 5be6d7cf-5607-407c-bca0-10b422bceb7e | Technical specification pipeline |
| Tech Decision Log | 1f9193d41ac3409484d2d0ae1442c95b | 1f9193d4-1ac3-4094-84d2-d0ae1442c95b | Technical decision records |
| Sprint Archive | 9ba8330aa3c044d195b27eb450e278f2 | 9ba8330a-a3c0-44d1-95b2-7eb450e278f2 | Sprint velocity history |
| AI Team | 17f15cb3920948fb9721a776bbbcc6ea | 1c3600b0-b9cb-45f5-8687-fc41cbe30301 | AI agent roster & capabilities |
| Marketing Tasks | 1fa22f26f31842439dba9788e08ca413 | b44daab1-c281-4e88-8ea4-6e9371370c28 | Marketing action items & assignments |
| Tech Backlog | 4bb401d876dd4068851784c5cdb06363 | e5a12af5-9f92-4a9e-ac7c-aac006f5ef6c | Tech backlog items |
| IG Performance | 21476f909d334661b2f69ec825162ba6 | 5959753f-b4ff-4b7a-9d16-c4e1ec46a811 | IG north-star measurement (SWPS, ad candidates, hit-target gating) |
| Hook Pattern Log | 3d71c78ef5664312bc70d7d72a3cd5a1 | 3a32a0ae-a45b-4537-b73e-76015c8ec9e0 | Catalog of IG hook patterns w/ Active/Testing/Retired status |
| Template Library | 10996869d1e249fdb01d16085f908015 | ff498859-fead-4048-b9d6-ea250b4ffc19 | Reusable carousel/reel/single/story templates by pillar |
| Approvals Log | e305be59e4484d5e899fd4aeb636a7d9 | 352b4779-a937-42e5-9553-f9247317ed94 | Append-only Brand Editor decisions log + 2-revision-kill trigger |
| Weekly Ops Log | 24e5ae2db9f64f38b11ac7beee4f0357 | 450968bb-4a50-42d4-bab2-590d99b3d03d | Friday IG pulse rollup feeding Decisions DB |

**Future Databases** (IDs TBD — Nirmal to create)
- Agent Registry — AI agent configuration and capabilities
- Skills Registry — Skill definitions and triggers
- Human Team — Team member details and expertise matrix

---

## TECH TEAM DATABASES

### Sprint Board (Tech)
Database ID: `2c459dc96d804bce913547e02b78776c`

**Purpose:** Track tech sprint work items (bugs, features, tasks, spikes, chores)

**Key Properties:**
| Property | Type | Values |
|---|---|---|
| Name | title | Item title |
| Type | select | Bug, Feature, Task, Spike, Chore |
| Status | select | Backlog, In Progress, Blocked, Done, Cancelled |
| Priority | select | Critical, High, Medium, Low |
| System | select | API, Frontend, Infrastructure, Security, Data, DevOps |
| Sprint | relation | Current/upcoming sprint |
| Assigned To | relation | Team member |
| Horizon | select | Current Sprint, Next Sprint, Future |
| Waiting On | text | Blocker description |
| Points | number | Story points estimate |
| Labels | multi_select | Custom tags |

### Spec Library
Database ID: `5be6d7cf5607407cbca010b422bceb7e`

**Purpose:** Track technical specifications through pipeline (proposed → approved → implemented)

**Key Properties:**
| Property | Type | Values |
|---|---|---|
| Name | title | Spec title |
| Status | select | Proposed, Under Review, Approved, In Development, Implemented, Deprecated |
| Type | select | API, Database, Architecture, Infrastructure, Integration |
| Owner | relation | Spec author |
| Related Sprint Item | relation | Linked to sprint board |
| Summary | text | Brief description |
| Acceptance Criteria | text | What "done" looks like |

### Tech Decision Log
Database ID: `1f9193d41ac3409484d2d0ae1442c95b`

**Purpose:** Record technical decisions with context and rationale

**Key Properties:**
| Property | Type | Values |
|---|---|---|
| Name | title | Decision title |
| Date | date | When decided |
| Status | select | Proposed, Approved, Implemented, Superseded, Rejected |
| Owner | relation | Decision maker |
| Context | text | Why this decision was needed |
| Decision | text | What was decided |
| Rationale | text | Technical reasoning |
| Alternatives Considered | text | Other options evaluated |
| Risks | text | Known risks or tradeoffs |
| Sprint Impact | relation | Related sprint item |

### Sprint Archive
Database ID: `9ba8330aa3c044d195b27eb450e278f2`

**Purpose:** Historical record of completed sprints for velocity tracking and retrospectives

**Key Properties:**
| Property | Type | Values |
|---|---|---|
| Sprint Number | number | Sequence identifier |
| Start Date | date | Sprint start |
| End Date | date | Sprint end |
| Planned Items | number | Items planned in sprint |
| Completed Items | number | Items actually completed |
| Velocity | number | Completed story points |
| Team Notes | text | Retrospective notes |
| Focus | text | Sprint theme/goals |

### Tech Backlog
**DB ID:** `4bb401d876dd4068851784c5cdb06363` | **Verified:** 2026-03-21 via Notion MCP

**Purpose:** Backlog of tech work items waiting to be pulled into sprints. Schema to be fully documented after first data load.

---

## PEOPLE IDS — Full Team

### Real Humans (assign Commitments to these)
| Person | Function | Page ID | Role |
|---|---|---|---|
| Dan | Leadership | 307247aa0d7b81318999e80042f45d6a | CEO/CMO |
| Arun Nair | Sales/Ops | *fetch to confirm* | Co-founder, Supply & Operations |
| Ashwini | Customer Success | 307247aa0d7b81838d89e8b94f29f9b2 | Dropship CS, events |
| Muskan | Operations | 307247aa0d7b81899fedefda38e38554 | B2C CS, coworking |
| Chandan | Operations | *fetch to confirm* | B2B sales, POC leads |
| Nirmal | Tech | 307247aa0d7b8186847deaa52ef7f55c | Technology |
| Bimal | Design | 307247aa0d7b81c4b9e5c0f5eacf579a | Design |
| Surath | Operations | *fetch to confirm* | Production |
| Janak | Operations | *fetch to confirm* | Operations |
| Diwakar | Design | 307247aa0d7b81188c9ee3a526dbacff | Design support |
| Gowri | Operations | *fetch to confirm* | Operations |

### AI Expert Panel (link to Projects, NOT Commitments)
| Expert | Page ID |
|---|---|
| Colin (Chief of Staff) | 308247aa0d7b8185b2c1d2b738aee402 |
| Rory (Behavioral) | 308247aa0d7b81c1948cf999fd8e3dcf |
| JW / Jessica (Creative) | 308247aa0d7b81b1a1fdfd6569d9b202 |
| Copy Lead / Harry | 308247aa0d7b810f8322f160169f2344 |
| Tech Advisor | 308247aa0d7b811fa554f1a77b7e20bc |

### AI Team Database
**DB ID:** `17f15cb3920948fb9721a776bbbcc6ea` | **Verified:** 2026-03-21 via Notion MCP

| Property | Type | Options / Notes |
|---|---|---|
| Name | title | Agent name |
| Function | select | Strategy & Ops, Marketing & Growth, Sales & Revenue, Product & Tech, Brand & Creative, Operations |
| Status | select | Active, Building, Planned |
| Tier | select | Core Team, Specialist Tool, Personal, Archived |
| Persona | text | Agent personality/role description |
| Scope | text | What the agent handles |
| Operating Rhythm | text | How often/when agent operates |
| Knowledge Loaded | text | What knowledge the agent has |
| Escalation Rules | text | When to escalate to human |
| Tools Connected | text | List of connected tools |
| Project Link | url | Link to agent project |
| Notebook llm | url | NotebookLM link |
| Focus Areas | relation | → Focus Areas DB |
| Human Counterpart | relation | → People DB |
| Platforms | relation | → Platforms DB |
| Audiences | relation | → Audiences DB |

---

## AUDIENCE IDS

| Segment | Page ID | When to Tag |
|---|---|---|
| B2C (Direct Consumers) | 307247aa0d7b81cf82ddcb6193513241 | D2C initiatives |
| Corporate / Bulk (B2B) | 307247aa0d7b8162bbafe4c5395406b6 | Corporate / bulk work |
| Dropship Partners | 307247aa0d7b817bb6e9cd3a843f2161 | Partner initiatives |
| Store - Sellers / Vendors | 307247aa0d7b8169bb69ece096d69d1a | Marketplace sellers |
| Internal Team | 307247aa0d7b8162b190f0f74cc3f7c2 | Internal ops, training |

---

## KEY NOTION PAGES

| Page | ID | Purpose |
|---|---|---|
| Business Bible | 307247aa0d7b8039bf78d35962815014 | Full business context |
| Notion OS Root | 307247aa0d7b8102bfa0f8a18d8809d9 | System root page |
| Team Operating Manual | 308247aa0d7b81cea80dca287155b137 | How teams interact with system |
| Marketing Context Pack | 315247aa0d7b81c59fddf518c01e8556 | Marketing-specific context |

---

## COMMON OPERATIONS

### 1. Create a Commitment (Human Task)
```json
{
  "parent": {"data_source_id": "71914093-29c0-492f-bab3-5e493a5c7173"},
  "pages": [{
    "properties": {
      "Name": "[Clear task description]",
      "Status": "Not Started",
      "Priority": "High",
      "Source": "Claude Session",
      "Type": "Deliverable",
      "date:Due Date:start": "2026-03-07",
      "date:Due Date:is_datetime": 0,
      "Assigned To": "[\"https://www.notion.so/PERSON_PAGE_ID\"]",
      "Project": "[\"https://www.notion.so/PROJECT_ID\"]",
      "Focus Area": "[\"https://www.notion.so/FOCUS_AREA_ID\"]",
      "Notes": "Brief context"
    }
  }]
}
```

### 2. Log a Decision
```json
{
  "parent": {"data_source_id": "158108d0-623d-4dda-8e5c-2f6ade2597be"},
  "pages": [{
    "properties": {
      "Name": "[Decision title — what was decided]",
      "date:Date:start": "2026-03-02",
      "date:Date:is_datetime": 0,
      "Owner": "Dan",
      "Context": "[What triggered this decision]",
      "Decision": "[What was actually decided]",
      "Rationale": "[Dan's specific reasoning]",
      "Alternatives Considered": "[What else and why not]",
      "Risks Accepted": "[Honest assessment]",
      "Focus Area": "[\"https://www.notion.so/FOCUS_AREA_ID\"]"
    }
  }]
}
```

### 3. Create a Project (Mission Brief / Initiative)
```json
{
  "parent": {"data_source_id": "1ae0f102-2c16-401f-b2a4-1eee6b993ab1"},
  "pages": [{
    "properties": {
      "Name": "[Project name]",
      "Status": "Active",
      "Type": "Mission Brief",
      "Owner": "[\"https://www.notion.so/PERSON_PAGE_ID\"]",
      "Focus Area": "[\"https://www.notion.so/FOCUS_AREA_ID\"]",
      "AI Expert Panel": "[\"https://www.notion.so/EXPERT_ID_1\", \"https://www.notion.so/EXPERT_ID_2\"]"
    }
  }]
}
```

### 4. Update a Page (Surgical Edit)
```json
{
  "command": "replace_content_range",
  "page_id": "PAGE_ID",
  "selection_with_ellipsis": "[existing text to match]",
  "new_str": "[replacement text]"
}
```

---

## PROPERTY REFERENCE

### Project Properties
| Property | Type | Values |
|---|---|---|
| Name | title | Project name |
| Status | select | Active, Done, On Hold, Cancelled |
| Type | select | Mission Brief, Initiative, Experiment |
| Owner | relation → People | One human |
| Focus Area | relation → Focus Areas | One area |
| AI Expert Panel | relation → People | Multiple AI experts |

### Commitment Properties
| Property | Type | Values |
|---|---|---|
| Name | title | Task description |
| Status | select | Not Started, In Progress, Blocked, Done, Cancelled |
| Priority | select | Urgent, High, Medium, Low |
| Assigned To | relation → People | One human (NEVER an AI) |
| Due Date | date | Use expanded format |
| Type | select | Deliverable, Decision Needed, Follow-up, Handoff, Blocker Resolution |
| Project | relation → Projects | Link to project |
| Focus Area | relation → Focus Areas | Same as project's |
| Source | select | Claude Session (always for agent-generated) |
| Audiences | relation → Audiences | Which segment |
| Notes | text | Brief context |

### Decision Properties
| Property | Type | Values |
|---|---|---|
| Name | title | Decision title |
| Date | date | When decided |
| Owner | text | Dan / Joint / [name] |
| Context | text | What triggered this |
| Decision | text | What was decided |
| Rationale | text | Dan's reasoning |
| Alternatives Considered | text | What else and why not |
| Risks Accepted | text | Honest assessment |
| Focus Area | relation → Focus Areas | Which area |

### Campaign Properties
| Property | Type | Values |
|---|---|---|
| Name | title | Campaign name |
| Stage | select | Planning, In Execution, Launched, Completed, On Hold |
| Status | select | Active, Paused, Archived |
| Owner | relation → People | Campaign lead |
| Focus Area | relation → Focus Areas | Strategic alignment |
| Budget | number | Campaign budget |
| Audiences | relation → Audiences | Target segments |
| Launch Date | date | When campaign launches |
| Notes | text | Campaign brief/goals |

### Content Calendar Properties
**DB ID:** `227f3365feab476e88791f2a4d0a72b9` | **Verified:** 2026-03-21 via Notion MCP
**Title field is `Title` (not `Name`). Owner is a `select` (not text/relation).**

| Property | Type | Options / Notes |
|---|---|---|
| Title | title | Content piece title |
| Status | select | Idea, Briefed, Drafted, In Design, Brand Review, Approved, Scheduled, Published |
| Content Type | select | Feed Post, Carousel, Reel, Story, Email, WhatsApp, Blog |
| Content Pillar | select | Education, Social Proof, Product, Behind the Scenes, Community, Promotional |
| Owner | select | Corey, Dickie, Jessica, Pixel, Studio, Harry, Bimal |
| Publish Date | date | Scheduled publication date |
| Hook | text | Attention-grabbing headline |
| Caption / Copy | text | Social media caption |
| Visual Brief | text | Design/asset notes |
| Audience Segment | multi_select | Creative Professionals, AI Artists, Founders & Small Businesses, Curious Creators, Corporate / Bulk, Dropship Partners |
| Product Focus | multi_select | T-shirts, Hoodies, Sweatshirts, Polo, Totes, Mugs, Phone Cases, Caps |
| Campaign | relation | Campaigns DB (cff40f34-13a8-4c64-b5bf-edafeffb0b88) |
| Brand Review Status | select | Pending, Approved, Revision |
| Brand Review Notes | text | Reviewer feedback |
| Ad Repurpose | checkbox | Flag for cross-channel reuse |
| Reach | number | Performance metric |
| Engagement Rate | number | Performance metric |
| Saves | number | Performance metric |
| Shares | number | Performance metric |

**Views:** Default table, Weekly Calendar, Pipeline Board (by Status), Pillar Balance (by Content Pillar), Brand Review Queue (Status = Brand Review), Ad-Ready Content (Ad Repurpose + Brand Review Approved)

### Marketing Tasks
**DB ID:** `1fa22f26f31842439dba9788e08ca413` | **Verified:** 2026-03-21 via Notion MCP

| Property | Type | Options / Notes |
|---|---|---|
| Task | title | Task name |
| Status | select | Not Started, In Progress, Blocked, Done, Cancelled |
| Priority | select | Urgent, High, Medium, Low |
| Type | select | Deliverable, Review, Setup, Creative, Analysis, Follow-up |
| Channel | select | Google Ads, Meta Ads, Email, WhatsApp, Instagram, Website, SEO, Cross-channel |
| Assigned To | person | Team member |
| Due Date | date | Deadline |
| Campaign | relation | → Marketing Campaigns DB |
| Notes | text | Task details |
| Task ID | auto_increment_id | Auto-generated |
| Created | created_time | Auto |
| Last Edited | last_edited_time | Auto |

**Views:** Default table, Task Board (by Status), By Due Date (calendar)

### IG Performance
**DB ID:** `5959753fb4ff4b7a9d16c4e1ec46a811` | **Verified:** 2026-05-02 via Notion MCP
**Env var:** `IG_PERFORMANCE_DB_ID` | **Source spec:** [docs/marketing/NOTION-SETUP.md §4.1](../../docs/marketing/NOTION-SETUP.md)
**Purpose:** One row per published IG feed post. North-star measurement DB per IG Playbook §3.4.

| Property | Type | Options / Notes |
|---|---|---|
| Post | title | Format: `YYYY-MM-DD — [pillar] — [hook first 5 words]` |
| Content Calendar | relation | → Content Calendar (a3066b81). Load-bearing — all rollups depend on it |
| Pillar | rollup | From CC.`Pillar (IG)` (show_original) — auto |
| Hook Pattern | rollup | From CC.`Hook Pattern` (show_original) — auto |
| Format | rollup | From CC.`Content Type` (show_original) — auto |
| Published Date | date | IST |
| Published Slot | select | 11 slots: Mon 1PM/8:30PM, Tue 1PM/8:30PM, Wed 1PM/8:30PM, Fri 1PM/8:30PM, Sat 11AM/8:30PM, Sun 8:30PM |
| Reach | number | Manual entry from Meta Business Suite |
| Saves | number | Manual |
| Shares | number | Manual |
| Likes | number | Manual (Tier 3, light) |
| Comments | number | Manual (Tier 3, light) |
| Profile Visits Attributed | number | Manual (Tier 3) |
| Link Clicks | number | Manual |
| SWPS | formula | `if(Reach == 0, 0, (Saves + 2*Shares) / Reach)` — display as Percent in UI |
| Hit Target | formula | Inlined SWPS calc, returns true if SWPS >= 0.035. Inlined because Notion 2.0 errors on cross-formula prop refs |
| Week Of | formula | `formatDate(Published Date, "YYYY-MM-DD")` — flat date; ISO-WW not supported |
| Ad Candidate | checkbox | Emily flags Friday if Hit Target=true and hook is ad-compatible |
| Graduated to Ads | checkbox | Kasim ticks when hook ships to a live ad group |
| Learning Note | text | Optional — one line from Jessica when post is an outlier |
| Entered By | person | Default Corey |
| Entered On | last_edited_time | Auto, for pulse latency checks |

### Hook Pattern Log
**DB ID:** `3a32a0aea45b4537b73e76015c8ec9e0` | **Verified:** 2026-05-02 via Notion MCP
**Env var:** `HOOK_PATTERN_LOG_DB_ID` | **Source spec:** [docs/marketing/NOTION-SETUP.md §4.2](../../docs/marketing/NOTION-SETUP.md)

| Property | Type | Options / Notes |
|---|---|---|
| Pattern Name | title | e.g., `Permission` |
| Pattern Type | select | Foundational, Variant, Experimental |
| Description | text | What it is, when it works |
| Example Hook | text | Best-in-class instance |
| Reverse Pattern | text | What this pattern is NOT (the boundary) |
| Status | select | Active, Testing, Retired |
| Posts Using | relation | → Content Calendar (back-rel: `Hook Pattern Ref`) |
| Notes | text | |

### Template Library
**DB ID:** `ff498859fead4048b9d6ea250b4ffc19` | **Verified:** 2026-05-02 via Notion MCP
**Env var:** `TEMPLATE_LIBRARY_DB_ID` | **Source spec:** [docs/marketing/NOTION-SETUP.md §4.3](../../docs/marketing/NOTION-SETUP.md)

| Property | Type | Options / Notes |
|---|---|---|
| Template Name | title | |
| Template Type | select | Carousel, Reel, Single, Story |
| Pillar (IG) | select | Permission, Napkin, In-the-Wild, Craft, Educational |
| Status | select | Active, WIP, Retired |
| Frame Count | number | for carousels |
| Asset Link | url | Figma/Canva |
| Brand-Code Notes | text | Brand codes in use |
| Last Used | date | |
| Posts Using | relation | → Content Calendar (back-rel: `Template`) |
| Notes | text | |

### Approvals Log
**DB ID:** `352b4779a93742e59553f9247317ed94` | **Verified:** 2026-05-02 via Notion MCP
**Env var:** `APPROVALS_LOG_DB_ID` | **Source spec:** [docs/marketing/NOTION-SETUP.md §4.4](../../docs/marketing/NOTION-SETUP.md)

| Property | Type | Options / Notes |
|---|---|---|
| Item | title | e.g., `2026-04-13 Permission carousel #1` |
| Content Calendar | relation | → Content Calendar (back-rel: `Approvals`) |
| Reviewer | select | Brand Editor, Jessica (self), Dan |
| Verdict | select | Approved, Revision, Killed |
| Reason | text | |
| Litmus check | checkbox | Pune 23-yr-old screenshot test passed |
| Banned-words check | checkbox | No banned terms or `YDS` |
| No-fake-UGC check | checkbox | In-the-Wild posts pass honesty test |
| Decided At | date (datetime) | |
| Revision Round | number | 1 or 2; Revision at round 2 triggers two-revision-kill rule |

### Weekly Ops Log
**DB ID:** `450968bb4a5042d4bab2590d99b3d03d` | **Verified:** 2026-05-02 via Notion MCP
**Env var:** `WEEKLY_OPS_LOG_DB_ID` | **Source spec:** [docs/marketing/NOTION-SETUP.md §4.5](../../docs/marketing/NOTION-SETUP.md)

| Property | Type | Options / Notes |
|---|---|---|
| Week Of | title | Format: `YYYY-WW` |
| Week Start Date | date | Monday of the week |
| Posts Shipped | number | |
| Pillar Balance | text | Format: `P:2 N:1 W:1 C:1 E:1` |
| Weekly SWPS | number (percent) | Rolled up from IG Performance — manually entered v1, automated v2 |
| Hook Graduation Count | number | |
| Email Captures (IG bio) | number | |
| Pipeline Health | text | "5/6 on time, 1 slip" |
| Insight | text | Emily's 1-sentence observation |
| Question for Dan | text | |
| Status | select | Draft, Sent, Manual fallback |
| Sent At | date | |
| Decisions Triggered | relation | → Decisions DB (back-rel: `Weekly Ops Log`) |

### Sequence Properties
| Property | Type | Values |
|---|---|---|
| Name | title | Sequence name |
| Journey Stage | select | Awareness, Consideration, Decision, Retention, Advocacy |
| Type | select | Email Nurture, Onboarding, Re-engagement, Upsell |
| Status | select | Active, Paused, Archived |
| Health | select | Good, At Risk, Needs Review |
| Owner | relation → People | Sequence owner |
| Email Count | number | Number of emails in sequence |
| Avg Open Rate | number | Performance metric (%) |
| Avg Click Rate | number | Performance metric (%) |
| Last Updated | date | Most recent edit date |

### Session Properties
| Property | Type | Values |
|---|---|---|
| Name | title | Session title / event |
| Date | date | When session occurred |
| Duration | number | Minutes |
| Attendees | number | Participant count |
| Type | select | Workshop, Training, Demo, Webinar, Sync, Feedback |
| Owner | relation → People | Session facilitator |
| Notes | text | Key discussion points / outcomes |
| Recording | url | Link to recording if available |

---

## FORMAT RULES

### Date Format (always use this)
```
"date:Due Date:start": "2026-03-07"
"date:Due Date:is_datetime": 0
```

### Relation Format (always use this)
```
"Assigned To": "[\"https://www.notion.so/PAGE_ID_NO_DASHES\"]"
```

---

## SAFETY RULES

1. **Dan approves before any write.** Recommend, confirm, then write.
2. **Search before creating.** Always check if entry already exists.
3. **Never overwrite blindly.** Read current state first, then surgical edit.
4. **Never delete.** Use Cancelled/Done status.
5. **Commitments go to REAL HUMANS only.** Never assign to AI expert IDs.
6. **Source = "Claude Session"** for all agent-generated items.
7. **Always link to a Focus Area.** No orphan database entries.
8. **Synthesize, don't dump.** Never copy raw conversation into Notion.

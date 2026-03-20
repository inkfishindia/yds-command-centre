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
| Campaigns | cff40f3413a84c64b5bfedafeffb0b88 | cff40f34-13a8-4c64-b5bf-edafeffb0b88 | Marketing campaign tracking |
| Content Calendar | a3066b81c26c453daed24588c92ad7c5 | a3066b81-c26c-453d-aed2-4588c92ad7c5 | Content scheduling & status |
| Sequences | aaee75a9fc5141ba8f458ad1e72a4b9b | aaee75a9-fc51-41ba-8f45-8ad1e72a4b9b | Email/automation sequences |
| Sessions Log | b1d04b582c4040918f6dd2ccc1c1b2f1 | b1d04b58-2c40-4091-8f6d-d2ccc1c1b2f1 | Session tracking & analytics |
| Sprint Board (Tech) | e5ccd5d3633044f0a210207982b2c66b | e5ccd5d3-6330-4147-a210-207982b2c66b | Tech sprint items, bugs, tasks |
| Spec Library | ad5b66e6e65c4e859b4ce5d83b49403b | ad5b66e6-e65c-4e85-9b4c-e5d83b49403b | Technical specification pipeline |
| Tech Decision Log | 62ce820e06d24045998dab4ec8d064f9d | 62ce820e-06d2-4045-98da-b4ec8d064f9d | Technical decision records |
| Sprint Archive | ee87ff546d2a468499a9419475b9cb3c | ee87ff54-6d2a-4684-99a9-419475b9cb3c | Sprint velocity history |

**Future Databases** (IDs TBD — Nirmal to create)
- Agent Registry — AI agent configuration and capabilities
- Skills Registry — Skill definitions and triggers
- Human Team — Team member details and expertise matrix

---

## TECH TEAM DATABASES

### Sprint Board (Tech)
Database ID: `e5ccd5d3-6330-4147-a210-207982b2c66b`

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
Database ID: `ad5b66e6-e65c-4e85-9b4c-e5d83b49403b`

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
Database ID: `62ce820e-06d2-4045-98da-b4ec8d064f9d`

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
Database ID: `ee87ff54-6d2a-4684-99a9-419475b9cb3c`

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
| Property | Type | Values |
|---|---|---|
| Name | title | Content piece title |
| Status | select | Planned, In Progress, Scheduled, Published, Archived |
| Content Type | select | Blog, Email, Social, Video, Guide, Case Study |
| Channel | multi_select | Email, LinkedIn, Twitter, Instagram, Website, etc. |
| Publish Date | date | Scheduled publication date |
| Owner | relation → People | Content creator |
| Campaign | relation → Campaigns | Linked campaign |
| Notes | text | Brief description or key message |

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

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

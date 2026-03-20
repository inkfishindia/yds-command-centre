# YDS Command Centre — Technical Brief

**For:** Nirmal + Tech Team
**From:** Dan
**Date:** 2 March 2026

---

## What Is This?

The YDS Command Centre is a web-based interface for **Colin** — our AI Chief of Staff (built on Claude Opus). Instead of interacting through a terminal, Dan can now chat with Colin, trigger workflows, browse Notion data, and review documents through a browser at `http://localhost:3000`.

Colin handles strategic operations: decision scaffolding, focus area health checks, team briefs, commitment tracking, expert routing, and Notion system management. The Command Centre gives this a proper UI.

---

## Architecture

```
Browser (Alpine.js)  ←— SSE Stream —→  Express Server  ←— SDK —→  Claude API (Opus)
                                              |
                                         Tool Handler
                                        /     |     \
                                   Notion    Files   Approval Gate
```

**Stack:**
- **Backend:** Node.js + Express (single `server.js` entry point)
- **AI:** Anthropic Claude Opus via `@anthropic-ai/sdk`
- **Notion:** `@notionhq/client` for all database operations
- **Frontend:** Alpine.js (reactivity) + marked.js (markdown rendering) — no build step
- **Streaming:** Server-Sent Events (SSE) for real-time chat responses
- **State:** In-memory (single user, single session)

No React, no Next.js, no build tooling. Edit HTML, refresh browser.

---

## File Structure

```
command-centre/
├── server.js                      # Express entry point
├── package.json                   # Dependencies: express, @anthropic-ai/sdk, @notionhq/client, googleapis, dotenv, cors
├── .env                           # API keys (ANTHROPIC_API_KEY, NOTION_TOKEN, GOOGLE_SERVICE_ACCOUNT_KEY, spreadsheet IDs, PORT)
├── .env.example                   # Template for setup
│
├── server/
│   ├── config.js                  # Env vars, model selection, workspace paths
│   ├── routes/
│   │   ├── chat.js                # POST /api/chat (SSE streaming), /approve, /clear, /pending
│   │   ├── notion.js              # Dashboard, database browser, page viewer endpoints
│   │   ├── documents.js           # Briefings, decisions, weekly reviews file browser
│   │   ├── skills.js              # GET /api/skills — lists available skill buttons
│   │   ├── sheets.js              # CRUD routes for 25 registered Google Sheets (GET/POST/PATCH/DELETE)
│   │   ├── bmc.js                 # Business Model Canvas: GET / (all 11 sections), GET /:section
│   │   ├── crm.js                 # CRM integrator: 8 endpoints (people, projects, tasks, campaigns, business-units)
│   │   ├── marketing-ops.js       # Marketing dashboards (campaigns, content, sequences, sessions)
│   │   ├── registry.js            # Project registry
│   │   ├── tech-team.js           # Tech team module (sprint, bugs, specs, decisions, velocity, agents, strategy, github)
│   │   ├── commitments.js         # POST /api/commitments (Notion write via approval gate)
│   │   ├── decisions.js           # POST /api/decisions (Notion write via approval gate)
│   │   └── notebooks.js           # Knowledge base (parsed notebook registry)
│   ├── services/
│   │   ├── agent.js               # Claude API wrapper, agentic tool loop, conversation state
│   │   ├── notion.js              # Notion SDK wrapper, 11 databases, 5-min cache
│   │   ├── sheets.js              # Google Sheets SDK wrapper, SHEET_REGISTRY (25 tabs), CRUD methods, 5-min cache
│   │   ├── hydration.js           # Data hydration service: FK resolution across sheets (24 relationships)
│   │   ├── github.js              # GitHub API wrapper (repo activity, PRs, issues, 5-min cache)
│   │   ├── notebooks.js           # Notebook registry parser (markdown → structured JSON)
│   │   ├── prompts.js             # Loads CLAUDE.md + colin.md + notion-hub.md as system prompt
│   │   └── approval.js            # Pending approval queue (promise-based blocking)
│   └── tools/
│       ├── notion-tools.js        # 4 tool definitions: query_database, get_page, create_page, update_page
│       ├── file-tools.js          # 3 tool definitions: read_file, write_file, list_files
│       ├── marketing-tools.js     # 4 tool definitions: customer_psychology_generator, competitor_analysis, content_strategy_generator, campaign_ideator
│       ├── store-tools.js         # 2 tool definitions: store_expert_query, store_expert_update (with KB path protection)
│       └── tool-handler.js        # Central dispatcher + Notion property format converter
│
├── public/
│   ├── index.html                 # Single-page app shell (Alpine.js templates)
│   ├── js/app.js                  # All frontend logic: 10 views (chat, dashboard, team, queue, decisions, docs, notion, registry, knowledge, marketing ops, tech team, bmc, crm)
│   └── css/styles.css             # Dark theme, responsive layout, mobile bottom nav
```

~40 files total.

---

## How to Run

### Prerequisites
- Node.js v18+ (currently running v24.14.0 on Dan's Mac)
- Anthropic API key (for Claude chat)
- Notion integration token (for database access)

### Setup
```bash
cd command-centre
cp .env.example .env
# Add your API keys to .env
npm install
```

### Start
```bash
npm start          # Production
npm run dev        # Development (auto-restart on file changes)
```

Server runs at `http://localhost:3000`.

### Health Check
```
GET /api/health
→ { status: "ok", hasAnthropicKey: true, hasNotionToken: true, model: "claude-opus-4-20250514" }
```

---

## The Views

### 1. Chat (default)
Full conversation with Colin. Streaming responses via SSE. Markdown rendering for structured outputs (tables, briefs, reports).

**How it works:** Frontend sends `POST /api/chat` with `{ message, skill }`. Server enters an agentic loop — Claude responds with text and/or tool calls. Text streams back in real-time. Tool calls execute (reads immediately, writes after approval). Loop continues until Claude has no more tool calls.

**Approval cards:** When Colin wants to write to Notion or create a file, an approval card appears. Dan must approve or reject before the operation executes. This is the "Clarity Gate" — prevents accidental writes.

### 2. Dashboard
Read-only Notion summary: Focus Areas with health status, overdue Commitments, recent Decisions, team snapshot. Data fetched from Notion API with 5-minute cache.

### 3. Team
Roster of 10 team members with roles. AI Expert Panel (Rory, JW, Harry, Tech, Emily) with "Route to" buttons that prefill the chat input.

### 4. Documents
Browse `briefings/`, `decisions/`, `weekly-reviews/` directories. Renders markdown files. "Discuss with Colin" button loads document context into chat.

### 5. Notion Browser
Full read-only browser for the entire Notion workspace:
- **Home:** 4 Key Pages (Business Bible, Notion OS Root, Team Operating Manual, Marketing Context Pack) + 7 Database cards
- **Database view:** Paginated entry list with metadata (status, health, priority, dates)
- **Page view:** Properties grid + full page content converted from Notion blocks to markdown
- Breadcrumb navigation: Notion → Database → Page
- "Open in Notion" link + "Ask Colin" button on every page

### 6. Registry
Project inventory with 11+ projects, sortable by priority, filterable by status/type. Keyboard nav (g+r). Each project shows name, type, status, team, technologies, progress, commitment/decision counts.

### 7. Knowledge Base
Parsed notebook registry (Categories + Notebooks) from markdown with search + category filtering. Keyboard nav (g+k). Shows notebook source, shared status, tags.

### 8. Marketing Ops
Campaign, content, sequence, and session dashboards with:
- **Key Metrics callout:** Collapsible cards (Revenue, Repeat Rate, Customizer to Cart, Customers) with progress bars
- **Campaigns:** Kanban by Stage (Briefing → Complete) with inline action buttons (update Stage/Status via PATCH with approval), loading state
- **Sequences:** Toggle between Table view and Journey Map (5-column kanban by Journey Stage)
- **Campaign Detail Panel:** Shows linked commitments with Overdue/Blocked indicators
- Keyboard nav (g+m)

### 9. Business Model Canvas
Strategic business model overview across 11 sections:
- **All sections parallel:** Segments, Business Units, Flywheels, Revenue Streams, Cost Structure, Channels, Platforms, Team, Hubs, Partners, Metrics
- **Hydrated data:** All FK references resolved (e.g., owner IDs → names)
- **Tab navigation:** Click section tabs to filter view
- **5-col × 3-row grid layout:** Expandable blocks with detail panels
- **Stats callout:** Totals for each section (total segments, total team members, etc.)
- Keyboard nav (g+b)

### 10. CRM
Customer Relationship Management view aggregating execution data:
- **6 section tabs:** Overview (pipeline), People, Projects, Tasks, Campaigns, Business Units
- **Pipeline stats:** B2B vs Dropship funnels with SLA breach counts
- **Data tables:** Searchable/filterable rows with hydrated FK resolution (assignee names, project names, etc.)
- **Detail panel:** Click any row to view full properties
- **Optional filters:** ?status=, ?owner=, ?assignee=, ?project= via query params
- Keyboard nav (g+i)

---

## Notion Integration — Full Map

### 11 Databases

| Database | What's In It | Command Centre Use |
|---|---|---|
| **Focus Areas** | 13 strategic areas (7 active, 6 paused) with health status | Dashboard cards, health checks |
| **Projects** | Mission briefs, initiatives, experiments | Browse and discuss with Colin |
| **Commitments** | Tasks and deliverables with owners, due dates, status | Overdue tracking, accountability |
| **People** | 10 team members + 5 AI experts | Team view, assignment routing |
| **Decisions** | Decision log with rationale, alternatives, risks | Decision history, review prep |
| **Platforms** | Systems and platform tracking | System inventory |
| **Audiences** | Customer segments: B2C, B2B, Dropship, Sellers, Internal | Segment targeting |
| **Campaigns** | Marketing campaigns with Stage (Briefing→Complete), Status, Launch Date, linked Commitments | Marketing Ops: kanban by Stage, inline actions (PATCH), linked commitments in detail panel |
| **Content Calendar** | Content items with Status, publish dates, platform, type | Marketing Ops: kanban by Status, content planning view |
| **Sequences** | Email/SMS sequences with Journey Stage, health metrics, subscriber count | Marketing Ops: table view or journey map (5-column kanban by Journey Stage) |
| **Sessions Log** | Session tracking by date, attendees, focus areas | Marketing Ops: log view with date filtering |

### What Colin Can READ (no approval needed)
- Query any database with filters, sorts, pagination
- Get any page's properties
- Get any page's full content (converted to markdown)
- Dashboard summary (focus areas + overdue + decisions + people)

### What Colin Can WRITE (Dan must approve)
- Create new Commitments (tasks assigned to real humans)
- Create new Decisions (with full rationale)
- Create new Projects (mission briefs)
- Update existing page properties
- Write files to `briefings/`, `decisions/`, `weekly-reviews/`

### What Colin CANNOT Do
- Delete anything (uses Cancelled/Done status instead)
- Modify database schemas
- Assign tasks to AI expert IDs (humans only)
- Execute writes without Dan's approval

### Notion Sharing Requirement

The Notion integration token must have access to each database. In Notion:
1. Open each database page
2. Click `...` → Connections → Add connection
3. Select the YDS integration

If a database isn't shared with the integration, it won't appear in queries.

---

## Google Sheets Integration

The Command Centre bridges Notion and Google Sheets, enabling Colin to access operational data from multiple sources:

### 4 Spreadsheets, 25 Sheets

| Spreadsheet | Tabs | Purpose |
|---|---|---|
| **Execution** (7) | PROJECTS, TASKS, PEOPLE, CAMPAIGNS, EXECUTIVE_DASHBOARD, TIME_TRACKING, LEAD_FLOWS | Day-to-day ops: projects, task tracking, team capacity, campaigns, lead pipeline |
| **Strategy** (6) | BUSINESS_UNITS, FLYWHEEL, HUBS, CUSTOMER_SEGMENT, TOUCHPOINTS, APP_STORES | Strategic planning: market segments, revenue drivers, business unit ownership, distribution channels |
| **App Logging** (2) | LOGIN, BRAIN_DUMP | Usage tracking: who logged in, quick brainstorm captures |
| **Business Model Canvas** (11) | SEGMENTS, BUSINESS_UNITS, FLYWHEELS, REVENUE_STREAMS, COST_STRUCTURE, CHANNELS, PLATFORMS, TEAM, HUBS, PARTNERS, METRICS | Strategic model: classic 9-block + partnerships + metrics |

### Data Hydration

All sheet rows automatically resolve foreign key references. For example, when Colin queries the TASKS sheet:
- `assignee_User_id` (raw ID) becomes `assignee_User_id_resolved` (full name from PEOPLE sheet)
- `Project id` (raw ID) becomes `Project id_resolved` (project name from PROJECTS sheet)

This is powered by the **Data Hydration Service** (`server/services/hydration.js`), which maintains a map of 24 FK relationships and lazy-loads target data on demand.

### CRUD Routes

All 25 sheets are accessible via RESTful routes:

```
GET  /api/sheets/:sheetKey              # Fetch all rows (with ?hydrate=true for FK resolution)
POST /api/sheets/:sheetKey              # Append a row
PATCH /api/sheets/:sheetKey/:rowIdx     # Update a row (rowIdx 1-based, >= 2)
DELETE /api/sheets/:sheetKey/:rowIdx    # Delete a row
```

Examples:
```
GET /api/sheets/TASKS?hydrate=true      # All tasks with assignee names resolved
POST /api/sheets/PROJECTS                # Create new project
PATCH /api/sheets/CAMPAIGNS/3            # Update row 3 campaign status
```

### Environment Variables

```
GOOGLE_SERVICE_ACCOUNT_KEY              # Path to service account JSON (read/write scope)
STRATEGY_SPREADSHEET_ID                 # Google Sheets ID for Strategy spreadsheet
EXECUTION_SPREADSHEET_ID                # Google Sheets ID for Execution spreadsheet
APP_LOGGING_SPREADSHEET_ID              # Google Sheets ID for App Logging spreadsheet
BMC_SPREADSHEET_ID                      # Google Sheets ID for Business Model Canvas spreadsheet
```

### API Isolation

- **Read-only client** (`getClient()`): For legacy pipeline queries (readonly scope)
- **Read-write client** (`getReadWriteClient()`): For CRUD operations (full spreadsheets scope)
- Graceful degradation: If sheets aren't configured, endpoints return `{available: false}` instead of errors

---

## Skills System

Six workflow buttons that inject specialized prompts into the chat:

| Skill | What It Does |
|---|---|
| `/brief` | Creates team briefs, meeting prep, or mission briefs |
| `/decide` | Documents a decision with rationale, alternatives, risks → logs in Notion |
| `/dump` | Processes unstructured input (screenshots, transcripts) → classifies → routes |
| `/health` | Focus area health check across all 7 active areas |
| `/review` | Weekly review prep — scans commitments, blockers, prepares brief for Monday sync |
| `/route` | Finds the right person, system, or expert for any question |

Each skill loads its prompt from `.claude/skills/{name}/prompt.md` (outside the command-centre directory, in the main workspace).

---

## API Endpoints Reference

### Chat
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/chat` | POST | Send message, receive SSE stream |
| `/api/chat/approve` | POST | Approve/reject a pending write operation |
| `/api/chat/clear` | POST | Clear conversation history |
| `/api/chat/pending` | GET | List pending approval requests |

### Notion
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/notion/dashboard` | GET | Full dashboard summary |
| `/api/notion/focus-areas` | GET | Focus areas with health |
| `/api/notion/commitments/overdue` | GET | Overdue commitments |
| `/api/notion/decisions` | GET | Recent decisions (query: `?days=30`) |
| `/api/notion/people` | GET | Team roster |
| `/api/notion/databases` | GET | List all 7 databases |
| `/api/notion/databases/:id` | GET | Query a database (query: `?cursor=...&pageSize=50`) |
| `/api/notion/pages/:id` | GET | Page properties |
| `/api/notion/pages/:id/content` | GET | Page content as markdown |
| `/api/notion/key-pages` | GET | 4 key reference pages |
| `/api/notion/cache/clear` | POST | Flush Notion cache |

### Documents
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/documents` | GET | All documents across all categories |
| `/api/documents/:category/:filename` | GET | Read specific document |

### Google Sheets
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/sheets/pipeline` | GET | CRM pipeline data (B2B + dropship stages, SLA breaches) |
| `/api/sheets/:sheetKey` | GET | Fetch sheet rows (add `?hydrate=true` for FK resolution) |
| `/api/sheets/:sheetKey` | POST | Append a row; body: JSON object with column values |
| `/api/sheets/:sheetKey/:rowIdx` | PATCH | Update row (rowIdx 1-based, >= 2); body: column values |
| `/api/sheets/:sheetKey/:rowIdx` | DELETE | Delete a row |

### Business Model Canvas
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/bmc` | GET | All 11 BMC sections (segments, business_units, flywheels, revenue_streams, cost_structure, channels, platforms, team, hubs, partners, metrics) hydrated |
| `/api/bmc/:section` | GET | Single BMC section (hydrated FK resolution) |

### CRM
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/crm` | GET | Aggregated summary (pipeline + people) |
| `/api/crm/people` | GET | Team data from PEOPLE sheet (hydrated: manager_id resolved) |
| `/api/crm/projects` | GET | Projects from PROJECTS sheet (optional: `?status=`, `?owner=`) |
| `/api/crm/tasks` | GET | Tasks from TASKS sheet (optional: `?status=`, `?assignee=`, `?project=`) |
| `/api/crm/campaigns` | GET | Campaigns from Execution spreadsheet (optional: `?status=`) |
| `/api/crm/business-units` | GET | Business units from Strategy spreadsheet (hydrated: owner, flywheel resolved) |
| `/api/crm/tasks` | POST | Create new task; body: task fields |
| `/api/crm/tasks/:rowIdx` | PATCH | Update task row (rowIdx 1-based, >= 2); body: task fields |

### Marketing Ops
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/marketing-ops` | GET | Aggregated summary (campaigns + content + sequences + sessions + metrics) |
| `/api/marketing-ops/campaigns` | GET | All campaigns (optional: `?stage=` filter) |
| `/api/marketing-ops/content` | GET | Content calendar (optional: `?status=` filter) |
| `/api/marketing-ops/sequences` | GET | Sequences (optional: `?journeyStage=` filter) |
| `/api/marketing-ops/sessions` | GET | Sessions log (query: `?days=30`, range 1-365) |
| `/api/marketing-ops/campaigns/:id` | PATCH | Update campaign Stage or Status; body: `{property, value}`; requires approval |
| `/api/marketing-ops/campaigns/:id/commitments` | GET | Commitments linked to a campaign via Campaign relation |
| `/api/marketing-ops/metrics` | GET | Key business metrics (revenue, repeatRate, customizerToCart, customers) |

### System
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Server status, API key presence |
| `/api/skills` | GET | Available skill buttons |

---

## Key Technical Details

### System Prompt Assembly
Colin's system prompt is built from three files at startup:
1. `CLAUDE.md` — Core persona, operating modes, team roster, rules
2. `.claude/agents/colin.md` — Agent-specific instructions
3. `.claude/notion-hub.md` — Database IDs, property schemas, operation templates

These files live **outside** command-centre, in the main workspace root.

### Caching
- Notion API responses cached in-memory for **5 minutes**
- Cache key includes query parameters (filter, sort, cursor)
- `POST /api/notion/cache/clear` to flush manually
- No persistent cache — resets on server restart

### Conversation State
- Stored in-memory as an array of messages
- Trimmed to last **40 messages** to manage token window
- Lost on server restart (no persistence yet)
- Single conversation at a time (single-user system)

### Model
Currently using `claude-opus-4-20250514`. Configured in `server/config.js`.

### Security Notes
- API keys stored in `.env` (gitignored)
- File operations sandboxed to workspace directories (path traversal blocked)
- No authentication on the web interface (local-only use assumed)
- Notion writes gated by approval system

---

## What's Not Built Yet

- **Authentication** — Currently no login. Fine for local use, needs auth before any deployment.
- **Session persistence** — Conversations lost on restart. Plan: save to `.sessions/` directory.
- **Deployment config** — Running locally only. Plan: Railway or Render for cloud hosting.
- **Token management** — No automatic summarization when context gets long.
- **Mobile optimization** — Basic responsive CSS exists but not thoroughly tested.

---

## For Nirmal: If You Need to Modify

**Adding a new tool for Colin:**
1. Define the tool schema in `server/tools/notion-tools.js` or `server/tools/file-tools.js`
2. Add execution logic in `server/tools/tool-handler.js`
3. If it's a write operation, add the tool name to the write tools Set

**Adding a new view:**
1. Add a nav button in `public/index.html`
2. Add the view's HTML template in the content area
3. Add state + methods in `public/js/app.js`
4. Add styles in `public/css/styles.css`
5. If it needs backend data, add a route in `server/routes/`

**Changing the AI model:**
Edit `MODEL` in `server/config.js`.

**Adding a new skill:**
Create `.claude/skills/{name}/prompt.md` in the workspace root. It will auto-discover on next `/api/skills` call.

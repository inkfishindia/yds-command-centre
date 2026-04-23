# YDS Command Centre — App Reference

**Purpose:** Single source of truth for what exists in the app. Read this before building anything. Update this when you change the app.

**Last updated:** 2026-04-23 (Dan ↔ Colin Queue backend added: `/api/dan-colin` routes + `server/services/dan-colin-service.js`. Source: Notion DB `00969f07`. GET groups queue by section; POST /:id/answer and POST /drop both SSE + approval-gated. Auto-close logic: non-empty answer on ⚡ Waiting row atomically sets ✅ Closed + Resolved.)

---

## Runtime Architecture

### Backend shape
- `server.js` remains the thin Express entrypoint and route registrar.
- `server/routes/*.js` now behave as controller-thin HTTP layers.
- Infrastructure access stays in services like `server/services/notion.js`, `server/services/sheets.js`, `server/services/hydration.js`, and `server/services/github.js`.
- Domain orchestration now lives in dedicated services:
  - `server/services/dashboard-service.js`
  - `server/services/projects-service.js`
  - `server/services/notion-detail-service.js`
  - `server/services/crm-service.js`
  - `server/services/marketing-ops-service.js`
  - `server/services/tech-team-service.js`
  - `server/services/factory-service.js`

### Frontend shape
- The app is still a SPA.
- `src/js/app.js` is now primarily the composition shell plus shared utility methods.
- Domain state and actions are split into:
  - `src/js/modules/chat.js`
  - `src/js/modules/commitments.js`
  - `src/js/modules/factory.js`
  - `src/js/modules/command-shell.js`
  - `src/js/modules/dashboard.js`
  - `src/js/modules/bmc.js`
  - `src/js/modules/crm.js`
  - `src/js/modules/marketing-ops.js`
  - `src/js/modules/tech-team.js`
  - `src/js/modules/registry.js`
  - `src/js/modules/projects.js`
  - `src/js/modules/team.js`
  - `src/js/modules/documents.js`
  - `src/js/modules/notion-browser.js`
  - `src/js/modules/system-map.js`

### Build and runtime
- There is a real frontend asset build step.
- `npm run build` copies `src/js/*` into `public/js/*` through `scripts/build-assets.mjs`.
- `npm start` and `npm run dev` both run the build step before starting the server.

---

## API Routes

### Chat (`server/routes/chat.js`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | Stream chat via SSE (text, tool_use, approval, error, done) |
| POST | `/api/chat/approve` | Resolve pending approval (approve/reject) |
| POST | `/api/chat/clear` | Clear conversation history |
| GET | `/api/chat/pending` | Get pending approvals |

### Notion (`server/routes/notion.js`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notion/morning-brief` | Operational brief: overdueCount, overdueItems, todayItems, topThree, flags, waitingOn, timestamp |
| GET | `/api/notion/dashboard` | Full dashboard summary (6 parallel queries + enrichment) |
| GET | `/api/notion/focus-areas` | All focus areas |
| GET | `/api/notion/focus-areas/:id/detail` | Focus area detail: properties, projects[], commitments[], decisions[], stats {openCount, overdueCount, blockedCount, projectCount} |
| GET | `/api/notion/commitments/overdue` | Overdue commitments (due < today, not done/cancelled) |
| GET | `/api/notion/commitments/upcoming` | Upcoming commitments (?days=7, max 90) |
| GET | `/api/notion/decisions` | Recent decisions (?days=30, max 365) — paginated with cursor loop |
| GET | `/api/notion/people` | All people |
| GET | `/api/notion/people/:id/detail` | Person detail: properties, commitments[] (enriched with dueDate, isOverdue, daysOverdue, focusAreaNames[]), metrics {activeCount, overdueCount, blockedCount, doneCount, capacity} |
| GET | `/api/notion/projects` | All projects with resolved relations + commitment stats (openCount, overdueCount, doneCount, progressPercent, linkedCommitments[], lastCommitmentActivity, last_edited_time) |
| GET | `/api/notion/action-queue` | Dan's queue + Runner's queue (dansQueue[], runnersQueue[], counts {dan, runner}) |
| GET | `/api/notion/databases` | List 7 known databases (static) |
| GET | `/api/notion/databases/:id` | Query database entries (?cursor, ?pageSize) |
| GET | `/api/notion/pages/:id` | Page properties with resolved relations |
| GET | `/api/notion/pages/:id/content` | Page blocks as markdown |
| GET | `/api/notion/pages/:id/related` | Related pages via relation properties |
| GET | `/api/notion/key-pages` | 4 key pages (static) |
| POST | `/api/notion/cache/clear` | Clear 5-min TTL cache |

### Commitments (`server/routes/commitments.js`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/commitments` | Create new commitment (name, assigneeId, dueDate, focusAreaId, priority, projectId?, notes?) |

### Decisions (`server/routes/decisions.js`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/decisions` | Create new decision (name, decision, rationale, context, focusAreaId, owner) |

### Sheets (`server/routes/sheets.js`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sheets/pipeline` | CRM pipeline data: {available, b2b, dropship, breaches} or {available: false} if not configured |
| GET | `/api/sheets/:sheetKey` | Fetch all rows from registered sheet; add ?hydrate=true to resolve FK references; valid keys: PROJECTS, TASKS, PEOPLE, CAMPAIGNS, etc. (25 sheets) |
| POST | `/api/sheets/:sheetKey` | Append a row to a registered sheet; body: JSON object with column names as keys; returns {success, updates} |
| PATCH | `/api/sheets/:sheetKey/:rowIdx` | Update a specific row (rowIdx 1-based, >= 2); body: JSON object with column values to update; returns update result |
| DELETE | `/api/sheets/:sheetKey/:rowIdx` | Delete a specific row (rowIdx 1-based, >= 2); requires read-write client |

### Notebooks (`server/routes/notebooks.js`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notebooks` | Parsed registry with categories, notebooks, stats; returns {available: false} if `nlm-notebook-registry.md` missing |
| POST | `/api/notebooks/cache/clear` | Clear 5-min TTL cache |

### Documents (`server/routes/documents.js`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/documents` | List all documents |
| GET | `/api/documents/:category` | List by category (briefings/decisions/weekly-reviews) |
| GET | `/api/documents/:category/:filename` | Read specific document |

### Skills (`server/routes/skills.js`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/skills` | List 6 available skills |

### System Map (`server/routes/system-map.js`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/system-map` | Aggregated app structure (routes, modules, Notion DBs, Sheets, docs, agents); cached 60s; query: `?force=true` to bust cache |

### Dan ↔ Colin Queue (`server/routes/dan-colin.js`)
Source: Notion DB `00969f07-8b4d-4c88-8a45-ec1e95b3bacb`. 5-min in-process cache.
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dan-colin` | Grouped queue: `{ now, waiting, drop, watch, closed, meta }` — excludes Archived, closed = Resolved OR ✅ Closed within 7d |
| POST | `/api/dan-colin/:id/answer` | Body: `{ answer: string }` — SSE + approval gate. Auto-closes ⚡ Waiting rows to ✅ Closed + Resolved when answer is non-empty |
| POST | `/api/dan-colin/drop` | Body: `{ body: string }` — SSE + approval gate. Creates new row with Section=📥 Drop, Owner=Colin, Status=Open |

### Marketing Ops (`server/routes/marketing-ops.js`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/marketing-ops` | Aggregated summary (campaigns + content + sequences + sessions + stats) |
| GET | `/api/marketing-ops/campaigns` | All campaigns, optional `?stage=` filter |
| GET | `/api/marketing-ops/content` | Content calendar, optional `?status=` filter |
| GET | `/api/marketing-ops/sequences` | Sequences, optional `?journeyStage=` filter |
| GET | `/api/marketing-ops/sessions` | Sessions log, `?days=30` param (1-365) |
| PATCH | `/api/marketing-ops/campaigns/:id` | Update campaign Stage or Status via approval gate; body: `{property, value}`; Stage: Briefing/In Progress/Review/Live/Complete; Status: On Track/At Risk/Blocked/Needs Dan |
| GET | `/api/marketing-ops/campaigns/:id/commitments` | Commitments linked to a campaign via Campaign relation; returns `{commitments[]}` with `isOverdue`/`dueStr` enrichment |
| GET | `/api/marketing-ops/metrics` | Key business metrics from `server/data/metrics.json` — revenue, repeatRate, customizerToCart, customers |

### Registry (`server/routes/registry.js`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/registry` | All projects sorted by priority, with aggregate stats {total, byStatus {}, byType {}} |
| GET | `/api/registry/:slug` | Single project by slug; full properties {id, slug, name, type, status, description, team[], technologies[], lastAction, lastUpdated, counts {commitments, decisions}, progress, priority, notes} |
| PATCH | `/api/registry/:slug` | Update allowed fields (status, lastAction, counts, progress, notes); returns updated project |

### Tech Team (`server/routes/tech-team.js`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tech-team` | Aggregated summary (sprintItems + specs + decisions + archive + stats) |
| GET | `/api/tech-team/sprint` | Sprint board items, optional `?status=&system=&priority=&type=` filters |
| GET | `/api/tech-team/bugs` | Sprint items filtered to Type=Bug, with stats {total, open, byPriority, bySystem} |
| GET | `/api/tech-team/specs` | Spec pipeline, optional `?status=` filter |
| GET | `/api/tech-team/decisions` | Tech decision log, sorted by date desc |
| GET | `/api/tech-team/velocity` | Sprint archive for velocity data |
| GET | `/api/tech-team/agents` | Agent registry + skill catalog from file system |
| GET | `/api/tech-team/strategy` | Strategy cascade from Google Sheets (graceful degradation) |
| GET | `/api/tech-team/github` | GitHub repo activity (graceful degradation) |
| PATCH | `/api/tech-team/sprint/:id` | Update sprint item property (Status/Priority/Waiting On) via approval gate |

### Business Model Canvas (`server/routes/bmc.js`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/bmc` | All 11 BMC sections parallel (segments, business_units, flywheels, revenue_streams, cost_structure, channels, platforms, team, hubs, partners, metrics), hydrated with FK resolution; returns {available, canvas{}, stats{totalSegments, totalBusinessUnits, ...}, timestamp} |
| GET | `/api/bmc/:section` | Single BMC section, hydrated; valid sections: segments, business_units, flywheels, revenue_streams, cost_structure, channels, platforms, team, hubs, partners, metrics |

### CRM (`server/routes/crm.js`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/crm` | Aggregated summary: `{pipeline, people[], timestamp}` — pipeline from LEAD_FLOWS sheet, people from PEOPLE sheet registry; graceful degradation when sheets not configured |
| GET | `/api/crm/people` | Team/people data from PEOPLE sheet, hydrated (resolves manager_id → full_name); `{available, headers, rows}` |
| GET | `/api/crm/projects` | Projects from PROJECTS sheet, hydrated (owner_User_id → full_name, business_unit_id → bu_name); optional `?status=&owner=` filters |
| GET | `/api/crm/tasks` | Tasks from TASKS sheet, hydrated (assignee/reporter → full_name, Project id → Project Name); optional `?status=&assignee=&project=` filters |
| GET | `/api/crm/campaigns` | Campaigns from CAMPAIGNS sheet (Execution spreadsheet); optional `?status=` filter |
| GET | `/api/crm/business-units` | Business units from BUSINESS_UNITS sheet (Strategy spreadsheet), hydrated (owner → full_name, flywheel_id → flywheel_name) |
| POST | `/api/crm/tasks` | Create a new task row; body: task field object; returns `201` with append result |
| PATCH | `/api/crm/tasks/:rowIdx` | Update a task row by sheet row index (must be >= 2); body: partial task fields; returns update result |

---

## Frontend Views

| View | Nav button | Load method | Data source |
|------|-----------|-------------|-------------|
| `chat` | Chat | — (always ready) | POST /api/chat (SSE) |
| `dashboard` | Dash | `loadDashboard()` | GET /api/notion/dashboard |
| `focusArea` | (health strip chip) | `loadFocusArea(id)` | GET /api/notion/focus-areas/:id/detail |
| `personView` | (team load row) | `loadPersonView(id)` | GET /api/notion/people/:id/detail |
| `actionQueue` | Queue | `loadActionQueue()` | GET /api/notion/action-queue |
| `decisions` | Log | `loadDecisions()` | GET /api/notion/decisions?days=365 |
| `team` | Team | `loadTeam()` | GET /api/notion/people |
| `docs` | Docs | `loadDocuments()` | GET /api/documents |
| `notion` | Notion | `loadNotion()` | GET /api/notion/databases + key-pages |
| `registry` | Reg | `loadRegistry()` | GET /api/registry |
| `knowledge` | KB | `loadNotebooks()` | GET /api/notebooks |
| `marketingOps` | Mktg | `loadMarketingOps()` | GET /api/marketing-ops |
| `techTeam` | Tech | `loadTechTeam()` | GET /api/tech-team + /agents + /strategy + /github |
| `bmc` | BMC | `loadBMC()` | GET /api/bmc |
| `crm` | CRM | `loadCRM()` | GET /api/crm + /people + /projects + /tasks |
| `systemMap` | (not nav visible by default) | `loadSystemMap()` | GET /api/system-map |

### Dashboard shows:
- Morning Brief (summary: overdue count, top 3 active, flags, waiting on)
- Health Strip (horizontal chips for all focus areas with health indicators; clickable → focusArea view)
- 4 KPI cards: Focus Areas (with health bar), Overdue Items, Recent Decisions, Team count
- Pipeline Snapshot (B2B + Dropship funnels with SLA breaches; requires Google Sheets config)
- Overdue commitments table (with notes preview, priority, owner names resolved, inline action buttons: Done, Snooze, Reassign; bulk actions bar with select all/checkboxes, bulk done, bulk snooze +3d/+7d)
- Upcoming this week table (with notes preview, priority, owner names resolved, inline action buttons: Done, Snooze, Reassign)
- Recent decisions (expandable cards with Context, Decision, Rationale, Risks, Alternatives)
- Quick create buttons: + Commitment (modal), + Decision (modal)

### Notion browser shows:
- Database picker grid (7 databases)
- Key pages list (4 pages)
- Entry list with search + status filter + pagination
- Page viewer with properties + related pages + markdown content

### Detail sidebar:
- Slide-in panel (450px / 90vw on mobile)
- Shows properties + markdown content for any entity
- Opened from: dashboard cards, dashboard tables, team cards, notion entries

### Command palette:
- Searches: navigation views (Chat, Dashboard, Team, Queue, Projects, Registry, Decision Log, Docs), databases, key pages, skills, people (from team), focus areas, overdue commitments
- Results can navigate to views or open detail panel
- Arrow keys + Enter to execute
- `Cmd/Ctrl+K` and `/` open the palette
- Direct navigation uses `Cmd/Ctrl+Shift+...` shortcuts (see Keyboard Shortcuts)

### Marketing Ops shows:
- **Key Metrics callout** (collapsible section above stats strip): Revenue, Repeat Rate, Customizer to Cart, Customer Count — each with metric card, target, progress bar
- **Section tabs:** Campaigns (kanban by Stage), Content (kanban by Status), Sequences (table or journey map toggle), Sessions (log by date)
- **Campaigns kanban:** Columns for each Stage (Briefing, In Progress, Review, Live, Complete); cards show Name, Status badge, Launch Date; hover actions (update Stage/Status via PATCH with approval), inline loading spinner
- **Sequences view toggle:** Button group (Table | Journey Map); journey map shows 5-column kanban by Journey Stage with card counts and sequence names
- **Campaign detail panel:** Includes Commitments section showing linked commitments with Overdue/Blocked indicators, linked via Campaign relation

---

## State Variables (by module)

### Core
`view`, `connected`

### Chat (`src/js/modules/chat.js`)
`messages[]`, `inputText`, `streaming`, `streamingText`, `pendingApprovals[]`, `activeTools[]`

### Dashboard (`src/js/modules/dashboard.js`)
`dashboard`, `dashboardLoading`, `upcomingCommitments[]`, `expandedDecision`, `expandedCommitmentRow`, `showCompletedThisWeek`, `lastRefresh`, `refreshIntervalId`
`morningBrief`, `briefLoading`, `selectedOverdue[]` (for bulk actions)

### Focus Area Detail
`activeFocusArea`, `focusAreaDetail`, `focusAreaLoading`

### Person Detail
`personDetail`, `personLoading`

### Action Queue
`actionQueue`, `actionQueueLoading`, `queueTab` ('dan'|'runner')

### Pipeline
`pipeline`, `pipelineLoading`

### Commitments + Write-Back (`src/js/modules/commitments.js`)
`showCreateCommitment`, `showCreateDecision`, `submittingCommitment`, `submittingDecision`
`newCommitment` {name, assigneeId, dueDate, focusAreaId, priority, projectId, notes}
`newDecision` {name, decision, rationale, context, focusAreaId, owner}
`showSnoozeFor` (null or commitment id), `showReassignFor` (null or commitment id), `actionFeedback` (string or null)
`commitments[]`, `commitmentsLoading`, `commitmentsView`, `commitmentFilters`, `editDropdown`, `undoToast`, `quickNoteText`, `quickNoteSaving`, `writeErrors`, `peopleList`

### Decision Filters
`decisionDateRange` ('all'|'week'|'month'|'3months'), `decisionSearch` (keyword string), `decisionFocusArea` (focus area name), `decisionOwner` (owner name)

### Decisions View
`decisions[]`, `decisionsLoading`

### Projects (`src/js/modules/projects.js`)
`projects[]`, `projectsLoading`, `projectsFilter: 'Active'`, `projectsTypeFilter: ''`, `expandedProject` (null or project id)

### Registry (`src/js/modules/registry.js`)
`registry[]`, `registryLoading`, `registryFilter` (status filter string), `registryTypeFilter` (type filter string), `registryExpanded` (null or project slug)

#### Registry Methods
| Method | Purpose |
|--------|---------|
| `loadRegistry()` | Fetch all projects from GET /api/registry, store in `registry[]` |
| `getFilteredRegistry()` | Apply `registryFilter` + `registryTypeFilter` to `registry[]`, return filtered array |
| `getRegistryStatusClass(status)` | Return CSS class name for status badge color |
| `getRegistryTypeLabel(type)` | Return human-readable label for project type |
| `getRegistryTypeClass(type)` | Return CSS class name for type badge styling |

### Knowledge Base
`notebooks`, `notebooksLoading`, `notebooksSearch` (keyword string), `notebooksCategory` (category filter string), `notebooksExpanded` (null or notebook id)

#### Knowledge Base Methods
| Method | Purpose |
|--------|---------|
| `loadNotebooks()` | Fetch parsed registry from GET /api/notebooks, store in `notebooks` |
| `getFilteredNotebooks()` | Apply `notebooksSearch` + `notebooksCategory` filters to `notebooks.notebooks[]`, return filtered array |
| `getTotalFilteredNotebooks()` | Return count of filtered notebooks |

### Marketing Ops (`src/js/modules/marketing-ops.js`)
`mktops`, `mktopsLoading`, `mktopsSection` ('campaigns'|'content'|'sequences'|'sessions'), `mktopsMetrics[]`, `mktopsMetricsExpanded` (boolean), `mktopsSequenceView` ('table'|'journey'), `mktopsActionLoading` (campaign ID or null), `mktopsCampaignCommitments`, `mktopsCampaignCommitmentsLoading`

#### Marketing Ops Methods
| Method | Purpose |
|--------|---------|
| `loadMarketingOps()` | Fetch aggregated data from GET /api/marketing-ops + GET /api/marketing-ops/metrics in parallel, store in `mktops` and `mktopsMetrics` |
| `getCampaignsByStage(stage)` | Filter campaigns by Stage property |
| `getContentByStatus(status)` | Filter content items by Status property |
| `getSequenceHealth(seq)` | Return health indicator for sequence (computed from properties) |
| `getSequencesByJourneyStage(stage)` | Filter sequences by Journey Stage property |
| `formatMktDate(dateVal)` | Format date object {start, end} to readable string |
| `campaignAction(id, property, value)` | Send PATCH /api/marketing-ops/campaigns/:id with {property, value} via approval gate, set `mktopsActionLoading` during request |
| `getCampaignActions(campaign)` | Return array of valid action {property, value} pairs for a campaign |
| `loadCampaignCommitments(id)` | Fetch GET /api/marketing-ops/campaigns/:id/commitments, store in `mktopsCampaignCommitments`, use beginRequest/endRequest pattern |

### Tech Team (`src/js/modules/tech-team.js`)
`techTeam`, `techTeamLoading`, `techTeamSection` ('command'|'sprint'|'bugs'|'specs'|'decisions'|'velocity'|'roadmap'|'crm'|'agents'|'strategy'), `techTeamLastRefresh`, `techSystemFilter`, `techPriorityFilter`, `techTypeFilter`, `techSprintSearch`, `techActionLoading`, `techExpandedItem`, `techAgents`, `techStrategy`, `techGithub`

### Business Model Canvas (`src/js/modules/bmc.js`)
`bmc`, `bmcLoading`, `bmcDetailItem`, `bmcDetailKey`

#### BMC Methods
| Method | Purpose |
|--------|---------|
| `loadBMC()` | Fetch aggregated BMC data from GET /api/bmc, store in `bmc` with all 11 sections hydrated |
| `getBmcBlockItems(blockKey)` | Return raw rows for a BMC block from `bmc.canvas[blockKey]` |
| `getBmcTopItems(blockKey, limit)` | Return the top N rows for summary rendering in a section card |
| `getBmcItemLabel(blockKey, item)` | Pick the most human-readable title field for an item |
| `getBmcItemPreview(blockKey, item)` | Pick a short secondary line used in card previews |
| `getBmcStatus(blockKey, item)` | Derive a status/priority pill label from the item data |
| `getBmcStatusClass(value)` | Map a status string to the visual pill class |
| `getBmcSectionSummary(blockKey)` | Return a short strategic description for each BMC section |
| `getBmcHeroMetrics()` | Build the top summary cards from BMC stats and block totals |
| `getBmcSpotlight(blockKey)` | Return the lead item used in the hero spotlight cards |
| `openBmcDetail(blockKey, item)` | Open the detail drawer with the section key + selected item |
| `getBmcDetailTitle()` | Resolve the detail drawer title from the active block/item |

### Business Model Canvas shows:
- Executive summary hero with a strategic positioning line, spotlight cards, and 4 key totals
- Hybrid BMC grid preserving classic left/center/right/bottom structure while using richer modern section cards
- Value Proposition block visually emphasized as the primary strategic center
- Section cards show top items only by default with preview text and status pills instead of flat list rows
- Detail drawer labeled `Canvas Detail`, designed to feel edit-ready later while the page remains read-first today
- Page-level scroll is preferred over nested inner-card scrolling; mobile stacks into a single-column reading flow

### CRM (`src/js/modules/crm.js`)
`crm`, `crmLoading`, `crmSection` ('overview'|'people'|'projects'|'tasks'|'campaigns'|'business-units'), `crmActiveRow` (null or selected row index)

#### CRM Methods
| Method | Purpose |
|--------|---------|
| `loadCRM()` | Fetch aggregated CRM data from GET /api/crm + sub-endpoints in parallel, store in `crm` with pipeline, people, projects, tasks, campaigns, business-units |
| `getCRMSection(section)` | Return rows from crm[section] for current tab |
| `filterCRMRows(rows, query)` | Search/filter rows by keyword in human-readable columns |

#### Tech Team Methods
| Method | Purpose |
|--------|---------|
| `loadTechTeam()` | Fetch summary + agents + strategy + github in parallel |
| `getSprintItemsByStatus(status)` | Filter sprint items by status, applying system/priority/type/search filters |
| `getTechBugs()` | Filter sprint items to Type=Bug, excluding Cancelled |
| `getTechBugStats()` | Compute open bug count, by-priority breakdown, by-system breakdown |
| `getSpecsByStatus(status)` | Filter specs by status |
| `getRoadmapByHorizon(horizon)` | Filter sprint items by Horizon, excluding Done/Cancelled |
| `getVelocityData()` | Map sprint archive to bar chart data {name, planned, completed, pct} |
| `getTechRefreshLabel()` | Format time since last refresh |
| `techSprintAction(id, property, value)` | PATCH sprint item property via approval gate, then reload |
| `getTechSystems()` | Extract unique system values from sprint items |
| `getTechPriorityClass(priority)` | Return CSS class for priority level |
| `getTechTypeClass(type)` | Return CSS class for item type |

### Team (`src/js/modules/team.js`)
`teamData[]`, `teamLoading`

### Documents (`src/js/modules/documents.js`)
`documents{briefings, decisions, weekly-reviews}`, `docsTab`, `docsLoading`, `activeDoc`

### Keyboard Shortcuts
- `Cmd/Ctrl+K` or `/` opens command palette
- `Cmd/Ctrl+Shift+D` Dashboard
- `Cmd/Ctrl+Shift+P` Projects
- `Cmd/Ctrl+Shift+T` Team
- `Cmd/Ctrl+Shift+Q` Queue
- `Cmd/Ctrl+Shift+F` Documents
- `Cmd/Ctrl+Shift+L` Decision Log
- `Cmd/Ctrl+Shift+R` Registry
- `Cmd/Ctrl+Shift+K` Knowledge Base
- `Cmd/Ctrl+Shift+O` Notion
- `Cmd/Ctrl+Shift+U` Factory
- `Cmd/Ctrl+Shift+B` BMC
- `Cmd/Ctrl+Shift+I` CRM
- `Cmd/Ctrl+Shift+M` Marketing Ops
- `Cmd/Ctrl+Shift+E` Tech Team
- `Cmd/Ctrl+Shift+N` New Commitment
- `Cmd/Ctrl+Shift+J` New Decision
- `_lastVisible` triggers dashboard refresh when the tab returns after 60s+

### Notion Browser (`src/js/modules/notion-browser.js`)
`notionDatabases[]`, `notionEntries[]`, `notionLoading`, `notionActiveDb`, `notionActivePage`, `notionPageContent`, `notionKeyPages[]`, `notionHasMore`, `notionNextCursor`, `notionRelated`, `notionRelatedLoading`, `notionSearchQuery`, `notionFilterStatus`

### Detail Panel
`detailPanel` (null or {id, name, url, properties, content, loading})

### Command Palette + Navigation (`src/js/modules/command-shell.js`)
`cmdPaletteOpen`, `cmdSearch`, `cmdSelectedIndex`

### Factory (`src/js/modules/factory.js`)
`factoryZoneDetail`, `factorySimOpen`, `factorySimConfig`, `factorySimPreset`, `_factoryBaseCache`, `factoryConfig`, `factoryConfigLoading`, `factoryEditingMachine`, `factoryEditingZone`, `factoryShowFormulas`, `factoryMachineEdits`, `factoryZoneEdits`, `factoryOperatingEdits`, `factoryEditingOperating`, `factoryError`

### System Map (`src/js/modules/system-map.js`)
`systemMap`, `systemMapLoading`, `systemMapError`, `systemMapFilter`, `systemMapExpanded{repo, routes, notion, sheets, modules, docs}`

#### System Map Methods
| Method | Purpose |
|--------|---------|
| `loadSystemMap(force)` | Fetch GET /api/system-map (with optional cache bust), store in `systemMap` |
| `toggleSystemMapSection(key)` | Toggle expand/collapse of a collapsible section (repo/routes/notion/sheets/modules/docs) |
| `copySystemMapId(id)` | Copy shortened ID to clipboard, show toast feedback |
| `filteredRoutes()` | Return routes filtered by `systemMapFilter` across file and endpoint properties |
| `filteredNotionDbs()` | Return Notion DBs filtered by name, id, purpose, properties |
| `filteredSheets()` | Return Sheets filtered by label, key, envVar |
| `filteredModules()` | Return modules filtered by name and exports |

---

## Skills & Experts

### Skills (from /api/skills)
| Skill | Icon | What it does |
|-------|------|-------------|
| brief | B | Create team/meeting/mission brief |
| decide | D | Document decision with rationale |
| dump | P | Process unstructured input — classify & route |
| health | H | Focus area health check across all areas |
| review | R | Weekly review for Monday sync |
| route | T | Route question/task to right person/system |

### Experts (hardcoded in app.js)
| Expert | Domain | Icon |
|--------|--------|------|
| Rory | Behavioral psychology, nudges | R |
| JW | Visual strategy, UX, brand | J |
| Harry | Copy, CTAs, messaging | H |
| Tech | Architecture, feasibility | A |
| Emily | Marketing campaigns | E |

---

## Notion Service (`server/services/notion.js`)

### Databases
| Constant | Name | ID |
|----------|------|----|
| DB.FOCUS_AREAS | Focus Areas | 274fc2b3... |
| DB.PROJECTS | Projects | 85c1b292... |
| DB.COMMITMENTS | Commitments | 0b50073e... |
| DB.PEOPLE | People | de346469... |
| DB.DECISIONS | Decisions | 3c8a9b22... |
| DB.PLATFORMS | Platforms | 1fcf264f... |
| DB.AUDIENCES | Audiences | 63ec25ca... |
| DB.CAMPAIGNS | Campaigns | cff40f34... |
| DB.CONTENT_CALENDAR | Content Calendar | a3066b81... |
| DB.SEQUENCES | Sequences | aaee75a9... |
| DB.SESSIONS_LOG | Sessions Log | b1d04b58... |
| DB.TECH_SPRINT_BOARD | Sprint Board (Tech) | e5ccd5d3... |
| DB.TECH_SPEC_LIBRARY | Spec Library | ad5b66e6... |
| DB.TECH_DECISION_LOG | Tech Decision Log | 62ce820e... |
| DB.TECH_SPRINT_ARCHIVE | Sprint Archive | ee87ff54... |

### Key Functions
| Function | Returns | Cached | Notes |
|----------|---------|--------|-------|
| `simplify(props)` | Plain values | — | title→string, date→{start,end}, relation→[ids], etc. |
| `resolveRelations(props)` | {id,name} objects | Via getPageRaw | Converts UUID arrays to named objects |
| `getFocusAreas()` | area[] | Yes | Up to 20 |
| `getOverdueCommitments()` | commitment[] | Yes | Due < today, not Done/Cancelled |
| `getUpcomingCommitments(days)` | commitment[] | Yes | Default 7 days |
| `getRecentDecisions(days)` | decision[] | Yes | Default 30, sorted desc; paginates with cursor loop |
| `getPeople()` | person[] | Yes | Up to 30 |
| `getProjects()` | project[] | Yes | Paginates all; includes last_edited_time |
| `getAllCommitments()` | commitment[] | Yes | Paginates all; includes last_edited_time |
| `getDashboardSummary()` | {focusAreas, overdue, upcoming, recentDecisions, people, healthDistribution, timestamp} | Via sub-calls | 7 parallel queries, enriches with counts + names |
| `getMorningBrief()` | {overdueCount, overdueItems, todayItems, topThree, flags, waitingOn, timestamp} | Via getDashboardSummary | Aggregates dashboard data into operational brief; no extra API calls |
| `queryDatabase(id, opts)` | {results, hasMore, nextCursor} | Yes | Generic, resolves relations |
| `getPage(id)` | {id, url, created, updated, properties} | Yes | Relations resolved |
| `getPageContent(id)` | {blocks, markdown} | Yes | Recursive to depth 2 |
| `getRelatedPages(id)` | {relationName: [{id, name, status, health, priority, dueDate}]} | Yes | Up to 10 per relation |
| `getActionQueue()` | {dansQueue[], runnersQueue[], counts {dan, runner}} | Yes | Severity sorted |
| `createCommitment(fields)` | {id, url} | — | Creates commitment in Notion |
| `createDecision(fields)` | {id, url} | — | Creates decision in Notion |
| `getCampaigns()` | campaign[] | Yes | All campaigns with Stage, Status, etc. |
| `getContentCalendar()` | content[] | Yes | Content items with Status, publish date, etc. |
| `getSequences()` | sequence[] | Yes | Sequences with Journey Stage, health metrics, etc. |
| `getSessionsLog(days)` | session[] | Yes | Sessions from last N days (1-365, default 30) |
| `getMarketingOpsSummary()` | {campaigns, content, sequences, sessions, stats} | Via sub-calls | Aggregated data across all 4 marketing databases |
| `getSprintItems()` | sprintItem[] | Yes | All tech sprint items with person resolution |
| `getSpecLibrary()` | spec[] | Yes | All tech specs |
| `getTechDecisions()` | decision[] | Yes | Tech decisions sorted by date desc |
| `getSprintArchive()` | sprint[] | Yes | Sprint archive sorted by number desc |
| `getTechTeamSummary()` | {sprintItems, specs, techDecisions, sprintArchive, stats} | Via sub-calls | Aggregated tech team data |
| `updateSprintItemProperty(id, property, value)` | {id, url} | — | Updates sprint item property via enqueueWrite |

### Infrastructure
- **Cache:** In-memory Map, 5-min TTL, cleared via `clearCache()`
- **Dedup:** `deduplicatedFetch()` prevents concurrent identical requests
- **Retry:** `withRetry()` — 3 attempts, exponential backoff on 429/5xx
- **Stable keys:** `stableStringify()` for consistent cache keys regardless of object key order

---

## Sheets Service (`server/services/sheets.js`)

### Key Functions
| Function | Returns | Cached | Notes |
|----------|---------|--------|-------|
| `isConfigured()` | boolean | — | Check if Google service account + sheet ID env vars are set |
| `isSpreadsheetConfigured(key)` | boolean | — | Check if specific spreadsheet (STRATEGY, EXECUTION, APP_LOGGING, BMC) is configured |
| `getPipelineData()` | {available: true, b2b: {stages, metrics}, dropship: {stages, metrics}, breaches[]} OR {available: false} | Yes | Returns empty structure if not configured; graceful degradation |
| `getStrategyCascade()` | {available: true, levels[]} OR {available: false} | Yes | Strategy cascade from Google Sheets; graceful degradation |
| `fetchSheet(sheetKey)` | {available: true, headers[], rows[]} OR {available: false} | Yes | Fetch all rows from SHEET_REGISTRY by key (25 sheets supported); rows include rowIndex |
| `appendRow(sheetKey, rowData)` | {success: true, updates} | — | Append row to sheet; clears sheet cache |
| `updateRow(sheetKey, rowIndex, rowData)` | {success: true, updates} | — | Update specific row (1-based, >= 2); clears sheet cache |
| `deleteRow(sheetKey, rowIndex)` | {success: true, updates} | — | Delete specific row (1-based, >= 2); clears sheet cache |
| `getReadWriteClient()` | Google Sheets API client or null | — | Get authenticated client for read-write operations; separate from read-only client |
| `clearCache()` | — | — | Clear in-memory sheets cache |

### SHEET_REGISTRY (25 tabs across 4 spreadsheets)
**Execution Spreadsheet (7 tabs):** PROJECTS, TASKS, PEOPLE, CAMPAIGNS, EXECUTIVE_DASHBOARD, TIME_TRACKING, LEAD_FLOWS
**Strategy Spreadsheet (6 tabs):** BUSINESS_UNITS, FLYWHEEL, HUBS, CUSTOMER_SEGMENT, TOUCHPOINTS, APP_STORES
**App Logging Spreadsheet (2 tabs):** LOGIN, BRAIN_DUMP
**Business Model Canvas Spreadsheet (11 tabs):** BMC_SEGMENTS, BMC_BUSINESS_UNITS, BMC_FLYWHEELS, BMC_REVENUE_STREAMS, BMC_COST_STRUCTURE, BMC_CHANNELS, BMC_PLATFORMS, BMC_TEAM, BMC_HUBS, BMC_PARTNERS, BMC_METRICS

### Environment Variables
- `GOOGLE_SERVICE_ACCOUNT_KEY` (optional) — Path to Google service account JSON file
- `GOOGLE_SHEETS_ID` (optional) — Legacy CRM pipeline spreadsheet ID (`LEAD_FLOWS` source)
- `STRATEGY_SPREADSHEET_ID` (optional) — Strategy spreadsheet ID
- `EXECUTION_SPREADSHEET_ID` (optional) — Execution spreadsheet ID
- `APP_LOGGING_SPREADSHEET_ID` (optional) — App logging spreadsheet ID
- `BMC_SPREADSHEET_ID` (optional) — Business Model Canvas spreadsheet ID
- Returns `{available: false}` if required env vars are missing

### Current Local Verification Status
- Confirmed locally in `.env`:
  - `GOOGLE_SHEETS_ID` → legacy CRM pipeline workbook (`CRM - Core`, `LEAD_FLOWS`)
  - `EXECUTION_SPREADSHEET_ID` → execution workbook with exact matches for `PROJECTS`, `TASKS`, `PEOPLE & CAPACITY`, `CAMPAIGNS`, `EXECUTIVE DASHBOARD`, `TIME TRACKING`
  - `APP_LOGGING_SPREADSHEET_ID` → app workbook with exact matches for `Login` and `BrainDump`
  - `BMC_SPREADSHEET_ID` → BMC workbook with exact matches for the 11 BMC sections used by the app
- Still pending final verification:
  - `STRATEGY_SPREADSHEET_ID`

---

## Data Hydration Service (`server/services/hydration.js`)

### Key Functions
| Function | Returns | Cached | Notes |
|----------|---------|--------|-------|
| `normalizeId(id)` | string | — | Normalize ID values for consistent lookup (strips leading zeros from numeric IDs, returns alphanumeric as-is) |
| `hydrateData(data, sheetKey, allData)` | object[] | — | Resolve FK references in row objects; appends `*_resolved` columns with human-readable values |
| `hydrateSheetData(sheetKey)` | {available: true, headers[], rows[]} | Yes | Fetch sheet via fetchSheet(), hydrate all FK references, return enriched data |

### HYDRATION_MAP (24 FK relationships)
Maps foreign key references across sheets:
- **PROJECTS:** owner_User_id → PEOPLE.full_name, business_unit_id → BUSINESS_UNITS.bu_name
- **TASKS:** assignee/reporter → PEOPLE.full_name, Project id → PROJECTS.Project Name
- **PEOPLE:** manager_id → PEOPLE.full_name (self-reference)
- **BUSINESS_UNITS:** owner → PEOPLE.full_name, flywheel_id → FLYWHEEL.flywheel_name
- **TOUCHPOINTS:** bu_id → BUSINESS_UNITS.bu_name
- **BMC sections (11):** Business units → segments, team → hubs/business units, revenue/cost/channels → owner/platform/segment references, etc.

Each hydrated row receives appended columns: `${sourceColumnId}_resolved` with the human-readable value from the target sheet.

---

## GitHub Service (`server/services/github.js`)

### Key Functions
| Function | Returns | Cached | Notes |
|----------|---------|--------|-------|
| `isConfigured()` | boolean | — | Check if GITHUB_TOKEN env var is set |
| `getRepoActivity(owner, repo)` | {available, commits[], openPRs[], openIssues[], stats} OR {available: false} | Yes | 5-min TTL; graceful degradation |
| `clearCache()` | — | — | Clear in-memory GitHub cache |

---

## System Map Service (`server/services/system-map-service.js`)

### Key Functions
| Function | Returns | Cached | Notes |
|----------|---------|--------|-------|
| `buildSystemMap(force)` | {routes[], modules[], notionDatabases[], sheets[], docs{}, agents[], generatedAt} | Yes, 60s | Scans codebase for routes, modules, Notion DB configs, Sheets IDs, docs inventory, and agent configs; `force=true` busts cache |

### Internals
- `extractRoutes()` — Scans `server/routes/*.js` for `router.METHOD(path)` statements; pulls preceding JSDoc comments for descriptions
- `extractModules()` — Scans `src/js/modules/*.js` for module exports; cross-references against `index.html` for which view uses each module
- `extractNotionDatabases()` — Parses `.claude/docs/notion-hub.md` DATABASE MAP table + per-DB property sections
- `extractSheets()` — Parses `server/config.js` for `*_SPREADSHEET_ID` references and checks their presence in `process.env`
- `extractDocs()` — Lists `.claude/docs/` files and recent session headers from `data/sessions/handoff.md`
- `extractAgents()` — Scans `.claude/agents/*.md` for agent descriptions in frontmatter

---

## Notebooks Service (`server/services/notebooks.js`)

### Key Functions
| Function | Returns | Cached | Notes |
|----------|---------|--------|-------|
| `getNotebookRegistry()` | {available: true, categories[], notebooks[]} OR {available: false} | Yes | Parses `nlm-notebook-registry.md` from Colin workspace into structured JSON; 5-min TTL |
| `clearCache()` | — | — | Clear in-memory notebooks cache |

### Output Structure
```json
{
  "available": true,
  "categories": [
    { "name": "string", "description": "string", "count": number }
  ],
  "notebooks": [
    {
      "id": "string (slugified name)",
      "name": "string",
      "category": "string",
      "description": "string",
      "source": "string",
      "tags": ["string"],
      "isShared": boolean
    }
  ]
}
```

---

## Claude Tools (for agent chat)

### Notion Tools (`server/tools/notion-tools.js`)
| Tool | Approval | Input |
|------|----------|-------|
| `notion_query_database` | No | database_id, filter?, sorts?, page_size? |
| `notion_get_page` | No | page_id |
| `notion_create_page` | **Yes** | database_id, properties |
| `notion_update_page` | **Yes** | page_id, properties |

### File Tools (`server/tools/file-tools.js`)
| Tool | Approval | Input |
|------|----------|-------|
| `read_file` | No | file_path |
| `write_file` | **Yes** | file_path, content |
| `list_files` | No | directory |

### Marketing AI Tools (`server/tools/marketing-tools.js`)
| Tool | Approval | Input | Purpose |
|------|----------|-------|---------|
| `customer_psychology_generator` | No | segment, context? | Generate deep customer psychology profile (motivations, fears, decision triggers, messaging angles) |
| `competitor_analysis` | No | competitor, focus? | Analyze competitor positioning, strengths, weaknesses, pricing, opportunity gaps, counter-positioning |
| `content_strategy_generator` | No | topic, audience?, goal?, channels? | Generate content pillars, formats, distribution channels, cadence, sample 2-week calendar |
| `campaign_ideator` | No | product, goal, budget?, timeline? | Generate 3-5 campaign concepts with hook, messaging, channels, budget range, expected outcomes |

### Store Expert Tool (`server/tools/store-tools.js`)
| Tool | Approval | Input | Purpose |
|------|----------|-------|---------|
| `store_expert_query` | No | query, category? | Query YourDesignStore.in knowledge base (products, pricing, policies, delivery, FAQs); category enum: products, pricing, policies, delivery, faq, hours, general |
| `store_expert_update` | **Yes** | key, content | Update knowledge base (ke.g., kb_products_tshirts, kb_policy_returns, kb_pricing_bulk); writes to COLIN_WORKSPACE/knowledge/store/ with path traversal protection |

---

## CSS Architecture (`public/css/styles.css`)

### Design Tokens (`:root`)
- Colors: `--bg-primary`, `--bg-secondary`, `--bg-card`, `--bg-hover`, `--bg-input`, `--accent`, `--accent-dim`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border`, `--border-light`, `--red`, `--amber`, `--green`, `--purple`
- Typography: `--font-ui` (Inter), `--font-mono` (JetBrains Mono)
- Spacing: `--radius` (6px), `--radius-lg` (10px)
- Motion: `--transition-fast` (150ms), `--transition-normal` (200ms), `--transition-slow` (300ms)
- Shadows: `--shadow-card`, `--shadow-elevated`, `--shadow-overlay`

### Major Sections
Header → Layout → Sidebar Nav → Content → Chat Layout → Messages → Chat Input → Buttons → Skill Buttons → Approval Card → Tool Indicator → Dashboard → KPI Cards → Badge System → Decisions View → Stale Badges → Team Badges → Team → Documents → Notion Browser → Related Pages → Registry View → Knowledge Base View → Command Palette → Scrollbar → Detail Sidebar → Mobile Responsive Pass (@768px, @480px) → Mobile Bottom Navigation → Keyboard Shortcut Hints → Bulk Actions → Checkbox Styling → Utility Classes

### Patterns
- Cards: `background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-card)`
- Hover lift: `background: var(--bg-hover); box-shadow: var(--shadow-elevated); transform: translateY(-1px)`
- Badges: `.badge` with `data-status`, `data-health`, `data-priority` attributes; `.badge-stale` (amber, pulsing, projects with no edits in 7+ days); `.badge-overload` (red, persons with overdueCount ≥3 or activeCommitmentCount ≥8); `.badge-blocked-count` (amber, persons with blockedCount ≥2)
- Skeleton loading: `.skeleton`, `.skeleton-text`, `.skeleton-card`, `.skeleton-kpi`
- Shared properties: `.prop-row`, `.prop-key`, `.prop-val`, `.prop-link`
- Team roles: `.team-role-label` class on role badges
- Registry cards: `.registry-view`, `.registry-grid` (responsive grid), `.reg-card` (card container), `.reg-status-badge` (status color), `.reg-type-badge` (type label), `.reg-tech-pill` (technology tags), `.reg-link` (project link styling)
- Knowledge Base: `.knowledge-view`, `.kb-stats` (stat summary cards), `.kb-filters` (search + category filter bar), `.kb-category` (category section header), `.kb-grid` (responsive notebook grid), `.kb-card` (individual notebook card), `.kb-source-badge` (source label), `.kb-shared-tag` (shared indicator)
- Marketing Ops: `.mktops-view` (main container), `.mktops-stats` (stat summary cards), `.mktops-tabs` (tab buttons), `.mktops-campaign-board` (kanban board for campaigns), `.mktops-content-board` (kanban board for content), sequence health indicators, campaign status badges, alert banners
- Marketing Ops Sequences: `.mktops-sequence-board` (5-column kanban for journey stages), `.view-toggle-group` (button group container), `.view-toggle-btn` (Table/Journey toggle button), `.view-toggle-active` (active toggle state)
- Marketing Ops Campaign Actions: `.kanban-card-actions` (action button container on hover), `.action-btn` (base action button style in kanban context), `.action-btn-danger` (danger state for delete/archive actions), `.action-btn-spinner` (loading spinner inside action button)
- Marketing Ops Campaign Commitments: `.detail-commitments` (commitments section in detail panel), `.commitment-item` (individual commitment row), `.commitment-name` (commitment title), `.commitment-overdue` (overdue indicator), `.commitment-blocked` (blocked status)
- Marketing Ops Key Metrics: `.mktops-metrics` (metrics callout container), `.metrics-toggle` (toggle button), `.metrics-body` (expanded metrics grid), `.metric-card` (individual metric card), `.metric-label` (metric name), `.metric-value` (numeric value), `.metric-unit` (unit label), `.metric-target` (target/goal value), `.metric-progress` (progress container), `.metric-progress-bar` (animated progress bar fill)
- Tech Team: `.tech-view` (main container), `.tech-stats` (stat cards), `.tech-tabs` (scrollable tabs), `.tech-sprint-board` (6-col kanban), `.tech-blocked-col` (blocked column red tint), `.tech-bug-metrics` + `.tech-bar-*` (bug breakdown bars), `.tech-spec-board` (3-col spec pipeline), `.tech-decision-timeline` + `.tech-decision-card` (expandable decision cards), `.tech-velocity-*` (CSS bar charts), `.tech-roadmap` (3-col roadmap grid), `.tech-command-grid` + `.tech-widget` (command center widgets), `.tech-strategy-*` (cascade tree), `.tech-type-badge` (bug/feature/task/spike/chore colors), `.tech-priority-pill` (priority level colors), `.tech-system-tag` (system labels)

### Mobile Responsive (new)
- **@768px (tablet):** `.logo-accent` hidden, `.global-metrics` height auto, `.dashboard-view` padding 1rem, `.health-chip` min-width 110px, `.morning-brief` tightened padding, `.focus-area-stats` full width, `.data-table` 12px font, `.queue-item-top` stacked, `.bulk-actions` wraps, `.modal-card` full width, `.sidebar` hidden, `.content` gets 56px bottom padding for mobile nav
- **@480px (phone):** `.kpi-row` single column, `.health-chip` min-width 100px, `.data-table` 11px font + tighter padding, `.commitment-actions` stacked vertically, `.global-metrics` vertical layout
- **Mobile Bottom Navigation:** Fixed 56px bar at bottom (visible ≤768px), replaces sidebar; 4 buttons (Dash, Queue with badge, Chat, Team); CSS classes `.mobile-nav`, `.mobile-nav-btn`, `.mobile-nav-active`, `.mobile-nav-badge`

---

## Keyboard Shortcuts

| Chord/Key | Action |
|-----------|--------|
| `/` | Open command palette |
| `g` + `h` | Navigate to Dashboard |
| `g` + `t` | Navigate to Team |
| `g` + `q` | Navigate to Queue |
| `g` + `p` | Navigate to Projects |
| `g` + `l` | Navigate to Decision Log |
| `g` + `r` | Navigate to Registry |
| `g` + `k` | Navigate to Knowledge Base |
| `g` + `c` | Navigate to Chat |
| `g` + `d` | Navigate to Docs |
| `g` + `m` | Navigate to Marketing Ops |
| `g` + `e` | Navigate to Tech Team |
| `g` + `b` | Navigate to Business Model Canvas |
| `g` + `i` | Navigate to CRM |
| `n` + `c` | New commitment (open modal) |
| `n` + `d` | New decision (open modal) |

**Behavior:** Vim-style chords with 500ms timeout between keys. Only fires outside input/textarea/select elements.

---

## Agents

| Agent | File | Model | Owns | Trigger |
|-------|------|-------|------|---------|
| frontend-builder | `.claude/agents/frontend-builder.md` | Sonnet | `public/` | UI changes, new views, CSS, app.js |
| backend-builder | `.claude/agents/backend-builder.md` | Sonnet | `server/`, `test/` | API routes, services, tools, tests |
| design-planner | `.claude/agents/design-planner.md` | Haiku | `design-system/` | Before UI work |
| code-reviewer | `.claude/agents/code-reviewer.md` | Opus | read-only | After any code changes |
| ux-auditor | `.claude/agents/ux-auditor.md` | Haiku | read-only | After UI changes |
| pixel | `.claude/agents/pixel.md` | Sonnet | generated images | Hero graphics, visuals |
| devops-infra | `.claude/agents/devops-infra.md` | Haiku | config | Deployment, env config |

---

## Tests

| File | Tests | Coverage |
|------|-------|----------|
| `test/approval.test.js` | Approval gate: create, approve, reject, unknown ID | `server/services/approval.js` |
| `test/tools.test.js` | Tool schemas: 7 tools, required fields, approval flags | `server/tools/*.js` |
| `test/notion-service.test.js` | Notion: module load, exports, databases, key pages, simplify() | `server/services/notion.js` |
| `test/morning-brief.test.js` | getMorningBrief export, computeCommitmentScore (weights, overdue bonus, sorting), output shape, severity/overload thresholds | `server/services/notion.js` |
| `test/focus-area-detail.test.js` | Route + service module loads, detail enrichment logic (overdue, owner names, date formats, sort), person metrics (capacity, counts) | `server/routes/notion.js`, `server/services/notion.js` |
| `test/create-commitment.test.js` | Create commitment/decision exports, validation logic, response shape | `server/routes/commitments.js`, `server/routes/decisions.js` |
| `test/action-queue.test.js` | Queue filtering, severity sorting, Dan vs Runner queue separation | `server/routes/notion.js` |
| `test/sheets-service.test.js` | Module load, isConfigured(), getPipelineData() graceful degradation, cache | `server/services/sheets.js` |
| `test/commitments-write.test.js` | Create commitment POST payload, approval flow, Notion write | `server/routes/commitments.js` |
| `test/factory-config.test.js` | Factory pattern, route exports | `server/routes/factory.js` |
| `test/notebooks.test.js` | Route loading, service exports, full parse validation, structure, categories, notebooks array | `server/routes/notebooks.js`, `server/services/notebooks.js` |
| `test/marketing-ops.test.js` | Route loading, service functions (getCampaigns, getContentCalendar, getSequences, getSessionsLog, getMarketingOpsSummary), 5 endpoints, optional filters | `server/routes/marketing-ops.js`, `server/services/notion.js` |
| `test/tech-team.test.js` | Route loading, notion service exports (6 functions), GitHub service exports + unconfigured behavior, database registration (4 DBs), PATCH validation (property/value whitelist), sheets cascade export | `server/routes/tech-team.js`, `server/services/notion.js`, `server/services/github.js`, `server/services/sheets.js` |
| `test/sheets-service.test.js` | Module load, SHEET_REGISTRY (25 sheets), isConfigured(), isSpreadsheetConfigured(), fetchSheet(), appendRow(), updateRow(), getReadWriteClient(), cache behavior | `server/services/sheets.js` |
| `test/hydration.test.js` | normalizeId() (numeric/alphanumeric handling), hydrateData() (FK resolution), hydrateSheetData() (integration with sheets), HYDRATION_MAP (24 relationships) | `server/services/hydration.js` |
| `test/bmc.test.js` | Route loading, GET / (all 11 sections parallel), GET /:section (single section), graceful degradation, stats computation, hydration integration | `server/routes/bmc.js`, `server/services/hydration.js` |
| `test/crm.test.js` | Route loading, 8 endpoints (GET /, /people, /projects, /tasks, /campaigns, /business-units, POST /tasks, PATCH /tasks/:rowIdx), optional filters, hydration integration | `server/routes/crm.js`, `server/services/hydration.js`, `server/services/sheets.js` |
| `test/marketing-tools.test.js` | 4 tool definitions, approval flags (all No), input schemas, customer_psychology_generator, competitor_analysis, content_strategy_generator, campaign_ideator | `server/tools/marketing-tools.js` |
| `test/store-tools.test.js` | 2 tool definitions, approval flags (store_expert_query No, store_expert_update Yes), input schemas, path traversal protection | `server/tools/store-tools.js` |
| `test/system-map.test.js` | Module load, buildSystemMap() export, caching behavior (60s TTL), force cache bust | `server/services/system-map-service.js` |
| `test/integration/system-map-http.test.js` | GET /api/system-map route, response shape (routes[], modules[], notionDatabases[], sheets[], docs, agents[]), cache control | `server/routes/system-map.js` |

Run: `npm test` (Node built-in runner, ~180ms)

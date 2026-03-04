# YDS Command Centre — App Reference

**Purpose:** Single source of truth for what exists in the app. Read this before building anything. Update this when you change the app.

**Last updated:** 2026-03-04

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
| GET | `/api/notion/dashboard` | Full dashboard summary (6 parallel queries + enrichment) |
| GET | `/api/notion/focus-areas` | All focus areas |
| GET | `/api/notion/commitments/overdue` | Overdue commitments (due < today, not done/cancelled) |
| GET | `/api/notion/commitments/upcoming` | Upcoming commitments (?days=7, max 90) |
| GET | `/api/notion/decisions` | Recent decisions (?days=30, max 365) |
| GET | `/api/notion/people` | All people |
| GET | `/api/notion/projects` | All projects with resolved relations |
| GET | `/api/notion/databases` | List 7 known databases (static) |
| GET | `/api/notion/databases/:id` | Query database entries (?cursor, ?pageSize) |
| GET | `/api/notion/pages/:id` | Page properties with resolved relations |
| GET | `/api/notion/pages/:id/content` | Page blocks as markdown |
| GET | `/api/notion/pages/:id/related` | Related pages via relation properties |
| GET | `/api/notion/key-pages` | 4 key pages (static) |
| POST | `/api/notion/cache/clear` | Clear 5-min TTL cache |

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

---

## Frontend Views

| View | Nav button | Load method | Data source |
|------|-----------|-------------|-------------|
| `chat` | Chat | — (always ready) | POST /api/chat (SSE) |
| `dashboard` | Dash | `loadDashboard()` | GET /api/notion/dashboard |
| `team` | Team | `loadTeam()` | GET /api/notion/people |
| `docs` | Docs | `loadDocuments()` | GET /api/documents |
| `notion` | Notion | `loadNotion()` | GET /api/notion/databases + key-pages |

### Dashboard shows:
- 4 KPI cards: Focus Areas (with health bar), Overdue Items, Recent Decisions, Team count
- Focus Area grid cards (clickable → detail sidebar)
- Overdue commitments table (with notes preview, priority, owner names resolved)
- Upcoming this week table (with notes preview, priority, owner names resolved)
- Recent decisions (expandable cards with Context, Decision, Rationale, Risks, Alternatives)

### Notion browser shows:
- Database picker grid (7 databases)
- Key pages list (4 pages)
- Entry list with search + status filter + pagination
- Page viewer with properties + related pages + markdown content

### Detail sidebar:
- Slide-in panel (450px / 90vw on mobile)
- Shows properties + markdown content for any entity
- Opened from: dashboard cards, dashboard tables, team cards, notion entries

### Command palette (Cmd+K):
- Searches: navigation views, databases, key pages, skills
- Arrow keys + Enter to execute

---

## State Variables (app.js)

### Core
`view`, `connected`

### Chat
`messages[]`, `inputText`, `streaming`, `streamingText`, `pendingApprovals[]`, `activeTools[]`

### Dashboard
`dashboard`, `dashboardLoading`, `upcomingCommitments[]`, `expandedDecision`

### Team
`teamData[]`, `teamLoading`

### Documents
`documents{briefings, decisions, weekly-reviews}`, `docsTab`, `docsLoading`, `activeDoc`

### Notion Browser
`notionDatabases[]`, `notionEntries[]`, `notionLoading`, `notionActiveDb`, `notionActivePage`, `notionPageContent`, `notionKeyPages[]`, `notionHasMore`, `notionNextCursor`, `notionRelated`, `notionRelatedLoading`, `notionSearchQuery`, `notionFilterStatus`

### Detail Panel
`detailPanel` (null or {id, name, url, properties, content, loading})

### Command Palette
`cmdPaletteOpen`, `cmdSearch`, `cmdSelectedIndex`

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

### Key Functions
| Function | Returns | Cached | Notes |
|----------|---------|--------|-------|
| `simplify(props)` | Plain values | — | title→string, date→{start,end}, relation→[ids], etc. |
| `resolveRelations(props)` | {id,name} objects | Via getPageRaw | Converts UUID arrays to named objects |
| `getFocusAreas()` | area[] | Yes | Up to 20 |
| `getOverdueCommitments()` | commitment[] | Yes | Due < today, not Done/Cancelled |
| `getUpcomingCommitments(days)` | commitment[] | Yes | Default 7 days |
| `getRecentDecisions(days)` | decision[] | Yes | Default 30, sorted desc |
| `getPeople()` | person[] | Yes | Up to 30 |
| `getProjects()` | project[] | Yes | Paginates all |
| `getAllCommitments()` | commitment[] | Yes | Paginates all |
| `getDashboardSummary()` | {focusAreas, overdue, upcoming, recentDecisions, people, healthDistribution, timestamp} | Via sub-calls | 7 parallel queries, enriches with counts + names |
| `queryDatabase(id, opts)` | {results, hasMore, nextCursor} | Yes | Generic, resolves relations |
| `getPage(id)` | {id, url, created, updated, properties} | Yes | Relations resolved |
| `getPageContent(id)` | {blocks, markdown} | Yes | Recursive to depth 2 |
| `getRelatedPages(id)` | {relationName: [{id, name, status, health, priority, dueDate}]} | Yes | Up to 10 per relation |

### Infrastructure
- **Cache:** In-memory Map, 5-min TTL, cleared via `clearCache()`
- **Dedup:** `deduplicatedFetch()` prevents concurrent identical requests
- **Retry:** `withRetry()` — 3 attempts, exponential backoff on 429/5xx
- **Stable keys:** `stableStringify()` for consistent cache keys regardless of object key order

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

---

## CSS Architecture (`public/css/styles.css`)

### Design Tokens (`:root`)
- Colors: `--bg-primary`, `--bg-secondary`, `--bg-card`, `--bg-hover`, `--bg-input`, `--accent`, `--accent-dim`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border`, `--border-light`, `--red`, `--amber`, `--green`, `--purple`
- Typography: `--font-ui` (Inter), `--font-mono` (JetBrains Mono)
- Spacing: `--radius` (6px), `--radius-lg` (10px)
- Motion: `--transition-fast` (150ms), `--transition-normal` (200ms), `--transition-slow` (300ms)
- Shadows: `--shadow-card`, `--shadow-elevated`, `--shadow-overlay`

### Major Sections
Header → Layout → Sidebar Nav → Content → Chat Layout → Messages → Chat Input → Buttons → Skill Buttons → Approval Card → Tool Indicator → Dashboard → KPI Cards → Badge System → Team → Documents → Notion Browser → Related Pages → Command Palette → Scrollbar → Detail Sidebar → Responsive (@768px) → Utility Classes

### Patterns
- Cards: `background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-card)`
- Hover lift: `background: var(--bg-hover); box-shadow: var(--shadow-elevated); transform: translateY(-1px)`
- Badges: `.badge` with `data-status`, `data-health`, `data-priority` attributes
- Skeleton loading: `.skeleton`, `.skeleton-text`, `.skeleton-card`, `.skeleton-kpi`
- Shared properties: `.prop-row`, `.prop-key`, `.prop-val`, `.prop-link`

---

## Agents

| Agent | File | Model | Trigger |
|-------|------|-------|---------|
| builder | `.claude/agents/builder.md` | Sonnet | All code changes |
| code-reviewer | `.claude/agents/code-reviewer.md` | Opus | After code changes |
| ux-auditor | `.claude/agents/ux-auditor.md` | Haiku | After UI changes |
| devops-infra | `.claude/agents/devops-infra.md` | Haiku | Deployment, env config |

---

## Tests

| File | Tests | Coverage |
|------|-------|----------|
| `test/approval.test.js` | Approval gate: create, approve, reject, unknown ID | `server/services/approval.js` |
| `test/tools.test.js` | Tool schemas: 7 tools, required fields, approval flags | `server/tools/*.js` |
| `test/notion-service.test.js` | Notion: module load, exports, databases, key pages, simplify() | `server/services/notion.js` |

Run: `npm test` (Node built-in runner, ~80ms)

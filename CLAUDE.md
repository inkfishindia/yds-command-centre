# YDS Command Centre

Browser-based interface for Colin (AI Chief of Staff) at YourDesignStore. Gives Dan (CEO) streaming chat with Claude Opus, Notion database browsing, an operations dashboard, skill triggers, and document viewing.

## Stack

Node.js + Express · Alpine.js SPA · Anthropic Claude SDK (Opus) · Notion SDK · SSE · Lightweight asset build (`npm run build`)

## Architecture

```
Browser (Alpine.js SPA)
        |
        | static shell + JSON/SSE
        v
Express Server (server.js)
        |
        +-- Routes (controller-thin HTTP layer)
        |
        +-- Domain services (dashboard, projects, CRM, marketing ops, tech team, factory)
        |
        +-- Infrastructure services (Notion, Sheets, hydration, GitHub, approvals, agent loop)
        |
        +-- Tool handler / approval gate
        |
        +-- Claude API
```

## File Map

```
server.js                          # Express entry, middleware, static serving
server/config.js                   # Env vars, model config, workspace paths
server/routes/
  chat.js                          # POST /api/chat (SSE stream), approval resolve
  notion.js                        # Notion-backed read routes
  commitments.js                   # Commitment write routes
  decisions.js                     # Decision write routes
  crm.js                           # CRM endpoints
  marketing-ops.js                 # Marketing operations endpoints
  tech-team.js                     # Tech team endpoints
  factory.js                       # Factory config + simulation endpoints
  bmc.js                           # Business Model Canvas endpoints
  registry.js                      # Internal project registry endpoints
  sheets.js                        # Registered Google Sheets access
  documents.js                     # Briefings, decisions, weekly reviews
  skills.js                        # List available skill buttons
server/services/
  agent.js                         # Claude API agentic loop (tool use cycle)
  notion.js                        # Notion SDK wrapper, 5-min cache, raw query primitives
  dashboard-service.js             # Dashboard summary + action queue composition
  projects-service.js              # Project enrichment + commitment stats
  notion-detail-service.js         # Focus area + person detail composition
  crm-service.js                   # CRM aggregation/filtering
  marketing-ops-service.js         # Marketing Ops aggregation/filtering
  tech-team-service.js             # Tech Team aggregation/catalog composition
  factory-service.js               # Factory config read/write orchestration
  sheets.js                        # Google Sheets access + cache
  hydration.js                     # FK hydration between sheet datasets
  github.js                        # GitHub repo activity wrapper
  prompts.js                       # Load system prompt from Colin's workspace
  approval.js                      # Promise-based write approval queue
server/tools/
  notion-tools.js                  # Tool schemas: query, get, create, update
  file-tools.js                    # Tool schemas: read, write, list
  tool-handler.js                  # Central dispatch + Notion property converter
public/
  index.html                       # SPA shell (Alpine.js templates)
  js/app.js                        # Built frontend bundle copied from src/js
  css/styles.css                   # Dark theme, responsive layout
src/js/
  app.js                           # Root shell + shared utilities + module composition
  modules/                         # Domain frontend modules (chat, dashboard, commitments, factory, command-shell, CRM, etc.)
.claude/
  agents/                          # Agent configs (frontend-builder, backend-builder, code-reviewer, devops-infra, ux-auditor, pixel, design-planner, tester, scribe)
  rules/                           # Coding patterns (frontend, server, token efficiency)
  skills/ui-ux-pro-max/            # Design intelligence: 50+ styles, 97 palettes, 57 font pairings, UX guidelines
  docs/app-reference.md            # FULL APP INVENTORY — routes, views, state, methods, CSS, tools. Read before building.
  docs/notion-hub.md               # Notion database IDs, people IDs, property schemas, write templates
  docs/tech-brief.md               # Technical architecture brief
```

## Critical Patterns

1. **Approval Gate** — All writes pause, send SSE `approval` event, wait for Dan. Never bypass.
2. **Agent Loop** — Claude responds → tool calls → execute/approve → feed back → repeat until `end_turn`.
3. **Thin Routes** — Express routes validate/request-shape/HTTP concerns; business orchestration belongs in domain services.
4. **Notion + Sheets Infrastructure** — raw SDK/data access stays in infrastructure services; domain services compose product-facing payloads.
5. **Frontend Modules** — keep domain state in `src/js/modules/*`; `src/js/app.js` should remain a shell/composition layer, not a dumping ground.
6. **Build Step Exists** — edit `src/js/*`, then build to `public/js/*`.

## Agent Routing

| Task | Agent | Model | Owns |
|------|-------|-------|------|
| Design planning | `design-planner` | Haiku | `design-system/` |
| Frontend code | `frontend-builder` | Sonnet | `src/js/`, `public/`, `css/` |
| Backend code | `backend-builder` | Sonnet | `server/`, `test/`, `server.js` |
| Quality gate | `code-reviewer` | Haiku | read-only review |
| UX consistency | `ux-auditor` | Haiku | read-only audit |
| Image generation | `pixel` | Sonnet | `~/Documents/nanobanana_generated/` |
| Deploy/infra | `devops-infra` | Haiku | config files |
| Integration tests | `tester` | Haiku | `test/integration/` |
| Documentation | `scribe` | Haiku | `.claude/docs/` |

**File ownership is exclusive** — only one builder agent writes to each file area. This prevents conflicts and keeps context focused.

## Workflows — Follow the Full Pipeline

**UI / Frontend changes:**
`design-planner` → `pixel` (if visuals needed) → `frontend-builder` → `code-reviewer` → `ux-auditor`

**Backend changes:**
`backend-builder` → `code-reviewer`

**New page or feature (full-stack):**
`design-planner` → `backend-builder` (API first) → `frontend-builder` (UI that calls it) → `code-reviewer` → `ux-auditor`

**Frontend bug fix:**
`frontend-builder` → `code-reviewer` → `ux-auditor`

**Backend bug fix:**
`backend-builder` → `code-reviewer`

**Infrastructure / deploy:**
`devops-infra` → `code-reviewer`

**After code changes (always):**
`code-reviewer` → `tester` (tests) → `scribe` (update docs)

The lead session orchestrates — call each agent in order, passing context forward. For full-stack features, backend-builder's handoff tells frontend-builder the new endpoint shape.

**Dispatch rules:**
- **Always foreground** — never use `run_in_background` for review agents (code-reviewer, ux-auditor, tester, scribe). Background agents orphan when sessions end and burn tokens indefinitely.
- **Parallel OK** — independent review agents (e.g., code-reviewer + ux-auditor) can run as parallel foreground calls in one message.
- **Proportional review** — trivial fixes (typos, config, single-line) go straight to code-reviewer only. Full pipeline (design-planner → builder → reviewer → auditor → tester → scribe) is for features and multi-file changes.

## How to Run

```bash
cp .env.example .env     # Add ANTHROPIC_API_KEY and NOTION_TOKEN
npm install
npm test                 # Run tests (node built-in runner)
npm run lint             # ESLint — errors only (no style warnings)
npm run dev              # http://localhost:3000 (watch mode)

# Enable pre-commit hook (lint + test before every commit):
git config core.hooksPath .githooks
```

## Env Vars

| Variable | Required | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | — |
| `NOTION_TOKEN` | Yes | — |
| `PORT` | No | 3000 |
| `COLIN_WORKSPACE` | No | `../dan` |

## Rules

- Never modify `../dan/` (Colin's workspace) — read only
- Never bypass approval gate for writes
- CommonJS only on server (`require`/`module.exports`)
- Alpine.js only on frontend (no React)
- Frontend source lives in `src/js`; built assets live in `public/js`
- Keep route handlers thin; move aggregation/enrichment into domain services
- Raw Notion access goes through `server/services/notion.js`; route/view payload composition goes in domain services
- Dates from Notion are `{start, end}` objects — handle in templates

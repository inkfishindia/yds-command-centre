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
server/routes/                     # Controller-thin HTTP layer
  chat.js                          # POST /api/chat (SSE stream), approval resolve
  notion.js                        # Notion-backed read routes
  commitments.js                   # Commitment write routes
  decisions.js                     # Decision write routes
  dan-colin.js                     # Dan ↔ Colin Queue: GET queue, POST answer, POST drop
  crm.js                           # CRM endpoints
  marketing-ops.js                 # Marketing operations endpoints
  tech-team.js                     # Tech team endpoints
  factory.js                       # Factory config + simulation endpoints
  bmc.js                           # Business Model Canvas endpoints
  ceo-dashboard.js                 # CEO dashboard composition
  ops.js                           # Operations dashboard
  overview.js                      # Cross-domain overview (read-model backed)
  activity-feed.js                 # Recent decisions + commitments + queue resolutions
  competitor-intel.js              # Competitor intelligence
  system-map.js                    # System map / view registry
  ai-team.js                       # AI team metadata
  read-models.js                   # Read-model status, refresh triggers
  health.js                        # Liveness + env-key visibility
  registry.js                      # Internal project registry endpoints
  sheets.js                        # Registered Google Sheets access
  documents.js                     # Briefings, decisions, weekly reviews
  notebooks.js                     # Knowledge base notebook registry
  skills.js                        # List available skill buttons
server/services/                   # Infrastructure + domain orchestration
  agent.js                         # Claude API agentic loop (tool use cycle)
  notion.js                        # Notion SDK wrapper, 5-min cache, raw query primitives
  sheets.js                        # Google Sheets access + cache
  hydration.js                     # FK hydration between sheet datasets
  github.js                        # GitHub repo activity wrapper
  google-calendar.js               # Google Calendar wrapper
  db.js + db-migrations.js         # Postgres client + migration runner (optional persistence)
  prompts.js                       # Load system prompt from Colin's workspace
  approval.js                      # Promise-based write approval queue
  dashboard-service.js             # Dashboard summary + action queue composition
  ceo-dashboard-service.js         # CEO-level KPI roll-up
  projects-service.js              # Project enrichment + commitment stats
  notion-detail-service.js         # Focus area + person detail composition
  crm-service.js                   # CRM aggregation/filtering
  marketing-ops-service.js         # Marketing Ops aggregation/filtering
  tech-team-service.js             # Tech Team aggregation/catalog composition
  factory-service.js               # Factory config read/write orchestration
  ops-service.js                   # Operations aggregation
  overview-service.js              # Cross-domain overview composition (read-model)
  activity-feed-service.js         # Decision + commitment + queue activity feed
  competitor-intel-service.js      # Competitor intel aggregation
  system-map-service.js            # View/route catalog
  dan-colin-service.js             # Dan ↔ Colin Queue: getQueue/submitAnswer/createDrop
  notebooks.js                     # Notebook registry parser
  read-model-store.js              # Read-model JSON persistence (DB + filesystem fallback)
  read-model-sync.js               # Source-of-truth sync into read-models
  read-model-scheduler.js          # Background refresh scheduler
  projection-job-store.js          # Projection job queue state
server/tools/
  notion-tools.js                  # Tool schemas: query, get, create, update
  file-tools.js                    # Tool schemas: read, write, list
  marketing-tools.js               # Tool schemas: customer psych, competitor, content, campaign
  store-tools.js                   # Tool schemas: store_expert query/update
  tool-handler.js                  # Central dispatch + Notion property converter
public/
  index.html                       # SPA shell (Alpine.js templates)
  partials/                        # Per-view HTML partials lazy-loaded by command-shell
  js/app.js                        # Built frontend bundle copied from src/js
  css/styles.css                   # Dark theme, responsive layout
src/js/
  app.js                           # Root shell + shared utilities + module composition
  modules/                         # Domain frontend modules (chat, dashboard, dan-colin, factory,
                                   # command-shell, CRM, marketing-ops, tech-team, ops, overview,
                                   # competitor-intel, system-map, registry, projects, team,
                                   # notion-browser, documents, bmc, commitments, claude-usage,
                                   # read-models, system-status, detail-drawer, inline-actions,
                                   # markdown, toasts)
.claude/
  agents/                          # Agent configs (frontend-builder, backend-builder, code-reviewer, devops-infra, ux-auditor, pixel, design-planner, tester, scribe)
  rules/                           # Coding patterns (frontend, server, token efficiency, api-schemas, workflow)
  skills/ui-ux-pro-max/            # Design intelligence: 50+ styles, 97 palettes, 57 font pairings, UX guidelines
  docs/app-reference.md            # FULL APP INVENTORY — routes, views, state, methods, CSS, tools. Read before building.
  docs/notion-hub.md               # Notion database IDs, people IDs, property schemas, write templates
  docs/tech-brief.md               # Technical architecture brief (older; cross-check against app-reference.md if conflict)
docs/architecture/                 # Forward-looking architecture pack — READ for roadmap context
  README.md                        # How to use the pack
  target-architecture.md           # Where the platform is heading
  database-schema-plan.md          # Postgres schema target + migration shape
  phased-refactor-roadmap.md       # Phase 0/1/2 plan — what to refactor and in what order
  postgres-test-pass.md            # DB test strategy
db/migrations/                     # Postgres migration files (run via server/services/db-migrations.js)
data/schemas/                      # Captured API response samples (Notion/Sheets/GitHub). Gitignored; regenerate via scripts/capture-schemas.js.
data/sessions/                     # Per-session log: handoff.md, activity-log.md, decisions.md, open-loops.md
design-system/                     # Design specs (TOKENS, CSS-PATTERNS, INDEX, page briefs)
scripts/capture-schemas.js         # One-shot: calls live services, saves real response shapes to data/schemas/.
```

## Critical Patterns

1. **Approval Gate** — All writes pause, send SSE `approval` event, wait for Dan. Never bypass.
2. **Agent Loop** — Claude responds → tool calls → execute/approve → feed back → repeat until `end_turn`.
3. **Thin Routes** — Express routes validate/request-shape/HTTP concerns; business orchestration belongs in domain services.
4. **Notion + Sheets Infrastructure** — raw SDK/data access stays in infrastructure services; domain services compose product-facing payloads.
5. **Frontend Modules** — keep domain state in `src/js/modules/*`; `src/js/app.js` should remain a shell/composition layer, not a dumping ground.
6. **Build Step Exists** — edit `src/js/*`, then build to `public/js/*`.

## Roadmap & Architecture Direction

The forward-looking architecture pack lives in **[`docs/architecture/`](docs/architecture/)**. Read it when planning non-trivial work:

- `target-architecture.md` — where the platform is heading (durable state ownership, clearer read/write boundaries, less direct dependence on Notion/Sheets at request time)
- `phased-refactor-roadmap.md` — Phase 0 (stabilize) → Phase 1 (read-model layer) → Phase 2+ (durable state) — staged so feature work doesn't freeze
- `database-schema-plan.md` — Postgres schema target
- `postgres-test-pass.md` — DB test strategy

The read-model layer (`server/services/read-model-*.js`, `server/routes/read-models.js`, `server/routes/overview.js`) is Phase 1 in flight. New cross-domain views should prefer the read-model path over direct Notion calls.

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
- **Continue agents across pipeline steps via `SendMessage`.** For review gates (code-reviewer, ux-auditor, scribe, tester) running across multiple builds in one session, spawn the agent once and resume with `SendMessage` on subsequent steps rather than respawning. The first spawn pays the pre-flight cost (primer + rules + context); every continuation reuses that warm context. Applies most to: reviewing backend-then-frontend in a full-stack build, writing docs for multiple changes, and iterative test-fix loops.

Worked example — full-stack feature review:
1. `backend-builder` ships API. Orchestrator spawns `code-reviewer` with `Agent({ subagent_type: "code-reviewer", prompt: "Review backend changes: [diff]" })` — pays pre-flight cost, returns an `agentId`.
2. `frontend-builder` ships UI. Orchestrator does **not** spawn a new reviewer — instead calls `SendMessage({ to: "<code-reviewer agentId>", prompt: "Now review these frontend changes: [diff]" })`. The reviewer already has the primer, rules, and backend context in its window; it only needs the new diff.
3. Same pattern for `scribe`: spawn once after the first code change, then `SendMessage` for every subsequent doc update in the session.

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

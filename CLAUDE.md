# YDS Command Centre

Browser-based interface for Colin (AI Chief of Staff) at YourDesignStore. Gives Dan (CEO) streaming chat with Claude Opus, Notion database browsing, an operations dashboard, skill triggers, and document viewing.

## Stack

Node.js + Express · Alpine.js · Anthropic Claude SDK (Opus) · Notion SDK · SSE · No build step

## Architecture

```
Browser (Alpine.js)  ←— SSE —→  Express Server  ←— SDK —→  Claude API
                                       |
                                  Tool Handler
                                 /     |     \
                            Notion   Files   Approval Gate
```

## File Map

```
server.js                          # Express entry, middleware, static serving
server/config.js                   # Env vars, model config, workspace paths
server/routes/
  chat.js                          # POST /api/chat (SSE stream), approval resolve
  notion.js                        # Dashboard, databases, pages, commitments
  documents.js                     # Briefings, decisions, weekly reviews
  skills.js                        # List available skill buttons
server/services/
  agent.js                         # Claude API agentic loop (tool use cycle)
  notion.js                        # Notion SDK wrapper, 5-min cache, all queries
  prompts.js                       # Load system prompt from Colin's workspace
  approval.js                      # Promise-based write approval queue
server/tools/
  notion-tools.js                  # Tool schemas: query, get, create, update
  file-tools.js                    # Tool schemas: read, write, list
  tool-handler.js                  # Central dispatch + Notion property converter
public/
  index.html                       # SPA shell (Alpine.js templates)
  js/app.js                        # All frontend state and methods
  css/styles.css                   # Dark theme, responsive layout
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
3. **Notion Cache** — 5-min TTL + request dedup + retry with backoff. Clear: `POST /api/notion/cache/clear`.
4. **SSE Events** — `text`, `tool_use`, `approval`, `error`, `done`. All 5 must be handled.
5. **Single State** — All frontend state in one `app()` function. No component splitting.

## Agent Routing

| Task | Agent | Model | Owns |
|------|-------|-------|------|
| Design planning | `design-planner` | Haiku | `design-system/` |
| Frontend code | `frontend-builder` | Sonnet | `public/` (index.html, app.js, styles.css) |
| Backend code | `backend-builder` | Sonnet | `server/`, `test/`, `server.js` |
| Quality gate | `code-reviewer` | Sonnet | read-only review |
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
`code-reviewer` → `tester` (integration tests) → `scribe` (update docs)

Do not skip steps. The lead session orchestrates — call each agent in order, passing context forward. For full-stack features, backend-builder's handoff tells frontend-builder the new endpoint shape.

## How to Run

```bash
cp .env.example .env     # Add ANTHROPIC_API_KEY and NOTION_TOKEN
npm install
npm test                 # Run tests (40 tests, node built-in runner)
npm run dev              # http://localhost:3000 (watch mode)
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
- Alpine.js only on frontend (no React, no build step)
- All Notion calls through `server/services/notion.js`
- Dates from Notion are `{start, end}` objects — handle in templates

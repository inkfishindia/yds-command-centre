# YDS Command Centre

@MEMORY.md

Browser-based interface for Colin (AI Chief of Staff) at YourDesignStore. Gives Dan (CEO) streaming chat with Claude Opus, Notion database browsing, an operations dashboard, skill triggers, and document viewing.

## Startup Routine

At the start of every session:
1. `MEMORY.md` — loaded automatically via @import above. Team context, preferences, current project state.
2. Read `.claude/AGENT_PRIMER.md` — auto-generated on every `npm run build`. Live architecture: routes, modules, Notion DBs, Sheets keys, agent inventory, last 3 session handoffs. Run `npm run agent-primer` if stale.
3. `data/sessions/handoff.md` — injected by SessionStart hook. What was in progress and what's next.
4. For non-trivial architectural work, also read `docs/architecture/` — target architecture, phased roadmap, Postgres schema plan.

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

**File map:** see `.claude/docs/app-reference.md` for the full file inventory.

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
| Image prompt crafting | `pixel` | Sonnet | Returns prompt text — does not generate images (see pixel.md) |
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

# AGENTS.md

Cross-tool agent baseline for this repo. Read this **first**, regardless of which tool you're running (Claude Code, OpenCode/OAC, Cursor, Antigravity, Cline, Roo, etc.).

For tool-specific overrides:
- **Claude Code** → also reads [CLAUDE.md](CLAUDE.md) (long form: pipelines, dispatch rules, env vars)
- **OpenCode CLI** → reads `opencode.json` (runtime config: provider, model). The `.opencode/` directory (OpenAgentsControl framework) was pruned on 2026-04-30 — installed but never adopted, project context never customized. Vanilla OpenCode CLI with NVIDIA→DeepSeek-V4-Pro is still available; it just runs against this `AGENTS.md`.
- **Cursor** → no `.cursorrules` yet; falls back to this file

## Project

Browser-based interface for Colin (AI Chief of Staff). Stack: Node.js + Express + Alpine.js SPA + Anthropic SDK + Notion SDK + SSE + lightweight build.

Repo: `inkfishindia/yds-command-centre` (public).

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (localhost:3000) — runs build first, then starts server with --watch |
| `npm run build` | Build frontend assets (`public/js/app.js` + CSS) + generate agent primer |
| `npm run lint` | ESLint — errors only (src/js/, server/, test/) |
| `npm test` | Run tests with Node's built-in test runner |
| `npm run db:migrate` | Run Postgres migrations |
| `npm run agent-primer` | Regenerate `.claude/AGENT_PRIMER.md` context file |
| `npm run sync:readmodels` | Sync read models from Notion/Sheets to PostgreSQL |
| `git config core.hooksPath .githooks` | Enable pre-commit lint + test |

## Critical Rules (apply to ALL tools)

- **Never modify `../dan/`** — Colin's workspace is read-only
- **Never bypass approval gate** — All writes pause for Dan's approval via SSE
- **Build step required** — Edit `src/js/`, then run `npm run build` to update `public/js/app.js`
- **CommonJS only** on server (`require`/`module.exports`)
- **Alpine.js only** on frontend (no React/Vue/Svelte)
- **Never commit secrets** — `opencode.json`, `.claude/`, source files must reference env vars only. The repo is public.

## Architecture

- **Thin routes** — Express routes validate/request-shape; business logic in services
- **Infrastructure services** — Raw Notion/Sheets access in `server/services/`
- **Domain services** — Payload composition for routes in `server/`
- **Frontend modules** — Domain state in `src/js/modules/*`
- **Entry point** — `server.js` (Express app)
- **Frontend bundle** — `public/js/app.js` (built from `src/js/app.js` + modules)
- **Read-model layer** (Phase 1 in flight) — `server/services/read-model-*.js`, `server/routes/read-models.js`. Prefer this path over direct Notion calls for new cross-domain views.

Forward-looking architecture pack: `docs/architecture/`.

## Multi-Tool Layout

```
project-root/
├── AGENTS.md             # this file — shared baseline (read first)
├── CLAUDE.md             # Claude Code overrides (pipelines, dispatch, env)
├── opencode.json         # OpenCode CLI runtime config (provider/model — NO SECRETS)
├── .env                  # secrets (gitignored)
├── .env.example          # secret template (committed)
├── .claude/              # Claude Code agents/skills/hooks/rules
│   ├── agents/           # 9 specialist agents (see "Agent Ownership" below)
│   ├── skills/
│   ├── hooks/
│   ├── rules/
│   └── docs/
└── src/, server/, public/, test/, etc.
```

The OpenAgentsControl framework (`.opencode/`) was pruned 2026-04-30 — installed but never adopted. Vanilla OpenCode CLI is still usable via `opencode.json`.

## Agent Ownership

File-area ownership is **exclusive** — only one agent writes to each area at a time. This prevents merge conflicts and keeps context focused.

| Agent | Owns (writes) | Reads-only |
|---|---|---|
| `design-planner` | `design-system/` | rest |
| `frontend-builder` | `src/js/`, `public/`, CSS | server/ |
| `backend-builder` | `server/`, `test/`, `server.js` | src/ |
| `pixel` | `~/Documents/nanobanana_generated/` | — |
| `devops-infra` | config files (vercel, eslint, package.json) | rest |
| `tester` | `test/integration/` | source |
| `scribe` | `.claude/docs/` | rest |
| `code-reviewer` | (read-only) | all |
| `ux-auditor` | (read-only) | all |

If running OpenCode CLI in parallel with Claude Code on the same files: use `git worktree` for isolation.

## Provider Toggle (server runtime)

Set `PROVIDER=deepseek` in `.env` to switch the running Express app from Anthropic to DeepSeek-via-NVIDIA.

| Mode | Env vars required | Custom tools |
|---|---|---|
| `PROVIDER=anthropic` (default) | `ANTHROPIC_API_KEY`, `MODEL` (defaults to `claude-sonnet-4-6`) | enabled |
| `PROVIDER=deepseek` | `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL` | disabled (DeepSeek doesn't support custom tool calling) |

OpenCode CLI is its own runtime, separate from the server toggle. It reads `NVIDIA_API_KEY` via `{env:NVIDIA_API_KEY}` substitution in `opencode.json`.

## Environment Setup

Required:
- `ANTHROPIC_API_KEY` — Claude SDK
- `NOTION_TOKEN` — Notion API

Optional / runtime-dependent:
- `MODEL` — Anthropic chat model (default `claude-sonnet-4-6`)
- `NVIDIA_API_KEY` — OpenCode CLI (read by `opencode.json`)
- `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL` — when server is in `PROVIDER=deepseek` mode
- `PORT` (default 3000)
- `COLIN_WORKSPACE` (default `../dan`)
- `DATABASE_URL`, `DATABASE_SSL`, `READ_MODEL_SYNC_ENABLED`
- `GOOGLE_ADS_SPREADSHEET_ID`

`NVIDIA_API_KEY` and `DEEPSEEK_API_KEY` can be the same value (NVIDIA hosts DeepSeek on the same key).

## Secrets — Hard Rules

- **Public repo.** Never commit a real key. Ever.
- All config files (opencode.json, .claude/settings.json, .githooks/, server code) reference env vars — never inline literals.
- `.env` is gitignored; `.env.example` is the template.
- If you suspect a key has been committed historically: rotate immediately on the provider, then audit `git log --all -p -- <file>` to confirm the leak window.

## Testing

- `npm test` runs Node's built-in test runner
- Tests live in `test/*.test.js`
- Single test file: `node --test test/filename.test.js`
- Pre-commit hook: `git config core.hooksPath .githooks` (lint + test)

## Key Files

- `server.js` — Main Express application
- `src/js/app.js` — Frontend Alpine.js application (builds to `public/js/app.js`)
- `src/js/modules/` — Feature modules (chat, dan-colin, dashboard, etc.)
- `server/routes/` — Express route handlers
- `server/services/` — Infrastructure services (Notion, Sheets, PG, DB)
- `test/` — Test files (unit and integration)
- `docs/architecture/` — forward-looking architecture pack
- `.claude/AGENT_PRIMER.md` — auto-generated Claude Code primer (regen via `npm run agent-primer`)

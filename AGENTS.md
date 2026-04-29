# AGENTS.md

Critical guidance for agents working in this repo.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (localhost:3000) — runs build first, then starts server with --watch for auto-restart |
| `npm run build` | Build frontend assets (`public/js/app.js` + CSS) + generate agent primer |
| `npm run lint` | ESLint — errors only (src/js/, server/, test/) |
| `npm test` | Run tests with Node's built-in test runner |
| `npm run db:migrate` | Run Postgres migrations |
| `npm run agent-primer` | Regenerate `.claude/AGENT_PRIMER.md` context file |
| `npm run sync:readmodels` | Sync read models from Notion/Sheets to PostgreSQL |
| `git config core.hooksPath .githooks` | Enable pre-commit lint + test |

## Critical Rules

- **Never modify `../dan/`** — Colin's workspace is read-only
- **Never bypass approval gate** — All writes pause for Dan's approval via SSE
- **Build step required** — Edit `src/js/`, then run `npm run build` to update `public/js/app.js`
- **CommonJS only** — Server uses `require`/`module.exports` (no ES imports)
- **Alpine.js only** — Frontend framework (no React/Vue/etc.)

## Architecture

- **Thin routes** — Express routes validate/request-shape; business logic in services
- **Infrastructure services** — Raw Notion/Sheets access in `server/services/`
- **Domain services** — Payload composition for routes in `server/`
- **Frontend modules** — Domain state in `src/js/modules/*`
- **Entry point** — `server.js` (Express app)
- **Frontend bundle** — `public/js/app.js` (built from `src/js/app.js` + modules)

## Environment

Required in `.env`:
- `ANTHROPIC_API_KEY`
- `NOTION_TOKEN`

Optional: `PORT` (default 3000), `COLIN_WORKSPACE` (default `../dan`)

## AI Provider Toggle

Set `PROVIDER=deepseek` in `.env` to use DeepSeek via NVIDIA instead of Anthropic Claude.

When using DeepSeek:
- Custom tools are disabled (DeepSeek doesn't support custom tool calling)
- Required env vars: `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL`

## Testing

- `npm test` runs Node's built-in test runner
- Tests live in `test/*.test.js`
- To run a single test file: `node --test test/filename.test.js`

## Pre-commit Hook

Enable with `git config core.hooksPath .githooks`. Runs lint + test on commit.

## Key Files

- `server.js` — Main Express application
- `src/js/app.js` — Frontend Alpine.js application (builds to `public/js/app.js`)
- `src/js/modules/` — Feature modules (chat, dan-colin, dashboard, etc.)
- `server/routes/` — Express route handlers
- `server/services/` — Infrastructure services (Notion, Sheets, PG, DB)
- `test/` — Test files (unit and integration)
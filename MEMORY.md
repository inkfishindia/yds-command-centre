# MEMORY.md — YDS Command Centre

Complementary to `.claude/AGENT_PRIMER.md`. AGENT_PRIMER is auto-generated on every `npm run build` and covers live architecture — read it first. This file covers persistent team context, preferences, and project state that doesn't live in code.

Update in place — replace outdated entries, don't append.

---

## Voice

Update as preferences emerge. Current: terse, table-first, no hedging (per Dan's global preferences).

---

## Process

- **Build/test commands:** see `AGENTS.md` for the full reference. Key: `npm run dev`, `npm test`, `npm run build`, `npm run agent-primer`.
- **AGENT_PRIMER.md regenerates on `npm run build`** — always read it before planning or building. If you suspect it's stale, run `npm run agent-primer` manually.
- **Agent pipeline:** design-planner → builder → code-reviewer → ux-auditor → tester → scribe. Never skip code-reviewer. See CLAUDE.md for full dispatch rules.
- **Approval gate is sacred** — all writes to Notion/external sources pause for Dan's approval via SSE. No bypasses.
- **Forward architecture:** Postgres read-model layer (Phase 1) is in flight. Prefer `server/services/read-model-*.js` paths for new cross-domain views over direct Notion calls.

---

## People

- **Dan** — CEO/CMO. End user of this app. Needs streaming chat with Claude, Notion DB browsing, ops dashboard. Prefers terse output, tables over prose, no hedging.
- **Arun Nair** — Co-founder, Supply & Ops. Appears in Notion data as ops owner.

---

## Projects

- **Current focus:** Phased Postgres migration. Phase 0 (stabilize) complete. Phase 1 (read-model layer) in flight — `server/services/read-model-*.js`, `server/routes/read-models.js`, `server/routes/overview.js`.
- **Architecture docs:** `docs/architecture/` — target-architecture.md, phased-refactor-roadmap.md, database-schema-plan.md.
- **Repo:** public on GitHub at `inkfishindia/yds-command-centre`.

---

## Output

- Tables over prose
- Terse verdict-first answers
- AGENT_PRIMER-style structured sections when summarizing architecture

---

## Tools

- **Notion** — primary data source (tasks, projects, CRM, factory ops). Access via `server/services/notion.js` — never raw SDK.
- **Google Sheets** — KPI feeds. Access via infrastructure services.
- **GitHub** — source tracking (`inkfishindia/yds-command-centre`).
- **Vercel** — deployment target (MCP: `mcp__claude_ai_Vercel__get_project`).
- **Anthropic SDK** — Claude for the agent loop in `server/services/agent.js`.
- **MCP servers in settings.json:** `stitch` (davideast/stitch-mcp), `nanobanana-mcp` (ycse/nanobanana-mcp, GOOGLE_AI_API_KEY required).
- **OpenCode CLI** — available via `opencode.json` (routes to NVIDIA → DeepSeek-V4-Pro). See `opencode.json` for config.

---
paths:
  - "**"
---

# Token Efficiency

## File Reading
- Use `offset`/`limit` on files >200 lines — don't read the whole thing
- Use Grep to find code, then Read just the relevant section
- Never read: `node_modules/`, `inspo set up/`
- Read `CLAUDE.md` first — it has the file map

## Agent Delegation
- Follow the Workflows in CLAUDE.md — they define the full pipeline per task type
- `code-reviewer` (Opus) is expensive — use only as quality gate, not for exploration
- `design-planner`, `ux-auditor`, `devops-infra` run on Haiku — cheap, use freely
- `Explore` agent for open-ended searches (>3 queries)
- Run independent agents in parallel, not sequentially

## Edits
- Prefer Edit over Write (sends diff, not full file content)
- Batch related edits per file — don't switch between files
- Don't re-read files you just wrote

## Searches
- Glob for finding files by name pattern
- Grep for finding code by content
- Never use bash `grep`/`find` — use dedicated tools

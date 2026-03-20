---
paths:
  - "**"
---

# Workflow Pre-flight

Before starting any task:

1. **Identify the workflow** — Check the Workflows section in CLAUDE.md. Match your task to: UI change, backend change, full-stack feature, infra, or bug fix.
2. **Respect file ownership** — `frontend-builder` owns `public/`, `backend-builder` owns `server/` + `test/`. Never send an agent to edit files outside its domain.
3. **Follow the full pipeline** — Call each agent in sequence. Do not skip reviewers.
4. **Read before building** — Read `.claude/docs/app-reference.md` to check what already exists. Do not duplicate existing views, routes, methods, or CSS classes.
5. **Pass context forward** — When delegating to the next agent, summarize what the previous agent did. For full-stack: backend-builder reports the new endpoint shape so frontend-builder knows what to call.

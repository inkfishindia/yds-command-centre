# Advanced Tier Testing Plan — Command Centre

**Created:** 2026-03-25
**Owner:** Dan
**Status:** Wave 1 complete, Wave 2 ready

---

## Why Command Centre

- Real app (Node/Express + Alpine.js), not just config files
- 9 agents with exclusive file ownership — no conflict risk
- Git repo — worktrees work natively
- Approval gate pattern already exists — plan approval is a natural extension
- Active development — tests use real features, not throwaway code

## Readiness Score: 7.5/10

| Foundation | Score | Notes |
|-----------|-------|-------|
| CLAUDE.md | 9/10 | 165 lines, file map, 6 workflows |
| Agents | 9/10 | 9 agents, all complete |
| Skills | 7/10 | 2 skills (ui-ux-pro-max, verify) |
| Hooks | 9/10 | 5 hooks, all deterministic |
| Session | 8/10 | handoff + activity-log + decisions (enriched Wave 1) |
| Memory | 6/10 | 5 entries in auto-memory |
| MCP | 5/10 | stitch + nanobanana (key needed) |
| Rules | 9/10 | 4 path-scoped rules |

---

## Wave 1 — Fix Foundations ✅ COMPLETE (2026-03-25)

- [x] Fixed nanobanana MCP config → reads from `${GOOGLE_AI_API_KEY}`
- [x] Enriched Stop hook → no more "file-write | unknown"
- [x] Seeded decisions.md → 5 historical decisions
- [x] Cleaned activity-log → 17 meaningful rows from git history
- [ ] **Dan TODO:** Add `GOOGLE_AI_API_KEY=<key>` to `.env`

---

## Wave 2 — Worktree Isolation + Eval-Driven Dev

**Goal:** Test two advanced patterns that need NO feature flag.

### Test 2A: Worktree Isolation

**What:** Run backend-builder and frontend-builder in parallel isolated worktrees on the same feature.

**Pick a real feature** (suggestions):
- Add `/api/weekly-review` endpoint + weekly review dashboard view
- Add organisation dashboard (design spec already exists from 2026-03-22)
- Add CRM pipeline visualization

**Steps:**
1. Create feature branch from main
2. Spawn backend-builder in worktree A → builds API endpoint + service + tests
3. Spawn frontend-builder in worktree B → builds Alpine.js view + module
4. Merge both worktrees back to feature branch
5. Run full verify pipeline

**Success criteria:**
- No merge conflicts between worktrees
- Both agents produce working code independently
- Feature works end-to-end after merge
- code-reviewer approves on first pass

**What we learn:** Can CC agents safely work in parallel on this codebase?

### Test 2B: Eval-Driven Development

**What:** Define pass/fail criteria BEFORE coding, then hand to agents.

**Pick the same feature as 2A** (double the learning).

**Write eval spec first:**
```markdown
## Eval: [Feature Name]

### API Contract
- [ ] GET /api/[endpoint] returns 200 with JSON shape { data: [...] }
- [ ] Response < 2 seconds
- [ ] Pulls from correct Notion DB / Sheets source
- [ ] Error returns 500 with { error: "message" }

### Frontend Contract
- [ ] View renders in Alpine.js (no React)
- [ ] Uses CSS variables from design system
- [ ] Responsive (mobile + desktop)
- [ ] Loading state shown during fetch

### Quality Gates
- [ ] code-reviewer: APPROVE
- [ ] ux-auditor: CLEAN or NEEDS POLISH (not INCONSISTENT)
- [ ] npm test: all pass
- [ ] npm run lint: no errors
```

**Steps:**
1. Write eval spec (above) before any code
2. Hand spec to backend-builder → builds to satisfy API contract
3. Hand spec to frontend-builder → builds to satisfy frontend contract
4. Run tester against eval criteria
5. Score: how many criteria pass on first attempt?

**Success criteria:**
- 80%+ eval criteria pass on first agent attempt
- Fewer review cycles than typical (baseline: 2-3 cycles)
- Eval spec catches issues that would otherwise be found in review

**What we learn:** Does pre-defining success criteria improve first-pass quality?

---

## Wave 3 — Agent Teams

**Goal:** Test the experimental multi-agent coordination system.

**Prerequisites:**
- Wave 2 passes (proves agents can work independently)
- Set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in env

### Test 3A: Full-Stack Feature via Team

**Team manifest:**

| Role | Agent | Responsibility |
|------|-------|---------------|
| Lead | Main session | Orchestrate, review plans, approve |
| Design | design-planner | Design spec + tokens |
| Backend | backend-builder | API + services + tests |
| Frontend | frontend-builder | Views + modules |
| QA | code-reviewer | Review all output |
| Polish | ux-auditor | Final UX pass |

**Steps:**
1. Lead describes feature to team
2. design-planner produces spec
3. Lead approves spec → backend-builder starts
4. backend-builder completes → frontend-builder starts (gets endpoint shape)
5. code-reviewer reviews both
6. ux-auditor final pass
7. Lead merges

**Success criteria:**
- Feature ships with minimal manual intervention between steps
- Total time < sequential dispatch (baseline from Wave 2)
- All quality gates pass

### Test 3B: Competing Hypotheses

**Problem:** Pick a real architectural question, e.g.:
- "Best caching strategy for Notion data?" (in-memory vs file vs Redis)
- "How should we handle offline/degraded Notion access?"
- "Best approach for real-time dashboard updates?" (polling vs SSE vs websockets)

**Steps:**
1. Spawn 2-3 agents with the same question, different constraints
2. Each produces a proposal (max 1 page) with trade-offs
3. Lead evaluates and picks winner
4. Winner gets implemented

**Success criteria:**
- Agents produce genuinely different approaches (not variations)
- Decision is better informed than single-agent recommendation
- Winning approach holds up in implementation

---

## Wave 4 — Autonomous Loops + Continuous Learning

**Goal:** Background processes that improve quality over time.

### Test 4A: Continuous Learning v2

**Add PostToolUse insight extraction:**
- After successful builds, extract "what worked" into structured notes
- Stop hook writes insights (not just activity)
- After 5 sessions, review: did behavior improve?

**Implementation:**
- Add PostToolUse hook on Edit/Write that logs pattern decisions
- Enrich Stop hook to include "insights learned" section
- Create `data/sessions/insights.md` for accumulated learnings

### Test 4B: Autonomous Verify Loop

**Setup:** `/loop 10m /verify` — runs verification every 10 minutes during active dev.

**What it catches:**
- Syntax errors introduced between commits
- Test regressions
- Security patterns violated
- API inconsistencies

---

## Measurement Framework

Track across all waves:

| Metric | How | Baseline |
|--------|-----|----------|
| **Quality** | code-reviewer APPROVE rate (first pass) | Unknown — establish in Wave 2 |
| **Speed** | Sessions to ship a feature | ~2-3 sessions (estimate) |
| **Cost** | Token usage per feature | Unknown — establish in Wave 2 |
| **Autonomy** | Manual interventions per workflow | ~5-8 per feature (estimate) |
| **Reliability** | Regressions introduced | Track via git diff |

---

## Timeline

| Wave | When | Duration | Dependency |
|------|------|----------|------------|
| Wave 1 | ✅ 2026-03-25 | Done | — |
| Wave 2 | Next CC dev session | 2-3 sessions | Real feature to build |
| Wave 3 | After Wave 2 validated | 2-3 sessions | Feature flag enabled |
| Wave 4 | After Wave 3 stable | Ongoing | Waves 1-3 proven |

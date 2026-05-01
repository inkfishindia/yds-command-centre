# Builder Memory — YDS Command Centre

## L3 Push (2026-04-30)

Built 7 items to push project from L2 to L3 maturity:

1. `.claude/hooks/keyword-detector.mjs` — UserPromptSubmit skill routing via triggers frontmatter
2. `.claude/hooks/verify-deliverables.mjs` — SubagentStop advisory deliverable check
3. `.claude/hooks/cost-tracker.mjs` — async Stop hook writes to data/sessions/cost-log.md
4. `MEMORY.md` — project root, 56 lines, 6 sections, complementary to AGENT_PRIMER.md
5. `CLAUDE.md` — added @MEMORY.md import + Startup Routine section; 144 lines
6. `.claude/settings.json` — wired 3 new hooks; extended PreToolUse Write→Write|Edit + infra protection for .claude/agents|hooks|skills
7. All 9 agents — added Inter-Agent Routing + Available Skills / Failure Modes sections; some also got Rules or How You Work sections

### Patterns that worked well
- Inline shell logic for the infra protection hook (avoids a separate script file)
- cost-tracker creates header row on first write (no manual setup needed)
- verify-deliverables uses matchAny vs matchAll per agent — captures "APPROVE OR BLOCK OR REQUEST CHANGES" correctly
- keyword-detector skips informational queries via regex prefix matching

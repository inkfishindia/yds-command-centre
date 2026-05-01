---
name: verify
description: "Run a verification loop on code changes before committing or deploying. Checks syntax, tests, security patterns, and API consistency. Use after implementing a feature, fixing a bug, or before creating a PR. Trigger with /verify or 'verify this', 'check before commit', 'run checks'."
triggers:
  - verify this
  - verify
  - check before commit
  - run checks
  - before pr
  - before committing
  - lint and test
  - quality gate
---

# /verify — Code Verification Loop

Run this after implementing changes, before committing.

## Verification Phases

### Phase 1: Build & Syntax
- Run `node -c` on all changed .js files
- Check for syntax errors in server/ and public/
- Verify server.js starts without errors: `node -e "require('./server')" 2>&1` (dry run)

### Phase 2: Tests
- Run `npm test` if test suite exists
- Check test output for failures
- Flag any skipped tests

### Phase 3: Security Scan
- No hardcoded API keys, tokens, or secrets in changed files
- No `console.log` with sensitive data (API responses, user data)
- No `eval()` or `Function()` constructors
- Express routes have input validation
- SSE endpoints have proper error handling

### Phase 4: API Consistency
- Notion SDK calls use error handling (try/catch)
- Anthropic SDK calls respect rate limits
- Google Sheets API calls have retry logic
- All new endpoints follow existing patterns in server/services/

### Phase 5: Diff Review
- `git diff --stat` to see scope of changes
- No unintended file modifications
- No debug code left in

## Output Format

```
VERIFICATION REPORT
Syntax:    [PASS/FAIL] (N errors)
Tests:     [PASS/FAIL] (X/Y passed)
Security:  [PASS/FAIL] (N issues)
API:       [PASS/FAIL] (N inconsistencies)
Diff:      [PASS/FAIL] (N files changed)
Overall:   [READY / NOT READY] for commit

Issues to fix:
1. [specific issue + file:line]
```

## Rules
- If Build/Syntax FAILs, stop immediately — fix before running other phases
- If Security FAILs, MUST fix before committing (no exceptions)
- Log verification result to data/sessions/activity-log.md

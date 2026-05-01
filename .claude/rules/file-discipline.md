---
paths:
  - "**"
---

# File Discipline — How agents read, edit, and refactor code

Sits alongside `token-efficiency.md` (how to read cheaply) and `workflow.md`
(when to dispatch agents). This file is about **the contract for changing
code**: what to read first, when to split, what survives a refactor.

## Pre-flight before editing any file

In this exact order — abandon as soon as you have what you need:

1. **CLAUDE.md** — read once per session for the file map. Already loaded by
   the harness; you don't need a Read call.
2. **Per-package FILE-MAP.md** — if the package you're touching has one
   (e.g. [server/services/daily-sales/FILE-MAP.md](server/services/daily-sales/FILE-MAP.md)),
   read it. It tells you which sibling owns each concern and what NOT to put
   in the file you're about to edit. Skips ~60-90s of "where is X defined?"
3. **`.claude/docs/app-reference.md`** — only when you'd otherwise duplicate
   an existing view/route/method/class. Don't read end-to-end; grep for the
   thing you're about to add.
4. **Decisions index (`data/sessions/decisions.md`)** — only when the file
   you're touching is referenced in a recent decision row. Don't read top-to-
   bottom; grep for the file path or feature name.
5. **The target file** — Read with `offset`/`limit` per
   `token-efficiency.md`. Don't read the whole thing if you can grep first.

If a step turns up nothing useful, skip the next one. The pre-flight is a
budget, not a checklist.

## File-size discipline

Hard ceilings (bigger = mandatory split before adding more):

| File type | Soft cap | Hard cap |
|---|---|---|
| Single-concern service / route handler | 250 lines | 400 |
| Orchestrator / composer (one allowed per package) | 400 | 600 |
| Frontend module / view partial | 300 | 500 |
| God-files (none allowed) | — | — |

When you hit the soft cap, **propose a split before adding lines**. When you
hit the hard cap, **the next change must be a split** — no exceptions.

## How to split a god-file

Pure mechanical refactor — never bundle behavior changes with a split.
Pattern (proven on `server/services/daily-sales/index.js` 637 → 75):

1. **Inventory concerns** — list every distinct responsibility currently
   crammed in: cache mgmt, fetching, dedup, payload shape, drill-down, etc.
2. **One file per concern** — leaves first (no internal deps), orchestrator
   last (depends on leaves). Dep graph MUST be acyclic.
3. **Public-API shim** — the original filename stays as a thin entry that
   re-exports the new structure. External callers must NOT change.
4. **Header comment** in every new file: 5-10 lines covering purpose, public
   exports, and what NOT to put here. `'use strict';` at top.
5. **FILE-MAP.md** alongside — see format below.
6. **Tests are the contract** — do NOT modify test files during a split. If
   tests break, the split has a bug; fix the split, not the tests.
7. **Lint + full suite** must pass before declaring done.

## FILE-MAP.md format (mandatory for any package with >2 files)

Sections in this order (see [server/services/daily-sales/FILE-MAP.md](server/services/daily-sales/FILE-MAP.md) for a worked example):

1. **Public exports** — table of (export, returns, used by). External
   consumers should reach in via this surface only.
2. **Files** — per-file "Owns:" + "DO NOT add:" lines. Agents read this to
   route their edits without grepping.
3. **Want to add a feature?** — routing table mapping intent ("new status
   bucket", "new aggregation", "bug in dedup") to file. Maintained by the
   builder agent that ships the change.
4. **Dep graph** — explicit list of edges. Updated whenever a new file lands.
5. **Constraining decisions** — pointer to active decisions.md rows that
   apply to this package (so semantic constraints stay visible without
   reading 70+ rows of the global log).

Maintenance: when you add or split a file in the package, update FILE-MAP.md
in the same diff. Same lifecycle as `app-reference.md`.

## Lazy-require contract (mocked external services)

Inside any sibling module that consumes a mocked external service (sheets,
notion, github, db), **`require()` MUST happen inside the function body**,
not at module top:

```js
// BAD — captures stale closure when tests inject mocks via require.cache
const { fetchSheet } = require('../sheets');

async function fetchAllOrders() { return fetchSheet(...); }
```

```js
// GOOD — honours live require.cache state at invocation time
async function fetchAllOrders() {
  const { fetchSheet } = require('../sheets');
  return fetchSheet(...);
}
```

Reason: the test harness injects mocks via `require.cache[PATH]` and clears
the entry-point file from cache between describe blocks. Sibling modules
stay cached, so module-top requires capture stale references.

Cost: per-call require-cache lookup. Negligible.

Applies to ANY external-service consumer that gets mocked the same way:
sheets, notion, github, db, future additions. Document the rule in the
package's FILE-MAP.md so future splits don't regress it.

## Refactor contract

When you ship a split or restructure:

| Constraint | Why |
|---|---|
| Public API frozen | External callers must not change. If they do, it's not a refactor — it's a breaking change with a different review flow. |
| Behavior frozen | No "while I'm in here" cleanups. Bundle them into a separate ticket so the diff is reviewable. |
| Tests untouched | Tests are the contract. If they break, the refactor has a bug. |
| Dep graph acyclic | Verify with the reviewer. If you need a cycle, you've put code in the wrong file. |
| Lint clean | A split that introduces lint errors isn't done. |

If any of these slip, the refactor goes back. Don't commit "almost there."

## Edits — discipline beyond `token-efficiency.md`

- **One concern per Edit** — don't bundle a typo fix with a function rename
  in the same Edit. Reviewers parse Edits as units of intent.
- **Match indentation exactly** — Read output's tab-vs-space matters. If
  your `old_string` doesn't match, fix the string before retrying.
- **Never use Write to "rewrite for clarity"** unless the file is genuinely
  net-new. Edit preserves git blame, sends diffs, and is reviewable.
- **Don't re-read what you just wrote** — Write/Edit returns confirm success.
  Re-reads burn tokens for no signal.

## When to break these rules

- **Emergency hotfix** — skip pre-flight, edit directly, log the shortcut in
  the next handoff so the cleanup is queued.
- **Single-line change in a stable file** — pre-flight is overkill. Just
  Read the surrounding 50 lines and Edit.
- **Greenfield work** — file-size discipline applies, but FILE-MAP.md can
  wait until the second file lands.

Everything else: follow the discipline.

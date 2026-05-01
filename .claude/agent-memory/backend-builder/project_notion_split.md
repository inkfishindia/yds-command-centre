---
name: notion.js god-file split progress
description: Tracks which PRs have landed for the notion.js split (2049 → 4 lines). COMPLETE.
type: project
---

PR1 — 9 infra leaves — SHIPPED. Files: client, cache, retry, write-queue, simplify, databases, relations, pages, cache-invalidation (all under server/services/notion/).

PR2 — 12 domain leaves — SHIPPED. Files: reads/focus-areas, reads/people, reads/projects, reads/decisions, reads/commitments, reads/marketing-ops, reads/tech-team, reads/ai-team, reads/tasks + writes/commitments, writes/marketing-ops, writes/tech-team.

PR3 — composers + index + FILE-MAP — COMPLETE (2026-05-01). New files:
- server/services/notion/dashboard-summary.js (293 lines) — getDashboardSummary
- server/services/notion/morning-brief.js (202 lines) — buildMorningBriefFromDashboard, getMorningBrief
- server/services/notion/index.js (171 lines) — 56-key re-export shim + getPage composer
- server/services/notion/FILE-MAP.md — package navigation doc
- server/services/notion.js collapsed to 4-line shim: module.exports = require('./notion/index')

Key decisions captured in FILE-MAP:
- getPage lives in index.js (NOT pages.js) to avoid pages.js ↔ relations.js cycle
- notion.js shim uses require('./notion/index') not require('./notion') — Node resolves './notion' to notion.js itself (circular)
- getDashboardSummary uses getCachedWithTTL() helper instead of raw cache.get() + age check — only behavior tightening in PR3

Final state: 1014/1014 tests pass, 56 public keys, 4-line shim.

**Why:** Decision #75 — file-size ceiling discipline. notion.js was a 2049-line god-file blocking safe edits.

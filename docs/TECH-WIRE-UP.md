# Tech Wire-Up — Marketing Dashboard

**For:** Wire / Nirmal
**From:** Dan (via Claude session 2026-05-03)
**Status:** Marketing-side cleanup complete. Tech can now wire without filtering zombies.

This is the single entry-point doc. Read this first, then follow the links into deeper docs as needed.

---

## What changed today (2026-05-03)

Marketing did a top-to-bottom Notion cleanup so tech doesn't have to guess what's canonical:

1. **5 new IG-playbook DBs created** — Hook Pattern Log, Template Library, Approvals Log, Weekly Ops Log, IG Performance (with SWPS / Hit Target / Week Of formulas wired). Schema spec in [marketing/NOTION-SETUP.md](./marketing/NOTION-SETUP.md).
2. **Content Calendar extended** — added `Pillar (IG)`, `Hook Pattern`, `Published Slot` selects + 4 auto-back-relations to the new DBs.
3. **Marketing Tasks → Commitments migration** — 6 active rows migrated to canonical Commitments (YDS-262 through YDS-267) with Focus Area = D2C Marketing & Content. Source DB archived.
4. **8 deprecated DBs archived** — all stale Hub A children + 3 Hub B legacy DBs renamed `[ARCHIVED]` with descriptions explaining replacement targets. **No data deleted** — rename is fully reversible.
5. **Hub A page renamed** — `📊 Marketing Operations Hub` → `[ARCHIVED] Marketing Operations Hub (Aug 2025) — superseded by YDS Marketing Hub 2026-05-03`.

Net effect: Notion now has **one canonical marketing hub** (YDS Marketing Hub `323247aa-0d7b-81a5-b85d-ce421c959f3b`) with 14 active marketing DBs + the MCC Posts code-wired DB. Every other marketing-related DB in the workspace has `[ARCHIVED]` in its title.

---

## Where the docs live

| Doc | Purpose | Read this when… |
|---|---|---|
| [marketing/NOTION-SETUP.md](./marketing/NOTION-SETUP.md) | **Canonical DB map** — all 14 active marketing DBs + IDs + schemas + formulas + 6 automations + env vars + setup checklist | You're wiring anything Notion-related |
| [MARKETING-ALIGNMENT.md](./MARKETING-ALIGNMENT.md) | Marketing-side answers to your earlier questions — Hub A/B disambiguation, dashboard requirements, interaction spec | You need to understand *why* the canonical map looks the way it does, or what the dashboard should show / let users do |
| [EA-BRIEFING.md](./EA-BRIEFING.md) | Top-level operating manual for the Command Centre | Onboarding the EA or any new engineer |
| [marketing/mcc/POSTS-DB.md](./marketing/mcc/POSTS-DB.md) | MCC Posts DB schema + env var setup | You're touching the MCC social-posting code path (already wired) |
| [marketing/mcc/ARCHITECTURE.md](./marketing/mcc/ARCHITECTURE.md) | MCC system design | You're modifying MCC internals |

If you read only one of these, read **NOTION-SETUP.md** — it has every ID, property name, formula, and automation spec you need.

---

## Punch list — what tech needs to do

Priority order. P0 unblocks daily IG ops once playbook ships Apr 13.

### Must-do (P0)

| # | Task | Spec | Effort |
|---|---|---|---|
| 1 | Add 5 env vars (`IG_PERFORMANCE_DB_ID`, `HOOK_PATTERN_LOG_DB_ID`, `TEMPLATE_LIBRARY_DB_ID`, `APPROVALS_LOG_DB_ID`, `WEEKLY_OPS_LOG_DB_ID`) to `.env` + Vercel | [NOTION-SETUP.md § 7](./marketing/NOTION-SETUP.md#7-env-vars-to-add) | 5 min |
| 2 | Verify Notion integration has access to YDS Marketing Hub `323247aa-0d7b-81a5-b85d-ce421c959f3b` (propagates to all child DBs) | [NOTION-SETUP.md § 9](./marketing/NOTION-SETUP.md#9-tech-setup-checklist) | 2 min |
| 3 | Scope crawler/read-model to parent chain `307247aa-0d7b-8102-bfa0-f8a18d8809d9` (YDS Operating System v2) — excludes Hub A and YD Home tree wholesale | [NOTION-SETUP.md § 1.1](./marketing/NOTION-SETUP.md#11-do-not-wire--deprecated-dbs) | 10 min |
| 4 | Wire automation **A1** — CC.Status → `Published` triggers IG Performance row creation | [NOTION-SETUP.md § 6](./marketing/NOTION-SETUP.md#6-required-automations-6) | ~2 hrs |
| 5 | Wire automation **A2** — CC.Brand Review verdict → Approvals Log row creation | [NOTION-SETUP.md § 6](./marketing/NOTION-SETUP.md#6-required-automations-6) | ~2 hrs |
| 6 | Wire automation **A3** — Friday 5pm IST cron → Weekly Ops Log row generation | [NOTION-SETUP.md § 6](./marketing/NOTION-SETUP.md#6-required-automations-6) | ~3 hrs |

### Nice-to-have (P1)

| # | Task | Spec | Effort |
|---|---|---|---|
| 7 | Wire automation **A4** — auto-link CC.Hook Pattern to Hook Pattern Log | [NOTION-SETUP.md § 6](./marketing/NOTION-SETUP.md#6-required-automations-6) | ~1 hr |
| 8 | Wire automation **A5** — Slack/email Emily when Ad Candidate ready | [NOTION-SETUP.md § 6](./marketing/NOTION-SETUP.md#6-required-automations-6) | ~1 hr |
| 9 | Build dashboard top-3 morning views (today's content shipping / campaign status / yesterday's pulse) | [MARKETING-ALIGNMENT.md § 4.1](./MARKETING-ALIGNMENT.md#41-top-3-morning-views-every-day-in-this-order) | ~1 day |
| 10 | Wire approval-flow buttons (Approve / Revision / Kill) on dashboard CC rows in Brand Review status | [MARKETING-ALIGNMENT.md § 5.1](./MARKETING-ALIGNMENT.md#51-approvals-flow-the-load-bearing-one) | ~4 hrs |

### Polish (P2)

| # | Task | Spec | Effort |
|---|---|---|---|
| 11 | Wire automation **A6** — IG Performance.Graduated to Ads → Hook Pattern Log notes update | [NOTION-SETUP.md § 6](./marketing/NOTION-SETUP.md#6-required-automations-6) | ~1 hr |
| 12 | Build IG Performance drill-down views (5 views per IG Playbook §3.4) — This Week, Ad Candidates, By Pillar, Rolling 30-day, Misses | Notion UI work | ~30 min |
| 13 | Set IG Performance.SWPS display format to `Percent` in Notion UI | Notion UI work | 1 min |
| 14 | Update `.claude/docs/notion-hub.md` with rows for the 5 new DBs; run `npm run agent-primer` to regenerate `AGENT_PRIMER.md` | Code-side | 10 min |
| 15 | Delete EXAMPLE seed rows in 5 new DBs before going live | Notion UI work | 5 min |

**Total P0 effort:** ~1 dev-day. **Full punch list:** ~3 dev-days.

---

## Critical caveats (don't skip)

These are surprises documented in the implementation. Read before wiring formulas or relations.

### Notion 2.0 formula limits (in IG Performance DB)
- `Hit Target` formula **inlines** the SWPS calc instead of using `prop("SWPS") >= 0.035`. Notion errors on cross-formula prop references in comparisons. If SWPS formula is renamed, Hit Target's inlined copy must be updated in lockstep. Spec: [NOTION-SETUP.md § 5.1](./marketing/NOTION-SETUP.md#51--propswps--0035-does-not-work-as-a-separate-hit-target-formula).
- `Week Of` formula uses flat `YYYY-MM-DD` instead of ISO week. Notion's `formatDate` doesn't accept `WW` token and there's no `week()` function. For week grouping, use Notion's built-in "Group by Week" view filter on `Published Date`. Spec: [NOTION-SETUP.md § 5.2](./marketing/NOTION-SETUP.md#52--iso-week-format-is-not-supported-in-formatdate).

### MCC Posts is NOT IG Performance
Tech earlier conflated these. They are different DBs for different purposes:
- **MCC Posts** = pre-publish posting backend (drafts → Meta Graph API). Already wired via `MCC_POSTS_DB_ID` env var. See [marketing/mcc/POSTS-DB.md](./marketing/mcc/POSTS-DB.md).
- **IG Performance** = post-publish measurement DB (Reach/Saves/Shares/SWPS). Manual entry by Corey from Meta Business Suite. New today.

Both stay. Both wire to dashboard. Different concerns.

### Marketing Tasks is gone
The EA-BRIEFING.md previously listed `Marketing Tasks` as canonical for the marketing pipeline. **It's archived** as of 2026-05-03. Marketing tasks now live in **Commitments** filtered by `Focus Area = D2C Marketing & Content`. EA-BRIEFING.md § 4 + § 6 already updated to reflect this.

---

## What's confirmed safe to ignore

10 marketing-named DBs in Notion are now `[ARCHIVED]` and must NOT be wired:

| DB | ID | Why archived |
|---|---|---|
| Marketing Campaigns (old) | `2e213a71-33a1-423c-a4ed-686c0cf7a04d` | Pre-OS-v2 schema (7 historical rows) → use Campaigns `cff40f34…` |
| Campaign Decisions | `36f79d19-dbfe-4fdd-b593-f919db15e8b2` | Marketing-only fork → use Decisions `158108d0…` |
| Marketing Log | `3ca17008-a299-4dcf-a662-300438a9e295` | 0 rows → use Sessions Log `b1d04b58…` |
| Marketing Tasks | `b44daab1-c281-4e88-8ea4-6e9371370c28` | Migrated 2026-05-03 → use Commitments `71914093…` |
| Campaigns (Hub A) | `25c247aa-0d7b-81de-9a09-000bd2154509` | Hub A stale (Aug 2025) → use Campaigns `cff40f34…` |
| Marketing Sprints (A) | `25c247aa-0d7b-8118-ab5f-000b231de3ad` | Hub A stale → handled in Commitments + Sessions Log |
| YD Marketing Campaigns (A) | `25c247aa-0d7b-813c-8765-000bfa63286f` | Hub A stale → use Campaigns |
| Campaigns & Series (A) | `34e3a22a-1577-43bd-9fab-32145d99b5d9` | Hub A stale → use Campaigns |
| Marketing Tracker | `db0ca2ff-ae2d-4037-b73b-b3c39ab2d68f` | Tech-built dashboard prototype, 0 rows → split across canonical DBs |
| Hub A page itself | `25c247aa-0d7b-811c-bc15-c1835457425b` | Renamed `[ARCHIVED] Marketing Operations Hub (Aug 2025)` |

**Crawler filter (one rule excludes them all):** parent chain must include `307247aa-0d7b-8102-bfa0-f8a18d8809d9` (YDS Operating System v2). Hub A and YD Home tree are siblings in the workspace, not children — filter excludes them wholesale.

---

## Verification — how tech confirms wire-up worked

Once env vars + automations land, run these:

| Test | Expected |
|---|---|
| `curl /api/marketing/ig-performance` (or whatever endpoint you build) | Returns 1 row (the EXAMPLE seed) with SWPS = 0.05, Hit Target = true, Week Of = "2026-04-13" |
| Move a CC test row to Status = Published | A new IG Performance row auto-creates with Content Calendar relation set |
| Move a CC test row's Brand Review Status to Approved | A new Approvals Log row auto-creates with Verdict = Approved |
| Friday 5pm IST cron fires | A new Weekly Ops Log row appears in Status = Draft for current ISO week |
| Notion search for "ARCHIVED" | Returns 10 results (the 8 archived DBs + Marketing Tasks + Hub A page) — none should appear in dashboard data |

---

## Questions / blockers

If anything's unclear after reading NOTION-SETUP.md and MARKETING-ALIGNMENT.md, raise it back to Dan in a Notion comment on the relevant DB or via Slack. Don't guess — every property name and ID in this doc is exact and copy-pasteable.

The 30-min meeting tech requested is no longer needed for discovery — but a 15-min sync to walk through automations A1–A3 before wiring would be high-leverage.

---

*End of wire-up doc. Last updated 2026-05-03 by Claude session.*

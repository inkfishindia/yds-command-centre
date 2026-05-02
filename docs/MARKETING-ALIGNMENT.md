# Marketing × Tech — DB & Dashboard Alignment

**For:** Wire / Nirmal / EA briefing
**From:** Marketing (via Dan)
**Date:** 2026-05-02
**Pairs with:** [EA-BRIEFING.md](./EA-BRIEFING.md), [marketing/NOTION-SETUP.md](./marketing/NOTION-SETUP.md)

This doc answers the four questions raised in the EA briefing on Notion DBs, dashboard requirements, and interactions. Read [marketing/NOTION-SETUP.md](./marketing/NOTION-SETUP.md) first if you haven't — it's the canonical map. This doc adds the **deprecation calls** and **dashboard requirements** that NOTION-SETUP doesn't cover.

---

## 1. Hub A vs Hub B — Hub B wins

| Hub | Location | Status | Last touched |
|---|---|---|---|
| 🅰 **Hub A** — "📊 Marketing Operations Hub" (`25c247aa-0d7b-811c-bc15-c1835457425b`) | `YD Home → YD management → Marketing` | ❌ **Deprecated** | Aug 2025 |
| 🅱 **Hub B** — "🎯 YDS Marketing Hub" (`323247aa-0d7b-81a5-b85d-ce421c959f3b`) | `YDS Operating System v2` | ✅ **Source of truth** | 2026-05-02 |

**Hub B is the only hub the dashboard should read.** Hub A and all its child DBs are zombie state from a Q3-2025 setup that didn't survive contact with the OS v2 migration. Do not wire any `25c247aa…` DB to the dashboard.

**Action for tech:** filter the Notion crawler to only index DBs whose parent chain hits `307247aa-0d7b-8102-bfa0-f8a18d8809d9` (YDS Operating System v2). That excludes Hub A and the YD Home tree wholesale.

**Action for marketing (Dan to confirm):** rename Hub A page title to `[ARCHIVED] Marketing Operations Hub (Aug 2025)` and move under an `Archive` parent so it stops surfacing in Notion search. Optional but reduces future confusion.

---

## 2. Canonical DB map — answers tech's "which DB is canonical for each of…"

### 2.1 The map

| Concept | Canonical DB | Data Source ID | Lives in |
|---|---|---|---|
| **Marketing campaigns** | `Campaigns` | `cff40f34-13a8-4c64-b5bf-edafeffb0b88` | Hub B (also referenced from main OS) |
| **Content scheduling (all channels)** | `Content Calendar` | `a3066b81-c26c-453d-aed2-4588c92ad7c5` | Hub B |
| **IG posts (the real performance log)** | `IG Performance` | `5959753f-b4ff-4b7a-9d16-c4e1ec46a811` | Hub B — created 2026-05-02 |
| **IG hook pattern catalog** | `Hook Pattern Log` | `3a32a0ae-a45b-4537-b73e-76015c8ec9e0` | Hub B — created 2026-05-02 |
| **IG creative templates** | `Template Library` | `ff498859-fead-4048-b9d6-ea250b4ffc19` | Hub B — created 2026-05-02 |
| **Brand Editor approval log** | `Approvals Log` | `352b4779-a937-42e5-9553-f9247317ed94` | Hub B — created 2026-05-02 |
| **Weekly IG pulse rollup** | `Weekly Ops Log` | `450968bb-4a50-42d4-bab2-590d99b3d03d` | Hub B — created 2026-05-02 |
| **Email + WhatsApp lifecycle sequences** | `Sequences` | `aaee75a9-fc51-41ba-8f45-8ad1e72a4b9b` | Hub B |
| **Strategic / cross-domain decisions** | `Decisions` | `158108d0-623d-4dda-8e5c-2f6ade2597be` | Main OS (not Hub B) |
| **All marketing tasks** | `Commitments` | `71914093-29c0-492f-bab3-5e493a5c7173` | Main OS (filter by Focus Area = Marketing) |
| **Audience segments** | `Audiences` | `97e9f674-484e-4117-ba18-4357e12879a1` | Main OS |
| **Focus Areas / OKRs** | `Focus Areas` | `66ca7a48-f238-481f-a794-8353222b1b84` | Main OS |
| **Projects** | `Projects` | `1ae0f102-2c16-401f-b2a4-1eee6b993ab1` | Main OS |
| **Session memory** | `Sessions Log` | `b1d04b58-2c40-4091-8f6d-d2ccc1c1b2f1` | Hub B |
| **Social posting backend ("MCC Posts")** | `MCC Posts` (env: `MCC_POSTS_DB_ID`) | _see [mcc/POSTS-DB.md](./marketing/mcc/POSTS-DB.md)_ | Separate — Phase 1 backend, code-wired |

### 2.2 What "MCC Posts" actually is — important clarification

The EA briefing § 4 lists "MCC Posts" as if it's the canonical IG post DB. **It is not.** It's the social-posting backend for the MCC composer screen (drafts → schedule → publish via Meta Graph API). It's separate from `IG Performance`, which is the post-publish measurement log.

Two different concerns, two different DBs:

| | MCC Posts (`MCC_POSTS_DB_ID`) | IG Performance |
|---|---|---|
| Purpose | Posting pipeline (draft → schedule → publish) | Post-publish measurement (SWPS) |
| Lifecycle | Pre-publish | Post-publish |
| Owner | Tech (code reads/writes) | Corey enters Mon 10am IST from Meta Business Suite |
| Status states | `draft` / `scheduled` / `awaiting-approval` / `publishing` / `published` / `failed` | None — perf rows always exist post-publish |
| Connects to | Instagram + LinkedIn Graph APIs | Content Calendar (1-to-1 relation, rolls up Pillar/Hook/Format) |

**Recommendation:** keep them both. The dashboard should show the **MCC Posts kanban** for the pre-publish pipeline view, and the **IG Performance numbers** for the post-publish measurement view. They are NOT the same DB and should not be merged.

---

## 3. Deprecation list — completed 2026-05-03 ✅

All deprecated DBs renamed `[ARCHIVED]` in Notion. Crawler should still filter them out by parent-chain rule, but they no longer surface as canonical-looking DBs in workspace search.

| DB | ID | Status | Replace with |
|---|---|---|---|
| `[ARCHIVED] Marketing Campaigns (old)` | `2e213a71-33a1-423c-a4ed-686c0cf7a04d` | ✅ Archived (7 historical rows preserved; URLs referenced from migrated Commitments YDS-262 → YDS-267 Notes) | `Campaigns` (`cff40f34…`) |
| `[ARCHIVED] Campaign Decisions` | `36f79d19-dbfe-4fdd-b593-f919db15e8b2` | ✅ Archived | `Decisions` (`158108d0…`) — filter by Domain = Brand/Messaging/Campaign/Channel Strategy/Segment Strategy |
| `[ARCHIVED] Marketing Log` | `3ca17008-a299-4dcf-a662-300438a9e295` | ✅ Archived (0 rows) | `Sessions Log` (`b1d04b58…`) |
| `[ARCHIVED] Marketing Tasks` | `b44daab1-c281-4e88-8ea4-6e9371370c28` | ✅ Archived (6 active rows migrated to Commitments YDS-262 → YDS-267 with Focus Area = D2C Marketing & Content) | `Commitments` (`71914093…`) |
| `[ARCHIVED] Campaigns (Hub A)` | `25c247aa-0d7b-81de-9a09-000bd2154509` | ✅ Archived (Hub A child; Aug 2025 stale) | `Campaigns` |
| `[ARCHIVED] Marketing Sprints (A)` | `25c247aa-0d7b-8118-ab5f-000b231de3ad` | ✅ Archived (Hub A stale) | (none — sprints in Commitments + Sessions Log) |
| `[ARCHIVED] YD Marketing Campaigns (A)` | `25c247aa-0d7b-813c-8765-000bfa63286f` | ✅ Archived (Hub A stale) | `Campaigns` |
| `[ARCHIVED] Campaigns & Series (A)` | `34e3a22a-1577-43bd-9fab-32145d99b5d9` | ✅ Archived (Hub A stale) | `Campaigns` |
| `[ARCHIVED] Marketing Tracker` | `db0ca2ff-ae2d-4037-b73b-b3c39ab2d68f` | ✅ Archived (0 rows; was tech-built dashboard prototype) | Capabilities split across canonical DBs |
| `[ARCHIVED] Marketing Operations Hub (Aug 2025)` (page) | `25c247aa-0d7b-811c-bc15-c1835457425b` | ✅ Archived (Hub A parent page renamed) | `YDS Marketing Hub` (`323247aa…`) |

**EA-BRIEFING.md updated 2026-05-03:** § 4 + § 6 now point at `Commitments` (filtered by Focus Area = D2C Marketing & Content) instead of Marketing Tasks. Engineers reading EA-BRIEFING get the correct canonical pointers.

**Note:** No data was deleted. Renames are reversible. The 7 historical rows in archived `Marketing Campaigns (old)` are still queryable by URL from the migrated Commitments' Notes fields if anyone needs to reference them.

---

## 4. Dashboard requirements — what marketing actually needs

### 4.1 Top 3 morning views (every day, in this order)

| # | View | What it shows | Why morning |
|---|---|---|---|
| 1 | **Today's content shipping** | Posts in CC where `Publish Date == today` OR `Status == Scheduled` ordered by Publish Date asc. Show: Title, Channel, Owner, Brand Review Status, last edit time. | First question: "Is anything broken on what we promised to ship today?" |
| 2 | **Campaign status board** | Active campaigns (Stage ≠ Complete, Status ≠ Paused) grouped by Stage, P0 first. Show: Campaign Name, Owner, Status (with Needs Dan + Blocked highlighted), Target Launch, days-to-launch, Blocked By. | Second question: "What needs me before it can move?" |
| 3 | **Yesterday's pulse** | Mon–Fri: yesterday's IG posts with Reach/Saves/Shares (or "data pending" if Corey hasn't entered yet). Mon morning: weekend posts. Plus 7-day SWPS rolling avg + ad-spend daily delta if Kasim has data. | Third question: "How are we doing? Anything to react to?" |

These three are the daily driver. Everything else is on-demand.

### 4.2 Engagement metrics — the only ones that matter

**Tier 1 (visible on dashboard, the 3 numbers Dan reads):**
- **Weekly SWPS** = (saves + 2·shares) / reach, averaged across the week's IG posts. North-star, target ≥ 3.5% by day 60. Source: `IG Performance.SWPS` formula.
- **Hook Graduation Count** — # of IG hooks flagged for ad reuse this week. Source: `IG Performance.Ad Candidate = true`.
- **Email captures from IG bio** — count of new subs where source = `ig-bio`. Source: GA4 → email platform.

**Tier 2 (drill-down, on a click — not on the main strip):**
- SWPS by Pillar (rollup via CC.Pillar (IG))
- Format win rate (% of Reels/Carousels/Singles hitting SWPS ≥ 3.5%)
- Hook Pattern win rate (SWPS by `Hook Pattern` select)
- Reach / Saves / Shares per post (raw)
- Stage-time compliance (% posts moving Idea→Live inside 9-day max)

**Tier 3 (do not surface unless Tier 1 anomalies):**
- Likes
- Comments
- Profile visits
- Follower count
- Story completion rate
- Demographic drift

**Hard rule:** likes are noise. Don't show them as a metric. They were specifically rejected as a north-star alternative in IG Playbook §3.2.

### 4.3 Read-only vs write-back

| Surface | Mode | Why |
|---|---|---|
| All performance metrics (Reach/Saves/Shares/SWPS/etc.) | **Read-only** | Numbers come from Meta Business Suite via Corey's manual entry. Dashboard never writes these. |
| Brand Review verdicts (Approve / Revision / Kill) | **Write-back** | One-click verdict from dashboard → updates CC.Brand Review Status → creates Approvals Log row → advances to Scheduled (or back to Drafted on Revision, or kills if 2nd revision). See § 5.1 |
| Status changes (Idea → Briefed → … → Published) | **Write-back** | Drag-on-kanban or one-click advance. Constraint: cannot skip Brand Review stage on feed posts. |
| `Ad Candidate` checkbox (Emily's Friday flag) | **Write-back** | One-click toggle on a post row. |
| `Graduated to Ads` checkbox (Kasim's tick) | **Write-back** | One-click toggle. |
| Campaign creation, content creation, decision logging | **Write-back via approval gate** | Inherits the existing Command Centre approval gate pattern — show the diff, Dan approves, write commits. |

### 4.4 What dashboard should NOT do

- **Not a content authoring tool.** Composing captions / uploading images / building carousels happens in Bimal's design tools and the MCC composer — not the dashboard. Dashboard reads CC and shows status; it doesn't replace the composer.
- **Not a Notion replacement.** When Dan needs to dig into a record's full history, he opens Notion. Dashboard is the daily driver for the 80% case.
- **Not a Meta Business Suite mirror.** We're not pulling Graph API at scale in v1. Manual entry is cheaper at 30 min/week than the build-and-maintain cost.

---

## 5. Interactions — what should be clickable

### 5.1 Approvals flow (the load-bearing one)

```
On a CC row in Brand Review status:
  ┌─ "Approve" button ──┐
  ├─ "Revision" button ─┤  (each opens a verdict modal w/ Reason field)
  └─ "Kill" button ─────┘

Click sequence on Approve:
  1. Modal: Reviewer (default Brand Editor), Reason text (optional), 3 checkboxes (Litmus / Banned-words / No-fake-UGC)
  2. Approval gate fires → Dan confirms (or Brand Editor agent if pre-approved)
  3. Writes to:
       - CC.Brand Review Status = Approved
       - CC.Status advances to Scheduled
       - Approvals Log row created (linked back to CC)
  4. Verify-before-confirming: re-fetch CC + Approvals Log row, render success state with both IDs

On Revision:
  - Same writes but CC.Status reverts to Drafted, Approvals Log Verdict = Revision, Revision Round = (existing rounds + 1)
  - If Revision Round = 2 → auto-prompt "This is the 2nd revision. Two-revision-kill rule applies. Kill?"

On Kill:
  - CC.Status = Cancelled, Approvals Log Verdict = Killed, optionally clone the slot to next week
```

**Not in v1 (Phase 2):** comment threads on posts. Use Notion's native comments via deep-link button on each row.

### 5.2 Status changes (campaigns + content)

**Campaigns (kanban view):**
- Drag card between columns: `Briefing → Strategy → Build → Live → Optimize → Complete`
- Status select (`On Track` / `Blocked` / `Needs Dan` / `Paused`) is a dropdown on the card
- "Needs Dan" and "Blocked" auto-surface in the dashboard daily view #2

**Content Calendar (kanban or table):**
- Drag through pipeline: `Idea → Briefed → Drafted → In Design → Brand Review → Approved → Scheduled → Published`
- **Forced gate:** moving from `In Design` to anything past `Brand Review` requires the approval flow in § 5.1. Cannot bypass.
- Bulk-advance allowed for batches (e.g., approve 4 posts at once in Wednesday's Brand Editor batch).

### 5.3 Comment / feedback loops

**v1 (now):** every row has a "Comment in Notion" deep-link button → opens the row in Notion, where comments live natively. Don't rebuild Notion's comment infra.

**v2 (later):** lightweight inline-comment thread on the dashboard, posting to Notion's comment API. Wait until v1 has 4+ weeks of usage and we know the volume.

### 5.4 Other clickable surfaces

| Element | Click action |
|---|---|
| Campaign card | Drill-down → metrics, related content, related decisions, related sequences |
| Post card (CC) | Drill-down → caption, brief, IG Performance row (if published), Approvals Log history |
| IG Performance row | Drill-down → linked CC row, Pillar/Hook/Format breakdown, "Flag as Ad Candidate" button |
| Hook Pattern card | Drill-down → pattern definition, Posts Using count, win-rate trend |
| Weekly Ops Log row | Read-only summary card with link to the original Friday pulse send |

---

## 6. The 30-min meeting — proposed agenda

If the meeting still happens, these are the 6 things to decide. The doc above answers most of them; the meeting is for confirming.

| # | Decision | Default I'm proposing | Needs Dan's call? |
|---|---|---|---|
| 1 | Source of truth = Hub B | Yes | Confirm |
| 2 | Archive Hub A page (rename + move) | Do it | Confirm |
| 3 | Migrate `Marketing Tasks` → `Commitments` | Yes (single source of truth for tasks) | Yes — risk of disrupting any active task tracking |
| 4 | Drop `Marketing Campaigns (old)`, `Campaign Decisions`, `Marketing Log` from dashboard wiring | Drop them | Confirm |
| 5 | Update EA-BRIEFING.md § 4 + § 6 to reflect canonical map | Do it | Yes (it's the EA's reference) |
| 6 | Top 3 morning views as defined in § 4.1 | Lock | Confirm or revise |

If all 6 are confirmed, tech has unblocked dashboard wiring. The 30 min becomes review-and-sign-off, not discovery.

---

## 7. Appendix — files to update after sign-off

| File | Change |
|---|---|
| `docs/EA-BRIEFING.md` | § 4: replace "Marketing Tasks" canonical line with "Commitments (Focus Area = Marketing)". § 6: update marketing rows accordingly. |
| `docs/marketing/NOTION-SETUP.md` | § 1 inventory: append the deprecation list from this doc's § 3 as a "Do Not Wire" subsection. |
| `data/sessions/decisions.md` | Add 2 decisions: "Hub B is canonical, Hub A archived" + "Marketing Tasks → Commitments migration". |
| `data/sessions/handoff.md` | Append section confirming Marketing × Tech alignment outcome + link to this doc. |

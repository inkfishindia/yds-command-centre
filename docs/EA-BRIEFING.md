# YDS Command Centre — EA Briefing

**Purpose:** Single-pane operating console for Dan (CEO/CMO of YourDesignStore). Pulls live data from Notion, Google Sheets, and GitHub; lets Dan chat with Claude (his AI Chief of Staff "Colin"); approves all writes before they happen.

**Live URL:** `https://yds-command-centre.vercel.app`
**Local dev:** `http://localhost:3000` (when Dan is running it)
**Repo:** `github.com/inkfishindia/yds-command-centre`

---

## 1. Glossary

| Term | What it means |
|---|---|
| **Colin** | Dan's AI Chief of Staff (powered by Claude Opus). The chat interface is Dan talking to Colin. |
| **Dan** | Danish Hanif, CEO/CMO. Sole end-user. |
| **Arun Nair** | Co-founder, Supply & Ops. Appears as owner on Notion ops items. |
| **YDS** | YourDesignStore — customization / print-on-demand business based in India. |
| **MCC** | Marketing Content Centre — the social-content drafting screen. |
| **BMC** | Business Model Canvas — the 9-block strategy view. |
| **D2C** | Direct-to-Consumer — the product catalog screen. |
| **Approval Gate** | Every write to Notion or Sheets pauses for Dan's explicit approval. Nothing writes silently. |
| **Phase 1** | Active migration: cross-domain views moving from live Notion calls to a faster cached "read-model" backed by Postgres. |
| **Commitments** | Tasks with an owner + due date in Notion. The accountability ledger. |
| **Focus Areas** | Strategic themes that group projects + commitments. |

---

## 2. The 5 navigation areas (sidebar groups)

| Group | Screens | Purpose |
|---|---|---|
| **Command** | Chat · Dashboard · Action Queue · Dan & Colin Queue | Daily driver — chat, what needs attention today, work the queue |
| **Operations** | Projects · Commitments · Registry · Team | Active projects, who owes what by when, team workload |
| **Growth** | Marketing Ops · CRM · Google Ads · Marketing Content (MCC) · Inventory & Sales · Daily Sales | Revenue + pipeline: campaigns, leads, ad spend, social drafts, stock, daily orders |
| **Strategy** | Business Model Canvas · Decisions · Documents · Knowledge | Long-horizon: BMC, decision log, briefings, knowledge base |
| **Systems** | Tech Team · Factory · Product Catalog (D2C) · Notion Browser · Overview · Claude Usage · System Status · System Map | How the business + the app itself are running |

---

## 3. Keyboard shortcuts (active in the app)

| Action | Shortcut |
|---|---|
| Open command palette | `Cmd/Ctrl + K`  or  `/` |
| Chat | `Cmd/Ctrl + Shift + C` |
| Dashboard | `Cmd/Ctrl + Shift + D` |
| Action Queue | `Cmd/Ctrl + Shift + Q` |
| Projects | `Cmd/Ctrl + Shift + P` |
| Team | `Cmd/Ctrl + Shift + T` |
| Registry | `Cmd/Ctrl + Shift + R` |
| Marketing Ops | `Cmd/Ctrl + Shift + M` |
| CRM | `Cmd/Ctrl + Shift + I` |
| Tech Team | `Cmd/Ctrl + Shift + E` |
| Factory | `Cmd/Ctrl + Shift + U` |
| BMC | `Cmd/Ctrl + Shift + B` |
| Decisions log | `Cmd/Ctrl + Shift + L` |
| Documents | `Cmd/Ctrl + Shift + F` |
| Knowledge base | `Cmd/Ctrl + Shift + K` |
| Notion browser | `Cmd/Ctrl + Shift + O` |
| New commitment | `Cmd/Ctrl + Shift + N` |
| New decision | `Cmd/Ctrl + Shift + J` |

---

## 4. Where the data lives

### Notion databases (primary source of truth — 19 DBs)
| Database | Holds |
|---|---|
| Focus Areas | Strategic theme tracking |
| Projects | Mission briefs, initiatives |
| Commitments | Tasks with owner + due date |
| People | Team roster + assignment routing |
| Decisions | Decision log |
| Platforms | Systems inventory |
| Audiences | Marketing segments |
| Campaigns | Marketing campaigns |
| Content Calendar | Content pipeline + status |
| Sequences | Email/automation sequences |
| Sessions Log | Session history + analytics |
| Sprint Board (Tech) | Tech sprint items + bugs |
| Spec Library | Tech spec pipeline |
| Tech Decision Log | Engineering decisions |
| Sprint Archive | Velocity history |
| AI Team | AI agent roster |
| Marketing Tasks | Marketing action items |
| Tech Backlog | Tech backlog |
| MCC Posts | Social content drafts (newest) |

### Google Sheets feeds (13)
Strategy · Execution · App Logging · BMC · CRM Config · CRM Flows · Ops Inventory · Ops Sales · Ops Products · Ops Warehouse · Competitor Intel · Daily Sales · Google Ads

### Other integrations
- **GitHub** — `inkfishindia/yds-command-centre` (source code) + repo activity feeds
- **Anthropic Claude (Opus)** — powers chat + agent tool calls
- **Vercel** — production hosting
- **Instagram + LinkedIn OAuth** — wired in MCC, currently in Phase 2 (publishing not live yet)

---

## 5. Critical patterns the EA must know

| Pattern | Plain-English |
|---|---|
| **Approval Gate** | When Colin (or any agent) wants to write to Notion/Sheets, the screen pauses and shows Dan an approval prompt. Nothing writes silently. EA should never approve on Dan's behalf without checking. |
| **Streaming chat** | Chat replies stream live — partial answers appear as they're generated. If text stops mid-sentence, refresh; the connection dropped. |
| **Read-model layer (in flight)** | Some cross-domain views (e.g. Overview) are moving from slow live Notion calls to a faster cached layer. Expect occasional staleness — refresh to force-pull. |
| **Auto-built docs** | `.claude/AGENT_PRIMER.md` regenerates every build, so it always reflects the live system. EA can hand this to any new engineer. |
| **Session memory** | Every session ends with handoff notes in `data/sessions/handoff.md` + open loops in `data/sessions/open-loops.md`. These are the truth for "what's in flight." |

---

## 6. Common EA-relevant screens (where to find what)

| If Dan asks about… | Go to | Source |
|---|---|---|
| "What's overdue?" | Action Queue or Dashboard | Notion: Commitments |
| "What did I commit to this week?" | Commitments | Notion: Commitments |
| "What did we decide about X?" | Decisions | Notion: Decisions |
| "How's project Y tracking?" | Projects (or Registry) | Notion: Projects |
| "Who's overloaded?" | Team | Notion: People + Commitments |
| "What's in the marketing pipeline?" | Marketing Ops | Notion: Campaigns + Marketing Tasks |
| "How are leads moving?" | CRM | Sheets: CRM Flows |
| "What's the ad spend doing?" | Google Ads | Sheets: Google Ads |
| "How were yesterday's sales?" | Daily Sales | Sheets: Daily Sales |
| "What's stock looking like?" | Inventory & Sales | Sheets: Ops Inventory |
| "What's the tech team building?" | Tech Team | Notion: Sprint Board + Spec Library |
| "What's the factory state?" | Factory | Local config + Sheets |
| "What products do we sell?" | Product Catalog (D2C) | Notion + Sheets |
| "Show me a Notion DB directly" | Notion Browser | All Notion DBs |

---

## 7. Repo layout (for any engineer the EA briefs)

| Layer | Location |
|---|---|
| Frontend source | `src/js/modules/*` (one module per screen) |
| Frontend built | `public/js/*` (auto-generated, don't edit) |
| HTML partials | `public/partials/*.html` |
| Express routes | `server/routes/*.js` |
| Domain services | `server/services/*` |
| Notion access | `server/services/notion.js` (only path) |
| Tests | `test/integration/` |
| Architecture roadmap | `docs/architecture/` |
| Session memory | `data/sessions/handoff.md`, `decisions.md`, `open-loops.md` |
| Project rules | `CLAUDE.md`, `.claude/rules/` |

---

## 8. Current focus (as of 2026-05-02)

- **Phase 1 — Read-model layer:** moving Overview-style cross-cuts off direct Notion calls onto a Postgres-backed cache. In flight.
- **MCC (Marketing Content Centre):** new screen — kanban + composer for social drafts. Wired end-to-end. OAuth for Instagram/LinkedIn is the next gap (Phase 2).
- **Open loops:** see `data/sessions/open-loops.md` for the full list (env vars in Vercel, MCC OAuth keys, bundled deploys pending, etc.).

---

## 9. Standing operating principles (Dan's working style)

- **Notion is the single source of truth** across all projects.
- **Every commitment needs:** owner, due date, definition of done.
- **Verify before confirming.** After any write to Notion / Sheets / external systems, fetch the result before telling Dan it's done. "Logged" means "logged and verified."
- **Fix pipes before turning on water** — foundational systems before marketing pushes.
- **Terse, table-first, no hedging.** Communication style preference.

---

## 10. Quick reference

| Need | Path |
|---|---|
| Production app | `https://yds-command-centre.vercel.app` |
| Source code | `github.com/inkfishindia/yds-command-centre` |
| Hosting dashboard | Vercel |
| What's in flight | `data/sessions/handoff.md` (latest entry) |
| What's stuck | `data/sessions/open-loops.md` |
| Why we did X | `data/sessions/decisions.md` |
| Live system architecture | `.claude/AGENT_PRIMER.md` (auto-regenerates on build) |
| Long-form architecture | `docs/architecture/target-architecture.md` |

# Repo Reference Code — inkfishindia

Reference code pulled from https://github.com/inkfishindia repos on 2026-03-20.
These are NOT live dependencies — they're reference implementations to port into
the Command Centre's Alpine.js + Express stack.

## tpl-x-yds/ (The-Design-Lab---TPL-X-YDS)
YDS Ecosystem app (React + Gemini). Contains:
- **types.ts** — Full YDS domain model (projects, tasks, leads, campaigns, BMC, partners, etc.)
- **services/** — Google Sheets CRUD, caching, FK hydration, Notion API
- **views/** — Marketing suite component architecture
- **config.ts** — Sheet registry with spreadsheet IDs and hydration mappings

### What to port:
1. `configService.ts` sheet registry + hydration map → enhance our `server/routes/sheets.js`
2. `googleSheetsService.ts` CRUD → full read/write Sheets support in Command Centre
3. `dataHydrationService.ts` FK resolution → make Colin resolve cross-sheet references
4. `types.ts` domain model → reference for Notion property schemas and tool definitions
5. Marketing suite architecture → plan marketing dashboard view

## yd-new/ (YD-New)
Earlier command centre attempt (React + Gemini). Contains:
- **types.ts** — Program management hierarchy (Programs > Projects > Tasks > Milestones)
- Enums for all statuses, priorities, health scores

### What to port:
1. Program/Project/Task/Milestone hierarchy → structure for project tracking view
2. Status enums and health scoring → dashboard KPI logic

## wa-test/ (WA-test)
WhatsApp store expert (n8n-style workflow). Contains:
- **workflow.json** — AI decision router: owner updates vs customer queries
- Store knowledge base system with save/get variable tools

### What to port:
1. WhatsApp integration as a Colin tool
2. Store expert knowledge base pattern → reusable for any domain KB

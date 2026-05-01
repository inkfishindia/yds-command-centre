# YDS Command Centre Architecture Pack

This folder is a working architecture packet for the team.

Use these docs in this order:

1. `target-architecture.md`
2. `database-schema-plan.md`
3. `phased-refactor-roadmap.md`
4. `postgres-test-pass.md`

What this pack assumes:

- The app is evolving from an integration-heavy Express UI into an internal operating system.
- Notion and Google Sheets remain important upstream systems, but should stop behaving like the app's direct runtime database.
- The system needs stronger state ownership, clearer read/write boundaries, and better failure isolation.

Current architectural diagnosis:

- The backend is carrying orchestration responsibility without a fully explicit domain model.
- The frontend has hidden dependencies between views and lazy-loaded modules.
- Read performance and reliability depend too heavily on external systems at request time.
- Operational visibility exists in pieces, but not yet as a first-class platform concern.

The goal of this pack is to give the team a practical target state and a staged path to get there without freezing feature work.

## Background workloads — why not Managed Agents

The read-model scheduler runs as an in-process Node.js interval inside `server.js` (calling `server/services/read-model-scheduler.js`). Managed Agents was evaluated and rejected:

- **Co-location:** The scheduler lives inside the app server — no separate cloud infrastructure is warranted.
- **Short-lived work:** Each sync tick completes in seconds. Managed Agents targets multi-hour autonomous loops.
- **Cost:** Managed Agents bills $0.08/session-hour of active runtime. An in-process `setInterval` has near-zero marginal cost.

Revisit if the scheduler grows beyond simple interval syncs, or if it needs to run independently of the web server (e.g., separate worker process on Railway).

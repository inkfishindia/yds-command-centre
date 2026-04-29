# Database Execution Plan — Turning on Postgres

Date: 29-Apr-2026
Current state: `DATABASE_URL` not set → Postgres **disabled** entirely.

All persistence currently runs on JSON files in `server/data/`. The read model store and projection job store already have dual-write to Postgres but it's dormant.

## Current Data Architecture

| Data | Storage | Source of Truth | PG Table Exists? |
|------|---------|----------------|------------------|
| Read model snapshots (7) | `server/data/read-models/*.json` + PG (dual, unused) | Externals (Notion/Sheets) | Yes — `app_read_models` |
| Source health | `server/data/source-health.json` + PG (dual, unused) | Computed | Yes — `app_source_health` |
| Sync run history | `server/data/sync-runs.json` + PG (dual, unused) | Computed | Yes — `app_sync_runs` |
| Projection jobs | `server/data/projection-jobs.json` + PG (dual, unused) | Computed | Yes — `app_projection_jobs` |
| Project registry | `server/data/projects.json` | Manually maintained | No |
| Business metrics | `server/data/metrics.json` | Manually maintained | No |
| Factory config | `server/data/factory-capacity.json` | Read/write via API | No |
| Notion data | Notion API (no local copy) | Notion | No |
| Google Sheets data | Sheets API (no local copy) | Sheets | No |

## Phase 1: Enable Postgres (1 sprint)

What already works:
- Migration runner (`server/services/db-migrations.js`)
- 2 migration files (`001_read_model_foundation.sql`, `002_projection_job_tracking.sql`)
- Dual-write in `read-model-store.js` — all 4 save functions write to PG + JSON
- Dual-write in `projection-job-store.js`
- All read functions try PG first, fall back to JSON

### Steps

1. **Provision Postgres**
   - Local: `brew install postgresql && brew services start postgresql`
   - Production: Provision on Railway/Render/Neon
   - Create database: `CREATE DATABASE yds_command_centre;`

2. **Set `DATABASE_URL` in `.env`**
   ```
   DATABASE_URL=postgres://user:password@localhost:5432/yds_command_centre
   DATABASE_SSL=false
   ```

3. **Run migrations**
   ```bash
   npm run db:migrate
   ```
   Creates `app_read_models`, `app_source_health`, `app_sync_runs`, `app_projection_jobs`.

4. **Verify** — restart server, check that reads serve from PG (read-model-store prefers PG over JSON). Monitor logs for dual-write errors.

**Estimated effort:** 2-3 hours. All infrastructure is pre-built.

## Phase 2: Migrate JSON-only Data to Postgres (1-2 sprints)

Three JSON files need new tables:

### 2a. `projects.json` → `app_projects`

Migration `003_create_app_projects.sql`:
```sql
CREATE TABLE app_projects (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  description TEXT,
  priority INTEGER DEFAULT 0,
  tech_stack TEXT,
  agent_count INTEGER DEFAULT 0,
  skill_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

New service `server/services/projects-store.js`:
- `loadProjects()` → `SELECT * FROM app_projects ORDER BY priority DESC`
- `saveProjects(projects)` → upsert
- Dual-write pattern (same as read-model-store): file fallback on PG failure
- Existing `server/services/registry-service.js` refactored to use the new store

### 2b. `metrics.json` → `app_metrics`

Migration `004_create_app_metrics.sql`:
```sql
CREATE TABLE app_metrics (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  current_value NUMERIC,
  target_value NUMERIC,
  unit TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2c. `factory-capacity.json` → `app_factory_config`

Migration `005_create_app_factory_config.sql`:
```sql
CREATE TABLE app_factory_config (
  id TEXT PRIMARY KEY,
  config_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Single row with id='current'. The entire factory config lives in `config_json`.

### Effort

| File | New Code | Risk |
|------|----------|------|
| `projects.json` | ~60 lines service + route tweaks | Low — read-only, small dataset |
| `metrics.json` | ~40 lines service + route tweaks | Low — 4 rows, rarely changes |
| `factory-capacity.json` | ~80 lines service + write handling | Medium — has write API, needs migration of existing data |

## Phase 3: Notion Data Sync (3-4 sprints)

**Current pattern:** Every page render fetches from Notion API with in-memory cache (5-min fresh, 15-min hard expiry). 18 databases queried on-demand.

**Goal:** Persistent local copy of normalized domain entities backed by a sync pipeline.

### New Tables

Migration `006_create_domain_entities.sql`:
- `people` — normalized from Notion PEOPLE db
- `focus_areas` — from Notion FOCUS_AREAS db
- `commitments` — from Notion COMMITMENTS db
- `decisions` — from Notion DECISIONS db
- `sprint_items` — from Notion TECH_SPRINT_BOARD db
- `campaigns` — from Notion CAMPAIGNS db

See `docs/architecture/database-schema-plan.md` for full schema definitions.

### New Sync Pipeline

1. **Seed job** — runs on startup, fetches all 6 domain tables from Notion, writes to PG
2. **Incremental sync** — runs every 15 min (same cadence as read model sync), fetches only updated records
3. **Write-through** — mutations (create/update commitment, decision) write to Notion AND invalidate local PG copy
4. **Fallback** — if Notion is down, serve from local PG with stale flag

### Architecture

```
┌─────────────┐    sync     ┌──────────────┐   reads    ┌──────────┐
│  Notion API  │ ──────────→ │  PostgreSQL   │ ←──────── │  Alpine  │
│  (18 DBs)    │             │  (6 tables)   │           │  App     │
└─────────────┘             └──────────────┘           └──────────┘
       ↑                         │
       │  write-through          │  projection
       │                         ↓
       │                  ┌──────────────┐
       └──────────────────│  Read Models  │
                          │  (7 builders) │
                          └──────────────┘
```

### Effort

| Component | Estimated Lines | Risk |
|-----------|----------------|------|
| 6 table migrations | ~150 SQL | Low |
| Sync service (`notion-sync.js`) | ~300 JS | Medium |
| Write-through wrapper | ~100 JS | Medium |
| Frontend gradual migration | per-view | Medium |

## Phase 4: Google Sheets → Postgres (5+ sprints)

**Current pattern:** 49 registered sheet tabs across 13 spreadsheets, fetched on every page render with 5-min cache.

**Challenge:** Sheets have variable schemas and are directly edited by the team. A sync pipeline would need to handle schema drift.

**Approach:** Don't migrate Sheets to canonical tables in bulk. Instead:
1. For high-read domains (CRM, Ops stock health, Daily Sales), cache raw sheet data in PG as JSONB with TTL
2. Add a "last synced at" column to serve degraded-state indicators
3. Move projection logic to read models that use PG-backed source snapshots
4. Leave Sheets as the write target (append row, update row)

Migration `010_create_sheet_cache.sql`:
```sql
CREATE TABLE app_sheet_cache (
  sheet_key TEXT NOT NULL,
  sheet_tab TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  checksum TEXT,
  rows_json JSONB NOT NULL,
  PRIMARY KEY (sheet_key, sheet_tab)
);
```

New service `server/services/sheet-sync.js`:
- `fetchAndCache(sheetKey)` — fetches from Sheets API, stores in PG, returns data
- `getCached(sheetKey)` — returns PG cache if fresh, falls back to API
- TTL: configurable per sheet key (default 5 min)

## Timeline Summary

| Phase | What | Duration | Dependency |
|-------|------|----------|-----------|
| 1 | Enable Postgres, run migrations | 1 sprint | None — infrastructure is pre-built |
| 2 | Migrate JSON-only data (projects, metrics, factory) | 1-2 sprints | Phase 1 |
| 3 | Notion data sync (people, commitments, decisions, etc.) | 3-4 sprints | Phase 1 + schema design |
| 4 | Sheets caching layer | 5+ sprints | Phase 1 |

## Recommendation

**Start with Phase 1 this sprint.** It's 2-3 hours of work, zero risk, and unlocks the dual-write path. Every read model sync after that will write to both JSON and PG, giving you a warm database to verify against before cutting over reads.
# Target Architecture

## Purpose

YDS Command Centre should be treated as an internal operating system, not just a web app.

Its primary job is to:

- ingest operational truth from external systems
- normalize it into app-owned read models
- expose fast, resilient workflows for decision-making and execution
- support writes back to source systems through explicit mutation paths

## Core principles

### 1. App-owned runtime state

Notion and Google Sheets should remain systems of record for team workflows where needed, but the app should own its runtime state.

That means:

- the UI should read from app-managed read models by default
- external APIs should be used for sync and write-through, not for every page render
- stale or degraded source systems should not take down the operating surface

### 2. Clear read/write separation

The system should behave like a lightweight CQRS architecture.

Reads:

- come from cached, normalized read models
- are optimized for UI views and dashboards
- are safe to serve even when upstream systems are slow

Writes:

- go through explicit mutation handlers
- validate business rules before calling external systems
- emit invalidation or refresh events for affected read models

### 3. Explicit domain boundaries

The platform should be organized around business domains rather than source-system adapters.

Suggested domains:

- Commitments and Action Queue
- Dashboard and Overview
- CRM
- Marketing Ops
- Tech Team
- Factory and Ops
- Documents and Knowledge
- Health, Sync, and Read Models

Each domain should own:

- route handlers
- services
- read-model projections
- domain validation rules
- UI-facing DTOs

### 4. Failure isolation

Every integration and every view should fail independently.

Examples:

- one broken source should not blank the full dashboard
- one lazy frontend helper should not break an entire view
- one sync failure should surface a degraded status, not cause runtime collapse

### 5. Operational observability

The app should expose system health as a product feature.

At minimum:

- source freshness
- sync success/failure
- route latency
- cache age
- read-model version
- mutation success/failure
- degraded mode indicators per view

## Proposed high-level system

### Layer 1: Source connectors

Responsibilities:

- pull from Notion, Google Sheets, Google APIs, GitHub, and other upstream systems
- map raw records into stable internal shapes
- report sync health and freshness

Rules:

- no UI formatting here
- no view-specific business assembly here
- all external errors should be normalized

### Layer 2: Domain services

Responsibilities:

- apply business rules
- merge source data across connectors
- define mutation workflows
- decide how read models are projected

Examples:

- Action Queue severity and routing rules
- Dashboard summary logic
- CRM lead-stage transitions
- commitment reassignment and snooze rules

### Layer 3: Read-model store

Responsibilities:

- hold app-ready projections
- store freshness metadata
- make reads fast and predictable
- support incremental refresh and invalidation

Suggested characteristics:

- versioned projection definitions
- per-model sync timestamps
- per-source health status
- materialized outputs optimized for views

### Layer 4: Application API

Responsibilities:

- serve read models to the frontend
- expose explicit write endpoints
- keep view payloads small and predictable
- provide system health and diagnostics endpoints

Examples:

- `GET /api/read-models/action-queue`
- `GET /api/read-models/dashboard`
- `POST /api/commitments/:id/snooze`
- `POST /api/system/read-models/:name/sync`

### Layer 5: Frontend shell

Responsibilities:

- route between views
- load view-specific code safely
- consume stable API DTOs
- avoid hidden cross-view dependencies

Frontend rules:

- shared helpers live in shared utility modules
- view partials only rely on their own module or explicit shared modules
- lazy-loaded views declare all dependencies up front

## Target deployment behavior

When a user opens the app:

- the shell loads immediately
- high-priority read models render from cached projections
- background refresh updates stale data if needed
- degraded sources show status badges instead of blocking the view

When a user performs a write:

- the mutation is validated
- the source system is updated
- the relevant read models are invalidated or refreshed
- UI acknowledges success or degraded follow-up state

## Target technical outcomes

- startup is independent of external data source latency
- dashboards are fast and consistent
- broken integrations degrade gracefully
- frontend views do not rely on accidental module loading order
- the system can support richer automation without increasing fragility

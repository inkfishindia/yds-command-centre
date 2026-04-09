# Phased Refactor Roadmap

## Goal

Move from the current integration-heavy app to a durable platform without stopping feature delivery.

This roadmap is designed to preserve momentum while reducing fragility in the highest-leverage parts of the system first.

## Phase 0: Stabilize the current app

Time horizon:

- immediate

Objectives:

- stop runtime breakage from hidden dependencies
- improve confidence in boot and navigation
- create visibility into degraded states

Work:

- move cross-view helpers into explicit shared modules
- audit lazy-loaded views for implicit dependencies
- add startup and route-level error logging
- add a health check for partial loads and read-model freshness
- ensure every view can render an error or degraded state

Definition of done:

- no view depends on unrelated lazy modules by accident
- startup failures are diagnosable within minutes
- critical views show degraded state instead of blanking

## Phase 1: Formalize read models

Time horizon:

- short term

Objectives:

- make key views independent from live upstream fetches
- standardize the app's read path

Priority targets:

- Action Queue
- Dashboard
- Overview
- System Health

Work:

- define stable DTOs for key views
- formalize projection builders for each priority read model
- standardize freshness metadata
- route UI reads through read-model endpoints first
- keep source fetches as fallback or sync input only

Definition of done:

- Action Queue and Dashboard are served from explicit read models
- each read model has freshness, status, and generation metadata
- slow upstream systems no longer dominate runtime latency for key views

## Phase 2: Introduce Postgres as app state

Time horizon:

- short to medium term

Objectives:

- create a durable foundation for canonical entities and sync metadata
- reduce source-shaped logic in application code

Work:

- add Postgres and migration tooling
- create sync metadata tables
- create initial canonical tables for people, commitments, focus areas, and decisions
- persist read-model outputs in Postgres
- introduce write audit logging

Definition of done:

- app state survives process restart cleanly
- sync state is queryable in one place
- Action Queue and Dashboard can be rebuilt from Postgres-backed data

## Phase 3: Refactor by domain

Time horizon:

- medium term

Objectives:

- align code structure with domain ownership
- reduce service sprawl and hidden coupling

Work by domain:

### Commitments and Action Queue

- move queue rules into a dedicated domain service
- separate mutation handlers from projection builders
- standardize assignment, snooze, and status transitions

### Dashboard and Overview

- define shared summary primitives
- stop duplicating assembly logic across services

### CRM, Marketing Ops, Tech Team, Ops

- normalize domain entities where needed
- ensure each domain can build its own projections independently

Definition of done:

- domains own their own projections and mutations
- cross-domain dependencies are explicit and minimal
- feature work is easier to place and reason about

## Phase 4: Add a job and event spine

Time horizon:

- medium term

Objectives:

- make projection refresh and write follow-up systematic

Work:

- add projection job tracking
- trigger projection invalidation from writes
- support scheduled and manual rebuilds
- add backoff and retry policies for external writes and syncs

Definition of done:

- projection refresh is observable and repeatable
- writes reliably trigger downstream updates
- sync failures are isolated and retryable

## Phase 5: Harden the frontend shell

Time horizon:

- medium term

Objectives:

- make the frontend predictable under lazy loading and degraded data

Work:

- create shared frontend utility modules
- define per-view dependency contracts
- add stronger view-level loading and error boundaries
- reduce cross-view state leakage in the Alpine shell

Definition of done:

- navigation order does not affect correctness
- shared UI helpers are centralized
- view rendering is robust under missing or stale data

## Phase 6: Platform maturity

Time horizon:

- longer term

Objectives:

- support more automation, more domains, and more users without rising fragility

Work:

- permission and actor model
- richer audit history
- admin tools for replaying projections
- source diagnostics dashboards
- operational analytics on mutation and sync health

Definition of done:

- the system can scale as a true internal platform
- operational failures are easy to identify and recover from
- new domains can be added with established patterns

## Prioritization guidance

If the team needs a narrow next step, do this sequence:

1. finish frontend dependency cleanup for all partial views
2. formalize Action Queue and Dashboard read models
3. add Postgres for sync metadata and projection storage
4. move commitments and action queue onto canonical domain tables

## Risks to manage

- trying to migrate every domain at once
- replacing source systems before the app-owned state is trustworthy
- mixing projection logic and mutation logic in the same services
- continuing to add frontend helper coupling across unrelated lazy modules

## Delivery model recommendation

Run the refactor as a platform stream beside feature work.

Suggested structure:

- one track for stabilization and shared architecture
- one track for feature delivery on top of approved patterns
- one track for migrating the highest-leverage domains first

This keeps the team moving without turning the refactor into a freeze.

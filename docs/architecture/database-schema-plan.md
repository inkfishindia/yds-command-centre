# Database and Schema Plan

## Purpose

This plan defines the app-owned data model the team should move toward.

The goal is not to replace Notion or Sheets overnight.
The goal is to introduce a stable internal data layer that can:

- support read models cleanly
- track sync state explicitly
- normalize core business entities
- make the UI independent from source-specific shapes

## Recommended database posture

Use Postgres as the primary application database.

Why Postgres:

- strong relational modeling for interconnected operational data
- good JSON support for source payload snapshots
- reliable indexing and query performance for dashboards
- transactional writes for mutations and sync bookkeeping
- easy fit for projection tables and event-like audit trails

## Database responsibilities

Postgres should own:

- canonical internal entities
- sync metadata
- projection/read-model tables
- mutation audit history
- job and refresh tracking

Postgres should not try to own:

- every raw upstream schema in full
- UI-only ephemeral state
- binary file storage

## Data model layers

### 1. Source snapshot layer

Purpose:

- preserve raw or near-raw external records
- support re-projection without re-fetching every source
- track source freshness and mapping confidence

Suggested tables:

- `source_connections`
- `source_sync_runs`
- `source_records`

Example shapes:

#### `source_connections`

- `id`
- `source_type` (`notion`, `google_sheets`, `github`, etc.)
- `source_key`
- `status`
- `last_success_at`
- `last_error_at`
- `last_error_message`
- `config_json`

#### `source_sync_runs`

- `id`
- `source_connection_id`
- `sync_type` (`full`, `incremental`, `manual`)
- `started_at`
- `finished_at`
- `status`
- `records_seen`
- `records_changed`
- `error_message`

#### `source_records`

- `id`
- `source_connection_id`
- `external_id`
- `record_type`
- `source_updated_at`
- `synced_at`
- `checksum`
- `payload_json`

Use cases:

- replay a projection
- compare source drift
- debug mapping issues

### 2. Canonical domain layer

Purpose:

- normalize the entities the app actually reasons about
- stop coupling business logic to raw source payloads

Suggested initial tables:

- `people`
- `focus_areas`
- `commitments`
- `commitment_assignments`
- `decisions`
- `projects`
- `documents`
- `crm_leads`
- `campaigns`
- `sprint_items`

#### `people`

- `id`
- `external_ref`
- `display_name`
- `role_name`
- `status`
- `email`
- `metadata_json`

#### `focus_areas`

- `id`
- `external_ref`
- `name`
- `owner_person_id`
- `status`
- `metadata_json`

#### `commitments`

- `id`
- `external_ref`
- `name`
- `status`
- `priority`
- `type`
- `due_date`
- `notes`
- `source_system`
- `source_updated_at`
- `created_at`
- `updated_at`

#### `commitment_assignments`

- `id`
- `commitment_id`
- `person_id`
- `assignment_role`
- `created_at`

#### `decisions`

- `id`
- `external_ref`
- `name`
- `decision_text`
- `rationale`
- `owner_person_id`
- `decision_date`
- `status`
- `source_updated_at`

#### `projects`

- `id`
- `external_ref`
- `name`
- `status`
- `owner_person_id`
- `start_date`
- `target_date`
- `metadata_json`

### 3. Relationship layer

Purpose:

- represent many-to-many domain links cleanly

Suggested join tables:

- `commitment_focus_areas`
- `decision_focus_areas`
- `project_focus_areas`
- `document_focus_areas`

### 4. Projection layer

Purpose:

- materialize view-ready data for fast reads

Suggested tables:

- `rm_action_queue`
- `rm_dashboard`
- `rm_overview`
- `rm_crm_summary`
- `rm_marketing_ops_summary`
- `rm_tech_team_summary`
- `rm_system_health`

Suggested shape pattern:

#### `read_models`

- `name`
- `version`
- `status`
- `generated_at`
- `source_watermark_json`
- `payload_json`

or, for heavier models:

#### `rm_action_queue_items`

- `id`
- `queue_type`
- `commitment_id`
- `sort_score`
- `is_overdue`
- `days_overdue`
- `payload_json`
- `generated_at`

#### `rm_dashboard_cards`

- `id`
- `card_type`
- `card_key`
- `sort_order`
- `payload_json`
- `generated_at`

Recommendation:

- use dedicated projection tables for high-volume or filter-heavy views
- use a single payload table for lighter summaries

## Mutation and audit model

Every important write should be auditable.

Suggested tables:

- `mutation_log`
- `outbound_write_attempts`

#### `mutation_log`

- `id`
- `entity_type`
- `entity_id`
- `action_type`
- `actor_type`
- `actor_id`
- `request_json`
- `result_json`
- `created_at`

#### `outbound_write_attempts`

- `id`
- `target_system`
- `entity_type`
- `entity_id`
- `action_type`
- `request_json`
- `response_json`
- `status`
- `attempted_at`

## Job and invalidation model

Suggested tables:

- `projection_jobs`
- `projection_dependencies`

#### `projection_jobs`

- `id`
- `projection_name`
- `trigger_type`
- `trigger_ref`
- `status`
- `started_at`
- `finished_at`
- `error_message`

This supports:

- manual sync
- scheduled sync
- write-triggered invalidation
- incremental refresh

## Initial indexing strategy

Prioritize indexes for:

- `commitments(status, due_date)`
- `commitment_assignments(person_id, commitment_id)`
- `source_records(source_connection_id, external_id)`
- `source_records(record_type, source_updated_at)`
- `mutation_log(entity_type, entity_id, created_at desc)`
- `projection_jobs(projection_name, created_at desc)`

## Migration approach

### Phase 1

- add Postgres
- start with sync metadata and read-model tables
- keep canonical domain entities minimal

### Phase 2

- normalize commitments, people, focus areas, and decisions
- rebuild Action Queue and Dashboard from Postgres-backed projections

### Phase 3

- move more domains onto canonical tables
- reduce direct runtime dependency on Notion and Sheets

## Definition of done for the schema layer

- Action Queue and Dashboard can render from app-owned read models
- sync freshness is queryable in SQL
- mutations are auditable
- source payloads can be replayed into new projections
- the UI no longer depends on source-specific field names at runtime

CREATE TABLE IF NOT EXISTS app_read_models (
  name TEXT PRIMARY KEY,
  persisted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_at TIMESTAMPTZ NULL,
  last_synced_at TIMESTAMPTZ NULL,
  stale BOOLEAN NOT NULL DEFAULT FALSE,
  partial BOOLEAN NOT NULL DEFAULT FALSE,
  degraded_sources_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_read_models_generated_at
  ON app_read_models (generated_at DESC);

CREATE TABLE IF NOT EXISTS app_source_health (
  source_name TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  checked_at TIMESTAMPTZ NULL,
  read_model TEXT NULL,
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_app_source_health_checked_at
  ON app_source_health (checked_at DESC);

CREATE TABLE IF NOT EXISTS app_sync_runs (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  ok BOOLEAN NOT NULL,
  started_at TIMESTAMPTZ NULL,
  finished_at TIMESTAMPTZ NULL,
  partial BOOLEAN NOT NULL DEFAULT FALSE,
  stale BOOLEAN NOT NULL DEFAULT FALSE,
  degraded_sources_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_synced_at TIMESTAMPTZ NULL,
  error_message TEXT NULL,
  run_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_app_sync_runs_name_finished_at
  ON app_sync_runs (name, finished_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_sync_runs_finished_at
  ON app_sync_runs (finished_at DESC);

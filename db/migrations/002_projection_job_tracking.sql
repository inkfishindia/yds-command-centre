CREATE TABLE IF NOT EXISTS app_projection_jobs (
  id BIGSERIAL PRIMARY KEY,
  trigger TEXT NOT NULL,
  status TEXT NOT NULL,
  requested_models_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ NULL,
  result_summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_projection_jobs_started_at
  ON app_projection_jobs (started_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_projection_jobs_status
  ON app_projection_jobs (status);

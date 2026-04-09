'use strict';

const { afterEach, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const DB_PATH = path.join(__dirname, '../server/services/db.js');
const MIGRATIONS_PATH = path.join(__dirname, '../server/services/db-migrations.js');

function stubModule(modulePath, exports) {
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
    parent: null,
    children: [],
    paths: [],
  };
}

describe('Database Migrations', () => {
  afterEach(() => {
    delete require.cache[DB_PATH];
    delete require.cache[MIGRATIONS_PATH];
  });

  it('lists SQL migration files in version order', async () => {
    const migrations = require(MIGRATIONS_PATH);
    const files = await migrations.listMigrationFiles();

    assert.deepEqual(files, [
      '001_read_model_foundation.sql',
      '002_projection_job_tracking.sql',
    ]);
  });

  it('skips migration run when database is not configured', async () => {
    stubModule(DB_PATH, {
      isDatabaseEnabled: () => false,
      withTransaction: async () => {
        throw new Error('should not run');
      },
    });

    const migrations = require(MIGRATIONS_PATH);
    const result = await migrations.runMigrations();

    assert.equal(result.skipped, true);
    assert.match(result.reason, /DATABASE_URL/);
  });

  it('applies unseen migrations inside a transaction', async () => {
    const queries = [];
    stubModule(DB_PATH, {
      isDatabaseEnabled: () => true,
      withTransaction: async (fn) => fn({
        query: async (text, params) => {
          queries.push({ text, params });
          if (/SELECT version FROM schema_migrations/i.test(text)) {
            return { rows: [] };
          }
          return { rows: [] };
        },
      }),
    });

    const migrations = require(MIGRATIONS_PATH);
    const result = await migrations.runMigrations();

    assert.deepEqual(result.applied, [
      '001_read_model_foundation.sql',
      '002_projection_job_tracking.sql',
    ]);
    assert.ok(queries.some((entry) => /CREATE TABLE IF NOT EXISTS schema_migrations/i.test(entry.text)));
    assert.ok(queries.some((entry) => /CREATE TABLE IF NOT EXISTS app_read_models/i.test(entry.text)));
    assert.ok(queries.some((entry) => /CREATE TABLE IF NOT EXISTS app_projection_jobs/i.test(entry.text)));
    assert.ok(queries.some((entry) => /INSERT INTO schema_migrations/i.test(entry.text)));
  });
});

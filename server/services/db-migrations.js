'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const db = require('./db');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'db', 'migrations');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function listMigrationFiles() {
  const entries = await fs.readdir(MIGRATIONS_DIR, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function readMigration(version) {
  return fs.readFile(path.join(MIGRATIONS_DIR, version), 'utf8');
}

async function getAppliedVersions(client) {
  await ensureMigrationsTable(client);
  const result = await client.query('SELECT version FROM schema_migrations ORDER BY version ASC');
  return new Set(result.rows.map((row) => row.version));
}

async function runMigrations() {
  if (!db.isDatabaseEnabled()) {
    return {
      applied: [],
      skipped: true,
      reason: 'DATABASE_URL not configured',
    };
  }

  return db.withTransaction(async (client) => {
    const files = await listMigrationFiles();
    const appliedVersions = await getAppliedVersions(client);
    const applied = [];

    for (const version of files) {
      if (appliedVersions.has(version)) continue;

      const sql = await readMigration(version);
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
        [version],
      );
      applied.push(version);
    }

    return {
      applied,
      skipped: false,
    };
  });
}

module.exports = {
  MIGRATIONS_DIR,
  ensureMigrationsTable,
  listMigrationFiles,
  readMigration,
  runMigrations,
};

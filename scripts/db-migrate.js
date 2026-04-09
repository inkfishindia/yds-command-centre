'use strict';

const migrations = require('../server/services/db-migrations');

async function main() {
  const result = await migrations.runMigrations();

  if (result.skipped) {
    console.log(`Skipping migrations: ${result.reason}`);
    return;
  }

  if (result.applied.length === 0) {
    console.log('Database schema already up to date.');
    return;
  }

  console.log('Applied migrations:');
  for (const version of result.applied) {
    console.log(`  - ${version}`);
  }
}

main().catch((err) => {
  console.error('Database migration failed:', err.message || err);
  process.exitCode = 1;
});

import syncService from '../server/services/read-model-sync.js';

const requested = process.argv.slice(2);
const names = requested.length ? requested : undefined;

console.log('Syncing read models...');
const result = await syncService.syncAllReadModels(names);

for (const item of result.results) {
  if (item.ok) {
    const flags = [];
    if (item.partial) flags.push('partial');
    if (item.stale) flags.push('stale');
    const suffix = flags.length ? ` (${flags.join(', ')})` : '';
    console.log(`  OK  ${item.name}${suffix}`);
  } else {
    console.log(`  ERR ${item.name}: ${item.error}`);
  }
}

const failed = result.results.filter((item) => !item.ok);
if (failed.length > 0) {
  process.exitCode = 1;
} else {
  console.log('Read model sync complete.');
}

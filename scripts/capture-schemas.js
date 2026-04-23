#!/usr/bin/env node
// Captures sample JSON responses from the services the Command Centre hits,
// so agents can read a concrete shape before writing parsing logic.
//
// Writes to data/schemas/*.json. Each sample trims arrays to the first 2 items
// to keep files small. Run locally — samples contain live workspace data and
// are gitignored (see data/schemas/README.md).
//
//   node scripts/capture-schemas.js

require('dotenv').config();

const fs = require('fs');
const path = require('path');

const notionService = require('../server/services/notion');
const sheetsService = require('../server/services/sheets');
const githubService = require('../server/services/github');

const OUT_DIR = path.join(__dirname, '..', 'data', 'schemas');
fs.mkdirSync(OUT_DIR, { recursive: true });

function trim(value, depth = 0) {
  if (Array.isArray(value)) {
    return value.slice(0, 2).map((v) => trim(v, depth + 1));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = trim(value[k], depth + 1);
    return out;
  }
  return value;
}

function write(name, payload) {
  const file = path.join(OUT_DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  console.log(`  wrote ${path.relative(process.cwd(), file)}`);
}

async function captureNotion() {
  console.log('[notion] capturing…');
  const dbs = notionService.listDatabases();
  const target = dbs.find((d) => d.name === 'Focus Areas') || dbs[0];
  if (!target) {
    console.log('  (no databases registered — skipped)');
    return;
  }
  try {
    const result = await notionService.queryDatabase(target.id, { pageSize: 2 });
    write('notion-query-database', {
      _capturedAt: new Date().toISOString(),
      _source: `notion.queryDatabase('${target.name}')`,
      sample: trim(result),
    });
  } catch (err) {
    console.warn(`  notion capture failed: ${err.message}`);
  }
}

async function captureSheets() {
  console.log('[sheets] capturing…');
  const candidates = ['PROJECTS', 'CRM_LEADS', 'BUSINESS_UNITS'];
  for (const key of candidates) {
    try {
      const result = await sheetsService.fetchSheet(key);
      if (result && result.available) {
        write('sheets-fetch-sheet', {
          _capturedAt: new Date().toISOString(),
          _source: `sheets.fetchSheet('${key}')`,
          sample: trim(result),
        });
        return;
      }
    } catch (err) {
      console.warn(`  sheets capture '${key}' failed: ${err.message}`);
    }
  }
  console.log('  (no configured sheet reachable — skipped)');
}

async function captureGithub() {
  console.log('[github] capturing…');
  const { owner, repo } = { owner: 'inkfishindia', repo: 'yd-new' };
  try {
    const result = await githubService.getRepoActivity(owner, repo);
    if (result && result.available) {
      write('github-repo-activity', {
        _capturedAt: new Date().toISOString(),
        _source: `github.getRepoActivity('${owner}', '${repo}')`,
        sample: trim(result),
      });
    } else {
      console.log('  (github not configured — skipped)');
    }
  } catch (err) {
    console.warn(`  github capture failed: ${err.message}`);
  }
}

(async () => {
  console.log(`Capturing API samples → ${path.relative(process.cwd(), OUT_DIR)}/`);
  await captureNotion();
  await captureSheets();
  await captureGithub();
  console.log('Done.');
  process.exit(0);
})();

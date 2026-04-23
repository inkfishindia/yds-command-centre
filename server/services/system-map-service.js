'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

// 60-second in-process cache
let _cache = null;
let _cacheAt = 0;
const CACHE_TTL_MS = 60 * 1000;

// ── helpers ───────────────────────────────────────────────────────────────────

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function listDirSafe(dirPath) {
  try {
    return fs.readdirSync(dirPath);
  } catch {
    return [];
  }
}

// ── 1. routes ─────────────────────────────────────────────────────────────────
// Scan server/routes/*.js and extract router.METHOD(path) calls.

function extractRoutes() {
  const routesDir = path.join(ROOT, 'server', 'routes');
  const files = listDirSafe(routesDir).filter((f) => f.endsWith('.js'));

  const result = [];

  for (const file of files) {
    const src = readFileSafe(path.join(routesDir, file));
    if (!src) continue;

    const lines = src.split('\n');
    const endpoints = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match: router.get('/', ...) or router.post('/foo/:id', ...)
      const match = line.match(/router\.(get|post|put|patch|delete|all)\s*\(\s*['"`]([^'"`]+)['"`]/i);
      if (!match) continue;

      const method = match[1].toUpperCase();
      const routePath = match[2];

      // Walk back to find a leading comment block
      let description = '';
      let j = i - 1;
      // skip blank lines
      while (j >= 0 && lines[j].trim() === '') j--;
      if (j >= 0) {
        const commentLine = lines[j].trim();
        // JSDoc last line: */ or a single-line // comment
        if (commentLine === '*/') {
          // multi-line block comment — find the first descriptive line
          let k = j - 1;
          while (k >= 0 && !lines[k].trim().startsWith('/*')) {
            const inner = lines[k].trim().replace(/^\*\s?/, '');
            if (inner && !inner.startsWith('@') && !inner.startsWith('*')) {
              description = inner;
              break;
            }
            if (inner && inner !== '*') {
              description = inner.replace(/^\*+\s?/, '');
              break;
            }
            k--;
          }
        } else if (commentLine.startsWith('//')) {
          description = commentLine.replace(/^\/\/\s?/, '');
        }
      }

      endpoints.push({ method, path: routePath, description });
    }

    if (endpoints.length > 0) {
      result.push({ file, endpoints });
    }
  }

  return result;
}

// ── 2. modules ────────────────────────────────────────────────────────────────
// Scan src/js/modules/*.js and extract export names.

function extractModules() {
  const modulesDir = path.join(ROOT, 'src', 'js', 'modules');
  const indexHtml = readFileSafe(path.join(ROOT, 'public', 'index.html')) || '';
  const files = listDirSafe(modulesDir).filter((f) => f.endsWith('.js'));

  return files.map((file) => {
    const name = path.basename(file, '.js');
    const src = readFileSafe(path.join(modulesDir, file)) || '';

    // Collect exported identifiers
    const exports = new Set();

    // module.exports = { foo, bar } or module.exports = function foo
    const meMatch = src.match(/module\.exports\s*=\s*\{([^}]+)\}/);
    if (meMatch) {
      meMatch[1].split(',').forEach((s) => {
        const id = s.trim().split(':')[0].trim();
        if (id) exports.add(id);
      });
    }

    // export function foo / export const foo / export { foo }
    const namedExports = src.matchAll(/export\s+(?:default\s+)?(?:function|const|let|var|class)?\s+(\w+)/g);
    for (const m of namedExports) exports.add(m[1]);

    // export { foo, bar }
    const exportBraces = src.match(/export\s*\{([^}]+)\}/g) || [];
    exportBraces.forEach((chunk) => {
      const inner = chunk.replace(/export\s*\{/, '').replace(/\}/, '');
      inner.split(',').forEach((s) => {
        const id = s.trim().split(/\s+as\s+/).pop().trim();
        if (id) exports.add(id);
      });
    });

    // Heuristic: which view references this module name in index.html
    const referencedByView = indexHtml.includes(name) ? name : '';

    return {
      name,
      exports: Array.from(exports).filter(Boolean),
      referencedByView,
    };
  });
}

// ── 3. notionDatabases ────────────────────────────────────────────────────────
// Parse .claude/docs/notion-hub.md — table rows under DATABASE MAP heading.

function extractNotionDatabases() {
  const notionHubPath = path.join(ROOT, '.claude', 'docs', 'notion-hub.md');
  const src = readFileSafe(notionHubPath);
  if (!src) return [];

  const databases = [];

  // Find the DATABASE MAP table lines: | Name | ID | ... |
  const lines = src.split('\n');
  let inDbTable = false;
  let headerParsed = false;

  for (const line of lines) {
    // Section heading detection
    if (line.startsWith('## DATABASE MAP')) {
      inDbTable = true;
      headerParsed = false;
      continue;
    }
    if (inDbTable && line.startsWith('## ') && !line.startsWith('## DATABASE MAP')) {
      inDbTable = false;
    }

    if (!inDbTable) continue;

    // Table row: | Name | ID | Data Source ID | COS Use |
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
    if (cells.length < 2) continue;

    // Skip the header and separator rows
    if (!headerParsed) {
      if (cells[0].toLowerCase() === 'database') {
        headerParsed = true;
      }
      continue;
    }
    if (cells[0].startsWith('---') || cells[0].startsWith(':--')) continue;

    const [name, id, , purpose] = cells;
    if (name && id && id.replace(/-/g, '').match(/^[0-9a-f]{32}$/i)) {
      databases.push({
        name,
        id: id.replace(/-/g, ''),
        propertiesSummary: [],  // full properties are documented per-section below
        purpose: purpose || '',
      });
    }
  }

  // Second pass: enrich propertiesSummary from per-database sections
  // Each section header pattern: ### <Name>\n ...\n **Key Properties:**\n | Property | Type | ...
  const sectionPattern = /###\s+([^\n]+)\n([\s\S]+?)(?=\n###|\n##|$)/g;
  let sectionMatch;
  while ((sectionMatch = sectionPattern.exec(src)) !== null) {
    const sectionName = sectionMatch[1].trim();
    const sectionBody = sectionMatch[2];

    const db = databases.find((d) => d.name === sectionName);
    if (!db) continue;

    const propLines = sectionBody.split('\n').filter((l) => l.startsWith('|'));
    const props = [];
    let propHeaderSeen = false;
    for (const pl of propLines) {
      const pcells = pl.split('|').map((c) => c.trim()).filter(Boolean);
      if (!propHeaderSeen) {
        if (pcells[0]?.toLowerCase() === 'property') { propHeaderSeen = true; }
        continue;
      }
      if (pcells[0]?.startsWith('---')) continue;
      if (pcells[0] && pcells[1]) props.push(`${pcells[0]} (${pcells[1]})`);
    }
    if (props.length) db.propertiesSummary = props;
  }

  return databases;
}

// ── 4. sheets ─────────────────────────────────────────────────────────────────
// Read server/config.js source and extract *_SPREADSHEET_ID references.

function extractSheets() {
  const configSrc = readFileSafe(path.join(ROOT, 'server', 'config.js')) || '';
  const config = (() => {
    try {
      // Safe require — config.js only reads process.env
      return require('../config.js');
    } catch {
      return {};
    }
  })();

  const result = [];
  const pattern = /(\w+_SPREADSHEET_ID)\s*:\s*process\.env\.(\w+)/g;
  let m;
  while ((m = pattern.exec(configSrc)) !== null) {
    const key = m[1];
    const envVar = m[2];
    const value = config[key] || '';
    result.push({
      key,
      envVar,
      idPresent: Boolean(value && value.length > 0),
      label: key.replace(/_SPREADSHEET_ID$/, '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
    });
  }

  // Also capture GOOGLE_SHEETS_ID (without SPREADSHEET in name)
  if (configSrc.includes('GOOGLE_SHEETS_ID')) {
    result.unshift({
      key: 'GOOGLE_SHEETS_ID',
      envVar: 'GOOGLE_SHEETS_ID',
      idPresent: Boolean(config.GOOGLE_SHEETS_ID),
      label: 'Google Sheets (legacy)',
    });
  }

  return result;
}

// ── 5. docs ───────────────────────────────────────────────────────────────────

function extractDocs() {
  const docsDir = path.join(ROOT, '.claude', 'docs');
  const docsFiles = listDirSafe(docsDir).filter((f) => f.endsWith('.md'));

  const handoffSrc = readFileSafe(path.join(ROOT, 'data', 'sessions', 'handoff.md')) || '';
  const sessionHeaders = [...handoffSrc.matchAll(/^##\s+([\d]{4}-[\d]{2}-[\d]{2}[^\n]*)/gm)]
    .map((m) => m[1].trim())
    .slice(0, 5);

  return {
    docsFiles,
    recentSessions: sessionHeaders,
  };
}

// ── 6. views ──────────────────────────────────────────────────────────────────
// Parse public/index.html for `view === 'X'` expressions and annotate with
// a hardcoded status registry.

const VIEW_REGISTRY = {
  'chat':         { status: 'functional', partial: 'chat.html',         module: 'chat' },
  'dashboard':    { status: 'functional', partial: 'dashboard.html',    module: 'dashboard' },
  'actionQueue':  { status: 'functional', partial: 'actionQueue.html',  module: 'dashboard' },
  'focusArea':    { status: 'functional', partial: 'focusArea.html',    module: 'dashboard' },
  'personView':   { status: 'functional', partial: 'personView.html',   module: 'team' },
  'overview':     { status: 'functional', partial: 'overview.html',     module: 'overview' },
  'team':         { status: 'functional', partial: 'team.html',         module: 'team' },
  'projects':     { status: 'functional', partial: 'projects.html',     module: 'projects' },
  'commitments':  { status: 'functional', partial: 'commitments.html',  module: 'commitments' },
  'registry':     { status: 'functional', partial: 'registry.html',     module: 'registry' },
  'decisions':    { status: 'functional', partial: 'decisions.html',    module: 'dashboard' },
  'docs':         { status: 'functional', partial: 'docs.html',         module: 'documents' },
  'notion':       { status: 'functional', partial: 'notion.html',       module: 'notion-browser' },
  'knowledge':    { status: 'functional', partial: 'knowledge.html',    module: 'documents' },
  'marketingOps': { status: 'functional', partial: 'marketingOps.html', module: 'marketing-ops' },
  'crm':          { status: 'functional', partial: 'crm.html',          module: 'crm' },
  'ops':          { status: 'beta',       partial: 'ops.html',          module: 'ops' },
  'techTeam':     { status: 'functional', partial: 'techTeam.html',     module: 'tech-team' },
  'factory':      { status: 'functional', partial: 'factory.html',      module: 'factory' },
  'bmc':          { status: 'functional', partial: 'bmc.html',          module: 'bmc' },
  'dan-colin':    { status: 'functional', partial: 'dan-colin.html',    module: 'dan-colin' },
  'system-map':   { status: 'functional', partial: 'system-map.html',   module: 'system-map' },
  'status':       { status: 'functional', partial: 'status.html',       module: 'system-status' },
  'claude-usage': { status: 'beta',       partial: 'claude-usage.html', module: 'claude-usage' },
};

/**
 * Convert a view id to a human-readable title-case label.
 * Handles camelCase (actionQueue → Action Queue) and hyphens (dan-colin → Dan Colin).
 */
function viewIdToLabel(id) {
  // Split on hyphens and camelCase transitions
  const words = id
    .replace(/-/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ');
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function extractViews() {
  const indexHtmlPath = path.join(ROOT, 'public', 'index.html');
  const src = readFileSafe(indexHtmlPath);
  if (!src) return [];

  const viewPattern = /view\s*===\s*['"]([^'"]+)['"]/g;
  const seen = new Set();
  let match;
  while ((match = viewPattern.exec(src)) !== null) {
    seen.add(match[1]);
  }

  const partialsDir = path.join(ROOT, 'public', 'partials');
  const modulesDir = path.join(ROOT, 'src', 'js', 'modules');

  const partialFiles = new Set(listDirSafe(partialsDir));
  const moduleFiles = new Set(listDirSafe(modulesDir));

  return Array.from(seen).sort().map((id) => {
    const reg = VIEW_REGISTRY[id];
    const partial = reg ? reg.partial : `${id}.html`;
    const module = reg ? reg.module : id;
    const status = reg ? reg.status : 'unknown';

    return {
      id,
      label: viewIdToLabel(id),
      status,
      partial,
      module,
      hasPartial: partialFiles.has(partial),
      hasModule: moduleFiles.has(`${module}.js`),
    };
  });
}

// ── 7. agents ─────────────────────────────────────────────────────────────────

function extractAgents() {
  const agentsDir = path.join(ROOT, '.claude', 'agents');
  const files = listDirSafe(agentsDir).filter((f) => f.endsWith('.md'));

  return files.map((file) => {
    const name = path.basename(file, '.md');
    const src = readFileSafe(path.join(agentsDir, file)) || '';

    // Parse frontmatter: description: value
    const descMatch = src.match(/^description:\s*(.+)$/m);
    const description = descMatch ? descMatch[1].trim() : '';

    return { name, description };
  });
}

// ── public API ────────────────────────────────────────────────────────────────

async function buildSystemMap(force = false) {
  const now = Date.now();
  if (!force && _cache && now - _cacheAt < CACHE_TTL_MS) {
    return _cache;
  }

  const [routes, modules, notionDatabases, sheets, docs, agents, views] = await Promise.all([
    Promise.resolve(extractRoutes()),
    Promise.resolve(extractModules()),
    Promise.resolve(extractNotionDatabases()),
    Promise.resolve(extractSheets()),
    Promise.resolve(extractDocs()),
    Promise.resolve(extractAgents()),
    Promise.resolve(extractViews()),
  ]);

  _cache = { routes, modules, notionDatabases, sheets, docs, agents, views, generatedAt: new Date().toISOString() };
  _cacheAt = now;
  return _cache;
}

module.exports = { buildSystemMap };

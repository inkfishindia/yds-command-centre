#!/usr/bin/env node
/**
 * CSS Leakage Lint — Phase 3 Safety Check
 * Detects classes used in HTML partials that aren't loaded by their view's CSS.
 * Exit 1 if leakage found.
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const partialsDir = path.join(rootDir, 'public', 'partials');
const cssDir = path.join(rootDir, 'src', 'css');
const srcAppJs = path.join(rootDir, 'src', 'js', 'app.js');

// ---------------------------------------------------------------------------
// Alpine.js state class whitelists
//
// Problem: The linter extracts class tokens from Alpine :class="state && 'foo'"
// bindings and :class="{foo: bar}" objects. Many of these tokens are *reactive
// state variable names*, not CSS class names. They appear undefined in CSS
// because they're never meant to be CSS classes — Alpine reads the value of
// the JS variable and applies it as a class at runtime.
//
// These whitelists skip those false-positive rows from the report.
//
// How to extend:
//   A. Add a pattern to KNOWN_ALPINE_STATE_PATTERNS if it matches by shape
//      (e.g. all camelCase loading flags end in "Loading").
//   B. Add a literal to KNOWN_ALPINE_STATE_CLASSES for one-off global state
//      variables that are clearly Alpine reactive (not CSS).
//   C. Add to KNOWN_ALPINE_STATE_PER_PARTIAL for tokens that are ambiguous
//      globally but are definitely Alpine state inside a specific partial.
//      Format: { 'partial-name': ['class1', 'class2'] }
// ---------------------------------------------------------------------------

/**
 * Regex patterns for Alpine state class names — matched against the raw token.
 * All tokens matching any pattern are silently skipped from the leakage report.
 *
 * A. Loading-state suffix: camelCase flags like "actionQueueLoading",
 *    "commitmentsLoading", plus the literal "view-loading".
 * B. Sync-state literal: "systemSyncing".
 */
const KNOWN_ALPINE_STATE_PATTERNS = [
  /Loading$/,      // A: any *Loading flag (actionQueueLoading, dashboardLoading, etc.)
  /^view-loading$/, // A: literal view-loading class
  /^systemSyncing$/, // B: system sync state flag
];

/**
 * Global Alpine state class literals — clearly JS reactive variable names
 * used in :class bindings, never meant to be CSS classes.
 *
 * C: camelCase state flags from Alpine component state
 */
const KNOWN_ALPINE_STATE_CLASSES = new Set([
  'dropSubmitSuccess',
  'dcAnswerFocused',
  'watchExpanded',
  'closedExpanded',
  'factoryShowFormulas',
  'factorySimOpen',
]);

/**
 * Per-partial Alpine state classes — tokens that are ambiguous globally
 * (e.g. generic words) but are definitely Alpine reactive state inside
 * a specific partial (bound from data objects, not CSS class selectors).
 *
 * D: Status enums from :class="order.status" bindings in daily-sales
 * E: Generic words bound from row data objects in daily-sales
 */
const KNOWN_ALPINE_STATE_PER_PARTIAL = {
  'daily-sales': ['realized', 'status', 'all', 'acceptance', 'date', 'state',
                  'Accepted', 'Awaiting', 'Rejected'],
};

/**
 * Returns true if a class token should be skipped as a known Alpine state
 * binding (not a real CSS class reference).
 *
 * @param {string} cls - The class token to check
 * @param {string} partial - The partial name (without .html) for per-partial lookup
 */
function isKnownAlpineStateClass(cls, partial) {
  // Check global patterns
  for (const pattern of KNOWN_ALPINE_STATE_PATTERNS) {
    if (pattern.test(cls)) return true;
  }
  // Check global literals
  if (KNOWN_ALPINE_STATE_CLASSES.has(cls)) return true;
  // Check per-partial lists
  const perPartial = KNOWN_ALPINE_STATE_PER_PARTIAL[partial];
  if (perPartial && perPartial.includes(cls)) return true;
  return false;
}

async function extractViewStyleMap() {
  const content = await readFile(srcAppJs, 'utf-8');
  const mapMatch = content.match(/_viewStyleFile\(name\)\s*\{[\s\S]*?const fileMap\s*=\s*\{([\s\S]*?)\}/);
  if (!mapMatch) throw new Error('Could not parse _viewStyleFile map');
  const map = {};
  for (const line of mapMatch[1].split('\n').filter(l => l.includes(':'))) {
    const m = line.match(/['"]*([a-zA-Z0-9_-]+)['"]*\s*:\s*['"]*([a-zA-Z0-9_-]+)['"]*\s*[,;]?/);
    if (m) map[m[1]] = m[2];
  }
  return map;
}

function extractClassesFromHtml(html) {
  const classes = new Set();
  // Static classes
  for (const m of html.matchAll(/class=["']([^"']+)["']/g)) {
    const v = m[1];
    if (!v.match(/[$@:=]/)) {
      v.split(/\s+/).forEach(t => t && /^[a-z-][a-z0-9-]*$/i.test(t) && classes.add(t));
    }
  }
  // Alpine object + array
  for (const m of html.matchAll(/:class=["']?\{([^}]+)\}["']?/g)) {
    for (const pair of m[1].split(',')) {
      const km = pair.match(/['"]([a-z-][a-z0-9-]*)['"]/i);
      if (km) classes.add(km[1]);
    }
  }
  for (const m of html.matchAll(/:class=["']?\[([\s\S]*?)\]["']?/g)) {
    for (const item of m[1].split(',')) {
      const c = item.trim();
      if (!c.match(/[&|?()]/)) {
        const cm = c.match(/['"]([a-z-][a-z0-9-]*)['"]/i);
        if (cm) classes.add(cm[1]);
      }
    }
  }
  return Array.from(classes);
}

async function buildCssDefinitionMap() {
  const defs = {};
  async function scan(dir, base) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const fp = path.join(dir, e.name);
      if (e.isFile() && e.name.endsWith('.css')) {
        const css = await readFile(fp, 'utf-8');
        const fname = base ? path.join(base, e.name) : e.name;
        // Strip @media/@supports/@keyframes/@import blocks
        const cleaned = css.replace(/@(media|supports|keyframes|import)[^{]*(\{[^}]*\})?/gs, '');
        // Extract all .classname tokens: \.[a-zA-Z_][a-zA-Z0-9_-]*
        for (const m of cleaned.matchAll(/\.([a-zA-Z_][a-zA-Z0-9_-]*)/g)) {
          const c = m[1];
          if (!defs[c]) defs[c] = [];
          if (!defs[c].includes(fname)) defs[c].push(fname);
        }
      } else if (e.isDirectory()) {
        await scan(fp, base ? path.join(base, e.name) : e.name);
      }
    }
  }
  await scan(cssDir, '');
  return defs;
}

function detectLeakage(partial, classes, map, defs) {
  const view = partial.replace('.html', '');
  const loaded = new Set(['core.css']);
  if (map[view]) loaded.add(`views/${map[view]}.css`);
  const leaks = [];
  for (const cls of classes) {
    // Skip known Alpine reactive state bindings (not CSS classes)
    if (isKnownAlpineStateClass(cls, view)) continue;
    const def = defs[cls] || [];
    if (def.length === 0) {
      leaks.push({ cls, def: null });
    } else if (!def.some(f => loaded.has(f))) {
      leaks.push({ cls, def });
    }
  }
  return leaks;
}

function formatLeakTable(leaks) {
  if (!leaks.length) return '';
  const rows = leaks.map(({ p, cls, def }) => {
    const ds = def === null ? 'undefined' : def.join(', ');
    return `| ${p} | \`.${cls}\` | ${ds} |`;
  });
  return `| Partial | Class | Defined In |\n|---|---|---|\n${rows.join('\n')}`;
}

function formatOrphans(orphans) {
  if (!orphans.length) return '';
  const rows = orphans.map(({ cls, use, def }) => {
    const u = use.length ? use.join(', ') : '(dead)';
    const a = use.length > 1 ? 'core.css' : (use.length === 1 ? `views/${use[0]}.css` : 'DELETE');
    return `| \`.${cls}\` | ${u} | ${a} |`;
  });
  return `| Class | Used By | Action |\n|---|---|---|\n${rows.join('\n')}`;
}

async function main() {
  try {
    console.log('Checking CSS leakage...\n');
    const map = await extractViewStyleMap();
    const defs = await buildCssDefinitionMap();
    const partials = (await readdir(partialsDir)).filter(f => f.endsWith('.html'));
    const allLeaks = [];

    for (const partial of partials) {
      const html = await readFile(path.join(partialsDir, partial), 'utf-8');
      const classes = extractClassesFromHtml(html);
      const leaks = detectLeakage(partial, classes, map, defs);
      for (const leak of leaks) {
        allLeaks.push({ p: partial.replace('.html', ''), ...leak });
      }
    }

    // styles.css orphans: classes only in styles.css, not in core or views
    const orphans = [];
    for (const [cls, files] of Object.entries(defs)) {
      if (!files.includes('styles.css')) continue;
      if (files.length === 1) {
        orphans.push({ cls, use: [], def: 'styles.css' });
      } else if (!files.includes('core.css')) {
        const use = [];
        for (const p of partials) {
          const html = await readFile(path.join(partialsDir, p), 'utf-8');
          if (extractClassesFromHtml(html).includes(cls)) {
            use.push(p.replace('.html', ''));
          }
        }
        if (use.length) orphans.push({ cls, use, def: 'styles.css' });
      }
    }

    const hasLeaks = allLeaks.length > 0;
    const hasOrphans = orphans.length > 0;

    if (hasLeaks) {
      console.log('❌ CSS LEAKAGE DETECTED\n');
      console.log(formatLeakTable(allLeaks));
      console.log();
    }

    if (hasOrphans) {
      console.log(`## styles.css orphans (${orphans.length} rows)\n`);
      console.log(formatOrphans(orphans));
      console.log();
    } else {
      console.log(`## styles.css orphans (0 rows)\n`);
    }

    if (!hasLeaks && !hasOrphans) {
      console.log('✓ No CSS leakage detected.');
    }

    process.exit(hasLeaks ? 1 : 0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();

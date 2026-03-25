import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src', 'js');
const outDir = path.join(rootDir, 'public', 'js');
const cssDir = path.join(rootDir, 'src', 'css');
const cssOutDir = path.join(rootDir, 'public', 'css');

// ── JS bundling ─────────────────────────────────────────────────────────────
// Reads src/js/app.js, inlines every `import { ... } from './modules/X.js'`
// into a single IIFE bundle so the browser makes ONE request instead of 22.

async function collectModules(entryPath) {
  const entry = await readFile(entryPath, 'utf8');
  const importRe = /^import\s+\{([^}]+)\}\s+from\s+['"](\.\/modules\/[^'"]+)['"];?\s*$/gm;
  const imports = [];
  let match;
  while ((match = importRe.exec(entry)) !== null) {
    const names = match[1].split(',').map(n => n.trim());
    const relPath = match[2];
    imports.push({ names, relPath, fullMatch: match[0] });
  }
  return { entry, imports };
}

async function bundle() {
  const { entry, imports } = await collectModules(path.join(srcDir, 'app.js'));

  // Read each module, strip its export and wrap in a namespace
  const moduleSources = [];
  for (const imp of imports) {
    const modPath = path.resolve(srcDir, imp.relPath);
    let src = await readFile(modPath, 'utf8');

    // Remove import statements within modules (they import from sibling modules)
    src = src.replace(/^import\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];?\s*$/gm, '');

    // Convert `export function X` → `function X`
    src = src.replace(/^export\s+function\s+/gm, 'function ');
    // Convert `export const X` → `const X`
    src = src.replace(/^export\s+const\s+/gm, 'const ');
    // Convert `export { ... }` → nothing
    src = src.replace(/^export\s+\{[^}]*\};?\s*$/gm, '');

    moduleSources.push(`// ── ${imp.relPath} ──\n${src}`);
  }

  // Strip import lines from the entry
  let entryBody = entry;
  for (const imp of imports) {
    entryBody = entryBody.replace(imp.fullMatch, '');
  }

  // Build the bundle: all modules first, then entry (no longer a module, just a script)
  const bundle = `// YDS Command Centre — Bundled build\n// Generated ${new Date().toISOString()}\n(function() {\n"use strict";\n${moduleSources.join('\n\n')}\n\n// ── app.js (entry) ──\n${entryBody}\n})();\n`;

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'app.js'), bundle, 'utf8');
}

// ── CSS minification ────────────────────────────────────────────────────────
// Lightweight: strip comments, collapse whitespace. No new deps needed.

async function minifyCSS() {
  const srcCss = path.join(cssDir, 'styles.css');
  const outCss = path.join(cssOutDir, 'styles.css');

  let css;
  try {
    css = await readFile(srcCss, 'utf8');
  } catch {
    // If src/css doesn't exist, copy from public (first run migration)
    css = await readFile(outCss, 'utf8');
    await mkdir(cssDir, { recursive: true });
    await writeFile(srcCss, css, 'utf8');
    console.log('  Copied public/css/styles.css → src/css/styles.css (source of truth)');
  }

  const minified = css
    // Remove block comments (but keep /*! license */ comments)
    .replace(/\/\*(?!!)[^]*?\*\//g, '')
    // Collapse runs of whitespace to single space
    .replace(/\s{2,}/g, ' ')
    // Remove space around braces/colons/semicolons
    .replace(/\s*([{};:,])\s*/g, '$1')
    // Remove trailing semicolons before closing brace
    .replace(/;}/g, '}')
    // Remove leading whitespace on lines
    .replace(/\n\s+/g, '\n')
    // Collapse newlines
    .replace(/\n{2,}/g, '\n')
    .trim();

  await mkdir(cssOutDir, { recursive: true });
  await writeFile(outCss, minified, 'utf8');

  const saved = ((1 - minified.length / css.length) * 100).toFixed(0);
  console.log(`  CSS: ${(css.length / 1024).toFixed(0)} KB → ${(minified.length / 1024).toFixed(0)} KB (${saved}% smaller)`);
}

// ── Run ─────────────────────────────────────────────────────────────────────
console.log('Building assets…');
await rm(outDir, { recursive: true, force: true });
await bundle();
console.log('  JS bundled: 22 files → 1 file');
await minifyCSS();
console.log('Done.');

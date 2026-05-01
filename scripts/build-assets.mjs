import esbuild from 'esbuild';
import { mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src', 'js');
const outDir = path.join(rootDir, 'public', 'js');
const cssDir = path.join(rootDir, 'src', 'css');
const cssOutDir = path.join(rootDir, 'public', 'css');

async function bundle() {
  await mkdir(outDir, { recursive: true });
  await esbuild.build({
    entryPoints: [path.join(srcDir, 'app.js')],
    outdir: outDir,
    bundle: true,
    splitting: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2020'],
    minify: true,
    entryNames: '[name]',
    chunkNames: 'chunks/[name]-[hash]',
    logLevel: 'silent',
  });
}

async function bundleCss() {
  const viewDir = path.join(cssDir, 'views');
  const viewEntries = (await readdir(viewDir))
    .filter((name) => name.endsWith('.css'))
    .map((name) => path.join(viewDir, name));
  const entryPoints = [
    path.join(cssDir, 'core.css'),
    ...viewEntries,
  ];

  await mkdir(cssOutDir, { recursive: true });
  await esbuild.build({
    entryPoints,
    outdir: cssOutDir,
    outbase: cssDir,
    bundle: true,
    minify: true,
    entryNames: '[dir]/[name]',
    logLevel: 'silent',
  });

  console.log(`  CSS split into core + ${viewEntries.length} lazy view bundles`);
}

// ── Run ─────────────────────────────────────────────────────────────────────
console.log('Building assets…');
await rm(outDir, { recursive: true, force: true });
await rm(cssOutDir, { recursive: true, force: true });
await bundle();
console.log('  JS bundled with esbuild and code splitting');
await bundleCss();
console.log('Done.');

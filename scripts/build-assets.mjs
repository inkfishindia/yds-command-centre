import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src', 'js');
const outDir = path.join(rootDir, 'public', 'js');

async function copyDir(fromDir, toDir) {
  await mkdir(toDir, { recursive: true });
  const entries = await readdir(fromDir, { withFileTypes: true });

  for (const entry of entries) {
    const fromPath = path.join(fromDir, entry.name);
    const toPath = path.join(toDir, entry.name);

    if (entry.isDirectory()) {
      await copyDir(fromPath, toPath);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
    const source = await readFile(fromPath, 'utf8');
    await writeFile(toPath, source, 'utf8');
  }
}

await rm(outDir, { recursive: true, force: true });
await copyDir(srcDir, outDir);

const express = require('express');
const router = express.Router();
const fs = require('fs/promises');
const path = require('path');
const config = require('../config');

const DOCUMENT_DIRS = {
  briefings: config.BRIEFINGS_DIR,
  decisions: config.DECISIONS_DIR,
  'weekly-reviews': config.WEEKLY_REVIEWS_DIR,
};
const LIST_CACHE_TTL = 15 * 1000;
const CONTENT_CACHE_TTL = 15 * 1000;
const listCache = new Map();
const contentCache = new Map();

/**
 * GET /api/documents
 * List all documents across all directories.
 */
router.get('/', async (req, res) => {
  try {
    const all = {};
    for (const [name, dir] of Object.entries(DOCUMENT_DIRS)) {
      all[name] = await listDir(dir);
    }
    res.json(all);
  } catch (err) {
    console.error('Documents list error:', err);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

/**
 * GET /api/documents/:category
 * List documents in a specific category (briefings, decisions, weekly-reviews).
 */
router.get('/:category', async (req, res) => {
  const dir = DOCUMENT_DIRS[req.params.category];
  if (!dir) {
    return res.status(404).json({ error: 'Unknown document category' });
  }
  res.json({ files: await listDir(dir) });
});

/**
 * GET /api/documents/:category/:filename
 * Read a specific document.
 */
router.get('/:category/:filename', async (req, res) => {
  const dir = DOCUMENT_DIRS[req.params.category];
  if (!dir) {
    return res.status(404).json({ error: 'Unknown document category' });
  }

  const filename = path.basename(req.params.filename); // Prevent path traversal
  const filePath = path.join(dir, filename);

  if (!filePath.startsWith(dir)) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  try {
    const content = await readDocument(filePath);
    res.json({ filename, content, category: req.params.category });
  } catch (err) {
    res.status(404).json({ error: 'File not found' });
  }
});

async function listDir(dir) {
  const cached = listCache.get(dir);
  if (cached && Date.now() - cached.time < LIST_CACHE_TTL) {
    return cached.data;
  }

  try {
    await fs.access(dir);
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter(e => e.isFile() && e.name.endsWith('.md'))
        .map(async (entry) => {
          const stat = await fs.stat(path.join(dir, entry.name));
          return {
            name: entry.name,
            modified: stat.mtime.toISOString(),
          };
        })
    );
    files.sort((a, b) => b.name.localeCompare(a.name));
    listCache.set(dir, { data: files, time: Date.now() });
    return files;
  } catch {
    return [];
  }
}

async function readDocument(filePath) {
  const cached = contentCache.get(filePath);
  if (cached && Date.now() - cached.time < CONTENT_CACHE_TTL) {
    return cached.data;
  }

  const content = await fs.readFile(filePath, 'utf-8');
  contentCache.set(filePath, { data: content, time: Date.now() });
  return content;
}

module.exports = router;

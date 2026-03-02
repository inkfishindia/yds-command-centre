const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const config = require('../config');

const DOCUMENT_DIRS = {
  briefings: config.BRIEFINGS_DIR,
  decisions: config.DECISIONS_DIR,
  'weekly-reviews': config.WEEKLY_REVIEWS_DIR,
};

/**
 * GET /api/documents
 * List all documents across all directories.
 */
router.get('/', (req, res) => {
  const all = {};
  for (const [name, dir] of Object.entries(DOCUMENT_DIRS)) {
    all[name] = listDir(dir);
  }
  res.json(all);
});

/**
 * GET /api/documents/:category
 * List documents in a specific category (briefings, decisions, weekly-reviews).
 */
router.get('/:category', (req, res) => {
  const dir = DOCUMENT_DIRS[req.params.category];
  if (!dir) {
    return res.status(404).json({ error: 'Unknown document category' });
  }
  res.json({ files: listDir(dir) });
});

/**
 * GET /api/documents/:category/:filename
 * Read a specific document.
 */
router.get('/:category/:filename', (req, res) => {
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
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ filename, content, category: req.params.category });
  } catch (err) {
    res.status(404).json({ error: 'File not found' });
  }
});

function listDir(dir) {
  try {
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isFile() && e.name.endsWith('.md'))
      .map(e => ({
        name: e.name,
        modified: fs.statSync(path.join(dir, e.name)).mtime.toISOString(),
      }))
      .sort((a, b) => b.name.localeCompare(a.name));
  } catch {
    return [];
  }
}

module.exports = router;

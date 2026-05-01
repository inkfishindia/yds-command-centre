const fs = require('fs');
const path = require('path');
const config = require('../config');

// In-memory cache
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getRegistryPath() {
  const workspace = config.COLIN_WORKSPACE || path.join(__dirname, '../../..', 'dan');
  return path.join(workspace, 'knowledge', 'nlm-notebook-registry.md');
}

function parseRegistry() {
  const now = Date.now();
  if (cache && (now - cacheTime) < CACHE_TTL) return cache;

  const filePath = getRegistryPath();
  if (!fs.existsSync(filePath)) {
    cache = { available: false, error: 'Registry file not found' };
    cacheTime = now;
    return cache;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n');

  const categories = [];
  let currentCategory = null;
  let currentNotebook = null;
  let collectingDescription = false;

  // Track special sections to skip
  const skipSections = ['Empty / Cleanup Candidates', 'Possible Duplicates to Merge', 'Quick Lookup', 'Stats'];
  let skipping = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ## Category header
    if (line.startsWith('## ')) {
      const name = line.slice(3).trim();
      if (skipSections.includes(name)) {
        skipping = true;
        currentCategory = null;
        continue;
      }
      skipping = false;
      // Finish previous notebook
      if (currentNotebook && currentCategory) {
        currentNotebook.description = currentNotebook.description.trim();
        currentCategory.notebooks.push(currentNotebook);
        currentNotebook = null;
      }
      currentCategory = { name, notebooks: [] };
      categories.push(currentCategory);
      collectingDescription = false;
      continue;
    }

    if (skipping) continue;

    // ### Notebook header
    if (line.startsWith('### ') && currentCategory) {
      // Save previous notebook
      if (currentNotebook) {
        currentNotebook.description = currentNotebook.description.trim();
        currentCategory.notebooks.push(currentNotebook);
      }
      let name = line.slice(4).trim();
      const shared = name.includes('*(shared)*');
      name = name.replace(/\s*\*\(shared\)\*\s*/, '').trim();
      currentNotebook = { name, id: null, sourceCount: 0, description: '', shared };
      collectingDescription = false;
      continue;
    }

    // ID + source count line: `uuid` | N sources
    if (currentNotebook && !currentNotebook.id && line.match(/^`[a-f0-9-]+`/)) {
      const idMatch = line.match(/^`([a-f0-9-]+)`/);
      const countMatch = line.match(/\|\s*(\d+)\s*source/);
      if (idMatch) currentNotebook.id = idMatch[1];
      if (countMatch) currentNotebook.sourceCount = parseInt(countMatch[1], 10);
      collectingDescription = true;
      continue;
    }

    // Description lines
    if (collectingDescription && currentNotebook && line.trim() && !line.startsWith('#') && !line.startsWith('---')) {
      currentNotebook.description += (currentNotebook.description ? ' ' : '') + line.trim();
    }

    // Blank line or separator ends description collection
    if ((line.trim() === '' || line.startsWith('---')) && collectingDescription) {
      collectingDescription = false;
    }
  }

  // Push last notebook
  if (currentNotebook && currentCategory) {
    currentNotebook.description = currentNotebook.description.trim();
    currentCategory.notebooks.push(currentNotebook);
  }

  // Compute stats
  const allNotebooks = categories.flatMap(c => c.notebooks);
  const stats = {
    totalNotebooks: allNotebooks.length,
    totalSources: allNotebooks.reduce((sum, n) => sum + n.sourceCount, 0),
    categories: categories.length,
    largest: [...allNotebooks].sort((a, b) => b.sourceCount - a.sourceCount).slice(0, 5).map(n => ({ name: n.name, sourceCount: n.sourceCount })),
    shared: allNotebooks.filter(n => n.shared).length,
  };

  const lastUpdatedLine = lines.find(l => l.startsWith('Last updated:'));
  const lastUpdated = lastUpdatedLine ? lastUpdatedLine.replace('Last updated:', '').trim() : null;

  const result = { available: true, categories, stats, lastUpdated };
  cache = result;
  cacheTime = now;
  return result;
}

function clearCache() {
  cache = null;
  cacheTime = 0;
}

module.exports = { parseRegistry, clearCache };

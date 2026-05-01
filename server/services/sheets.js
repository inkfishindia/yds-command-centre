'use strict';

// Evict package internals so they reload fresh whenever this shim reloads.
// Restores the "delete sheets.js from require.cache → fresh state" semantics
// that tests rely on (test/sheets-service.test.js + test/daily-sales-service.test.js
// inject mocks via require.cache and expect clean module state on re-require).
//
// Production impact: zero. The shim is required once at server startup; the
// eviction loop runs against an empty/sparse cache, deletes nothing useful,
// then loads ./sheets/index fresh. After that, this shim stays cached forever.
const path = require('path');
const PKG_DIR = path.join(__dirname, 'sheets');
for (const key of Object.keys(require.cache)) {
  if (key.startsWith(PKG_DIR + path.sep)) {
    delete require.cache[key];
  }
}

module.exports = require('./sheets/index');

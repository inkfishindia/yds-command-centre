'use strict';
// Public entry point — preserves require('../services/notion') for all 38+ callers.
// Implementation lives in ./notion/. See ./notion/FILE-MAP.md.
module.exports = require('./notion/index');

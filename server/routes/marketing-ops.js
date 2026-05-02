'use strict';

/**
 * marketing-ops.js — Shim entry for the marketing-ops route package.
 *
 * Re-exports the Express router from ./marketing-ops/index.js so external
 * callers (server.js: app.use('/api/marketing-ops', require('./server/routes/marketing-ops')))
 * continue to work unchanged after the package split.
 *
 * Add new handlers in the appropriate leaf under ./marketing-ops/ and register
 * them in ./marketing-ops/index.js. See ./marketing-ops/FILE-MAP.md.
 */

module.exports = require('./marketing-ops/');

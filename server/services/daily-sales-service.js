'use strict';

/**
 * daily-sales-service.js — compatibility shim.
 *
 * The service has been refactored into server/services/daily-sales/ (a module folder).
 * This file exists only to keep existing require() paths working.
 * All logic lives in server/services/daily-sales/index.js.
 */

module.exports = require('./daily-sales');

'use strict';

// pipeline.js — getPipelineData domain read (CRM lead pipeline from LEAD_FLOWS sheet)
// Owns: getPipelineData, getSheetData (private helper for pipeline only)
// Depends on: ./cache, ./client, ./parse-rows
// DO NOT add: strategy-cascade (strategy-cascade.js), CRUD ops (crud.js), registry reads

// Note: config is NOT captured at module top — it is required lazily inside getSheetData
// so that test harness injections into require.cache[CONFIG_PATH] are honoured even when
// this module stays cached between test runs (Decision #73).

const { getCached, setCache } = require('./cache');
const { getClient, isConfigured } = require('./client');
const { parseRows } = require('./parse-rows');

/**
 * Private: fetch a raw range from GOOGLE_SHEETS_ID (the CRM sheet).
 * Only used internally by getPipelineData.
 */
async function getSheetData(range) {
  const config = require('../../config');
  const client = getClient();
  // Config error — not an unexpected condition, no warning needed
  if (!client) return null;

  const cached = getCached(`sheet_${range}`);
  if (cached) return cached;

  try {
    const response = await client.spreadsheets.values.get({
      spreadsheetId: config.GOOGLE_SHEETS_ID,
      range,
    });

    const data = response.data.values || [];
    setCache(`sheet_${range}`, data);
    return data;
  } catch (err) {
    console.warn(`[sheets] getSheetData("${range}") API error:`, err.message);
    throw err; // Re-throw so callers (getPipelineData) can apply their own error shape
  }
}

/**
 * Returns pipeline data from the LEAD_FLOWS sheet, broken down by flow type
 * (b2b vs drop-ship) with stage counts and SLA breach indicators.
 *
 * Returns { available: false } when Google Sheets is not configured or an
 * error occurs — the UI should handle this gracefully.
 */
async function getPipelineData() {
  if (!isConfigured()) {
    return { available: false, reason: 'not_configured' };
  }

  try {
    const rows = await getSheetData('LEAD_FLOWS!A:Z');
    // getSheetData returns null when client init failed (config error)
    if (!rows) return { available: false, reason: 'not_configured' };

    const leads = parseRows(rows);

    // Actual sheet column is "channel" (values: "B2B", etc.), not "flow_type"
    const b2bLeads = leads.filter(l => (l.channel || '').toLowerCase() === 'b2b');
    const otherLeads = leads.filter(l => (l.channel || '').toLowerCase() !== 'b2b' && (l.channel || '') !== '');

    const countByStage = (items) => {
      const stages = {};
      items.forEach(l => {
        const stage = l.stage || l.status || 'Unknown';
        stages[stage] = (stages[stage] || 0) + 1;
      });
      return Object.entries(stages).map(([name, count]) => ({ name, count }));
    };

    const countByStatus = (items) => {
      const statuses = {};
      items.forEach(l => {
        const status = l.status || 'Unknown';
        statuses[status] = (statuses[status] || 0) + 1;
      });
      return Object.entries(statuses).map(([name, count]) => ({ name, count }));
    };

    // SLA breach: lead not contacted within 2 hours of creation
    const now = Date.now();
    const slaBreaches = leads.filter(l => {
      const contactStatus = (l.contact_status || '').toLowerCase();
      const createdAt = l.created_at ? new Date(l.created_at).getTime() : 0;
      return (
        contactStatus === 'not contacted' &&
        createdAt > 0 &&
        (now - createdAt) > 2 * 60 * 60 * 1000
      );
    });

    return {
      available: true,
      totalLeads: leads.length,
      b2b: {
        stages: countByStage(b2bLeads),
        statuses: countByStatus(b2bLeads),
        totalActive: b2bLeads.filter(l => l.status === 'Active' || l.status === 'New' || l.status === 'Qualified').length,
        total: b2bLeads.length,
        slaBreaches: slaBreaches.filter(l => (l.channel || '').toLowerCase() === 'b2b').length,
      },
      other: {
        stages: countByStage(otherLeads),
        statuses: countByStatus(otherLeads),
        total: otherLeads.length,
      },
      statusBreakdown: countByStatus(leads),
      totalSlaBreaches: slaBreaches.length,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[sheets] getPipelineData API error:', err.message);
    return { available: false, reason: 'api_error', error: err.message };
  }
}

module.exports = { getPipelineData };

'use strict';

// Competitor Intelligence Service
// Aggregates data from the 12-tab Competitor Intel Google Sheet.
// All fetchSheet calls degrade gracefully with .catch(() => ({ available: false })).

const { fetchSheet } = require('./sheets');

// ── Helpers ───────────────────────────────────────────────────────────────────

// Strip null/empty values from a row object for clean API responses
function stripNulls(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined && v !== '') out[k] = v;
  }
  return out;
}

// Safe fetch — returns { available: false } on any error
function safeFetch(key) {
  return fetchSheet(key).catch(() => ({ available: false }));
}

// Rows from a fetchSheet result, or [] if unavailable
function rows(result) {
  return result && result.available && Array.isArray(result.rows) ? result.rows : [];
}

// Match a row against a brand/competitor string (case-insensitive)
// Checks common field names used across sheets: Brand, Competitor, Competitor_ID
function matchesBrand(row, brand) {
  const b = brand.toLowerCase();
  return (
    (row['Brand'] || '').toLowerCase() === b ||
    (row['Competitor'] || '').toLowerCase() === b ||
    (row['Competitor_ID'] || '').toLowerCase() === b
  );
}

// Numeric capability dimensions in order
const CAPABILITY_DIMENSIONS = [
  'Brand_Power', 'Customizer_UX', 'Catalog_Depth', 'Speed',
  'Pricing_Power', 'Integrations', 'Sustainability',
  'B2B_Readiness', 'D2C_Friendliness', 'Tech_Maturity',
];

// Compute average score and identify top/weak areas for a capability row
function computeCapabilitySummary(row) {
  const scores = CAPABILITY_DIMENSIONS
    .map(d => ({ dim: d, val: parseFloat(row[d]) || 0 }))
    .filter(s => s.val > 0);

  if (scores.length === 0) return { brand: row['Brand'] || '', avgScore: 0, topStrength: null, weakestArea: null };

  const avg = scores.reduce((sum, s) => sum + s.val, 0) / scores.length;
  const sorted = [...scores].sort((a, b) => b.val - a.val);
  return {
    brand: row['Brand'] || '',
    avgScore: Math.round(avg * 100) / 100,
    topStrength: sorted[0] ? sorted[0].dim : null,
    weakestArea: sorted[sorted.length - 1] ? sorted[sorted.length - 1].dim : null,
  };
}

// ── getOverview ───────────────────────────────────────────────────────────────

/**
 * Returns a high-level overview of all tracked competitors.
 * Parallel-fetches: CI_COMPETITORS, CI_CAPABILITIES, CI_SWOT, CI_NOTES, CI_WATCHLIST
 */
async function getOverview() {
  const [competitorsResult, capabilitiesResult, , notesResult, watchlistResult] = await Promise.all([
    safeFetch('CI_COMPETITORS'),
    safeFetch('CI_CAPABILITIES'),
    safeFetch('CI_SWOT'),
    safeFetch('CI_NOTES'),
    safeFetch('CI_WATCHLIST'),
  ]);

  const competitorRows = rows(competitorsResult);
  const capabilityRows = rows(capabilitiesResult);
  const noteRows = rows(notesResult);
  const watchlistRows = rows(watchlistResult);

  // Build by-tier and by-category breakdowns
  const tierMap = {};
  const categoryMap = {};
  for (const c of competitorRows) {
    const tier = c['Tier'] || 'Unknown';
    tierMap[tier] = (tierMap[tier] || 0) + 1;
    const cat = c['Category'] || 'Unknown';
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  }
  const byTier = Object.entries(tierMap).map(([name, count]) => ({ name, count }));
  const byCategory = Object.entries(categoryMap).map(([name, count]) => ({ name, count }));

  // Recent notes: sort by Date desc, take last 10
  const recentNotes = noteRows
    .filter(n => n['Date'])
    .sort((a, b) => new Date(b['Date']) - new Date(a['Date']))
    .slice(0, 10)
    .map(stripNulls);

  // Watchlist: rows where Action_Required is truthy or recently added
  const watchlist = watchlistRows
    .filter(w => (w['Action_Required'] || '').toUpperCase() === 'TRUE' || w['Action_Required'] === true)
    .sort((a, b) => new Date(b['Date'] || 0) - new Date(a['Date'] || 0))
    .map(stripNulls);

  // Capability summary per competitor
  const capabilitySummary = capabilityRows.map(computeCapabilitySummary);

  return {
    competitors: competitorRows.map(c => stripNulls({
      Brand: c['Brand'],
      Tier: c['Tier'],
      Category: c['Category'],
      Website: c['Website'],
      Instagram: c['Instagram'],
      Tags: c['Tags'],
      'Core Strengths': c['Core Strengths'],
      'Typical Use': c['Typical Use'],
    })),
    competitorCount: competitorRows.length,
    byTier,
    byCategory,
    recentNotes,
    watchlist,
    capabilitySummary,
    timestamp: new Date().toISOString(),
  };
}

// ── getCompetitor ─────────────────────────────────────────────────────────────

/**
 * Returns a full merged profile for a single competitor across all 12 sheets.
 */
async function getCompetitor(brand) {
  const [
    competitorsResult,
    analysisResult,
    positioningResult,
    notesResult,
    capabilitiesResult,
    uxProductResult,
    messagingResult,
    swotResult,
    philosophyResult,
    momentsResult,
    stealAdaptResult,
    watchlistResult,
  ] = await Promise.all([
    safeFetch('CI_COMPETITORS'),
    safeFetch('CI_ANALYSIS'),
    safeFetch('CI_POSITIONING'),
    safeFetch('CI_NOTES'),
    safeFetch('CI_CAPABILITIES'),
    safeFetch('CI_UX_PRODUCT'),
    safeFetch('CI_MESSAGING'),
    safeFetch('CI_SWOT'),
    safeFetch('CI_PHILOSOPHY'),
    safeFetch('CI_MOMENTS'),
    safeFetch('CI_STEAL_ADAPT'),
    safeFetch('CI_WATCHLIST'),
  ]);

  const find = (result) => rows(result).find(r => matchesBrand(r, brand)) || null;
  const filter = (result) => rows(result).filter(r => matchesBrand(r, brand));

  const master = find(competitorsResult);
  if (!master) {
    return { available: false, brand, reason: 'not_found' };
  }

  return {
    available: true,
    master: stripNulls(master),
    analysis: stripNulls(find(analysisResult)),
    positioning: stripNulls(find(positioningResult)),
    capabilities: stripNulls(find(capabilitiesResult)),
    uxProduct: stripNulls(find(uxProductResult)),
    messaging: stripNulls(find(messagingResult)),
    swot: stripNulls(find(swotResult)),
    philosophy: stripNulls(find(philosophyResult)),
    moments: stripNulls(find(momentsResult)),
    stealAdapt: filter(stealAdaptResult).map(stripNulls),
    notes: filter(notesResult).map(stripNulls),
    watchlist: filter(watchlistResult).map(stripNulls),
  };
}

// ── getCapabilities ───────────────────────────────────────────────────────────

/**
 * Returns all capability rows for radar/comparison view.
 */
async function getCapabilities() {
  const result = await safeFetch('CI_CAPABILITIES');
  if (!result.available) return { available: false };

  return {
    available: true,
    rows: result.rows.map(stripNulls),
    dimensions: CAPABILITY_DIMENSIONS,
  };
}

// ── getSWOT ───────────────────────────────────────────────────────────────────

/**
 * Returns all SWOT rows.
 */
async function getSWOT() {
  const result = await safeFetch('CI_SWOT');
  if (!result.available) return { available: false };

  return {
    available: true,
    rows: result.rows.map(stripNulls),
  };
}

// ── getWatchlist ──────────────────────────────────────────────────────────────

/**
 * Returns watchlist rows with optional filters.
 * @param {object} filters - { type: string, days: number }
 */
async function getWatchlist(filters = {}) {
  const result = await safeFetch('CI_WATCHLIST');
  if (!result.available) return { available: false };

  let watchlistRows = result.rows;

  // Filter by Change_Type
  if (filters.type) {
    const typeFilter = filters.type.toLowerCase();
    watchlistRows = watchlistRows.filter(
      w => (w['Change_Type'] || '').toLowerCase() === typeFilter
    );
  }

  // Filter by recent N days
  if (filters.days) {
    const daysAgo = Date.now() - parseInt(filters.days, 10) * 24 * 60 * 60 * 1000;
    watchlistRows = watchlistRows.filter(w => {
      const d = w['Date'] ? new Date(w['Date']).getTime() : 0;
      return d >= daysAgo;
    });
  }

  // Sort by Date desc
  watchlistRows = watchlistRows
    .sort((a, b) => new Date(b['Date'] || 0) - new Date(a['Date'] || 0))
    .map(stripNulls);

  return { available: true, rows: watchlistRows };
}

// ── getStealAdaptAvoid ────────────────────────────────────────────────────────

/**
 * Returns steal/adapt/avoid rows grouped by Action.
 */
async function getStealAdaptAvoid() {
  const result = await safeFetch('CI_STEAL_ADAPT');
  if (!result.available) return { available: false };

  const steal = [];
  const adapt = [];
  const avoid = [];

  for (const row of result.rows) {
    const action = (row['Action'] || '').toLowerCase();
    const clean = stripNulls(row);
    if (action === 'steal') steal.push(clean);
    else if (action === 'adapt') adapt.push(clean);
    else if (action === 'avoid') avoid.push(clean);
  }

  return { available: true, steal, adapt, avoid };
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  getOverview,
  getCompetitor,
  getCapabilities,
  getSWOT,
  getWatchlist,
  getStealAdaptAvoid,
};

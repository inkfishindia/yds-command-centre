'use strict';

const { fetchSheet } = require('./sheets');

const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

function clearCache() {
  cache.clear();
}

function normalizeRows(result) {
  if (!result.available || !result.rows) return [];
  return result.rows.map(row => {
    const obj = {};
    for (const [key, value] of Object.entries(row)) {
      if (key !== 'rowIndex') {
        const normalizedKey = key.toLowerCase().trim().replace(/\./g, '_').replace(/\s+/g, '_');
        obj[normalizedKey] = value || '';
      }
    }
    return obj;
  });
}

function parseNumber(value) {
  if (!value && value !== 0) return 0;
  const cleaned = String(value).replace(/[₹,\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseMicros(value) {
  const n = parseInt(value, 10);
  return isNaN(n) ? 0 : n / 1_000_000;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  // Handle various formats like "4/14/2025", "2025-04-14"
  const parts = dateStr.split(/[-\/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      // D/M/YYYY
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
  }
  return null;
}

// Grade thresholds from spec
function getGrade(cpa, conversions) {
  if (conversions === 0 || cpa > 50) return 'F';
  if (cpa < 10) return 'A+';
  if (cpa < 20) return 'A';
  if (cpa < 30) return 'B';
  if (cpa < 50) return 'C';
  return 'F';
}

function getVerdict(grade) {
  if (grade === 'A+' || grade === 'A') return 'SCALE NOW';
  if (grade === 'B') return 'MONITOR';
  if (grade === 'C') return 'OPTIMIZE';
  return 'PAUSE / REVIEW';
}

// Search term classification
function classifySearchTerm(term) {
  const lower = term.toLowerCase();
  const brandTerms = ['your design store', 'yourdesignstore', 'yds', 'your design', 'yds direct'];
  const competitorTerms = ['printful', 'printify', 'printrove', 'teespring', 'qikink', 'printway', 'godstown'];
  
  for (const brand of brandTerms) {
    if (lower.includes(brand)) return 'BRAND';
  }
  for (const comp of competitorTerms) {
    if (lower.includes(comp)) return 'COMPETITOR';
  }
  return 'GENERIC';
}

function getSearchSignal(term, type, conversions, spend) {
  if (type === 'COMPETITOR' && conversions > 30) return 'High intent';
  if (type === 'BRAND') return 'Scale brand';
  if (term.includes('CPA') || (spend > 0 && conversions > 0 && (spend / conversions) < 15)) return 'Low cost win';
  if (conversions === 0 && spend > 500) return 'Pause / review';
  return '';
}

/**
 * Parse Raw_Data table.
 * Returns campaignList, dailyTrend, dates (for totals), and byDevice (for insights).
 * Replaces the defunct parseCrunchingRows — Raw_Data has correctly labeled headers
 * with all metrics needed (clicks, cost_micros, conversions, conversions_value).
 * Note: conversions are fractional floats in Raw_Data — summed as-is (no binary coercion).
 */
function parseRawRows(rows) {
  const campaigns = {};
  const dailyMap = {};
  const byDevice = {};
  const allDates = [];

  for (const row of rows) {
    const campaignName = row.campaign_name || 'Unknown';
    const date = row.segments_date || '';
    const device = row.segments_device || 'Unknown';

    const impressions = parseNumber(row.metrics_impressions);
    const clicks = parseNumber(row.metrics_clicks);
    const costMicros = parseMicros(row.metrics_cost_micros);
    const conversions = parseFloat(row.metrics_conversions) || 0;
    const revenue = parseFloat(row.metrics_conversions_value) || 0;

    // --- byDevice aggregation (insights panel) ---
    if (!byDevice[device]) {
      byDevice[device] = { device, impressions: 0, clicks: 0, cost: 0 };
    }
    byDevice[device].impressions += impressions;
    byDevice[device].clicks += clicks;
    byDevice[device].cost += costMicros;

    // --- campaign aggregation ---
    if (!campaigns[campaignName]) {
      campaigns[campaignName] = {
        name: campaignName,
        deviceBreakdown: {},
        clicks: 0,
        cost: 0,
        conversions: 0,
        revenue: 0,
      };
    }
    if (!campaigns[campaignName].deviceBreakdown[device]) {
      campaigns[campaignName].deviceBreakdown[device] = { device, clicks: 0, cost: 0 };
    }
    campaigns[campaignName].deviceBreakdown[device].clicks += clicks;
    campaigns[campaignName].deviceBreakdown[device].cost += costMicros;
    campaigns[campaignName].clicks += clicks;
    campaigns[campaignName].cost += costMicros;
    campaigns[campaignName].conversions += conversions;
    campaigns[campaignName].revenue += revenue;

    // --- daily trend aggregation ---
    if (date) {
      allDates.push(date);
      if (!dailyMap[date]) {
        dailyMap[date] = { date, clicks: 0, cost: 0, conversions: 0, revenue: 0 };
      }
      dailyMap[date].clicks += clicks;
      dailyMap[date].cost += costMicros;
      dailyMap[date].conversions += conversions;
      dailyMap[date].revenue += revenue;
    }
  }

  // Unique dates sorted chronologically (parseDate handles YYYY-MM-DD and M/D/YYYY)
  const uniqueDates = [...new Set(allDates)].filter(d => d).sort((a, b) => {
    return parseDate(a) - parseDate(b);
  });

  const dailyTrend = uniqueDates.map(date => dailyMap[date]).filter(d => d);

  const campaignList = Object.values(campaigns).map(c => {
    const cpa = c.conversions > 0 ? c.cost / c.conversions : 0;
    const roas = c.cost > 0 ? c.revenue / c.cost : 0;
    const grade = getGrade(cpa, c.conversions);
    return {
      name: c.name,
      clicks: c.clicks,
      cost: c.cost,
      conversions: c.conversions,
      revenue: c.revenue,
      cpc: c.clicks > 0 ? c.cost / c.clicks : 0,
      cpa,
      roas,
      grade,
      verdict: getVerdict(grade),
      deviceBreakdown: Object.values(c.deviceBreakdown),
    };
  }).sort((a, b) => a.cpa - b.cpa);

  return {
    campaignList,
    dailyTrend,
    dates: uniqueDates,
    byDevice: Object.values(byDevice),
  };
}

/**
 * Parse Raw_Search_Terms table
 */
function parseSearchTermRows(rows) {
  const termMap = {};

  for (const row of rows) {
    const term = (row.search_term_view_search_term || '').trim();
    if (!term) continue;

    const campaign = row.campaign_name || row.campaign || 'Unknown';
    const clicks = parseNumber(row.metrics_clicks);
    const cost = parseMicros(row.metrics_cost_micros);
    const conversions = parseNumber(row.metrics_conversions);

    if (!termMap[term]) {
      termMap[term] = { term, campaign, clicks: 0, cost: 0, conversions: 0 };
    }
    termMap[term].clicks += clicks;
    termMap[term].cost += cost;
    termMap[term].conversions += conversions;
  }

  // Apply type classification
  const terms = Object.values(termMap).map(t => {
    const type = classifySearchTerm(t.term);
    const cpc = t.clicks > 0 ? t.cost / t.clicks : 0;
    const signal = getSearchSignal(t.term, type, t.conversions, t.cost);
    return {
      ...t,
      type,
      cpc,
      signal,
    };
  }).sort((a, b) => b.conversions - a.conversions).slice(0, 50);

  return terms;
}

// Static funnel data from spec (hardcoded from GA4 audit)
const FUNNEL_DATA = [
  { stage: 'Visit', event: 'page_view', users: 1180, dropOff: null },
  { stage: 'View Product', event: 'view_item', users: 726, dropOff: -38 },
  { stage: 'Enter Design Tool', event: 'customizer_tool_click', users: 291, dropOff: -60 },
  { stage: 'Add to Cart', event: 'combined_atc', users: 99, dropOff: -66 },
  { stage: 'Begin Checkout', event: 'begin_checkout', users: 29, dropOff: -71 },
  { stage: 'Shipping Info', event: 'add_shipping_info', users: 7, dropOff: -96, loginWall: true },
  { stage: 'Payment', event: 'add_payment_info', users: 4, dropOff: -43 },
  { stage: 'Purchase', event: 'purchase', users: 5, dropOff: -37 },
];

// Static status table from spec
const STATUS_TABLE = [
  { signal: 'Reported conversions', status: 'JUNK', meaning: 'Map clicks, calls — moved to Secondary' },
  { signal: '₹0 revenue', status: 'BROKEN', meaning: 'No dataLayer.push on /checkout/success' },
  { signal: '96% checkout drop', status: 'REAL', meaning: 'Login wall — losing ~3x revenue' },
  { signal: 'Competitor clicks', status: 'SIGNAL', meaning: 'Printrove/Printful/Printify — high-intent audience' },
  { signal: 'Brand term clicks', status: 'REAL', meaning: '"your design store" — cheapest CPA' },
];

// Static advisory cards from spec
const ADVISORY_CARDS = [
  { expert: 'Neil Patel', color: 'red', insight: 'Your CPA is meaningless until tracking is fixed. Ship Nirmal\'s dataLayer task first.' },
  { expert: 'Gary Vee', color: 'amber', insight: 'Printrove searchers are warm. Build a comparison landing page this week.' },
  { expert: 'Seth Godin', color: 'purple', insight: '96% abandon at login. You\'re not losing buyers — you\'re refusing to sell to them.' },
  { expert: 'Brian Chesky', color: 'blue', insight: 'Product Search 2026 at ₹5.96 CPA is your signal. Scale it 5x before touching anything else.' },
  { expert: 'Dominic Barton', color: 'green', insight: 'Two moves with max impact: (1) guest checkout = 3x revenue free, (2) reallocate budget from C-grade to A-grade campaigns.' },
];

// Static action queue from spec
const ACTION_QUEUE = [
  { priority: 'P0', action: 'dataLayer push on /checkout/success — Nirmal' },
  { priority: 'P0', action: 'Enable guest checkout — Nirmal' },
  { priority: 'P1', action: 'Scale Product Search 2026 — shift budget from YourDesign Search' },
  { priority: 'P1', action: 'Competitor landing page for Printrove/Printify switchers' },
  { priority: 'P2', action: 'Add Google Ads Purchase conversion tag in GTM' },
];

async function getDashboard(dateFilter = 'all') {
  const cacheKey = `dashboard_${dateFilter}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const [rawResult, searchResult] = await Promise.all([
    fetchSheet('GOOGLE_ADS_RAW'),
    fetchSheet('GOOGLE_ADS_SEARCH_TERMS'),
  ]);

  if (!rawResult.available) {
    const result = { available: false, reason: rawResult.reason };
    setCache(cacheKey, result);
    return result;
  }

  const rawRows = normalizeRows(rawResult);
  const searchRows = normalizeRows(searchResult);

  const { campaignList, dailyTrend, dates, byDevice } = parseRawRows(rawRows);
  const searchTerms = parseSearchTermRows(searchRows, dateFilter);

  // Calculate overall totals
  const totals = {
    spend: campaignList.reduce((s, c) => s + c.cost, 0),
    clicks: campaignList.reduce((s, c) => s + c.clicks, 0),
    conversions: campaignList.reduce((s, c) => s + c.conversions, 0),
    revenue: campaignList.reduce((s, c) => s + c.revenue, 0),
  };
  totals.cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  totals.cpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0;
  totals.roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;
  totals.dailyAvg = totals.spend / (dates.length || 1);

  // Conversion breakdown (hardcoded from spec - will update when revenue tracking works)
  const conversionBreakdown = [
    { label: 'Map/call clicks (fake)', value: 762, color: 'gray' },
    { label: 'Store visits (fake)', value: 52, color: 'gray' },
    { label: 'Other fake', value: 28, color: 'gray' },
    { label: 'Real purchases', value: 2, color: 'green' },
  ];

  const result = {
    available: true,
    dateFilter,
    totals,
    campaigns: campaignList,
    dailyTrend,
    searchTerms,
    insights: {
      byDevice,
    },
    funnel: FUNNEL_DATA,
    statusTable: STATUS_TABLE,
    advisoryCards: ADVISORY_CARDS,
    actionQueue: ACTION_QUEUE,
    conversionBreakdown,
    meta: {
      rawRows: rawRows.length,
      searchTermRows: searchRows.length,
      datesAvailable: dates.length,
    },
    timestamp: new Date().toISOString(),
  };

  setCache(cacheKey, result);
  return result;
}

module.exports = { getDashboard, clearCache };
const { fetchSheet, resolveSheetName, SHEET_REGISTRY } = require('./sheets');

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

function parseRows(rows) {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0].map(h => h.toLowerCase().trim().replace(/\s+/g, '_'));
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] || ''; });
    return obj;
  });
}

function parseINR(value) {
  if (!value) return 0;
  const cleaned = String(value).replace(/[₹,\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseMicros(value) {
  const n = parseInt(value, 10);
  return isNaN(n) ? 0 : n / 1_000_000;
}

async function getDashboard() {
  const cached = getCached('dashboard');
  if (cached) return cached;

  const crunchingResult = await fetchSheet('GOOGLE_ADS_CRUNCHING');
  if (!crunchingResult.available) {
    const result = { available: false, reason: crunchingResult.reason };
    setCache('dashboard', result);
    return result;
  }

  const rawResult = await fetchSheet('GOOGLE_ADS_RAW');
  const searchResult = await fetchSheet('GOOGLE_ADS_SEARCH_TERMS');

  const crunchingRows = parseRows(crunchingResult.rows);
  const rawRows = rawResult.available ? parseRows(rawResult.rows) : [];
  const searchRows = searchResult.available ? parseRows(searchResult.rows) : [];

  const campaigns = {};
  for (const row of crunchingRows) {
    const campaign = row.campaign || 'Unknown';
    if (!campaigns[campaign]) {
      campaigns[campaign] = { name: campaign, impressions: 0, clicks: 0, cost: 0, conversions: 0, revenue: 0 };
    }
    const imp = parseInt(row.impressions, 10);
    const clicks = parseInt(row.clicks, 10);
    campaigns[campaign].impressions += isNaN(imp) ? 0 : imp;
    campaigns[campaign].clicks += isNaN(clicks) ? 0 : clicks;
    campaigns[campaign].cost += parseINR(row.real_cost);
    campaigns[campaign].conversions += parseINR(row.conversions);
    campaigns[campaign].revenue += parseINR(row.revenue);
  }

  const campaignList = Object.values(campaigns).map(c => ({
    ...c,
    cpc: c.clicks > 0 ? c.cost / c.clicks : 0,
    cpa: c.conversions > 0 ? c.cost / c.conversions : 0,
    roas: c.cost > 0 ? c.revenue / c.cost : 0,
  }));

  const totals = {
    cost: campaignList.reduce((s, c) => s + c.cost, 0),
    clicks: campaignList.reduce((s, c) => s + c.clicks, 0),
    impressions: campaignList.reduce((s, c) => s + c.impressions, 0),
    conversions: campaignList.reduce((s, c) => s + c.conversions, 0),
    revenue: campaignList.reduce((s, c) => s + c.revenue, 0),
  };
  totals.cpc = totals.clicks > 0 ? totals.cost / totals.clicks : 0;
  totals.cpa = totals.conversions > 0 ? totals.cost / totals.conversions : 0;
  totals.roas = totals.cost > 0 ? totals.revenue / totals.cost : 0;

  const dailyTrend = [];
  const dailyMap = {};
  for (const row of crunchingRows) {
    const date = row.date || '';
    if (!date) continue;
    const imp = parseInt(row.impressions, 10);
    if (!dailyMap[date]) {
      dailyMap[date] = { date, impressions: 0, clicks: 0, cost: 0, conversions: 0, revenue: 0 };
    }
    dailyMap[date].impressions += isNaN(imp) ? 0 : imp;
    dailyMap[date].clicks += parseInt(row.clicks, 10) || 0;
    dailyMap[date].cost += parseINR(row.real_cost);
    dailyMap[date].conversions += parseINR(row.conversions);
    dailyMap[date].revenue += parseINR(row.revenue);
  }
  for (const date of Object.keys(dailyMap).sort()) {
    dailyTrend.push(dailyMap[date]);
  }

  const searchTermList = searchRows.map(row => ({
    term: row.search_term_view_search_term || '',
    campaign: row.campaign_name || '',
    clicks: parseInt(row.metrics_clicks, 10) || 0,
    cost: parseMicros(row.metrics_cost_micros),
    conversions: parseInt(row.metrics_conversions, 10) || 0,
  })).filter(s => s.term);

  const result = {
    available: true,
    totals,
    campaigns: campaignList,
    dailyTrend,
    searchTerms: searchTermList,
    timestamp: new Date().toISOString(),
  };

  setCache('dashboard', result);
  return result;
}

module.exports = { getDashboard, clearCache };
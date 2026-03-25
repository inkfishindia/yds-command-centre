'use strict';

const sheetsService = require('./sheets');

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDate(str) {
  if (!str) return null;
  // Support DD-MM-YYYY and ISO formats
  const ddmmyyyy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(str);
  if (ddmmyyyy) {
    return new Date(`${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`);
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function countBy(rows, field) {
  const map = {};
  rows.forEach(r => {
    const val = (r[field] || 'Unknown').trim() || 'Unknown';
    map[val] = (map[val] || 0) + 1;
  });
  return Object.entries(map).map(([name, count]) => ({ name, count }));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripNulls(obj) {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined) result[k] = v;
  }
  return result;
}

// ── Overview cache (2-minute TTL) ─────────────────────────────────────────────

let overviewCache = null;

function getFreshOverviewCache() {
  if (!overviewCache) return null;
  if (Date.now() - overviewCache.time > 2 * 60 * 1000) return null;
  return overviewCache.data;
}

// ── Service functions ─────────────────────────────────────────────────────────

async function getOverview() {
  const cached = getFreshOverviewCache();
  if (cached) return cached;

  const [pipeline, leadsResult, usersResult, flowsResult] = await Promise.all([
    sheetsService.getPipelineData(),
    sheetsService.fetchSheet('CRM_LEADS').catch(() => ({ available: false })),
    sheetsService.fetchSheet('CRM_SYSTEM_USERS').catch(() => ({ available: false })),
    sheetsService.fetchSheet('CRM_LEAD_FLOWS').catch(() => ({ available: false })),
  ]);

  let leadStats = { total: 0, byStatus: [], byCategory: [], recentLeads: [] };
  if (leadsResult.available !== false && leadsResult.rows) {
    const leads = leadsResult.rows;
    const sorted = leads
      .map(l => ({ ...l, _date: parseDate(l.created_at) }))
      .sort((a, b) => {
        if (!a._date && !b._date) return 0;
        if (!a._date) return 1;
        if (!b._date) return -1;
        return b._date - a._date;
      });

    leadStats = {
      total: leads.length,
      byStatus: countBy(leads, 'Status'),
      byCategory: countBy(leads, 'Category'),
      recentLeads: sorted.slice(0, 10).map(l => ({
        lead_id: l.lead_id,
        name: l.name,
        company: l.company,
        city: l.city,
        Category: l.Category,
        Status: l.Status,
        created_at: l.created_at,
      })),
    };
  }

  // flowStats: derive from actual LEAD_FLOWS data
  let flowStats = { total: 0, byStatus: [], byOwner: [] };
  if (flowsResult.available !== false && flowsResult.rows) {
    flowStats = {
      total: flowsResult.rows.length,
      byStatus: countBy(flowsResult.rows, 'status'),
      byOwner: countBy(flowsResult.rows, 'owner'),
    };
  } else if (pipeline.available !== false) {
    flowStats = {
      total: pipeline.totalLeads || 0,
      byStatus: pipeline.statusBreakdown || [],
      byOwner: [],
    };
  }

  const team = usersResult.available !== false && usersResult.rows
    ? { count: usersResult.rows.length, users: usersResult.rows }
    : { count: 0, users: [] };

  const result = {
    pipeline,
    leadStats,
    flowStats,
    team,
    timestamp: new Date().toISOString(),
  };

  overviewCache = { data: result, time: Date.now() };
  return result;
}

async function getLeads(filters = {}) {
  const result = await sheetsService.fetchSheet('CRM_LEADS').catch(() => ({ available: false }));
  if (result.available === false) return result;

  let rows = result.rows || [];

  if (filters.status) {
    rows = rows.filter(r => (r.Status || '').toLowerCase() === filters.status.toLowerCase());
  }
  if (filters.category) {
    rows = rows.filter(r => (r.Category || '').toLowerCase() === filters.category.toLowerCase());
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter(r =>
      (r.name || '').toLowerCase().includes(q) ||
      (r.email || '').toLowerCase().includes(q) ||
      (r.phone || '').toLowerCase().includes(q) ||
      (r.company || '').toLowerCase().includes(q)
    );
  }

  // Sort by created_at desc
  rows = rows
    .map(r => ({ ...r, _date: parseDate(r.created_at) }))
    .sort((a, b) => {
      if (!a._date && !b._date) return 0;
      if (!a._date) return 1;
      if (!b._date) return -1;
      return b._date - a._date;
    })
    .map(({ _date, ...rest }) => rest);

  const total = rows.length;
  const page = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 50;
  const totalPages = Math.ceil(total / limit) || 1;
  const paginated = rows.slice((page - 1) * limit, page * limit).map(stripNulls);

  return { available: true, rows: paginated, total, page, limit, totalPages };
}

async function getLead(leadId) {
  const [leadsResult, flowsResult] = await Promise.all([
    sheetsService.fetchSheet('CRM_LEADS').catch(() => ({ available: false })),
    sheetsService.fetchSheet('CRM_LEAD_FLOWS').catch(() => ({ available: false })),
  ]);

  if (leadsResult.available === false) return leadsResult;

  const lead = (leadsResult.rows || []).find(r => r.lead_id === leadId);
  if (!lead) return { available: false, reason: 'not_found' };

  const flows = flowsResult.available !== false
    ? (flowsResult.rows || []).filter(r => r.lead_id === leadId)
    : [];

  return { available: true, lead, flows };
}

async function getFlows(filters = {}) {
  const [flowsResult, leadsResult] = await Promise.all([
    sheetsService.fetchSheet('CRM_LEAD_FLOWS').catch(() => ({ available: false })),
    sheetsService.fetchSheet('CRM_LEADS').catch(() => ({ available: false })),
  ]);

  if (flowsResult.available === false) return flowsResult;

  // Build a lead_id → name lookup (keep first non-null name — sheet has duplicate IDs)
  const leadMap = {};
  if (leadsResult.available !== false) {
    (leadsResult.rows || []).forEach(l => {
      if (l.lead_id && (!leadMap[l.lead_id] || l.name)) {
        leadMap[l.lead_id] = l.name || '';
      }
    });
  }

  let rows = (flowsResult.rows || []).map(f => ({
    ...f,
    leadName: leadMap[f.lead_id] || '',
  }));

  if (filters.status) {
    rows = rows.filter(r => (r.status || '').toLowerCase() === filters.status.toLowerCase());
  }
  if (filters.stage) {
    rows = rows.filter(r => (r.stage || '').toLowerCase() === filters.stage.toLowerCase());
  }
  if (filters.owner) {
    rows = rows.filter(r => (r.owner || '').toLowerCase().includes(filters.owner.toLowerCase()));
  }
  if (filters.channel) {
    rows = rows.filter(r => (r.channel || '').toLowerCase() === filters.channel.toLowerCase());
  }
  if (filters.priority) {
    rows = rows.filter(r => (r.priority || '').toLowerCase() === filters.priority.toLowerCase());
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter(r =>
      (r.leadName || '').toLowerCase().includes(q) ||
      (r.notes || '').toLowerCase().includes(q) ||
      (r.stage || '').toLowerCase().includes(q)
    );
  }

  return { available: true, rows: rows.map(stripNulls) };
}

async function getFlow(flowId) {
  const [flowsResult, leadsResult, detailsResult, actionsResult] = await Promise.all([
    sheetsService.fetchSheet('CRM_LEAD_FLOWS').catch(() => ({ available: false })),
    sheetsService.fetchSheet('CRM_LEADS').catch(() => ({ available: false })),
    sheetsService.fetchSheet('CRM_FLOW_DETAILS').catch(() => ({ available: false })),
    sheetsService.fetchSheet('CRM_SUGGESTED_ACTIONS').catch(() => ({ available: false })),
  ]);

  if (flowsResult.available === false) return flowsResult;

  const flow = (flowsResult.rows || []).find(r => r.flow_id === flowId);
  if (!flow) return { available: false, reason: 'not_found' };

  const lead = leadsResult.available !== false
    ? (leadsResult.rows || []).find(r => r.lead_id === flow.lead_id) || null
    : null;

  const details = detailsResult.available !== false
    ? (detailsResult.rows || []).find(r => r.flow_id === flowId) || null
    : null;

  const suggestedActions = actionsResult.available !== false
    ? (actionsResult.rows || []).filter(r => r.stage === flow.stage)
    : [];

  return { available: true, flow, lead, details, suggestedActions };
}

async function getTeam() {
  const [usersResult, flowsResult] = await Promise.all([
    sheetsService.fetchSheet('CRM_SYSTEM_USERS').catch(() => ({ available: false })),
    sheetsService.fetchSheet('CRM_LEAD_FLOWS').catch(() => ({ available: false })),
  ]);

  if (usersResult.available === false) return usersResult;

  const flows = flowsResult.available !== false ? (flowsResult.rows || []) : [];

  // Build owner → flows lookup
  const ownerFlows = {};
  flows.forEach(f => {
    const owner = f.owner || 'Unassigned';
    if (!ownerFlows[owner]) ownerFlows[owner] = [];
    ownerFlows[owner].push(f);
  });

  const users = (usersResult.rows || []).map(u => {
    const userId = u.user_id || u.name || '';
    const userFlows = ownerFlows[userId] || [];
    const flowsByStatus = {};
    userFlows.forEach(f => {
      const s = f.status || 'Unknown';
      flowsByStatus[s] = (flowsByStatus[s] || 0) + 1;
    });
    return {
      ...u,
      activeFlows: userFlows.filter(f => (f.status || '').toLowerCase() === 'active').length,
      flowsByStatus,
    };
  });

  return { available: true, users };
}

async function getConfig() {
  const [slaRules, routingRules, flowTypeConfig, messageTemplates] = await Promise.all([
    sheetsService.fetchSheet('CRM_SLA_RULES').catch(() => ({ available: false })),
    sheetsService.fetchSheet('CRM_ROUTING_RULES').catch(() => ({ available: false })),
    sheetsService.fetchSheet('CRM_FLOW_TYPE_CONFIG').catch(() => ({ available: false })),
    sheetsService.fetchSheet('CRM_MESSAGE_TEMPLATES').catch(() => ({ available: false })),
  ]);

  return {
    available: true,
    slaRules: slaRules.available !== false ? (slaRules.rows || []) : [],
    routingRules: routingRules.available !== false ? (routingRules.rows || []) : [],
    flowTypeConfig: flowTypeConfig.available !== false ? (flowTypeConfig.rows || []) : [],
    messageTemplates: messageTemplates.available !== false ? (messageTemplates.rows || []) : [],
  };
}

module.exports = {
  getOverview,
  getLeads,
  getLead,
  getFlows,
  getFlow,
  getTeam,
  getConfig,
};

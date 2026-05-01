'use strict';
// morning-brief.js — Priority scoring + morning brief composer.
// Public exports: PRIORITY_WEIGHTS, computeCommitmentScore,
//   buildMorningBriefFromDashboard, getMorningBrief
// Depends on dashboard-summary.js for the cached dashboard payload.
// All data is derived from the already-cached dashboard — no extra Notion requests.
// DO NOT add: dashboard data fetching (dashboard-summary.js), Notion reads (reads/),
//   cache infra (cache.js).

const { getDashboardSummary } = require('./dashboard-summary');

// ---------------------------------------------------------------------------
// Priority weight map for topThree scoring
// ---------------------------------------------------------------------------
const PRIORITY_WEIGHTS = { Urgent: 4, High: 3, Medium: 2, Low: 1 };

/**
 * Compute a priority score for a commitment used by getMorningBrief topThree.
 * Score = priority weight + overdue bonus (daysOverdue * 2) + due-today bonus (+5).
 */
function computeCommitmentScore(c, todayStr) {
  const weight = PRIORITY_WEIGHTS[c.Priority] || 1;

  const due = c['Due Date'];
  const dueStart = due && typeof due === 'object' ? due.start : (due || null);

  let overdueBonus = 0;
  let dueTodayBonus = 0;
  if (dueStart) {
    if (dueStart < todayStr) {
      const msPerDay = 1000 * 60 * 60 * 24;
      const days = Math.floor((new Date(todayStr) - new Date(dueStart)) / msPerDay);
      overdueBonus = days * 2;
    } else if (dueStart === todayStr) {
      dueTodayBonus = 5;
    }
  }

  return weight + overdueBonus + dueTodayBonus;
}

/**
 * Derive a structured morning brief from getDashboardSummary().
 * All data is computed from already-cached sub-calls — no extra Notion requests.
 */
function buildMorningBriefFromDashboard(dashboard) {
  const todayStr = new Date().toISOString().split('T')[0];

  // -------------------------------------------------------------------
  // overdueCount and overdueItems (top 3 by daysOverdue DESC)
  // -------------------------------------------------------------------
  const overdueRaw = dashboard.overdue || [];
  const overdueCount = overdueRaw.length;

  const msPerDay = 1000 * 60 * 60 * 24;
  const withDays = overdueRaw.map(c => {
    const due = c['Due Date'];
    const dueStart = due && typeof due === 'object' ? due.start : (due || null);
    const daysOverdue = dueStart
      ? Math.max(0, Math.floor((new Date(todayStr) - new Date(dueStart)) / msPerDay))
      : 0;
    const severity = daysOverdue > 7 ? 'critical' : daysOverdue > 3 ? 'warning' : 'mild';
    const owner = Array.isArray(c.assignedNames) && c.assignedNames.length > 0
      ? c.assignedNames[0]
      : 'Unassigned';
    return { name: c.Name || 'Untitled', owner, daysOverdue, severity };
  });
  const overdueItems = withDays
    .slice()
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, 3);

  // -------------------------------------------------------------------
  // todayItems — upcoming commitments due today or tomorrow
  // -------------------------------------------------------------------
  const tomorrowStr = new Date(new Date(todayStr).getTime() + msPerDay)
    .toISOString().split('T')[0];

  const todayItems = (dashboard.upcoming || []).filter(c => {
    const due = c['Due Date'];
    const dueStart = due && typeof due === 'object' ? due.start : (due || null);
    return dueStart === todayStr || dueStart === tomorrowStr;
  });

  // -------------------------------------------------------------------
  // topThree — highest-scoring open commitments
  // -------------------------------------------------------------------
  const allOpen = (dashboard.overdue || []).concat(dashboard.upcoming || []);
  // Deduplicate by id
  const seenIds = new Set();
  const deduped = [];
  for (const c of allOpen) {
    if (c.id && !seenIds.has(c.id)) {
      seenIds.add(c.id);
      deduped.push(c);
    } else if (!c.id) {
      deduped.push(c);
    }
  }

  const topThree = deduped
    .filter(c => c.Status && !['Done', 'Cancelled'].includes(c.Status))
    .map(c => ({ ...c, _score: computeCommitmentScore(c, todayStr) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 3)
    .map(c => ({
      name: c.Name || 'Untitled',
      owner: Array.isArray(c.assignedNames) && c.assignedNames.length > 0
        ? c.assignedNames[0]
        : 'Unassigned',
      dueDate: c['Due Date'],
      priority: c.Priority,
      status: c.Status,
      id: c.id,
    }));

  // -------------------------------------------------------------------
  // flags — overload, drift, decision
  // -------------------------------------------------------------------
  const flags = [];

  // Overload: any person with activeCommitmentCount > 8 or overdueCount > 3
  for (const person of (dashboard.people || [])) {
    if (person.activeCommitmentCount > 8 || person.overdueCount > 3) {
      flags.push({
        type: 'overload',
        message: `${person.Name || 'Unknown'} has ${person.activeCommitmentCount} active commitments and ${person.overdueCount} overdue`,
      });
    }
  }

  // Drift: focus areas with no activity in 14+ days
  const fourteenDaysAgo = new Date(new Date(todayStr).getTime() - 14 * msPerDay)
    .toISOString().split('T')[0];
  for (const area of (dashboard.focusAreas || [])) {
    if (!area.lastActivityDate || area.lastActivityDate < fourteenDaysAgo) {
      flags.push({
        type: 'drift',
        message: `${area.Name || 'Unknown area'} has had no activity since ${area.lastActivityDate || 'never'}`,
      });
    }
  }

  // Decision: blocked items where Notes mention 'Dan' or 'decision'
  const decisionPattern = /\bdan\b|decision/i;
  const decisionBlocked = (dashboard.overdue || []).concat(dashboard.upcoming || []).filter(c => {
    if (c.Status !== 'Blocked') return false;
    const notes = c.Notes || '';
    return decisionPattern.test(notes);
  });
  if (decisionBlocked.length > 0) {
    flags.push({
      type: 'decision',
      message: `${decisionBlocked.length} blocked item${decisionBlocked.length > 1 ? 's' : ''} waiting on Dan or a decision`,
    });
  }

  // -------------------------------------------------------------------
  // waitingOn — blocked commitments grouped by blocker
  // -------------------------------------------------------------------
  const allCommitmentsForWaiting = (dashboard.overdue || []).concat(dashboard.upcoming || []);
  const waitingOnMap = {};
  for (const c of allCommitmentsForWaiting) {
    if (c.Status !== 'Blocked') continue;
    // Try to extract who is blocking from Notes field
    const notes = (c.Notes || '').trim();
    let blocker = 'Unknown';
    const waitingMatch = notes.match(/waiting on ([A-Z][a-z]+)/i);
    const blockedByMatch = notes.match(/blocked by ([A-Z][a-z]+)/i);
    if (waitingMatch) blocker = waitingMatch[1];
    else if (blockedByMatch) blocker = blockedByMatch[1];

    waitingOnMap[c.id || Math.random().toString()] = { name: c.Name || 'Untitled', id: c.id, blocker };
  }
  const waitingOn = Object.values(waitingOnMap).map(item => ({
    name: item.name,
    blockerDetail: item.blocker || 'Unknown',
    id: item.id,
  }));

  return {
    overdueCount,
    overdueItems,
    todayItems,
    topThree,
    flags,
    waitingOn,
    timestamp: new Date().toISOString(),
  };
}

async function getMorningBrief() {
  const dashboard = await getDashboardSummary();
  return buildMorningBriefFromDashboard(dashboard);
}

module.exports = {
  PRIORITY_WEIGHTS,
  computeCommitmentScore,
  buildMorningBriefFromDashboard,
  getMorningBrief,
};

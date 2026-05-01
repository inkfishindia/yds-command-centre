'use strict';
// dashboard-summary.js — getDashboardSummary composer.
// Public exports: getDashboardSummary
// Pulls data from cache, databases, and all domain read leaves; enriches
// focus areas, commitments, people, and overdue/upcoming lists; caches result.
// DO NOT add: morning brief logic (morning-brief.js), raw Notion SDK calls
//   (use leaves under reads/), cache infra (cache.js), DB constants (databases.js).

const {
  setCachedWithTime,
  getCachedWithTTL,
  DASHBOARD_CACHE_KEY,
  DASHBOARD_CACHE_TTL,
} = require('./cache');
const { DB, queryDatabase } = require('./databases');
const { getFocusAreas } = require('./reads/focus-areas');
const { getPeople } = require('./reads/people');
const { getProjects } = require('./reads/projects');
const { getRecentDecisions } = require('./reads/decisions');
const {
  getOverdueCommitments,
  getUpcomingCommitments,
  getActiveCommitments,
  getRecentlyCompletedCommitments,
} = require('./reads/commitments');

/**
 * Get dashboard summary data with health distribution and counts.
 * Cached for DASHBOARD_CACHE_TTL ms. Uses getCachedWithTTL helper from cache.js
 * instead of raw Map access — behavior-equivalent to the original inline check.
 */
async function getDashboardSummary() {
  const cached = getCachedWithTTL(DASHBOARD_CACHE_KEY, DASHBOARD_CACHE_TTL);
  if (cached) return cached;

  // Use getActiveCommitments() (excludes Done + Cancelled) instead of getAllCommitments()
  // to avoid fetching completed work that the dashboard doesn't display.
  const [focusAreas, overdue, decisions, people, projects, allCommitments, upcoming, audiencesResult, platformsResult, recentlyCompleted] = await Promise.all([
    getFocusAreas(),
    getOverdueCommitments(),
    getRecentDecisions(7),
    getPeople(),
    getProjects(),
    getActiveCommitments(),
    getUpcomingCommitments(7),
    queryDatabase(DB.AUDIENCES, { pageSize: 50 }),
    queryDatabase(DB.PLATFORMS, { pageSize: 50 }),
    getRecentlyCompletedCommitments(30),
  ]);

  // Health distribution
  const healthDistribution = { onTrack: 0, atRisk: 0, offTrack: 0, other: 0 };
  for (const area of focusAreas) {
    const h = (area.Health || area.Status || '').toLowerCase();
    if (h.includes('on track')) healthDistribution.onTrack++;
    else if (h.includes('risk') || h.includes('attention')) healthDistribution.atRisk++;
    else if (h.includes('off track') || h.includes('improvement')) healthDistribution.offTrack++;
    else healthDistribution.other++;
  }

  // Count projects per focus area
  const projectsByFA = {};
  const activeProjectsByOwner = {};
  for (const project of projects) {
    // Try common relation property names
    const faIds = project['Focus Area'] || project['Focus Areas'] || project['Focus area'] || [];
    for (const faId of (Array.isArray(faIds) ? faIds : [])) {
      const nid = faId.replace(/-/g, '');
      projectsByFA[nid] = (projectsByFA[nid] || 0) + 1;
    }

    const ownerIds = project.Owner || [];
    if (project.Status === 'Active') {
      for (const ownerId of (Array.isArray(ownerIds) ? ownerIds : [])) {
        const nid = ownerId.replace(/-/g, '');
        if (!activeProjectsByOwner[nid]) activeProjectsByOwner[nid] = [];
        activeProjectsByOwner[nid].push(project);
      }
    }
  }

  // Count commitments per focus area
  const commitmentsByFA = {};
  for (const c of allCommitments) {
    const faIds = c['Focus Area'] || c['Focus Areas'] || c['Focus area'] || [];
    for (const faId of (Array.isArray(faIds) ? faIds : [])) {
      const nid = faId.replace(/-/g, '');
      commitmentsByFA[nid] = (commitmentsByFA[nid] || 0) + 1;
    }
  }

  // Pre-compute per-focus-area health signals from allCommitments + recentlyCompleted
  const todayStr = new Date().toISOString().split('T')[0];

  // Build per-FA buckets: overdue items, blocked items, all items (for lastActivity)
  const faOverdue = {};   // nid → [commitment]  (active, due < today)
  const faBlocked = {};   // nid → count
  const faAllDates = {};  // nid → [ISO date strings]  (for lastActivity)
  const commitmentsByPerson = {};
  const activeCommitmentsByPerson = {};

  // allCommitments is now active-only (getActiveCommitments excludes Done + Cancelled),
  // so every item here is active — no need for isActive guards below.
  for (const c of allCommitments) {
    const assignedIds = c['Assigned To'] || [];
    const normalizedAssignedIds = Array.isArray(assignedIds)
      ? assignedIds.map(id => id.replace(/-/g, ''))
      : [];

    for (const personId of normalizedAssignedIds) {
      if (!commitmentsByPerson[personId]) commitmentsByPerson[personId] = [];
      commitmentsByPerson[personId].push(c);
      if (!activeCommitmentsByPerson[personId]) activeCommitmentsByPerson[personId] = [];
      activeCommitmentsByPerson[personId].push(c);
    }

    const faIds = c['Focus Area'] || c['Focus Areas'] || c['Focus area'] || [];
    for (const faId of (Array.isArray(faIds) ? faIds : [])) {
      const nid = faId.replace(/-/g, '');

      // lastActivity: collect the due date start if present
      const due = c['Due Date'];
      const dueStart = due && typeof due === 'object' ? due.start : (due || null);
      if (dueStart) {
        if (!faAllDates[nid]) faAllDates[nid] = [];
        faAllDates[nid].push(dueStart);
      }

      // Overdue: due < today (all items here are active — no guard needed)
      if (dueStart && dueStart < todayStr) {
        if (!faOverdue[nid]) faOverdue[nid] = [];
        faOverdue[nid].push(c);
      }

      // Blocked
      if (c.Status === 'Blocked') {
        faBlocked[nid] = (faBlocked[nid] || 0) + 1;
      }
    }
  }

  // completedLast30d: from recentlyCompleted (Status=Done, edited within 30 days)
  const faCompleted30d = {};
  for (const c of recentlyCompleted) {
    const faIds = c['Focus Area'] || c['Focus Areas'] || c['Focus area'] || [];
    for (const faId of (Array.isArray(faIds) ? faIds : [])) {
      const nid = faId.replace(/-/g, '');
      faCompleted30d[nid] = (faCompleted30d[nid] || 0) + 1;

      // Also count their last_edited_time as lastActivity signal
      if (c.last_edited_time) {
        if (!faAllDates[nid]) faAllDates[nid] = [];
        faAllDates[nid].push(c.last_edited_time.split('T')[0]);
      }
    }
  }

  // Enrich focus areas
  const enrichedFocusAreas = focusAreas.map(area => {
    const nid = area.id.replace(/-/g, '');
    const overdueItems = faOverdue[nid] || [];
    const blockedCount = faBlocked[nid] || 0;
    const completedLast30d = faCompleted30d[nid] || 0;

    // lastActivityDate: most recent date across all commitments for this FA
    const allDates = faAllDates[nid] || [];
    const lastActivityDate = allDates.length > 0
      ? allDates.sort().reverse()[0]
      : null;

    // topOverdueItems: up to 3, sorted oldest first (smallest dueStart first)
    const topOverdueItems = overdueItems
      .slice()
      .sort((a, b) => {
        const aDate = (a['Due Date'] && typeof a['Due Date'] === 'object' ? a['Due Date'].start : a['Due Date']) || '';
        const bDate = (b['Due Date'] && typeof b['Due Date'] === 'object' ? b['Due Date'].start : b['Due Date']) || '';
        return aDate < bDate ? -1 : aDate > bDate ? 1 : 0;
      })
      .slice(0, 3)
      .map(c => c.Name || 'Untitled');

    return {
      ...area,
      projectCount: projectsByFA[nid] || 0,
      commitmentCount: commitmentsByFA[nid] || 0,
      overdueCount: overdueItems.length,
      blockedCount,
      completedLast30d,
      lastActivityDate,
      topOverdueItems,
    };
  });

  // Build people ID to Name lookup for resolving relations
  const peopleLookup = {};
  const focusAreaLookup = {};
  for (const person of people) {
    peopleLookup[person.id.replace(/-/g, '')] = person.Name || 'Unknown';
  }
  for (const area of focusAreas) {
    focusAreaLookup[area.id.replace(/-/g, '')] = area.Name || 'Unknown';
  }

  // Resolve relation IDs in overdue commitments
  const enrichedOverdue = overdue.map(c => {
    const assignedIds = c['Assigned To'] || [];
    const assignedNames = Array.isArray(assignedIds)
      ? assignedIds.map(id => peopleLookup[id.replace(/-/g, '')] || id.slice(0, 8))
      : [];
    return { ...c, assignedNames };
  });

  // Also enrich upcoming commitments with resolved names
  const enrichedUpcoming = upcoming.map(c => {
    const assignedIds = c['Assigned To'] || [];
    const assignedNames = Array.isArray(assignedIds)
      ? assignedIds.map(id => peopleLookup[id.replace(/-/g, '')] || id.slice(0, 8))
      : [];
    return { ...c, assignedNames };
  });

  // Enrich people with workload data
  const enrichedPeople = people.map(person => {
    const pid = person.id.replace(/-/g, '');
    const personCommitments = commitmentsByPerson[pid] || [];
    const activeCommitments = activeCommitmentsByPerson[pid] || [];

    // Count overdue commitments: due < today AND not Done/Cancelled
    const overdueCount = activeCommitments.filter(c => {
      const due = c['Due Date'];
      if (!due) return false;
      const dueStart = typeof due === 'object' ? due.start : due;
      if (!dueStart) return false;
      return dueStart < todayStr;
    }).length;

    // Count blocked commitments: Status === 'Blocked'
    const blockedCount = activeCommitments.filter(c => c.Status === 'Blocked').length;

    const activeProjects = activeProjectsByOwner[pid] || [];

    // Find focus areas this person works on (from their commitments)
    const focusAreaIds = new Set();
    for (const c of personCommitments) {
      const faIds = c['Focus Area'] || c['Focus Areas'] || c['Focus area'] || [];
      if (Array.isArray(faIds)) {
        for (const id of faIds) focusAreaIds.add(id.replace(/-/g, ''));
      }
    }

    // Resolve focus area IDs to names using the already-fetched focusAreas
    const focusAreaNames = [];
    for (const faId of focusAreaIds) {
      if (focusAreaLookup[faId]) focusAreaNames.push(focusAreaLookup[faId]);
    }

    return {
      ...person,
      activeCommitmentCount: activeCommitments.length,
      overdueCount,
      blockedCount,
      activeProjectCount: activeProjects.length,
      activeProjectNames: activeProjects.map(p => p.Name).slice(0, 5),
      focusAreaNames: focusAreaNames.slice(0, 5),
      commitmentNames: activeCommitments.map(c => c.Name).slice(0, 5),
    };
  });

  // Count unassigned active commitments (no entries in 'Assigned To').
  // allCommitments is already active-only, so no Done/Cancelled guard needed.
  const unassignedCount = allCommitments.filter(c => {
    const assignedIds = c['Assigned To'] || [];
    return !Array.isArray(assignedIds) || assignedIds.length === 0;
  }).length;

  const summary = {
    focusAreas: enrichedFocusAreas,
    overdue: enrichedOverdue,
    upcoming: enrichedUpcoming,
    recentDecisions: decisions,
    people: enrichedPeople,
    healthDistribution,
    audienceCount: audiencesResult.results.length,
    platformCount: platformsResult.results.length,
    unassignedCount,
    timestamp: new Date().toISOString(),
  };

  setCachedWithTime(DASHBOARD_CACHE_KEY, summary);
  return summary;
}

module.exports = { getDashboardSummary };

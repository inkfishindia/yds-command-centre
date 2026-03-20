'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// ---------------------------------------------------------------------------
// Route module loads without errors
// ---------------------------------------------------------------------------
describe('notion routes — module load', () => {
  it('loads server/routes/notion.js without throwing', () => {
    // Requires the express router module — no API calls are made at load time
    const router = require('../server/routes/notion');
    assert.ok(router, 'router should be truthy');
    assert.equal(typeof router, 'function', 'express Router is a function');
  });
});

// ---------------------------------------------------------------------------
// Notion service exports the functions consumed by the detail endpoints
// ---------------------------------------------------------------------------
describe('notion service — functions used by detail endpoints', () => {
  let notionService;

  it('loads server/services/notion.js without throwing', () => {
    notionService = require('../server/services/notion');
    assert.ok(notionService);
  });

  it('exports getPage', () => {
    assert.equal(typeof notionService.getPage, 'function', 'getPage must be exported');
  });

  it('exports getAllCommitments', () => {
    assert.equal(typeof notionService.getAllCommitments, 'function', 'getAllCommitments must be exported');
  });

  it('exports getPeople', () => {
    assert.equal(typeof notionService.getPeople, 'function', 'getPeople must be exported');
  });

  it('exports getRecentDecisions', () => {
    assert.equal(typeof notionService.getRecentDecisions, 'function', 'getRecentDecisions must be exported');
  });

  it('exports getProjects', () => {
    assert.equal(typeof notionService.getProjects, 'function', 'getProjects must be exported');
  });

  it('exports getFocusAreas', () => {
    assert.equal(typeof notionService.getFocusAreas, 'function', 'getFocusAreas must be exported');
  });
});

// ---------------------------------------------------------------------------
// Focus area detail — enrichment logic (pure, no API calls)
// ---------------------------------------------------------------------------
describe('focus-area detail — enrichment logic', () => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // Reproduce the enrichment logic from the route so we can unit-test it
  function enrichCommitment(c, peopleLookup, todayStr) {
    const assignedIds = c['Assigned To'] || [];
    const assignedNames = (Array.isArray(assignedIds) ? assignedIds : [])
      .map(aid => peopleLookup[aid.replace(/-/g, '')] || 'Unknown');
    const dueDate = typeof c['Due Date'] === 'object' ? c['Due Date']?.start : c['Due Date'];
    const isOverdue = dueDate && dueDate < todayStr && !['Done', 'Cancelled'].includes(c.Status);
    const daysOverdue = isOverdue
      ? Math.floor((new Date(todayStr) - new Date(dueDate)) / 86400000)
      : 0;
    return { ...c, assignedNames, dueDate, isOverdue, daysOverdue };
  }

  const peopleLookup = { 'abc123': 'Alice', 'def456': 'Bob' };

  it('marks overdue commitments correctly', () => {
    const c = { Status: 'In Progress', 'Due Date': yesterday, 'Assigned To': [] };
    const result = enrichCommitment(c, peopleLookup, today);
    assert.equal(result.isOverdue, true);
    assert.ok(result.daysOverdue >= 1, 'daysOverdue should be at least 1');
  });

  it('does not mark future commitments as overdue', () => {
    const c = { Status: 'In Progress', 'Due Date': tomorrow, 'Assigned To': [] };
    const result = enrichCommitment(c, peopleLookup, today);
    assert.equal(result.isOverdue, false);
    assert.equal(result.daysOverdue, 0);
  });

  it('does not mark Done commitments as overdue even with past due date', () => {
    const c = { Status: 'Done', 'Due Date': yesterday, 'Assigned To': [] };
    const result = enrichCommitment(c, peopleLookup, today);
    assert.equal(result.isOverdue, false);
  });

  it('does not mark Cancelled commitments as overdue', () => {
    const c = { Status: 'Cancelled', 'Due Date': yesterday, 'Assigned To': [] };
    const result = enrichCommitment(c, peopleLookup, today);
    assert.equal(result.isOverdue, false);
  });

  it('resolves assigned names from people lookup', () => {
    const c = {
      Status: 'In Progress',
      'Due Date': tomorrow,
      'Assigned To': ['abc-123', 'def-456'],
    };
    const result = enrichCommitment(c, peopleLookup, today);
    assert.deepEqual(result.assignedNames, ['Alice', 'Bob']);
  });

  it('falls back to Unknown for unresolved person IDs', () => {
    const c = { Status: 'Not Started', 'Due Date': null, 'Assigned To': ['zzz999'] };
    const result = enrichCommitment(c, peopleLookup, today);
    assert.deepEqual(result.assignedNames, ['Unknown']);
  });

  it('handles date as {start} object', () => {
    const c = { Status: 'In Progress', 'Due Date': { start: yesterday }, 'Assigned To': [] };
    const result = enrichCommitment(c, peopleLookup, today);
    assert.equal(result.dueDate, yesterday);
    assert.equal(result.isOverdue, true);
  });

  it('sorts overdue commitments before non-overdue', () => {
    const commitments = [
      { Status: 'In Progress', 'Due Date': tomorrow, 'Assigned To': [] },
      { Status: 'In Progress', 'Due Date': yesterday, 'Assigned To': [] },
    ].map(c => enrichCommitment(c, peopleLookup, today));

    commitments.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (a.isOverdue && b.isOverdue) return b.daysOverdue - a.daysOverdue;
      return (a.dueDate || 'z') > (b.dueDate || 'z') ? 1 : -1;
    });

    assert.equal(commitments[0].isOverdue, true, 'overdue item should sort first');
    assert.equal(commitments[1].isOverdue, false);
  });
});

// ---------------------------------------------------------------------------
// Person detail — metrics logic (pure, no API calls)
// ---------------------------------------------------------------------------
describe('person detail — metrics logic', () => {
  function computeMetrics(enriched) {
    const active = enriched.filter(c => !['Done', 'Cancelled'].includes(c.Status));
    return {
      activeCount: active.length,
      overdueCount: enriched.filter(c => c.isOverdue).length,
      blockedCount: enriched.filter(c => c.Status === 'Blocked').length,
      doneCount: enriched.filter(c => c.Status === 'Done').length,
      capacity: active.length > 8 ? 'overloaded' : active.length > 4 ? 'moderate' : 'light',
    };
  }

  it('light capacity for <= 4 active commitments', () => {
    const enriched = [
      { Status: 'In Progress', isOverdue: false },
      { Status: 'Not Started', isOverdue: false },
    ];
    const m = computeMetrics(enriched);
    assert.equal(m.capacity, 'light');
    assert.equal(m.activeCount, 2);
  });

  it('moderate capacity for 5-8 active commitments', () => {
    const enriched = Array.from({ length: 6 }, () => ({ Status: 'In Progress', isOverdue: false }));
    const m = computeMetrics(enriched);
    assert.equal(m.capacity, 'moderate');
  });

  it('overloaded capacity for > 8 active commitments', () => {
    const enriched = Array.from({ length: 9 }, () => ({ Status: 'In Progress', isOverdue: false }));
    const m = computeMetrics(enriched);
    assert.equal(m.capacity, 'overloaded');
  });

  it('Done commitments excluded from activeCount', () => {
    const enriched = [
      { Status: 'Done', isOverdue: false },
      { Status: 'In Progress', isOverdue: false },
    ];
    const m = computeMetrics(enriched);
    assert.equal(m.activeCount, 1);
    assert.equal(m.doneCount, 1);
  });

  it('Cancelled commitments excluded from activeCount', () => {
    const enriched = [
      { Status: 'Cancelled', isOverdue: false },
      { Status: 'Not Started', isOverdue: false },
    ];
    const m = computeMetrics(enriched);
    assert.equal(m.activeCount, 1);
  });

  it('blockedCount only counts Blocked status', () => {
    const enriched = [
      { Status: 'Blocked', isOverdue: false },
      { Status: 'Blocked', isOverdue: true },
      { Status: 'In Progress', isOverdue: false },
    ];
    const m = computeMetrics(enriched);
    assert.equal(m.blockedCount, 2);
  });

  it('overdueCount independent of Done/Cancelled filter', () => {
    // Normally isOverdue is false for Done/Cancelled, but metric counts raw flag
    const enriched = [
      { Status: 'In Progress', isOverdue: true },
      { Status: 'Not Started', isOverdue: true },
      { Status: 'Done', isOverdue: false },
    ];
    const m = computeMetrics(enriched);
    assert.equal(m.overdueCount, 2);
  });
});

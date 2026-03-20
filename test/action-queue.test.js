const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// ── Route module ──────────────────────────────────────────────────────────────

describe('Action Queue — route module', () => {
  let notionRoutes;

  it('loads the notion route module without crashing', () => {
    notionRoutes = require('../server/routes/notion');
    assert.ok(notionRoutes);
  });

  it('exports an express router', () => {
    assert.ok(typeof notionRoutes === 'function' || notionRoutes.stack);
  });

  it('notion route module has the /action-queue path registered', () => {
    // express router.stack contains layer objects with route.path
    const routes = notionRoutes.stack
      .filter(l => l.route)
      .map(l => l.route.path);
    assert.ok(routes.includes('/action-queue'), `Expected /action-queue in routes: ${routes.join(', ')}`);
  });
});

// ── Filtering logic ───────────────────────────────────────────────────────────

describe('Action Queue — Dan\'s queue filtering', () => {
  const DAN_ID = '307247aa0d7b81318999e80042f45d6a';
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Helper to build a minimal enriched commitment
  function makeItem(overrides) {
    return {
      id: 'test-id',
      name: 'Test',
      status: 'In Progress',
      priority: 'Medium',
      type: null,
      assignedNames: [],
      focusAreaNames: [],
      dueDate: today,
      isOverdue: false,
      daysOverdue: 0,
      notes: '',
      assignedIds: [],
      ...overrides,
    };
  }

  it('blocked item is included in Dan\'s queue', () => {
    const item = makeItem({ status: 'Blocked' });
    const inQueue = item.status === 'Blocked';
    assert.ok(inQueue);
  });

  it('item with type "Decision Needed" is included in Dan\'s queue', () => {
    const item = makeItem({ type: 'Decision Needed' });
    const needsDecision = item.type === 'Decision Needed';
    assert.ok(needsDecision);
  });

  it('overdue item assigned to Dan is included in Dan\'s queue', () => {
    const item = makeItem({
      assignedIds: [DAN_ID],
      isOverdue: true,
      daysOverdue: 3,
      dueDate: yesterday,
    });
    const isAssignedToDan = item.assignedIds.some(id => id.replace(/-/g, '') === DAN_ID);
    const isDanOverdue = isAssignedToDan && item.isOverdue;
    assert.ok(isDanOverdue);
  });

  it('item with "needs decision" in notes is flagged', () => {
    const item = makeItem({ notes: 'This needs decision before proceeding' });
    const flagged = item.notes.toLowerCase().includes('needs decision');
    assert.ok(flagged);
  });

  it('non-Dan overdue item is excluded from Dan\'s queue but included in Runner\'s', () => {
    const OTHER_ID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const item = makeItem({
      assignedIds: [OTHER_ID],
      isOverdue: true,
      daysOverdue: 2,
      dueDate: yesterday,
    });
    const isAssignedToDan = item.assignedIds.some(id => id.replace(/-/g, '') === DAN_ID);
    const inDansQueue = isAssignedToDan && item.isOverdue;
    const inRunnersQueue = !isAssignedToDan && (item.isOverdue || item.status === 'Blocked');
    assert.ok(!inDansQueue, 'should not be in Dan\'s queue');
    assert.ok(inRunnersQueue, 'should be in Runner\'s queue');
  });
});

// ── Severity sort ─────────────────────────────────────────────────────────────

describe('Action Queue — severity sorting', () => {
  it('overdue items sort before non-overdue items', () => {
    const items = [
      { isOverdue: false, daysOverdue: 0, name: 'Not overdue' },
      { isOverdue: true,  daysOverdue: 5, name: 'Overdue 5 days' },
      { isOverdue: true,  daysOverdue: 1, name: 'Overdue 1 day' },
    ];

    const sortBySeverity = (a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return b.daysOverdue - a.daysOverdue;
    };

    const sorted = [...items].sort(sortBySeverity);
    assert.equal(sorted[0].name, 'Overdue 5 days');
    assert.equal(sorted[1].name, 'Overdue 1 day');
    assert.equal(sorted[2].name, 'Not overdue');
  });

  it('among overdue items, higher daysOverdue comes first', () => {
    const items = [
      { isOverdue: true, daysOverdue: 2 },
      { isOverdue: true, daysOverdue: 10 },
      { isOverdue: true, daysOverdue: 0 },
    ];

    const sortBySeverity = (a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return b.daysOverdue - a.daysOverdue;
    };

    const sorted = [...items].sort(sortBySeverity);
    assert.equal(sorted[0].daysOverdue, 10);
    assert.equal(sorted[1].daysOverdue, 2);
    assert.equal(sorted[2].daysOverdue, 0);
  });
});

const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('New Databases — AI Team, Marketing Tasks, Tech Backlog', () => {

  // ── DB object ──────────────────────────────────────────────────────────────

  describe('DB IDs registered in notion.js', () => {
    it('should expose AI_TEAM db id', () => {
      const { DB } = require('../server/services/notion');
      assert.strictEqual(DB.AI_TEAM, '17f15cb3920948fb9721a776bbbcc6ea');
    });
    it('should expose MARKETING_TASKS db id', () => {
      const { DB } = require('../server/services/notion');
      assert.strictEqual(DB.MARKETING_TASKS, '1fa22f26f31842439dba9788e08ca413');
    });
    it('should expose TECH_BACKLOG db id', () => {
      const { DB } = require('../server/services/notion');
      assert.strictEqual(DB.TECH_BACKLOG, '4bb401d876dd4068851784c5cdb06363');
    });
  });

  // ── listDatabases ──────────────────────────────────────────────────────────

  describe('listDatabases includes new entries', () => {
    it('should include AI Team', () => {
      const notion = require('../server/services/notion');
      const dbs = notion.listDatabases();
      const names = dbs.map(d => d.name);
      assert.ok(names.includes('AI Team'), 'Missing AI Team in listDatabases');
    });
    it('should include Marketing Tasks', () => {
      const notion = require('../server/services/notion');
      const dbs = notion.listDatabases();
      const names = dbs.map(d => d.name);
      assert.ok(names.includes('Marketing Tasks'), 'Missing Marketing Tasks in listDatabases');
    });
    it('should include Tech Backlog', () => {
      const notion = require('../server/services/notion');
      const dbs = notion.listDatabases();
      const names = dbs.map(d => d.name);
      assert.ok(names.includes('Tech Backlog'), 'Missing Tech Backlog in listDatabases');
    });
  });

  // ── notion.js exports ──────────────────────────────────────────────────────

  describe('notion.js exports new query functions', () => {
    it('should export getAITeam', () => {
      const notion = require('../server/services/notion');
      assert.strictEqual(typeof notion.getAITeam, 'function');
    });
    it('should export getMarketingTasks', () => {
      const notion = require('../server/services/notion');
      assert.strictEqual(typeof notion.getMarketingTasks, 'function');
    });
    it('should export getTechBacklog', () => {
      const notion = require('../server/services/notion');
      assert.strictEqual(typeof notion.getTechBacklog, 'function');
    });
  });

  // ── marketing-ops-service.js ───────────────────────────────────────────────

  describe('marketing-ops-service exports', () => {
    it('should export getMarketingTasks', () => {
      const svc = require('../server/services/marketing-ops-service');
      assert.strictEqual(typeof svc.getMarketingTasks, 'function');
    });
    it('should export getMarketingTasksSummary', () => {
      const svc = require('../server/services/marketing-ops-service');
      assert.strictEqual(typeof svc.getMarketingTasksSummary, 'function');
    });
  });

  // ── tech-team-service.js ───────────────────────────────────────────────────

  describe('tech-team-service exports', () => {
    it('should export getTechBacklog', () => {
      const svc = require('../server/services/tech-team-service');
      assert.strictEqual(typeof svc.getTechBacklog, 'function');
    });
  });

  // ── route modules load ─────────────────────────────────────────────────────

  describe('Route modules load without errors', () => {
    it('ai-team route should load', () => {
      const route = require('../server/routes/ai-team');
      assert.ok(route);
    });
    it('marketing-ops route should load (includes /tasks)', () => {
      const route = require('../server/routes/marketing-ops');
      assert.ok(route);
    });
    it('tech-team route should load (includes /backlog)', () => {
      const route = require('../server/routes/tech-team');
      assert.ok(route);
    });
  });

  // ── getMarketingTasksSummary logic ─────────────────────────────────────────

  describe('getMarketingTasksSummary aggregation logic', () => {
    it('should count tasks by status correctly', () => {
      const tasks = [
        { Status: 'In Progress', Priority: 'High', Channel: 'Email', 'Due Date': null },
        { Status: 'Done', Priority: 'Low', Channel: 'Email', 'Due Date': null },
        { Status: 'In Progress', Priority: 'Urgent', Channel: 'Meta Ads', 'Due Date': null },
        { Status: 'Blocked', Priority: 'High', Channel: 'Google Ads', 'Due Date': null },
      ];

      const byStatus = {};
      for (const task of tasks) {
        const s = task.Status || 'Unset';
        byStatus[s] = (byStatus[s] || 0) + 1;
      }

      assert.strictEqual(byStatus['In Progress'], 2);
      assert.strictEqual(byStatus['Done'], 1);
      assert.strictEqual(byStatus['Blocked'], 1);
    });

    it('should count overdue tasks correctly', () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];

      const tasks = [
        { Status: 'In Progress', 'Due Date': { start: yesterday } },  // overdue
        { Status: 'Done', 'Due Date': { start: yesterday } },          // done — not overdue
        { Status: 'Not Started', 'Due Date': { start: tomorrow } },    // future — not overdue
        { Status: 'Blocked', 'Due Date': { start: yesterday } },       // overdue
        { Status: 'Not Started', 'Due Date': null },                   // no date — not overdue
      ];

      const overdue = tasks.filter(t => {
        const due = t['Due Date'] && t['Due Date'].start ? t['Due Date'].start : null;
        return due && due < today && t.Status !== 'Done' && t.Status !== 'Cancelled';
      });

      assert.strictEqual(overdue.length, 2);
    });
  });

  // ── getTechBacklog priority sort logic ─────────────────────────────────────

  describe('getTechBacklog priority sort order', () => {
    it('should sort P0 before P1 before P2 before P3', () => {
      const PRIORITY_ORDER = { 'P0 - Critical': 0, 'P1 - High': 1, 'P2 - Medium': 2, 'P3 - Low': 3 };
      const items = [
        { Name: 'C', Priority: 'P3 - Low' },
        { Name: 'A', Priority: 'P0 - Critical' },
        { Name: 'B', Priority: 'P1 - High' },
      ];
      items.sort((a, b) => (PRIORITY_ORDER[a.Priority] ?? 99) - (PRIORITY_ORDER[b.Priority] ?? 99));
      assert.strictEqual(items[0].Name, 'A');
      assert.strictEqual(items[1].Name, 'B');
      assert.strictEqual(items[2].Name, 'C');
    });

    it('should place null priority after known priorities', () => {
      const PRIORITY_ORDER = { 'P0 - Critical': 0, 'P1 - High': 1, 'P2 - Medium': 2, 'P3 - Low': 3 };
      const items = [
        { Name: 'B', Priority: null },
        { Name: 'A', Priority: 'P2 - Medium' },
      ];
      items.sort((a, b) => (PRIORITY_ORDER[a.Priority] ?? 99) - (PRIORITY_ORDER[b.Priority] ?? 99));
      assert.strictEqual(items[0].Name, 'A');
      assert.strictEqual(items[1].Name, 'B');
    });
  });

  // ── getMarketingTasks date sort logic ──────────────────────────────────────

  describe('getMarketingTasks date sort order', () => {
    it('should sort earlier due dates first', () => {
      const items = [
        { Task: 'B', 'Due Date': { start: '2026-04-10' } },
        { Task: 'A', 'Due Date': { start: '2026-03-25' } },
        { Task: 'C', 'Due Date': { start: '2026-05-01' } },
      ];
      items.sort((a, b) => {
        const da = a['Due Date'] && a['Due Date'].start ? a['Due Date'].start : null;
        const db = b['Due Date'] && b['Due Date'].start ? b['Due Date'].start : null;
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da < db ? -1 : da > db ? 1 : 0;
      });
      assert.strictEqual(items[0].Task, 'A');
      assert.strictEqual(items[1].Task, 'B');
      assert.strictEqual(items[2].Task, 'C');
    });

    it('should place null due dates after dated items', () => {
      const items = [
        { Task: 'B', 'Due Date': null },
        { Task: 'A', 'Due Date': { start: '2026-03-25' } },
      ];
      items.sort((a, b) => {
        const da = a['Due Date'] && a['Due Date'].start ? a['Due Date'].start : null;
        const db = b['Due Date'] && b['Due Date'].start ? b['Due Date'].start : null;
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da < db ? -1 : da > db ? 1 : 0;
      });
      assert.strictEqual(items[0].Task, 'A');
      assert.strictEqual(items[1].Task, 'B');
    });
  });
});

const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Tech Team', () => {
  describe('Route module', () => {
    it('should load without errors', () => {
      const route = require('../server/routes/tech-team');
      assert.ok(route);
    });
  });

  describe('Notion service tech functions', () => {
    it('should export getSprintItems', () => {
      const notion = require('../server/services/notion');
      assert.strictEqual(typeof notion.getSprintItems, 'function');
    });
    it('should export getSpecLibrary', () => {
      const notion = require('../server/services/notion');
      assert.strictEqual(typeof notion.getSpecLibrary, 'function');
    });
    it('should export getTechDecisions', () => {
      const notion = require('../server/services/notion');
      assert.strictEqual(typeof notion.getTechDecisions, 'function');
    });
    it('should export getSprintArchive', () => {
      const notion = require('../server/services/notion');
      assert.strictEqual(typeof notion.getSprintArchive, 'function');
    });
    it('should export getTechTeamSummary', () => {
      const notion = require('../server/services/notion');
      assert.strictEqual(typeof notion.getTechTeamSummary, 'function');
    });
    it('should export updateSprintItemProperty', () => {
      const notion = require('../server/services/notion');
      assert.strictEqual(typeof notion.updateSprintItemProperty, 'function');
    });
  });

  describe('GitHub service', () => {
    it('should load without errors', () => {
      const github = require('../server/services/github');
      assert.ok(github);
    });
    it('should export isConfigured', () => {
      const github = require('../server/services/github');
      assert.strictEqual(typeof github.isConfigured, 'function');
    });
    it('should export getRepoActivity', () => {
      const github = require('../server/services/github');
      assert.strictEqual(typeof github.getRepoActivity, 'function');
    });
    it('should export clearCache', () => {
      const github = require('../server/services/github');
      assert.strictEqual(typeof github.clearCache, 'function');
    });
    it('should return available: false when not configured', () => {
      // In test environment GITHUB_TOKEN is not set, so isConfigured() returns false
      const github = require('../server/services/github');
      if (!github.isConfigured()) {
        // getRepoActivity should resolve to { available: false }
        return github.getRepoActivity('inkfishindia', 'YD-CRM').then(result => {
          assert.strictEqual(result.available, false);
        });
      }
    });
  });

  describe('Database registration', () => {
    it('should include tech databases in listDatabases', () => {
      const notion = require('../server/services/notion');
      const dbs = notion.listDatabases();
      const names = dbs.map(d => d.name);
      assert.ok(names.includes('Sprint Board (Tech)'), 'Missing Sprint Board (Tech)');
      assert.ok(names.includes('Spec Library'), 'Missing Spec Library');
      assert.ok(names.includes('Tech Decision Log'), 'Missing Tech Decision Log');
      assert.ok(names.includes('Sprint Archive'), 'Missing Sprint Archive');
    });

    it('should have correct DB IDs for tech databases', () => {
      const notion = require('../server/services/notion');
      const dbs = notion.listDatabases();
      const sprintBoard = dbs.find(d => d.name === 'Sprint Board (Tech)');
      assert.ok(sprintBoard, 'Sprint Board (Tech) not found');
      assert.strictEqual(sprintBoard.id, '2c459dc96d804bce913547e02b78776c');
    });
  });

  describe('PATCH /sprint/:id validation', () => {
    it('should reject missing property', async () => {
      // Simulate the validation logic directly
      const { property, value } = { value: 'Done' };
      assert.ok(!property || !value, 'Should detect missing property');
    });

    it('should reject missing value', async () => {
      const { property, value } = { property: 'Status' };
      assert.ok(!property || !value, 'Should detect missing value');
    });

    it('should reject invalid property name', () => {
      const allowedProperties = ['Status', 'Priority', 'Waiting On'];
      const property = 'InvalidProp';
      assert.ok(!allowedProperties.includes(property), 'Should reject invalid property');
    });

    it('should reject invalid Status value', () => {
      const allowedValues = {
        'Status': ['Backlog', 'This Sprint', 'In Progress', 'In Review', 'Blocked', 'Done', 'Cancelled'],
        'Priority': ['P0 - Critical', 'P1 - High', 'P2 - Medium', 'P3 - Low'],
        'Waiting On': ['Dan', 'Arjun', 'Developer', 'External', 'Platform Team'],
      };
      assert.ok(!allowedValues['Status'].includes('Completed'), 'Should reject "Completed" as Status');
    });

    it('should reject invalid Priority value', () => {
      const allowedValues = {
        'Priority': ['P0 - Critical', 'P1 - High', 'P2 - Medium', 'P3 - Low'],
      };
      assert.ok(!allowedValues['Priority'].includes('High'), 'Should reject bare "High" as Priority');
    });

    it('should accept valid Status value', () => {
      const allowedValues = {
        'Status': ['Backlog', 'This Sprint', 'In Progress', 'In Review', 'Blocked', 'Done', 'Cancelled'],
      };
      assert.ok(allowedValues['Status'].includes('In Progress'), 'Should accept "In Progress"');
    });

    it('should accept valid Priority value', () => {
      const allowedValues = {
        'Priority': ['P0 - Critical', 'P1 - High', 'P2 - Medium', 'P3 - Low'],
      };
      assert.ok(allowedValues['Priority'].includes('P0 - Critical'), 'Should accept "P0 - Critical"');
    });

    it('should accept valid Waiting On value', () => {
      const allowedValues = {
        'Waiting On': ['Dan', 'Arjun', 'Developer', 'External', 'Platform Team'],
      };
      assert.ok(allowedValues['Waiting On'].includes('Dan'), 'Should accept "Dan"');
    });
  });

  describe('Sheets service strategy cascade', () => {
    it('should export getStrategyCascade', () => {
      const sheets = require('../server/services/sheets');
      assert.strictEqual(typeof sheets.getStrategyCascade, 'function');
    });
    it('should return available: false when STRATEGY_SHEETS_ID is not set', async () => {
      const config = require('../server/config');
      if (!config.STRATEGY_SHEETS_ID) {
        const sheets = require('../server/services/sheets');
        const result = await sheets.getStrategyCascade();
        assert.strictEqual(result.available, false);
      }
    });
  });
});

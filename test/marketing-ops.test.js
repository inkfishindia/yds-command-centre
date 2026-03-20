const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Marketing Ops', () => {
  describe('Route module', () => {
    it('should load without errors', () => {
      const route = require('../server/routes/marketing-ops');
      assert.ok(route);
    });
  });

  describe('Notion service marketing functions', () => {
    it('should export getCampaigns', () => {
      const notion = require('../server/services/notion');
      assert.strictEqual(typeof notion.getCampaigns, 'function');
    });
    it('should export getContentCalendar', () => {
      const notion = require('../server/services/notion');
      assert.strictEqual(typeof notion.getContentCalendar, 'function');
    });
    it('should export getSequences', () => {
      const notion = require('../server/services/notion');
      assert.strictEqual(typeof notion.getSequences, 'function');
    });
    it('should export getSessionsLog', () => {
      const notion = require('../server/services/notion');
      assert.strictEqual(typeof notion.getSessionsLog, 'function');
    });
    it('should export getMarketingOpsSummary', () => {
      const notion = require('../server/services/notion');
      assert.strictEqual(typeof notion.getMarketingOpsSummary, 'function');
    });
    it('should export updateCampaignProperty', () => {
      const notion = require('../server/services/notion');
      assert.strictEqual(typeof notion.updateCampaignProperty, 'function');
    });
    it('should export getCampaignCommitments', () => {
      const notion = require('../server/services/notion');
      assert.strictEqual(typeof notion.getCampaignCommitments, 'function');
    });
  });

  describe('Metrics data file', () => {
    it('should have metrics data file', () => {
      const fs = require('fs');
      const path = require('path');
      const metricsPath = path.join(__dirname, '..', 'server', 'data', 'metrics.json');
      const raw = fs.readFileSync(metricsPath, 'utf-8');
      const metrics = JSON.parse(raw);
      assert.ok(metrics.revenue, 'Missing revenue metric');
      assert.ok(metrics.repeatRate, 'Missing repeatRate metric');
      assert.ok(metrics.customizerToCart, 'Missing customizerToCart metric');
      assert.strictEqual(typeof metrics.revenue.current, 'number');
      assert.strictEqual(typeof metrics.revenue.target, 'number');
    });
  });

  describe('Database registration', () => {
    it('should include marketing ops databases in listDatabases', () => {
      const notion = require('../server/services/notion');
      const dbs = notion.listDatabases();
      const names = dbs.map(d => d.name);
      assert.ok(names.includes('Campaigns'), 'Missing Campaigns');
      assert.ok(names.includes('Content Calendar'), 'Missing Content Calendar');
      assert.ok(names.includes('Sequences'), 'Missing Sequences');
      assert.ok(names.includes('Sessions Log'), 'Missing Sessions Log');
    });
  });
});

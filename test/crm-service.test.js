'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('CRM Service — exports', () => {
  it('exports the expected service methods', () => {
    const crmService = require('../server/services/crm-service');
    assert.equal(typeof crmService.getOverview, 'function');
    assert.equal(typeof crmService.getPeople, 'function');
    assert.equal(typeof crmService.getProjects, 'function');
    assert.equal(typeof crmService.getTasks, 'function');
    assert.equal(typeof crmService.getCampaigns, 'function');
    assert.equal(typeof crmService.getBusinessUnits, 'function');
    assert.equal(typeof crmService.filterRows, 'function');
  });
});

describe('CRM Service — filterRows', () => {
  const { filterRows } = require('../server/services/crm-service');
  const rows = [
    {
      Status: 'Active',
      owner_User_id_resolved: 'Dan',
      assignee_User_id_resolved: 'Arjun',
      'Project id_resolved': 'Command Centre',
    },
    {
      status: 'Done',
      owner_User_id_resolved: 'Priya',
      assignee_User_id_resolved: 'Dan',
      'Project id_resolved': 'CRM',
    },
  ];

  it('filters by status case-insensitively across Status/status fields', () => {
    assert.equal(filterRows(rows, { status: 'active' }).length, 1);
    assert.equal(filterRows(rows, { status: 'done' }).length, 1);
  });

  it('filters by owner substring', () => {
    const result = filterRows(rows, { owner: 'dan' });
    assert.equal(result.length, 1);
    assert.equal(result[0].owner_User_id_resolved, 'Dan');
  });

  it('filters by assignee substring', () => {
    const result = filterRows(rows, { assignee: 'dan' });
    assert.equal(result.length, 1);
    assert.equal(result[0].assignee_User_id_resolved, 'Dan');
  });

  it('filters by project substring', () => {
    const result = filterRows(rows, { project: 'crm' });
    assert.equal(result.length, 1);
    assert.equal(result[0]['Project id_resolved'], 'CRM');
  });
});

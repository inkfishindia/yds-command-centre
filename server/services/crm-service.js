'use strict';

const sheetsService = require('./sheets');
const hydrationService = require('./hydration');

function filterRows(rows, filters) {
  let result = rows || [];

  if (filters.status) {
    result = result.filter((row) => (row.Status || row.status || '').toLowerCase() === filters.status.toLowerCase());
  }

  if (filters.owner) {
    result = result.filter((row) => (row.owner_User_id_resolved || '').toLowerCase().includes(filters.owner.toLowerCase()));
  }

  if (filters.assignee) {
    result = result.filter((row) => (row.assignee_User_id_resolved || '').toLowerCase().includes(filters.assignee.toLowerCase()));
  }

  if (filters.project) {
    result = result.filter((row) => (row['Project id_resolved'] || '').toLowerCase().includes(filters.project.toLowerCase()));
  }

  return result;
}

async function getOverview() {
  const [pipeline, people] = await Promise.all([
    sheetsService.getPipelineData(),
    sheetsService.fetchSheet('PEOPLE').catch(() => ({ available: false })),
  ]);

  return {
    pipeline,
    people: people.available !== false ? (people.rows || []) : [],
    timestamp: new Date().toISOString(),
  };
}

async function getPeople() {
  return hydrationService.hydrateSheetData('PEOPLE');
}

async function getProjects(filters = {}) {
  const data = await hydrationService.hydrateSheetData('PROJECTS');
  if (data.available === false) return data;

  return {
    available: true,
    headers: data.headers,
    rows: filterRows(data.rows, { status: filters.status, owner: filters.owner }),
  };
}

async function getTasks(filters = {}) {
  const data = await hydrationService.hydrateSheetData('TASKS');
  if (data.available === false) return data;

  return {
    available: true,
    headers: data.headers,
    rows: filterRows(data.rows, {
      status: filters.status,
      assignee: filters.assignee,
      project: filters.project,
    }),
  };
}

async function getCampaigns(filters = {}) {
  const data = await sheetsService.fetchSheet('CAMPAIGNS');
  if (data.available === false) return data;

  return {
    available: true,
    headers: data.headers,
    rows: filterRows(data.rows, { status: filters.status }),
  };
}

async function getBusinessUnits() {
  return hydrationService.hydrateSheetData('BUSINESS_UNITS');
}

module.exports = {
  getOverview,
  getPeople,
  getProjects,
  getTasks,
  getCampaigns,
  getBusinessUnits,
  filterRows,
};

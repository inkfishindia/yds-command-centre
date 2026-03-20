'use strict';

// Data Hydration Service — resolves FK references across sheets so callers
// get human-readable values instead of raw IDs.
// Ported from data/repos/tpl-x-yds/services/dataHydrationService.ts (CommonJS).

const sheetsService = require('./sheets');

// FK resolution mappings — which columns in which sheets reference which other sheets
const HYDRATION_MAP = [
  // PROJECTS
  { sourceSheet: 'PROJECTS', sourceColumnId: 'owner_User_id', targetSheet: 'PEOPLE', targetColumnId: 'User_id', displayColumn: 'full_name' },
  { sourceSheet: 'PROJECTS', sourceColumnId: 'business_unit_id', targetSheet: 'BUSINESS_UNITS', targetColumnId: 'bu_id', displayColumn: 'bu_name' },
  // TASKS
  { sourceSheet: 'TASKS', sourceColumnId: 'Project id', targetSheet: 'PROJECTS', targetColumnId: 'project_id', displayColumn: 'Project Name' },
  { sourceSheet: 'TASKS', sourceColumnId: 'assignee_User_id', targetSheet: 'PEOPLE', targetColumnId: 'User_id', displayColumn: 'full_name' },
  { sourceSheet: 'TASKS', sourceColumnId: 'reporter_User_id', targetSheet: 'PEOPLE', targetColumnId: 'User_id', displayColumn: 'full_name' },
  // TOUCHPOINTS
  { sourceSheet: 'TOUCHPOINTS', sourceColumnId: 'bu_id', targetSheet: 'BUSINESS_UNITS', targetColumnId: 'bu_id', displayColumn: 'bu_name' },
  // BUSINESS_UNITS
  { sourceSheet: 'BUSINESS_UNITS', sourceColumnId: 'owner_User_id', targetSheet: 'PEOPLE', targetColumnId: 'User_id', displayColumn: 'full_name' },
  { sourceSheet: 'BUSINESS_UNITS', sourceColumnId: 'primary_flywheel_id', targetSheet: 'FLYWHEEL', targetColumnId: 'flywheel_id', displayColumn: 'flywheel_name' },
  // PEOPLE
  { sourceSheet: 'PEOPLE', sourceColumnId: 'manager_id', targetSheet: 'PEOPLE', targetColumnId: 'User_id', displayColumn: 'full_name' },
  // BMC cross-references
  { sourceSheet: 'BMC_BUSINESS_UNITS', sourceColumnId: 'primarySegments', targetSheet: 'BMC_SEGMENTS', targetColumnId: 'segmentId', displayColumn: 'segmentName' },
  { sourceSheet: 'BMC_BUSINESS_UNITS', sourceColumnId: 'flywheelId', targetSheet: 'BMC_FLYWHEELS', targetColumnId: 'flywheelId', displayColumn: 'flywheelName' },
  { sourceSheet: 'BMC_BUSINESS_UNITS', sourceColumnId: 'primaryOwner', targetSheet: 'BMC_TEAM', targetColumnId: 'personId', displayColumn: 'fullName' },
  { sourceSheet: 'BMC_FLYWHEELS', sourceColumnId: 'serves', targetSheet: 'BMC_SEGMENTS', targetColumnId: 'segmentId', displayColumn: 'segmentName' },
  { sourceSheet: 'BMC_REVENUE_STREAMS', sourceColumnId: 'businessUnitId', targetSheet: 'BMC_BUSINESS_UNITS', targetColumnId: 'businessUnitId', displayColumn: 'businessUnitName' },
  { sourceSheet: 'BMC_REVENUE_STREAMS', sourceColumnId: 'segmentId', targetSheet: 'BMC_SEGMENTS', targetColumnId: 'segmentId', displayColumn: 'segmentName' },
  { sourceSheet: 'BMC_COST_STRUCTURE', sourceColumnId: 'owner', targetSheet: 'BMC_TEAM', targetColumnId: 'personId', displayColumn: 'fullName' },
  { sourceSheet: 'BMC_CHANNELS', sourceColumnId: 'platformId', targetSheet: 'BMC_PLATFORMS', targetColumnId: 'platformId', displayColumn: 'platformName' },
  { sourceSheet: 'BMC_CHANNELS', sourceColumnId: 'servesSegments', targetSheet: 'BMC_SEGMENTS', targetColumnId: 'segmentId', displayColumn: 'segmentName' },
  { sourceSheet: 'BMC_CHANNELS', sourceColumnId: 'flywheelId', targetSheet: 'BMC_FLYWHEELS', targetColumnId: 'flywheelId', displayColumn: 'flywheelName' },
  { sourceSheet: 'BMC_PLATFORMS', sourceColumnId: 'owner', targetSheet: 'BMC_TEAM', targetColumnId: 'personId', displayColumn: 'fullName' },
  { sourceSheet: 'BMC_TEAM', sourceColumnId: 'primaryHub', targetSheet: 'BMC_HUBS', targetColumnId: 'hubId', displayColumn: 'hubName' },
  { sourceSheet: 'BMC_TEAM', sourceColumnId: 'ownsBusinessUnits', targetSheet: 'BMC_BUSINESS_UNITS', targetColumnId: 'businessUnitId', displayColumn: 'businessUnitName' },
  { sourceSheet: 'BMC_HUBS', sourceColumnId: 'primaryOwner', targetSheet: 'BMC_TEAM', targetColumnId: 'personId', displayColumn: 'fullName' },
  { sourceSheet: 'BMC_METRICS', sourceColumnId: 'owner', targetSheet: 'BMC_TEAM', targetColumnId: 'personId', displayColumn: 'fullName' },
];

/**
 * Normalise an ID value for consistent lookup matching.
 * - Leading zeros are stripped from numeric-only IDs: '001' → '1'
 * - Alphanumeric IDs are returned as-is: 'user_001' → 'user_001'
 * - null/undefined become ''
 */
function normalizeId(id) {
  if (id === null || id === undefined) return '';
  const idStr = String(id).trim();
  if (idStr.match(/[a-zA-Z]/)) return idStr;
  const numericPart = idStr.replace(/\D/g, '');
  return numericPart ? String(parseInt(numericPart, 10)) : idStr;
}

/**
 * Hydrate an array of row objects for a given sheetKey using already-fetched
 * data from allData. Mutates nothing — returns new row objects.
 *
 * @param {object[]} data       - Source rows to hydrate
 * @param {string}   sheetKey  - Key in SHEET_REGISTRY for the source sheet
 * @param {object}   allData   - Map of sheetKey → { headers, rows } for all required sheets
 * @returns {object[]} Hydrated rows with `*_resolved` columns appended
 */
function hydrateData(data, sheetKey, allData) {
  const mappings = HYDRATION_MAP.filter(m => m.sourceSheet === sheetKey);
  if (mappings.length === 0) return data;

  // Build lookup maps from target sheets (keyed by normalised targetColumnId value)
  const lookups = {};
  for (const mapping of mappings) {
    const targetKey = mapping.targetSheet;
    if (!lookups[targetKey] && allData[targetKey]) {
      const targetRows = allData[targetKey].rows || allData[targetKey];
      lookups[targetKey] = new Map(
        (Array.isArray(targetRows) ? targetRows : []).map(row => [
          normalizeId(row[mapping.targetColumnId]),
          row,
        ])
      );
    }
  }

  return data.map(row => {
    const newRow = { ...row };
    for (const mapping of mappings) {
      const fkValue = row[mapping.sourceColumnId];
      if (!fkValue) continue;

      const lookupMap = lookups[mapping.targetSheet];
      if (!lookupMap) continue;

      // FK values can be comma-separated lists (e.g. primarySegments)
      const fkValues = String(fkValue).split(',').map(s => s.trim());
      const resolved = fkValues
        .map(fk => {
          const related = lookupMap.get(normalizeId(fk));
          if (!related) return null;
          let display = related[mapping.displayColumn];
          // Fallback for Project Name vs project_name inconsistency
          if (mapping.displayColumn === 'Project Name' && !display) {
            display = related.project_name;
          }
          return display || null;
        })
        .filter(Boolean);

      if (resolved.length > 0) {
        newRow[`${mapping.sourceColumnId}_resolved`] = resolved.join(', ');
      }
    }
    return newRow;
  });
}

/**
 * Fetch a sheet and hydrate its FK columns in one call.
 * Fetches the source sheet and all required target sheets in parallel.
 *
 * @param {string} sheetKey - Key in SHEET_REGISTRY
 * @returns {{ available: boolean, headers?: string[], rows?: object[] }}
 */
async function hydrateSheetData(sheetKey) {
  const mappings = HYDRATION_MAP.filter(m => m.sourceSheet === sheetKey);
  const targetSheetKeys = [...new Set(mappings.map(m => m.targetSheet))];

  // Fetch source + all target sheets in parallel, never letting one failure
  // block the rest — unconfigured sheets return { available: false }
  const allKeys = [sheetKey, ...targetSheetKeys];
  const results = await Promise.all(
    allKeys.map(key => sheetsService.fetchSheet(key).catch(() => ({ available: false })))
  );

  const allData = {};
  allKeys.forEach((key, i) => {
    if (results[i] && results[i].available !== false) {
      allData[key] = results[i];
    }
  });

  const sourceData = allData[sheetKey];
  if (!sourceData || !sourceData.rows) {
    return { available: false };
  }

  const hydratedRows = hydrateData(sourceData.rows, sheetKey, allData);
  return { available: true, headers: sourceData.headers, rows: hydratedRows };
}

module.exports = { HYDRATION_MAP, normalizeId, hydrateData, hydrateSheetData };

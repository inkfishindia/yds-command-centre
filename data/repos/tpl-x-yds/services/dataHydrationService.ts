/**
 * Data Hydration / FK Resolution Service — from The-Design-Lab---TPL-X-YDS
 * Resolves foreign key relationships across sheets (e.g., owner_User_id -> full_name)
 * PORT TO: server/services/sheets.js or new server/services/hydration.js
 */

import { HYDRATION_MAP, SheetKey } from './configService';
import type { SheetRow } from '../types';

type DataStore = {
  [key in SheetKey]?: SheetRow[];
};

/**
 * Normalizes an ID string. If the ID contains letters (e.g., 'user_001'), it's returned as is.
 * If it's purely numeric, it handles inconsistencies like '001' vs '1'.
 */
const normalizeId = (id: any): string => {
  if (id === null || id === undefined) return '';
  const idStr = String(id).trim();

  if (idStr.match(/[a-zA-Z]/)) {
    return idStr;
  }

  const numericPart = idStr.replace(/\D/g, '');
  return numericPart ? String(parseInt(numericPart, 10)) : idStr;
};

const getObjectFieldName = (sourceColumnId: string): string | null => {
  switch (sourceColumnId) {
    case 'manager_id': return 'manager';
    case 'owner_User_id': return 'owner';
    case 'assigned_to_id': return 'assigned_to';
    case 'assignee_User_id': return 'assignee';
    case 'reporter_User_id': return 'reporter';
    case 'account_executive_fk': return 'account_executive';
    case 'sdr_owner_fk': return 'sdr_owner';
    case 'logged_by_fk': return 'logged_by';
    case 'Project id': return 'project';
    default: return null;
  }
}

/**
 * Hydrates data by resolving foreign key relationships defined in HYDRATION_MAP.
 * It adds new `*_resolved` fields to the data objects.
 */
export const hydrateData = <T extends SheetRow>(data: T[], sheetKey: SheetKey, allData: DataStore): T[] => {
  const mappingsForSheet = HYDRATION_MAP.filter(m => m.sourceSheet === sheetKey);
  if (mappingsForSheet.length === 0) {
    return data;
  }

  // Create lookup maps for performance, using normalized keys
  const lookupMaps = mappingsForSheet.reduce((acc, mapping) => {
    const toSheetKey = mapping.targetSheet;
    if (!acc[toSheetKey]) {
      const targetData = allData[toSheetKey];
      if (targetData) {
        acc[toSheetKey] = new Map(
          targetData.map(row => [normalizeId(row[mapping.targetColumnId]), row])
        );
      }
    }
    return acc;
  }, {} as { [key in SheetKey]?: Map<string, SheetRow> });


  return data.map(row => {
    const newRow = { ...row };
    mappingsForSheet.forEach(mapping => {
      const foreignKeyValue = row[mapping.sourceColumnId];
      if (foreignKeyValue) {
        const toSheetKey = mapping.targetSheet;
        const lookupMap = lookupMaps[toSheetKey];

        const fKValues = String(foreignKeyValue).split(',').map(s => s.trim());
        const resolvedValues = fKValues.map(fk => {
          const normalizedFk = normalizeId(fk);
          const relatedRow = lookupMap?.get(normalizedFk);
          if (!relatedRow) return null;

          let displayValue = relatedRow[mapping.displayColumn];

          if (mapping.displayColumn === 'Project Name' && !displayValue) {
            displayValue = relatedRow['project_name'];
          }

          return displayValue || null;

        }).filter(v => v !== null);

        if (resolvedValues.length > 0) {
          (newRow as any)[`${mapping.sourceColumnId}_resolved`] = resolvedValues.join(', ');

          if(fKValues.length === 1) {
            const normalizedFk = normalizeId(fKValues[0]);
            const relatedRowObject = lookupMap?.get(normalizedFk);

            if (relatedRowObject) {
              const objectFieldName = getObjectFieldName(mapping.sourceColumnId);
              if (objectFieldName) {
                (newRow as any)[objectFieldName] = relatedRowObject;
              }
            }
          }
        }
      }
    });
    return newRow;
  });
};



import {
  QuarterlyInitiative,
  QuarterlyInitiativeStatus,
} from '../../types';
import { parseNumber, mapToEnum } from '../../services/bmcSheetsParser';
import { BMCSheetConfigItem } from '../../types';

export interface QuarterlyInitiativeSheetConfigItem<T = any> extends BMCSheetConfigItem<T> {
  sectionKey: 'quarterlyInitiative';
  sheetName: string;
  gid: string;
  headerRow: number;
  fieldToHeaderMap: Partial<Record<keyof T, string>>;
  transform?: (key: keyof T, value: string) => any;
  isSimpleList?: boolean;
}

export const QUARTERLY_INITIATIVE_SHEET_CONFIG: QuarterlyInitiativeSheetConfigItem<QuarterlyInitiative> = {
  spreadsheetId: '1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA',
  sectionKey: 'quarterlyInitiative',
  sheetName: 'quarterly_initiatives',
  gid: '1201683780',
  headerRow: 1,
  // FIX: Set isSimpleList to false
  isSimpleList: false,
  fieldToHeaderMap: {
    initiativeId: 'initiativeId',
    quarter: 'quarter',
    initiativeName: 'initiativeName',
    parentGoalIds: 'parent_goal_ids',
    programIds: 'program_ids',
    objective: 'objective',
    ownerPersonId: 'owner_person_id',
    hubId: 'hub_id',
    budget: 'budget',
    status: 'status',
    notes: 'notes',
    timelineStart: 'timeline_start',
    timelineEnd: 'timeline_end',
  },
  transform: (key: keyof QuarterlyInitiative, value: string) => {
    switch (key) {
      case 'status': return mapToEnum(value, QuarterlyInitiativeStatus);
      default: return value;
    }
  },
};

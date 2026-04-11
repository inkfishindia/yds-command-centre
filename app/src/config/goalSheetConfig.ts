

import {
  Goal,
  GoalStatus,
} from '../../types';
import { parseNumber, mapToEnum } from '../../services/bmcSheetsParser';
import { BMCSheetConfigItem } from '../../types';

export interface GoalSheetConfigItem<T = any> extends BMCSheetConfigItem<T> {
  sectionKey: 'goal';
  sheetName: string;
  gid: string;
  headerRow: number;
  fieldToHeaderMap: Partial<Record<keyof T, string>>;
  transform?: (key: keyof T, value: string) => any;
  isSimpleList?: boolean;
}

export const GOAL_SHEET_CONFIG: GoalSheetConfigItem<Goal> = {
  spreadsheetId: '1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA',
  sectionKey: 'goal',
  sheetName: 'GOALS',
  gid: '1317894602',
  headerRow: 1,
  // FIX: Set isSimpleList to false
  isSimpleList: false,
  fieldToHeaderMap: {
    goalId: 'goalId',
    goalName: 'goalName',
    targetMetricMar2026: 'targetMetric_mar2026',
    currentBaselineOct2024: 'currentBaseline_oct2024',
    ownerPersonId: 'owner_person_id',
    hubId: 'hub_id',
    budgetAllocation: 'budget_allocation',
    killCriteria: 'killCriteria',
    status: 'status',
    notes: 'notes',
    parentObjectiveId: 'parent_objective_id',
  },
  transform: (key: keyof Goal, value: string) => {
    switch (key) {
      case 'status': return mapToEnum(value, GoalStatus);
      default: return value;
    }
  },
};

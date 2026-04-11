

import {
  StrategicObjective,
  StrategicObjectiveStatus,
  StrategicObjectiveCriticalityLevel,
} from '../../types';
import { parseNumber, mapToEnum } from '../../services/bmcSheetsParser';
import { BMCSheetConfigItem } from '../../types';

// FIX: Defined and exported StrategicObjectiveSheetConfigItem interface
export interface StrategicObjectiveSheetConfigItem<T = any> extends BMCSheetConfigItem<T> {
  sectionKey: 'strategicObjective';
  sheetName: string;
  gid: string;
  headerRow: number;
  fieldToHeaderMap: Partial<Record<keyof T, string>>;
  transform?: (key: keyof T, value: string) => any;
  isSimpleList?: boolean;
}

export const STRATEGIC_OBJECTIVE_SHEET_CONFIG: StrategicObjectiveSheetConfigItem<StrategicObjective> = {
  spreadsheetId: '1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA',
  sectionKey: 'strategicObjective',
  sheetName: 'strategic_objectives',
  gid: '1628608650',
  headerRow: 1,
  // FIX: Set isSimpleList to false
  isSimpleList: false,
  fieldToHeaderMap: {
    objectiveId: 'objective_id',
    objectiveName: 'objectiveName',
    objectiveDescription: 'objectiveDescription',
    successMetric3Year: 'successMetric_3year',
    parentStrategicInitiativeId: 'parent_strategic_initiative_id',
    ownerPersonId: 'owner_person_id',
    ownerHubId: 'hub_id',
    status: 'status',
    criticalityLevel: 'criticalityLevel',
    notes: 'notes',
  },
  transform: (key: keyof StrategicObjective, value: string) => {
    switch (key) {
      case 'status': return mapToEnum(value, StrategicObjectiveStatus);
      case 'criticalityLevel': return mapToEnum(value, StrategicObjectiveCriticalityLevel);
      default: return value;
    }
  },
};

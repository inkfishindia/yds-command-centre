
import {
  StrategicInitiative,
  StrategicInitiativeStatus,
} from '../../types';
import { parseNumber, mapToEnum } from '../../services/bmcSheetsParser';
import { BMCSheetConfigItem } from '../../types';

export interface StrategicInitiativeSheetConfigItem<T = any> extends BMCSheetConfigItem<T> {
  sectionKey: 'strategicInitiative';
  sheetName: string;
  gid: string;
  headerRow: number;
  fieldToHeaderMap: Partial<Record<keyof T, string>>;
  transform?: (key: keyof T, value: string) => any;
  isSimpleList?: boolean;
}

export const STRATEGIC_INITIATIVE_SHEET_CONFIG: StrategicInitiativeSheetConfigItem<StrategicInitiative> = {
  spreadsheetId: '1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA',
  sectionKey: 'strategicInitiative',
  sheetName: 'STRATEGIC INITIATIVES',
  gid: '1954933489',
  headerRow: 1,
  // FIX: Explicitly set isSimpleList to false to match BMCSheetConfigItem
  isSimpleList: false,
  fieldToHeaderMap: {
    strategicInitiativeId: 'strategic_initiative_id',
    strategicInitiativeName: 'strategic_initiative_name',
    timelineStart: 'timeline_start',
    timelineEnd: 'timeline_end',
    targetOutcome: 'target_outcome',
    objectiveIds: 'objective_ids',
    ownerPersonId: 'owner_person_id',
    status: 'status',
  },
  transform: (key: keyof StrategicInitiative, value: string) => {
    switch (key) {
      case 'status': return mapToEnum(value, StrategicInitiativeStatus);
      default: return value;
    }
  },
};

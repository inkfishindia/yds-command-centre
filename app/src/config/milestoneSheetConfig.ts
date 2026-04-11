
import {
  Milestone,
  MilestoneStatus,
  MilestoneBlockerType,
} from '../../types'
import { parseNumber, mapToEnum } from '../../services/bmcSheetsParser'
import { BMCSheetConfigItem } from '../../types'

export interface MilestoneSheetConfigItem<T = any> extends BMCSheetConfigItem<T> {
  sectionKey: 'milestone';
  sheetName: string;
  gid: string;
  headerRow: number;
  fieldToHeaderMap: Partial<Record<keyof T, string>>;
  transform?: (key: keyof T, value: string) => any;
  isSimpleList?: boolean;
}

export const MILESTONES_SHEET_CONFIG: MilestoneSheetConfigItem<Milestone> = {
  spreadsheetId: '1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA',
  sectionKey: 'milestone',
  sheetName: 'Milestones',
  gid: '246947641',
  headerRow: 1,
  isSimpleList: false,
  fieldToHeaderMap: {
    milestoneId: 'milestone_id',
    projectId: 'project_id',
    milestoneName: 'milestone_name',
    ownerId: 'owner_id',
    ownerName: 'owner_name',
    targetDate: 'target_date',
    status: 'status',
    completionPct: 'completion_%',
    blockerType: 'blocker_type',
    calcCompletionPct: 'Calc_Completion_%',
  },
  transform: (key: keyof Milestone, value: string) => {
    switch (key) {
      case 'status': return mapToEnum(value, MilestoneStatus)
      case 'blockerType': return mapToEnum(value, MilestoneBlockerType)
      case 'calcCompletionPct': return parseNumber(value)
      case 'completionPct':
        return parseNumber(value)
      default: return value
    }
  },
}

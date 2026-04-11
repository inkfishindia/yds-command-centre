
import {
  Task,
  TaskStatus,
  TaskPriority,
} from '../../types'
import { parseNumber, mapToEnum } from '../../services/bmcSheetsParser'
import { BMCSheetConfigItem } from '../../types'

export interface TaskSheetConfigItem<T = any> extends BMCSheetConfigItem<T> {
  sectionKey: 'task';
  sheetName: string;
  gid: string;
  headerRow: number;
  fieldToHeaderMap: Partial<Record<keyof T, string>>;
  transform?: (key: keyof T, value: string) => any;
  isSimpleList?: boolean;
}

export const TASKS_SHEET_CONFIG: TaskSheetConfigItem<Task> = {
  spreadsheetId: '1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA',
  sectionKey: 'task',
  sheetName: 'task',
  gid: '963211628',
  headerRow: 1,
  isSimpleList: false,
  fieldToHeaderMap: {
    taskId: 'task_id',
    projectId: 'project_id',
    milestoneId: 'milestone_id',
    taskName: 'task_name',
    ownerId: 'owner_id',
    ownerName: 'owner_name',
    hubId: 'hub_id',
    hubName: 'hub_name',
    description: 'description',
    priority: 'priority',
    status: 'status',
    effortHours: 'effort_hours',
    dueDate: 'due_date',
    ageDays: 'age_days',
  },
  transform: (key: keyof Task, value: string) => {
    switch (key) {
      case 'priority': return mapToEnum(value, TaskPriority)
      case 'status': return mapToEnum(value, TaskStatus)
      case 'effortHours':
      case 'ageDays':
        return parseNumber(value)
      default: return value
    }
  },
}

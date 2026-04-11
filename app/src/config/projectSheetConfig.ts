
import {
  Project,
  ProjectStatus,
  ProjectPriority,
  IsOnTime,
} from '../../types'
import { parseNumber, mapToEnum } from '../../services/bmcSheetsParser'
import { BMCSheetConfigItem } from '../../types'

export interface ProjectSheetConfigItem<T = any> extends BMCSheetConfigItem<T> {
  sectionKey: 'project';
  sheetName: string;
  gid: string;
  headerRow: number;
  fieldToHeaderMap: Partial<Record<keyof T, string>>;
  transform?: (key: keyof T, value: string) => any;
  isSimpleList?: boolean;
}

export const PROJECTS_SHEET_CONFIG: ProjectSheetConfigItem<Project> = {
  spreadsheetId: '1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA',
  sectionKey: 'project',
  sheetName: 'Project',
  gid: '719163995',
  headerRow: 1,
  isSimpleList: false,
  fieldToHeaderMap: {
    projectId: 'project_id',
    projectName: 'project_name',
    programId: 'program_id',
    ownerId: 'owner_id',
    ownerName: 'owner_name',
    hubId: 'hub_id',
    hubName: 'hub_name',
    status: 'status',
    priority: 'priority',
    budget: 'budget',
    completionPct: 'completion_pct',
    healthScore: 'health_score',
    milestonesCount: 'milestones_count',
    tasksCount: 'tasks_count',
    tasksComplete: 'tasks_complete',
    tasksInProgress: 'tasks_in_progress',
    tasksBlocked: 'tasks_blocked',
    daysToDeadline: 'days_to_deadline',
    budgetSpent: 'budget_spent',
    budgetVariance: 'budget_variance',
    velocityTasksPerDay: 'velocity_tasks_per_day',
    isOnTime: 'is_on_time',
    budgetOriginal: 'budget_original',
    budgetRevised: 'budget_revised',
  },
  transform: (key: keyof Project, value: string) => {
    switch (key) {
      case 'status': return mapToEnum(value, ProjectStatus)
      case 'priority': return mapToEnum(value, ProjectPriority)
      case 'healthScore': return parseNumber(value)
      case 'isOnTime': return mapToEnum(value, IsOnTime)
      case 'budget':
      case 'completionPct':
      case 'milestonesCount':
      case 'tasksCount':
      case 'tasksComplete':
      case 'tasksInProgress':
      case 'tasksBlocked':
      case 'daysToDeadline':
      case 'budgetSpent':
      case 'budgetVariance':
      case 'velocityTasksPerDay':
      case 'budgetOriginal':
      case 'budgetRevised':
        return parseNumber(value)
      default: return value
    }
  },
}

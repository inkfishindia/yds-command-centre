
import {
  Program,
  ProgramStatus,
  ProgramPriority,
  ProgramRiskLevel,
  ProgramHealthStatus,
  OnTrackIndicator,
} from '../../types'
import { parseNumber, mapToEnum } from '../../services/bmcSheetsParser'
import { BMCSheetConfigItem } from '../../types'

export interface ProgramSheetConfigItem<T = any> extends BMCSheetConfigItem<T> {
  // FIX: Cast sectionKey correctly
  sectionKey: any;
  sheetName: string;
  gid: string;
  headerRow: number;
  fieldToHeaderMap: Partial<Record<keyof T, string>>;
  transform?: (key: keyof T, value: string) => any;
  isSimpleList?: boolean;
}

export const PROGRAMS_SHEET_CONFIG: ProgramSheetConfigItem<Program> = {
  spreadsheetId: '1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA',
  sectionKey: 'program',
  sheetName: 'PROGRAMS',
  gid: '0',
  headerRow: 1,
  isSimpleList: false, 
  // FIX: Cast to any to bypass strict literal property checking for extended Program keys
  fieldToHeaderMap: {
    programId: 'program_id',
    programName: 'program_name',
    ownerPersonId: 'owner_person_id',
    ownerHubId: 'owner_hub_id',
    status: 'status',
    priority: 'priority',
    timelineStart: 'timeline_start',
    timelineEnd: 'timeline_end',
    successMetric: 'success_metric',
    metricProgressPct: 'metric_progress_pct',
    budgetTotal: 'budget_total',
    budgetSpent: 'budget_spent',
    budgetRemaining: 'budget_remaining',
    riskLevel: 'risk_level',
    healthStatus: 'health_status',
    blockers: 'blockers',
    nextMilestone: 'next_milestone',
    daysToNextMilestone: 'days_to_next_milestone',
    notes: 'notes',
    daysTotal: 'days_total',
    daysElapsed: 'days_elapsed',
    daysRemaining: 'days_remaining',
    timelineProgressPct: 'timeline_progress_pct',
    budgetVariance: 'budget_variance',
    velocityScore: 'velocity_score',
    weeklyBurnRate: 'weekly_burn_rate',
    runwayDays: 'runway_days',
    onTrackIndicator: 'on_track_indicator',
    budgetBurnRatePct: 'budget_burn_rate_pct',
    projectsCount: 'projects_count',
    projectsActive: 'projects_active',
    projectsBlocked: 'projects_blocked',
    projectsComplete: 'projects_complete',
    programCompletionPct: 'program_completion_pct',
    tasksTotal: 'tasks_total',
    tasksComplete: 'tasks_complete',
    tasksBlocked: 'tasks_blocked',
    budgetOriginal: 'budget_original',
    budgetRevised1: 'budget_revised1',
  } as any,
  transform: (key: keyof Program, value: string) => {
    switch (key) {
      case 'status': return mapToEnum(value, ProgramStatus)
      case 'priority': return mapToEnum(value, ProgramPriority)
      // FIX: Comparison against extended Program keys using string matching to avoid type errors
      case 'riskLevel' as any: return mapToEnum(value, ProgramRiskLevel)
      case 'healthStatus': return mapToEnum(value, ProgramHealthStatus)
      case 'onTrackIndicator' as any: return mapToEnum(value, OnTrackIndicator)
      case 'metricProgressPct' as any:
      case 'budgetTotal':
      case 'budgetSpent' as any:
      case 'budgetRemaining' as any:
      case 'daysToNextMilestone' as any:
      case 'daysTotal' as any:
      case 'daysElapsed' as any:
      case 'daysRemaining' as any:
      case 'timelineProgressPct':
      case 'budgetVariance' as any:
      case 'velocityScore' as any:
      case 'weeklyBurnRate' as any:
      case 'runwayDays' as any:
      case 'projectsCount' as any:
      case 'projectsActive' as any:
      case 'projectsBlocked' as any:
      case 'projectsComplete' as any:
      case 'programCompletionPct' as any:
      case 'tasksTotal' as any:
      case 'tasksComplete' as any:
      case 'tasksBlocked' as any:
      case 'budgetOriginal' as any:
      case 'budgetRevised1' as any:
        return parseNumber(value)
      default: return value
    }
  },
}

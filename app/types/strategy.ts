
import { StrategicInitiative, StrategicObjective, Goal, QuarterlyInitiative } from './index';

export interface StrategyUpdate {
  update_id: string;
  project_id: string;
  week_ending: string;
  health: 'Green' | 'Yellow' | 'Red' | 'Unknown';
  progress_summary: string;
  blockers: string;
  owner: string;
}

export interface StrategyDecision {
  decision_id: string;
  project_id: string;
  date: string;
  decision: string;
  rationale: string;
  decision_maker: string;
  impact: string;
}

export interface StrategySegment {
  segment_id: string;
  segment_name: string;
}

export interface GlobalFilterState {
  segment_id: string | null;
  owner_person_id: string | null;
  hub_id: string | null;
  quarter: string | null;
  status: string | null;
}

export interface ActivityItem {
  id: string;
  type: 'update' | 'decision';
  date: Date;
  title: string;
  summary: string;
  project_id: string;
  owner: string;
  health?: string;
  impact?: string;
}

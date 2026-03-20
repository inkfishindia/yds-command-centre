// YDS Domain Types — from The-Design-Lab---TPL-X-YDS
// Reference implementation. Port relevant types to Command Centre as needed.

// FIX: Add import for React to resolve namespace error
import React from 'react';

export type ViewName = 'dashboard' | 'business' | 'projects' | 'marketing' | 'partners' | 'customers' | 'reports' | 'notion' | 'commandCentre' | 'settings' | 'teamSettings' | 'visualSystemMapView' | 'businessModelCanvas' | 'strategy';

export type NavItem = {
  viewName: ViewName,
  label: string,
  icon: React.ReactElement<{ className?: string }>
};

export type ChatPart =
  | { text: string; table?: undefined; isSavable?: boolean; title?: string; }
  | { text?: undefined; table: NotionTableData; isSavable?: boolean; title?: string; };

export interface ChatMessage {
  role: 'user' | 'model';
  parts: ChatPart[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  icon?: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  description?: string;
}

export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export interface PendingEvent {
  summary: string;
  startDateTime: string;
  endDateTime: string;
  location?: string;
  description?: string;
}

export interface CalendarListItem {
  id: string;
  summary: string;
  primary?: boolean;
}

export interface TaskList {
  kind: "tasks#taskList";
  id: string;
  title: string;
}

export interface Task {
  kind: "tasks#task";
  id: string;
  title: string;
  status: 'needsAction' | 'completed';
  due?: string;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
  labelIds?: string[];
  bodyHtml?: string;
  bodyText?: string;
}

export interface NotionTableData {
  headers: string[];
  rows: (string | null)[][];
}

export type ProcessedTableData = NotionTableData & { title: string; };
export type ProcessedContent = string | ProcessedTableData | null;

export interface NotionPage {
  id: string;
  object: 'page' | 'database';
  title: string;
  url: string;
  icon: {
    type: string;
    emoji?: string;
    file?: { url: string };
  } | null;
}

type EntityID = string;
type UserID = string;
type DateString = string;
type Percentage = number;
type HourValue = number;

export interface SheetUser {
  rowIndex: number;
  User_id: UserID;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  role_title: string;
  manager_id: UserID;
  employment_type: string;
  weekly_hours_capacity: HourValue;
  location: string;
  notes: string;
  is_active: boolean;
  skills: string;
  budget_approval_level: string;
  platform_access: string;
  claude_access_level: string;
  delegation_authority_level: string;
  ai_workflow_preferences: string;
  notion_User_id: string;
  created_at: DateString;
  updated_at: DateString;
  'App role': string;
  hub_id: EntityID;
  bu_focus: string;
  utilization_target_pct: Percentage;
  current_utilization_pct: Percentage;
  velocity_points_per_week: HourValue;
  primary_responsibility: string;
  manager?: SheetUser;
  manager_id_resolved?: string;
  sdr_owner_fk_resolved?: string;
  account_executive_fk_resolved?: string;
  logged_by_fk_resolved?: string;
  [key: string]: any;
}

export interface Project {
  rowIndex: number;
  project_id: EntityID;
  'Project Name': string;
  business_unit_id: EntityID;
  owner_User_id: UserID;
  objective: string;
  priority: string;
  Status: string;
  status: string;
  start_date: DateString;
  target_end_date: DateString;
  confidence_pct: Percentage;
  budget_planned: number;
  budget_spent: number;
  risk_flag: string;
  risk_note: string;
  notion_project_id: string;
  integration_status: string;
  automation_level: string;
  team_members: string;
  success_metrics: string;
  created_at: DateString;
  updated_at: DateString;
  target_impact: string;
  go_nogo_criteria: string;
  hub_dependencies: string;
  metric_impact: string;
  blocks_project_id: EntityID;
  project_name?: string;
  target_bu_id: EntityID;
  target_flywheel_id: EntityID;
  target_platform_ids: string;
  target_metric: string;
  baseline_value: number;
  target_value: number;
  actual_value: number;
  impact_status: string;
  owner_User_id_resolved?: string;
  business_unit_id_resolved?: string;
  [key: string]: any;
}

export interface ProjectTask {
  rowIndex: number;
  task_id: EntityID;
  title: string;
  'Project id': EntityID;
  assignee_User_id: UserID;
  reporter_User_id: UserID;
  status: string;
  priority: string;
  labels: string;
  estimate_hours: HourValue;
  logged_hours: HourValue;
  due_date: DateString;
  completed_at: DateString;
  description: string;
  energy_level: string;
  department: string;
  Blocker: string;
  'Blocker Description': string;
  delegation_status: string;
  days_overdue: number;
  founder_critical: boolean;
  notion_task_id: string;
  auto_delegation_eligible: boolean;
  resource_requirements: string;
  platform: string;
  content_type: string;
  created_at: DateString;
  updated_at: DateString;
  'Project id_resolved'?: string;
  assignee_User_id_resolved?: string;
  reporter_User_id_resolved?: string;
  project?: Project;
  [key: string]: any;
}

export interface BusinessUnit {
  rowIndex: number;
  bu_id: EntityID;
  bu_name: string;
  bu_type: string;
  platform_type: string;
  interface: string;
  pricing_model: string;
  primary_flywheel_id: EntityID;
  owner_User_id: UserID;
  Upsell_flywheel_id: EntityID;
  avg_order_value: number;
  target_margin_pct: Percentage;
  'Customer Type': string;
  'Tech Build': string;
  'Sales Motion': string;
  'Support Type': string;
  'Pricing Logic': string;
  current_revenue: number;
  current_orders: number;
  variance_pct: Percentage;
  health_status: string;
  growth_rate_required: string | number;
  priority_level: string;
  status: string;
  order_volume_range: string;
  customer_type: string;
  bu_focus: string;
  owner_User_id_resolved?: string;
  primary_flywheel_id_resolved?: string;
  [key: string]: any;
}

export interface Flywheel {
  rowIndex: number;
  flywheel_id: EntityID;
  flywheel_name: string;
  description: string;
  [key: string]: any;
}

export interface Hub {
  rowIndex: number;
  function_id: EntityID;
  function_name: string;
  owner: UserID;
  [key: string]: any;
}

export interface Lead {
  rowIndex: number;
  lead_id: EntityID;
  lead_name: string;
  sdr_owner_fk: UserID;
  sdr_owner_fk_resolved?: string;
  [key: string]: any;
}

export interface Account {
  rowIndex: number;
  account_id: EntityID;
  company_name: string;
  account_executive_fk: UserID;
  account_executive_fk_resolved?: string;
  [key: string]: any;
}

export interface Opportunity {
  rowIndex: number;
  opportunity_id: EntityID;
  account_fk: EntityID;
  lead_fk: EntityID;
  account_fk_resolved?: string;
  lead_fk_resolved?: string;
  sdr_owner_fk?: UserID;
  sdr_owner_fk_resolved?: string;
  [key: string]: any;
}

export interface LeadActivity {
  rowIndex: number;
  activity_id: EntityID;
  lead_fk: EntityID;
  logged_by_fk: UserID;
  lead_fk_resolved?: string;
  logged_by_fk_resolved?: string;
  [key: string]: any;
}

export interface Platform {
  rowIndex: number;
  platform_id?: string;
  platform_name?: string;
  platform_type?: string;
  category?: string;
  owner_User_id?: string;
  owner_User_id_resolved?: string;
  hub_function_id?: string;
  status?: string;
  monthly_cost?: string;
  integration_url?: string;
  notes?: string;
  [key: string]: any;
}

export interface Touchpoint {
  rowIndex: number;
  touchpoint_id?: string;
  touchpoint_name?: string;
  'platform_id (FK)'?: string;
  'platform_id (FK)_resolved'?: string;
  'flywheel_id (FK)'?: string;
  'flywheel_id (FK)_resolved'?: string;
  bu_id?: string;
  bu_id_resolved?: string;
  touchpoint_type?: string;
  status?: string;
  weekly_budget?: string;
  target_audience?: string;
  created_date?: string;
  notes?: string;
  [key: string]: any;
}

export interface Campaign {
  rowIndex: number;
  id?: string;
  name?: string;
  objective?: string;
  owner_user_id?: string;
  owner_user_id_resolved?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  budget_planned?: number;
  budget_spent?: number;
  channels?: string;
  ai_enhancement_status?: string;
  campaign_category?: string;
  campaign_type?: string;
  target_market?: string;
  platform?: string;
  kpi_target?: number;
  race_framework?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface CustomerSegmentFoundation {
  rowIndex: number;
  'Customer segment'?: string;
  'Purpose'?: string;
  'Vission'?: string;
  'Mission'?: string;
  'Expression'?: string;
  'Psychological Job-to-be-Done:'?: string;
  'Behavioral Truth'?: string;
  'Brand Position for Them:'?: string;
  'Messaging Tone:'?: string;
  'Design POV'?: string;
  [key: string]: any;
}

export interface AppStore {
  rowIndex: number;
  'Name'?: string;
  'Brand Name'?: string;
  'Email Address'?: string;
  'Mobile Number'?: string;
  [key: string]: any;
}

// Business Model Canvas Types
export interface BmcSegment {
  rowIndex: number;
  segmentId: string;
  segmentName: string;
  customerProfile: string;
  flywheelId: string;
  status: string;
  nineMonthRevenue: string;
  percentRevenue: string;
  aov: string;
  jobsToBeDone: string;
  keyPainPoints: string;
  decisionCriteria: string;
  notes: string;
  customer_facing: string;
  Positioning: string;
  flywheelId_resolved?: string;
  [key: string]: any;
}

export interface BmcBusinessUnit {
  rowIndex: number;
  businessUnitId: string;
  businessUnitName: string;
  coreOffering: string;
  primarySegments: string;
  flywheelId: string;
  volumeRange: string;
  primaryOwner: string;
  nineMonthRevenue: string;
  percentRevenue: string;
  pricingModel: string;
  notes: string;
  flywheelId_resolved?: string;
  primarySegments_resolved?: string;
  primaryOwner_resolved?: string;
  [key: string]: any;
}

export interface BmcFlywheel {
  rowIndex: number;
  flywheelId: string;
  flywheelName: string;
  customerStruggleSolved: string;
  acquisitionModel: string;
  serviceModel: string;
  serves: string;
  keyMetrics: string;
  serves_resolved?: string;
  [key: string]: any;
}

export interface RevenueStream {
  rowIndex: number;
  revenueStreamId: string;
  businessUnitId: string;
  segmentId: string;
  aov: string;
  grossMargin: string;
  grossProfitPerOrder: string;
  cac: string;
  contributionMargin: string;
  nineMonthRevenue: string;
  estimatedOrders: string;
  notes: string;
  businessUnitId_resolved?: string;
  segmentId_resolved?: string;
  [key: string]: any;
}

export interface CostStructure {
  rowIndex: number;
  costId: string;
  costCategory: string;
  costType: string;
  monthlyAmount: string;
  annualAmount: string;
  owner: string;
  notes: string;
  owner_resolved?: string;
  [key: string]: any;
}

export interface Channel {
  rowIndex: number;
  channelId: string;
  channelName: string;
  channelType: string;
  platformId: string;
  servesSegments: string;
  flywheelId: string;
  motionType: string;
  notes: string;
  platformId_resolved?: string;
  servesSegments_resolved?: string;
  flywheelId_resolved?: string;
  [key: string]: any;
}

export interface BmcPlatform {
  rowIndex: number;
  platformId: string;
  platformName: string;
  platformType: string;
  purpose: string;
  status: string;
  owner: string;
  notes: string;
  owner_resolved?: string;
  [key: string]: any;
}

export interface BmcTeamMember {
  rowIndex: number;
  personId: string;
  fullName: string;
  role: string;
  primaryHub: string;
  ownsBusinessUnits: string;
  keyResponsibility: string;
  notes: string;
  primaryHub_resolved?: string;
  ownsBusinessUnits_resolved?: string;
  [key: string]: any;
}

export interface BmcHub {
  rowIndex: number;
  hubId: string;
  hubName: string;
  hubType: string;
  headCount: string;
  primaryOwner: string;
  keyActivities: string;
  notes: string;
  primaryOwner_resolved?: string;
  [key: string]: any;
}

export interface BmcPartner {
  rowIndex: number;
  partnerId: string;
  partnerName: string;
  partnerType: string;
  role: string;
  riskLevel: string;
  status: string;
  contractTerms: string;
  notes: string;
  [key: string]: any;
}

export interface BmcMetric {
  rowIndex: number;
  metricId: string;
  metricName: string;
  category: string;
  currentValue: string;
  status: string;
  target: string;
  owner: string;
  notes: string;
  owner_resolved?: string;
  [key: string]: any;
}

// Generic fallback type for sheet data
export type SheetRow = {
  rowIndex: number;
  [key: string]: any;
};

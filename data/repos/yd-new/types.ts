/**
 * Program Management Types — from YD-New
 * Comprehensive hierarchy: Programs > Projects > Tasks > Milestones
 * PORT TO: Reference for project tracking views and Colin tool definitions
 */

// Status Enums
export enum CustomerSegmentStatus { active = 'active', at_risk = 'at_risk', validated = 'validated' }
export enum PartnerStatus { active = 'active', at_risk = 'at_risk' }
export enum PartnerRiskLevel { low = 'low', medium = 'medium', high = 'high' }
export enum ProgramStatus { not_started = 'not_started', in_progress = 'in_progress', completed = 'completed', on_hold = 'on_hold', cancelled = 'cancelled' }
export enum ProjectStatus { not_started = 'not_started', in_progress = 'in_progress', completed = 'completed', on_hold = 'on_hold', cancelled = 'cancelled', blocked = 'blocked' }
export enum TaskStatus { not_started = 'not_started', in_progress = 'in_progress', completed = 'completed', blocked = 'blocked', on_hold = 'on_hold' }
export enum MilestoneStatus { not_started = 'not_started', in_progress = 'in_progress', completed = 'completed', blocked = 'blocked', on_hold = 'on_hold' }

// Priority Enums
export enum ProgramPriority { low = 'low', medium = 'medium', high = 'high', critical = 'critical' }
export enum ProjectPriority { low = 'low', medium = 'medium', high = 'high', critical = 'critical' }
export enum TaskPriority { low = 'low', medium = 'medium', high = 'high' }
export enum GapActionPriority { p0 = 'p0', p1 = 'p1', p2 = 'p2' }

// Health & Risk Enums
export enum ProgramHealthStatus { not_started = 'not_started', on_track = 'on_track', at_risk = 'at_risk', off_track = 'off_track', critical = 'critical' }
export enum ProgramRiskLevel { low = 'low', medium = 'medium', high = 'high' }
export enum ProjectHealthScore { green = 'green', yellow = 'yellow', red = 'red' }
export enum MetricStatus { validated = 'validated', at_risk = 'at_risk' }
export enum GapActionStatus { at_risk = 'at_risk', done = 'done', in_progress = 'in_progress', not_started = 'not_started' }

// Type Enums
export enum CostType { fixed = 'fixed', variable = 'variable', unmeasured = 'unmeasured' }
export enum PlatformType { web_app = 'web_app', mobile_app = 'mobile_app', api = 'api', internal_tool = 'internal_tool' }
export enum PlatformStatus { validated = 'validated', concept = 'concept', building = 'building' }
export enum FlywheelModel { self_service_digital = 'self_service_digital', sales_led = 'sales_led', partner_driven = 'partner_driven' }
export enum MetricCategory { financial = 'financial', operational = 'operational', customer = 'customer' }
export enum MilestoneBlockerType { api_docs_incomplete = 'api_docs_incomplete', resource_unavailable = 'resource_unavailable', dependency_blocked = 'dependency_blocked', scope_creep = 'scope_creep', other = 'other' }
export enum OnTrackIndicator { yes = 'yes', no = 'no' }
export enum IsOnTime { yes = 'yes', no = 'no' }

// Core Business Interfaces
export interface Partner {
  id: string;
  name: string;
  partnerType: string;
  role: string;
  riskLevel: PartnerRiskLevel;
  status: PartnerStatus;
  contractTerms: string;
  notes: string;
}

export interface CustomerSegment {
  id: string;
  name: string;
  customerProfile: string;
  flywheelId: string;
  status: CustomerSegmentStatus;
  nineMonthRevenue: string;
  percentRevenue: string;
  aov: string;
  jobsToBeDone: string;
  keyPainPoints: string;
  decisionCriteria: string;
  notes: string;
  customerFacing: string;
  positioning: string;
}

export interface Channel {
  id: string;
  name: string;
  type: string;
  platformId: string;
  servesSegments: string;
  flywheelId: string;
  motionType: string;
  notes: string;
}

export interface Platform {
  id: string;
  name: string;
  type: PlatformType;
  purpose: string;
  status: PlatformStatus;
  owner: string;
  notes: string;
}

export interface RevenueStream {
  id: string;
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
  percentage: string;
}

export interface Cost {
  id: string;
  category: string;
  type: CostType;
  monthlyAmount: string;
  annualAmount: string;
  owner: string;
  notes: string;
}

export interface BusinessUnit {
  id: string;
  name: string;
  coreOffering: string;
  primarySegments: string;
  flywheelId: string;
  volumeRange: string;
  primaryOwner: string;
  nineMonthRevenue: string;
  percentRevenue: string;
  pricingModel: string;
  notes: string;
}

export interface Flywheel {
  id: string;
  name: string;
  customerStruggleSolved: string;
  acquisitionModel: FlywheelModel;
  serviceModel: string;
  servesSegments: string;
  keyMetrics: string;
}

export interface TeamMember {
  id: string;
  fullName: string;
  role: string;
  primaryHub: string;
  ownsBusinessUnits: string;
  keyResponsibility: string;
  notes: string;
}

export interface Hub {
  id: string;
  name: string;
  type: string;
  headCount: string;
  primaryOwner: string;
  keyActivities: string;
  notes: string;
}

// Strategic Planning
export interface Metric {
  id: string;
  name: string;
  category: MetricCategory;
  currentValue: string;
  status: MetricStatus;
  target: string;
  owner: string;
  notes: string;
}

export interface GapAction {
  id: string;
  name: string;
  priority: GapActionPriority;
  impact: string;
  actionRequired: string;
  owner: string;
  timeline: string;
  status: GapActionStatus;
  notes: string;
}

export interface KeyActivity {
  id: string;
  category: string;
  name: string;
  frequency: string;
  ownerHub: string;
  automationLevel: string;
  scaleRequirement: string;
  notes: string;
}

export interface CustomerRelationship {
  id: string;
  segmentId: string;
  type: string;
  acquisitionStrategy: string;
  activationMechanism: string;
  retentionStrategy: string;
  automationLevel: string;
  touchPoints: string;
}

export interface KeyResource {
  id: string;
  type: string;
  name: string;
  ownershipModel: string;
  criticalityLevel: string;
  scalability: string;
  investmentNeeded: string;
  notes: string;
}

export interface ValueProposition {
  description: string;
  segments: string[];
}

export interface BusinessModelCanvasData {
  partners: Partner[];
  activities: KeyActivity[];
  valuePropositions: ValueProposition[];
  customerRelations: CustomerRelationship[];
  segments: CustomerSegment[];
  resources: KeyResource[];
  channels: Channel[];
  revenueStreams: RevenueStream[];
  costs: Cost[];
  businessUnits: BusinessUnit[];
  flywheels: Flywheel[];
  platforms: Platform[];
  team: TeamMember[];
  hubs: Hub[];
  metrics: Metric[];
  gapActions: GapAction[];
}

// Program Management
export interface Program {
  programId: string;
  programName: string;
  status: ProgramStatus;
  priority: ProgramPriority;
  ownerPersonId: string;
  ownerHubId: string;
  contributingHubIds: string;
  linkedBusinessUnitIds: string;
  customerProblem: string;
  ourSolution: string;
  whyNow: string;
  startDate: string;
  endDate: string;
  successMetric: string;
  targetValue: string;
  currentValue: string;
  metricProgressPct: number;
  budgetTotal: number;
  budgetSpent: number;
  budgetRemaining: number;
  riskLevel: ProgramRiskLevel;
  healthStatus: ProgramHealthStatus;
  blockers: string;
  nextMilestone: string;
  dependentProgramIds: string;
  platformIds: string;
  channelIds: string;
  createdAt: string;
  updatedAt: string;
  notes: string;
  budgetVariance: number;
  velocityScore: number;
  weeklyBurnRate: number;
  runwayDays: number;
  onTrackIndicator: OnTrackIndicator;
  projectCounts: { total: number; completed: number; };
  tasksTracking: { total: number; completed: number; blocked: number; };
  budgetRevisions: number;
}

export interface Project {
  projectId: string;
  projectName: string;
  programId: string;
  ownerId: string;
  hubId: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: string;
  endDate: string;
  budget: number;
  dependencies: string;
  successMetric: string;
  revenueImpact: string;
  projectType: string;
  businessUnitImpact: string;
  segmentImpact: string;
  platformId: string;
  channelIds: string;
  completionPct: number;
  healthScore: ProjectHealthScore;
  actualEndDate: string;
  milestonesCount: number;
  tasksMetrics: { total: number; completed: number; blocked: number; };
  budgetTracking: { spent: number; remaining: number; };
  velocityTasksPerDay: number;
  isOnTime: IsOnTime;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  taskId: string;
  projectId: string;
  milestoneId: string;
  taskName: string;
  ownerId: string;
  hubId: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  effortHours: number;
  dueDate: string;
  dependencies: string;
  assigneeIds: string;
  taskCategory: string;
  taskType: string;
  actualCompletionDate: string;
  notes: string;
  impactIfDelayed: string;
  ageDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  milestoneId: string;
  projectId: string;
  milestoneName: string;
  owner: string;
  startDate: string;
  targetDate: string;
  status: MilestoneStatus;
  completionPct: number;
  taskBlocker: string;
  ownerId: string;
  ownerName: string;
  tasksCount: number;
  tasksComplete: number;
  calcCompletionPct: number;
  daysToTarget: number;
  milestoneType: string;
  blockerType: MilestoneBlockerType;
  dependentMilestoneIds: string;
  actualCompletionDate: string;
  createdAt: string;
  updatedAt: string;
}

// Gmail
export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string; }>;
    parts?: GmailMessagePart[];
    body?: { data?: string; };
  };
  sender?: string;
  subject?: string;
  date?: string;
  body?: string;
}

export interface GmailMessagePart {
  partId: string;
  mimeType: string;
  filename: string;
  body: { data?: string; };
  parts?: GmailMessagePart[];
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  iconLink: string;
  modifiedTime: string;
}

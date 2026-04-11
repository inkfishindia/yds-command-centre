
import * as React from 'react';
import type { Part } from '@google/genai';

export * from './auth';
export * from './orders';

// Import OrderItem and OrderSummaryItem from orders.ts which is exported above
import { OrderItem, OrderSummaryItem } from './orders';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: any) => void;
            error_callback?: (error: any) => void;
          }) => {
            requestAccessToken: (options?: any) => void;
          };
        };
      };
    };
    __RUNTIME_CONFIG__?: Record<string, string>;
  }
}

export interface DeltaMetric {
  value: number;
  delta: number;
  percentChange: number;
}

export interface DashboardMetrics {
  registrations: DeltaMetric;
  ordersReceived: DeltaMetric;
  conversionRate: DeltaMetric;
  aov: DeltaMetric;
  totalRevenue: DeltaMetric;
  revenueBreakdown: {
    b2c: number;
    business: number;
    partner: number;
    cod: number;
    manual: number;
    ds: number;
  };
  yesterdayRevenueBreakdown: {
    b2c: number;
    business: number;
    partner: number;
    cod: number;
    manual: number;
    ds: number;
  };
  orderHealth: {
    ordersPerReg: DeltaMetric;
    codPct: DeltaMetric;
    discountPct: DeltaMetric;
    businessOrderPct: DeltaMetric;
  };
  leakage: {
    totalCarts: DeltaMetric;
    abandonedGuests: DeltaMetric;
    abandonedUsers: DeltaMetric;
    abandonmentRate: DeltaMetric;
  };
  trends: DailyReportData[];
}

export interface DailyReportData {
  date: Date | null;
  registrations: number;
  ordersNewRegistrants: number;
  ordersReceived: number;
  totalOrderValue: number;
  partnerProductsValue: number;
  businessProductsValue: number;
  codOrderValue: number;
  deliveryCharges: number;
  abandonedCartsGuests: number;
  abandonedCartsUsers: number;
  ordersWithDiscount: number;
  codOrders: number;
  businessOrders: number;
  manualOrderValue?: number;
  dsOrderValue?: number;
  b2cOrderValue?: number;
  conversionRate?: number;
  aov?: number;
}

// Portfolio Types
export type PortfolioItemType = 'program' | 'project' | 'task' | 'milestone' | 'strategicInitiative' | 'strategicObjective' | 'goal' | 'quarterlyInitiative' | 'resourceAllocationBudget';

// Missing Page Props
export interface MockPageProps { title: string; }
export interface WebsitePageProps { title: string; }
export interface AllOrderItemsPageProps { title: string; }
export interface OrderSummaryPageProps { title: string; }
export interface PickListKanbanPageProps { title: string; }
export interface ProductionScreenPageProps { title: string; }
export interface OrderListProductsPageProps { title: string; }
export interface DesignBoardPageProps { title: string; }
export interface OrderDashboardPageProps { title: string; }
export interface ProgramsPageProps { onViewProjects: (id: string) => void; onViewTasks: (id: string) => void; onViewMilestones: (id: string) => void; }
export interface ProjectsPageProps { programId: string | null; onViewTasks: (id: string) => void; onViewMilestones: (id: string) => void; }
export interface TasksPageProps { projectId: string | null; }
export interface MilestonesPageProps { projectId: string | null; }
export interface StrategicInitiativesPageProps { onViewObjectives: (id: string) => void; }
export interface StrategicObjectivesPageProps { strategicInitiativeId: string | null; onViewGoals: (id: string) => void; }
export interface GoalsPageProps { strategicObjectiveId: string | null; onViewQuarterlyInitiatives: (id: string) => void; }
export interface QuarterlyInitiativesPageProps { goalId: string | null; }
export interface ResourceAllocationBudgetPageProps {}

// Core BMC Types
export enum PartnerStatus { ACTIVE = 'Active', BLOCKED = 'Blocked' }
export enum PartnerRiskLevel { LOW = 'Low', MEDIUM = 'Medium', HIGH = 'High' }
export interface Partner { id: string; name: string; partnerType?: string; role?: string; criticalityLevel?: string; riskLevel?: PartnerRiskLevel; status?: PartnerStatus; contractTerms?: string; backupOptions?: string; serves_segments?: string; enables_resources?: string; enables_activities?: string; ownerHub?: string; ownerPerson?: string; notes?: string; }

export enum CustomerSegmentStatus { ACTIVE = 'Active', VALIDATED = 'Validated', AT_RISK = 'At Risk' }
export interface CustomerSegment { id: string; name: string; status: CustomerSegmentStatus; customerProfile?: string; flywheelId?: string; nineMonthRevenue?: number; aov?: number; jobsToBeDone?: string; keyPainPoints?: string; decisionCriteria?: string; notes?: string; customerFacing?: string; positioning?: string; promiseStatement?: string; expression?: string; platforms?: string[]; priorityRank?: string; forStatement?: string; againstStatement?: string; ageGroup?: string; companySize?: string; psychographic?: string; purchaseTrigger1?: string; purchaseTrigger2?: string; purchaseTrigger3?: string; adoptionThreshold?: string; irreversibilityTrigger?: string; oldWorldPain?: string; newWorldGain?: string; }

// FIX: Added 'motionType' to Channel interface
export interface Channel { id: string; name: string; type: string; platformId?: string; platformName?: string; servesSegments?: string; flywheelId?: string; servesBUs?: string; monthlyBudgetInr?: number; currentCac?: number; cacGap?: number; conversionRatePct?: number; responsiblePerson?: string; responsiblePersonName?: string; status?: string; monthlyVolume?: string; annualRevenue?: string; notes?: string; ltv?: string; roi?: string; motionType?: string; }

export enum CostType { FIXED = 'Fixed', VARIABLE = 'Variable' }
export interface Cost { id: string; category: string; costName?: string; type: CostType; monthlyAmount?: number; annualAmount?: number; scaleProfile?: string; driverMetric?: string; serves_segments?: string; enables_flywheels?: string; enables_activities?: string; ownerHub?: string; owner?: string; status?: string; notes?: string; }

export interface RevenueStream { id: string; streamName: string; revenueModel?: string; pricingStrategy?: string; segmentId?: string; enables_flywheels?: string; serves_bus?: string; nineMonthRevenue?: number; targetRevenue_Mar2026?: number; growthRequired_multiplier?: number; aov?: number; grossMargin?: number; volumeMetric?: string; conversionMetric?: string; status?: string; notes?: string; }

export interface BusinessUnit { id: string; name: string; coreOffering?: string; primarySegments?: string; flywheelId?: string; volumeRange?: string; primaryOwner?: string; nineMonthRevenue?: number; percentRevenue?: string; pricingModel?: string; notes?: string; buType?: string; salesMotion?: string; supportModel?: string; monthlyCapacityOrders?: number; productionSlaHours?: number; status?: string; validatedAov?: number; nineMonthActualOrders?: number; annualRevenueTargetInr?: number; annualOrdersTarget?: number; grossMarginPct?: number; variableCostPerOrder?: number; fixedCostsMonthly?: number; breakEvenOrders?: number; }

export interface Flywheel { id: string; name: string; customerStruggleSolved?: string; acquisitionModel?: string; serviceModel?: string; servesSegments?: string; keyMetrics?: string; jtbdTriggerMoment?: string; motionSequence?: string; primaryBottleneck?: string; servesBus?: string; orderSizeRange?: string; ownerPerson?: string; ownerPersonName?: string; cacTarget?: number; validationStatus?: string; nineMonthActualRevenueInr?: number; nineMonthActualOrders?: number; validatedAovInr?: number; annualRevenueTargetInr?: number; annualOrdersTarget?: number; conversionRatePct?: number; reorderRate6moPct?: number; avgSaleCycleDays?: number; }

export enum PlatformType { WEB_APP = 'Web App', MOBILE_APP = 'Mobile App', INTERNAL_TOOL = 'Internal Tool' }
export enum PlatformStatus { BUILDING = 'Building', VALIDATED = 'Validated', ARCHIVED = 'Archived' }
export interface Platform { id: string; name: string; type: PlatformType; purpose?: string; ownerHub?: string; status?: PlatformStatus; techStack?: string; platformIconUrl?: string; platformLinkUrl?: string; currentRevenue?: string; currentOrders?: string; currentCustomers?: string; currentAov?: string; revenueShare?: string; annualRevenueTargetInr?: string; annualOrdersTarget?: string; growthRateNeeded?: string; }

export interface TeamMember { id: string; fullName: string; role: string; primaryHub?: string; ownsBusinessUnits?: string; keyResponsibility?: string; notes?: string; primaryHubName?: string; ownsFlywheelsIds?: string; ownsSegmentsIds?: string; annualCompInr?: number; capacityUtilizationPct?: number; email?: string; phone?: string; department?: string; managerId?: string; employmentType?: string; weeklyHoursCapacity?: number; location?: string; }

export interface Hub { id: string; name: string; type?: string; headCount?: number; primaryOwner?: string; keyActivities?: string; notes?: string; ownerPerson?: string; status?: string; costCenterOrProfit?: string; interfacesOwned?: string; channelsOwned?: string; primaryBottleneck?: string; scaleTriggerPoint?: string; }

export enum MetricCategory { SALES = 'Sales', OPERATIONS = 'Operations', FINANCIAL = 'Financial' }
export enum MetricStatus { ON_TRACK = 'On Track', AT_RISK = 'At Risk', CRITICAL = 'Critical' }
export interface Metric { id: string; name: string; category?: MetricCategory; currentValue?: string; status?: MetricStatus; target?: string; owner?: string; notes?: string; }

export enum GapActionPriority { LOW = 'Low', MEDIUM = 'Medium', HIGH = 'High' }
export enum GapActionStatus { NOT_STARTED = 'Not Started', IN_PROGRESS = 'In Progress', COMPLETED = 'Completed' }
export interface GapAction { id: string; name: string; priority?: GapActionPriority; impact?: string; actionRequired?: string; owner?: string; timeline?: string; status?: GapActionStatus; notes?: string; }

export interface ValueProposition { id: string; description: string; category?: string; benefitsOffered?: string; painPointsSolved?: string; productServiceOffering?: string; differentiators?: string; serves_segments?: string; serves_flywheels?: string; priority?: string; validation_status?: string; owner_person_id?: string; notes?: string; }

export interface KeyActivity { id: string; name: string; category?: string; frequency?: string; ownerHub?: string; ownerPerson?: string; automationLevel?: string; scaleRequirement?: string; serves_segments?: string; enables_flywheels?: string; serves_bus?: string; criticality?: string; current_performance?: string; target_performance?: string; investment_needed?: string; notes?: string; }
export interface CustomerRelationship { id: string; type: string; relationshipName?: string; acquisitionStrategy?: string; activationMechanism?: string; retentionStrategy?: string; automationLevel?: string; touchPoints?: string; serves_segments?: string; serves_flywheels?: string; serves_bus?: string; cost_per_customer?: string; owner_hub_id?: string; owner_person_id?: string; notes?: string; }
export interface KeyResource { id: string; name: string; type?: string; ownershipModel?: string; criticalityLevel?: string; scalability?: string; currentCapacity?: string; scaleLimitCapacity?: string; investmentNeeded?: string; serves_segments?: string; enables_flywheels?: string; owner_hub_id?: string; owner_person_id?: string; status?: string; notes?: string; }

// Strategy Extensions
export interface Strategy { 
  id: string; 
  vision?: string; 
  mission?: string; 
  brandPosition?: string; 
  differentiatedValue?: string; 
  messagingTone?: string;
  marketCategory?: string;
  designPov?: string;
  categoryEntryPoints?: string;
  buyingSituations?: string;
  distinctiveAssets?: string;
  claudePanelLink?: string;
  deltaScore?: string;
  currentSolutionEfficiency?: string;
  ourSolutionEfficiency?: string;
  competitiveAlt1?: string;
  competitiveAlt2?: string;
  competitiveAlt3?: string;
}

export interface BusinessModelCanvasData { 
  strategy: Strategy | null; 
  keyPartners: Partner[]; 
  keyActivities: KeyActivity[]; 
  valuePropositions: ValueProposition[]; 
  customerRelations: CustomerRelationship[]; 
  customerSegments: CustomerSegment[]; 
  keyResources: KeyResource[]; 
  channels: Channel[]; 
  revenueStreams: RevenueStream[]; 
  costStructure: Cost[]; 
  businessUnits: BusinessUnit[]; 
  flywheels: Flywheel[]; 
  platforms: Platform[]; 
  team: TeamMember[]; 
  hubs: Hub[]; 
  metrics: Metric[]; 
  gapsActions: GapAction[]; 
}

// System Configs
export interface DataConfig { [key: string]: any; }
export interface AccessTokenRequest { prompt?: 'consent' | 'none'; }

// Workspace Integrations
export interface GmailMessage { id: string; threadId: string; snippet: string; payload: any; sender: string; subject: string; date: string; body: string | null; }
export interface GmailMessagePart { body?: { data?: string }; parts?: GmailMessagePart[]; }
export interface GoogleDriveFile { id: string; name: string; mimeType: string; webViewLink?: string; iconLink?: string; modifiedTime?: string; }
export interface GoogleCalendarEvent { id: string; summary: string; htmlLink?: string; start: string | null; end: string | null; isAllDay: boolean; location?: string; }

// Portfolio Management
export enum ProgramStatus { IN_PROGRESS = 'In Progress', COMPLETED = 'Completed', ON_HOLD = 'On Hold', PLANNED = 'Planned' }
export enum ProgramPriority { CRITICAL = 'Critical', HIGH = 'High', MEDIUM = 'Medium', LOW = 'Low' }
export enum ProgramRiskLevel { LOW = 'Low', MEDIUM = 'Medium', HIGH = 'High' }
export enum ProgramHealthStatus { ON_TRACK = 'On Track', AT_RISK = 'At Risk', CRITICAL = 'Critical' }
export enum OnTrackIndicator { YES = 'Yes', NO = 'No' }

// FIX: Added 'timelineStart' to Program interface
export interface Program { programId: string; programName: string; status?: ProgramStatus; priority?: ProgramPriority; healthStatus?: ProgramHealthStatus; riskLevel?: ProgramRiskLevel; ownerPersonId?: string; ownerHubId?: string; budgetTotal?: number; budgetSpent?: number; budgetRemaining?: number; timelineProgressPct?: number; successMetric?: string; targetOutcome?: string; initiativeId?: string; projectsCount?: number; tasksTotal?: number; metricProgressPct?: number; nextMilestone?: string; blockers?: string; daysToNextMilestone?: number; daysTotal?: number; daysElapsed?: number; daysRemaining?: number; budgetVariance?: number; velocityScore?: number; weeklyBurnRate?: number; runwayDays?: number; onTrackIndicator?: OnTrackIndicator; budgetBurnRatePct?: number; projectsActive?: number; projectsBlocked?: number; projectsComplete?: number; programCompletionPct?: number; tasksComplete?: number; tasksBlocked?: number; budgetOriginal?: number; budgetRevised1?: number; timelineStart?: string; timelineEnd?: string; }

export enum ProjectStatus { IN_PROGRESS = 'In Progress', COMPLETED = 'Completed', BLOCKED = 'Blocked', PLANNED = 'Planned' }
export enum ProjectPriority { CRITICAL = 'Critical', HIGH = 'High', MEDIUM = 'Medium', LOW = 'Low' }
export enum IsOnTime { YES = 'Yes', NO = 'No' }
export interface Project { projectId: string; projectName: string; programId?: string; ownerId?: string; ownerName?: string; hubId?: string; hubName?: string; status?: ProjectStatus; priority?: ProjectPriority; budget?: number; completionPct?: number; healthScore?: number; milestonesCount?: number; tasksCount?: number; tasksComplete?: number; tasksInProgress?: number; tasksBlocked?: number; daysToDeadline?: number; budgetSpent?: number; budgetVariance?: number; velocityTasksPerDay?: number; isOnTime?: IsOnTime; budgetOriginal?: number; budgetRevised?: number; programName?: string; initiative_id?: string; }

export enum TaskStatus { COMPLETED = 'Completed', IN_PROGRESS = 'In Progress', BLOCKED = 'Blocked', NOT_STARTED = 'Not Started' }
export enum TaskPriority { URGENT = 'Urgent', HIGH = 'High', MEDIUM = 'Medium', LOW = 'Low' }
export interface Task { taskId: string; taskName: string; projectId?: string; milestoneId?: string; ownerId?: string; ownerName?: string; hubId?: string; hubName?: string; description?: string; priority?: TaskPriority; status?: TaskStatus; effortHours?: number; dueDate?: string; ageDays?: number; }

export enum MilestoneStatus { COMPLETED = 'Completed', IN_PROGRESS = 'In Progress', NOT_STARTED = 'Not Started', BLOCKED = 'Blocked' }
export enum MilestoneBlockerType { NONE = 'None', DEPENDENCY = 'Dependency', RESOURCE = 'Resource', TECHNICAL = 'Technical' }
export interface Milestone { milestoneId: string; milestoneName: string; projectId?: string; status?: MilestoneStatus; ownerId?: string; ownerName?: string; targetDate?: string; completionPct?: string; blockerType?: MilestoneBlockerType; calcCompletionPct?: number; }

export enum StrategicInitiativeStatus { ACTIVE = 'Active', ON_HOLD = 'On Hold', COMPLETED = 'Completed' }
export interface StrategicInitiative { strategicInitiativeId: string; strategicInitiativeName: string; timelineStart?: string; timelineEnd?: string; targetOutcome?: string; objectiveIds?: string; ownerPersonId?: string; status?: StrategicInitiativeStatus; }

export enum StrategicObjectiveStatus { SCALE_READY = 'Scale Ready', IN_PROGRESS = 'In Progress', ON_HOLD = 'On Hold' }
export enum StrategicObjectiveCriticalityLevel { CRITICAL = 'Critical', HIGH = 'High', MEDIUM = 'Medium', LOW = 'Low' }
export interface StrategicObjective { objectiveId: string; objectiveName: string; objectiveDescription?: string; successMetric3Year?: string; parentStrategicInitiativeId?: string; ownerPersonId?: string; ownerHubId?: string; status?: StrategicObjectiveStatus; criticalityLevel?: StrategicObjectiveCriticalityLevel; notes?: string; }

export enum GoalStatus { SCALE_READY = 'Scale Ready', IN_PROGRESS = 'In Progress', AT_RISK = 'At Risk' }
export interface Goal { goalId: string; goalName: string; targetMetricMar2026?: string; currentBaselineOct2024?: string; ownerPersonId?: string; hubId?: string; budgetAllocation?: string; killCriteria?: string; status?: GoalStatus; notes?: string; parentObjectiveId?: string; }

export enum QuarterlyInitiativeStatus { IN_PROGRESS = 'In Progress', WEEK_1_START = 'Week 1 Start', COMPLETED = 'Completed' }
export interface QuarterlyInitiative { initiativeId: string; initiativeName: string; quarter?: string; parentGoalIds?: string; programIds?: string; objective?: string; ownerPersonId?: string; hubId?: string; budget?: string; status?: QuarterlyInitiativeStatus; notes?: string; timelineStart?: string; timelineEnd?: string; }

export enum ResourceAllocationStatus { AUDIT_NEEDED = 'Audit Needed', STABLE = 'Stable' }
export interface ResourceAllocationBudget { budgetCategoryId: string; budgetCategory: string; subCategory?: string; budgetAmountFy26?: string; pctOfTotal?: string; keyAllocations?: string; expectedROI?: string; hubId?: string; ownerPersonId?: string; status?: ResourceAllocationStatus; notes?: string; }

// Competitor Landscape
export interface CompetitorLandscapeItem { tier: string; brand: string; website?: string; instagram?: string; logo?: string; category?: string; secondaryCategory?: string; tags?: string[]; coreStrengths?: string; typicalUse?: string; }
export interface CompetitorAnalysisItem { competitor: string; insight?: string; visualIdentity?: string; positioning?: string; messaging?: string; ux?: string; strategicNote?: string; homePageUX?: string; customizerInterface?: string; productPageUX?: string; catalogAndTemplateSystem?: string; }
export interface CompetitorPositioning { brand: string; positioningStatement?: string; owns?: string; triesToOwn?: string; shouldNotOwn?: string; primaryAudience?: string; pricePosition?: string; customisationDepth?: string; tone?: string; personality?: string; brandArchetype?: string; }
export interface CompetitorNote { date: string; brand: string; note: string; addedBy: string; tag: string; }
export interface CompetitorCapability { brand: string; brandPower?: string; customizerUX?: string; catalogDepth?: string; speed?: string; pricingPower?: string; integrations?: string; sustainability?: string; b2bReadiness?: string; d2cFriendliness?: string; techMaturity?: string; }
export interface CompetitorUXProduct { brand: string; homepageUX?: string; customizerUX?: string; productPageUX?: string; catalogSystem?: string; templateSystem?: string; navigationClarity?: string; onboardingFlow?: string; checkoutExperience?: string; }
export interface CompetitorLandscapeContextType { competitors: CompetitorLandscapeItem[]; analysis: CompetitorAnalysisItem[]; positioning: CompetitorPositioning[]; notes: CompetitorNote[]; capabilities: CompetitorCapability[]; uxProduct: CompetitorUXProduct[]; loading: boolean; error: string | null; loadCompetitors: (force?: boolean) => Promise<void>; sheetId: string; setSheetId: (id: string) => void; initialLoadComplete: boolean; }

// PPC Types
export enum MaterialCostBasis { SHEET = 'Sheet', PIECE = 'Piece' }
export enum PrintMethodType { DIGITAL = 'Digital', SCREEN = 'Screen', EMBROIDERY = 'Embroidery', UV = 'UV', LASER = 'Laser' }
export interface PPCMaterial { material_key: string; rate_per_sqft: string; }
export interface PPCPrintMethod { method_key: string; method_name: string; }
export interface PPCPrintFormat { format_key: string; width_mm: string; height_mm: string; bleed_mm: string; allow_rotation: string; active: string; }
export interface PPCPrintRate { method_key: string; format_key: string; rate_per_sheet: string; active: string; }
export interface PPCAttachment { attach_key: string; unit_cost: string; }
export interface PPCPackaging { pack_key: string; unit_cost: string; moq: string; MOQ?: string; Moq?: string; }
export interface PPCRule { rule_type: string; param1: string; param2: string; value: string; message: string; active: string; }
export interface PPCCost { key: string; value: string; }
export interface PPCPricing { module: string; tier: string; min_qty: string; max_qty: string; margin_pct: string; price_floor_per_piece: string; active?: string; }
export interface PPCDiagnostics { tableName: string; loaded: boolean; rows: number; sampleColumns: string[]; }
export interface PPCCalculationResult { materialCostPerPiece_raw: number; printCostPerPiece_raw: number; attach_raw: number; packPerPiece_raw: number; labor_raw: number; costPerPiece_internal: number; pricePerPiece_display: number; totalOrder_display: number; utilization: number; sheetsRequired: number; pps: number; materialUsed: number; materialWastage: number; chosenMethod: string; mixNote: string; moqNote: string; tierName: string; tierMargin: number; pricePerPiece_retail: number | null; totalPrice_retail: number | null; tierRetail: string; marginRetail: number; pricePerPiece_pod: number | null; totalPrice_pod: number | null; tierPod: string; marginPod: number; pricePerPiece_b2b: number | null; totalPrice_b2b: number | null; tierB2B: string; marginB2B: number; }

// AI Tool Types
export interface AIToolsContextType { customerPsychology: CustomerPsychologyOutput | null; contentStrategy: ContentStrategyOutput | null; campaignIdeas: CampaignIdea[] | null; blogPost: BlogPostOutput | null; loadingTextAI: boolean; textAIError: string | null; generateCustomerPsychology: (brand: BrandProfile, goal: string) => Promise<void>; generateContentStrategy: (brief: string, audience: string) => Promise<void>; generateCampaignIdeas: (prod: string) => Promise<CampaignIdea[] | undefined>; generateBlogPost: (topic: string) => Promise<void>; clearTextAIResults: () => void; generatedImages: GeneratedImage[]; generatingImage: boolean; imageAIError: string | null; generateImage: (prompt: string, aspect?: string) => Promise<void>; editImage: (src: string, mime: string, prompt: string) => Promise<void>; clearImageResults: () => void; generatedVideos: GeneratedVideo[]; generatingVideo: boolean; videoAIError: string | null; generateVideo: (prompt: string, img?: File, res?: string, aspect?: string) => Promise<void>; hasVeoApiKey: boolean; requestVeoApiKeySelection: () => Promise<boolean>; veoApiKeyPromptOpen: boolean; setVeoApiKeyPromptOpen: (open: boolean) => void; clearVideoResults: () => void; }

export interface OrderEditFormProps { order: OrderSummaryItem; onSave: (order: Partial<OrderSummaryItem>, lines: Partial<OrderItem>[]) => Promise<void>; onCancel: () => void; }

export interface BMCSheetConfigItem<T = any> { 
  spreadsheetId?: string; 
  sectionKey: string | keyof BusinessModelCanvasData; 
  sheetName: string; 
  gid: string; 
  headerRow: number; 
  fieldToHeaderMap?: Partial<Record<keyof T, string>>; 
  transform?: (key: keyof T, value: string) => any; 
  isSimpleList?: boolean; 
  isKeyValue?: boolean; 
  type?: string; 
  enumBindings?: Record<string, string>; 
  required?: string[];
  numeric?: string[];
}

export interface ChatMessage { role: 'user' | 'model' | 'function'; parts: any[]; error?: string; }

export interface BrandProfile { id: string; name: string; voice?: string; mission?: string; targetAudience?: string; keyMessages?: string; notes?: string; }

// FIX: Defined BrandContextType
export interface BrandContextType {
  brands: BrandProfile[];
  loading: boolean;
  error: string | null;
  loadBrands: (force?: boolean) => Promise<void>;
  addBrand: (newBrand: Partial<BrandProfile>) => Promise<void>;
  updateBrand: (updatedBrand: BrandProfile) => Promise<void>;
  deleteBrand: (id: string) => Promise<void>;
}

export interface Competitor { id: string; name: string; website?: string; twitter?: string; linkedin?: string; notes?: string; }

// FIX: Defined CompetitorContextType
export interface CompetitorContextType {
  competitors: Competitor[];
  loading: boolean;
  error: string | null;
  loadCompetitors: (force?: boolean) => Promise<void>;
  addCompetitor: (newCompetitor: Partial<Competitor>) => Promise<void>;
  updateCompetitor: (updatedCompetitor: Competitor) => Promise<void>;
  deleteCompetitor: (id: string) => Promise<void>;
  searchSocialMedia: (name: string) => Promise<string | null>;
  isSearchingSocial: boolean;
  socialSearchResult: string | null;
  clearSocialSearchResult: () => void;
  isSavingToDrive: boolean;
  saveCompetitorToDrive: (comp: Competitor, result: string) => Promise<void>;
}

export interface CustomerPsychologyOutput { brandId: string; marketingGoal: string; personaSummary: string; customerJourneyMap: string; behavioralTriggers: string; conversionPsychology: string; rawOutput?: string; }
export interface ContentStrategyOutput { campaignBrief: string; targetAudienceDescription: string; socialPostingIdeas: string[]; editorialCalendarThemes: string[]; multiChannelStrategy: string; coreBrandStorytelling: string; rawOutput?: string; }
export interface CampaignIdea { id: string; name: string; description: string; channels: any[]; productService?: string; rawOutput?: string; }
export enum CampaignChannel { SOCIAL_MEDIA = 'Social Media', EMAIL_MARKETING = 'Email Marketing', PAID_ADS = 'Paid Ads', CONTENT_MARKETING = 'Content Marketing', PR = 'PR', EVENTS = 'Events' }
export interface BlogPostOutput { topic: string; title: string; content: string; metaDescription: string; rawOutput?: string; }
export interface GeneratedImage { id: string; prompt: string; imageUrl: string; mimeType: string; aspectRatio?: string; sourceImageId?: string; rawOutput?: any; }
export interface GeneratedVideo { id: string; prompt: string; videoUrl: string; resolution: '720p' | '1080p'; aspectRatio: '16:9' | '9:16'; sourceImageId?: string; rawOutput?: any; }

export interface PlatformInfo { id: string; name: string; url: string; logoUrl?: string; emoji?: string; description?: string; }
export interface ClaudeProject { id: string; name: string; shareLink: string; contentBrief: string; category: string; tags: string[]; }

export interface PPCManifestItem { table_name: string; gid: string; active: string; }
export interface PPCData { materials: PPCMaterial[]; print_methods: PPCPrintMethod[]; print_formats: PPCPrintFormat[]; print_rates: PPCPrintRate[]; attachments: PPCAttachment[]; packaging: PPCPackaging[]; rules: PPCRule[]; costs: PPCCost[]; pricing: PPCPricing[]; }

export interface LookerStudioReport { id: string; name: string; embedUrl: string; }

// --- ERP Specific Types ---

export enum LeadStatus { NEW = 'New', CONTACTED = 'Contacted', QUALIFIED = 'Qualified', UNQUALIFIED = 'Unqualified', LOST = 'Lost' }
export interface Lead { id: string; name: string; company?: string; email?: string; phone?: string; status: LeadStatus; source?: string; ownerId?: string; ownerName?: string; notes?: string; createdAt: string; }

export enum InvoiceStatus { DRAFT = 'Draft', SENT = 'Sent', PAID = 'Paid', OVERDUE = 'Overdue', CANCELLED = 'Cancelled' }
export interface Invoice { id: string; orderId?: string; customerName: string; amount: number; status: InvoiceStatus; dueDate: string; createdAt: string; }

export enum ExpenseStatus { PENDING = 'Pending', APPROVED = 'Approved', REJECTED = 'Rejected', PAID = 'Paid' }
export interface Expense { id: string; title: string; category: string; vendor: string; amount: number; status: ExpenseStatus; requesterId?: string; requesterName?: string; submittedBy?: string; receiptUrl?: string; createdAt: string; date?: string; description?: string; }

export enum DecisionStatus { PROPOSED = 'Proposed', APPROVED = 'Approved', REJECTED = 'Rejected', IMPLEMENTED = 'Implemented' }
export interface Decision { id: string; title: string; context: string; rationale: string; status: DecisionStatus; ownerId?: string; ownerName?: string; createdAt: string; linkedProjectId?: string; }

export interface StockItem { id: string; name: string; sku: string; currentStock: number; reorderLevel: number; dailySalesRate: number; unit: string; location?: string; }

export interface Supplier { id: string; name: string; leadTimeDays: number; rating: number; activePoCount: number; contactPerson?: string; email?: string; phone?: string; }

export interface WarehouseZone { name: string; bins: string[]; }
export interface Warehouse { id: string; name: string; location: string; zones: WarehouseZone[]; }

export enum CampaignStatus { DRAFT = 'Draft', PLANNED = 'Planned', ACTIVE = 'Active', PAUSED = 'Paused', COMPLETED = 'Completed' }
export interface Campaign { id: string; name: string; status: CampaignStatus; startDate: string; endDate: string; budget: number; spend: number; ownerId?: string; ownerName?: string; }

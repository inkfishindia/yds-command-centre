import {
  BusinessModelCanvasData, Program, Project, Task, Milestone, GmailMessage, GoogleDriveFile, GoogleCalendarEvent,
  ProgramStatus, ProgramPriority, ProgramRiskLevel, ProgramHealthStatus,
  ProjectStatus, ProjectPriority, IsOnTime,
  TaskStatus, TaskPriority,
  MilestoneStatus, CustomerSegmentStatus, PartnerStatus, PartnerRiskLevel, CostType,
  PlatformType, PlatformStatus,
  BrandProfile, Competitor, CustomerPsychologyOutput, ContentStrategyOutput, CampaignIdea, BlogPostOutput, GeneratedImage, GeneratedVideo, CampaignChannel, LookerStudioReport, // NEW
  StrategicInitiative, StrategicInitiativeStatus, // NEW
  StrategicObjective, StrategicObjectiveStatus, StrategicObjectiveCriticalityLevel, // NEW
  DailyReportData,
  Lead, LeadStatus, Invoice, InvoiceStatus, Expense, ExpenseStatus, Decision, DecisionStatus, StockItem, Supplier, Warehouse, Campaign, CampaignStatus,
  Goal, GoalStatus, // NEW
  QuarterlyInitiative, QuarterlyInitiativeStatus, // NEW
  ResourceAllocationBudget, ResourceAllocationStatus, // NEW
  OrderItem, OrderStatus, AcceptanceStatus, PaymentMode, OrderType, ProductWorkflowStatus, BlankQCStatus, ProductStockStatus, QCStatus // NEW: Add ProductWorkflowStatus, ProductStockStatus, QCStatus
} from '../types'

// --- Business Model Canvas & Core Strategy ---
export const mockBmcData: BusinessModelCanvasData = {
  keyPartners: [{ id: 'PART-01', name: 'Cloud Service Provider', status: PartnerStatus.ACTIVE, riskLevel: PartnerRiskLevel.LOW, role: 'Infrastructure hosting' }],
  keyActivities: [{ id: 'ACT-01', name: 'Software Development', category: 'Platform' }],
  valuePropositions: [{ id: 'VP-01', description: 'Streamlined Business Operations via a Unified Dashboard', category: 'Core Promise' }],
  customerRelations: [{ id: 'REL-01', type: 'Self-Service', acquisitionStrategy: 'Content Marketing' }],
  customerSegments: [
    {
      id: 'SEG-01',
      name: 'D2C Lifecycle',
      status: CustomerSegmentStatus.AT_RISK,
      customerProfile: 'Individuals, creators, small teams',
      flywheelId: 'FLW-01',
      nineMonthRevenue: 9662283,
      aov: 1347,
      jobsToBeDone: 'I want to exist physically (New) → I want to reorder proven quality (Repeat)',
      keyPainPoints: 'Printful/Printify (foreign), local printers (minimums), Vistaprint (templates)',
      decisionCriteria: 'Lifecycle Stage 1: First proof (single order, identity test) | Lifecycle Stage 2: Reorder proof (belief reinforcement, 36% convert) | Stage 3: Business conversion (1.5% become B2B)',
      notes: 'PROFIT ENGINE IF FIXED: 30% revenue. CRITICAL DECISION: Raise minimum order ₹12K→₹500 or optimize New→Repeat 36%→60%. CAC validation urgent. Target: ₹1.5cr (+56%) only if economics fixed.',
      customerFacing: 'YDS Direct (self-service)',
      positioning: 'Personal expression made physical - no minimums',
      promiseStatement: 'Your design live in 48 hours, starting at ₹399',
      expression: 'I can finally be expressive and bring out my identity',
      platforms: ['PLT-01', 'PLT-03', 'PLT-04'],
      priorityRank: 'High',
      forStatement: "Creators, gift-givers, event participants, social causes",
      againstStatement: "Printful/Printify (foreign), local printers (minimums), Vistaprint (templates)",
      ageGroup: "18-40",
      companySize: "Individual/1-5 employees",
      psychographic: "Identity-driven, experimental creator, values speed + self-expression",
      purchaseTrigger1: "Creator wants merch",
      purchaseTrigger2: "Personal gift/event needs customization (birthday, anniversary)",
      purchaseTrigger3: "",
      adoptionThreshold: "Design tool must complete (currently 32%), price under ₹1000, delivery under 48hr",
      irreversibilityTrigger: "Second order within 90 days (36% currently, need 60%)",
      oldWorldPain: "Tools too complex (88% abandon design), minimums block testing (₹2000+), slow (7-14 days)",
      newWorldGain: "₹500 minimum enables experimentation, 48hr maintains momentum, tool completes designs",
    },
    {
      id: 'SEG-02',
      name: 'B2B Large Accounts',
      status: CustomerSegmentStatus.VALIDATED,
      customerProfile: 'Large enterprises, event organizers',
      flywheelId: 'FLW-02',
      nineMonthRevenue: 15000000,
      aov: 50000,
      jobsToBeDone: 'Need bulk customized products with account management and fast turnaround',
      keyPainPoints: 'Lack of dedicated support, inconsistent quality, slow delivery for large orders',
      decisionCriteria: 'Account management, quality, price for volume, delivery speed, customization options',
      notes: 'High-value segment, requires sales-led approach. Focus on retention and upsell.',
      customerFacing: 'Dedicated Sales Team',
      positioning: 'Premium, end-to-end customized product solutions for enterprises',
      promiseStatement: 'Dedicated account manager, samples in 24hr, scale to 10K+ units',
      expression: 'We provide seamless, high-quality bulk custom solutions',
      platforms: ['PLT-02', 'PLT-05'],
      priorityRank: 'Medium',
      forStatement: "Large businesses, event managers, corporate clients",
      againstStatement: "Generic suppliers, fragmented service providers",
      ageGroup: "30-60",
      companySize: "50+ employees",
      psychographic: "Efficiency-driven, quality-focused, values partnership",
      purchaseTrigger1: "Large event, corporate gifting, new product launch",
      purchaseTrigger2: "Need for consistent branding across multiple initiatives",
      purchaseTrigger3: "Vendor dissatisfaction",
      adoptionThreshold: "Dedicated account support, 24hr sample, 48hr production SLA",
      irreversibilityTrigger: "Renewal of annual contract or 3+ repeat orders",
      oldWorldPain: "Slow response times, inconsistent quality, lack of support for large orders",
      newWorldGain: "Dedicated support, guaranteed quality, rapid fulfillment for bulk orders",
    }
  ],
  keyResources: [{ id: 'RES-01', name: 'Proprietary Software Platform', type: 'Intellectual' }],
  channels: [{ id: 'CHL-01', name: 'Meta Ads', type: 'Paid', motionType: 'Self-service automated' }],
  revenueStreams: [{ id: 'REV-01', streamName: 'SaaS Subscription', revenueModel: 'Recurring', nineMonthRevenue: 1200000 }],
  costStructure: [{ id: 'COST-01', category: 'Operating', costName: 'Cloud Hosting Fees', type: CostType.VARIABLE, monthlyAmount: 15000 }],
  businessUnits: [
    {
      id: 'BU-01',
      name: 'Product Sales',
      coreOffering: 'Product + Customisation + design tool + Customer support',
      primarySegments: 'SEG-01',
      flywheelId: 'FLW-01',
      volumeRange: '1-100',
      primaryOwner: 'Danish Hanif',
      nineMonthRevenue: 9662283,
      percentRevenue: '31.96%',
      pricingModel: 'Per-order markup + volume tiers',
      notes: '',
      buType: 'D2C',
      salesMotion: 'Self-service automated',
      supportModel: 'ReActive chat',
      monthlyCapacityOrders: 1076,
      productionSlaHours: 48,
    },
    {
      id: 'BU-02',
      name: 'Customisation',
      coreOffering: 'Product Customisation + Service',
      primarySegments: 'SEG-02',
      flywheelId: 'FLW-02',
      volumeRange: '100-5000',
      primaryOwner: 'Chandan',
      nineMonthRevenue: 15000000,
      percentRevenue: '50%',
      pricingModel: 'Custom Quote',
      notes: '',
      buType: 'B2B',
      salesMotion: 'Sales-Assisted',
      supportModel: 'Proactive Account Mgmt',
      monthlyCapacityOrders: 500,
      productionSlaHours: 72,
    }
  ],
  flywheels: [
    {
      id: 'FLW-01',
      name: 'Self-Service Digital',
      customerStruggleSolved: 'Need custom products fast without talking to sales',
      acquisitionModel: 'Ad → Landing',
      serviceModel: 'Design Tool → Preview → Cart → Checkout → Production → Ship → Share',
      servesSegments: 'SEG-01, SEG-02',
      keyMetrics: 'CAC, Cart abandonment (96%), Tool completion rate, Reorder rate, Viral coefficient',
      jtbdTriggerMoment: 'Inspiration strikes → Need physical product now',
      motionSequence: 'Ad → Landing → Design Tool → Preview → Cart → Checkout → Production → Ship → Share',
      primaryBottleneck: 'Design tool abandonment + CAC profitability',
    },
    {
      id: 'FLW-02',
      name: 'Sales-Assisted B2B',
      customerStruggleSolved: 'Need bulk custom merchandise but overwhelmed by options',
      acquisitionModel: 'Corporate event/gifting need identified',
      serviceModel: 'Inquiry → Sales Call → Sample → Quote → Approval → Production → Delivery → Expand',
      servesSegments: 'SEG-02',
      keyMetrics: 'Sales conversion rate, Quote acceptance, Repeat business rate, Customer lifetime value',
      jtbdTriggerMoment: 'Corporate event/gifting need identified',
      motionSequence: 'Inquiry → Sales Call → Sample → Quote → Approval → Production → Delivery → Expand',
      primaryBottleneck: 'Sales cycle length + sample production time',
    }
  ],
  platforms: [
    { id: 'PLT-01', name: 'Website (YDS Direct)', type: PlatformType.WEB_APP, purpose: 'Next.js, Postgres', ownerHub: 'HUB-01', status: PlatformStatus.VALIDATED },
    { id: 'PLT-02', name: 'Partner Portal', type: PlatformType.WEB_APP, purpose: 'React, Node.js', ownerHub: 'HUB-01', status: PlatformStatus.BUILDING },
  ],
  team: [
    { id: 'PER-01', fullName: 'Vivek George', role: 'Founder', primaryHub: 'HUB-05', primaryHubName: 'Leadership', keyResponsibility: 'Overall strategy and execution', notes: '' },
    { id: 'PER-02', fullName: 'Madhu Krishna', role: 'Sales Specialist', primaryHub: 'HUB-04', primaryHubName: 'Sales & Business Dev', keyResponsibility: 'Develop and manage sales channels', notes: '' },
    { id: 'PER-04', fullName: 'Danish Hanif', role: 'Brand & Creative Director', primaryHub: 'HUB-02', primaryHubName: 'Marketing & Growth', keyResponsibility: 'Drive brand vision and creative strategy', notes: '' },
    { id: 'PER-05', fullName: 'Nirmal', role: 'Tech Head', primaryHub: 'HUB-01', primaryHubName: 'Digital Platform', keyResponsibility: 'Lead platform development', notes: '' },
    { id: 'PER-06', fullName: 'Surath', role: 'Operations Head', primaryHub: 'HUB-03', primaryHubName: 'Production & Fulfillment', keyResponsibility: 'Oversee production and fulfillment', notes: '' },
    { id: 'PER-07', fullName: 'Sunil', role: 'Production', primaryHub: 'HUB-03', primaryHubName: 'Production & Fulfillment', keyResponsibility: 'Manage printing operations', notes: '' },
    { id: 'PER-08', fullName: 'Bimal', role: 'Production QC', primaryHub: 'HUB-03', primaryHubName: 'Production & Fulfillment', keyResponsibility: 'Manage quality control', notes: '' },
    { id: 'PER-09', fullName: 'Niveditha', role: 'Partner Success Lead', primaryHub: 'HUB-01', primaryHubName: 'Digital Platform', keyResponsibility: 'Manage partner relationships', notes: '' },
    { id: 'PER-10', fullName: 'Priya Sharma', role: 'Finishing Operator', primaryHub: 'HUB-03', primaryHubName: 'Production & Fulfillment', keyResponsibility: 'Quality check and final packaging', notes: '' },
  ],
  hubs: [
    { id: 'HUB-01', name: 'Digital Platform', type: 'Technology', headCount: 4, primaryOwner: 'Nirmal', keyActivities: 'Website, Design Tools, Partner Portal, Analytics, Payment', notes: 'CAPACITY_CRISIS' },
    { id: 'HUB-02', name: 'Marketing & Growth', type: 'Marketing', headCount: 3, primaryOwner: 'Danish Hanif', keyActivities: 'Brand Strategy, Campaigns, SEO, Content Creation', notes: '' },
    { id: 'HUB-03', name: 'Production & Fulfillment', type: 'Operations', headCount: 10, primaryOwner: 'Surath', keyActivities: 'Manufacturing, Quality Control, Packaging, Shipping', notes: '' },
    { id: 'HUB-04', name: 'Sales & Business Dev', type: 'Sales', headCount: 2, primaryOwner: 'Arun Nair', keyActivities: 'Lead Generation, Opportunity Management, Client Relations', notes: '' },
    { id: 'HUB-05', name: 'Leadership', type: 'Management', headCount: 1, primaryOwner: 'Vivek George', keyActivities: 'Strategy, Finance, HR', notes: '' },
  ],
  metrics: [],
  gapsActions: [],
  strategy: {
    id: 'STRATEGY-GLOBAL',
    vision: 'Everyone can make their imagined identity physically real',
    mission: 'Remove ALL friction between imagination and physical proof',
    messagingTone: 'Playful, experimental, identity-affirming',
    brandPosition: 'Physical proof your ideas exist (starting ₹500)',
    competitiveAlt1: 'Printful (slow, Western)',
    'competitiveAlt2': 'Etsy (saturated, not manufacturing)',
    'competitiveAlt3': 'Local printers (minimums, professional barrier)',
    differentiatedValue: 'No minimums (₹500 start) + 48hr India delivery + Identity-first design tool',
    marketCategory: 'Personal Expression Manufacturing',
    designPov: 'Identity manifestation through physical objects, reordering = self-belief reinforcement',
    categoryEntryPoints: 'Creator merch moment | Gift personalization | Small business launch | Event merchandise | Anniversary/celebration | Identity experimentation',
    buyingSituations: 'Lifecycle Stage 1: First proof (single order, identity test) | Lifecycle Stage 2: Reorder proof (belief reinforcement, 36% convert) | Stage 3: Business conversion (1.5% become B2B)',
    distinctiveAssets: '48-hour promise | Unboxing shareable moment | Design tool signature | ₹500 minimum (vs competitors) | India-speed positioning',
    claudePanelLink: 'https://claude.ai/project/0199ed77-b725-7582-ad24-0fea694c4676',
    currentSolutionEfficiency: 'N/A',
    ourSolutionEfficiency: 'N/A',
    deltaScore: 'N/A',
  },
}

// --- Dashboard & Metrics ---
export const mockDailyReportData: DailyReportData[] = [
  {
    date: new Date(),
    registrations: 45,
    ordersNewRegistrants: 12,
    ordersReceived: 28,
    ordersWithDiscount: 5,
    codOrders: 8,
    businessOrders: 4,
    abandonedCartsGuests: 156,
    abandonedCartsUsers: 42,
    totalOrderValue: 145600,
    partnerProductsValue: 25000,
    businessProductsValue: 45000,
    codOrderValue: 32000,
    deliveryCharges: 1200,
    manualOrderValue: 15000,
    dsOrderValue: 8000,
    b2cOrderValue: 52600,
    conversionRate: 12.5,
    aov: 5200,
  },
  {
    date: new Date(Date.now() - 86400000),
    registrations: 38,
    ordersNewRegistrants: 10,
    ordersReceived: 24,
    ordersWithDiscount: 4,
    codOrders: 7,
    businessOrders: 3,
    abandonedCartsGuests: 142,
    abandonedCartsUsers: 38,
    totalOrderValue: 128000,
    partnerProductsValue: 22000,
    businessProductsValue: 40000,
    codOrderValue: 28000,
    deliveryCharges: 1100,
    manualOrderValue: 12000,
    dsOrderValue: 7000,
    b2cOrderValue: 47000,
    conversionRate: 11.8,
    aov: 5333,
  },
  {
    date: new Date(Date.now() - 86400000 * 2),
    registrations: 42,
    ordersNewRegistrants: 11,
    ordersReceived: 26,
    ordersWithDiscount: 6,
    codOrders: 9,
    businessOrders: 5,
    abandonedCartsGuests: 160,
    abandonedCartsUsers: 45,
    totalOrderValue: 135000,
    partnerProductsValue: 24000,
    businessProductsValue: 42000,
    codOrderValue: 30000,
    deliveryCharges: 1150,
    manualOrderValue: 14000,
    dsOrderValue: 7500,
    b2cOrderValue: 49500,
    conversionRate: 12.1,
    aov: 5192,
  },
  {
    date: new Date(Date.now() - 86400000 * 3),
    registrations: 35,
    ordersNewRegistrants: 8,
    ordersReceived: 22,
    ordersWithDiscount: 3,
    codOrders: 6,
    businessOrders: 2,
    abandonedCartsGuests: 130,
    abandonedCartsUsers: 35,
    totalOrderValue: 115000,
    partnerProductsValue: 20000,
    businessProductsValue: 35000,
    codOrderValue: 25000,
    deliveryCharges: 1000,
    manualOrderValue: 10000,
    dsOrderValue: 6000,
    b2cOrderValue: 44000,
    conversionRate: 11.5,
    aov: 5227,
  },
  {
    date: new Date(Date.now() - 86400000 * 4),
    registrations: 40,
    ordersNewRegistrants: 9,
    ordersReceived: 25,
    ordersWithDiscount: 5,
    codOrders: 8,
    businessOrders: 4,
    abandonedCartsGuests: 150,
    abandonedCartsUsers: 40,
    totalOrderValue: 130000,
    partnerProductsValue: 23000,
    businessProductsValue: 41000,
    codOrderValue: 29000,
    deliveryCharges: 1120,
    manualOrderValue: 13000,
    dsOrderValue: 7200,
    b2cOrderValue: 46800,
    conversionRate: 12.0,
    aov: 5200,
  },
  {
    date: new Date(Date.now() - 86400000 * 5),
    registrations: 37,
    ordersNewRegistrants: 8,
    ordersReceived: 23,
    ordersWithDiscount: 4,
    codOrders: 7,
    businessOrders: 3,
    abandonedCartsGuests: 138,
    abandonedCartsUsers: 36,
    totalOrderValue: 120000,
    partnerProductsValue: 21000,
    businessProductsValue: 38000,
    codOrderValue: 27000,
    deliveryCharges: 1050,
    manualOrderValue: 11000,
    dsOrderValue: 6500,
    b2cOrderValue: 44500,
    conversionRate: 11.7,
    aov: 5217,
  },
  {
    date: new Date(Date.now() - 86400000 * 6),
    registrations: 44,
    ordersNewRegistrants: 13,
    ordersReceived: 30,
    ordersWithDiscount: 7,
    codOrders: 10,
    businessOrders: 6,
    abandonedCartsGuests: 165,
    abandonedCartsUsers: 48,
    totalOrderValue: 155000,
    partnerProductsValue: 27000,
    businessProductsValue: 48000,
    codOrderValue: 35000,
    deliveryCharges: 1300,
    manualOrderValue: 16000,
    dsOrderValue: 9000,
    b2cOrderValue: 55000,
    conversionRate: 12.8,
    aov: 5167,
  }
];

// --- Portfolio Management ---
export const mockStrategicInitiatives: StrategicInitiative[] = [
  {
    strategicInitiativeId: 'STRAT-01',
    strategicInitiativeName: 'Platform-First Transformation',
    timelineStart: '2025-01-01',
    timelineEnd: '2026-12-31',
    targetOutcome: 'Platform revenue = 60% of total by FY28, 5000+ active partners',
    objectiveIds: 'OBJ-01|OBJ-03',
    ownerPersonId: 'PER-01', // Vivek George
    status: StrategicInitiativeStatus.ACTIVE,
  },
  {
    strategicInitiativeId: 'STRAT-02',
    strategicInitiativeName: 'Global Market Penetration',
    timelineStart: '2026-01-01',
    timelineEnd: '2028-12-31',
    targetOutcome: 'Expand to 3 new countries, 10% international revenue',
    objectiveIds: 'OBJ-02|OBJ-04',
    ownerPersonId: 'PER-02', // Madhu Krishna
    status: StrategicInitiativeStatus.ON_HOLD,
  },
];

export const mockStrategicObjectives: StrategicObjective[] = [
  {
    objectiveId: 'OBJ-01',
    objectiveName: "Become India's Infrastructure for Custom Manufacturing",
    parentStrategicInitiativeId: 'STRAT-01',
    ownerPersonId: 'PER-04', // Danish Hanif
    ownerHubId: 'HUB-02', // Marketing & Growth
    status: StrategicObjectiveStatus.SCALE_READY,
    criticalityLevel: StrategicObjectiveCriticalityLevel.CRITICAL,
    notes: "STRATEGIC SHIFT: From \"we manufacture\" to \"we enable manufacturing.\"",
  },
  {
    objectiveId: 'OBJ-02',
    objectiveName: 'Establish European Beachhead',
    parentStrategicInitiativeId: 'STRAT-02',
    ownerPersonId: 'PER-02', // Madhu Krishna
    ownerHubId: 'HUB-04', // Sales & Business Dev
    status: StrategicObjectiveStatus.ON_HOLD,
    criticalityLevel: StrategicObjectiveCriticalityLevel.HIGH,
  },
  {
    objectiveId: 'OBJ-03',
    objectiveName: "Achieve Operational Excellence",
    parentStrategicInitiativeId: 'STRAT-01',
    ownerPersonId: 'PER-06', // Surath
    ownerHubId: 'HUB-03', // Production & Fulfillment
    status: StrategicObjectiveStatus.IN_PROGRESS,
    criticalityLevel: StrategicObjectiveCriticalityLevel.HIGH,
  },
];

export const mockGoals: Goal[] = [
  {
    goalId: 'G-1.1',
    goalName: "Scale Partner Network to 1,000 Active Partners",
    parentObjectiveId: 'OBJ-01',
    ownerPersonId: 'PER-09', // Niveditha
    hubId: 'HUB-01', // Digital Platform
    status: GoalStatus.SCALE_READY,
    notes: "First sale activation = CRITICAL BOTTLENECK (33% vs 60% target).",
  },
  {
    goalId: 'G-3.1',
    goalName: "Reduce Production Errors by 50%",
    parentObjectiveId: 'OBJ-03',
    ownerPersonId: 'PER-08', // Bimal
    hubId: 'HUB-03', // Production & Fulfillment
    status: GoalStatus.IN_PROGRESS,
  }
];

export const mockQuarterlyInitiatives: QuarterlyInitiative[] = [
  {
    initiativeId: 'Q1-I1',
    quarter: 'Q1 FY26 (Apr-Jun 25)',
    initiativeName: 'Launch Shopify App for Partners',
    parentGoalIds: 'G-1.1',
    programIds: 'PROG-01',
    ownerPersonId: 'PER-05', // Nirmal
    hubId: 'HUB-01', // Digital Platform
    status: QuarterlyInitiativeStatus.IN_PROGRESS,
    notes: 'Shopify App is key to unlocking partner growth.',
  },
  {
    initiativeId: 'Q1-I2',
    initiativeName: 'Implement Automated QC System',
    quarter: 'Q1 FY26 (Apr-Jun 25)',
    parentGoalIds: 'G-3.1',
    programIds: 'PROG-02',
    ownerPersonId: 'PER-05', // Nirmal
    hubId: 'HUB-01', // Digital Platform
    status: QuarterlyInitiativeStatus.WEEK_1_START,
  },
];

export const mockResourceAllocationBudgets: ResourceAllocationBudget[] = [
  {
    budgetCategoryId: 'BUD-01',
    budgetCategory: 'People (Salaries + Hires)',
    subCategory: 'Existing Team',
    budgetAmountFy26: '₹1,50,00,000',
    ownerPersonId: 'PER-01',
    status: ResourceAllocationStatus.AUDIT_NEEDED,
  },
];

export const mockPrograms: Program[] = [
  {
    programId: 'PROG-01',
    programName: 'Shopify App Launch',
    initiativeId: 'Q1-I1',
    status: ProgramStatus.IN_PROGRESS,
    priority: ProgramPriority.CRITICAL,
    healthStatus: ProgramHealthStatus.ON_TRACK,
    ownerPersonId: 'PER-05',
    ownerHubId: 'HUB-01',
    projectsCount: 2,
    tasksTotal: 15,
    budgetTotal: 500000,
    budgetSpent: 325000,
    timelineProgressPct: 65,
    metricProgressPct: 50,
    nextMilestone: 'Finalize Marketing Assets',
  },
  {
    programId: 'PROG-02',
    programName: 'Automated QC System',
    initiativeId: 'Q1-I2',
    status: ProgramStatus.IN_PROGRESS,
    priority: ProgramPriority.HIGH,
    healthStatus: ProgramHealthStatus.AT_RISK,
    ownerPersonId: 'PER-05',
    ownerHubId: 'HUB-01',
    projectsCount: 1,
    tasksTotal: 25,
    budgetTotal: 800000,
    budgetSpent: 200000,
    timelineProgressPct: 25,
    metricProgressPct: 10,
    nextMilestone: 'Hardware procurement',
    blockers: 'Vendor negotiation delayed.',
  },
]

export const mockProjects: Project[] = [
  { projectId: 'PRJ-101', projectName: 'Shopify App Core Feature Dev', programId: 'PROG-01', status: ProjectStatus.IN_PROGRESS, priority: ProjectPriority.HIGH, ownerName: 'Nirmal', ownerId: 'PER-05', hubId: 'HUB-01', healthScore: 92, completionPct: 70 },
  { projectId: 'PRJ-102', projectName: 'Shopify App Marketing', programId: 'PROG-01', status: ProjectStatus.IN_PROGRESS, priority: ProjectPriority.HIGH, ownerName: 'Danish Hanif', ownerId: 'PER-04', hubId: 'HUB-02', healthScore: 85, completionPct: 55 },
  { projectId: 'PRJ-201', projectName: 'QC Camera System Integration', programId: 'PROG-02', status: ProjectStatus.BLOCKED, priority: ProjectPriority.CRITICAL, ownerName: 'Nirmal', ownerId: 'PER-05', hubId: 'HUB-01', healthScore: 40, completionPct: 30 },
]

export const mockTasks: Task[] = [
  { taskId: 'TSK-1101', taskName: 'Develop User Authentication', projectId: 'PRJ-101', status: TaskStatus.COMPLETED, priority: TaskPriority.HIGH, ownerName: 'Nirmal', ownerId: 'PER-05', hubId: 'HUB-01' },
  { taskId: 'TSK-1102', taskName: 'Design Dashboard UI', projectId: 'PRJ-101', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, ownerName: 'Danish Hanif', ownerId: 'PER-04', hubId: 'HUB-02' },
  { taskId: 'TSK-1103', taskName: 'API Integration for Payments', projectId: 'PRJ-101', status: TaskStatus.BLOCKED, priority: TaskPriority.HIGH, ownerName: 'Nirmal', ownerId: 'PER-05', hubId: 'HUB-01' },
  { taskId: 'TSK-1201', taskName: 'Draft Ad Copy', projectId: 'PRJ-102', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM, ownerName: 'Danish Hanif', ownerId: 'PER-04', hubId: 'HUB-02' },
  { taskId: 'TSK-2101', taskName: 'Procure Cloud Servers', projectId: 'PRJ-201', status: TaskStatus.BLOCKED, priority: TaskPriority.HIGH, ownerName: 'Nirmal', ownerId: 'PER-05', hubId: 'HUB-01' },
]

export const mockMilestones: Milestone[] = [
  { milestoneId: 'M-101-A', milestoneName: 'Alpha Version Release', projectId: 'PRJ-101', status: MilestoneStatus.IN_PROGRESS, ownerName: 'Nirmal', ownerId: 'PER-05', targetDate: '2024-09-15', completionPct: '60%' },
  { milestoneId: 'M-101-B', milestoneName: 'Beta Version Release', projectId: 'PRJ-101', status: MilestoneStatus.NOT_STARTED, ownerName: 'Nirmal', ownerId: 'PER-05', targetDate: '2024-10-20', completionPct: '0%' },
  { milestoneId: 'M-102-A', milestoneName: 'Campaign Creatives Finalized', projectId: 'PRJ-102', status: MilestoneStatus.COMPLETED, ownerName: 'Danish Hanif', ownerId: 'PER-04', targetDate: '2024-08-30', completionPct: '100%' },
]

// --- Order Management ---
const generateOrderItem = (
  baseId: string,
  orderNumber: string,
  date: string,
  time: string,
  customerName: string,
  customerEmail: string,
  customerPhone: string,
  orderType: OrderType,
  salesChannel: string,
  acceptanceStatus: AcceptanceStatus,
  paymentMode: PaymentMode,
  productName: string,
  variant: string,
  quantity: number,
  unitPrice: number,
  productStatus: ProductWorkflowStatus,
  additionalFields?: Partial<OrderItem>
): OrderItem => ({
  id: `${baseId}-P${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
  orderNumber: orderNumber,
  date: date,
  time: time,
  gstin: '29ABCDE1234F1Z5', // Default GSTIN
  customerName: customerName,
  email: customerEmail, // Pass through
  phone: customerPhone, // Pass through
  partnerOrderNumber: orderType === OrderType.PARTNER ? `PARTNERX-${Math.random().toString(36).substr(2, 5).toUpperCase()}` : undefined,
  orderType: orderType,
  orderMadeBy: salesChannel === 'Website' ? 'Customer' : 'Sales Agent',
  salesChannel: salesChannel,
  // Shipping Address defaults
  shippingName: customerName,
  shippingPhone: customerPhone,
  shippingAddress: '123 Main St, Apt 4B',
  shippingCity: 'Bengaluru',
  shippingState: 'Karnataka',
  shippingCountry: 'India',
  shippingPincode: '560001',
  // Billing Address defaults (same as shipping)
  billingName: customerName,
  billingPhone: customerPhone,
  billingAddress: '123 Main St, Apt 4B',
  billingCity: 'Bengaluru',
  billingState: 'Karnataka',
  billingCountry: 'India',
  billingPincode: '560001',
  totalNoOfProducts: 1, // Will be aggregated for summary
  totalQuantityOfAllProducts: quantity, // Will be aggregated for summary
  totalAmountWithTax: quantity * unitPrice * 1.18, // 18% tax
  status: OrderStatus.PROCESSING, // Default order status, can be overridden by additionalFields
  acceptanceStatus: acceptanceStatus,
  paymentMode: paymentMode,
  shippingType: 'Standard',
  shippingCost: 70,
  product: productName,
  variant: variant,
  quantity: quantity,
  line_item_id: `LINE-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
  sku: `SKU-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
  unit_price: unitPrice,
  line_total: quantity * unitPrice,
  blank_article_sku: `BLANK-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
  product_supplier: 'Internal',
  product_stock_status: ProductStockStatus.IN_STOCK,
  productStockCount: 100,
  blankStockAvailable: 500, // NEW
  print_technology: 'DTG', // Default, can be overridden
  print_location: 'Front',
  print_size: 'A4',
  print_color_count: 4,
  design_file_url: 'https://example.com/designs/generic_design.png',
  design_file_format: 'image/png',
  design_thumbnail_url: 'https://example.com/designs/generic_design_thumb.png',
  mockup_url: 'https://example.com/mockups/generic_mockup.png',
  productStatus: productStatus, // Passed in, key for kanban
  batchId: undefined, // Default for new, will be generated
  production_station: 'DTG-01', // Default, can be overridden
  assigned_to: undefined, // Default, will be assigned
  print_started_at: undefined,
  print_completed_at: undefined,
  production_time_seconds: undefined,
  finishingStatus: undefined, // NEW
  finishing_by: undefined, // NEW
  finishing_completed_at: undefined, // NEW
  qc_status: QCStatus.PENDING,
  qc_notes: undefined,
  qc_checked_by: undefined,
  qc_checked_at: undefined,
  qc_fail_reason: undefined,
  qc_images_url: undefined,
  reprint_required: false,
  reprint_count: 0,
  whitelabelRequired: false, // NEW
  whitelabelType: undefined, // NEW
  packingBy: undefined, // NEW
  packedAt: undefined, // NEW
  customerSpecialRequest: undefined, // NEW
  internal_notes: undefined,
  special_instructions: undefined,
  weight_grams: 200,
  is_rush_order: false,
  production_cost: unitPrice * 0.4,
  customerPaidPrice: unitPrice * 1.18, // NEW
  sale_price: unitPrice,
  margin: ((unitPrice - (unitPrice * 0.4)) / unitPrice) * 100,
  orderSourceUrl: 'https://www.yourdesignstore.in/order/details/ORD-XYZ', // NEW
  expectedShipDate: undefined, // NEW
  trackingNumber: undefined, // NEW
  carrier: undefined, // NEW
  shippedAt: undefined, // NEW
  // NEW fields for Pick List Kanban and Production Screen
  stock_location: `A${Math.ceil(Math.random() * 5)}-R${Math.ceil(Math.random() * 5)}-S${Math.ceil(Math.random() * 5)}`,
  picker_name: undefined,
  picked_at: undefined,
  blank_qc_status: BlankQCStatus.PENDING,
  blank_qc_by: undefined,
  blank_qc_at: undefined,
  ...additionalFields // Override any default fields
});

// Helper to get today's date and time
const getToday = (offsetDays: number = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return {
    date: d.toISOString().split('T')[0],
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
  };
};

export const mockOrderItems: OrderItem[] = [
  // --- Order 1: Fully Processed (DELIVERED) - Multi-item order ---
  generateOrderItem(
    'ORD-20251101-001', 'YD-20251101-001', getToday(-5).date, getToday(-5).time,
    'John Doe', 'john.doe@example.com', '9876543210', OrderType.B2C, 'Website',
    AcceptanceStatus.ACCEPTED, PaymentMode.PREPAID,
    'Classic T-Shirt', 'M - Blue', 2, 499, ProductWorkflowStatus.SHIPPED, // Changed to SHIPPED to reflect final status
    {
      status: OrderStatus.SHIPPED, // Changed to SHIPPED
      assigned_to: 'Sunil', print_started_at: getToday(-4).date, print_completed_at: getToday(-4).date,
      production_time_seconds: 300, finishingStatus: 'Completed', finishing_by: 'Priya Sharma', finishing_completed_at: getToday(-3).date, // NEW
      qc_status: QCStatus.PASSED, qc_checked_by: 'Bimal', qc_checked_at: getToday(-3).date,
      packingBy: 'Priya Sharma', packedAt: getToday(-2).date, // NEW
      expectedShipDate: getToday(-2).date, trackingNumber: 'TRK12345', carrier: 'BlueDart', shippedAt: getToday(-2).date, // NEW
      picker_name: 'David', picked_at: getToday(-4).date, blank_qc_status: BlankQCStatus.PASSED, blank_qc_by: 'QC1', blank_qc_at: getToday(-4).date,
      batchId: 'BATCH-001-DTG',
      design_thumbnail_url: 'https://via.placeholder.com/150x150?text=Tshirt+Blue',
    }
  ),
  generateOrderItem(
    'ORD-20251101-001', 'YD-20251101-001', getToday(-5).date, getToday(-5).time,
    'John Doe', 'john.doe@example.com', '9876543210', OrderType.B2C, 'Website',
    AcceptanceStatus.ACCEPTED, PaymentMode.PREPAID,
    'Custom Mug', 'White - 11oz', 1, 299, ProductWorkflowStatus.DELIVERED,
    {
      status: OrderStatus.DELIVERED,
      print_technology: 'UV', production_station: 'UV-01', assigned_to: 'Sunil', print_started_at: getToday(-4).date, print_completed_at: getToday(-4).date,
      production_time_seconds: 120, finishingStatus: 'Completed', finishing_by: 'Priya Sharma', finishing_completed_at: getToday(-3).date, // NEW
      qc_status: QCStatus.PASSED, qc_checked_by: 'Bimal', qc_checked_at: getToday(-3).date,
      packingBy: 'Priya Sharma', packedAt: getToday(-2).date, // NEW
      expectedShipDate: getToday(-2).date, trackingNumber: 'TRK12345', carrier: 'BlueDart', shippedAt: getToday(-2).date, // NEW
      picker_name: 'David', picked_at: getToday(-4).date, blank_qc_status: BlankQCStatus.PASSED, blank_qc_by: 'QC1', blank_qc_at: getToday(-4).date,
      batchId: 'BATCH-001-UV',
      design_thumbnail_url: 'https://via.placeholder.com/150x150?text=Mug+White',
    }
  ),

  // --- Order 2: QUEUED_FOR_PICK (was DESIGN_PENDING) ---
  generateOrderItem(
    'ORD-20251102-002', 'YD-20251102-002', getToday(-2).date, getToday(-2).time,
    'Jane Smith', 'jane.smith@example.com', '9876543211', OrderType.B2C, 'Instagram',
    AcceptanceStatus.ACCEPTED, PaymentMode.COD,
    'Personalized Hoodie', 'L - Black', 1, 899, ProductWorkflowStatus.QUEUED_FOR_PICK, // Changed to QUEUED_FOR_PICK
    {
      design_file_url: undefined, design_thumbnail_url: undefined, print_technology: undefined, print_size: undefined,
      stock_location: 'N/A', // Not yet picked
      design_file_format: undefined,
    }
  ),

  // --- Order 3: QUEUED_FOR_PICK (was FILE_UPLOADED) ---
  generateOrderItem(
    'ORD-20251103-003', 'YD-20251103-003', getToday(-1).date, getToday(-1).time,
    'Bob Johnson', 'bob.j@example.com', '9876543212', OrderType.B2B, 'Sales Team',
    AcceptanceStatus.ACCEPTED, PaymentMode.PREPAID,
    'Custom Tote Bag', 'One Size - Natural', 50, 249, ProductWorkflowStatus.QUEUED_FOR_PICK, // Changed to QUEUED_FOR_PICK
    {
      design_file_url: 'https://example.com/designs/tote_bag_logo.pdf',
      design_thumbnail_url: 'https://via.placeholder.com/150x150?text=PDF_Thumb',
      design_file_format: 'application/pdf',
      print_technology: undefined, print_size: undefined, print_location: undefined,
      is_rush_order: true,
      gstin: '29ABCDE1234F1Z5',
    }
  ),

  // --- Order 4: QUEUED_FOR_PICK (was PRINT_SPECS_SET) ---
  generateOrderItem(
    'ORD-20251104-004', 'YD-20251104-004', getToday(0).date, getToday(0).time,
    'Alice Williams', 'alice.w@example.com', '9876543213', OrderType.B2C, 'Website',
    AcceptanceStatus.AWAITING, PaymentMode.PREPAID,
    'Branded Pen', 'Blue Ink - White Body', 10, 50, ProductWorkflowStatus.QUEUED_FOR_PICK, // Changed to QUEUED_FOR_PICK
    {
      print_technology: 'Pad Print', print_location: 'Barrel', print_size: '50x10mm',
      design_thumbnail_url: 'https://via.placeholder.com/150x150?text=Pen+Design',
    }
  ),

  // --- Order 5: QUEUED_FOR_PICK (was DESIGN_REJECTED) ---
  generateOrderItem(
    'ORD-20251105-005', 'YD-20251105-005', getToday(0).date, getToday(0).time,
    'Charlie Brown', 'charlie.b@example.com', '9876543214', OrderType.B2C, 'Website',
    AcceptanceStatus.AWAITING, PaymentMode.COD,
    'Custom Cap', 'One Size - Red', 1, 599, ProductWorkflowStatus.QUEUED_FOR_PICK, // Changed to QUEUED_FOR_PICK
    {
      qc_fail_reason: 'Low resolution image. Customer needs to re-upload.',
      design_thumbnail_url: 'https://via.placeholder.com/150x150/FF0000/FFFFFF?text=REJECTED',
    }
  ),

  // --- Order 6: QUEUED_FOR_PICK - Multi-item order, same blank SKU for some ---
  generateOrderItem(
    'ORD-20251106-006', 'YD-20251106-006', getToday(1).date, getToday(1).time,
    'David Green', 'david.g@example.com', '9876543215', OrderType.PARTNER, 'Partner Portal',
    AcceptanceStatus.ACCEPTED, PaymentMode.PREPAID,
    'Premium T-Shirt', 'M - Navy', 5, 549, ProductWorkflowStatus.QUEUED_FOR_PICK,
    {
      blank_article_sku: 'BLANK-TS-MNV', is_rush_order: true, stock_location: 'A1-R2-S3',
      design_thumbnail_url: 'https://via.placeholder.com/150x150?text=Navy+Tee',
    }
  ),
  generateOrderItem(
    'ORD-20251106-006', 'YD-20251106-006', getToday(1).date, getToday(1).time,
    'David Green', 'david.g@example.com', '9876543215', OrderType.PARTNER, 'Partner Portal',
    AcceptanceStatus.ACCEPTED, PaymentMode.PREPAID,
    'Premium T-Shirt', 'L - Navy', 3, 549, ProductWorkflowStatus.QUEUED_FOR_PICK,
    {
      blank_article_sku: 'BLANK-TS-MNV', stock_location: 'A1-R2-S3',
      design_thumbnail_url: 'https://via.placeholder.com/150x150?text=Navy+Tee+Large',
    }
  ),
  generateOrderItem(
    'ORD-20251106-006', 'YD-20251106-006', getToday(1).date, getToday(1).time,
    'David Green', 'david.g@example.com', '9876543215', OrderType.PARTNER, 'Partner Portal',
    AcceptanceStatus.ACCEPTED, PaymentMode.PREPAID,
    'Baseball Cap', 'Blue', 10, 399, ProductWorkflowStatus.QUEUED_FOR_PICK,
    {
      blank_article_sku: 'BLANK-CAP-BLU', stock_location: 'B2-R1-S1',
      design_thumbnail_url: 'https://via.placeholder.com/150x150?text=Blue+Cap',
    }
  ),

  // --- Order 7: BLANK_PICKED ---
  generateOrderItem(
    'ORD-20251107-007', 'YD-20251107-007', getToday(2).date, getToday(2).time,
    'Emily White', 'emily.w@example.com', '9876543216', OrderType.B2C, 'Website',
    AcceptanceStatus.ACCEPTED, PaymentMode.PREPAID,
    'Basic Hoodie', 'S - Grey', 1, 799, ProductWorkflowStatus.BLANK_PICKED,
    {
      picker_name: 'Mohan', picked_at: getToday(2).date,
      blank_qc_status: BlankQCStatus.PENDING, // Awaiting QC
      blank_article_sku: 'BLANK-HD-SGY',
      stock_location: 'C3-R4-S2',
      design_thumbnail_url: 'https://via.placeholder.com/150x150?text=Grey+Hoodie',
    }
  ),

  // --- Order 8: BATCHED ---
  generateOrderItem(
    'ORD-20251108-008', 'YD-20251108-008', getToday(3).date, getToday(3).time,
    'Frank Black', 'frank.b@example.com', '9876543217', OrderType.B2C, 'Website',
    AcceptanceStatus.ACCEPTED, PaymentMode.PREPAID,
    'Phone Case', 'iPhone 15 - Clear', 1, 349, ProductWorkflowStatus.BATCHED,
    {
      picker_name: 'Mohan', picked_at: getToday(3).date, blank_qc_status: BlankQCStatus.PASSED, blank_qc_by: 'Bimal', blank_qc_at: getToday(3).date,
      batchId: 'BATCH-20251108-001-UV', production_station: 'UV-01', print_technology: 'UV',
      design_thumbnail_url: 'https://via.placeholder.com/150x150?text=Phone+Case',
    }
  ),

  // --- Order 9: QUEUED_FOR_PRODUCTION ---
  generateOrderItem(
    'ORD-20251109-009', 'YD-20251109-009', getToday(4).date, getToday(4).time,
    'Grace Blue', 'grace.b@example.com', '9876543218', OrderType.B2B, 'Sales Team',
    AcceptanceStatus.ACCEPTED, PaymentMode.PREPAID,
    'Water Bottle', 'Stainless Steel - 750ml', 20, 699, ProductWorkflowStatus.QUEUED_FOR_PRODUCTION,
    {
      picker_name: 'Mohan', picked_at: getToday(4).date, blank_qc_status: BlankQCStatus.PASSED, blank_qc_by: 'Bimal', blank_qc_at: getToday(4).date,
      batchId: 'BATCH-20251109-001-LASER', production_station: 'Laser-02', print_technology: 'Laser Engraving',
      gstin: '29FGHJK1234L1Z7',
      design_thumbnail_url: 'https://via.placeholder.com/150x150?text=Bottle+Engrave',
    }
  ),

  // --- Order 10: IN_PRODUCTION ---
  generateOrderItem(
    'ORD-20251110-010', 'YD-20251110-010', getToday(5).date, getToday(5).time,
    'Henry Gold', 'henry.g@example.com', '9876543219', OrderType.B2C, 'Website',
    AcceptanceStatus.ACCEPTED, PaymentMode.PREPAID,
    'A5 Notebook', 'Ruled - Kraft Cover', 1, 199, ProductWorkflowStatus.IN_PRODUCTION,
    {
      picker_name: 'Mohan', picked_at: getToday(5).date, blank_qc_status: BlankQCStatus.PASSED, blank_qc_by: 'Bimal', blank_qc_at: getToday(5).date,
      batchId: 'BATCH-20251110-001-DTG', production_station: 'DTG-01', assigned_to: 'Ravi',
      print_started_at: new Date(new Date().setHours(new Date().getHours() - 1)).toISOString(), // Started 1 hour ago
      design_thumbnail_url: 'https://via.placeholder.com/150x150?text=Notebook',
    }
  ),

  // --- Order 11: FINISHING_PENDING ---
  generateOrderItem(
    'ORD-20251111-011', 'YD-20251111-011', getToday(6).date, getToday(6).time,
    'Ivy Silver', 'ivy.s@example.com', '9876543220', OrderType.B2C, 'Website',
    AcceptanceStatus.ACCEPTED, PaymentMode.PREPAID,
    'Keychain', 'Custom Shape - Metal', 1, 149, ProductWorkflowStatus.FINISHING_PENDING,
    {
      picker_name: 'Mohan', picked_at: getToday(6).date, blank_qc_status: BlankQCStatus.PASSED, blank_qc_by: 'Bimal', blank_qc_at: getToday(6).date,
      batchId: 'BATCH-20251111-001-METAL', production_station: 'Metal-Fab-01', assigned_to: 'Kiran',
      print_started_at: new Date(new Date().setHours(new Date().getHours() - 2)).toISOString(),
      print_completed_at: new Date(new Date().setHours(new Date().getHours() - 1)).toISOString(),
      production_time_seconds: 3600,
      design_thumbnail_url: 'https://via.placeholder.com/150x150?text=Keychain',
      finishingStatus: 'QC Pending', // NEW
    }
  ),

  // --- Order 12: FULFILLMENT_PENDING ---
  generateOrderItem(
    'ORD-20251112-012', 'YD-20251112-012', getToday(7).date, getToday(7).time,
    'Liam Bronze', 'liam.b@example.com', '9876543221', OrderType.B2C, 'Website',
    AcceptanceStatus.ACCEPTED, PaymentMode.PREPAID,
    'Custom Pen Drive', '32GB - Blue', 1, 499, ProductWorkflowStatus.FULFILLMENT_PENDING,
    {
      picker_name: 'Mohan', picked_at: getToday(6).date, blank_qc_status: BlankQCStatus.PASSED, blank_qc_by: 'Bimal', blank_qc_at: getToday(6).date,
      batchId: 'BATCH-20251112-001-UV', production_station: 'UV-02', assigned_to: 'Sam',
      print_started_at: getToday(6).date, print_completed_at: getToday(6).date, production_time_seconds: 180,
      finishingStatus: 'Completed', finishing_by: 'Priya Sharma', finishing_completed_at: getToday(7).date, // NEW
      qc_status: QCStatus.PASSED, qc_checked_by: 'Bimal', qc_checked_at: getToday(7).date,
      design_thumbnail_url: 'https://via.placeholder.com/150x150?text=PenDrive',
      expectedShipDate: getToday(8).date, // NEW
    }
  ),

  // --- Order 13: PACKED ---
  generateOrderItem(
    'ORD-20251113-013', 'YD-20251113-013', getToday(8).date, getToday(8).time,
    'Olivia Green', 'olivia.g@example.com', '9876543222', OrderType.B2B, 'Sales Team',
    AcceptanceStatus.ACCEPTED, PaymentMode.PREPAID,
    'Custom Mouse Pad', 'Gaming - Large', 1, 599, ProductWorkflowStatus.PACKED,
    {
      picker_name: 'Mohan', picked_at: getToday(7).date, blank_qc_status: BlankQCStatus.PASSED, blank_qc_by: 'Bimal', blank_qc_at: getToday(7).date,
      batchId: 'BATCH-20251113-001-SUB', production_station: 'Sublimation-01', assigned_to: 'Chris',
      print_started_at: getToday(7).date, print_completed_at: getToday(7).date, production_time_seconds: 240,
      finishingStatus: 'Completed', finishing_by: 'Priya Sharma', finishing_completed_at: getToday(8).date, // NEW
      qc_status: QCStatus.PASSED, qc_checked_by: 'Bimal', qc_checked_at: getToday(8).date,
      packingBy: 'Priya Sharma', packedAt: getToday(8).date, // NEW
      expectedShipDate: getToday(9).date, // NEW
      design_thumbnail_url: 'https://via.placeholder.com/150x150?text=MousePad',
    }
  ),
  // Existing data from provided CSV
  // Note: These entries will be directly mapped from the CSV by the parser,
  // the mock data here is just for local consistency if needed.
  // The structure from types.ts and orderSheetConfig.ts should align with this.
  // I will add placeholders for new fields based on CSV analysis.
  generateOrderItem(
    'ID1', 'YD-131125-214050', '13-11-2025', '10:36 AM', 'Kamakshi Narula', 'kaleshi@123.in', '9870137991', OrderType.B2C, 'Admin', AcceptanceStatus.AWAITING, PaymentMode.PREPAID, // Ensure PaymentMode is mapped correctly
    'Not Like Other Girls. Worse. T-Shirt SCREENPRINT', 'XXL - BLACK', 1, 448, ProductWorkflowStatus.QUEUED_FOR_PICK, // Changed from FILE_UPLOADED
    {
      line_item_id: '', sku: '', unit_price: 448, blank_article_sku: '', product_supplier: '', product_stock_status: undefined,
      productStockCount: undefined, blankStockAvailable: undefined, print_technology: 'DTF', print_location: '', print_size: '', print_color_count: undefined,
      design_file_url: 'https://www.rawpixel.com/image/6258252', design_file_format: '', design_thumbnail_url: '', mockup_url: '',
      productStatus: ProductWorkflowStatus.QUEUED_FOR_PICK, picker_name: '', picked_at: '', blank_qc_status: undefined, blank_qc_by: '', blank_qc_at: '',
      batchId: '', production_station: '', assigned_to: '', print_started_at: '', print_completed_at: '', production_time_seconds: undefined,
      finishingStatus: '', finishing_by: '', finishing_completed_at: '', qc_status: undefined, qc_notes: '', qc_checked_by: '', qc_checked_at: '',
      qc_fail_reason: '', qc_images_url: '', reprint_required: false, reprint_count: undefined, whitelabelRequired: false, whitelabelType: '',
      packingBy: '', packedAt: '', customerSpecialRequest: '', internal_notes: '', special_instructions: '', weight_grams: 130, is_rush_order: false,
      production_cost: undefined, customerPaidPrice: 896, orderSourceUrl: '', expectedShipDate: '', trackingNumber: '', carrier: '', shippedAt: '',
      // Ensure specific PaymentMode value from CSV is handled if not directly in enum, or map it.
      // For now, assuming "Online Payment" maps to a string or will be handled by parse.
      paymentMode: PaymentMode.PREPAID, 
      totalAmountWithTax: 896.00,
      totalQuantityOfAllProducts: 2, // From CSV
      totalNoOfProducts: 2, // From CSV
      shippingCost: 130, // From CSV
      shippingType: 'Standard Shipping (500 - 999 grams) | Shipped within 5 Days', // From CSV
      shippingCountry: 'India', billingCountry: 'India', // Corrected missing fields
    }
  ),
  generateOrderItem(
    'ID2', 'YD-131125-214050', '13-11-2025', '10:36 AM', 'Kamakshi Narula', 'kaleshi@123.in', '9870137991', OrderType.B2C, 'Admin', AcceptanceStatus.AWAITING, PaymentMode.PREPAID, // Ensure PaymentMode is mapped correctly
    'Mein Chup Rehne Ke Liye Nahi Bani Thi T-Shirt in White Screenprint', '2XL', 1, 448, ProductWorkflowStatus.QUEUED_FOR_PICK, // Changed from FILE_UPLOADED
    {
      line_item_id: '', sku: '', unit_price: 448, blank_article_sku: '', product_supplier: '', product_stock_status: undefined,
      productStockCount: undefined, blankStockAvailable: undefined, print_technology: 'DTF', print_location: '', print_size: '', print_color_count: undefined,
      design_file_url: 'https://www.rawpixel.com/image/7054380', design_file_format: '', design_thumbnail_url: '', mockup_url: '',
      productStatus: ProductWorkflowStatus.QUEUED_FOR_PICK, picker_name: '', picked_at: '', blank_qc_status: undefined, blank_qc_by: '', blank_qc_at: '',
      batchId: '', production_station: '', assigned_to: '', print_started_at: '', print_completed_at: '', production_time_seconds: undefined,
      finishingStatus: '', finishing_by: '', finishing_completed_at: '', qc_status: undefined, qc_notes: '', qc_checked_by: '', qc_checked_at: '',
      qc_fail_reason: '', qc_images_url: '', reprint_required: false, reprint_count: undefined, whitelabelRequired: false, whitelabelType: '',
      packingBy: '', packedAt: '', customerSpecialRequest: '', internal_notes: '', special_instructions: '', weight_grams: 130, is_rush_order: false,
      production_cost: undefined, customerPaidPrice: 896, orderSourceUrl: '', expectedShipDate: '', trackingNumber: '', carrier: '', shippedAt: '',
      paymentMode: PaymentMode.PREPAID,
      totalAmountWithTax: 896.00,
      totalQuantityOfAllProducts: 2,
      totalNoOfProducts: 2,
      shippingCost: 130,
      shippingType: 'Standard Shipping (500 - 999 grams) | Shipped within 5 Days',
      shippingCountry: 'India', billingCountry: 'India',
    }
  ),
  generateOrderItem(
    'ID3', 'YD-131125-214049', '13-11-2025', '10:21 AM', 'Kritika Pant', 'kritikapant05@gmail.com', '9027296766', OrderType.B2C, 'yourdesignstore.in', AcceptanceStatus.AWAITING, PaymentMode.PREPAID,
    'Pure Cotton Round Neck T-Shirt (180 GSM)', 'White - M', 1, 465, ProductWorkflowStatus.QUEUED_FOR_PICK, // Changed from FILE_UPLOADED
    {
      line_item_id: '', sku: '', unit_price: 465, blank_article_sku: '', product_supplier: '', product_stock_status: undefined,
      productStockCount: undefined, blankStockAvailable: undefined, print_technology: 'DTG', print_location: '', print_size: '', print_color_count: undefined,
      design_file_url: 'https://www.rawpixel.com/image/16433590', design_file_format: '', design_thumbnail_url: '', mockup_url: '',
      productStatus: ProductWorkflowStatus.QUEUED_FOR_PICK, picker_name: '', picked_at: '', blank_qc_status: undefined, blank_qc_by: '', blank_qc_at: '',
      batchId: '', production_station: '', assigned_to: '', print_started_at: '', print_completed_at: '', production_time_seconds: undefined,
      finishingStatus: '', finishing_by: '', finishing_completed_at: '', qc_status: undefined, qc_notes: '', qc_checked_by: '', qc_checked_at: '',
      qc_fail_reason: '', qc_images_url: '', reprint_required: false, reprint_count: undefined, whitelabelRequired: false, whitelabelType: '',
      packingBy: '', packedAt: '', customerSpecialRequest: '', internal_notes: '', special_instructions: '', weight_grams: 70, is_rush_order: false,
      production_cost: undefined, customerPaidPrice: 465, orderSourceUrl: '', expectedShipDate: '', trackingNumber: '', carrier: '', shippedAt: '',
      paymentMode: PaymentMode.PREPAID,
      totalAmountWithTax: 465.00,
      totalQuantityOfAllProducts: 1,
      totalNoOfProducts: 1,
      shippingCost: 70,
      shippingType: 'Standard Shipping (0-499 grams) | Shipped within 5 Days',
      shippingCountry: 'India', billingCountry: 'India',
    }
  ),
  generateOrderItem(
    'ID4', 'YD-131125-214048', '13-11-2025', '10:18 AM', 'Lalrin .', 'zatags@yds.in', '8014609228', OrderType.B2C, 'Admin', AcceptanceStatus.REJECTED, PaymentMode.PREPAID,
    'Hokkaido Wave Raglan T-shirt', 'Grey & Navy Heather - XL', 1, 470, ProductWorkflowStatus.QUEUED_FOR_PICK, // Changed from FILE_UPLOADED
    {
      line_item_id: '', sku: '', unit_price: 470, blank_article_sku: '', product_supplier: '', product_stock_status: undefined,
      productStockCount: undefined, blankStockAvailable: undefined, print_technology: 'EMBN', print_location: '', print_size: '', print_color_count: undefined,
      design_file_url: 'https://www.rawpixel.com/image/16628123', design_file_format: '', design_thumbnail_url: '', mockup_url: '',
      productStatus: ProductWorkflowStatus.QUEUED_FOR_PICK, picker_name: '', picked_at: '', blank_qc_status: undefined, blank_qc_by: '', blank_qc_at: '',
      batchId: '', production_station: '', assigned_to: '', print_started_at: '', print_completed_at: '', production_time_seconds: undefined,
      finishingStatus: '', finishing_by: '', finishing_completed_at: '', qc_status: undefined, qc_notes: '', qc_checked_by: '', qc_checked_at: '',
      qc_fail_reason: '', qc_images_url: '', reprint_required: false, reprint_count: undefined, whitelabelRequired: false, whitelabelType: '',
      packingBy: '', packedAt: '', customerSpecialRequest: '', internal_notes: '', special_instructions: '', weight_grams: 70, is_rush_order: false,
      production_cost: undefined, customerPaidPrice: 470, orderSourceUrl: '', expectedShipDate: '', trackingNumber: '', carrier: '', shippedAt: '',
      paymentMode: PaymentMode.PREPAID,
      totalAmountWithTax: 470.00,
      totalQuantityOfAllProducts: 1,
      totalNoOfProducts: 1,
      shippingCost: 70,
      shippingType: 'Standard Shipping (0-499 grams) | Shipped within 5 Days',
      shippingCountry: 'India', billingCountry: 'India',
    }
  ),
  generateOrderItem(
    'ID5', 'YD-131125-214047', '13-11-2025', '10:18 AM', 'Ruzan Zarthoshtimanesh', 'zatags@yds.in', '9820192531', OrderType.B2C, 'Admin', AcceptanceStatus.REJECTED, PaymentMode.PREPAID,
    'Motorhead Raglan White & Cardinal Heather T-shirt', 'WHITE AND CARDINAL HEATHER - XL', 1, 470, ProductWorkflowStatus.QUEUED_FOR_PICK, // Changed from FILE_UPLOADED
    {
      line_item_id: '', sku: '', unit_price: 470, blank_article_sku: '', product_supplier: '', product_stock_status: undefined,
      productStockCount: undefined, blankStockAvailable: undefined, print_technology: 'DTF', print_location: '', print_size: '', print_color_count: undefined,
      design_file_url: 'https://www.rawpixel.com/image/6290162', design_file_format: '', design_thumbnail_url: '', mockup_url: '',
      productStatus: ProductWorkflowStatus.QUEUED_FOR_PICK, picker_name: '', picked_at: '', blank_qc_status: undefined, blank_qc_by: '', blank_qc_at: '',
      batchId: '', production_station: '', assigned_to: '', print_started_at: '', print_completed_at: '', production_time_seconds: undefined,
      finishingStatus: '', finishing_by: '', finishing_completed_at: '', qc_status: undefined, qc_notes: '', qc_checked_by: '', qc_checked_at: '',
      qc_fail_reason: '', qc_images_url: '', reprint_required: false, reprint_count: undefined, whitelabelRequired: false, whitelabelType: '',
      packingBy: '', packedAt: '', customerSpecialRequest: '', internal_notes: '', special_instructions: '', weight_grams: 70, is_rush_order: false,
      production_cost: undefined, customerPaidPrice: 470, orderSourceUrl: '', expectedShipDate: '', trackingNumber: '', carrier: '', shippedAt: '',
      paymentMode: PaymentMode.PREPAID,
      totalAmountWithTax: 470.00,
      totalQuantityOfAllProducts: 1,
      totalNoOfProducts: 1,
      shippingCost: 70,
      shippingType: 'Standard Shipping (0-499 grams) | Shipped within 5 Days',
      shippingCountry: 'India', billingCountry: 'India',
    }
  ),
  generateOrderItem(
    'ID6', 'YD-131125-214046', '13-11-2025', '10:15 AM', 'Lalrin .', 'zatags@yds.in', '8014609228', OrderType.B2C, 'Admin', AcceptanceStatus.AWAITING, PaymentMode.PREPAID,
    'Hokkaido Wave Raglan T-shirt', 'Grey & Navy Heather - XL', 1, 470, ProductWorkflowStatus.QUEUED_FOR_PICK, // Changed from FILE_UPLOADED
    {
      line_item_id: '', sku: '', unit_price: 470, blank_article_sku: '', product_supplier: '', product_stock_status: undefined,
      productStockCount: undefined, blankStockAvailable: undefined, print_technology: 'DTF', print_location: '', print_size: '', print_color_count: undefined,
      design_file_url: 'https://www.pngmart.com/image/12482', design_file_format: '', design_thumbnail_url: '', mockup_url: '',
      productStatus: ProductWorkflowStatus.QUEUED_FOR_PICK, picker_name: '', picked_at: '', blank_qc_status: undefined, blank_qc_by: '', blank_qc_at: '',
      batchId: '', production_station: '', assigned_to: '', print_started_at: '', print_completed_at: '', production_time_seconds: undefined,
      finishingStatus: '', finishing_by: '', finishing_completed_at: '', qc_status: undefined, qc_notes: '', qc_checked_by: '', qc_checked_at: '',
      qc_fail_reason: '', qc_images_url: '', reprint_required: false, reprint_count: undefined, whitelabelRequired: false, whitelabelType: '',
      packingBy: '', packedAt: '', customerSpecialRequest: '', internal_notes: '', special_instructions: '', weight_grams: 70, is_rush_order: false,
      production_cost: undefined, customerPaidPrice: 470, orderSourceUrl: '', expectedShipDate: '', trackingNumber: '', carrier: '', shippedAt: '',
      paymentMode: PaymentMode.PREPAID,
      totalAmountWithTax: 470.00,
      totalQuantityOfAllProducts: 1,
      totalNoOfProducts: 1,
      shippingCost: 70,
      shippingType: 'Standard Shipping (0-499 grams) | Shipped within 5 Days',
      shippingCountry: 'India', billingCountry: 'India',
    }
  ),
];

// --- AI Studio Mocks ---
export const mockBrands: BrandProfile[] = [
  { id: 'BRAND-1', name: 'YDS Labs', voice: 'Professional, Innovative, Accessible', mission: 'Empower creativity through cutting-edge design and manufacturing.', targetAudience: 'Small businesses, creative professionals, individuals seeking custom products.', keyMessages: 'Design with no limits; Quality you can trust; Your vision, brought to life.' },
  { id: 'BRAND-2', name: 'EcoPrint Co.', voice: 'Sustainable, Ethical, Community-focused', mission: 'Provide environmentally friendly printing solutions to reduce ecological footprint.', targetAudience: 'Eco-conscious brands, green initiatives, non-profits.', keyMessages: 'Print green, live clean; Sustainable solutions for a better planet.' },
];

export const mockCompetitors: Competitor[] = [
  { id: 'COMP-1', name: 'Printful', website: 'https://www.printful.com', twitter: 'https://twitter.com/Printful', linkedin: 'https://www.linkedin.com/company/printful/', notes: 'Leading print-on-demand dropshipping supplier. Wide range of products, global fulfillment network.' },
  { id: 'COMP-2', name: 'VistaPrint', website: 'https://www.vistaprint.in', twitter: 'https://twitter.com/Vistaprint', linkedin: 'https://www.linkedin.com/company/vistaprint/', notes: 'Online printing services for small businesses and individuals. Focus on marketing materials and personalized products.' },
];

export const mockSocialSearchResult = `
### Printful Social Media Activity (Last 2 weeks)

**Overview:** Printful has been active on both Twitter/X and LinkedIn, focusing on new product launches, creator success stories, and e-commerce tips. They seem to be pushing their integration capabilities with various platforms.

**Key Posts:**
*   **Twitter/X (Nov 1, 2025):** Announced new eco-friendly apparel options. Highlighted partnership with a sustainable fabric supplier.
    *   [Link to Tweet](https://twitter.com/Printful/status/1234567890) (Mock Link)
*   **LinkedIn (Oct 28, 2025):** Shared a case study of a successful e-commerce store built using Printful's services, emphasizing rapid scaling and product diversification.
    *   [Link to LinkedIn Post](https://www.linkedin.com/feed/update/urn:li:activity:987654321) (Mock Link)
*   **Twitter/X (Oct 25, 2025):** Ran a poll asking creators about their biggest challenges in merch design, hinting at upcoming tool improvements.
    *   [Link to Tweet](https://twitter.com/Printful/status/0987654321) (Mock Link)

**Themes:**
*   Sustainability in POD.
*   Empowering creators and entrepreneurs.
*   Seamless e-commerce integration.

---

### VistaPrint Social Media Activity (Last 2 weeks)

**Overview:** VistaPrint's recent activity on social media primarily revolves around holiday season promotions, discounts on marketing materials, and tips for small businesses preparing for peak sales periods.

**Key Posts:**
*   **Facebook (Nov 3, 2025):** Promoted a "Holiday Savings Event" with up to 40% off business cards and flyers.
    *   [Link to Facebook Post](https://www.facebook.com/Vistaprint/posts/1122334455) (Mock Link)
*   **LinkedIn (Oct 30, 2025):** Published an article titled "5 Ways Small Businesses Can Boost Holiday Sales," subtly featuring their customizable product range.
    *   [Link to LinkedIn Article](https://www.linkedin.com/pulse/5-ways-small-businesses-boost-holiday-sales-vistaprint) (Mock Link)
*   **Instagram (Oct 27, 2025):** Showcased customer photos of personalized calendars and greeting cards.
    *   [Link to Instagram Post](https://www.instagram.com/p/abcdefg/) (Mock Link)

**Themes:**
*   Holiday promotions and seasonal marketing.
*   Support for small business growth.
*   Showcasing personalized product versatility.
`;

export const mockCustomerPsychology: CustomerPsychologyOutput = {
  brandId: 'BRAND-1',
  marketingGoal: 'Increase sign-ups for our new design software.',
  personaSummary: `
**Demographics:** Young adults (22-35), aspiring designers, freelancers, small business owners. Tech-savvy, moderate income.
**Psychographics:** Value creativity, independence, personal expression. Seek efficiency and high-quality results. Frustrated by complex software and lack of integration. Motivated by ease of use, professional-looking outcomes, and community support.
**Pain Points:** Overwhelmed by steep learning curves, expensive subscriptions, and difficulty translating ideas into tangible designs.
**Motivations:** Desire to create unique designs, launch side hustles, or enhance brand presence without extensive design skills or budget.
`,
  customerJourneyMap: `
**1. Awareness:** See targeted ads on social media, discover through design communities, hear from word-of-mouth.
**2. Consideration:** Search for "easy design software," compare features with competitors, watch tutorial videos.
**3. Decision:** Try free trial, review pricing plans, read user testimonials.
**4. Onboarding:** First-time use of the software, guided tutorials, initial project creation.
**5. Adoption:** Regular use, explore advanced features, integrate into workflow.
**6. Advocacy:** Share designs, recommend to peers, provide positive reviews.
`,
  behavioralTriggers: `
**Internal:**
*   "I need a logo for my new side hustle."
*   "My current design tool is too complicated/expensive."
*   "I want to create professional-looking social media graphics quickly."
**External:**
*   Seeing competitors with polished branding.
*   A promotional offer for design software.
*   A peer recommending the software.
`,
  conversionPsychology: `
**1. Social Proof:** Showcase testimonials from successful users and popular designs created with the software.
**2. Scarcity/Urgency:** Time-limited discounts for early sign-ups or bonus features for quick decisions.
**3. Authority:** Feature endorsements from design influencers or reputable publications.
**4. Reciprocity:** Offer a robust free trial with valuable features, demonstrating capability before commitment.
**5. Commitment & Consistency:** Encourage small commitments (e.g., free template download) to build momentum towards sign-up.
**6. Ease of Use (Cognitive Fluency):** Emphasize intuitive UI/UX in all messaging and visuals to reduce perceived effort.
`,
};

export const mockContentStrategy: ContentStrategyOutput = {
  campaignBrief: 'Launch a new eco-friendly product line targeting young adults.',
  targetAudienceDescription: 'Health-conscious individuals aged 18-35, interested in sustainability and outdoor activities.',
  socialPostingIdeas: [
    'Behind-the-scenes video showing our sustainable manufacturing process.',
    'Infographic comparing our eco-friendly products to traditional alternatives.',
    'User-generated content challenge: show us how you incorporate sustainability into your daily life for a chance to win products.',
    'Live Q&A with our sustainability expert about product materials and impact.',
  ],
  editorialCalendarThemes: [
    'Month 1: The Green Revolution - Introducing our eco-friendly philosophy.',
    'Month 2: Conscious Choices - Deep dive into sustainable materials and their benefits.',
    'Month 3: Outdoor Adventures - Highlighting product durability and versatility in nature.',
  ],
  multiChannelStrategy: `
**Blog:** Long-form articles on sustainable living, environmental impact of consumer choices, and interviews with eco-influencers.
**Email:** Segmented newsletters with product highlights, exclusive discounts, and links to new blog content.
**Video (YouTube/TikTok):** Short, engaging videos showcasing product features, lifestyle content, and DIY eco-tips.
**Social Media (Instagram/Facebook):** Visually rich posts with product photography, user-generated content, polls, and interactive stories.
`,
  coreBrandStorytelling: `
**Narrative:** We believe in a future where consumption doesn't harm the planet. Our products are designed for those who want to make a difference without compromising on quality or style.
**Message:** Join us in our mission to create a more sustainable world, one product at a time.
`,
};

export const mockCampaignIdeas: CampaignIdea[] = [
  {
    id: 'CAMP-1',
    name: 'Green Thumb Challenge',
    description: 'Encourage users to share their sustainable living tips and photos using our eco-friendly products for a chance to be featured and win a grand prize.',
    channels: [CampaignChannel.SOCIAL_MEDIA, CampaignChannel.EMAIL_MARKETING],
  },
  {
    id: 'CAMP-2',
    name: 'Nature\'s Canvas',
    description: 'Collaborate with nature artists to create custom designs for our products, emphasizing the beauty of the natural world and sustainable practices.',
    channels: [CampaignChannel.SOCIAL_MEDIA, CampaignChannel.PAID_ADS, CampaignChannel.PR],
  },
  {
    id: 'CAMP-3',
    name: 'Future Forward Pledge',
    description: 'Invite customers to make a pledge for a more sustainable future, with each pledge unlocking a discount on our new eco-friendly line. Partner with an environmental non-profit.',
    channels: [CampaignChannel.EMAIL_MARKETING, CampaignChannel.CONTENT_MARKETING, CampaignChannel.EVENTS],
  },
];

export const mockBlogPost: BlogPostOutput = {
  topic: 'The Future of Sustainable Farming',
  title: 'Cultivating Tomorrow: Innovations Shaping the Future of Sustainable Farming',
  content: `
Sustainable farming isn't just a buzzword; it's a necessity for our planet's future. As global populations rise and environmental concerns mount, the agricultural sector faces immense pressure to produce more with less, all while minimizing ecological impact. But what does the future hold for sustainable farming, and what innovations are leading the charge?

## Vertical Farms: Stacking Up for a greener Tomorrow
Imagine farms that rise vertically, often indoors, in urban centers. **Vertical farming** maximizes space, uses significantly less water (up to 95% less than traditional methods), and eliminates the need for pesticides. Controlled environments allow for year-round production, immune to weather whims, and reduce transportation costs by locating farms near consumers.

## Precision Agriculture: The Art of Smart Farming
Gone are the days of blanket spraying and uniform irrigation. **Precision agriculture** leverages technology like GPS, sensors, drones, and AI to provide crops with exactly what they need, when they need it. This targeted approach optimizes resource use, reduces waste, and boosts yields. Farmers can monitor soil health, hydration levels, and plant growth with unprecedented accuracy.

## Regenerative Agriculture: Healing the Earth, One Farm at a Time
More than just sustainable, **regenerative agriculture** aims to *improve* ecosystem health. Practices like no-till farming, cover cropping, and diverse crop rotations enhance biodiversity, increase soil organic matter, and improve water cycles. This approach sequesters carbon from the atmosphere, turning farms into carbon sinks and actively combating climate change.

## Plant-Based Innovation: Beyond the Field
The future of sustainable food isn't just about how we grow it, but what we grow and consume. Advances in plant-based alternatives to meat and dairy are reducing the environmental footprint associated with livestock farming. Innovations in plant genetics and fermentation are creating novel food sources that require fewer resources and land.

## The Road Ahead
The journey towards a fully sustainable agricultural system is complex, but these innovations offer a hopeful glimpse into a future where farming supports both human prosperity and planetary health. From bustling urban vertical farms to AI-powered fields and regenerative practices, the seeds of tomorrow's food system are already being sown.
`,
  metaDescription: 'Explore the future of sustainable farming: vertical farms, precision agriculture, regenerative practices, and plant-based innovations for a greener tomorrow.',
};

export const mockGeneratedImage: GeneratedImage = {
  id: 'IMG-MOCK-1',
  prompt: 'A robot holding a red skateboard in a futuristic city, vibrant colors',
  imageUrl: 'https://via.placeholder.com/512x512/F6A409/203A6C?text=Mock+Image+Generated',
  mimeType: 'image/png',
  aspectRatio: '1:1',
};

export const mockGeneratedVideo: GeneratedVideo = {
  id: 'VID-MOCK-1',
  prompt: 'A neon hologram of a cat driving at top speed through a futuristic cityscape, synthwave aesthetic.',
  videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4', // Placeholder URL
  resolution: '720p',
  aspectRatio: '16:9',
  sourceImageId: undefined,
};

// --- ERP Mock Data ---

export const mockLeads: Lead[] = [
  { id: 'L-1', name: 'John Doe', company: 'Acme Corp', email: 'john@acme.com', phone: '+91 98765 43210', status: LeadStatus.QUALIFIED, source: 'Website', ownerName: 'Vivek', createdAt: '2026-04-01T10:00:00Z' },
  { id: 'L-2', name: 'Jane Smith', company: 'Global Tech', email: 'jane@globaltech.io', phone: '+91 87654 32109', status: LeadStatus.CONTACTED, source: 'LinkedIn', ownerName: 'Danish', createdAt: '2026-04-05T14:30:00Z' },
  { id: 'L-3', name: 'Bob Wilson', company: 'Startup Hub', email: 'bob@startuphub.com', phone: '+91 76543 21098', status: LeadStatus.NEW, source: 'Referral', ownerName: 'Surath', createdAt: '2026-04-10T09:15:00Z' },
];

export const mockInvoices: Invoice[] = [
  { id: 'INV-2026-001', customerName: 'Acme Corp', amount: 45000, status: InvoiceStatus.PAID, dueDate: '2026-04-15', createdAt: '2026-04-01' },
  { id: 'INV-2026-002', customerName: 'Global Tech', amount: 125000, status: InvoiceStatus.SENT, dueDate: '2026-04-30', createdAt: '2026-04-05' },
  { id: 'INV-2026-003', customerName: 'Startup Hub', amount: 25000, status: InvoiceStatus.OVERDUE, dueDate: '2026-04-08', createdAt: '2026-03-25' },
];

export const mockExpenses: Expense[] = [
  { id: 'EXP-001', title: 'Adobe Creative Cloud', category: 'Software', vendor: 'Adobe', amount: 4500, status: ExpenseStatus.APPROVED, requesterName: 'Danish', createdAt: '2026-04-01' },
  { id: 'EXP-002', title: 'Office Supplies', category: 'Operations', vendor: 'Amazon', amount: 1200, status: ExpenseStatus.PENDING, requesterName: 'Surath', createdAt: '2026-04-08' },
];

export const mockDecisions: Decision[] = [
  { id: 'DEC-001', title: 'Switch to AWS for Hosting', context: 'Current hosting is unreliable during peak traffic.', rationale: 'AWS offers better scalability and 99.99% uptime.', status: DecisionStatus.IMPLEMENTED, ownerName: 'Vivek', createdAt: '2026-03-15' },
  { id: 'DEC-002', title: 'Hire 2 New Designers', context: 'Project backlog is increasing.', rationale: 'Need to maintain 48-hour delivery promise.', status: DecisionStatus.APPROVED, ownerName: 'Danish', createdAt: '2026-04-05' },
];

export const mockStockItems: StockItem[] = [
  { id: 'S-1', name: 'Premium Cotton T-Shirt (Black)', sku: 'TS-BLK-P', currentStock: 450, reorderLevel: 100, dailySalesRate: 15, unit: 'pcs' },
  { id: 'S-2', name: 'Eco-Friendly Tote Bag', sku: 'TB-ECO-1', currentStock: 85, reorderLevel: 150, dailySalesRate: 8, unit: 'pcs' },
];

export const mockSuppliers: Supplier[] = [
  { id: 'SUP-001', name: 'Cotton World India', leadTimeDays: 7, rating: 4.8, activePoCount: 2, contactPerson: 'Rajesh Kumar' },
  { id: 'SUP-002', name: 'EcoPack Solutions', leadTimeDays: 12, rating: 4.2, activePoCount: 0, contactPerson: 'Anjali Shah' },
];

export const mockWarehouses: Warehouse[] = [
  { id: 'WH-01', name: 'Main Hub - Mumbai', location: 'Andheri East', zones: [{ name: 'Zone A', bins: ['A1', 'A2', 'A3'] }, { name: 'Zone B', bins: ['B1', 'B2'] }] },
];

export const mockCampaigns: Campaign[] = [
  { id: 'CAM-001', name: 'Summer Launch 2026', status: CampaignStatus.ACTIVE, startDate: '2026-04-01', endDate: '2026-05-31', budget: 500000, spend: 125000, ownerName: 'Danish' },
];

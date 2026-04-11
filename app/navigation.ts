
import React from 'react'
import { MockPageProps, WebsitePageProps, AllOrderItemsPageProps, OrderSummaryPageProps, PickListKanbanPageProps, ProductionScreenPageProps, OrderListProductsPageProps, DesignBoardPageProps, OrderDashboardPageProps } from './types';

// Lazy-load all page components for code-splitting
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const CatalogPage = React.lazy(() => import('./pages/CatalogPage'));
const MockPage = React.lazy(() => import('./pages/MockPage'));
const BusinessModelCanvasPage = React.lazy(() => import('./pages/BusinessModelCanvasPage'));
const DataSourceSettingsPage = React.lazy(() => import('./pages/DataSourceSettingsPage'));
const ProgramsPage = React.lazy(() => import('./pages/ProgramsPage'));
const ProjectsPage = React.lazy(() => import('./pages/ProjectsPage'));
const TasksPage = React.lazy(() => import('./pages/TasksPage'));
const MilestonesPage = React.lazy(() => import('./pages/MilestonesPage'));
const PortfolioViewPage = React.lazy(() => import('./pages/PortfolioViewPage'));
const GoogleWorkspacePage = React.lazy(() => import('./pages/GoogleWorkspacePage'));
const StrategyPage = React.lazy(() => import('./pages/StrategyPage'));
const BrandHubPage = React.lazy(() => import('./pages/ai_studio/BrandHubPage'));
const CompetitorHubPage = React.lazy(() => import('./pages/ai_studio/CompetitorHubPage'));
const CompetitorLandscapePage = React.lazy(() => import('./pages/CompetitorLandscapePage'));
const CustomerPsychologyPage = React.lazy(() => import('./pages/ai_studio/CustomerPsychologyPage'));
const ContentStrategyPage = React.lazy(() => import('./pages/ai_studio/ContentStrategyPage').then((module: any) => ({ default: module.default })));
const CampaignIdeatorPage = React.lazy(() => import('./pages/ai_studio/CampaignIdeatorPage'));
const BlogGeneratorPage = React.lazy(() => import('./pages/ai_studio/BlogGeneratorPage'));
const ImageDesignerPage = React.lazy(() => import('./pages/ai_studio/ImageDesignerPage'));
const VideoGeneratorPage = React.lazy(() => import('./pages/ai_studio/VideoGeneratorPage'));
const LookerStudioPage = React.lazy(() => import('./pages/ai_studio/LookerStudioPage'));
const StrategicInitiativesPage = React.lazy(() => import('./pages/StrategicInitiativesPage'));
const StrategicObjectivesPage = React.lazy(() => import('./pages/StrategicObjectivesPage'));
const GoalsPage = React.lazy(() => import('./pages/GoalsPage'));
const QuarterlyInitiativesPage = React.lazy(() => import('./pages/QuarterlyInitiativesPage'));
const ResourceAllocationBudgetPage = React.lazy(() => import('./pages/ResourceAllocationBudgetPage'));
const PlatformAndLogsPage = React.lazy(() => import('./pages/PlatformAndLogsPage'));
const EmbeddedSheetsPage = React.lazy(() => import('./pages/EmbeddedSheetsPage')); 
const SheetSchemaPage = React.lazy(() => import('./pages/SheetSchemaPage'));
const PPCPage = React.lazy(() => import('./pages/PPCPage'));
const WebsitePage = React.lazy(() => import('./pages/WebsitePage'));
const AllModulesAndSectionsPage = React.lazy(() => import('./pages/AllModulesAndSectionsPage'));
const OrderSummaryPage = React.lazy(() => import('./pages/OrderSummaryPage'));
const AllOrderItemsPage = React.lazy(() => import('./pages/AllOrderItemsPage'));
const OrderListProductsPage = React.lazy(() => import('./pages/OrderListProductsPage'));
const ProductStatusKanbanPage = React.lazy(() => import('./pages/ProductStatusKanbanPage'));
const DesignBoardPage = React.lazy(() => import('./pages/DesignBoardPage'));
const PickListKanbanPage = React.lazy(() => import('./pages/PickListKanbanPage'));
const ProductionScreenPage = React.lazy(() => import('./pages/ProductionScreenPage'));
const OrderDashboardPage = React.lazy(() => import('./pages/OrderDashboardPage'));
const UsersRolesPage = React.lazy(() => import('./pages/UsersRolesPage'));
const StrategyCommandCenterPage = React.lazy(() => import('./pages/StrategyCommandCenterPage'));
const OperationsExecutionPage = React.lazy(() => import('./pages/OperationsExecutionPage'));

// New Real Pages
const CEODashboardPage = React.lazy(() => import('./pages/CEODashboardPage'));
const ActionQueuePage = React.lazy(() => import('./pages/ActionQueuePage'));
const FocusAreasPage = React.lazy(() => import('./pages/FocusAreasPage'));
const DecisionsLogPage = React.lazy(() => import('./pages/DecisionsLogPage'));
const LeadCRMPage = React.lazy(() => import('./pages/LeadCRMPage'));
const DealPipelinePage = React.lazy(() => import('./pages/DealPipelinePage'));
const CustomerDirectoryPage = React.lazy(() => import('./pages/CustomerDirectoryPage'));
const CampaignsPage = React.lazy(() => import('./pages/CampaignsPage'));
const ContentCalendarPage = React.lazy(() => import('./pages/ContentCalendarPage'));
const InstagramOpsPage = React.lazy(() => import('./pages/InstagramOpsPage'));
const InvoicesPage = React.lazy(() => import('./pages/InvoicesPage'));
const ExpensesPage = React.lazy(() => import('./pages/ExpensesPage'));
const PLDashboardPage = React.lazy(() => import('./pages/PLDashboardPage'));
const StockLevelsPage = React.lazy(() => import('./pages/StockLevelsPage'));
const SuppliersPage = React.lazy(() => import('./pages/SuppliersPage'));
const WarehousesPage = React.lazy(() => import('./pages/WarehousesPage'));
const GoogleAdsPage = React.lazy(() => import('./pages/GoogleAdsPage'));
const TrafficGA4Page = React.lazy(() => import('./pages/TrafficGA4Page'));
const WorkloadPage = React.lazy(() => import('./pages/WorkloadPage'));
const SprintBoardPage = React.lazy(() => import('./pages/SprintBoardPage'));
const TechDecisionsPage = React.lazy(() => import('./pages/TechDecisionsPage'));
const PayrollPage = React.lazy(() => import('./pages/PayrollPage'));
const FinancialReportsPage = React.lazy(() => import('./pages/FinancialReportsPage'));
const SystemStatusPage = React.lazy(() => import('./pages/SystemStatusPage'));

// New Placeholder Pages
const PlaceholderPages = import('./pages/PlaceholderPages');

export interface NavSubItem {
  id: string
  label: string
  component: React.ElementType<MockPageProps | WebsitePageProps | AllOrderItemsPageProps | OrderSummaryPageProps | PickListKanbanPageProps | ProductionScreenPageProps | OrderListProductsPageProps | DesignBoardPageProps | OrderDashboardPageProps | any>
}

export interface NavMainItem {
  id: string
  label: string
  emoji: string
  subItems: NavSubItem[]
}

export const navigationStructure: NavMainItem[] = [
  {
    id: 'command_center',
    label: 'COMMAND CENTER',
    emoji: '🏠',
    subItems: [
      { id: 'dashboard', label: 'Dashboard', component: DashboardPage },
      { id: 'ceo_dashboard', label: '👑 CEO Dashboard', component: CEODashboardPage },
      { id: 'action_queue', label: '⚡ Action Queue', component: ActionQueuePage },
      { id: 'focus_areas', label: '🎯 Focus Areas', component: FocusAreasPage },
      { id: 'decisions_log', label: '📝 Decisions Log', component: DecisionsLogPage },
      { id: 'strategy_command', label: '🛡️ Strategy Command', component: StrategyCommandCenterPage },
      { id: 'ops_execution', label: '⚙️ Ops Execution', component: OperationsExecutionPage },
      { id: 'google_workspace', label: 'Google Workspace', component: GoogleWorkspacePage },
      { id: 'portfolio_view', label: '📊 Portfolio View', component: PortfolioViewPage },
      { id: 'business_model_canvas', label: 'Business Model Canvas', component: BusinessModelCanvasPage },
      { id: 'strategy', label: '🧭 Strategy Board', component: StrategyPage },
      { id: 'looker_studio', label: '📊 Looker Studio Hub', component: LookerStudioPage },
      { id: 'competitor_landscape', label: '🗺️ Competitor Landscape', component: CompetitorLandscapePage },
      { id: 'platforms_logs', label: '🌐 System Status', component: SystemStatusPage },
    ],
  },
  {
    id: 'ai_studio',
    label: 'DESIGN LAB (AI)',
    emoji: '🧪',
    subItems: [
      { id: 'brand_hub', label: '🎨 Brand Assets', component: BrandHubPage },
      { id: 'campaign_ideator', label: '💡 Campaign Ideator', component: CampaignIdeatorPage },
      { id: 'image_designer', label: '🖼️ Image Designer', component: ImageDesignerPage },
      { id: 'video_generator', label: '🎥 Video Generator', component: VideoGeneratorPage },
      { id: 'customer_psychology', label: '🧠 Customer Insights', component: CustomerPsychologyPage },
      { id: 'content_strategy', label: '📝 Content Engine', component: ContentStrategyPage },
      { id: 'blog_generator', label: '✍️ SEO Writer', component: BlogGeneratorPage },
      { id: 'competitor_hub', label: '⚔️ Market Intel', component: CompetitorHubPage },
    ],
  },
  {
    id: 'marketing_sales',
    label: 'MARKETING & SALES',
    emoji: '📈',
    subItems: [
      { id: 'website', label: 'Landing Builder', component: WebsitePage },
      { id: 'leads', label: 'Lead CRM', component: LeadCRMPage },
      { id: 'deal_pipeline', label: 'Deal Pipeline', component: DealPipelinePage },
      { id: 'customers', label: 'Customer Directory', component: CustomerDirectoryPage },
      { id: 'campaigns', label: 'Campaigns', component: CampaignsPage },
      { id: 'content_calendar', label: 'Content Calendar', component: ContentCalendarPage },
      { id: 'instagram_ops', label: 'Instagram Ops', component: InstagramOpsPage },
    ],
  },
  {
    id: 'order_management',
    label: 'ORDERS & PRODUCTION',
    emoji: '📦',
    subItems: [
      { id: 'order_dashboard', label: '🧭 Pipeline Overview', component: OrderDashboardPage },
      { id: 'order_list_summary', label: '📋 Order Summary', component: OrderSummaryPage },
      { id: 'all_order_items', label: '📊 Line Items', component: AllOrderItemsPage },
      { id: 'order_list_products', label: '🎨 Product List', component: OrderListProductsPage },
      { id: 'design_board', label: '🎨 Design Workflow', component: DesignBoardPage },
      { id: 'pick_list_kanban', label: '👕 Inventory Pick', component: PickListKanbanPage },
      { id: 'production_screen', label: '🏭 Floor Control', component: ProductionScreenPage },
      { id: 'product_status_kanban', label: '📦 Global Kanban', component: ProductStatusKanbanPage },
    ],
  },
  {
    id: 'portfolio_management',
    label: 'STRATEGIC PORTFOLIO',
    emoji: '📂',
    subItems: [
      { id: 'strategic_initiatives', label: '⭐ Long-term Initiatives', component: StrategicInitiativesPage },
      { id: 'strategic_objectives', label: '🎯 Strategic Objectives', component: StrategicObjectivesPage },
      { id: 'goals', label: '🥅 Success Goals', component: GoalsPage },
      { id: 'quarterly_initiatives', label: '🗓️ Quarterly Sprints', component: QuarterlyInitiativesPage },
      { id: 'resource_allocation', label: '💸 Budget Matrix', component: ResourceAllocationBudgetPage },
      { id: 'programs', label: 'Programs', component: ProgramsPage },
      { id: 'projects', label: 'Projects', component: ProjectsPage },
      { id: 'tasks', label: 'Tasks', component: TasksPage },
      { id: 'milestones', label: 'Milestones', component: MilestonesPage },
    ],
  },
  {
    id: 'finance',
    label: 'FINANCE',
    emoji: '💰',
    subItems: [
      { id: 'invoices', label: 'Invoices', component: InvoicesPage },
      { id: 'expenses', label: 'Expenses', component: ExpensesPage },
      { id: 'pl_dashboard', label: 'P&L Dashboard', component: PLDashboardPage },
      { id: 'payroll', label: 'Payroll', component: PayrollPage },
      { id: 'financial_reports', label: 'Financial Reports', component: FinancialReportsPage },
    ],
  },
  {
    id: 'operations_inventory',
    label: 'INVENTORY & PROCUREMENT',
    emoji: '🧱',
    subItems: [
      { id: 'catalog', label: 'Product Catalog', component: CatalogPage },
      { id: 'stock_levels', label: 'Stock Levels', component: StockLevelsPage },
      { id: 'suppliers', label: 'Suppliers', component: SuppliersPage },
      { id: 'warehouses', label: 'Warehouses', component: WarehousesPage },
      { id: 'ppc_calculator', label: '💵 Pricing Engine', component: PPCPage },
    ],
  },
  {
    id: 'analytics',
    label: 'ANALYTICS',
    emoji: '📊',
    subItems: [
      { id: 'google_ads', label: 'Google Ads', component: GoogleAdsPage },
      { id: 'traffic_ga4', label: 'Traffic (GA4)', component: TrafficGA4Page },
      { id: 'ceo_dashboard_analytics', label: 'CEO Dashboard', component: CEODashboardPage },
    ],
  },
  {
    id: 'team',
    label: 'TEAM',
    emoji: '👥',
    subItems: [
      { id: 'workload', label: 'Workload', component: WorkloadPage },
      { id: 'sprint_board', label: 'Sprint Board', component: SprintBoardPage },
      { id: 'tech_decisions', label: 'Tech Decisions', component: TechDecisionsPage },
    ],
  },
  {
    id: 'admin',
    label: 'ADMIN',
    emoji: '⚙️',
    subItems: [
      { id: 'users_roles', label: 'Users & Roles', component: UsersRolesPage },
      { id: 'data_source_settings', label: 'Data Source Settings', component: DataSourceSettingsPage },
      { id: 'embedded_sheets', label: 'Embedded Sheets', component: EmbeddedSheetsPage },
      { id: 'sheet_schema', label: 'Sheet Schema', component: SheetSchemaPage },
      { id: 'all_modules_and_sections', label: 'System Site Map', component: AllModulesAndSectionsPage },
    ],
  },
];

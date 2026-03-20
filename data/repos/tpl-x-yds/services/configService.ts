/**
 * Sheet & Spreadsheet Configuration — from The-Design-Lab---TPL-X-YDS
 * Contains: Sheet registry, spreadsheet IDs, hydration mappings
 * PORT TO: server/config.js or server/services/sheets.js
 */

export enum SheetKey {
  // Execution Spreadsheet Sheets
  PEOPLE = 'PEOPLE & CAPACITY',
  TASKS = 'TASKS',
  PROJECTS = 'PROJECTS',
  CAMPAIGNS = 'CAMPAIGNS',
  EXECUTIVE_DASHBOARD = 'EXECUTIVE DASHBOARD',
  TIME_TRACKING = 'TIME TRACKING',

  // Strategy Spreadsheet Sheets
  BUSINESS_UNITS = 'BUSINESS UNITS',
  CUSTOMER_SEGMENT = 'CUSTOMER_SEGMENT',
  TOUCHPOINTS = 'TOUCHPOINTS',
  FLYWHEEL = 'FLYWHEEL',
  HUBS = 'HUB',
  APP_STORES = 'APP_STORES',

  // App Logging Sheets
  LOGIN = 'LOGIN',
  BRAIN_DUMP = 'BRAINDUMP',

  // Business Model Canvas Sheets
  BMC_SEGMENTS = 'segments',
  BMC_BUSINESS_UNITS = 'business_units',
  BMC_FLYWHEELS = 'flywheels',
  BMC_REVENUE_STREAMS = 'revenue_streams',
  BMC_COST_STRUCTURE = 'cost_structure',
  BMC_CHANNELS = 'channels',
  BMC_PLATFORMS = 'platforms',
  BMC_TEAM = 'team',
  BMC_HUBS = 'hubs',
  BMC_PARTNERS = 'partners',
  BMC_METRICS = 'metrics',
}

export enum SpreadsheetKey {
  STRATEGY = 'STRATEGY',
  EXECUTION = 'EXECUTION',
  APP_LOGGING = 'APP_LOGGING',
  BMC = 'BUSINESS_MODEL_CANVAS',
}

const STRATEGY_SHEET_ID = process.env.STRATEGY_SPREADSHEET_ID;
const EXECUTION_SHEET_ID = process.env.EXECUTION_SPREADSHEET_ID;
const APP_LOGGING_SHEET_ID = process.env.APP_LOGGING_SPREADSHEET_ID;
const BMC_SHEET_ID = process.env.BUSINESS_MODEL_CANVAS_SPREADSHEET_ID;

if (!STRATEGY_SHEET_ID || !EXECUTION_SHEET_ID || !APP_LOGGING_SHEET_ID || !BMC_SHEET_ID) {
  throw new Error("Spreadsheet IDs are not configured in process.env");
}

export const SPREADSHEET_CONFIG = {
  [SpreadsheetKey.STRATEGY]: STRATEGY_SHEET_ID,
  [SpreadsheetKey.EXECUTION]: EXECUTION_SHEET_ID,
  [SpreadsheetKey.APP_LOGGING]: APP_LOGGING_SHEET_ID,
  [SpreadsheetKey.BMC]: BMC_SHEET_ID,
};

export interface SheetConfig {
  spreadsheetKey: SpreadsheetKey;
  sheetName: string;
  gid: string;
}

export const SHEET_REGISTRY: { [key in SheetKey]: SheetConfig } = {
  // Execution Sheets
  [SheetKey.PROJECTS]: { spreadsheetKey: SpreadsheetKey.EXECUTION, sheetName: 'PROJECTS', gid: '784960017' },
  [SheetKey.TASKS]: { spreadsheetKey: SpreadsheetKey.EXECUTION, sheetName: 'TASKS', gid: '268128158' },
  [SheetKey.PEOPLE]: { spreadsheetKey: SpreadsheetKey.EXECUTION, sheetName: 'PEOPLE & CAPACITY', gid: '40806932' },
  [SheetKey.CAMPAIGNS]: { spreadsheetKey: SpreadsheetKey.EXECUTION, sheetName: 'CAMPAIGNS', gid: '2052586943' },
  [SheetKey.EXECUTIVE_DASHBOARD]: { spreadsheetKey: SpreadsheetKey.EXECUTION, sheetName: 'EXECUTIVE DASHBOARD', gid: '1902780278' },
  [SheetKey.TIME_TRACKING]: { spreadsheetKey: SpreadsheetKey.EXECUTION, sheetName: 'TIME TRACKING', gid: '1450207772' },

  // Strategy Sheets
  [SheetKey.BUSINESS_UNITS]: { spreadsheetKey: SpreadsheetKey.STRATEGY, sheetName: 'BUSINESS UNITS', gid: '0' },
  [SheetKey.FLYWHEEL]: { spreadsheetKey: SpreadsheetKey.STRATEGY, sheetName: 'Flywheel', gid: '225662612' },
  [SheetKey.HUBS]: { spreadsheetKey: SpreadsheetKey.STRATEGY, sheetName: 'Hub', gid: '1390706317' },
  [SheetKey.CUSTOMER_SEGMENT]: { spreadsheetKey: SpreadsheetKey.STRATEGY, sheetName: 'Customer Segment & foundation', gid: '1469082015' },
  [SheetKey.TOUCHPOINTS]: { spreadsheetKey: SpreadsheetKey.STRATEGY, sheetName: 'TOUCHPOINTS', gid: '1839538407' },
  [SheetKey.APP_STORES]: { spreadsheetKey: SpreadsheetKey.STRATEGY, sheetName: 'APP STORES', gid: '1447819195' },

  // App Logging Sheets
  [SheetKey.LOGIN]: { spreadsheetKey: SpreadsheetKey.APP_LOGGING, sheetName: 'Login', gid: '288121377' },
  [SheetKey.BRAIN_DUMP]: { spreadsheetKey: SpreadsheetKey.APP_LOGGING, sheetName: 'BrainDump', gid: '0' },

  // Business Model Canvas Sheets
  [SheetKey.BMC_SEGMENTS]: { spreadsheetKey: SpreadsheetKey.BMC, sheetName: 'segments', gid: '1306312699' },
  [SheetKey.BMC_BUSINESS_UNITS]: { spreadsheetKey: SpreadsheetKey.BMC, sheetName: 'business_units', gid: '1781583811' },
  [SheetKey.BMC_FLYWHEELS]: { spreadsheetKey: SpreadsheetKey.BMC, sheetName: 'flywheels', gid: '1180180195' },
  [SheetKey.BMC_REVENUE_STREAMS]: { spreadsheetKey: SpreadsheetKey.BMC, sheetName: 'revenue_streams', gid: '1625184466' },
  [SheetKey.BMC_COST_STRUCTURE]: { spreadsheetKey: SpreadsheetKey.BMC, sheetName: 'cost_structure', gid: '1493870932' },
  [SheetKey.BMC_CHANNELS]: { spreadsheetKey: SpreadsheetKey.BMC, sheetName: 'channels', gid: '715227562' },
  [SheetKey.BMC_PLATFORMS]: { spreadsheetKey: SpreadsheetKey.BMC, sheetName: 'platforms', gid: '1300146116' },
  [SheetKey.BMC_TEAM]: { spreadsheetKey: SpreadsheetKey.BMC, sheetName: 'team', gid: '1710233820' },
  [SheetKey.BMC_HUBS]: { spreadsheetKey: SpreadsheetKey.BMC, sheetName: 'hubs', gid: '906330339' },
  [SheetKey.BMC_PARTNERS]: { spreadsheetKey: SpreadsheetKey.BMC, sheetName: 'partners', gid: '898629063' },
  [SheetKey.BMC_METRICS]: { spreadsheetKey: SpreadsheetKey.BMC, sheetName: 'metrics', gid: '439308533' },
};

export interface HydrationMapping {
  sourceSheet: SheetKey;
  sourceColumnId: string;
  targetSheet: SheetKey;
  targetColumnId: string;
  displayColumn: string;
}

export const HYDRATION_MAP: HydrationMapping[] = [
  // PROJECTS Mappings
  { sourceSheet: SheetKey.PROJECTS, sourceColumnId: 'owner_User_id', targetSheet: SheetKey.PEOPLE, targetColumnId: 'User_id', displayColumn: 'full_name' },
  { sourceSheet: SheetKey.PROJECTS, sourceColumnId: 'business_unit_id', targetSheet: SheetKey.BUSINESS_UNITS, targetColumnId: 'bu_id', displayColumn: 'bu_name' },

  // TASKS Mappings
  { sourceSheet: SheetKey.TASKS, sourceColumnId: 'Project id', targetSheet: SheetKey.PROJECTS, targetColumnId: 'project_id', displayColumn: 'Project Name' },
  { sourceSheet: SheetKey.TASKS, sourceColumnId: 'assignee_User_id', targetSheet: SheetKey.PEOPLE, targetColumnId: 'User_id', displayColumn: 'full_name' },
  { sourceSheet: SheetKey.TASKS, sourceColumnId: 'reporter_User_id', targetSheet: SheetKey.PEOPLE, targetColumnId: 'User_id', displayColumn: 'full_name' },

  // TOUCHPOINTS Mappings
  { sourceSheet: SheetKey.TOUCHPOINTS, sourceColumnId: 'bu_id', targetSheet: SheetKey.BUSINESS_UNITS, targetColumnId: 'bu_id', displayColumn: 'bu_name' },

  // BUSINESS_UNITS Mappings
  { sourceSheet: SheetKey.BUSINESS_UNITS, sourceColumnId: 'owner_User_id', targetSheet: SheetKey.PEOPLE, targetColumnId: 'User_id', displayColumn: 'full_name' },
  { sourceSheet: SheetKey.BUSINESS_UNITS, sourceColumnId: 'primary_flywheel_id', targetSheet: SheetKey.FLYWHEEL, targetColumnId: 'flywheel_id', displayColumn: 'flywheel_name' },

  // PEOPLE Mappings
  { sourceSheet: SheetKey.PEOPLE, sourceColumnId: 'manager_id', targetSheet: SheetKey.PEOPLE, targetColumnId: 'User_id', displayColumn: 'full_name' },

  // BMC_BUSINESS_UNITS Mappings
  { sourceSheet: SheetKey.BMC_BUSINESS_UNITS, sourceColumnId: 'primarySegments', targetSheet: SheetKey.BMC_SEGMENTS, targetColumnId: 'segmentId', displayColumn: 'segmentName' },
  { sourceSheet: SheetKey.BMC_BUSINESS_UNITS, sourceColumnId: 'flywheelId', targetSheet: SheetKey.BMC_FLYWHEELS, targetColumnId: 'flywheelId', displayColumn: 'flywheelName' },
  { sourceSheet: SheetKey.BMC_BUSINESS_UNITS, sourceColumnId: 'primaryOwner', targetSheet: SheetKey.BMC_TEAM, targetColumnId: 'personId', displayColumn: 'fullName' },

  // BMC_FLYWHEELS Mappings
  { sourceSheet: SheetKey.BMC_FLYWHEELS, sourceColumnId: 'serves', targetSheet: SheetKey.BMC_SEGMENTS, targetColumnId: 'segmentId', displayColumn: 'segmentName' },

  // BMC_REVENUE_STREAMS Mappings
  { sourceSheet: SheetKey.BMC_REVENUE_STREAMS, sourceColumnId: 'businessUnitId', targetSheet: SheetKey.BMC_BUSINESS_UNITS, targetColumnId: 'businessUnitId', displayColumn: 'businessUnitName' },
  { sourceSheet: SheetKey.BMC_REVENUE_STREAMS, sourceColumnId: 'segmentId', targetSheet: SheetKey.BMC_SEGMENTS, targetColumnId: 'segmentId', displayColumn: 'segmentName' },

  // BMC_COST_STRUCTURE Mappings
  { sourceSheet: SheetKey.BMC_COST_STRUCTURE, sourceColumnId: 'owner', targetSheet: SheetKey.BMC_TEAM, targetColumnId: 'personId', displayColumn: 'fullName' },

  // BMC_CHANNELS Mappings
  { sourceSheet: SheetKey.BMC_CHANNELS, sourceColumnId: 'platformId', targetSheet: SheetKey.BMC_PLATFORMS, targetColumnId: 'platformId', displayColumn: 'platformName' },
  { sourceSheet: SheetKey.BMC_CHANNELS, sourceColumnId: 'servesSegments', targetSheet: SheetKey.BMC_SEGMENTS, targetColumnId: 'segmentId', displayColumn: 'segmentName' },
  { sourceSheet: SheetKey.BMC_CHANNELS, sourceColumnId: 'flywheelId', targetSheet: SheetKey.BMC_FLYWHEELS, targetColumnId: 'flywheelId', displayColumn: 'flywheelName' },

  // BMC_PLATFORMS Mappings
  { sourceSheet: SheetKey.BMC_PLATFORMS, sourceColumnId: 'owner', targetSheet: SheetKey.BMC_TEAM, targetColumnId: 'personId', displayColumn: 'fullName' },

  // BMC_TEAM Mappings
  { sourceSheet: SheetKey.BMC_TEAM, sourceColumnId: 'primaryHub', targetSheet: SheetKey.BMC_HUBS, targetColumnId: 'hubId', displayColumn: 'hubName' },
  { sourceSheet: SheetKey.BMC_TEAM, sourceColumnId: 'ownsBusinessUnits', targetSheet: SheetKey.BMC_BUSINESS_UNITS, targetColumnId: 'businessUnitId', displayColumn: 'businessUnitName' },

  // BMC_HUBS Mappings
  { sourceSheet: SheetKey.BMC_HUBS, sourceColumnId: 'primaryOwner', targetSheet: SheetKey.BMC_TEAM, targetColumnId: 'personId', displayColumn: 'fullName' },

  // BMC_METRICS Mappings
  { sourceSheet: SheetKey.BMC_METRICS, sourceColumnId: 'owner', targetSheet: SheetKey.BMC_TEAM, targetColumnId: 'personId', displayColumn: 'fullName' },
];

export const CONFIG_SERVICE = {
  SPREADSHEET_CONFIG,
  SHEET_REGISTRY,
  HYDRATION_MAP,
};

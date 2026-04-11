
import { useCallback, useState } from 'react'
import useSWR from 'swr'
import {
  BusinessModelCanvasData,
  Partner, PartnerStatus, PartnerRiskLevel,
  CustomerSegment, CustomerSegmentStatus,
  Channel,
  RevenueStream,
  Cost, CostType,
  BusinessUnit,
  Flywheel,
  Platform, PlatformType, PlatformStatus,
  TeamMember,
  Hub,
  Metric, MetricCategory, MetricStatus,
  GapAction, GapActionPriority, GapActionStatus,
  ValueProposition,
  KeyActivity, CustomerRelationship, KeyResource,
  Strategy,
  BMCSheetConfigItem
} from '../types'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { fetchValues, updateValues, appendValues, fetchHeaders } from '../lib/sheets'
import { parseSheetDataToBmc, parseNumber, mapToEnum, parseObjectListSection } from '../services/bmcSheetsParser'
import { analyzeBusinessModelCanvas } from '../services/geminiService'
import { mockBmcData } from '../lib/mockData'
import { bmcRegistry } from '../lib/dataRegistry'


// Configuration for sections that are not yet refactored to the new registry.
export const BMC_SHEET_CONFIGS: BMCSheetConfigItem<any>[] = [
  {
    spreadsheetId: '1eh1jb2Dk-5SdnRMkXvq51cK_P8Zc33LUPYlxWnzm2fs', // YDC - Business model canvas
    sectionKey: 'keyPartners',
    sheetName: 'partners',
    gid: '898629063',
    headerRow: 1,
    fieldToHeaderMap: {
      id: 'partnerId',
      name: 'partnerName',
      partnerType: 'partnerType',
      role: 'role',
      criticalityLevel: 'criticalityLevel',
      riskLevel: 'riskLevel',
      status: 'status',
      contractTerms: 'contractTerms',
      backupOptions: 'backupOptions',
      serves_segments: 'serves_segments',
      enables_resources: 'enables_resources',
      enables_activities: 'enables_activities',
      ownerHub: 'ownerHub',
      ownerPerson: 'ownerPerson',
      notes: 'notes',
    } as Partial<Record<keyof Partner, string>>,
    transform: (key: keyof Partner, value: string) => {
      if (key === 'riskLevel') return mapToEnum(value, PartnerRiskLevel)
      if (key === 'status') return mapToEnum(value, PartnerStatus)
      return value
    },
  },
  {
    spreadsheetId: '1eh1jb2Dk-5SdnRMkXvq51cK_P8Zc33LUPYlxWnzm2fs', // YDC - Business model canvas
    sectionKey: 'keyActivities',
    sheetName: 'KEY ACTIVITIES',
    gid: '2052629348',
    headerRow: 1,
    isSimpleList: false,
    fieldToHeaderMap: {
      id: 'activityId',
      category: 'activityCategory',
      name: 'activityName',
      frequency: 'frequency',
      ownerHub: 'ownerHub',
      ownerPerson: 'ownerPerson',
      automationLevel: 'automationLevel',
      scaleRequirement: 'scaleRequirement',
      serves_segments: 'serves_segments',
      enables_flywheels: 'enables_flywheels',
      serves_bus: 'serves_bus',
      criticality: 'criticality',
      current_performance: 'current_performance',
      target_performance: 'target_performance',
      investment_needed: 'investment_needed',
      notes: 'notes',
    } as Partial<Record<keyof KeyActivity, string>>,
  },
  {
    spreadsheetId: '1eh1jb2Dk-5SdnRMkXvq51cK_P8Zc33LUPYlxWnzm2fs', // YDC - Business model canvas
    sectionKey: 'valuePropositions',
    sheetName: 'VALUE_Proposition',
    gid: '597388903',
    headerRow: 1,
    isSimpleList: false,
    fieldToHeaderMap: {
      id: 'valuePropositionId',
      category: 'category',
      description: 'valueProposition',
      benefitsOffered: 'benefitsOffered',
      painPointsSolved: 'painPointsSolved',
      productServiceOffering: 'productServiceOffering',
      differentiators: 'differentiators',
      serves_segments: 'serves_segments',
      serves_flywheels: 'serves_flywheels',
      priority: 'priority',
      validation_status: 'validation_status',
      owner_person_id: 'owner_person_id',
      notes: 'notes',
    } as Partial<Record<keyof ValueProposition, string>>,
  },
  {
    spreadsheetId: '1eh1jb2Dk-5SdnRMkXvq51cK_P8Zc33LUPYlxWnzm2fs', // YDC - Business model canvas
    sectionKey: 'customerRelations',
    sheetName: 'CUSTOMER_RELATIONSHIPS',
    gid: '1393913684',
    headerRow: 1,
    isSimpleList: false,
    fieldToHeaderMap: {
      id: 'relationshipId',
      type: 'relationshipType',
      relationshipName: 'relationshipName',
      acquisitionStrategy: 'acquisitionStrategy',
      activationMechanism: 'activationMechanism',
      retentionStrategy: 'retentionStrategy',
      automationLevel: 'automationLevel',
      touchPoints: 'touchPoints',
      serves_segments: 'serves_segments',
      serves_flywheels: 'serves_flywheels',
      serves_bus: 'serves_bus',
      cost_per_customer: 'cost_per_customer',
      owner_hub_id: 'owner_hub_id',
      owner_person_id: 'owner_person_id',
      notes: 'notes',
    } as Partial<Record<keyof CustomerRelationship, string>>,
  },
  {
    spreadsheetId: '1eh1jb2Dk-5SdnRMkXvq51cK_P8Zc33LUPYlxWnzm2fs', // YDC - Business model canvas
    sectionKey: 'keyResources',
    sheetName: 'KEY RESOURCES',
    gid: '837689058',
    headerRow: 1,
    isSimpleList: false,
    fieldToHeaderMap: {
      id: 'resourceId',
      type: 'resourceType',
      name: 'resourceName',
      ownershipModel: 'ownershipModel',
      criticalityLevel: 'criticalityLevel',
      scalability: 'scalability',
      currentCapacity: 'currentCapacity',
      scaleLimitCapacity: 'scaleLimitCapacity',
      investmentNeeded: 'investmentNeeded',
      serves_segments: 'serves_segments',
      enables_flywheels: 'enables_flywheels',
      owner_hub_id: 'owner_hub_id',
      owner_person_id: 'owner_person_id',
      status: 'status',
      notes: 'notes',
    } as Partial<Record<keyof KeyResource, string>>,
  },
  {
    spreadsheetId: '1HXIoXZLDzXtB7aOy23AapoHhP8xgLxm_K8VcQ2KPvsY', // YDC - Strategy
    sectionKey: 'channels',
    sheetName: 'Channels',
    gid: '2050534733',
    headerRow: 1,
    fieldToHeaderMap: {
      id: 'channel_id',
      name: 'channel_name',
      type: 'channel_type',
      platformId: 'serves_primary_platform_ids',
      platformName: 'Platform',
      servesSegments: 'segments_arrayed',
      flywheelId: 'serves_flywheels',
      servesBUs: 'serves_bus',
      monthlyBudgetInr: 'monthly_budget_inr',
      currentCac: 'current_cac',
      cacGap: 'cac_gap',
      conversionRatePct: 'conversion_rate_pct',
      responsiblePerson: 'responsible_person',
      responsiblePersonName: 'responsible_person_Name',
      status: 'status',
      monthlyVolume: 'Monthly_Volume',
      annualRevenue: 'Annual_Revenue',
      notes: 'Notes',
      ltv: 'LTV',
      roi: 'ROI',
    } as Partial<Record<keyof Channel, string>>,
    transform: (key: keyof Channel, value: string) => {
      if (['monthlyBudgetInr', 'currentCac', 'conversionRatePct'].includes(key as string)) {
        return parseNumber(value);
      }
      return value
    },
  },
  {
    spreadsheetId: '1eh1jb2Dk-5SdnRMkXvq51cK_P8Zc33LUPYlxWnzm2fs', // YDC - Business model canvas
    sectionKey: 'revenueStreams',
    sheetName: 'revenue_streams',
    gid: '1625184466',
    headerRow: 1,
    fieldToHeaderMap: {
      id: 'revenueStreamId',
      streamName: 'streamName',
      revenueModel: 'revenueModel',
      pricingStrategy: 'pricingStrategy',
      segmentId: 'serves_segments',
      enables_flywheels: 'enables_flywheels',
      serves_bus: 'serves_bus',
      nineMonthRevenue: 'currentRevenue_annual',
      targetRevenue_Mar2026: 'targetRevenue_Mar2026',
      growthRequired_multiplier: 'growthRequired_multiplier',
      aov: 'avgOrderValue',
      grossMargin: 'avgMargin_pct',
      volumeMetric: 'volumeMetric',
      conversionMetric: 'conversionMetric',
      status: 'status',
      notes: 'notes',
    } as Partial<Record<keyof RevenueStream, string>>,
    transform: (key: keyof RevenueStream, value: string) => {
      if (['aov', 'grossMargin', 'nineMonthRevenue'].includes(key as string)) {
        return parseNumber(value)
      }
      return value
    },
  },
  {
    spreadsheetId: '1eh1jb2Dk-5SdnRMkXvq51cK_P8Zc33LUPYlxWnzm2fs', // YDC - Business model canvas
    sectionKey: 'costStructure',
    sheetName: 'cost_structure',
    gid: '1493870932',
    headerRow: 1,
    fieldToHeaderMap: {
      id: 'costId',
      category: 'costCategory',
      costName: 'costName',
      type: 'costType',
      monthlyAmount: 'currentCost_monthly',
      annualAmount: 'currentCost_annual',
      scaleProfile: 'scaleProfile',
      driverMetric: 'driverMetric',
      serves_segments: 'serves_segments',
      enables_flywheels: 'enables_flywheels',
      enables_activities: 'enables_activities',
      ownerHub: 'ownerHub',
      owner: 'ownerPerson',
      status: 'status',
      notes: 'notes',
    } as Partial<Record<keyof Cost, string>>,
    transform: (key: keyof Cost, value: string) => {
      if (['monthlyAmount', 'annualAmount'].includes(key as string)) return parseNumber(value)
      if (key === 'type') return mapToEnum(value, CostType)
      return value
    },
  },
  {
    spreadsheetId: '1HXIoXZLDzXtB7aOy23AapoHhP8xgLxm_K8VcQ2KPvsY', // YDC - Strategy
    sectionKey: 'businessUnits',
    sheetName: 'BusinessUnits',
    gid: '1410852755',
    headerRow: 1,
    fieldToHeaderMap: {
      id: 'bu_id',
      name: 'bu_name',
      coreOffering: 'offering_description',
      primarySegments: 'serves_segments_ids',
      flywheelId: 'primary_flywheel_id',
      volumeRange: 'order_volume_range',
      primaryOwner: 'owner_rollup_name',
      nineMonthRevenue: '9mo_actual_revenue_inr',
      percentRevenue: 'revenue_share',
      pricingModel: 'pricing_model_name',
      notes: 'notes',
      buType: 'bu_type',
      salesMotion: 'sales_motion',
      supportModel: 'support_model',
      monthlyCapacityOrders: 'monthly_capacity_orders',
      productionSlaHours: 'production_sla_hours',
      status: 'status',
      validatedAov: 'validated_aov',
      nineMonthActualOrders: '9mo_actual_orders',
      annualRevenueTargetInr: 'annual_revenue_target_inr',
      annualOrdersTarget: 'annual_orders_target',
      grossMarginPct: 'gross_margin_pct',
      variableCostPerOrder: 'variable_cost_per_order',
      fixedCostsMonthly: 'fixed_costs_monthly',
      breakEvenOrders: 'break_even_orders',
    } as Partial<Record<keyof BusinessUnit, string>>,
    transform: (key: keyof BusinessUnit, value: string) => {
      if (['nineMonthRevenue', 'monthlyCapacityOrders', 'productionSlaHours', 'validatedAov', 'nineMonthActualOrders', 'annualRevenueTargetInr', 'annualOrdersTarget', 'grossMarginPct', 'variableCostPerOrder', 'fixedCostsMonthly', 'breakEvenOrders'].includes(key as string)) {
        return parseNumber(value);
      }
      return value
    },
  },
  {
    spreadsheetId: '1HXIoXZLDzXtB7aOy23AapoHhP8xgLxm_K8VcQ2KPvsY', // YDC - Strategy
    sectionKey: 'flywheels',
    sheetName: 'Flywheels',
    gid: '294604957',
    headerRow: 1,
    fieldToHeaderMap: {
      id: 'flywheel_id',
      name: 'flywheel_name',
      customerStruggleSolved: 'customer_struggle',
      acquisitionModel: 'acquisition_channels',
      serviceModel: 'service_model',
      servesSegments: 'serves_segments',
      keyMetrics: 'efficiency_metrics',
      jtbdTriggerMoment: 'jtbd_trigger_moment',
      motionSequence: 'motion_sequence',
      primaryBottleneck: 'primary_bottleneck',
      servesBus: 'serves_bus',
      orderSizeRange: 'order_size_range',
      ownerPerson: 'owner_person',
      ownerPersonName: 'owner_person_Name',
      cacTarget: 'cac_target',
      validationStatus: 'validation_status',
      nineMonthActualRevenueInr: '9mo_actual_revenue_inr',
      nineMonthActualOrders: '9mo_actual_orders',
      validatedAovInr: 'validated_aov_inr',
      annualRevenueTargetInr: 'annual_revenue_target_inr',
      annualOrdersTarget: 'annual_orders_target',
      conversionRatePct: 'conversion_rate_pct',
      reorderRate6moPct: 'reorder_rate_6mo_pct',
      avgSaleCycleDays: 'avg_sale_cycle_days',
    } as Partial<Record<keyof Flywheel, string>>,
    transform: (key: keyof Flywheel, value: string) => {
      if (['cacTarget', 'nineMonthActualRevenueInr', 'nineMonthActualOrders', 'validatedAovInr', 'annualRevenueTargetInr', 'annualOrdersTarget', 'conversionRatePct', 'avgSaleCycleDays'].includes(key as string)) {
        return parseNumber(value);
      }
      return value;
    },
  },
  {
    spreadsheetId: '1HXIoXZLDzXtB7aOy23AapoHhP8xgLxm_K8VcQ2KPvsY', // YDC - Strategy
    sectionKey: 'platforms',
    sheetName: 'Platforms',
    gid: '1976934144',
    headerRow: 1,
    fieldToHeaderMap: {
      id: 'platform_id',
      name: 'platform_name',
      type: 'platform_type',
      ownerHub: 'owner_hub',
      techStack: 'tech_stack',
      platformIconUrl: 'platform_icon_url',
      platformLinkUrl: 'platform_link_url',
      currentRevenue: 'Current_revenue',
      currentOrders: 'Current_Orders',
      currentCustomers: 'Curent_customers',
      currentAov: 'Current_AOV',
      revenueShare: 'Revenue_share',
      annualRevenueTargetInr: 'annual_revenue_target_inr',
      annualOrdersTarget: 'annual_orders_target',
      growthRateNeeded: 'Growth_rate_needed',
    } as Partial<Record<keyof Platform, string>>,
    transform: (key: keyof Platform, value: string) => {
      if (key === 'type') return mapToEnum(value, PlatformType)
      return value
    },
  },
  {
    spreadsheetId: '1HXIoXZLDzXtB7aOy23AapoHhP8xgLxm_K8VcQ2KPvsY', // YDC - Strategy
    sectionKey: 'team',
    sheetName: 'People',
    gid: '1401300909',
    headerRow: 1,
    fieldToHeaderMap: {
      id: 'user_id',
      fullName: 'full_name',
      role: 'role_title',
      primaryHub: 'primary_hub',
      ownsBusinessUnits: 'owns_bus_ids',
      keyResponsibility: 'primary_okrs',
      notes: 'notes',
      primaryHubName: 'primary_hub_name',
      ownsFlywheelsIds: 'owns_flywheels_ids',
      ownsSegmentsIds: 'owns_segments_ids',
      annualCompInr: 'annual_comp_inr',
      capacityUtilizationPct: 'capacity_utilization_pct',
      email: 'email',
      phone: 'phone',
      department: 'department',
      managerId: 'manager_id',
      employmentType: 'employment_type',
      weeklyHoursCapacity: 'weekly_hours_capacity',
      location: 'location',
    } as Partial<Record<keyof TeamMember, string>>,
    transform: (key: keyof TeamMember, value: string) => {
      if (['annualCompInr', 'capacityUtilizationPct', 'weeklyHoursCapacity'].includes(key as string)) {
        return parseNumber(value);
      }
      return value;
    },
  },
  {
    spreadsheetId: '1HXIoXZLDzXtB7aOy23AapoHhP8xgLxm_K8VcQ2KPvsY', // YDC - Strategy
    sectionKey: 'hubs',
    sheetName: 'Hubs',
    gid: '1497542620',
    headerRow: 1,
    fieldToHeaderMap: {
      id: 'hub_id',
      name: 'hub_name',
      type: 'hub_type',
      primaryOwner: 'owner_person_name',
      notes: 'note',
      ownerPerson: 'owner_person',
      status: 'status',
      costCenterOrProfit: 'cost_center_or_profit',
      interfacesOwned: 'interfaces_owned',
      channelsOwned: 'channels_owned',
      primaryBottleneck: 'primary_bottleneck',
      scaleTriggerPoint: 'scale_trigger_point',
    } as Partial<Record<keyof Hub, string>>,
    transform: (key: keyof Hub, value: string) => {
      return value
    },
  },
  {
    spreadsheetId: '1eh1jb2Dk-5SdnRMkXvq51cK_P8Zc33LUPYlxWnzm2fs', // YDC - Business model canvas
    sectionKey: 'metrics',
    sheetName: 'metrics',
    gid: '439308533',
    headerRow: 1,
    fieldToHeaderMap: {
      id: 'metricId',
      name: 'metricName',
      category: 'category',
      currentValue: 'currentValue',
      status: 'status',
      target: 'target',
      owner: 'owner',
      notes: 'notes',
    } as Partial<Record<keyof Metric, string>>,
    transform: (key: keyof Metric, value: string) => {
      if (key === 'category') return mapToEnum(value, MetricCategory)
      if (key === 'status') return mapToEnum(value, MetricStatus)
      return value
    },
  },
  {
    spreadsheetId: '1eh1jb2Dk-5SdnRMkXvq51cK_P8Zc33LUPYlxWnzm2fs', // YDC - Business model canvas
    sectionKey: 'gapsActions',
    sheetName: 'gaps_actions',
    gid: '882684364',
    headerRow: 1,
    fieldToHeaderMap: {
      id: 'gapId',
      name: 'gapName',
      priority: 'priority',
      impact: 'impact',
      actionRequired: 'actionRequired',
      owner: 'owner',
      timeline: 'timeline',
      status: 'status',
      notes: 'notes',
    } as Partial<Record<keyof GapAction, string>>,
    transform: (key: keyof GapAction, value: string) => {
      if (key === 'priority') return mapToEnum(value, GapActionPriority)
      if (key === 'status') return mapToEnum(value, GapActionStatus)
      return value
    },
  },
]


const bmcDataFetcher = async (key: string, isSignedIn: boolean, isMockMode: boolean) => {
  if (isMockMode) {
    console.log("SWR: Loading mock BMC data.");
    return mockBmcData;
  }
  if (!isSignedIn) {
    throw new Error("Please sign in to load data.");
  }
  
  const allConfigs = [...BMC_SHEET_CONFIGS, ...Object.values(bmcRegistry)];
  const allSheetValues: Record<string, string[][]> = {};
  const failedTabs: string[] = [];
  const missingIds: string[] = [];

  const uniqueSheetsToFetch = allConfigs.reduce((acc, config) => {
    if (config.spreadsheetId) {
        const key = `${config.spreadsheetId}__${config.sheetName}`;
        if (!acc[key]) {
            acc[key] = {
                spreadsheetId: config.spreadsheetId,
                sheetName: config.sheetName,
                range: `${config.sheetName}!A:AZ`, // Fetch wide range
            };
        }
    } else {
        missingIds.push(`${String(config.sectionKey)} (Sheet: ${config.sheetName})`);
    }
    return acc;
  }, {} as Record<string, { spreadsheetId: string; sheetName: string, range: string }>);

  await Promise.all(Object.values(uniqueSheetsToFetch).map(async (sheetInfo) => {
      try {
          const response = await fetchValues(sheetInfo.spreadsheetId, sheetInfo.range);
          if (response.values && response.values.length > 0) {
              allSheetValues[sheetInfo.sheetName] = response.values;
          }
      } catch (tabError: any) {
          console.error(`Failed to fetch data for tab '${sheetInfo.sheetName}' from spreadsheet '${sheetInfo.spreadsheetId}':`, tabError);
          failedTabs.push(sheetInfo.sheetName);
      }
  }));

  if (missingIds.length > 0) {
    throw new Error(`The following BMC sections have missing spreadsheet IDs in their configuration: ${missingIds.join(', ')}.`);
  }

  if (Object.keys(allSheetValues).length === 0 && failedTabs.length > 0) {
    throw new Error(`No data could be loaded from any of the expected tabs. Check spreadsheet IDs, tab names, and share permissions.`);
  }
  
  // Parse refactored sections from registry
  const segmentsSpec = bmcRegistry.segments;
  const segmentsData = allSheetValues[segmentsSpec.sheetName] ? parseObjectListSection(allSheetValues[segmentsSpec.sheetName], segmentsSpec) : [];

  const strategySpec = bmcRegistry['vision-mission-values'];
  const strategySheetData = allSheetValues[strategySpec.sheetName];
  let strategyData: Strategy | null = null;
  if(strategySheetData && strategySheetData.length > 1) {
    const strategyRow = strategySheetData[strategySpec.headerRow]; // Data is in the row after header
    const headers = strategySheetData[strategySpec.headerRow - 1];
    const strategyObj: Partial<Strategy> = { id: 'STRATEGY-GLOBAL' };
    headers.forEach((header, index) => {
        const field = Object.keys(strategySpec.fieldToHeaderMap).find(key => strategySpec.fieldToHeaderMap[key as keyof Strategy] === header);
        if (field) {
            (strategyObj as any)[field] = strategyRow[index];
        }
    });
    strategyData = strategyObj as Strategy;
  }
  
  // Parse legacy sections
  const legacyData = parseSheetDataToBmc(allSheetValues, BMC_SHEET_CONFIGS);

  // Merge everything
  const finalData = {
    ...legacyData,
    customerSegments: segmentsData,
    strategy: strategyData,
  };

  return finalData;
};


export const useBmc = () => {
  const { isSignedIn, isMockMode } = useAuth();
  const { addToast } = useToast();

  const { data, error, isLoading, mutate } = useSWR(
    ['bmcData', isSignedIn, isMockMode],
    ([key, isSignedIn, isMockMode]) => bmcDataFetcher(key, isSignedIn, isMockMode),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false
    }
  );

  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);

  const analyzeCanvas = useCallback(async (): Promise<string | null> => {
    if (!data) {
      addToast("No canvas data to analyze.", "info");
      return null;
    }
    setIsAnalyzingAI(true);
    setAiAnalysisResult(null);
    try {
      const result = await analyzeBusinessModelCanvas(data);
      setAiAnalysisResult(result);
      return result;
    } catch (err: any) {
      console.error("AI analysis failed:", err);
      addToast(err.message || "Failed to perform AI analysis.", "error");
      return null;
    } finally {
      setIsAnalyzingAI(false);
    }
  }, [data, addToast]);

  const clearAnalysis = () => setAiAnalysisResult(null);

  const addBmcItem = useCallback(async (sectionKey: keyof BusinessModelCanvasData, itemData: any) => {
    const allConfigs = [...Object.values(bmcRegistry), ...BMC_SHEET_CONFIGS];
    const config = allConfigs.find(c => c.sectionKey === sectionKey);
    if (!config || !config.fieldToHeaderMap) throw new Error(`Configuration not found for section: ${sectionKey}`);
    if (!config.spreadsheetId) throw new Error(`Spreadsheet ID not configured for section: ${sectionKey}`);

    if (config.isKeyValue) {
      throw new Error(`Adding new items directly to key-value section '${sectionKey}' is not supported. Use update for 'strategy'.`);
    }

    const headers = await fetchHeaders(config.spreadsheetId, `${config.sheetName}!A:AZ`, config.headerRow);

    const newId = itemData.id || `generated-${String(sectionKey).substring(0,3).toUpperCase()}-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    const itemWithId = { ...itemData, id: newId };

    const rowData = headers.map(header => {
      const fieldKey = Object.keys(config.fieldToHeaderMap).find(key => config.fieldToHeaderMap[key as keyof typeof config.fieldToHeaderMap] === header);
      let value = '';
      if (fieldKey) {
          const itemValue = (itemWithId as any)[fieldKey];
          if (Array.isArray(itemValue)) {
              value = itemValue.join(', '); // Join array values with comma for Google Sheets
          } else if (itemValue !== undefined && itemValue !== null) {
              value = String(itemValue);
          }
      }
      return value;
    });

    try {
        await appendValues(config.spreadsheetId, config.sheetName, [rowData]);
        addToast(`${String(sectionKey).charAt(0).toUpperCase() + String(sectionKey).slice(1)} added successfully! Refreshing...`, 'success');
        await mutate(); // Refresh data in SWR cache
    } catch (err: any) {
        addToast(`Failed to add item: ${err.message}`, 'error');
        throw err;
    }
  }, [addToast, mutate, data]);

  const updateBmcItem = useCallback(async (sectionKey: keyof BusinessModelCanvasData, item: any) => {
    if (!data) throw new Error("Data not available for update.");
    if (!item.id && sectionKey !== 'strategy') throw new Error("Item must have an ID to be updated.");
  
    // Find config from either the new registry or the old configs
    const allConfigs = [...Object.values(bmcRegistry), ...BMC_SHEET_CONFIGS];
    const config = allConfigs.find(c => c.sectionKey === sectionKey);
    if (!config || !config.fieldToHeaderMap) throw new Error(`Configuration not found for section: ${sectionKey}`);
    if (!config.spreadsheetId) throw new Error(`Spreadsheet ID not configured for section: ${sectionKey}`);
  
    let rowNumber: number;
    let headers: string[];
    
    // For strategy (key-value) sheet, we treat the header row as fixed and the data row as the one after it
    if (sectionKey === 'strategy') {
      rowNumber = config.headerRow + 1; // Data is in row 2 if header is row 1
      headers = await fetchValues(config.spreadsheetId, `${config.sheetName}!${config.headerRow}:${config.headerRow}`).then(res => res.values?.[0] || []);
    } else {
      const sectionData = data[sectionKey] as any[];
      const itemIndex = sectionData.findIndex(i => i.id === item.id);
      if (itemIndex === -1) throw new Error("Item not found in current data.");
      rowNumber = config.headerRow + 1 + itemIndex;
      headers = await fetchValues(config.spreadsheetId, `${config.sheetName}!${config.headerRow}:${config.headerRow}`).then(res => res.values?.[0] || []);
    }
  
    const endColumn = String.fromCharCode('A'.charCodeAt(0) + headers.length - 1);
    const updateRange = `${config.sheetName}!A${rowNumber}:${endColumn}${rowNumber}`;
  
    const updatedRow = headers.map(header => {
      const field = Object.keys(config.fieldToHeaderMap).find(key => config.fieldToHeaderMap[key as keyof typeof config.fieldToHeaderMap] === header);
      if (field) {
        const value = (item as any)[field];
        // For multi-select, join array back to string
        if (Array.isArray(value)) return value.join(', ');
        return value !== undefined && value !== null ? String(value) : '';
      }
      // If header is not in map, return empty string for new fields, or try to preserve original value for existing
      // For updates, we should apply the `item` passed in, which is already merged with existing data.
      return '';
    });
  
    try {
      await updateValues(config.spreadsheetId, updateRange, [updatedRow]);
      addToast(`${String(sectionKey).charAt(0).toUpperCase() + String(sectionKey).slice(1)} item updated successfully! Refreshing...`, 'success');
      await mutate();
    } catch (err) {
      addToast(`Failed to update item: ${(err as Error).message}`, 'error');
      throw err;
    }
  }, [data, addToast, mutate]);

  return {
    bmcData: data || null,
    loading: isLoading,
    error: error?.message || null,
    hasAttemptedInitialLoad: !isLoading && (!!data || !!error),
    loadBmcData: mutate,
    isAnalyzingAI,
    aiAnalysisResult,
    analyzeCanvas,
    clearAnalysis,
    addBmcItem,
    updateBmcItem,
  };
};

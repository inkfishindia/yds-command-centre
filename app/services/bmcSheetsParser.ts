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
  Strategy, // NEW
} from '../types'
import { BMCSheetConfigItem } from '../types' // Corrected import path for BMCSheetConfigItem

export function parseNumber(value: string | undefined): number | undefined {
  if (value === undefined || value === null || value.trim() === '') {
    return undefined
  }
  const cleanedValue = value.replace(/[₹$,%]/g, '').trim()
  const num = parseFloat(cleanedValue)
  return isNaN(num) ? undefined : num
}

export function mapToEnum<T extends Record<string, string>>(value: string | undefined, enumObject: T): T[keyof T] | undefined {
  if (value === undefined || value === null || value.trim() === '') {
    return undefined
  }
  const normalizedValue = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_')

  const matchingKey = (Object.keys(enumObject) as Array<keyof T>).find(key =>
    enumObject[key].toString().toUpperCase().replace(/[^A-Z0-9]/g, '_') === normalizedValue
  )

  if (matchingKey) {
    return enumObject[matchingKey]
  }

  const fuzzyMatchingKey = (Object.keys(enumObject) as Array<keyof T>).find(key =>
    normalizedValue.includes(enumObject[key].toString().toUpperCase().replace(/[^A-Z0-9]/g, '_'))
  )

  if (fuzzyMatchingKey) {
    return enumObject[fuzzyMatchingKey]
  }

  console.warn(`Could not map value "${value}" to any member of the provided enum.`)
  return undefined
}

function parseKeyValueSection(sheetValues: string[][], config: BMCSheetConfigItem<any>): any | null {
  if (!config.fieldToHeaderMap) {
    console.warn(`Configuration for section "${String(config.sectionKey)}" is missing 'fieldToHeaderMap'. Skipping parsing.`);
    return null;
  }

  const obj: { [key: string]: any } = {};
  
  const headerToFieldMap = Object.entries(config.fieldToHeaderMap).reduce((acc, [field, header]) => {
    if (header) {
      acc[String(header)] = field;
    }
    return acc;
  }, {} as Record<string, string>);

  // Assumes keys are in the first column, values in the second.
  // For strategy, header is in row 'headerRow - 1', value is in 'headerRow'
  // So if headerRow is 1, headers are in row 0, values are in row 1.
  const headers = sheetValues[config.headerRow - 1]; // This is the row with "Vision (10-year)", "Mission (3-year)", etc.
  const values = sheetValues[config.headerRow];     // This is the row with the actual data

  if (!headers || !values) {
    return null;
  }

  headers.forEach((header, index) => {
    const field = headerToFieldMap[header?.trim()];
    if (field) {
      let value = values[index];
      if (config.transform) {
        value = config.transform(field as any, value);
      }
      obj[field] = value;
    }
  });

  return Object.keys(obj).length > 0 ? obj : null;
}

function parseStringList(sheetValues: string[][], config: BMCSheetConfigItem): string[] {
  const dataRows = sheetValues.slice(config.headerRow)
  return dataRows
    .map(row => row[0]?.trim())
    .filter((value): value is string => value !== undefined && value !== '')
}

export function parseObjectListSection<T>(sheetValues: string[][], config: BMCSheetConfigItem<T>): T[] {
  if (!config.fieldToHeaderMap) {
    console.warn(`Configuration for section "${String(config.sectionKey)}" is missing 'fieldToHeaderMap'. Skipping parsing.`)
    return []
  }

  const headerRowValues = sheetValues[config.headerRow - 1] || []
  const dataRows = sheetValues.slice(config.headerRow)

  const headerToIndexMap: { [header: string]: number } = {}
  headerRowValues.forEach((header, index) => {
    headerToIndexMap[header.trim()] = index
  })

  const parsedObjects: Partial<T>[] = []

  for (const row of dataRows) {
    // If the first column is empty or only whitespace, consider it an empty row and skip
    if (!row[0]?.trim()) continue

    const obj: Partial<T> = {}
    for (const field in config.fieldToHeaderMap) {
      if (Object.prototype.hasOwnProperty.call(config.fieldToHeaderMap, field)) {
        const headerName = config.fieldToHeaderMap[field as keyof T]
        if (headerName !== undefined) {
          const colIndex = headerToIndexMap[headerName]
          if (colIndex !== undefined && row[colIndex] !== undefined) {
            let value = row[colIndex]
            if (config.transform) {
              value = config.transform(field as keyof T, value)
            }
            // Special handling for platform list for CustomerSegment
            if (config.sectionKey === 'customerSegments' && field === 'platforms' && typeof value === 'string') {
              (obj as any)[field] = value.split(',').map(s => s.trim()).filter(Boolean);
            } else {
              (obj as any)[field] = value
            }
          }
        }
      }
    }
    // Ensure 'id' is present, or generate if it's the primary key and missing
    // For sections like 'strategy' where ID is static, ensure it's not overwritten
    if (config.sectionKey !== 'strategy' && Object.prototype.hasOwnProperty.call(obj, 'id') && !(obj as any).id) {
      (obj as any).id = `generated-${String(config.sectionKey).substring(0,3).toUpperCase()}-${Math.random().toString(36).substr(2, 6)}`
    } else if (config.sectionKey === 'strategy') {
      (obj as any).id = 'STRATEGY-GLOBAL'; // Always fix strategy ID
    }
    parsedObjects.push(obj)
  }

  return parsedObjects as T[]
}

/**
 * Parses raw data from multiple Google Sheet tabs into a structured BusinessModelCanvasData object.
 * @param allSheetValues An object where keys are sheet names and values are 2D arrays of sheet data.
 * @param sheetConfigs An array of BMCSheetConfigItem defining how to parse each section.
 * @returns A BusinessModelCanvasData object.
 */
export function parseSheetDataToBmc(
  allSheetValues: Record<string, string[][]>,
  sheetConfigs: BMCSheetConfigItem[],
): BusinessModelCanvasData {

  const bmcData: BusinessModelCanvasData = {
    keyPartners: [],
    keyActivities: [],
    valuePropositions: [],
    customerRelations: [],
    customerSegments: [],
    keyResources: [],
    channels: [],
    revenueStreams: [],
    costStructure: [],
    businessUnits: [],
    flywheels: [],
    platforms: [],
    team: [],
    hubs: [],
    metrics: [],
    gapsActions: [],
    strategy: null, // Initialize strategy as null
  }

  for (const config of sheetConfigs) {
    const sheetValues = allSheetValues[config.sheetName]
    if (!sheetValues || sheetValues.length === 0) {
      console.warn(`No data found for sheet "${config.sheetName}". Skipping section "${String(config.sectionKey)}".`)
      continue
    }

    const sectionKey = config.sectionKey as keyof BusinessModelCanvasData

    if (config.isKeyValue) {
      const kvData = parseKeyValueSection(sheetValues, config);
      if (kvData) {
        if (sectionKey === 'strategy') {
          bmcData.strategy = { ...kvData, id: 'STRATEGY-GLOBAL' };
        } else {
          // Future-proofing for other key-value sections
          (bmcData[sectionKey] as any) = kvData;
        }
      }
    } else if (config.isSimpleList) {
      const listData = parseStringList(sheetValues, config)
      bmcData.valuePropositions = listData.map(desc => ({
        description: desc,
        id: `generated-vp-${Math.random().toString(36).substring(2, 9)}`
      }))
    } else {
      const objectData = parseObjectListSection(sheetValues, config);
      
      // The old strategy block is removed. It's now handled by `isKeyValue`.
      (bmcData[sectionKey] as any) = objectData
    }
  }

  return bmcData
}
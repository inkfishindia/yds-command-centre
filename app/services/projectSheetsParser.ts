import { Project } from '../types'
import { ProjectSheetConfigItem } from '../src/config/projectSheetConfig'
import { parseObjectListSection } from './bmcSheetsParser'

/**
 * Parses raw data from a Google Sheet tab into an array of Project objects.
 * This function uses the generic `parseObjectListSection` from `bmcSheetsParser`
 * by passing the specific `ProjectSheetConfigItem`.
 *
 * @param sheetValues The 2D array of sheet values (data from the 'Project' tab).
 * @param config The configuration for the 'Project' sheet.
 * @returns An array of Project objects.
 */
export function parseProjectsData(
  sheetValues: string[][],
  config: ProjectSheetConfigItem<Project>,
): Project[] {
  // Pass the full config object which now includes spreadsheetId.
  return parseObjectListSection<Project>(sheetValues, config)
}
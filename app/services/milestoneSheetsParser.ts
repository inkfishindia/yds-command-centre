import { Milestone } from '../types'
import { MilestoneSheetConfigItem } from '../src/config/milestoneSheetConfig'
import { parseObjectListSection } from './bmcSheetsParser'

/**
 * Parses raw data from a Google Sheet tab into an array of Milestone objects.
 * This function uses the generic `parseObjectListSection` from `bmcSheetsParser`
 * by passing the specific `MilestoneSheetConfigItem`.
 *
 * @param sheetValues The 2D array of sheet values (data from the 'Milestones' tab).
 * @param config The configuration for the 'Milestones' sheet.
 * @returns An array of Milestone objects.
 */
export function parseMilestonesData(
  sheetValues: string[][],
  config: MilestoneSheetConfigItem<Milestone>,
): Milestone[] {
  // Pass the full config object which now includes spreadsheetId.
  return parseObjectListSection<Milestone>(sheetValues, config)
}
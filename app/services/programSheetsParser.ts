import { Program } from '../types'
import { ProgramSheetConfigItem } from '../src/config/programSheetConfig'
import { parseObjectListSection } from './bmcSheetsParser'

/**
 * Parses raw data from a Google Sheet tab into an array of Program objects.
 * This function uses the generic `parseObjectListSection` from `bmcSheetsParser`
 * by passing the specific `ProgramSheetConfigItem`.
 *
 * @param sheetValues The 2D array of sheet values (data from the 'PROGRAMS' tab).
 * @param config The configuration for the 'PROGRAMS' sheet.
 * @returns An array of Program objects.
 */
export function parseProgramsData(
  sheetValues: string[][],
  config: ProgramSheetConfigItem<Program>,
): Program[] {
  // Pass the full config object which now includes spreadsheetId.
  return parseObjectListSection<Program>(sheetValues, config)
}
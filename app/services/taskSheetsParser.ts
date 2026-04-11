import { Task } from '../types'
import { TaskSheetConfigItem } from '../src/config/taskSheetConfig'
import { parseObjectListSection } from './bmcSheetsParser'

/**
 * Parses raw data from a Google Sheet tab into an array of Task objects.
 * This function uses the generic `parseObjectListSection` from `bmcSheetsParser`
 * by passing the specific `TaskSheetConfigItem`.
 *
 * @param sheetValues The 2D array of sheet values (data from the 'task' tab).
 * @param config The configuration for the 'task' sheet.
 * @returns An array of Task objects.
 */
export function parseTasksData(
  sheetValues: string[][],
  config: TaskSheetConfigItem<Task>,
): Task[] {
  // Pass the full config object which now includes spreadsheetId.
  return parseObjectListSection<Task>(sheetValues, config)
}
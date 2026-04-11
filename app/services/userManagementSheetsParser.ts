
import { UserManagement } from '../types';
import { BMCSheetConfigItem } from '../types';
import { parseObjectListSection } from './bmcSheetsParser';

/**
 * Parses raw data from the People/Users sheet into a structured UserManagement array.
 */
export function parseUserManagementData(
  sheetValues: string[][],
  config: BMCSheetConfigItem<UserManagement>,
): UserManagement[] {
  if (!sheetValues || sheetValues.length < config.headerRow) {
    return [];
  }
  return parseObjectListSection<UserManagement>(sheetValues, config);
}

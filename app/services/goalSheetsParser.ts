import { Goal } from '../types';
import { GoalSheetConfigItem } from '../src/config/goalSheetConfig';
import { parseObjectListSection } from './bmcSheetsParser';

export function parseGoalsData(
  sheetValues: string[][],
  config: GoalSheetConfigItem<Goal>,
): Goal[] {
  return parseObjectListSection<Goal>(sheetValues, config);
}

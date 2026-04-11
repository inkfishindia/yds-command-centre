import { ResourceAllocationBudget } from '../types';
import { ResourceAllocationBudgetSheetConfigItem } from '../src/config/resourceAllocationBudgetSheetConfig';
import { parseObjectListSection } from './bmcSheetsParser';

export function parseResourceAllocationBudgetsData(
  sheetValues: string[][],
  config: ResourceAllocationBudgetSheetConfigItem<ResourceAllocationBudget>,
): ResourceAllocationBudget[] {
  return parseObjectListSection<ResourceAllocationBudget>(sheetValues, config);
}

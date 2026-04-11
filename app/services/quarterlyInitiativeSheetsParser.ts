import { QuarterlyInitiative } from '../types';
import { QuarterlyInitiativeSheetConfigItem } from '../src/config/quarterlyInitiativeSheetConfig';
import { parseObjectListSection } from './bmcSheetsParser';

export function parseQuarterlyInitiativesData(
  sheetValues: string[][],
  config: QuarterlyInitiativeSheetConfigItem<QuarterlyInitiative>,
): QuarterlyInitiative[] {
  return parseObjectListSection<QuarterlyInitiative>(sheetValues, config);
}

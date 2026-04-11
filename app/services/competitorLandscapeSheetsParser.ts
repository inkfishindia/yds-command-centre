import { CompetitorLandscapeItem } from '../types';
import { BMCSheetConfigItem } from '../types';
import { parseObjectListSection } from './bmcSheetsParser';

export function parseCompetitorLandscapeData(
  sheetValues: string[][],
  config: BMCSheetConfigItem<CompetitorLandscapeItem>,
): CompetitorLandscapeItem[] {
  return parseObjectListSection<CompetitorLandscapeItem>(sheetValues, config);
}

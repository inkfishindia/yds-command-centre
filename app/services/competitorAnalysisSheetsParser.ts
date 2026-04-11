import { CompetitorAnalysisItem } from '../types';
import { BMCSheetConfigItem } from '../types';
import { parseObjectListSection } from './bmcSheetsParser';

export function parseCompetitorAnalysisData(
  sheetValues: string[][],
  config: BMCSheetConfigItem<CompetitorAnalysisItem>,
): CompetitorAnalysisItem[] {
  return parseObjectListSection<CompetitorAnalysisItem>(sheetValues, config);
}

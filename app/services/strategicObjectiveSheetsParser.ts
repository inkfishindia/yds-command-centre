import { StrategicObjective } from '../types';
import { StrategicObjectiveSheetConfigItem } from '../src/config/strategicObjectiveSheetConfig';
import { parseObjectListSection } from './bmcSheetsParser';

export function parseStrategicObjectivesData(
  sheetValues: string[][],
  config: StrategicObjectiveSheetConfigItem<StrategicObjective>,
): StrategicObjective[] {
  return parseObjectListSection<StrategicObjective>(sheetValues, config);
}

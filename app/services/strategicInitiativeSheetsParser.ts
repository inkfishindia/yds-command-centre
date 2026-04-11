import { StrategicInitiative } from '../types';
import { StrategicInitiativeSheetConfigItem } from '../src/config/strategicInitiativeSheetConfig';
import { parseObjectListSection } from './bmcSheetsParser';

export function parseStrategicInitiativesData(
  sheetValues: string[][],
  config: StrategicInitiativeSheetConfigItem<StrategicInitiative>,
): StrategicInitiative[] {
  return parseObjectListSection<StrategicInitiative>(sheetValues, config);
}

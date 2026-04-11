
// services/orderSummarySheetsParser.ts
import { OrderSummaryItem } from '../types';
import { BMCSheetConfigItem } from '../types';
import { parseObjectListSection } from './bmcSheetsParser';

/**
 * Parses raw data from a Google Sheet tab into an array of OrderSummaryItem objects.
 * This function uses the generic `parseObjectListSection` from `bmcSheetsParser`
 * by passing the specific `BMCSheetConfigItem` for OrderSummary.
 *
 * @param sheetValues The 2D array of sheet values (data from the 'order list' tab).
 * @param config The configuration for the 'orderSummary' sheet.
 * @returns An array of OrderSummaryItem objects.
 */
export function parseOrderSummaryData(
  sheetValues: string[][],
  config: BMCSheetConfigItem<OrderSummaryItem>,
): OrderSummaryItem[] {
  // Pass the full config object which includes spreadsheetId.
  return parseObjectListSection<OrderSummaryItem>(sheetValues, config);
}

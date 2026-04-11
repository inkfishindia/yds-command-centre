
import { OrderItem } from '../types';
import { OrderSheetConfigItem } from '../src/config/orderSheetConfig';
import { parseObjectListSection } from './bmcSheetsParser';

/**
 * Validates raw data from Sheets. Since Sheets is the "Rules Engine", 
 * we ensure the React layer doesn't crash on null/undefined cells.
 */
export function parseOrderData(
  sheetValues: string[][],
  config: OrderSheetConfigItem<OrderItem>,
): OrderItem[] {
  const data = parseObjectListSection<OrderItem>(sheetValues, config);
  
  // Runtime guard: Ensure IDs and Order Numbers are never missing
  return data.map(item => ({
    ...item,
    id: item.id || `fallback-${Math.random()}`,
    orderNumber: item.orderNumber || 'MISSING_ORD_NUM',
    customerName: item.customerName || 'N/A',
    quantity: Number(item.quantity) || 0,
    totalAmountWithTax: Number(item.totalAmountWithTax) || 0
  }));
}



import {
  ResourceAllocationBudget,
  ResourceAllocationStatus,
} from '../../types';
import { parseNumber, mapToEnum } from '../../services/bmcSheetsParser';
import { BMCSheetConfigItem } from '../../types';

export interface ResourceAllocationBudgetSheetConfigItem<T = any> extends BMCSheetConfigItem<T> {
  sectionKey: 'resourceAllocationBudget';
  sheetName: string;
  gid: string;
  headerRow: number;
  fieldToHeaderMap: Partial<Record<keyof T, string>>;
  transform?: (key: keyof T, value: string) => any;
  isSimpleList?: boolean;
}

export const RESOURCE_ALLOCATION_BUDGET_SHEET_CONFIG: ResourceAllocationBudgetSheetConfigItem<ResourceAllocationBudget> = {
  spreadsheetId: '1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA',
  sectionKey: 'resourceAllocationBudget',
  sheetName: 'RESOURCE_ALLOCATION_BUDGET',
  gid: '242645409',
  headerRow: 1,
  // FIX: Set isSimpleList to false
  isSimpleList: false,
  fieldToHeaderMap: {
    budgetCategoryId: 'budgetCategoryId',
    budgetCategory: 'budgetCategory',
    subCategory: 'subCategory',
    budgetAmountFy26: 'budgetAmount_fy26',
    pctOfTotal: 'pct_of_total',
    keyAllocations: 'keyAllocations',
    expectedROI: 'expectedROI',
    hubId: 'hub_id',
    ownerPersonId: 'owner_person_id',
    status: 'status',
    notes: 'notes',
  },
  transform: (key: keyof ResourceAllocationBudget, value: string) => {
    switch (key) {
      case 'status': return mapToEnum(value, ResourceAllocationStatus);
      default: return value;
    }
  },
};

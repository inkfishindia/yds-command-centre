
import { BMCSheetConfigItem, CustomerSegment, CustomerSegmentStatus, Strategy, OrderSummaryItem, OrderStatus, AcceptanceStatus, PaymentMode, OrderType } from '../types';
import { PPCManifestItem } from '../types';
import { getEnv } from './env';
import { parseNumber, mapToEnum } from '../services/bmcSheetsParser';

interface Registry {
    validation: BMCSheetConfigItem;
    'vision-mission-values': BMCSheetConfigItem<Strategy>;
    segments: BMCSheetConfigItem<CustomerSegment>;
    ppc: BMCSheetConfigItem<PPCManifestItem>;
    orderSummary: BMCSheetConfigItem<OrderSummaryItem>;
    [key: string]: BMCSheetConfigItem;
}

const MASTER_SHEET_ID = '1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA';

export const bmcRegistry: Registry = {
    validation: {
        spreadsheetId: MASTER_SHEET_ID,
        sectionKey: 'validation',
        sheetName: 'VALIDATION',
        gid: '594360110',
        headerRow: 1,
    },
    'vision-mission-values': {
        spreadsheetId: MASTER_SHEET_ID,
        sectionKey: 'strategy',
        sheetName: 'VISION / MISSION / VALUES',
        gid: '70224996',
        headerRow: 1,
        type: 'static',
        fieldToHeaderMap: {
            id: 'BRAND',
            vision: 'Vision (10-year)',
            mission: 'Mission (3-year)',
            brandPosition: 'Positioning (Unfair advantage)',
        }
    },
    segments: {
        spreadsheetId: MASTER_SHEET_ID,
        sectionKey: 'customerSegments',
        sheetName: 'Segments',
        gid: '1781117501',
        headerRow: 1,
        type: 'data',
        required: ['segment_id', 'segment_name'],
        enumBindings: {
            customerFacing: 'boolean_values',
            status: 'status_values',
        },
        numeric: ['priority_rank', 'revenue_9mo_actual_inr', '9mo_actual_orders', 'annual_revenue_target_inr', 'annual_orders_target'],
        fieldToHeaderMap: {
            id: 'segment_id',
            name: 'segment_name',
            customerFacing: 'customer_facing',
            status: 'validation_status',
        } as Partial<Record<keyof CustomerSegment, string>>,
        transform: (key: keyof CustomerSegment, value: string) => {
            if (key === 'status') return mapToEnum(value, CustomerSegmentStatus);
            return value;
        },
    },
    ppc: {
        spreadsheetId: '2PACX-1vR6137wFR6zrkzPb94xcyGK_oBjlCXjvheDgLb2ZUMYBuPdqFA-33in_OP3Nw4C00bt-Fl4rq8r0JVO',
        sectionKey: 'ppcManifest',
        sheetName: 'Manifest',
        gid: '1487733503',
        headerRow: 1,
        type: 'config',
        fieldToHeaderMap: {
            table_name: 'table_name',
            gid: 'gid',
            active: 'active',
        } as Partial<Record<keyof PPCManifestItem, string>>,
    },
    orderSummary: {
      spreadsheetId: (() => {
        try {
          return getEnv('ORDER_MANAGEMENT_SHEET_ID');
        } catch (e) {
          return '1YU1kSMM55d3QPlmU7RCQGO9SNiQWjEOceBXzTPGsOOE';
        }
      })(),
      sectionKey: 'orderSummary',
      sheetName: 'order list',
      gid: '1615560830', 
      headerRow: 1,
      isSimpleList: false,
      fieldToHeaderMap: {
        id: 'Order #',
        orderNumber: 'Order #',
        date: 'Date',
        time: 'Time',
        gstin: 'GSTIN',
        customerName: 'Customer',
        email: 'Email',
        phone: 'Phone',
        partnerOrderNumber: 'Partner Order Number',
        orderType: 'Order Type',
        orderMadeBy: 'Order Made By',
        salesChannel: 'Sales Channel',
        shippingName: 'Shipping Name',
        shippingPhone: 'Shipping Phone',
        shippingAddress: 'Shipping Address',
        shippingCity: 'Shipping City',
        shippingState: 'Shipping State',
        shippingCountry: 'Shipping Country',
        shippingPincode: 'Shipping Pincode',
        billingName: 'Billing Name',
        billingPhone: 'Billing Phone',
        billingAddress: 'Billing Address',
        billingCity: 'Billing City',
        billingState: 'Billing State',
        billingCountry: 'Billing Country',
        billingPincode: 'Billing Pincode',
        totalNoOfProducts: 'Total No of Products', 
        totalQuantityOfAllProducts: 'Total Quantity of all the products', 
        totalAmountWithTax: 'Total Amount with tax',
        status: 'Status',
        acceptanceStatus: 'Acceptance Status',
        paymentMode: 'Payment Mode',
        shippingType: 'Shipping Type',
        shippingCost: 'Shipping Cost',
      } as Partial<Record<keyof OrderSummaryItem, string>>,
      transform: (key: keyof OrderSummaryItem, value: string) => {
        switch (key) {
          case 'totalNoOfProducts':
          case 'totalQuantityOfAllProducts': 
          case 'totalAmountWithTax':
          case 'shippingCost':
            return parseNumber(value) || undefined;
          case 'status': return mapToEnum(value, OrderStatus);
          case 'acceptanceStatus': return mapToEnum(value, AcceptanceStatus);
          case 'paymentMode': return mapToEnum(value, PaymentMode);
          case 'orderType': return mapToEnum(value, OrderType);
          default: return value;
        }
      },
    },
};

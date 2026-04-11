// src/config/orderSheetConfig.ts
import { BMCSheetConfigItem, OrderItem, OrderStatus, AcceptanceStatus, PaymentMode, OrderType, ProductStockStatus, QCStatus, ProductWorkflowStatus, BlankQCStatus } from '../../types';
import { parseNumber, mapToEnum } from '../../services/bmcSheetsParser';

export interface OrderSheetConfigItem<T = any> extends BMCSheetConfigItem<T> {
  sectionKey: 'order';
  sheetName: string;
  gid: string;
  headerRow: number;
  fieldToHeaderMap: Partial<Record<keyof T, string>>;
  transform?: (key: keyof T, value: string) => any;
  isSimpleList?: boolean;
}

export const ORDER_SHEET_CONFIG: OrderSheetConfigItem<OrderItem> = {
  spreadsheetId: '1YU1kSMM55d3QPlmU7RCQGO9SNiQWjEOceBXzTPGsOOE', // Provided sheet ID
  sectionKey: 'order',
  sheetName: 'all orders', // Assuming 'Sheet1' for the provided GID
  gid: '618932176', // Provided GID
  headerRow: 1,
  isSimpleList: false,
  fieldToHeaderMap: {
    id: 'ID',
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
    product: 'Product',
    variant: 'quantity', // This maps to the actual quantity column
    quantity: 'quantity', // This also maps to the quantity column as quantity is key for OrderItem
    line_item_id: 'line_item_id',
    sku: 'sku',
    unit_price: 'unit_price',
    line_total: 'line_total',
    blank_article_sku: 'blank_article_sku',
    product_supplier: 'product_supplier',
    product_stock_status: 'product_stock_status',
    blankStockAvailable: 'blank_stock_available',
    print_technology: 'print_technology',
    print_location: 'print_location',
    print_size: 'print_size',
    print_color_count: 'print_color_count',
    design_file_url: 'design_file_url',
    design_file_format: 'design_file_format',
    design_thumbnail_url: 'design_thumbnail_url',
    mockup_url: 'mockup_url',
    productStatus: 'product_status',
    picker_name: 'picker_name',
    picked_at: 'picked_at',
    blank_qc_status: 'blank_qc_status',
    blank_qc_by: 'blank_qc_by',
    blank_qc_at: 'blank_qc_at',
    batchId: 'batch_id',
    production_station: 'production_station',
    assigned_to: 'assigned_to',
    print_started_at: 'print_started_at',
    print_completed_at: 'print_completed_at',
    production_time_seconds: 'production_time_seconds',
    finishingStatus: 'finishing_status',
    finishing_by: 'finishing_by',
    finishing_completed_at: 'finishing_completed_at',
    qc_status: 'qc_status',
    qc_notes: 'qc_notes',
    qc_checked_by: 'qc_checked_by',
    qc_checked_at: 'qc_checked_at',
    qc_fail_reason: 'qc_fail_reason',
    qc_images_url: 'qc_images_url',
    reprint_required: 'reprint_required',
    reprint_count: 'reprint_count',
    whitelabelRequired: 'whitelabel_required',
    whitelabelType: 'whitelabel_type',
    packingBy: 'packing_by',
    packedAt: 'packed_at',
    customerSpecialRequest: 'customer_special_request',
    internal_notes: 'internal_notes',
    special_instructions: 'special_instructions',
    weight_grams: 'weight_grams',
    is_rush_order: 'is_rush_order',
    production_cost: 'production_cost',
    customerPaidPrice: 'customer_paid_price',
    sale_price: 'sale_price',
    margin: 'margin',
    orderSourceUrl: 'order_source_url',
    expectedShipDate: 'expected_ship_date',
    trackingNumber: 'tracking_number',
    carrier: 'carrier',
    shippedAt: 'shipped_at',
  },
  transform: (key: keyof OrderItem, value: string) => {
    switch (key) {
      case 'totalNoOfProducts':
      case 'totalQuantityOfAllProducts':
      case 'totalAmountWithTax':
      case 'quantity':
      case 'shippingCost':
      case 'unit_price':
      case 'line_total':
      case 'productStockCount':
      case 'blankStockAvailable':
      case 'print_color_count':
      case 'production_time_seconds':
      case 'reprint_count':
      case 'weight_grams':
      case 'production_cost':
      case 'customerPaidPrice':
      case 'sale_price':
      case 'margin':
        return parseNumber(value);
      case 'status':
        return mapToEnum(value, OrderStatus);
      case 'acceptanceStatus':
        return mapToEnum(value, AcceptanceStatus);
      case 'paymentMode':
        return mapToEnum(value, PaymentMode);
      case 'orderType':
        return mapToEnum(value, OrderType);
      case 'product_stock_status':
        return mapToEnum(value, ProductStockStatus);
      case 'productStatus':
        return mapToEnum(value, ProductWorkflowStatus);
      case 'finishingStatus':
        return value;
      case 'qc_status':
        return mapToEnum(value, QCStatus);
      case 'blank_qc_status':
        return mapToEnum(value, BlankQCStatus);
      case 'reprint_required':
      case 'is_rush_order':
      case 'whitelabelRequired':
        return value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
      case 'picked_at':
      case 'blank_qc_at':
      case 'print_started_at':
      case 'print_completed_at':
      case 'finishing_completed_at':
      case 'packedAt':
      case 'expectedShipDate':
      case 'shippedAt':
        return value;
      default:
        return value;
    }
  },
};

// Add React import
import * as React from 'react';

export enum OrderStatus { 
  ORDER_PLACED = 'Order Placed', 
  PROCESSING = 'Processing', 
  DESIGN_PENDING = 'Design Pending', 
  PRODUCTION = 'Production', 
  FULFILLMENT = 'Fulfillment', 
  SHIPPED = 'Shipped', 
  DELIVERED = 'Delivered', 
  CANCELLED = 'Cancelled' 
}

export enum AcceptanceStatus { 
  AWAITING = 'Awaiting', 
  ACCEPTED = 'Accepted', 
  REJECTED = 'Rejected' 
}

export enum PaymentMode { 
  COD = 'COD', 
  PREPAID = 'Prepaid' 
}

export enum OrderType { 
  B2C = 'B2C', 
  B2B = 'B2B', 
  PARTNER = 'Partner' 
}

export enum ProductWorkflowStatus { 
  DESIGN_PENDING = 'Design Pending', 
  DESIGN_REJECTED = 'Design Rejected', 
  QUEUED_FOR_PICK = 'Queued for Pick', 
  BLANK_PICKED = 'Blank Picked', 
  BATCHED = 'Batched', 
  QUEUED_FOR_PRODUCTION = 'Queued for Production', 
  IN_PRODUCTION = 'In Production', 
  FINISHING_PENDING = 'Finishing Pending', 
  FULFILLMENT_PENDING = 'Fulfillment Pending', 
  PACKED = 'Packed', 
  SHIPPED = 'Shipped', 
  DELIVERED = 'Delivered' 
}

export enum ProductStockStatus { 
  IN_STOCK = 'In Stock', 
  LOW_STOCK = 'Low Stock', 
  OUT_OF_STOCK = 'Out Of Stock', 
  PRE_ORDER = 'Pre-Order' 
}

export enum QCStatus { 
  PENDING = 'Pending', 
  PASSED = 'Passed', 
  FAILED = 'Failed', 
  REPRINT_REQUESTED = 'Reprint Requested' 
}

export enum BlankQCStatus { 
  PENDING = 'Pending', 
  PASSED = 'Passed', 
  FAILED = 'Failed' 
}

export interface OrderItem { 
  id: string; 
  orderNumber: string; 
  date: string; 
  time: string; 
  gstin?: string; 
  customerName: string; 
  email?: string; 
  phone?: string; 
  partnerOrderNumber?: string; 
  orderType?: OrderType; 
  orderMadeBy?: string; 
  salesChannel?: string; 
  shippingName?: string; 
  shippingPhone?: string; 
  shippingAddress?: string; 
  shippingCity?: string; 
  shippingState?: string; 
  shippingCountry?: string; 
  shippingPincode?: string; 
  billingName?: string; 
  billingPhone?: string; 
  billingAddress?: string; 
  billingCity?: string; 
  billingState?: string; 
  billingCountry?: string; 
  billingPincode?: string; 
  totalNoOfProducts?: number; 
  totalQuantityOfAllProducts?: number; 
  totalAmountWithTax?: number; 
  status?: OrderStatus; 
  acceptanceStatus?: AcceptanceStatus; 
  paymentMode?: PaymentMode; 
  shippingType?: string; 
  shippingCost?: number; 
  product: string; 
  variant: string; 
  quantity: number; 
  line_item_id?: string; 
  sku?: string; 
  unit_price?: number; 
  line_total?: number; 
  blank_article_sku?: string; 
  product_supplier?: string; 
  product_stock_status?: ProductStockStatus; 
  productStockCount?: number; 
  blankStockAvailable?: number; 
  print_technology?: string; 
  print_location?: string; 
  print_size?: string; 
  print_color_count?: number; 
  design_file_url?: string; 
  design_file_format?: string; 
  design_thumbnail_url?: string; 
  mockup_url?: string; 
  productStatus?: ProductWorkflowStatus; 
  batchId?: string; 
  production_station?: string; 
  assigned_to?: string; 
  print_started_at?: string; 
  print_completed_at?: string; 
  production_time_seconds?: number; 
  finishingStatus?: string; 
  finishing_by?: string; 
  finishing_completed_at?: string; 
  qc_status?: QCStatus; 
  qc_notes?: string; 
  qc_checked_by?: string; 
  qc_checked_at?: string; 
  qc_fail_reason?: string; 
  qc_images_url?: string; 
  reprint_required?: boolean; 
  reprint_count?: number; 
  whitelabelRequired?: boolean; 
  whitelabelType?: string; 
  packingBy?: string; 
  packedAt?: string; 
  customerSpecialRequest?: string; 
  internal_notes?: string; 
  special_instructions?: string; 
  weight_grams?: number; 
  is_rush_order?: boolean; 
  production_cost?: number; 
  customerPaidPrice?: number; 
  sale_price?: number; 
  margin?: number; 
  orderSourceUrl?: string; 
  expectedShipDate?: string; 
  trackingNumber?: string; 
  carrier?: string; 
  shippedAt?: string; 
  stock_location?: string; 
  picker_name?: string; 
  picked_at?: string; 
  blank_qc_status?: BlankQCStatus; 
  blank_qc_by?: string; 
  blank_qc_at?: string; 
}

export interface OrderSummaryItem { 
  id: string; 
  orderNumber: string; 
  date: string; 
  time?: string; 
  customerName: string; 
  totalAmountWithTax?: number; 
  status?: OrderStatus; 
  acceptanceStatus?: AcceptanceStatus; 
  paymentMode?: PaymentMode; 
  orderType?: OrderType; 
  totalNoOfProducts?: number; 
  totalQuantityOfAllProducts?: number; 
  salesChannel?: string; 
  shippingName?: string; 
  shippingPhone?: string; 
  shippingAddress?: string; 
  shippingCity?: string; 
  shippingState?: string; 
  shippingCountry?: string; 
  shippingPincode?: string; 
  billingName?: string; 
  billingPhone?: string; 
  billingAddress?: string; 
  billingCity?: string; 
  billingState?: string; 
  billingCountry?: string; 
  billingPincode?: string; 
  email?: string; 
  phone?: string; 
  gstin?: string; 
  partnerOrderNumber?: string; 
  orderMadeBy?: string; 
  shippingType?: string; 
  shippingCost?: number; 
  isBillingSameAsShipping?: boolean; 
}

export enum OrderTimelineStage { 
  ORDER_PLACED = 'Order Placed', 
  PAID = 'Paid', 
  PROCESSING = 'Processing', 
  PRODUCTION = 'Production', 
  FULFILLMENT = 'Fulfillment', 
  SHIPPED = 'Shipped', 
  DELIVERED = 'Delivered' 
}

export interface OrderContextType { 
  orderItems: OrderItem[]; 
  orderSummaryItems: OrderSummaryItem[]; 
  orderSheetId: string; 
  setOrderSheetId: (id: string) => void; 
  loading: boolean; 
  error: string | null; 
  initialLoadComplete: boolean; 
  showPermissionPrompt: boolean; 
  handleGrantSheetsAccess: () => Promise<void>; 
  loadOrders: (forceRefresh?: boolean) => Promise<void>; 
  saveItem: (itemData: Partial<OrderItem>) => Promise<void>; 
  deleteItem: (item: OrderItem) => Promise<void>; 
  selectedOrderNumberForDetail: string | null; 
  setSelectedOrderNumberForDetail: React.Dispatch<React.SetStateAction<string | null>>; 
  updateOrderSummaryAcceptanceStatus: (orderNumber: string, newAcceptanceStatus: AcceptanceStatus) => Promise<void>; 
}

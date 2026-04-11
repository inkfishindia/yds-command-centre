// components/orders/OrderItemDetailDrawer.tsx
import React from 'react';
import { Drawer, Button, StatusPill } from '../../ui';
import { OrderItem, OrderStatus, AcceptanceStatus, PaymentMode, OrderType, ProductStockStatus, QCStatus, BlankQCStatus } from '../../types';
import { ORDER_SHEET_CONFIG } from '../../src/config/orderSheetConfig';

interface OrderItemDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (item: OrderItem) => void;
  onDelete: (item: OrderItem) => void;
  data: OrderItem | null;
  isMockMode: boolean;
}

const OrderItemDetailDrawer: React.FC<OrderItemDetailDrawerProps> = ({ isOpen, onClose, onEdit, onDelete, data, isMockMode }) => {
  if (!data) return null;

  const config = ORDER_SHEET_CONFIG;

  const renderValue = (value: any, fieldName: keyof OrderItem) => {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
      return <span className="text-[var(--color-text-secondary)] italic">Not set</span>;
    }

    // Render StatusPill for known status/priority/health fields
    if (['status', 'acceptanceStatus', 'paymentMode', 'orderType', 'product_stock_status', 'qc_status', 'blank_qc_status', 'productStatus'].includes(fieldName)) {
      return <StatusPill status={value}>{String(value)}</StatusPill>;
    }
    // Handle boolean values
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    // Handle currency formatting for numeric values
    if (typeof value === 'number' && ['totalAmountWithTax', 'shippingCost', 'unit_price', 'line_total', 'production_cost', 'customerPaidPrice', 'sale_price', 'margin'].includes(fieldName)) {
        return `₹${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    // Handle percentage formatting for margin
    if (typeof value === 'number' && fieldName === 'margin') {
      return `${value.toFixed(2)}%`;
    }
    // Check if the value is a URL and render as a link
    if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
      return <a href={value} target="_blank" rel="noopener noreferrer" className="text-[var(--color-brand-primary)] hover:underline">{value}</a>;
    }
    return String(value);
  };

  const drawerTitle = data.orderNumber ? `Order Item Details: ${data.product} (${data.orderNumber})` : "Order Item Details";

  // Group fields logically for display
  const displayFieldOrder: Array<keyof OrderItem | 'separator'> = [
    'orderNumber', 'date', 'time', 'customerName', 'email', 'phone', 'gstin', 'partnerOrderNumber', 'orderType', 'orderMadeBy', 'salesChannel',
    'separator',
    'totalAmountWithTax', 'status', 'acceptanceStatus', 'paymentMode', 'shippingType', 'shippingCost',
    'separator',
    'line_item_id', 'product', 'variant', 'sku', 'unit_price', 'line_total', 'quantity',
    'blank_article_sku', 'product_supplier', 'product_stock_status', 'productStockCount', 'blankStockAvailable', 'stock_location',
    'separator',
    'productStatus', 'design_file_url', 'design_file_format', 'design_thumbnail_url', 'mockup_url',
    'print_technology', 'print_location', 'print_size', 'print_color_count',
    'picker_name', 'picked_at', 'blank_qc_status', 'blank_qc_by', 'blank_qc_at', 'batchId',
    'production_station', 'assigned_to', 'print_started_at', 'print_completed_at', 'production_time_seconds',
    'finishingStatus', 'finishing_by', 'finishing_completed_at',
    'qc_status', 'qc_notes', 'qc_checked_by', 'qc_checked_at', 'qc_fail_reason', 'qc_images_url', 'reprint_required', 'reprint_count',
    'separator',
    'shippingName', 'shippingPhone', 'shippingAddress', 'shippingCity', 'shippingState', 'shippingCountry', 'shippingPincode',
    'billingName', 'billingPhone', 'billingAddress', 'billingCity', 'billingState', 'billingCountry', 'billingPincode',
    'separator',
    'whitelabelRequired', 'whitelabelType', 'packingBy', 'packedAt', 'customerSpecialRequest', 'internal_notes', 'special_instructions',
    'weight_grams', 'is_rush_order', 'production_cost', 'customerPaidPrice', 'sale_price', 'margin',
    'orderSourceUrl', 'expectedShipDate', 'trackingNumber', 'carrier', 'shippedAt',
  ];

  return (
    <Drawer
      open={isOpen}
      onClose={onClose}
      title={drawerTitle}
      width={450}
    >
      <div className="space-y-4">
        {displayFieldOrder.map((fieldKey, index) => {
          if (fieldKey === 'separator') {
            return <hr key={`hr-${index}`} className="my-4 border-[var(--color-border-primary)]" />;
          }
          const header = config.fieldToHeaderMap?.[fieldKey];
          if (!header) return null; 

          return (
            <div key={fieldKey}>
              <h4 className="text-xs font-bold uppercase text-[var(--color-text-secondary)] tracking-wider">{String(header)}</h4>
              <p className="text-base text-[var(--color-text-primary)] mt-1 break-words whitespace-pre-wrap">
                {renderValue(data[fieldKey], fieldKey)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 pt-4 border-t border-[var(--color-border-primary)] flex space-x-3">
        <Button variant="primary" onClick={() => onEdit(data)}>
          <span role="img" aria-label="edit" className="mr-2">✏️</span> Edit
        </Button>
        {!isMockMode && (
          <Button variant="destructive" onClick={() => onDelete(data)}>
            <span role="img" aria-label="trash" className="mr-2">🗑️</span> Delete
          </Button>
        )}
      </div>
    </Drawer>
  );
};

export default OrderItemDetailDrawer;
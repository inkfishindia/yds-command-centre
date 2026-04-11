// components/orders/OrderSummaryDetailDrawer.tsx
import React, { useMemo } from 'react';
import { Drawer, Button, StatusPill, Table, Tag } from '../../ui';
import { OrderItem, OrderSummaryItem, OrderStatus, AcceptanceStatus, PaymentMode, OrderType } from '../../types';
import { ORDER_SHEET_CONFIG } from '../../src/config/orderSheetConfig'; // For individual item field headers
// NEW: Import shared utility functions
import { getOrderTypeStatus, getPaymentModeStatus, getSalesChannelTagColor } from '../../utils/orderUtils';


interface OrderSummaryDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string | null; // The order number for which to show details
  allOrderItems: OrderItem[]; // All line items from the context
  // onEdit and onDelete would likely operate on individual line items or on the summary,
  // depending on desired behavior. For now, we'll keep them on the single item in OrderItemDetailDrawer.
  // We can add "Edit Order (Summary)" button which opens a modal for editing top-level order details
  // For simplicity, we'll just show edit/delete for individual line items for now if exposed.
}

const OrderSummaryDetailDrawer: React.FC<OrderSummaryDetailDrawerProps> = ({
  isOpen,
  onClose,
  orderNumber,
  allOrderItems,
}) => {
  const orderLineItems = useMemo(() => {
    if (!orderNumber) return [];
    return allOrderItems.filter(item => item.orderNumber === orderNumber);
  }, [orderNumber, allOrderItems]);

  const summaryData = useMemo(() => {
    if (orderLineItems.length === 0) return null;
    // Aggregate summary-level fields from the first item, or sum across all items
    const firstItem = orderLineItems[0];
    const totalAmount = orderLineItems.reduce((sum, item) => sum + (item.totalAmountWithTax || 0), 0);
    const totalProducts = orderLineItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

    return {
      orderNumber: firstItem.orderNumber,
      date: firstItem.date,
      time: firstItem.time,
      customerName: firstItem.customerName,
      email: firstItem.email,
      phone: firstItem.phone,
      gstin: firstItem.gstin,
      partnerOrderNumber: firstItem.partnerOrderNumber,
      orderType: firstItem.orderType,
      orderMadeBy: firstItem.orderMadeBy,
      salesChannel: firstItem.salesChannel,
      shippingName: firstItem.shippingName,
      shippingPhone: firstItem.shippingPhone,
      shippingAddress: firstItem.shippingAddress,
      shippingCity: firstItem.shippingCity,
      shippingState: firstItem.shippingState,
      shippingCountry: firstItem.shippingCountry, // FIX: Added missing property
      shippingPincode: firstItem.shippingPincode,
      billingName: firstItem.billingName,
      billingPhone: firstItem.billingPhone,
      billingAddress: firstItem.billingAddress,
      billingCity: firstItem.billingCity,
      billingState: firstItem.billingState,
      billingCountry: firstItem.billingCountry, // FIX: Added missing property
      billingPincode: firstItem.billingPincode,
      totalAmountWithTax: totalAmount,
      totalNoOfProducts: orderLineItems.length, // Count of distinct product lines
      totalQuantityOfAllProducts: totalProducts, // Sum of quantities
      status: firstItem.status,
      acceptanceStatus: firstItem.acceptanceStatus,
      paymentMode: firstItem.paymentMode,
      shippingType: firstItem.shippingType,
      shippingCost: firstItem.shippingCost,
    };
  }, [orderLineItems]);

  // Debugging logs
  console.log('OrderSummaryDetailDrawer rendering:');
  console.log('  isOpen:', isOpen);
  console.log('  orderNumber prop:', orderNumber);
  console.log('  allOrderItems count:', allOrderItems.length);
  console.log('  orderLineItems count:', orderLineItems.length);
  console.log('  summaryData:', summaryData ? { orderNumber: summaryData.orderNumber, totalAmountWithTax: summaryData.totalAmountWithTax } : 'null');


  if (!isOpen || !summaryData) {
    console.log('OrderSummaryDetailDrawer NOT rendering (isOpen or summaryData is false/null)');
    return null;
  }

  const config = ORDER_SHEET_CONFIG; // Use config for generic item headers

  const renderValue = (value: any, fieldName?: string) => {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
      return <span className="text-[var(--color-text-secondary)] italic">Not set</span>;
    }

    // Render StatusPill for known status/priority/health fields
    if (fieldName && ['status', 'acceptanceStatus'].includes(fieldName)) {
      return <StatusPill status={value}>{String(value)}</StatusPill>;
    }
    if (fieldName === 'paymentMode') {
      return <StatusPill status={getPaymentModeStatus(value as PaymentMode)}>{String(value)}</StatusPill>;
    }
    if (fieldName === 'orderType') {
      return <StatusPill status={getOrderTypeStatus(value as OrderType)}>{String(value)}</StatusPill>;
    }
    // Render as a Tag for Sales Channel
    if (fieldName === 'salesChannel') {
      return <Tag color={getSalesChannelTagColor(value)}>{String(value)}</Tag>;
    }
    // Handle currency formatting for numeric values
    if (typeof value === 'number' && ['totalAmountWithTax', 'shippingCost'].includes(fieldName || '')) {
        return `₹${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    // Check if the value is a URL and render as a link
    if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
      return <a href={value} target="_blank" rel="noopener noreferrer" className="text-[var(--color-brand-primary)] hover:underline">{value}</a>;
    }
    return String(value);
  };

  const isBillingSameAsShipping = useMemo(() => {
    // FIX: Add optional chaining and nullish coalescing to prevent crashes if properties are undefined
    return summaryData.shippingAddress === summaryData.billingAddress &&
           summaryData.shippingCity === summaryData.billingCity &&
           summaryData.shippingState === summaryData.billingState &&
           summaryData.shippingPincode === summaryData.billingPincode &&
           summaryData.shippingCountry === summaryData.billingCountry;
  }, [summaryData]);

  const drawerTitle = `Order Details: ${summaryData?.orderNumber || 'N/A'}`; // FIX: Added optional chaining

  return (
    <Drawer
      open={isOpen}
      onClose={onClose}
      title={drawerTitle}
      width={600} // Wider drawer for more detail
    >
      <div className="space-y-6">
        {/* Order Info */}
        <div>
          <h3 className="text-lg font-bold text-[var(--color-brand-primary)] mb-2">Order Info</h3>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
            {[
              { key: 'orderNumber', label: 'Order #' },
              { key: 'date', label: 'Date' },
              { key: 'time', label: 'Time' },
              { key: 'partnerOrderNumber', label: 'Partner Order #' },
              { key: 'orderType', label: 'Order Type' },
              { key: 'orderMadeBy', label: 'Order Made By' },
              { key: 'salesChannel', label: 'Sales Channel' }, // NEW: Added Sales Channel to display
              { key: 'acceptanceStatus', label: 'Acceptance Status' },
              { key: 'status', label: 'Status' },
              { key: 'paymentMode', label: 'Payment Mode' },
              { key: 'totalAmountWithTax', label: 'Total Amount' },
              { key: 'shippingCost', label: 'Shipping Cost' },
            ].map(field => (
              <div key={field.key} className="flex flex-col">
                <h4 className="text-xs font-bold uppercase text-[var(--color-text-secondary)] tracking-wider">{field.label}</h4>
                <p className="text-base text-[var(--color-text-primary)] mt-1 break-words whitespace-pre-wrap">
                  {renderValue(summaryData?.[field.key], field.key)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Info */}
        <div>
          <h3 className="text-lg font-bold text-[var(--color-brand-primary)] mb-2">Customer Info</h3>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
            {[
              { key: 'customerName', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Phone' },
              { key: 'gstin', label: 'GSTIN' },
            ].map(field => (
              <div key={field.key} className="flex flex-col">
                <h4 className="text-xs font-bold uppercase text-[var(--color-text-secondary)] tracking-wider">{field.label}</h4>
                <p className="text-base text-[var(--color-text-primary)] mt-1 break-words whitespace-pre-wrap">
                  {renderValue(summaryData?.[field.key], field.key)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Products (Line Items) */}
        <div>
          <h3 className="text-lg font-bold text-[var(--color-brand-primary)] mb-2">Products ({orderLineItems.length})</h3>
          {orderLineItems.length > 0 ? (
            <Table headers={['Product', 'Variant', 'Qty', 'Unit Amount']}>
              {orderLineItems.map((item, index) => (
                <tr key={item.id || index}>
                  <td className="px-4 py-2 text-sm">{item.product}</td>
                  <td className="px-4 py-2 text-sm">{item.variant}</td>
                  <td className="px-4 py-2 text-sm">{item.quantity}</td>
                  <td className="px-4 py-2 text-sm">
                    {item.totalAmountWithTax !== undefined ? `₹${(item.totalAmountWithTax / (item.quantity || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <p className="text-[var(--color-text-secondary)] italic">No product line items found for this order.</p>
          )}
        </div>

        {/* Shipping Address */}
        <div>
          <h3 className="text-lg font-bold text-[var(--color-brand-primary)] mb-2">Shipping Address</h3>
          <div className="text-sm">
            <p>{renderValue(summaryData.shippingName)}</p>
            <p>{renderValue(summaryData.shippingPhone)}</p>
            <p>{renderValue(summaryData.shippingAddress)}</p>
            <p>{renderValue(summaryData.shippingCity)}, {renderValue(summaryData.shippingState)} {renderValue(summaryData.shippingPincode)}</p>
            <p>{renderValue(summaryData.shippingCountry)}</p>
          </div>
        </div>

        {/* Billing Address */}
        <div>
          <h3 className="text-lg font-bold text-[var(--color-brand-primary)] mb-2">Billing Address</h3>
          {isBillingSameAsShipping ? (
            <p className="text-sm text-[var(--color-text-secondary)] italic">Same as shipping address.</p>
          ) : (
            <div className="text-sm">
              <p>{renderValue(summaryData.billingName)}</p>
              <p>{renderValue(summaryData.billingPhone)}</p>
              <p>{renderValue(summaryData.billingAddress)}</p>
              <p>{renderValue(summaryData.billingCity)}, {renderValue(summaryData.billingState)} {renderValue(summaryData.billingPincode)}</p>
              <p>{renderValue(summaryData.billingCountry)}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-[var(--color-border-primary)] flex flex-wrap gap-3">
        <Button variant="primary" onClick={() => alert('Edit Order functionality not implemented.')}>
          <span role="img" aria-label="edit" className="mr-2">✏️</span> Edit Order
        </Button>
        <Button variant="secondary" onClick={() => alert('Cancel Order functionality not implemented.')}>
          <span role="img" aria-label="cancel" className="mr-2">🚫</span> Cancel Order
        </Button>
        <Button variant="secondary" onClick={() => alert('Reprocess Order functionality not implemented.')}>
          <span role="img" aria-label="reprocess" className="mr-2">🔁</span> Reprocess
        </Button>
        {summaryData.partnerOrderNumber && (
          <Button variant="secondary" onClick={() => alert('View in Partner System functionality not implemented.')}>
            <span role="img" aria-label="partner" className="mr-2">🤝</span> View in Partner System
          </Button>
        )}
      </div>
    </Drawer>
  );
};

export default OrderSummaryDetailDrawer;
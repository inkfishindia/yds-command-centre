// components/orders/OrderDetailsDrawer.tsx
import React, { useMemo, useState, useCallback } from 'react';
import { Drawer, Button, StatusPill, Table, Tag, Modal, ConfirmDialog, EmptyState } from '../../ui';
import { OrderItem, OrderSummaryItem, OrderStatus, AcceptanceStatus, PaymentMode, OrderType, OrderTimelineStage, ProductStockStatus, QCStatus, ProductWorkflowStatus, BlankQCStatus } from '../../types';
import { ORDER_SHEET_CONFIG } from '../../src/config/orderSheetConfig'; // For individual item field headers
// NEW: Import shared utility functions
import { getOrderTypeStatus, getPaymentModeStatus, getSalesChannelTagColor, getProductStatusEmoji, getProductWorkflowStatusEmoji } from '../../utils/orderUtils';
import OrderEditForm from './OrderEditForm'; // NEW: For editing overall order details
import OrderItemForm from './OrderItemForm'; // For adding/editing individual line items
import { useOrder } from '../../contexts/OrderContext'; // To access saveItem/deleteItem


interface OrderDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string | null; // The order number for which to show details
  allOrderItems: OrderItem[]; // All line items from the context
  // No onEdit/onDelete directly on the drawer props, actions are handled by internal buttons
}

const OrderDetailsDrawer: React.FC<OrderDetailsDrawerProps> = ({
  isOpen,
  onClose,
  orderNumber,
  allOrderItems,
}) => {
  const { saveItem, deleteItem, loadOrders } = useOrder();
  const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isConfirmCancelOrderOpen, setIsConfirmCancelOrderOpen] = useState(false);
  const [isConfirmDeleteLineItemOpen, setIsConfirmDeleteLineItemOpen] = useState(false);
  const [lineItemToDelete, setLineItemToDelete] = useState<OrderItem | null>(null);
  const [isEditLineItemModalOpen, setIsEditLineItemModalOpen] = useState(false);
  const [editingLineItem, setEditingLineItem] = useState<OrderItem | null>(null);


  const orderLineItems = useMemo(() => {
    if (!orderNumber) return [];
    return allOrderItems.filter(item => item.orderNumber === orderNumber);
  }, [orderNumber, allOrderItems]);

  const summaryData = useMemo(() => {
    if (orderLineItems.length === 0) return null;
    const firstItem = orderLineItems[0];
    const totalAmount = orderLineItems.reduce((sum, item) => sum + (item.totalAmountWithTax || 0), 0);
    const totalProducts = orderLineItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

    return {
      id: firstItem.orderNumber, // FIX: Assign id from orderNumber
      orderNumber: firstItem.orderNumber,
      date: firstItem.date,
      time: firstItem.time,
      customerName: firstItem.customerName,
      email: firstItem.email, // NEW
      phone: firstItem.phone, // NEW
      gstin: firstItem.gstin, // NEW
      partnerOrderNumber: firstItem.partnerOrderNumber, // NEW
      orderType: firstItem.orderType,
      orderMadeBy: firstItem.orderMadeBy, // NEW
      salesChannel: firstItem.salesChannel, // NEW
      shippingName: firstItem.shippingName,
      shippingPhone: firstItem.shippingPhone,
      shippingAddress: firstItem.shippingAddress,
      shippingCity: firstItem.shippingCity,
      shippingState: firstItem.shippingState,
      shippingCountry: firstItem.shippingCountry,
      shippingPincode: firstItem.shippingPincode,
      billingName: firstItem.billingName,
      billingPhone: firstItem.billingPhone,
      billingAddress: firstItem.billingAddress,
      billingCity: firstItem.billingCity,
      billingState: firstItem.billingState,
      billingCountry: firstItem.billingCountry,
      billingPincode: firstItem.billingPincode,
      totalAmountWithTax: totalAmount,
      totalNoOfProducts: orderLineItems.length, // Count of distinct product lines
      totalQuantityOfAllProducts: totalProducts, // Sum of quantities
      status: firstItem.status,
      acceptanceStatus: firstItem.acceptanceStatus,
      paymentMode: firstItem.paymentMode,
      shippingType: firstItem.shippingType, // NEW
      shippingCost: firstItem.shippingCost, // NEW
    } as OrderSummaryItem; // Cast to OrderSummaryItem
  }, [orderLineItems]);

  const renderValue = useCallback((value: any, fieldName?: string) => {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
      return <span className="text-[var(--color-text-secondary)] italic">Not set</span>;
    }

    // Render StatusPill for known status/priority/health fields
    if (fieldName && ['status', 'acceptanceStatus'].includes(fieldName)) {
      return <StatusPill status={value}>{String(value)}</StatusPill>;
    }
    if (fieldName === 'paymentMode') {
      // FIX: Passed raw enum value to StatusPill as it handles internal mapping correctly.
      return <StatusPill status={value as PaymentMode}>{String(value)}</StatusPill>;
    }
    if (fieldName === 'orderType') {
      // FIX: Passed raw enum value to StatusPill as it handles internal mapping correctly.
      return <StatusPill status={value as OrderType}>{String(value)}</StatusPill>;
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
  }, []);

  const isBillingSameAsShipping = useMemo(() => {
    if (!summaryData) return false;
    return summaryData.shippingAddress === summaryData.billingAddress &&
           summaryData.shippingCity === summaryData.billingCity &&
           summaryData.shippingState === summaryData.billingState &&
           summaryData.shippingPincode === summaryData.billingPincode &&
           summaryData.shippingCountry === summaryData.billingCountry;
  }, [summaryData]);

  const currentTimelineStage = useMemo(() => {
    if (!summaryData?.status) return OrderTimelineStage.ORDER_PLACED;
    // Map individual product workflow statuses to overall order stages
    if (orderLineItems.some(item => item.productStatus === ProductWorkflowStatus.DESIGN_PENDING || item.productStatus === ProductWorkflowStatus.DESIGN_REJECTED)) {
      return OrderTimelineStage.PROCESSING; // Design issues mean it's still in initial processing stages
    }
    if (orderLineItems.some(item => item.productStatus === ProductWorkflowStatus.QUEUED_FOR_PICK || item.productStatus === ProductWorkflowStatus.BLANK_PICKED)) {
      return OrderTimelineStage.PROCESSING;
    }
    if (orderLineItems.some(item => item.productStatus === ProductWorkflowStatus.BATCHED || item.productStatus === ProductWorkflowStatus.QUEUED_FOR_PRODUCTION || item.productStatus === ProductWorkflowStatus.IN_PRODUCTION)) {
      return OrderTimelineStage.PRODUCTION;
    }
    if (orderLineItems.some(item => item.productStatus === ProductWorkflowStatus.FINISHING_PENDING || item.productStatus === ProductWorkflowStatus.FULFILLMENT_PENDING)) {
      return OrderTimelineStage.FULFILLMENT;
    }
    if (orderLineItems.some(item => item.productStatus === ProductWorkflowStatus.PACKED)) {
      return OrderTimelineStage.FULFILLMENT; // Packed is still within Fulfillment before Shipped
    }
    if (orderLineItems.some(item => item.productStatus === ProductWorkflowStatus.SHIPPED)) {
      return OrderTimelineStage.SHIPPED;
    }
    if (orderLineItems.some(item => item.productStatus === ProductWorkflowStatus.DELIVERED)) {
      return OrderTimelineStage.DELIVERED;
    }
    
    // Fallback to original order status mapping if no specific product workflow status
    switch(summaryData.status) {
      case OrderStatus.ORDER_PLACED: return OrderTimelineStage.ORDER_PLACED;
      case OrderStatus.PROCESSING:
      case OrderStatus.DESIGN_PENDING: return OrderTimelineStage.PROCESSING;
      case OrderStatus.PRODUCTION: return OrderTimelineStage.PRODUCTION;
      case OrderStatus.FULFILLMENT: return OrderTimelineStage.FULFILLMENT;
      case OrderStatus.SHIPPED: return OrderTimelineStage.SHIPPED;
      case OrderStatus.DELIVERED: return OrderTimelineStage.DELIVERED;
      case OrderStatus.CANCELLED: return OrderTimelineStage.ORDER_PLACED; // Special case for cancelled
      default: return OrderTimelineStage.ORDER_PLACED;
    }
  }, [summaryData?.status, orderLineItems]);

  const timelineStages = useMemo(() => [
    OrderTimelineStage.ORDER_PLACED,
    OrderTimelineStage.PROCESSING,
    OrderTimelineStage.PRODUCTION,
    OrderTimelineStage.FULFILLMENT,
    OrderTimelineStage.SHIPPED,
    OrderTimelineStage.DELIVERED,
  ], []);

  const getTimelineStageEmoji = (stage: OrderTimelineStage) => {
    switch(stage) {
      case OrderTimelineStage.ORDER_PLACED: return '📝';
      case OrderTimelineStage.PAID: return '💰';
      case OrderTimelineStage.PROCESSING: return '⚙️';
      case OrderTimelineStage.PRODUCTION: return '🏭';
      case OrderTimelineStage.FULFILLMENT: return '📦';
      case OrderTimelineStage.SHIPPED: return '🚚';
      case OrderTimelineStage.DELIVERED: return '✅';
      default: return '⚪';
    }
  };

  const handleEditOrder = useCallback(() => {
    setIsEditOrderModalOpen(true);
  }, []);

  const handleSaveOrder = useCallback(async (orderData: Partial<OrderSummaryItem>, lineItems: Partial<OrderItem>[]) => {
    // Logic to save/update the overall order (summaryData) and all its line items.
    // This will involve calling saveItem for each line item, and potentially updating a new summary row.
    
    // Identify existing line items vs new ones
    const existingLineItemIds = new Set(orderLineItems.map(item => item.id));
    const updatedOrNewLineItems = lineItems.filter(item => item.id);
    const newlyAddedLineItems = lineItems.filter(item => !item.id);

    // Update existing line items and add new ones
    await Promise.all(updatedOrNewLineItems.map(async (lineItem) => {
      await saveItem({ ...lineItem, orderNumber: orderNumber! }); // Ensure orderNumber is set
      existingLineItemIds.delete(lineItem.id!); // Mark as processed
    }));

    await Promise.all(newlyAddedLineItems.map(async (lineItem) => {
        await saveItem({ 
            ...lineItem, 
            orderNumber: orderNumber!, 
            id: `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, // Generate new ID
            status: orderData.status, // Inherit overall order status for new items
            acceptanceStatus: orderData.acceptanceStatus,
            paymentMode: orderData.paymentMode,
            orderType: orderData.orderType,
        });
    }));

    // Any remaining IDs in existingLineItemIds were deleted from the form
    for (const id of existingLineItemIds) {
      const itemToDelete = orderLineItems.find(item => item.id === id);
      if (itemToDelete) await deleteItem(itemToDelete);
    }

    await loadOrders(true); // Refresh data after save
    alert('Order created successfully!'); // Use a toast in real app
    // Optionally clear form or redirect
  }, [orderNumber, orderLineItems, saveItem, deleteItem, loadOrders]);

  const handleCancelOrder = useCallback(async () => {
    if (!summaryData?.orderNumber) return;
    await Promise.all(orderLineItems.map(item =>
      saveItem({ ...item, status: OrderStatus.CANCELLED })
    ));
    await loadOrders(true);
    setIsConfirmCancelOrderOpen(false);
    onClose(); // Close the drawer after cancelling
  }, [summaryData, orderLineItems, saveItem, loadOrders, onClose]);

  const handleAddProduct = useCallback(() => {
    setIsAddProductModalOpen(true);
  }, []);

  const handleSaveLineItem = useCallback(async (itemData: Partial<OrderItem>) => {
    await saveItem({ ...itemData, orderNumber: orderNumber! });
    setIsAddProductModalOpen(false);
    setEditingLineItem(null); // Clear editing state
    setIsEditLineItemModalOpen(false);
  }, [saveItem, orderNumber]);

  const handleDeleteLineItem = useCallback(async (item: OrderItem) => {
    await deleteItem(item);
    setIsConfirmDeleteLineItemOpen(false);
    setLineItemToDelete(null);
  }, [deleteItem]);

  const handleEditLineItem = useCallback((item: OrderItem) => {
    setEditingLineItem(item);
    setIsEditLineItemModalOpen(true);
  }, []);


  const drawerTitle = `Order Details: ${summaryData?.orderNumber || 'N/A'}`; // FIX: Added optional chaining

  if (!isOpen || !summaryData) {
    console.log('OrderSummaryDetailDrawer NOT rendering (isOpen or summaryData is false/null)');
    return null;
  }

  // Use config for generic item headers
  const config = ORDER_SHEET_CONFIG; 

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
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-bold text-[var(--color-brand-primary)]">Order Info</h3>
            {/* FIX: Passed raw enum value to StatusPill as it handles internal mapping correctly. */}
            {summaryData.paymentMode && <StatusPill status={summaryData.paymentMode}>{summaryData.paymentMode}</StatusPill>}
          </div>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
            {[
              { key: 'orderNumber', label: 'Order #' },
              { key: 'date', label: 'Date' },
              { key: 'time', label: 'Time' },
              { key: 'partnerOrderNumber', label: 'Partner Order #' },
              // Removed orderType, orderMadeBy, salesChannel, paymentMode from here
              { key: 'orderMadeBy', label: 'Order Made By' },
              { key: 'acceptanceStatus', label: 'Acceptance Status' },
              { key: 'status', label: 'Status' },
              { key: 'totalAmountWithTax', label: 'Total Amount' },
              { key: 'shippingCost', label: 'Shipping Cost' },
            ].map(field => (
              <div key={field.key} className="flex flex-col">
                <h4 className="text-xs font-bold uppercase text-[var(--color-text-secondary)] tracking-wider">{field.label}</h4>
                <p className="text-base text-[var(--color-text-primary)] mt-1 break-words whitespace-pre-wrap">
                  {field.key === 'orderNumber' ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <span>{renderValue(summaryData?.[field.key], field.key)}</span>
                      {/* FIX: Passed raw enum value to StatusPill as it handles internal mapping correctly. */}
                      {summaryData.orderType && <StatusPill status={summaryData.orderType}>{summaryData.orderType}</StatusPill>}
                      {summaryData.salesChannel && <Tag color={getSalesChannelTagColor(summaryData.salesChannel)}>{summaryData.salesChannel}</Tag>}
                    </span>
                  ) : (
                    renderValue(summaryData?.[field.key], field.key)
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Order Timeline */}
        <div>
          <h3 className="text-lg font-bold text-[var(--color-brand-primary)] mb-2">Order Timeline</h3>
          <div className="flex items-center justify-between">
            {timelineStages.map((stage, index) => (
              <React.Fragment key={stage}>
                <div className="flex flex-col items-center flex-1 min-w-0">
                  <span
                    className={`text-2xl ${stage === currentTimelineStage ? 'text-[var(--color-brand-primary)]' : 'text-[var(--color-text-secondary)]'}`}
                    title={stage}
                    aria-hidden={true}
                  >
                    {getTimelineStageEmoji(stage)}
                  </span>
                  <p className={`text-xs text-center mt-1 whitespace-normal ${stage === currentTimelineStage ? 'font-bold text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                    {stage}
                  </p>
                </div>
                {index < timelineStages.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${index < timelineStages.indexOf(currentTimelineStage) ? 'bg-[var(--color-brand-primary)]' : 'bg-[var(--color-border-primary)]'}`}></div>
                )}
              </React.Fragment>
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

        {/* Products (Line Items) */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-[var(--color-brand-primary)]">Products ({orderLineItems.length})</h3>
          </div>
          {orderLineItems.length > 0 ? (
            <Table headers={['Product', 'Variant', 'Qty', 'Status', 'Unit Amount', 'Actions']}>
              {orderLineItems.map((item, index) => (
                <tr key={item.id || index}>
                  <td className="px-4 py-2 text-sm">{item.product}</td>
                  <td className="px-4 py-2 text-sm">{item.variant}</td>
                  <td className="px-4 py-2 text-sm">{item.quantity}</td>
                  <td className="px-4 py-2 text-sm"><StatusPill status={item.productStatus}>{item.productStatus}</StatusPill></td>
                  <td className="px-4 py-2 text-sm">
                    {item.unit_price !== undefined ? `₹${(item.unit_price / (item.quantity || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex space-x-2 justify-end">
                        <Button size="sm" variant="secondary" onClick={() => handleEditLineItem(item)} title="Edit Line Item">✏️</Button>
                        <Button size="sm" variant="destructive" onClick={() => { setLineItemToDelete(item); setIsConfirmDeleteLineItemOpen(true); }} title="Delete Line Item">🗑️</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <p className="text-[var(--color-text-secondary)] italic">No product line items found for this order.</p>
          )}
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-[var(--color-border-primary)] flex flex-wrap gap-3">
        <Button variant="primary" onClick={() => handleEditOrder()}>
          <span role="img" aria-label="edit" className="mr-2">✏️</span> Edit Order
        </Button>
        <Button variant="secondary" onClick={() => setIsConfirmCancelOrderOpen(true)}>
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

      {/* Modals for actions */}
      <Modal open={isEditOrderModalOpen} onClose={() => setIsEditOrderModalOpen(false)} title={`Edit Order: ${orderNumber}`}>
        <OrderEditForm
          order={summaryData}
          onSave={handleSaveOrder}
          onCancel={() => setIsEditOrderModalOpen(false)}
        />
      </Modal>

      <Modal open={isAddProductModalOpen} onClose={() => setIsAddProductModalOpen(false)} title={`Add Product to Order: ${orderNumber}`}>
        <OrderItemForm
          item={{ orderNumber: orderNumber, status: OrderStatus.DESIGN_PENDING, productStatus: ProductWorkflowStatus.DESIGN_PENDING }} // Pre-fill order number and default status
          onSave={handleSaveLineItem}
          onCancel={() => setIsAddProductModalOpen(false)}
        />
      </Modal>

      <Modal open={isEditLineItemModalOpen} onClose={() => setIsEditLineItemModalOpen(false)} title={`Edit Line Item: ${editingLineItem?.product}`}>
        <OrderItemForm
          item={editingLineItem}
          onSave={handleSaveLineItem}
          onCancel={() => setIsEditLineItemModalOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={isConfirmCancelOrderOpen}
        onCancel={() => setIsConfirmCancelOrderOpen(false)}
        onConfirm={handleCancelOrder}
        title="Confirm Order Cancellation"
        body={`Are you sure you want to cancel order "${orderNumber}"? This will update the status of all line items to 'Cancelled'.`}
        confirmLabel="Confirm Cancel"
        tone="danger"
      />

      <ConfirmDialog
        open={isConfirmDeleteLineItemOpen}
        onCancel={() => setIsConfirmDeleteLineItemOpen(false)}
        onConfirm={() => lineItemToDelete && handleDeleteLineItem(lineItemToDelete)}
        title="Confirm Delete Line Item"
        body={`Are you sure you want to delete product "${lineItemToDelete?.product}" from order "${lineItemToDelete?.orderNumber}"? This action will clear the row in Google Sheets.`}
        confirmLabel="Clear Row"
        tone="danger"
      />
    </Drawer>
  );
};

export default OrderDetailsDrawer;
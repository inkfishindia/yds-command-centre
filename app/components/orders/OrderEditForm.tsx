// components/orders/OrderEditForm.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { Button, Input, Select, Textarea, Checkbox, Card, Table, StatusPill, EmptyState } from '../../ui';
import { OrderSummaryItem, OrderItem, OrderStatus, AcceptanceStatus, PaymentMode, OrderType, ProductStockStatus, QCStatus, ProductWorkflowStatus, BlankQCStatus, OrderEditFormProps } from '../../types';
import { usePicklists } from '../../hooks/usePicklists';
import { useOrder } from '../../contexts/OrderContext';
import { getProductStatusEmoji } from '../../utils/orderUtils';

const OrderEditForm: React.FC<OrderEditFormProps> = ({ order, onSave, onCancel }) => {
  const { picklists } = usePicklists();
  const { saveItem, deleteItem } = useOrder(); // For individual line item actions

  const [orderSummaryFormData, setOrderSummaryFormData] = useState<Partial<OrderSummaryItem>>(() => {
    // If editing, use existing data; otherwise, initialize with defaults for new order
    const initialData = order || {
      orderNumber: `YD-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      customerName: '',
      status: OrderStatus.ORDER_PLACED,
      acceptanceStatus: AcceptanceStatus.AWAITING,
      paymentMode: PaymentMode.PREPAID,
      orderType: OrderType.B2C,
      salesChannel: 'Website',
      totalNoOfProducts: 0,
      totalQuantityOfAllProducts: 0,
      totalAmountWithTax: 0,
      email: '',
      phone: '',
      gstin: '',
      partnerOrderNumber: '',
      orderMadeBy: '',
      shippingName: '',
      shippingPhone: '',
      shippingAddress: '',
      shippingCity: '',
      shippingState: '',
      shippingCountry: '',
      shippingPincode: '',
      billingName: '',
      billingPhone: '',
      billingAddress: '',
      billingCity: '',
      billingState: '',
      billingCountry: '',
      billingPincode: '',
      shippingType: '',
      shippingCost: undefined,
    };

    // Initialize `isBillingSameAsShipping` based on initialData for default state
    const isSame = initialData.shippingAddress === initialData.billingAddress &&
                   initialData.shippingCity === initialData.billingCity &&
                   initialData.shippingState === initialData.billingState &&
                   initialData.shippingPincode === initialData.billingPincode &&
                   initialData.shippingCountry === initialData.billingCountry &&
                   !!initialData.shippingAddress; // Ensure shipping is set for 'same'
    return { ...initialData, isBillingSameAsShipping: isSame };
  });

  const [lineItemsFormData, setLineItemsFormData] = useState<Partial<OrderItem>[]>(() => {
    // When editing an existing order, we would load its line items here.
    // For simplicity with the current mock data/context, assume new orders start empty
    // and for existing orders, line items are managed by OrderDetailsDrawer, not this form directly yet.
    // If this form is used for editing, it should receive `initialLineItems` via props.
    return [];
  });

  const [newLineItemInput, setNewLineItemInput] = useState<Partial<OrderItem>>({
    productStatus: ProductWorkflowStatus.DESIGN_PENDING, // Default status for new products
    quantity: 1,
    unit_price: 0,
  });

  const getOptions = (enumObject: any) =>
    Object.values(enumObject).map(v => ({ value: String(v), label: String(v) }));

  const orderStatusOptions = useMemo(() => getOptions(OrderStatus), []);
  const acceptanceStatusOptions = useMemo(() => getOptions(AcceptanceStatus), []);
  const paymentModeOptions = useMemo(() => getOptions(PaymentMode), []);
  const orderTypeOptions = useMemo(() => getOptions(OrderType), []);
  const productWorkflowStatusOptions = useMemo(() => getOptions(ProductWorkflowStatus), []); // NEW: For line item
  const productStockStatusOptions = useMemo(() => getOptions(ProductStockStatus), []);
  const qcStatusOptions = useMemo(() => getOptions(QCStatus), []);
  const blankQCStatusOptions = useMemo(() => getOptions(BlankQCStatus), []); // NEW: For line item


  const handleSummaryInputChange = (field: keyof OrderSummaryItem, value: string | number | boolean | undefined) => {
    setOrderSummaryFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNewLineItemInputChange = (field: keyof OrderItem, value: string | number | boolean | undefined) => {
    setNewLineItemInput(prev => ({ ...prev, [field]: value }));
  };

  const handleAddLineItem = () => {
    if (newLineItemInput.product && newLineItemInput.quantity && newLineItemInput.unit_price) {
      setLineItemsFormData(prev => [
        ...prev,
        {
          ...newLineItemInput,
          orderNumber: orderSummaryFormData.orderNumber, // Ensure new line item links to this order
          id: `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, // Client-side ID
          status: orderSummaryFormData.status, // Inherit order status
          acceptanceStatus: orderSummaryFormData.acceptanceStatus, // Inherit order acceptance status
          paymentMode: orderSummaryFormData.paymentMode, // Inherit order payment mode
          orderType: orderSummaryFormData.orderType, // Inherit order type
          line_total: (newLineItemInput.quantity || 0) * (newLineItemInput.unit_price || 0),
          productStatus: newLineItemInput.productStatus || ProductWorkflowStatus.DESIGN_PENDING, // Enforce default
        },
      ]);
      setNewLineItemInput({ productStatus: ProductWorkflowStatus.DESIGN_PENDING, quantity: 1, unit_price: 0 }); // Reset form for next item
    } else {
      alert('Please fill in product, quantity, and unit price for the new line item.');
    }
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItemsFormData(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderSummaryFormData.customerName || lineItemsFormData.length === 0) {
      alert('Please fill in customer name and add at least one product.');
      return;
    }

    // Calculate aggregated values
    const totalQty = lineItemsFormData.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalAmt = lineItemsFormData.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0);

    const finalOrderSummary = {
      ...orderSummaryFormData,
      totalNoOfProducts: lineItemsFormData.length,
      totalQuantityOfAllProducts: totalQty,
      totalAmountWithTax: totalAmt,
    };

    await onSave(finalOrderSummary, lineItemsFormData);
  };

  const handleToggleBillingAddress = useCallback((checked: boolean) => {
    handleSummaryInputChange('isBillingSameAsShipping', checked);
    if (checked) {
      setOrderSummaryFormData(prev => ({
        ...prev,
        billingName: prev.shippingName,
        billingPhone: prev.shippingPhone,
        billingAddress: prev.shippingAddress,
        billingCity: prev.shippingCity,
        billingState: prev.shippingState,
        billingCountry: prev.shippingCountry,
        billingPincode: prev.shippingPincode,
      }));
    } else {
      setOrderSummaryFormData(prev => ({
        ...prev,
        billingName: '',
        billingPhone: '',
        billingAddress: '',
        billingCity: '',
        billingState: '',
        billingCountry: '',
        billingPincode: '',
      }));
    }
  }, [handleSummaryInputChange]);

  const isBillingSameAsShipping = orderSummaryFormData.isBillingSameAsShipping ?? false; // Default to false if undefined

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Info */}
      <Card title="Customer & Order Details" className="!p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Order #" value={orderSummaryFormData.orderNumber || ''} disabled />
          <Input label="Date" type="date" value={orderSummaryFormData.date || ''} onChange={e => handleSummaryInputChange('date', e.target.value)} required />
          <Input label="Time" type="time" value={orderSummaryFormData.time || ''} onChange={e => handleSummaryInputChange('time', e.target.value)} />
          <Input label="Customer Name" value={orderSummaryFormData.customerName || ''} onChange={e => handleSummaryInputChange('customerName', e.target.value)} required />
          <Input label="Email" value={orderSummaryFormData.email || ''} onChange={e => handleSummaryInputChange('email', e.target.value)} type="email" />
          <Input label="Phone" value={orderSummaryFormData.phone || ''} onChange={e => handleSummaryInputChange('phone', e.target.value)} />
          <Input label="GSTIN" value={orderSummaryFormData.gstin || ''} onChange={e => handleSummaryInputChange('gstin', e.target.value)} placeholder="e.g., 29ABCDE1234F1Z5" />
          <Input label="Partner Order #" value={orderSummaryFormData.partnerOrderNumber || ''} onChange={e => handleSummaryInputChange('partnerOrderNumber', e.target.value)} />
          
          <Select label="Order Type" options={orderTypeOptions} value={orderSummaryFormData.orderType || ''} onChange={v => handleSummaryInputChange('orderType', v as OrderType)} />
          <Input label="Order Made By" value={orderSummaryFormData.orderMadeBy || ''} onChange={e => handleSummaryInputChange('orderMadeBy', e.target.value)} />
          <Select label="Sales Channel" options={picklists.sales_channel_values?.map(v => ({value: v, label: v})) || []} value={orderSummaryFormData.salesChannel || ''} onChange={v => handleSummaryInputChange('salesChannel', v)} />
          <Select label="Overall Status" options={orderStatusOptions} value={orderSummaryFormData.status || ''} onChange={v => handleSummaryInputChange('status', v as OrderStatus)} />
          <Select label="Acceptance Status" options={acceptanceStatusOptions} value={orderSummaryFormData.acceptanceStatus || ''} onChange={v => handleSummaryInputChange('acceptanceStatus', v as AcceptanceStatus)} />
          <Select label="Payment Mode" options={paymentModeOptions} value={orderSummaryFormData.paymentMode || ''} onChange={v => handleSummaryInputChange('paymentMode', v as PaymentMode)} />
          <Input label="Shipping Type" value={orderSummaryFormData.shippingType || ''} onChange={e => handleSummaryInputChange('shippingType', e.target.value)} />
          <Input label="Shipping Cost" type="number" value={orderSummaryFormData.shippingCost ?? ''} onChange={e => handleSummaryInputChange('shippingCost', parseFloat(e.target.value) || undefined)} />
        </div>
      </Card>

      {/* Shipping Address */}
      <Card title="Shipping Address" className="!p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Shipping Name" value={orderSummaryFormData.shippingName || ''} onChange={e => handleSummaryInputChange('shippingName', e.target.value)} />
          <Input label="Shipping Phone" value={orderSummaryFormData.shippingPhone || ''} onChange={e => handleSummaryInputChange('shippingPhone', e.target.value)} />
          <Textarea label="Shipping Address" value={orderSummaryFormData.shippingAddress || ''} onChange={e => handleSummaryInputChange('shippingAddress', e.target.value)} rows={2} />
          <Input label="Shipping City" value={orderSummaryFormData.shippingCity || ''} onChange={e => handleSummaryInputChange('shippingCity', e.target.value)} />
          <Input label="Shipping State" value={orderSummaryFormData.shippingState || ''} onChange={e => handleSummaryInputChange('shippingState', e.target.value)} />
          <Input label="Shipping Country" value={orderSummaryFormData.shippingCountry || ''} onChange={e => handleSummaryInputChange('shippingCountry', e.target.value)} />
          <Input label="Shipping Pincode" value={orderSummaryFormData.shippingPincode || ''} onChange={e => handleSummaryInputChange('shippingPincode', e.target.value)} />
        </div>
      </Card>

      {/* Billing Address */}
      <Card title="Billing Address" className="!p-4">
        <Checkbox label="Same as Shipping Address" checked={isBillingSameAsShipping} onChange={handleToggleBillingAddress} />
        {!isBillingSameAsShipping && ( // Only show if not same
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Input label="Billing Name" value={orderSummaryFormData.billingName || ''} onChange={e => handleSummaryInputChange('billingName', e.target.value)} />
            <Input label="Billing Phone" value={orderSummaryFormData.billingPhone || ''} onChange={e => handleSummaryInputChange('billingPhone', e.target.value)} />
            <Textarea label="Billing Address" value={orderSummaryFormData.billingAddress || ''} onChange={e => handleSummaryInputChange('billingAddress', e.target.value)} rows={2} />
            <Input label="Billing City" value={orderSummaryFormData.billingCity || ''} onChange={e => handleSummaryInputChange('billingCity', e.target.value)} />
            <Input label="Billing State" value={orderSummaryFormData.billingState || ''} onChange={e => handleSummaryInputChange('billingState', e.target.value)} />
            <Input label="Billing Country" value={orderSummaryFormData.billingCountry || ''} onChange={e => handleSummaryInputChange('billingCountry', e.target.value)} />
            <Input label="Billing Pincode" value={orderSummaryFormData.billingPincode || ''} onChange={e => handleSummaryInputChange('billingPincode', e.target.value)} />
          </div>
        )}
      </Card>

      {/* Products Section */}
      <Card title="Products" className="!p-4">
        <h4 className="text-md font-semibold text-[var(--color-brand-primary)] mb-3">Add New Product Line Item</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Input label="Product Name" value={newLineItemInput.product || ''} onChange={e => handleNewLineItemInputChange('product', e.target.value)} />
          <Input label="Variant" value={newLineItemInput.variant || ''} onChange={e => handleNewLineItemInputChange('variant', e.target.value)} />
          <Input label="Quantity" type="number" value={newLineItemInput.quantity ?? ''} onChange={e => handleNewLineItemInputChange('quantity', parseFloat(e.target.value) || undefined)} />
          <Input label="Unit Price" type="number" value={newLineItemInput.unit_price ?? ''} onChange={e => handleNewLineItemInputChange('unit_price', parseFloat(e.target.value) || undefined)} step="0.01" />
          <Select label="Product Workflow Status" options={productWorkflowStatusOptions} value={newLineItemInput.productStatus || ''} onChange={v => handleNewLineItemInputChange('productStatus', v as ProductWorkflowStatus)} />
          <Input label="Blank Article SKU" value={newLineItemInput.blank_article_sku || ''} onChange={e => handleNewLineItemInputChange('blank_article_sku', e.target.value)} />
          <Input label="Stock Location" value={newLineItemInput.stock_location || ''} onChange={e => handleNewLineItemInputChange('stock_location', e.target.value)} />
          <Button type="button" variant="secondary" onClick={handleAddLineItem} className="md:col-span-2 mt-4">➕ Add Product</Button>
        </div>

        <h4 className="text-md font-semibold text-[var(--color-brand-primary)] mb-3 mt-6">Current Product Line Items ({lineItemsFormData.length})</h4>
        {lineItemsFormData.length === 0 ? (
          <EmptyState title="No Products Added" description="Add products to this order using the form above." />
        ) : (
          <Table headers={['Product', 'Variant', 'Qty', 'Unit Price', 'Status', 'Blank SKU', 'Actions']}>
            {lineItemsFormData.map(item => (
              <tr key={item.id}>
                <td className="px-4 py-2 text-sm">{item.product}</td>
                <td className="px-4 py-2 text-sm">{item.variant}</td>
                <td className="px-4 py-2 text-sm">{item.quantity}</td>
                <td className="px-4 py-2 text-sm"><StatusPill status={item.productStatus}>{item.productStatus}</StatusPill></td>
                <td className="px-4 py-2 text-sm">₹{(item.unit_price || 0).toLocaleString()}</td>
                <td className="px-4 py-2 text-sm">{item.blank_article_sku || 'N/A'}</td>
                <td className="px-4 py-2 text-right">
                  <Button size="sm" variant="destructive" onClick={() => handleRemoveLineItem(item.id!)}>🗑️</Button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary">Save Order</Button>
      </div>
    </form>
  );
};

export default OrderEditForm;
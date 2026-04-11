// components/orders/OrderItemForm.tsx
import React, { useState, useMemo } from 'react';
import { Button, Input, Select, Textarea, Checkbox } from '../../ui'; // FIX: Explicitly imported Checkbox
import { OrderItem, OrderStatus, AcceptanceStatus, PaymentMode, OrderType, ProductStockStatus, QCStatus, ProductWorkflowStatus, BlankQCStatus } from '../../types';
import { ORDER_SHEET_CONFIG } from '../../src/config/orderSheetConfig';
import { usePicklists } from '../../hooks/usePicklists'; // Import usePicklists to get dynamic options

interface OrderItemFormProps {
  item?: Partial<OrderItem> | null;
  onSave: (itemData: Partial<OrderItem>) => void;
  onCancel: () => void;
}

const OrderItemForm: React.FC<OrderItemFormProps> = ({ item, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<OrderItem>>(item || {});
  const { picklists } = usePicklists(); // Get dynamic picklist options

  const handleInputChange = (field: keyof OrderItem, value: string | number | boolean | undefined) => {
    setFormData((prev: Partial<OrderItem>) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const getOptions = (enumObject: any) =>
    Object.values(enumObject).map(v => ({ value: String(v), label: String(v) }));

  const fieldDefinitions = useMemo(() => {
    // Dynamically create an ordered list of fields for rendering
    // Exclude 'id' as it's internal.
    // Order fields logically for better UX.
    const orderedFields: Array<{ 
      key: keyof OrderItem, 
      type: 'text' | 'number' | 'date' | 'time' | 'select' | 'textarea' | 'checkbox', 
      label: string, 
      options?: Array<{value: string, label: string}>, 
      disabled?: boolean, 
      placeholder?: string,
      hidden?: boolean, // New property to hide fields
      rows?: number, // FIX: Added rows property for textarea type
    }> = [
      { key: 'orderNumber', type: 'text', label: 'Order #', disabled: !!item?.id, placeholder: 'e.g., ORD-123456' },
      { key: 'date', type: 'date', label: 'Date' },
      { key: 'time', type: 'time', label: 'Time' },
      { key: 'customerName', type: 'text', label: 'Customer Name' },
      { key: 'email', type: 'text', label: 'Email', placeholder: 'e.g., customer@example.com' },
      { key: 'phone', type: 'text', label: 'Phone', placeholder: 'e.g., +91-9876543210' },
      { key: 'gstin', type: 'text', label: 'GSTIN', placeholder: 'e.g., 29ABCDE1234F1Z5' },
      { key: 'partnerOrderNumber', type: 'text', label: 'Partner Order #', placeholder: 'e.g., PARTNERX-12345' },
      { key: 'orderType', type: 'select', label: 'Order Type', options: getOptions(OrderType) },
      { key: 'orderMadeBy', type: 'text', label: 'Order Made By', placeholder: 'e.g., Website, Sales Agent' },
      { key: 'salesChannel', type: 'select', label: 'Sales Channel', options: picklists.sales_channel_values?.map(v => ({value: v, label: v})) || [] },
      
      { key: 'shippingName', type: 'text', label: 'Shipping Name' },
      { key: 'shippingPhone', type: 'text', label: 'Shipping Phone' },
      { key: 'shippingAddress', type: 'textarea', label: 'Shipping Address', placeholder: 'Street, Apt/Bldg', rows: 3 },
      { key: 'shippingCity', type: 'text', label: 'Shipping City' },
      { key: 'shippingState', type: 'text', label: 'Shipping State' },
      { key: 'shippingCountry', type: 'text', label: 'Shipping Country' },
      { key: 'shippingPincode', type: 'text', label: 'Shipping Pincode' },

      { key: 'billingName', type: 'text', label: 'Billing Name' },
      { key: 'billingPhone', type: 'text', label: 'Billing Phone' },
      { key: 'billingAddress', type: 'textarea', label: 'Billing Address', placeholder: 'Street, Apt/Bldg', rows: 3 },
      { key: 'billingCity', type: 'text', label: 'Billing City' },
      { key: 'billingState', type: 'text', label: 'Billing State' },
      { key: 'billingCountry', type: 'text', label: 'Billing Country' },
      { key: 'billingPincode', type: 'text', label: 'Billing Pincode' },

      { key: 'product', type: 'text', label: 'Product' },
      { key: 'variant', type: 'text', label: 'Variant' },
      { key: 'quantity', type: 'number', label: 'Quantity' },
      { key: 'totalNoOfProducts', type: 'number', label: 'Total No of Products', disabled: true, placeholder: 'Auto-calculated' },
      { key: 'totalQuantityOfAllProducts', type: 'number', label: 'Total Quantity of All Products', disabled: true, placeholder: 'Auto-calculated' },
      { key: 'totalAmountWithTax', type: 'number', label: 'Total Amount with Tax' },

      { key: 'line_item_id', type: 'text', label: 'Line Item ID', placeholder: 'Auto-generated if new', disabled: !!item?.id },
      { key: 'sku', type: 'text', label: 'SKU' },
      { key: 'unit_price', type: 'number', label: 'Unit Price' },
      { key: 'line_total', type: 'number', label: 'Line Total', disabled: true, placeholder: 'Auto-calculated' },
      { key: 'blank_article_sku', type: 'text', label: 'Blank Article SKU' },
      { key: 'product_supplier', type: 'text', label: 'Product Supplier' },
      { key: 'product_stock_status', type: 'select', label: 'Product Stock Status', options: getOptions(ProductStockStatus) },
      { key: 'productStockCount', type: 'number', label: 'Product Stock Count' },
      { key: 'blankStockAvailable', type: 'number', label: 'Blank Stock Available' }, // NEW
      { key: 'stock_location', type: 'text', label: 'Stock Location' }, // NEW
      { key: 'picker_name', type: 'text', label: 'Picker Name' }, // NEW
      { key: 'picked_at', type: 'date', label: 'Picked At' }, // NEW
      { key: 'blank_qc_status', type: 'select', label: 'Blank QC Status', options: getOptions(BlankQCStatus) }, // NEW
      { key: 'blank_qc_by', type: 'text', label: 'Blank QC By' }, // NEW
      { key: 'blank_qc_at', type: 'date', label: 'Blank QC At' }, // NEW
      { key: 'batchId', type: 'text', label: 'Batch ID' }, // NEW
      { key: 'print_technology', type: 'select', label: 'Print Technology', options: picklists.print_method_values?.map(v => ({value: v, label: v})) || [] },
      { key: 'print_location', type: 'text', label: 'Print Location' },
      { key: 'print_size', type: 'text', label: 'Print Size' },
      { key: 'print_color_count', type: 'number', label: 'Print Color Count' },
      { key: 'design_file_url', type: 'text', label: 'Design File URL', placeholder: 'https://example.com/design.png' },
      { key: 'design_file_format', type: 'text', label: 'Design File Format', placeholder: 'e.g., image/png' },
      { key: 'design_thumbnail_url', type: 'text', label: 'Design Thumbnail URL', placeholder: 'https://example.com/thumbnail.png' },
      { key: 'mockup_url', type: 'text', label: 'Mockup URL', placeholder: 'https://example.com/mockup.png' },
      { key: 'productStatus', type: 'select', label: 'Product Workflow Status', options: getOptions(ProductWorkflowStatus) }, // NEW: Using ProductWorkflowStatus
      { key: 'production_station', type: 'text', label: 'Production Station' },
      { key: 'assigned_to', type: 'text', label: 'Assigned To' },
      { key: 'print_started_at', type: 'date', label: 'Print Started At' },
      { key: 'print_completed_at', type: 'date', label: 'Print Completed At' },
      { key: 'production_time_seconds', type: 'number', label: 'Production Time (s)' },
      { key: 'finishingStatus', type: 'text', label: 'Finishing Status', placeholder: 'e.g., Completed, QC Pending' }, // NEW
      { key: 'finishing_by', type: 'text', label: 'Finishing By' }, // NEW
      { key: 'finishing_completed_at', type: 'date', label: 'Finishing Completed At' }, // NEW
      { key: 'qc_status', type: 'select', label: 'QC Status', options: getOptions(QCStatus) },
      { key: 'qc_notes', type: 'textarea', label: 'QC Notes', rows: 2 },
      { key: 'qc_checked_by', type: 'text', label: 'QC Checked By' },
      { key: 'qc_checked_at', type: 'date', label: 'QC Checked At' },
      { key: 'qc_fail_reason', type: 'textarea', label: 'QC Fail Reason', rows: 2, hidden: formData.qc_status !== QCStatus.FAILED },
      { key: 'qc_images_url', type: 'text', label: 'QC Images URL' },
      { key: 'reprint_required', type: 'checkbox', label: 'Reprint Required' },
      { key: 'reprint_count', type: 'number', label: 'Reprint Count', hidden: !formData.reprint_required },
      { key: 'whitelabelRequired', type: 'checkbox', label: 'Whitelabel Required' }, // NEW
      { key: 'whitelabelType', type: 'text', label: 'Whitelabel Type', hidden: !formData.whitelabelRequired }, // NEW
      { key: 'packingBy', type: 'text', label: 'Packing By' }, // NEW
      { key: 'packedAt', type: 'date', label: 'Packed At' }, // NEW
      { key: 'customerSpecialRequest', type: 'textarea', label: 'Customer Special Request', rows: 2 }, // NEW
      { key: 'internal_notes', type: 'textarea', label: 'Internal Notes', rows: 2 },
      { key: 'special_instructions', type: 'textarea', label: 'Special Instructions', rows: 2 },
      { key: 'weight_grams', type: 'number', label: 'Weight (grams)' },
      { key: 'is_rush_order', type: 'checkbox', label: 'Is Rush Order' },
      { key: 'production_cost', type: 'number', label: 'Production Cost' },
      { key: 'customerPaidPrice', type: 'number', label: 'Customer Paid Price' }, // NEW
      { key: 'sale_price', type: 'number', label: 'Sale Price' },
      { key: 'margin', type: 'number', label: 'Margin', disabled: true, placeholder: 'Auto-calculated' },
      { key: 'orderSourceUrl', type: 'text', label: 'Order Source URL', placeholder: 'https://...' }, // NEW
      { key: 'expectedShipDate', type: 'date', label: 'Expected Ship Date' }, // NEW
      { key: 'trackingNumber', type: 'text', label: 'Tracking Number' }, // NEW
      { key: 'carrier', type: 'text', label: 'Carrier' }, // NEW
      { key: 'shippedAt', type: 'date', label: 'Shipped At' }, // NEW

      { key: 'status', type: 'select', label: 'Order Status (Overall)', options: getOptions(OrderStatus) },
      { key: 'acceptanceStatus', type: 'select', label: 'Acceptance Status', options: getOptions(AcceptanceStatus) },
      { key: 'paymentMode', type: 'select', label: 'Payment Mode', options: getOptions(PaymentMode) },
      { key: 'shippingType', type: 'text', label: 'Shipping Type' },
      { key: 'shippingCost', type: 'number', label: 'Shipping Cost' },
    ];
    return orderedFields;
  }, [item, formData.qc_status, formData.reprint_required, formData.whitelabelRequired, picklists.sales_channel_values, picklists.print_method_values]);

  // Calculate line_total and margin if unit_price, quantity, production_cost, sale_price are available
  React.useEffect(() => {
    const unitPrice = parseFloat(String(formData.unit_price)) || 0;
    const quantity = parseFloat(String(formData.quantity)) || 0;
    const productionCost = parseFloat(String(formData.production_cost)) || 0;
    const salePrice = parseFloat(String(formData.sale_price)) || 0;

    const newLineTotal = unitPrice * quantity;
    const newMargin = (salePrice > 0 && productionCost > 0) ? ((salePrice - productionCost) / salePrice) * 100 : 0;

    let updated = false;
    if (formData.line_total !== newLineTotal) {
      setFormData(prev => ({ ...prev, line_total: newLineTotal }));
      updated = true;
    }
    if (formData.margin !== newMargin) {
      setFormData(prev => ({ ...prev, margin: newMargin }));
      updated = true;
    }
  }, [formData.unit_price, formData.quantity, formData.production_cost, formData.sale_price]);


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fieldDefinitions.map(fieldDef => {
        if (fieldDef.hidden) return null; // Hide field if specified

        const value = formData[fieldDef.key] !== undefined && formData[fieldDef.key] !== null
          ? String(formData[fieldDef.key])
          : '';
        const isRequired = ['orderNumber', 'customerName', 'product', 'quantity', 'date', 'time', 'line_item_id', 'sku'].includes(String(fieldDef.key));

        if (fieldDef.type === 'select') {
          return (
            <Select
              key={fieldDef.key}
              label={fieldDef.label}
              options={fieldDef.options || []}
              value={value}
              onChange={(val) => handleInputChange(fieldDef.key, val)}
              required={isRequired}
              disabled={fieldDef.disabled}
            />
          );
        } else if (fieldDef.type === 'textarea') {
          return (
            <Textarea
              key={fieldDef.key}
              label={fieldDef.label}
              value={value}
              onChange={(e) => handleInputChange(fieldDef.key, e.target.value)}
              rows={fieldDef.rows || 3}
              required={isRequired}
              disabled={fieldDef.disabled}
              placeholder={fieldDef.placeholder}
            />
          );
        } else if (fieldDef.type === 'checkbox') {
          return (
            <Checkbox
              key={fieldDef.key}
              label={fieldDef.label}
              checked={!!formData[fieldDef.key]}
              onChange={(checked) => handleInputChange(fieldDef.key, checked)}
              disabled={fieldDef.disabled}
            />
          );
        }
        else {
          return (
            <Input
              key={fieldDef.key}
              label={fieldDef.label}
              type={fieldDef.type === 'number' ? 'number' : fieldDef.type === 'date' ? 'date' : fieldDef.type === 'time' ? 'time' : 'text'}
              value={value}
              onChange={(e) => handleInputChange(fieldDef.key, fieldDef.type === 'number' ? parseFloat(e.target.value) || undefined : e.target.value)}
              required={isRequired}
              disabled={fieldDef.disabled}
              step={fieldDef.type === 'number' ? "0.01" : undefined}
              placeholder={fieldDef.placeholder}
            />
          );
        }
      })}
      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary">Save Order</Button>
      </div>
    </form>
  );
};

export default OrderItemForm;
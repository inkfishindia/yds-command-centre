
import React, { createContext, useState, useContext, useCallback, ReactNode, useEffect } from 'react';
import { OrderItem, OrderContextType, OrderStatus, AcceptanceStatus, PaymentMode, OrderType, OrderSummaryItem } from '../types';
import { useToast } from './ToastContext';

const OrderContext = createContext<OrderContextType | undefined>(undefined);

/**
 * Map a CC /api/sheets/OPS_SALES_ORDERS row to an OrderSummaryItem.
 * The CC API returns rows keyed by the exact sheet header names.
 */
function mapRowToSummary(row: any): OrderSummaryItem {
  return {
    id: row['Order #'] || String(row.rowIndex),
    orderNumber: row['Order #'] || '',
    date: row['Date'] || '',
    time: row['Time'] || '',
    gstin: row['GSTIN'] || '',
    customerName: row['Customer'] || '',
    email: row['Email'] || '',
    phone: row['Phone'] || '',
    partnerOrderNumber: row['Partner Order Number'] || '',
    orderType: (row['Order Type'] || 'B2C') as OrderType,
    orderMadeBy: row['Order Made By'] || '',
    salesChannel: row['Sales Channel'] || '',
    shippingName: row['Shipping Name'] || '',
    shippingPhone: row['Shipping Phone'] || '',
    shippingAddress: row['Shipping Address'] || '',
    shippingCity: row['Shipping City'] || '',
    shippingState: row['Shipping State'] || '',
    shippingCountry: row['Shipping Country'] || '',
    shippingPincode: row['Shipping Pincode'] || '',
    billingName: row['Billing Name'] || '',
    billingPhone: row['Billing Phone'] || '',
    billingAddress: row['Billing Address'] || '',
    billingCity: row['Billing City'] || '',
    billingState: row['Billing State'] || '',
    billingCountry: row['Billing Country'] || '',
    billingPincode: row['Billing Pincode'] || '',
    shippingType: row['Shipping Type'] || '',
    shippingCost: parseFloat(row['Shipping Cost'] || '0') || 0,
    totalAmountWithTax: parseFloat(row['Total Amount with tax'] || '0') || 0,
    totalNoOfProducts: parseInt(row['Total No of Products'] || '0', 10) || 0,
    totalQuantityOfAllProducts: parseInt(row['Total Quantity of all the products'] || '0', 10) || 0,
    status: (row['Status'] || 'New') as OrderStatus,
    acceptanceStatus: (row['Acceptance Status'] || 'Awaiting') as AcceptanceStatus,
    paymentMode: (row['Payment Mode'] || 'COD') as PaymentMode,
  };
}

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { addToast } = useToast();

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderSummaryItems, setOrderSummaryItems] = useState<OrderSummaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [selectedOrderNumberForDetail, setSelectedOrderNumberForDetail] = useState<string | null>(null);
  const [orderSheetId, setOrderSheetIdState] = useState<string>('');

  const setOrderSheetId = useCallback((id: string) => {
    setOrderSheetIdState(id);
  }, []);

  const loadOrders = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sheets/OPS_SALES_ORDERS');
      if (!res.ok) throw new Error(`Failed to fetch orders: ${res.status}`);
      const data = await res.json();
      if (data.available === false) {
        setError('Orders sheet not configured on server');
        return;
      }
      const summaries = (data.rows || []).map(mapRowToSummary);
      setOrderSummaryItems(summaries);
      // For now, order line items come from the same dataset (one row = one order)
      setOrderItems([]);
    } catch (err: any) {
      console.error('[Orders] Failed:', err);
      setError(err.message);
    } finally {
      setInitialLoadComplete(true);
      setLoading(false);
    }
  }, []);

  const saveItem = useCallback(async (_itemData: Partial<OrderItem>) => {
    addToast('Order save not wired to CC API yet', 'info');
  }, [addToast]);

  const updateOrderSummaryAcceptanceStatus = useCallback(async (_orderNumber: string, _status: AcceptanceStatus) => {
    addToast('Order status update not wired to CC API yet', 'info');
  }, [addToast]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return (
    <OrderContext.Provider value={{
      orderItems, orderSummaryItems, orderSheetId, setOrderSheetId,
      loading, error, initialLoadComplete, showPermissionPrompt,
      loadOrders,
      handleGrantSheetsAccess: async () => { loadOrders(true); },
      saveItem,
      deleteItem: async (_i) => {},
      selectedOrderNumberForDetail, setSelectedOrderNumberForDetail,
      updateOrderSummaryAcceptanceStatus
    }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) throw new Error('useOrder must be used within OrderProvider');
  return context;
};

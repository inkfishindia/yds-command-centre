
import React, { createContext, useState, useContext, useCallback, ReactNode, useEffect } from 'react';
import { OrderItem, OrderContextType, OrderStatus, AcceptanceStatus, PaymentMode, OrderType, OrderSummaryItem } from '../types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { fetchValues, updateValues, appendValues, fetchHeaders } from '../lib/sheets';
import { getEnv } from '../lib/env';
import { requestAllGoogleApiTokens } from '../lib/googleAuth';
import { ORDER_SHEET_CONFIG } from '../src/config/orderSheetConfig';
import { parseOrderData } from '../services/orderSheetsParser';
import { parseOrderSummaryData } from '../services/orderSummarySheetsParser';
import { bmcRegistry } from '../lib/dataRegistry';
import { mockOrderItems } from '../lib/mockData';

const ORDERS_SHEET_ID_LS_KEY = 'order_management_sheet_id';
const DEFAULT_ORDERS_SHEET_ID_ENV_KEY = 'ORDER_MANAGEMENT_SHEET_ID';

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isSignedIn, isMockMode, signIn } = useAuth();
  const { addToast } = useToast();

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderSummaryItems, setOrderSummaryItems] = useState<OrderSummaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [selectedOrderNumberForDetail, setSelectedOrderNumberForDetail] = useState<string | null>(null);

  const [orderSheetId, setOrderSheetIdState] = useState<string>(() => {
    const storedId = localStorage.getItem(ORDERS_SHEET_ID_LS_KEY);
    if (storedId) return storedId;
    try {
      return getEnv(DEFAULT_ORDERS_SHEET_ID_ENV_KEY) || '';
    } catch (e) {
      return '';
    }
  });

  const setOrderSheetId = useCallback((id: string) => {
    localStorage.setItem(ORDERS_SHEET_ID_LS_KEY, id);
    setOrderSheetIdState(id);
  }, []);

  const loadOrders = useCallback(async (forceRefresh = false) => {
    if (isMockMode) {
      setOrderItems(mockOrderItems);
      const mockSummary = Array.from(
        mockOrderItems.reduce((map, item) => {
          if (!map.has(item.orderNumber)) {
            map.set(item.orderNumber, {
              id: item.orderNumber,
              orderNumber: item.orderNumber,
              date: item.date,
              time: item.time,
              customerName: item.customerName,
              email: item.email,
              phone: item.phone,
              gstin: item.gstin,
              partnerOrderNumber: item.partnerOrderNumber,
              orderType: item.orderType,
              orderMadeBy: item.orderMadeBy,
              salesChannel: item.salesChannel,
              shippingName: item.shippingName,
              shippingPhone: item.shippingPhone,
              shippingAddress: item.shippingAddress,
              shippingCity: item.shippingCity,
              shippingState: item.shippingState,
              shippingCountry: item.shippingCountry,
              shippingPincode: item.shippingPincode,
              billingName: item.billingName,
              billingPhone: item.billingPhone,
              billingAddress: item.billingAddress,
              billingCity: item.billingCity,
              billingState: item.billingState,
              billingCountry: item.billingCountry,
              billingPincode: item.billingPincode,
              shippingType: item.shippingType,
              shippingCost: item.shippingCost,
              totalAmountWithTax: 0,
              status: item.status,
              acceptanceStatus: item.acceptanceStatus,
              paymentMode: item.paymentMode,
              totalNoOfProducts: 0,
              totalQuantityOfAllProducts: 0,
            });
          }
          const summary = map.get(item.orderNumber)!;
          summary.totalAmountWithTax = (summary.totalAmountWithTax || 0) + (item.totalAmountWithTax || 0);
          summary.totalNoOfProducts = (summary.totalNoOfProducts || 0) + 1;
          summary.totalQuantityOfAllProducts = (summary.totalQuantityOfAllProducts || 0) + (item.quantity || 0);
          return map;
        }, new Map<string, OrderSummaryItem>()).values()
      );
      setOrderSummaryItems(mockSummary);
      setInitialLoadComplete(true);
      return;
    }

    if (!isSignedIn) return;
    if (initialLoadComplete && !forceRefresh) return;
    if (!orderSheetId) return;

    setLoading(true);
    try {
      const orderConfig = ORDER_SHEET_CONFIG;
      const orderSummaryConfig = bmcRegistry.orderSummary;
      const [orderResponse, orderSummaryResponse] = await Promise.all([
        fetchValues(orderSheetId, `'${orderConfig.sheetName}'!A:AZ`, { bypassCache: forceRefresh }),
        fetchValues(orderSheetId, `'${orderSummaryConfig.sheetName}'!A:AZ`, { bypassCache: forceRefresh }),
      ]);

      if (orderResponse.values) setOrderItems(parseOrderData(orderResponse.values, orderConfig));
      if (orderSummaryResponse.values) setOrderSummaryItems(parseOrderSummaryData(orderSummaryResponse.values, orderSummaryConfig));
      
      setError(null);
    } catch (err: any) {
      if (err.message.includes('403') || err.message.includes('401')) setShowPermissionPrompt(true);
      setError(err.message);
    } finally {
      setInitialLoadComplete(true);
      setLoading(false);
    }
  }, [isSignedIn, isMockMode, orderSheetId, initialLoadComplete]);

  const saveItem = useCallback(async (itemData: Partial<OrderItem>) => {
    // OPTIMISTIC UPDATE
    if (itemData.id) {
        setOrderItems(prev => prev.map(item => item.id === itemData.id ? { ...item, ...itemData } : item));
    }

    if (isMockMode) return;

    try {
      const config = ORDER_SHEET_CONFIG;
      const headers = await fetchHeaders(orderSheetId, `'${config.sheetName}'!A:AZ`, config.headerRow);
      const existingIdx = orderItems.findIndex(item => item.id === itemData.id);
      const isEditing = existingIdx !== -1;
      const finalItem = isEditing ? { ...orderItems[existingIdx], ...itemData } : { ...itemData, id: `ORD-${Date.now()}` };

      const rowData = headers.map(header => {
        const fieldKey = Object.keys(config.fieldToHeaderMap).find(key => config.fieldToHeaderMap[key as keyof OrderItem] === header);
        return fieldKey ? String((finalItem as any)[fieldKey] || '') : '';
      });

      if (isEditing) {
        const rowNumber = config.headerRow + 1 + existingIdx;
        await updateValues(orderSheetId, `'${config.sheetName}'!A${rowNumber}`, [rowData]);
      } else {
        await appendValues(orderSheetId, config.sheetName, [rowData]);
      }
      loadOrders(true);
    } catch (err: any) {
      addToast(`Save failed: ${err.message}`, 'error');
      loadOrders(true); // Revert to server state
    }
  }, [orderSheetId, orderItems, isMockMode, loadOrders, addToast]);

  const updateOrderSummaryAcceptanceStatus = useCallback(async (orderNumber: string, status: AcceptanceStatus) => {
    // OPTIMISTIC UPDATE
    setOrderSummaryItems(prev => prev.map(item => item.orderNumber === orderNumber ? { ...item, acceptanceStatus: status } : item));
    
    const itemsToUpdate = orderItems.filter(item => item.orderNumber === orderNumber);
    try {
      await Promise.all(itemsToUpdate.map(item => saveItem({ id: item.id, acceptanceStatus: status })));
      addToast(`Order ${orderNumber} ${status}`, 'success');
    } catch (err) {
      loadOrders(true); // Revert
    }
  }, [orderItems, saveItem, addToast, loadOrders]);

  useEffect(() => {
    if (isSignedIn || isMockMode) loadOrders();
  }, [isSignedIn, isMockMode, loadOrders]);

  return (
    <OrderContext.Provider value={{ 
      orderItems, orderSummaryItems, orderSheetId, setOrderSheetId, 
      loading, error, initialLoadComplete, showPermissionPrompt, 
      loadOrders, handleGrantSheetsAccess: async () => { await requestAllGoogleApiTokens(); loadOrders(true); }, 
      saveItem, deleteItem: async (i) => {}, 
      selectedOrderNumberForDetail, setSelectedOrderNumberForDetail, updateOrderSummaryAcceptanceStatus 
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

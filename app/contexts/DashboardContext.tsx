
import React, { createContext, useState, useContext, useCallback, ReactNode, useEffect } from 'react';
import { DailyReportData, DashboardMetrics } from '../types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getEnv } from '../lib/env';
import { fetchValues } from '../lib/sheets';
import { calculateMetrics } from '../lib/metrics';
import { mockDailyReportData } from '../lib/mockData';

const DAILY_REPORT_SHEET_ID_KEY = 'DAILY_REPORT_SHEET_ID';
const DAILY_REPORT_SHEET_NAME = 'YDS Daily Stats';

// --- ROBUST PARSING ENGINE ---
const parseNumberValue = (value: any): number => {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/[₹$,%\s]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const parseDateValue = (value: string): Date | null => {
  if (!value) return null;
  const parts = value.split('/');
  if (parts.length === 3) {
    const m = parseInt(parts[0], 10);
    const d = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    const date = new Date(y, m - 1, d);
    return isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
};

const parseDailyReportData = (values: string[][]): DailyReportData[] => {
  if (!values || values.length < 2) return [];
  const [headerRow, ...dataRows] = values;
  
  const headerMap = headerRow.reduce((acc, header, index) => {
    acc[header.trim()] = index;
    return acc;
  }, {} as Record<string, number>);

  return dataRows.map(row => {
    const orders = parseNumberValue(row[headerMap['Orders Received']]);
    const revenue = parseNumberValue(row[headerMap['Total Order Value (₹)']]);
    const abanGuests = parseNumberValue(row[headerMap['Abandoned Carts (Guests)']]);
    const abanUsers = parseNumberValue(row[headerMap['Abandoned Carts (Users)']]);
    const totalCarts = orders + abanGuests + abanUsers;

    return {
      date: parseDateValue(row[headerMap['Date']]),
      registrations: parseNumberValue(row[headerMap['Registrations']]),
      ordersNewRegistrants: parseNumberValue(row[headerMap['Orders (New Registrants)']]),
      ordersReceived: orders,
      ordersWithDiscount: parseNumberValue(row[headerMap['Orders with Discount']]),
      codOrders: parseNumberValue(row[headerMap['COD Orders']]),
      businessOrders: parseNumberValue(row[headerMap['Business Orders']]),
      abandonedCartsGuests: abanGuests,
      abandonedCartsUsers: abanUsers,
      totalOrderValue: revenue,
      partnerProductsValue: parseNumberValue(row[headerMap['Partner Products Value (₹)']]),
      businessProductsValue: parseNumberValue(row[headerMap['Business Products Value (₹)']]),
      codOrderValue: parseNumberValue(row[headerMap['COD Order Value (₹)']]),
      deliveryCharges: parseNumberValue(row[headerMap['Delivery Charges (₹)']]),
      manualOrderValue: parseNumberValue(row[headerMap['Manual Order Value']]),
      dsOrderValue: parseNumberValue(row[headerMap['DS Order Value']]),
      b2cOrderValue: parseNumberValue(row[headerMap['B2C Order Value']]),
      conversionRate: totalCarts > 0 ? (orders / totalCarts) * 100 : 0,
      aov: orders > 0 ? revenue / orders : 0,
    };
  }).filter(row => row.date !== null)
    .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0)); 
};

// FIX: Added timeFilter and reportData to DashboardContextType
interface DashboardContextType {
    metrics: DashboardMetrics | null;
    loading: boolean;
    error: string | null;
    initialLoadComplete: boolean;
    loadReportData: (forceRefresh?: boolean) => Promise<void>;
    timeFilter: '7' | '30' | '90' | 'all';
    setTimeFilter: (filter: '7' | '30' | '90' | 'all') => void;
    reportData: DailyReportData[];
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { isSignedIn, isMockMode, initialAuthCheckComplete } = useAuth();
    const { addToast } = useToast();

    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [reportData, setReportData] = useState<DailyReportData[]>([]);
    const [timeFilter, setTimeFilter] = useState<'7' | '30' | '90' | 'all'>('30');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);

    const loadReportData = useCallback(async (forceRefresh = false) => {
        if (!initialAuthCheckComplete) return;

        if (!isSignedIn && !isMockMode) {
            setError("Please sign in to load dashboard data.");
            return;
        }
        
        setLoading(true);
        setError(null);

        try {
            if (isMockMode) {
                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 800));
                setReportData(mockDailyReportData);
                setMetrics(calculateMetrics(mockDailyReportData));
                setInitialLoadComplete(true);
                setLoading(false);
                return;
            }

            const sheetId = localStorage.getItem(DAILY_REPORT_SHEET_ID_KEY) || getEnv('DAILY_REPORT_SHEET_ID');
            const range = `'${DAILY_REPORT_SHEET_NAME}'!A:AF`;
            const response = await fetchValues(sheetId, range, { bypassCache: forceRefresh });
            
            if (response.values && response.values.length > 0) {
                const parsedRows = parseDailyReportData(response.values);
                setReportData(parsedRows);
                if (parsedRows.length >= 2) {
                  const computedMetrics = calculateMetrics(parsedRows);
                  setMetrics(computedMetrics);
                } else {
                  setError("Insufficient data rows found (Need Today + Yesterday).");
                }
                if (forceRefresh) addToast("Business health metrics updated ✅", "success");
            } else {
                setError("No data found in the report sheet.");
            }
        } catch (e: any) {
            console.error("Dashboard Fetch Error:", e);
            setError(e.message || "Connection to Sheets failed.");
        } finally {
            setInitialLoadComplete(true);
            setLoading(false);
        }
    }, [isSignedIn, isMockMode, addToast]);

    useEffect(() => {
        if (initialAuthCheckComplete && (isSignedIn || isMockMode) && !initialLoadComplete) {
            loadReportData();
        }
    }, [initialAuthCheckComplete, isSignedIn, isMockMode, initialLoadComplete, loadReportData]);

    return (
        <DashboardContext.Provider value={{ metrics, loading, error, initialLoadComplete, loadReportData, timeFilter, setTimeFilter, reportData }}>
            {children}
        </DashboardContext.Provider>
    );
};

export const useDashboard = (): DashboardContextType => {
    const context = useContext(DashboardContext);
    if (context === undefined) throw new Error('useDashboard must be used within a DashboardProvider');
    return context;
};

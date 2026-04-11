
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AnalyticsContextType {
  dateRange: { start: string; end: string };
  setDateRange: (start: string, end: string) => void;
  adsData: any[];
  ga4Data: any[];
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export const AnalyticsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dateRange, setRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const setDateRange = (start: string, end: string) => {
    setRange({ start, end });
  };

  return (
    <AnalyticsContext.Provider value={{ dateRange, setDateRange, adsData: [], ga4Data: [] }}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) throw new Error('useAnalytics must be used within a AnalyticsProvider');
  return context;
};

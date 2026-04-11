import React, { createContext, useState, useContext, useCallback, ReactNode, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { usePPC } from '../hooks/usePPC';
import { PrintMethodType, PPCData, PPCCalculationResult, PPCDiagnostics } from '../types'; // FIX: Corrected import paths for PPCCalculationResult and PPCDiagnostics

interface PPCContextType {
  ppcSheetId: string;
  setPpcSheetId: (id: string) => void;
  ppcData: PPCData | null;
  loading: boolean;
  error: string | null;
  initialLoadComplete: boolean;
  showPermissionPrompt: boolean;
  loadPPCData: (forceRefresh?: boolean) => Promise<void>;
  handleGrantSheetsAccess: () => Promise<void>;
  diagnostics: PPCDiagnostics[];
  calculatePPC: (
    widthIn: number,
    heightIn: number,
    qty: number,
    materialKey: string,
    printMethod: PrintMethodType | 'auto',
    attachmentKey: string,
    packagingKey: string,
    qtyRetail: number,
    qtyPod: number,
    qtyB2B: number,
  ) => void;
  calculationResult: PPCCalculationResult | null;
  inr: (n: number | string | undefined | null) => string;
  keyfy: (s: string | undefined) => string;
}

const PPCContext = createContext<PPCContextType | undefined>(undefined);

export const PPCProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isMockMode, isSignedIn } = useAuth();
  const { addToast } = useToast();

  const {
    ppcSheetId, setPpcSheetId, ppcData, loading, error, initialLoadComplete,
    showPermissionPrompt, loadPPCData: loadHookPPCData, handleGrantSheetsAccess,
    diagnostics, calculatePPC, calculationResult, inr, keyfy
  } = usePPC();

  const loadData = useCallback(async (forceRefresh = false) => {
    if (isMockMode) {
      // In mock mode, we just simulate data being ready without fetching.
      // If mock data was defined in usePPC hook, it would be set there.
      // For now, if no actual mock data is loaded, it will show an empty state.
      // This is a minimal implementation for mock mode.
      if (forceRefresh) addToast("Mock PPC data refreshed!", "info");
      // Simulate successful load to clear loading state
      if (ppcData === null) {
        // If no mock data is specifically provided, simulate it being empty/unloaded
      }
      return;
    }
    // FIX: Remove unnecessary argument when calling loadHookPPCData
    await loadHookPPCData();
  }, [isMockMode, addToast, ppcData, loadHookPPCData]);

  // Initial load effect
  React.useEffect(() => {
    if ((isSignedIn || isMockMode) && !initialLoadComplete) {
      loadData();
    }
  }, [isSignedIn, isMockMode, initialLoadComplete, loadData]);

  const value = useMemo(() => ({
    ppcSheetId,
    setPpcSheetId,
    ppcData,
    loading,
    error,
    initialLoadComplete,
    showPermissionPrompt,
    loadPPCData: loadData,
    handleGrantSheetsAccess,
    diagnostics,
    calculatePPC,
    calculationResult,
    inr,
    keyfy,
  }), [
    ppcSheetId, setPpcSheetId, ppcData, loading, error, initialLoadComplete,
    showPermissionPrompt, loadData, handleGrantSheetsAccess, diagnostics,
    calculatePPC, calculationResult, inr, keyfy
  ]);

  return (
    <PPCContext.Provider value={value}>
      {children}
    </PPCContext.Provider>
  );
};

export const usePPCContext = (): PPCContextType => {
  const context = useContext(PPCContext);
  if (context === undefined) {
    throw new Error('usePPCContext must be used within a PPCProvider');
  }
  return context;
};
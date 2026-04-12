
import React, { createContext, useState, useContext, useCallback, ReactNode, useEffect } from 'react';
import {
  CompetitorLandscapeItem,
  CompetitorLandscapeContextType,
  CompetitorAnalysisItem,
  CompetitorPositioning,
  CompetitorNote,
  CompetitorCapability,
  CompetitorUXProduct,
} from '../types';

const CompetitorLandscapeContext = createContext<CompetitorLandscapeContextType | undefined>(undefined);

// Map CC API row -> CompetitorLandscapeItem
function mapCompetitor(row: any): CompetitorLandscapeItem {
  return {
    tier: row['Tier'] || '',
    brand: row['Brand'] || '',
    website: row['Website'] || '',
    instagram: row['Instagram'] || '',
    logo: row['Logo'] || '',
    category: row['Category'] || '',
    secondaryCategory: row['Secondary Category'] || '',
    tags: row['Tags'] || '',
    coreStrengths: row['Core Strengths'] || '',
    typicalUse: row['Typical Use'] || '',
  } as CompetitorLandscapeItem;
}

async function fetchSheet(key: string): Promise<any[]> {
  try {
    const res = await fetch(`/api/sheets/${key}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.available === false ? [] : (data.rows || []);
  } catch {
    return [];
  }
}

export const CompetitorLandscapeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [competitors, setCompetitors] = useState<CompetitorLandscapeItem[]>([]);
  const [analysis, setAnalysis] = useState<CompetitorAnalysisItem[]>([]);
  const [positioning, setPositioning] = useState<CompetitorPositioning[]>([]);
  const [notes, setNotes] = useState<CompetitorNote[]>([]);
  const [capabilities, setCapabilities] = useState<CompetitorCapability[]>([]);
  const [uxProduct, setUxProduct] = useState<CompetitorUXProduct[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [sheetId, setSheetIdState] = useState<string>('ci_source');

  const setSheetId = useCallback((id: string) => {
    setSheetIdState(id);
  }, []);

  const loadCompetitors = useCallback(async (_forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const [comp, anal, pos, note, cap, ux] = await Promise.all([
        fetchSheet('CI_COMPETITORS'),
        fetchSheet('CI_ANALYSIS'),
        fetchSheet('CI_POSITIONING'),
        fetchSheet('CI_NOTES'),
        fetchSheet('CI_CAPABILITIES'),
        fetchSheet('CI_UX_PRODUCT'),
      ]);
      setCompetitors(comp.map(mapCompetitor));
      setAnalysis(anal as CompetitorAnalysisItem[]);
      setPositioning(pos as CompetitorPositioning[]);
      setNotes(note as CompetitorNote[]);
      setCapabilities(cap as CompetitorCapability[]);
      setUxProduct(ux as CompetitorUXProduct[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load competitor intel');
      console.error('[Competitors] Failed:', err);
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
    }
  }, []);

  useEffect(() => {
    loadCompetitors();
  }, [loadCompetitors]);

  return (
    <CompetitorLandscapeContext.Provider value={{
      competitors, analysis, positioning, notes, capabilities, uxProduct,
      loading, error, loadCompetitors, sheetId, setSheetId, initialLoadComplete,
    }}>
      {children}
    </CompetitorLandscapeContext.Provider>
  );
};

export const useCompetitorLandscape = () => {
  const context = useContext(CompetitorLandscapeContext);
  if (!context) throw new Error('useCompetitorLandscape required');
  return context;
};

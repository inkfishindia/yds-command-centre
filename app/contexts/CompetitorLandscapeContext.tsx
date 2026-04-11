
import React, { createContext, useState, useContext, useCallback, ReactNode, useEffect } from 'react';
import { 
  CompetitorLandscapeItem, 
  CompetitorLandscapeContextType, 
  CompetitorAnalysisItem,
  CompetitorPositioning,
  CompetitorNote,
  CompetitorCapability,
  CompetitorUXProduct
} from '../types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getEnv } from '../lib/env';
import { fetchValues } from '../lib/sheets';
import { parseObjectListSection } from '../services/bmcSheetsParser';

const LS_KEY = 'competitor_landscape_sheet_id';
const ENV_KEY = 'COMPETITOR_LANDSCAPE_SHEET_ID';

const CompetitorLandscapeContext = createContext<CompetitorLandscapeContextType | undefined>(undefined);

// Local config objects for the 6 tabs
const CONFIGS = {
  landscape: { sectionKey: 'competitorLandscape', sheetName: 'Competitors', gid: '915101242', headerRow: 1, fieldToHeaderMap: { tier: 'Tier', brand: 'Brand', website: 'Website', instagram: 'Instagram', logo: 'Logo', category: 'Category', secondaryCategory: 'Secondary Category', tags: 'Tags', coreStrengths: 'Core Strengths', typicalUse: 'Typical Use' } },
  analysis: { sectionKey: 'competitorAnalysis', sheetName: 'analysis', gid: '171694668', headerRow: 1, fieldToHeaderMap: { competitor: 'Competitor', insight: 'Insight', visualIdentity: 'Visual Identity', positioning: 'Positioning', messaging: 'Messaging', ux: 'UX', strategicNote: 'Strategic Note', homePageUX: 'Home Page UX', customizerInterface: 'Customizer Interface (Editor UX)', productPageUX: 'Product Page UX (Storefront)', catalogAndTemplateSystem: 'Catalog & Template System' } },
  positioning: { sectionKey: 'competitorPositioning', sheetName: 'Competitor_Positioning', gid: '102938475', headerRow: 1, fieldToHeaderMap: { brand: 'Brand', positioningStatement: 'Positioning_Statement', owns: 'Owns', triesToOwn: 'Tries_To_Own', shouldNotOwn: 'Should_Not_Own', primaryAudience: 'Primary Audience', pricePosition: 'Price_Position', customisationDepth: 'Customisation_Depth', tone: 'Tone', personality: 'Personality', brandArchetype: 'Brand_Archetype' } },
  notes: { sectionKey: 'competitorNotes', sheetName: 'Competitor_Notes', gid: '564738291', headerRow: 1, fieldToHeaderMap: { date: 'Date', brand: 'Brand', note: 'Note', addedBy: 'Added_By', tag: 'Tag' } },
  capabilities: { sectionKey: 'competitorCapabilities', sheetName: 'Competitor_Capabilities', gid: '112233445', headerRow: 1, fieldToHeaderMap: { brand: 'Brand', brandPower: 'Brand_Power', customizerUX: 'Customizer_UX', catalogDepth: 'Catalog_Depth', speed: 'Speed', pricingPower: 'Pricing_Power', integrations: 'Integrations', sustainability: 'Sustainability', b2bReadiness: 'B2B_Readiness', d2cFriendliness: 'D2C_Friendliness', techMaturity: 'Tech_Maturity' } },
  uxProduct: { sectionKey: 'competitorUXProduct', sheetName: 'Competitor_UX_Product', gid: '998877665', headerRow: 1, fieldToHeaderMap: { brand: 'Brand', homepageUX: 'Homepage_UX', customizerUX: 'Customizer_UX', productPageUX: 'Product_Page_UX', catalogSystem: 'Catalog_System', templateSystem: 'Template_System', navigationClarity: 'Navigation_Clarity', onboardingFlow: 'Onboarding_Flow', checkoutExperience: 'Checkout_Experience' } }
};

export const CompetitorLandscapeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isSignedIn, isMockMode } = useAuth();
  const { addToast } = useToast();

  const [competitors, setCompetitors] = useState<CompetitorLandscapeItem[]>([]);
  const [analysis, setAnalysis] = useState<CompetitorAnalysisItem[]>([]);
  const [positioning, setPositioning] = useState<CompetitorPositioning[]>([]);
  const [notes, setNotes] = useState<CompetitorNote[]>([]);
  const [capabilities, setCapabilities] = useState<CompetitorCapability[]>([]);
  const [uxProduct, setUxProduct] = useState<CompetitorUXProduct[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const [sheetId, setSheetIdState] = useState<string>(() => {
    const storedId = localStorage.getItem(LS_KEY);
    if (storedId) return storedId;
    try {
      return getEnv(ENV_KEY) || '';
    } catch (e) {
      return '';
    }
  });

  const setSheetId = useCallback((id: string) => {
    localStorage.setItem(LS_KEY, id);
    setSheetIdState(id);
    setInitialLoadComplete(false);
  }, []);

  const loadCompetitors = useCallback(async (forceRefresh = false) => {
    if (isMockMode) {
      setInitialLoadComplete(true);
      return;
    }

    if (!isSignedIn || !sheetId) return;

    setLoading(true);
    setError(null);

    try {
      const fetchResults = await Promise.all(
        Object.values(CONFIGS).map(config => 
          fetchValues(sheetId, `'${config.sheetName}'!A:Z`, { bypassCache: forceRefresh })
        )
      );

      /* 
         Fix: Added explicit generic type parameters to parseObjectListSection 
         to ensure returned arrays match specific state interfaces. 
      */
      setCompetitors(parseObjectListSection<CompetitorLandscapeItem>(fetchResults[0].values || [], CONFIGS.landscape));
      setAnalysis(parseObjectListSection<CompetitorAnalysisItem>(fetchResults[1].values || [], CONFIGS.analysis));
      setPositioning(parseObjectListSection<CompetitorPositioning>(fetchResults[2].values || [], CONFIGS.positioning));
      setNotes(parseObjectListSection<CompetitorNote>(fetchResults[3].values || [], CONFIGS.notes));
      setCapabilities(parseObjectListSection<CompetitorCapability>(fetchResults[4].values || [], CONFIGS.capabilities));
      setUxProduct(parseObjectListSection<CompetitorUXProduct>(fetchResults[5].values || [], CONFIGS.uxProduct));

      if (forceRefresh) addToast("Market Intelligence updated.", "success");
    } catch (err: any) {
      setError(err.message || "Failed to load intel.");
      addToast("Intel sync failed.", "error");
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
    }
  }, [isSignedIn, isMockMode, sheetId, addToast]);

  useEffect(() => {
    if ((isSignedIn || isMockMode) && !initialLoadComplete && sheetId) {
      loadCompetitors();
    }
  }, [isSignedIn, isMockMode, initialLoadComplete, sheetId, loadCompetitors]);

  return (
    <CompetitorLandscapeContext.Provider value={{
      competitors, analysis, positioning, notes, capabilities, uxProduct,
      loading, error, loadCompetitors, sheetId, setSheetId, initialLoadComplete
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

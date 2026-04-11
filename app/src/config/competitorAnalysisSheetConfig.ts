
import { CompetitorAnalysisItem } from '../../types';
import { BMCSheetConfigItem } from '../../types';

export const COMPETITOR_ANALYSIS_SHEET_CONFIG: BMCSheetConfigItem<CompetitorAnalysisItem> = {
  spreadsheetId: '1D12Ns5tqSbk1Gblf3kthQXnYmcOhfap0JfzJb5KzcwI',
  sectionKey: 'competitorAnalysis', // A unique key
  sheetName: 'analysis',
  gid: '171694668',
  headerRow: 1,
  // FIX: Explicitly set isSimpleList to false to match BMCSheetConfigItem
  isSimpleList: false,
  fieldToHeaderMap: {
    competitor: 'Competitor',
    insight: 'Insight',
    visualIdentity: 'Visual Identity',
    positioning: 'Positioning',
    messaging: 'Messaging',
    ux: 'UX',
    strategicNote: 'Strategic Note',
    homePageUX: 'Home Page UX',
    customizerInterface: 'Customizer Interface (Editor UX)',
    productPageUX: 'Product Page UX (Storefront)',
    catalogAndTemplateSystem: 'Catalog & Template System',
  },
};

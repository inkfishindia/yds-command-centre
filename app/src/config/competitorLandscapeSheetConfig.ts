
import { CompetitorLandscapeItem } from '../../types';
import { BMCSheetConfigItem } from '../../types';

export const COMPETITOR_LANDSCAPE_SHEET_CONFIG: BMCSheetConfigItem<CompetitorLandscapeItem> = {
  spreadsheetId: '1D12Ns5tqSbk1Gblf3kthQXnYmcOhfap0JfzJb5KzcwI',
  sectionKey: 'competitorLandscape', // A unique key for this config
  sheetName: 'Competitors', // Assuming this is the sheet name
  gid: '915101242',
  headerRow: 1,
  // FIX: Explicitly set isSimpleList to false to match BMCSheetConfigItem
  isSimpleList: false,
  fieldToHeaderMap: {
    tier: 'Tier',
    brand: 'Brand',
    website: 'Website',
    instagram: 'Instagram',
    logo: 'Logo',
    category: 'Category',
    secondaryCategory: 'Secondary Category',
    tags: 'Tags',
    coreStrengths: 'Core Strengths',
    typicalUse: 'Typical Use',
  },
  transform: (key: keyof CompetitorLandscapeItem, value: string) => {
    if (key === 'tags' && typeof value === 'string') {
      return value.split(',').map(s => s.trim()).filter(Boolean);
    }
    return value;
  },
};


import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Campaign {
  id: string;
  name: string;
  status: string;
  stage: string;
  owner: string;
  priority: string;
  channel: string[];
  startDate: string;
  targetLaunch: string;
  focusAreaNames: string[];
  budget: number | null;
}

interface ContentContextType {
  campaigns: Campaign[];
  loading: boolean;
  addCampaign: (camp: Partial<Campaign>) => void;
  contentItems: any[];
  refresh: () => void;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

function mapApiCampaign(c: any): Campaign {
  return {
    id: c.id,
    name: c['Campaign Name'] || '',
    status: c.Status || '',
    stage: c.Stage || '',
    owner: c.Owner || c.ownerNames?.[0] || '',
    priority: c.Priority || '',
    channel: c.Channel || [],
    startDate: c['Start Date']?.start || '',
    targetLaunch: c['Target Launch']?.start || '',
    focusAreaNames: c.focusAreaNames || [],
    budget: c.Budget || null,
  };
}

export const ContentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = () => {
    setLoading(true);
    fetch('/api/marketing-ops/campaigns')
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(data => setCampaigns((data.campaigns || []).map(mapApiCampaign)))
      .catch(err => console.error('[Content] Failed to load campaigns:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const addCampaign = (camp: Partial<Campaign>) => {
    const newCamp: Campaign = {
      id: Math.random().toString(36).substr(2, 9),
      name: camp.name || '',
      status: 'Draft',
      stage: 'Planning',
      owner: '',
      priority: 'P2',
      channel: [],
      startDate: new Date().toISOString(),
      targetLaunch: '',
      focusAreaNames: [],
      budget: null,
      ...camp,
    };
    setCampaigns(prev => [newCamp, ...prev]);
  };

  return (
    <ContentContext.Provider value={{ campaigns, loading, addCampaign, contentItems: [], refresh: fetchCampaigns }}>
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = () => {
  const context = useContext(ContentContext);
  if (!context) throw new Error('useContent must be used within a ContentProvider');
  return context;
};

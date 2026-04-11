
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Campaign } from '../types';
import { mockCampaigns } from '../lib/mockData';

interface ContentContextType {
  campaigns: Campaign[];
  addCampaign: (camp: Partial<Campaign>) => void;
  contentItems: any[];
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const ContentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);

  const addCampaign = (camp: Partial<Campaign>) => {
    const newCamp: Campaign = {
      id: Math.random().toString(36).substr(2, 9),
      name: camp.name || '',
      status: camp.status || 'Draft',
      budget: camp.budget || 0,
      spend: 0,
      startDate: camp.startDate || new Date().toISOString(),
      endDate: camp.endDate || new Date().toISOString(),
      ...camp
    } as Campaign;
    setCampaigns(prev => [newCamp, ...prev]);
  };

  return (
    <ContentContext.Provider value={{ campaigns, addCampaign, contentItems: [] }}>
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = () => {
  const context = useContext(ContentContext);
  if (!context) throw new Error('useContent must be used within a ContentProvider');
  return context;
};

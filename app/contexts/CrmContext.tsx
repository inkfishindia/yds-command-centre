
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Lead, LeadStatus, Campaign } from '../types';
import { mockLeads } from '../lib/mockData';

interface CrmContextType {
  leads: Lead[];
  addLead: (lead: Partial<Lead>) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  pipelineStages: string[];
}

const CrmContext = createContext<CrmContextType | undefined>(undefined);

export const CrmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [leads, setLeads] = useState<Lead[]>(mockLeads);

  const addLead = (lead: Partial<Lead>) => {
    const newLead: Lead = {
      id: Math.random().toString(36).substr(2, 9),
      name: lead.name || 'New Lead',
      email: lead.email || '',
      phone: lead.phone || '',
      status: (lead.status as LeadStatus) || LeadStatus.NEW,
      source: lead.source || 'Manual',
      ownerName: lead.ownerName || 'Unassigned',
      createdAt: new Date().toISOString(),
      ...lead
    };
    setLeads(prev => [newLead, ...prev]);
  };

  const updateLead = (id: string, updates: Partial<Lead>) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const deleteLead = (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  const pipelineStages = ['New', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];

  return (
    <CrmContext.Provider value={{ leads, addLead, updateLead, deleteLead, pipelineStages }}>
      {children}
    </CrmContext.Provider>
  );
};

export const useCrm = () => {
  const context = useContext(CrmContext);
  if (!context) throw new Error('useCrm must be used within a CrmProvider');
  return context;
};


import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Lead, LeadStatus } from '../types';

interface CrmContextType {
  leads: Lead[];
  total: number;
  loading: boolean;
  addLead: (lead: Partial<Lead>) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  pipelineStages: string[];
  refresh: () => void;
}

const CrmContext = createContext<CrmContextType | undefined>(undefined);

function mapApiLead(row: any): Lead {
  return {
    id: row.lead_id || row.id || '',
    name: row.name || '',
    company: row.company || '',
    email: row.email || '',
    phone: row.phone || '',
    status: (row.Status || 'New Lead') as LeadStatus,
    source: row.source_refs || row.Category || '',
    ownerName: row.Category || '',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export const CrmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchLeads = () => {
    setLoading(true);
    fetch('/api/crm/leads?limit=100')
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(data => {
        setLeads((data.rows || []).map(mapApiLead));
        setTotal(data.total || 0);
      })
      .catch(err => console.error('[CRM] Failed to load leads:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLeads(); }, []);

  const addLead = (lead: Partial<Lead>) => {
    const newLead: Lead = {
      id: Math.random().toString(36).substr(2, 9),
      name: lead.name || 'New Lead',
      email: lead.email || '',
      phone: lead.phone || '',
      status: lead.status || LeadStatus.NEW,
      source: lead.source || 'Manual',
      ownerName: lead.ownerName || 'Unassigned',
      createdAt: new Date().toISOString(),
      ...lead,
    };
    setLeads(prev => [newLead, ...prev]);
  };

  const updateLead = (id: string, updates: Partial<Lead>) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const deleteLead = (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  const pipelineStages = ['New Lead', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];

  return (
    <CrmContext.Provider value={{ leads, total, loading, addLead, updateLead, deleteLead, pipelineStages, refresh: fetchLeads }}>
      {children}
    </CrmContext.Provider>
  );
};

export const useCrm = () => {
  const context = useContext(CrmContext);
  if (!context) throw new Error('useCrm must be used within a CrmProvider');
  return context;
};


import React, { useState, useMemo } from 'react';
import { 
  ManagerEditorLayout, 
  DataTable, 
  FilterBar, 
  Button, 
  StatusPill, 
  DetailDrawer,
  Card,
  FormDrawer,
  FormField
} from '../ui';
import { Lead, LeadStatus } from '../types';
import { useCrm } from '../contexts/CrmContext';

const LeadCRMPage: React.FC = () => {
  const { leads, addLead, updateLead, deleteLead } = useCrm();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = lead.name.toLowerCase().includes(search.toLowerCase()) || 
                           lead.company?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [leads, search, statusFilter]);

  const columns = [
    { 
      header: 'Name', 
      accessor: (l: Lead) => (
        <div className="flex flex-col">
          <span className="font-bold">{l.name}</span>
          <span className="text-[10px] text-[var(--color-text-secondary)]">{l.company}</span>
        </div>
      )
    },
    { header: 'Status', accessor: (l: Lead) => <StatusPill status={l.status} /> },
    { header: 'Source', accessor: 'source' },
    { header: 'Owner', accessor: 'ownerName' },
    { header: 'Created', accessor: (l: Lead) => new Date(l.createdAt).toLocaleDateString() },
    { 
      header: 'Actions', 
      accessor: (l: Lead) => (
        <Button size="sm" variant="secondary" onClick={() => setSelectedLead(l)}>
          Details
        </Button>
      )
    }
  ];

  const formFields: FormField[] = [
    { name: 'name', label: 'Full Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone', type: 'text' },
    { name: 'company', label: 'Company', type: 'text' },
    { 
      name: 'status', 
      label: 'Status', 
      type: 'select', 
      options: [
        { label: 'New', value: LeadStatus.NEW },
        { label: 'Contacted', value: LeadStatus.CONTACTED },
        { label: 'Qualified', value: LeadStatus.QUALIFIED },
        { label: 'Unqualified', value: LeadStatus.UNQUALIFIED },
        { label: 'Lost', value: LeadStatus.LOST },
      ]
    },
    { name: 'source', label: 'Source', type: 'text' },
  ];

  return (
    <ManagerEditorLayout 
      title="Lead CRM"
      toolbar={
        <Button onClick={() => setIsFormOpen(true)}>
          Add Lead
        </Button>
      }
    >
      <div className="space-y-6">
        <FilterBar 
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            {
              label: 'Status',
              value: statusFilter,
              options: [
                { label: 'All Statuses', value: 'all' },
                { label: 'New', value: LeadStatus.NEW },
                { label: 'Contacted', value: LeadStatus.CONTACTED },
                { label: 'Qualified', value: LeadStatus.QUALIFIED },
                { label: 'Unqualified', value: LeadStatus.UNQUALIFIED },
                { label: 'Lost', value: LeadStatus.LOST },
              ],
              onChange: setStatusFilter
            }
          ]}
        />

        <Card>
          <DataTable 
            data={filteredLeads} 
            columns={columns} 
            onRowClick={(l) => setSelectedLead(l)}
          />
        </Card>

        <FormDrawer 
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title="Add New Lead"
          fields={formFields}
          onSubmit={addLead}
        />

        {selectedLead && (
          <DetailDrawer 
            isOpen={!!selectedLead}
            onClose={() => setSelectedLead(null)}
            title={selectedLead.name}
          >
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Status</label>
                  <div className="mt-1"><StatusPill status={selectedLead.status} /></div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Source</label>
                  <p className="text-sm font-bold">{selectedLead.source}</p>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Contact Info</label>
                <p className="text-sm">{selectedLead.email}</p>
                <p className="text-sm">{selectedLead.phone}</p>
              </div>
              <div className="pt-6 border-t border-[var(--color-border-primary)] flex gap-3">
                <Button className="flex-1" variant="secondary" onClick={() => { deleteLead(selectedLead.id); setSelectedLead(null); }}>Delete</Button>
                <Button className="flex-1" onClick={() => alert('Edit Lead')}>Edit</Button>
              </div>
            </div>
          </DetailDrawer>
        )}
      </div>
    </ManagerEditorLayout>
  );
};

export default LeadCRMPage;

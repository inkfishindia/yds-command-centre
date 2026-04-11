
import React, { useState, useMemo } from 'react';
import { 
  ManagerEditorLayout, 
  DataTable, 
  FilterBar, 
  Button, 
  StatusPill, 
  Card,
  StatCard,
  CapacityBar,
  FormDrawer,
  FormField
} from '../ui';
import { Campaign, CampaignStatus } from '../types';
import { useContent } from '../contexts/ContentContext';

const CampaignsPage: React.FC = () => {
  const { campaigns, addCampaign } = useContent();
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [campaigns, search]);

  const columns = [
    { header: 'Campaign Name', accessor: 'name' },
    { header: 'Status', accessor: (c: Campaign) => <StatusPill status={c.status} /> },
    { header: 'Start Date', accessor: 'startDate' },
    { header: 'End Date', accessor: 'endDate' },
    { header: 'Budget', accessor: (c: Campaign) => `₹${c.budget.toLocaleString()}` },
    { 
      header: 'Spend', 
      accessor: (c: Campaign) => (
        <div className="min-w-[120px]">
          <CapacityBar 
            current={c.spend} 
            max={c.budget} 
            label={`₹${c.spend.toLocaleString()}`}
          />
        </div>
      )
    },
    { 
      header: 'Actions', 
      accessor: (c: Campaign) => (
        <Button size="sm" variant="secondary" onClick={() => alert(`View Metrics for ${c.name}`)}>
          Metrics
        </Button>
      )
    }
  ];

  const formFields: FormField[] = [
    { name: 'name', label: 'Campaign Name', type: 'text', required: true },
    { 
      name: 'status', 
      label: 'Status', 
      type: 'select', 
      options: [
        { label: 'Draft', value: CampaignStatus.DRAFT },
        { label: 'Active', value: CampaignStatus.ACTIVE },
        { label: 'Paused', value: CampaignStatus.PAUSED },
        { label: 'Completed', value: CampaignStatus.COMPLETED },
      ]
    },
    { name: 'budget', label: 'Budget', type: 'number', required: true },
    { name: 'startDate', label: 'Start Date', type: 'date', required: true },
    { name: 'endDate', label: 'End Date', type: 'date', required: true },
  ];

  return (
    <ManagerEditorLayout 
      title="Campaigns"
      toolbar={<Button onClick={() => setIsFormOpen(true)}>Create Campaign</Button>}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Total Budget" value="₹15.0L" trend={0} />
          <StatCard label="Total Spend" value="₹4.2L" trend={15.2} />
          <StatCard label="Avg ROAS" value="4.2x" trend={0.5} />
        </div>

        <FilterBar 
          searchValue={search}
          onSearchChange={setSearch}
        />

        <Card>
          <DataTable 
            data={filteredCampaigns} 
            columns={columns} 
          />
        </Card>

        <FormDrawer 
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title="Create New Campaign"
          fields={formFields}
          onSubmit={addCampaign}
        />
      </div>
    </ManagerEditorLayout>
  );
};

export default CampaignsPage;

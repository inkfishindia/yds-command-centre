
import React, { useState, useMemo } from 'react';
import { 
  ManagerEditorLayout, 
  DataTable, 
  FilterBar, 
  Button, 
  StatusPill, 
  Card
} from '../ui';
import { Decision } from '../types';
import { mockDecisions } from '../lib/mockData';

const TechDecisionsPage: React.FC = () => {
  const [search, setSearch] = useState('');

  const filteredDecisions = useMemo(() => {
    return mockDecisions.filter(dec => 
      dec.title.toLowerCase().includes(search.toLowerCase()) || 
      dec.context.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const columns = [
    { 
      header: 'Tech Decision', 
      accessor: (d: Decision) => (
        <div className="flex flex-col max-w-md">
          <span className="font-bold">{d.title}</span>
          <span className="text-[10px] text-[var(--color-text-secondary)] line-clamp-1">{d.context}</span>
        </div>
      )
    },
    { header: 'Status', accessor: (d: Decision) => <StatusPill status={d.status} /> },
    { header: 'Owner', accessor: 'ownerName' },
    { header: 'Date', accessor: 'createdAt' },
    { 
      header: 'Actions', 
      accessor: (d: Decision) => (
        <Button size="sm" variant="secondary" onClick={() => alert('View Details')}>
          View
        </Button>
      )
    }
  ];

  return (
    <ManagerEditorLayout 
      title="Tech Decisions Log"
      toolbar={<Button onClick={() => alert('Record Tech Decision')}>Record Decision</Button>}
    >
      <div className="space-y-6">
        <FilterBar 
          searchValue={search}
          onSearchChange={setSearch}
        />

        <Card>
          <DataTable 
            data={filteredDecisions} 
            columns={columns} 
          />
        </Card>
      </div>
    </ManagerEditorLayout>
  );
};

export default TechDecisionsPage;

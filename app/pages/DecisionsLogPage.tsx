
import React, { useState, useEffect, useMemo } from 'react';
import {
  ManagerEditorLayout,
  Table,
  FilterBar,
  Button,
  Card
} from '../ui';

interface Decision {
  id: string;
  Name: string;
  Decision: string;
  Rationale: string;
  Owner: string;
  Date: { start: string } | null;
  Context: string;
  Domain: string | null;
  'Risks Accepted': string;
}

const DecisionsLogPage: React.FC = () => {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/notion/decisions?days=180')
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(data => setDecisions(data.decisions || []))
      .catch(err => console.error('[Decisions] Failed:', err))
      .finally(() => setLoading(false));
  }, []);

  const filteredDecisions = useMemo(() => {
    return decisions.filter(dec =>
      dec.Name?.toLowerCase().includes(search.toLowerCase()) ||
      dec.Decision?.toLowerCase().includes(search.toLowerCase()) ||
      dec.Context?.toLowerCase().includes(search.toLowerCase())
    );
  }, [decisions, search]);

  const columns = [
    {
      header: 'Decision',
      accessor: (d: Decision) => (
        <div className="flex flex-col max-w-md">
          <span className="font-bold">{d.Name}</span>
          <span className="text-[10px] text-[var(--color-text-secondary)] line-clamp-2">{d.Decision}</span>
        </div>
      )
    },
    {
      header: 'Rationale',
      accessor: (d: Decision) => (
        <span className="text-xs text-[var(--color-text-secondary)] line-clamp-2 max-w-xs block">{d.Rationale}</span>
      )
    },
    { header: 'Owner', accessor: 'Owner' },
    {
      header: 'Date',
      accessor: (d: Decision) => d.Date?.start ? new Date(d.Date.start).toLocaleDateString() : '—'
    },
    { header: 'Domain', accessor: (d: Decision) => d.Domain || '—' },
  ];

  return (
    <ManagerEditorLayout
      title={`Decisions Log (${filteredDecisions.length})`}
      toolbar={<Button onClick={() => alert('Record Decision')}>Record Decision</Button>}
    >
      <div className="space-y-6">
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
        />
        <Card>
          {loading ? (
            <p className="p-6 text-sm text-[var(--color-text-secondary)]">Loading decisions...</p>
          ) : (
            <Table data={filteredDecisions} columns={columns} />
          )}
        </Card>
      </div>
    </ManagerEditorLayout>
  );
};

export default DecisionsLogPage;

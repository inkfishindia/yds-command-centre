
import React, { useState, useMemo } from 'react';
import { 
  ManagerEditorLayout, 
  DataTable, 
  FilterBar, 
  SnoozeMenu, 
  Button,
  Card 
} from '../ui';
import { useActionQueue } from '../contexts/ActionQueueContext';

const ActionQueuePage: React.FC = () => {
  const { items, markDone, snooze } = useActionQueue();
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
      const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter;
      return matchesSearch && matchesPriority && item.status !== 'done';
    });
  }, [items, search, priorityFilter]);

  const columns = [
    { 
      header: 'Action', 
      accessor: (item: any) => (
        <span className="text-sm font-black text-[var(--color-text-primary)]">{item.title}</span>
      )
    },
    { 
      header: 'Source', 
      accessor: (item: any) => (
        <span className="text-[10px] font-black uppercase px-2 py-1 bg-[var(--color-bg-stage)] rounded">{item.source}</span>
      )
    },
    { 
      header: 'Priority', 
      accessor: (item: any) => (
        <span className={`text-[10px] font-black uppercase ${
          item.priority === 'high' ? 'text-red-500' : 
          item.priority === 'medium' ? 'text-yellow-500' : 'text-blue-500'
        }`}>{item.priority}</span>
      )
    },
    { 
      header: 'Due', 
      accessor: (item: any) => (
        <span className="text-xs font-bold text-[var(--color-text-secondary)]">{item.dueDate}</span>
      )
    },
    { 
      header: 'Operations', 
      accessor: (item: any) => (
        <div className="flex justify-end gap-2">
          <SnoozeMenu onSnooze={(d) => snooze(item.id, parseInt(d))} />
          <Button size="sm" onClick={() => markDone(item.id)}>
            Complete
          </Button>
        </div>
      )
    }
  ];

  return (
    <ManagerEditorLayout title="Action Queue">
      <div className="space-y-6">
        <FilterBar 
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            { 
              label: 'Priority', 
              value: priorityFilter, 
              options: [
                { label: 'All', value: 'all' },
                { label: 'High', value: 'high' },
                { label: 'Medium', value: 'medium' },
                { label: 'Low', value: 'low' }
              ],
              onChange: setPriorityFilter
            }
          ]}
        />

        <Card>
          <DataTable 
            data={filteredItems} 
            columns={columns} 
          />
        </Card>
      </div>
    </ManagerEditorLayout>
  );
};

export default ActionQueuePage;

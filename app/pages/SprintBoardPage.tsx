
import React, { useState, useEffect, useMemo } from 'react';
import {
  ManagerEditorLayout,
  KanbanBoard,
  Button,
  FormDrawer,
  FormField
} from '../ui';

interface SprintItem {
  id: string;
  Name: string;
  Status: string;
  Type: string;
  Priority: string;
  System: string;
  'Assigned To': string;
}

const statusToColumn: Record<string, string> = {
  'Backlog': 'backlog',
  'This Sprint': 'todo',
  'In Progress': 'in_progress',
  'In Review': 'in_progress',
  'Done': 'done',
  'Shipped': 'done',
};

const priorityMap: Record<string, 'high' | 'medium' | 'low'> = {
  'P0': 'high',
  'P1': 'high',
  'P2': 'medium',
  'P3': 'low',
};

const SprintBoardPage: React.FC = () => {
  const [items, setItems] = useState<SprintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    fetch('/api/tech-team/sprint')
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(data => setItems(data.items || []))
      .catch(err => console.error('[Sprint] Failed:', err))
      .finally(() => setLoading(false));
  }, []);

  const columns = useMemo(() => {
    const groups: Record<string, Array<{ id: string; title: string; subtitle: string; priority: 'high' | 'medium' | 'low'; tags: Array<{ label: string }> }>> = {
      backlog: [],
      todo: [],
      in_progress: [],
      done: [],
    };

    items.forEach(item => {
      const col = statusToColumn[item.Status] || 'backlog';
      groups[col]?.push({
        id: item.id,
        title: item.Name,
        subtitle: item.System || item['Assigned To'] || '',
        priority: priorityMap[item.Priority] || 'medium',
        tags: [{ label: item.Type || 'Task' }],
      });
    });

    return [
      { id: 'backlog', title: `Backlog (${groups.backlog.length})`, items: groups.backlog },
      { id: 'todo', title: `This Sprint (${groups.todo.length})`, items: groups.todo },
      { id: 'in_progress', title: `In Progress (${groups.in_progress.length})`, items: groups.in_progress },
      { id: 'done', title: `Done (${groups.done.length})`, items: groups.done },
    ];
  }, [items]);

  const formFields: FormField[] = [
    { name: 'title', label: 'Task Title', type: 'text', required: true },
    { name: 'subtitle', label: 'System', type: 'text' },
    {
      name: 'priority',
      label: 'Priority',
      type: 'select',
      options: [
        { label: 'P0 - Critical', value: 'P0' },
        { label: 'P1 - High', value: 'P1' },
        { label: 'P2 - Medium', value: 'P2' },
        { label: 'P3 - Low', value: 'P3' },
      ]
    },
  ];

  return (
    <ManagerEditorLayout
      title={`Sprint Board (${items.length} items)`}
      toolbar={<Button onClick={() => setIsFormOpen(true)}>Create Task</Button>}
    >
      {loading ? (
        <p className="text-sm text-[var(--color-text-secondary)]">Loading sprint items...</p>
      ) : (
        <KanbanBoard columns={columns} />
      )}

      <FormDrawer
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Create New Task"
        fields={formFields}
        onSubmit={(data) => {
          console.log('New Task:', data);
          setIsFormOpen(false);
        }}
      />
    </ManagerEditorLayout>
  );
};

export default SprintBoardPage;

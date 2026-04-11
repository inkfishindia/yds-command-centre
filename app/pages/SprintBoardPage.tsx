
import React, { useState } from 'react';
import { 
  ManagerEditorLayout, 
  KanbanBoard,
  Button,
  FormDrawer,
  FormField
} from '../ui';
import { useTeam } from '../contexts/TeamContext';

const SprintBoardPage: React.FC = () => {
  const { members } = useTeam();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const columns = [
    {
      id: 'backlog',
      title: 'Backlog',
      items: [
        { id: '1', title: 'Fix Header Alignment', subtitle: 'UI/UX', priority: 'low' as const, tags: [{ label: 'Bug' }] },
        { id: '2', title: 'Integrate Stripe API', subtitle: 'Backend', priority: 'high' as const, tags: [{ label: 'Feature' }] },
      ]
    },
    {
      id: 'todo',
      title: 'To Do',
      items: [
        { id: '3', title: 'Design Summer Banner', subtitle: 'Marketing', priority: 'medium' as const, tags: [{ label: 'Design' }] },
      ]
    },
    {
      id: 'in_progress',
      title: 'In Progress',
      items: [
        { id: '4', title: 'Lead CRM Dashboard', subtitle: 'Frontend', priority: 'high' as const, tags: [{ label: 'Feature' }] },
      ]
    },
    {
      id: 'done',
      title: 'Done',
      items: [
        { id: '5', title: 'Nexus AI Integration', subtitle: 'AI/ML', priority: 'high' as const, tags: [{ label: 'Complete' }] },
      ]
    }
  ];

  const formFields: FormField[] = [
    { name: 'title', label: 'Task Title', type: 'text', required: true },
    { name: 'subtitle', label: 'Category', type: 'text' },
    { 
      name: 'priority', 
      label: 'Priority', 
      type: 'select', 
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Medium', value: 'medium' },
        { label: 'High', value: 'high' },
      ]
    },
    { 
      name: 'assignee', 
      label: 'Assignee', 
      type: 'select', 
      options: members.map(m => ({ label: m.name, value: m.id }))
    },
  ];

  return (
    <ManagerEditorLayout 
      title="Sprint Board"
      toolbar={<Button onClick={() => setIsFormOpen(true)}>Create Task</Button>}
    >
      <KanbanBoard columns={columns} />

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

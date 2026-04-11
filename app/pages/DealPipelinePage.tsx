
import React, { useMemo } from 'react';
import { 
  ManagerEditorLayout, 
  KanbanBoard 
} from '../ui';
import { useCrm } from '../contexts/CrmContext';
import { LeadStatus } from '../types';

const DealPipelinePage: React.FC = () => {
  const { leads, pipelineStages } = useCrm();

  const columns = useMemo(() => {
    return pipelineStages.map(stage => ({
      id: stage.toLowerCase(),
      title: stage,
      items: leads
        .filter(l => {
          // Map LeadStatus to pipeline stages
          if (stage === 'New') return l.status === LeadStatus.NEW;
          if (stage === 'Qualified') return l.status === LeadStatus.QUALIFIED;
          if (stage === 'Proposal') return l.status === LeadStatus.CONTACTED; // Mock mapping
          return l.status.toLowerCase() === stage.toLowerCase();
        })
        .map(l => ({
          id: l.id,
          title: l.name,
          subtitle: l.company || 'Individual',
          priority: 'medium' as const,
          tags: [{ label: l.source }]
        }))
    }));
  }, [leads, pipelineStages]);

  return (
    <ManagerEditorLayout title="Deal Pipeline">
      <KanbanBoard columns={columns} />
    </ManagerEditorLayout>
  );
};

export default DealPipelinePage;

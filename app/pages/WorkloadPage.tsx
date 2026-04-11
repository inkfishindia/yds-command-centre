
import React from 'react';
import { 
  ManagerEditorLayout, 
  Card, 
  CapacityBar,
  AvatarGroup
} from '../ui';
import { useTeam } from '../contexts/TeamContext';

const WorkloadPage: React.FC = () => {
  const { members } = useTeam();

  return (
    <ManagerEditorLayout title="Team Workload">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {members.map(member => (
          <Card key={member.id} className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div className="flex gap-4 items-center">
                <AvatarGroup users={[{ name: member.name, avatar: member.avatar }]} size="md" />
                <div>
                  <h3 className="text-lg font-black text-[var(--color-text-primary)]">{member.name}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">{member.role}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <CapacityBar 
                current={member.currentLoad} 
                max={member.capacity} 
                label="Current Workload"
              />

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--color-border-primary)]">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Active Tasks</p>
                  <p className="text-xl font-black">12</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Utilization</p>
                  <p className="text-xl font-black">{Math.round((member.currentLoad / member.capacity) * 100)}%</p>
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button className="text-[10px] font-black uppercase tracking-widest text-[var(--color-brand-primary)] hover:underline">
                  View Task List
                </button>
                <button className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                  Reassign Work
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ManagerEditorLayout>
  );
};

export default WorkloadPage;

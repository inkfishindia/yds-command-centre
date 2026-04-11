
import React from 'react';
import { 
  ManagerEditorLayout, 
  ProgressRing, 
  Card 
} from '../ui';

const FocusAreasPage: React.FC = () => {
  const areas = [
    { id: '1', name: 'Financial Stability', progress: 85, status: 'healthy', owner: 'Vivek', trend: 'stable' },
    { id: '2', name: 'Product Quality', progress: 65, status: 'at-risk', owner: 'Surath', trend: 'declining' },
    { id: '3', name: 'Customer Satisfaction', progress: 92, status: 'healthy', owner: 'Danish', trend: 'improving' },
    { id: '4', name: 'Market Share', progress: 45, status: 'critical', owner: 'Vivek', trend: 'declining' },
    { id: '5', name: 'Team Morale', progress: 78, status: 'healthy', owner: 'Danish', trend: 'stable' },
  ];

  return (
    <ManagerEditorLayout title="Focus Areas">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {areas.map(area => (
          <Card key={area.id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-black uppercase tracking-tight text-[var(--color-text-primary)]">
                {area.name}
              </h3>
              <ProgressRing 
                percent={area.progress} 
                size={48} 
                color={
                  area.status === 'healthy' ? 'var(--color-brand-primary)' :
                  area.status === 'at-risk' ? '#f59e0b' : '#ef4444'
                }
              />
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Owner</span>
                <span className="text-xs font-bold">{area.owner}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Trend</span>
                <span className={`text-xs font-bold uppercase ${
                  area.trend === 'improving' ? 'text-green-500' : 
                  area.trend === 'declining' ? 'text-red-500' : 'text-blue-500'
                }`}>{area.trend}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--color-border-primary)]">
              <button className="w-full py-2 text-[10px] font-black uppercase tracking-widest bg-[var(--color-bg-stage)] hover:bg-[var(--color-border-primary)] rounded-lg transition-colors">
                View Detailed Report
              </button>
            </div>
          </Card>
        ))}
      </div>
    </ManagerEditorLayout>
  );
};

export default FocusAreasPage;

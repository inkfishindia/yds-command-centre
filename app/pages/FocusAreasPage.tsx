
import React, { useState, useEffect } from 'react';
import {
  ManagerEditorLayout,
  ProgressRing,
  Card
} from '../ui';

interface FocusArea {
  id: string;
  Name: string;
  Health: string;
  Owner: string;
  Status: string;
  'Business Area': string;
  Goal: string;
  Blockers: string;
  Commitments: Array<{ id: string; title: string; status: string }>;
}

const FocusAreasPage: React.FC = () => {
  const [areas, setAreas] = useState<FocusArea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/notion/focus-areas')
      .then(r => r.json())
      .then(d => setAreas(d.focusAreas || []))
      .catch(err => console.error('[FocusAreas] Failed:', err))
      .finally(() => setLoading(false));
  }, []);

  const healthToProgress = (health: string) => {
    if (health === 'On Track') return 80;
    if (health === 'At Risk') return 50;
    if (health === 'Off Track') return 25;
    return 60;
  };

  const healthToColor = (health: string) => {
    if (health === 'On Track') return 'var(--color-brand-primary)';
    if (health === 'At Risk') return '#f59e0b';
    if (health === 'Off Track') return '#ef4444';
    return '#6b7280';
  };

  if (loading) {
    return (
      <ManagerEditorLayout title="Focus Areas">
        <p className="text-sm text-[var(--color-text-secondary)]">Loading focus areas...</p>
      </ManagerEditorLayout>
    );
  }

  return (
    <ManagerEditorLayout title="Focus Areas">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {areas.map(area => (
          <Card key={area.id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight text-[var(--color-text-primary)]">
                  {area.Name}
                </h3>
                <span className="text-[10px] text-[var(--color-text-secondary)]">{area['Business Area']}</span>
              </div>
              <ProgressRing
                percent={healthToProgress(area.Health)}
                size={48}
                color={healthToColor(area.Health)}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Health</span>
                <span className="text-xs font-bold" style={{ color: healthToColor(area.Health) }}>
                  {area.Health || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Owner</span>
                <span className="text-xs font-bold">{area.Owner || '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Status</span>
                <span className="text-xs font-bold">{area.Status || '—'}</span>
              </div>
              {area.Goal && (
                <div className="mt-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Goal</span>
                  <p className="text-xs text-[var(--color-text-primary)] mt-1 line-clamp-2">{area.Goal}</p>
                </div>
              )}
              {area.Blockers && (
                <div className="mt-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Blockers</span>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1 line-clamp-2">{area.Blockers}</p>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </ManagerEditorLayout>
  );
};

export default FocusAreasPage;


import React, { useState, useEffect } from 'react';
import {
  ManagerEditorLayout,
  StatCard,
  Card,
  ProgressRing,
  StatusPill
} from '../ui';

interface HeroMetric {
  id: string;
  label: string;
  value: number;
  tone: string;
}

interface AttentionItem {
  id: string;
  title: string;
  detail: string;
  tone: string;
}

interface FocusAreaHealth {
  id: string;
  name: string;
  health: string;
  commitments: { total: number; done: number; overdue: number };
}

interface CEODashboardData {
  heroMetrics: HeroMetric[];
  attentionRail: AttentionItem[];
  pulseBar: {
    focusAreaHealth: FocusAreaHealth[];
    overdueBadge: { count: number };
    teamLoad: { people: number; avgActive: number };
  };
  today: {
    morningBrief: { summary: string } | null;
    reviewQueue: { count: number; items: Array<{ id: string; title: string; type: string }> };
    decisionsToValidate: { count: number; items: Array<{ id: string; title: string }> };
    calendar: { count: number; items: Array<{ id: string; title: string; time: string }> };
  };
  velocity: {
    decisionsPerWeek: number;
    avgDaysOverdue: number;
    delegationRatio: number;
  };
}

const toneToColor: Record<string, string> = {
  warning: '#f59e0b',
  danger: '#ef4444',
  success: 'var(--color-brand-primary)',
  info: '#3b82f6',
  neutral: '#6b7280',
};

const CEODashboardPage: React.FC = () => {
  const [data, setData] = useState<CEODashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ceo-dashboard')
      .then(r => r.json())
      .then(setData)
      .catch(err => console.error('[CEODashboard] Failed to load:', err))
      .finally(() => setLoading(false));
  }, []);

  const focusAreas = data?.pulseBar?.focusAreaHealth ?? [];

  const healthToProgress = (fa: FocusAreaHealth) => {
    if (!fa.commitments || fa.commitments.total === 0) return 0;
    return Math.round((fa.commitments.done / fa.commitments.total) * 100);
  };

  return (
    <ManagerEditorLayout title="CEO Dashboard">
      <div className="space-y-8">
        {/* Hero Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <StatCard key={i} label="Loading..." value="—" />
            ))
          ) : (
            data?.heroMetrics?.map(m => (
              <StatCard
                key={m.id}
                label={m.label}
                value={String(m.value)}
                trend={m.tone === 'warning' ? -1 : m.tone === 'danger' ? -2 : 1}
              />
            ))
          )}
        </div>

        {/* Attention Rail */}
        {data?.attentionRail && data.attentionRail.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.attentionRail.map(item => (
              <div
                key={item.id}
                className="p-4 rounded-xl border"
                style={{
                  borderColor: `${toneToColor[item.tone] || '#6b7280'}40`,
                  backgroundColor: `${toneToColor[item.tone] || '#6b7280'}10`,
                }}
              >
                <p className="text-sm font-bold text-[var(--color-text-primary)]">{item.title}</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">{item.detail}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Focus Areas */}
          <Card title="Focus Area Health">
            <div className="p-6 space-y-4">
              {focusAreas.length === 0 && (
                <p className="text-sm text-[var(--color-text-secondary)]">No focus areas loaded</p>
              )}
              {focusAreas.map(fa => {
                const progress = healthToProgress(fa);
                const isAtRisk = fa.health === 'At Risk' || fa.health === 'at_risk';
                const isOffTrack = fa.health === 'Off Track' || fa.health === 'off_track';
                const color = isOffTrack ? '#ef4444' : isAtRisk ? '#f59e0b' : 'var(--color-brand-primary)';
                return (
                  <div key={fa.id} className="flex items-center justify-between p-4 bg-[var(--color-bg-stage)] rounded-xl">
                    <div className="flex-1">
                      <p className="text-sm font-black">{fa.name}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest mt-1" style={{ color }}>
                        {fa.health}
                      </p>
                      {fa.commitments && (
                        <p className="text-[10px] text-[var(--color-text-secondary)] mt-1">
                          {fa.commitments.done}/{fa.commitments.total} done
                          {fa.commitments.overdue > 0 && (
                            <span className="text-red-400 ml-2">{fa.commitments.overdue} overdue</span>
                          )}
                        </p>
                      )}
                    </div>
                    <ProgressRing percent={progress} size={48} color={color} />
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Today's Queue */}
          <Card title="Today">
            <div className="p-6 space-y-5">
              {data?.today?.reviewQueue && data.today.reviewQueue.count > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-secondary)] mb-2">
                    Review Queue ({data.today.reviewQueue.count})
                  </p>
                  {data.today.reviewQueue.items.slice(0, 5).map(item => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
                      <span className="text-sm text-[var(--color-text-primary)]">{item.title}</span>
                      <span className="text-[10px] uppercase text-[var(--color-text-secondary)]">{item.type}</span>
                    </div>
                  ))}
                </div>
              )}
              {data?.today?.decisionsToValidate && data.today.decisionsToValidate.count > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-secondary)] mb-2">
                    Decisions to Validate ({data.today.decisionsToValidate.count})
                  </p>
                  {data.today.decisionsToValidate.items.slice(0, 5).map(item => (
                    <div key={item.id} className="py-2 border-b border-[var(--color-border)]">
                      <span className="text-sm text-[var(--color-text-primary)]">{item.title}</span>
                    </div>
                  ))}
                </div>
              )}
              {data?.today?.calendar && data.today.calendar.count > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-secondary)] mb-2">
                    Calendar ({data.today.calendar.count})
                  </p>
                  {data.today.calendar.items.slice(0, 5).map(item => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
                      <span className="text-sm text-[var(--color-text-primary)]">{item.title}</span>
                      <span className="text-xs text-[var(--color-text-secondary)]">{item.time}</span>
                    </div>
                  ))}
                </div>
              )}
              {!data?.today && <p className="text-sm text-[var(--color-text-secondary)]">Loading today's data...</p>}
            </div>
          </Card>
        </div>

        {/* Velocity Metrics */}
        {data?.velocity && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard label="Decisions/Week" value={String(data.velocity.decisionsPerWeek)} />
            <StatCard label="Avg Days Overdue" value={String(data.velocity.avgDaysOverdue)} trend={data.velocity.avgDaysOverdue > 3 ? -1 : 1} />
            <StatCard label="Delegation Ratio" value={`${Math.round(data.velocity.delegationRatio * 100)}%`} trend={data.velocity.delegationRatio > 0.5 ? 1 : -1} />
          </div>
        )}
      </div>
    </ManagerEditorLayout>
  );
};

export default CEODashboardPage;

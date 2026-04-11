
import React, { useState, useEffect } from 'react';
import {
  ManagerEditorLayout,
  StatCard,
  TimelineChart,
  Card,
  ProgressRing
} from '../ui';
import { api, DashboardSummary } from '../lib/api';

const CEODashboardPage: React.FC = () => {
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard.get()
      .then(setDashboard)
      .catch(err => console.error('[CEODashboard] Failed to load:', err))
      .finally(() => setLoading(false));
  }, []);

  // Revenue chart data (static for now — will wire to analytics later)
  const revenueData = [
    { date: 'Jan', revenue: 3200000 },
    { date: 'Feb', revenue: 3500000 },
    { date: 'Mar', revenue: 3100000 },
    { date: 'Apr', revenue: 4200000 },
    { date: 'May', revenue: 3800000 },
    { date: 'Jun', revenue: 4500000 },
  ];

  const focusAreas = dashboard?.focusAreas ?? [
    { id: '1', name: 'Market Expansion', health: 'on_track' },
    { id: '2', name: 'Product Innovation', health: 'at_risk' },
    { id: '3', name: 'Customer Retention', health: 'on_track' },
  ];

  const healthToProgress: Record<string, number> = {
    on_track: 75,
    at_risk: 45,
    off_track: 20,
  };

  return (
    <ManagerEditorLayout title="CEO Dashboard">
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Total Revenue" value="₹42.5L" trend={12.5} />
          <StatCard label="Active Projects" value={loading ? '—' : String(dashboard?.stats.totalProjects ?? 0)} trend={5.2} />
          <StatCard label="Active Commitments" value={loading ? '—' : String(dashboard?.stats.activeCommitments ?? 0)} trend={-2.1} />
          <StatCard label="Overdue Items" value={loading ? '—' : String(dashboard?.stats.overdueCount ?? 0)} trend={dashboard?.stats.overdueCount ? -1 * (dashboard.stats.overdueCount) : 0} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card title="Revenue Trend (H1 2026)">
            <div className="p-4">
              <TimelineChart data={revenueData} xKey="date" yKey="revenue" />
            </div>
          </Card>
          <Card title="Strategic Focus Areas">
            <div className="p-6 space-y-6">
              {focusAreas.map(area => {
                const isAtRisk = area.health === 'at_risk';
                const progress = healthToProgress[area.health] ?? 50;
                return (
                  <div key={area.id} className="flex items-center justify-between p-4 bg-[var(--color-bg-stage)] rounded-xl">
                    <div>
                      <p className="text-sm font-black">{area.name}</p>
                      <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isAtRisk ? 'text-yellow-500' : 'text-[var(--color-brand-primary)]'}`}>
                        {area.health.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                    <ProgressRing
                      percent={progress}
                      size={48}
                      color={isAtRisk ? '#f59e0b' : 'var(--color-brand-primary)'}
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {dashboard && dashboard.overdue.length > 0 && (
          <Card title={`Overdue Items (${dashboard.overdue.length})`}>
            <div className="p-4 space-y-3">
              {dashboard.overdue.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <span className="text-sm text-[var(--color-text-primary)]">{item.title}</span>
                  <span className="text-xs text-red-400">Due {item.dueDate}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </ManagerEditorLayout>
  );
};

export default CEODashboardPage;

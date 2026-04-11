
import React from 'react';
import { 
  ManagerEditorLayout, 
  Card, 
  HealthIndicator
} from '../ui';

const SystemStatusPage: React.FC = () => {
  const sources = [
    { name: 'Google Sheets (Master)', status: 'healthy', lastSync: '2 mins ago', latency: '120ms' },
    { name: 'Gemini API', status: 'healthy', lastSync: 'Live', latency: '450ms' },
    { name: 'Google Ads API', status: 'at-risk', lastSync: '1 hour ago', latency: '1.2s' },
    { name: 'GA4 Data Stream', status: 'healthy', lastSync: '15 mins ago', latency: '800ms' },
  ];

  return (
    <ManagerEditorLayout title="System & Data Status">
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)] mb-2">Overall Health</p>
            <div className="flex justify-center mb-2">
              <HealthIndicator status="healthy" size="lg" />
            </div>
            <p className="text-lg font-black text-green-500">99.9% Uptime</p>
          </Card>
          <Card className="p-6 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)] mb-2">API Quota (Gemini)</p>
            <p className="text-2xl font-black">42%</p>
            <div className="h-1.5 w-full bg-[var(--color-bg-stage)] rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: '42%' }} />
            </div>
          </Card>
          <Card className="p-6 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)] mb-2">Sync Latency</p>
            <p className="text-2xl font-black">240ms</p>
            <p className="text-[10px] text-green-500 font-bold">Optimal</p>
          </Card>
          <Card className="p-6 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)] mb-2">DB Connections</p>
            <p className="text-2xl font-black">18/50</p>
            <p className="text-[10px] text-[var(--color-text-secondary)]">Active Sessions</p>
          </Card>
        </div>

        <Card title="Data Source Freshness">
          <div className="p-0 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--color-bg-stage)]/50 border-b border-[var(--color-border-primary)]">
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Source</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Status</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Last Sync</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-primary)]">
                {sources.map(s => (
                  <tr key={s.name} className="hover:bg-[var(--color-bg-stage)]/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold">{s.name}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <HealthIndicator status={s.status as any} />
                        <span className="text-[10px] font-black uppercase">{s.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-[var(--color-text-secondary)]">{s.lastSync}</td>
                    <td className="px-6 py-4 text-xs font-mono">{s.latency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card title="Error Log (Last 24h)">
            <div className="p-6 space-y-4">
              {[
                { time: '10:05 AM', msg: 'Gemini API: Rate limit reached (retrying)', type: 'warning' },
                { time: '09:12 AM', msg: 'Google Ads: Auth token expired', type: 'error' },
                { time: '08:45 AM', msg: 'Sheets: Sync completed (420 rows)', type: 'info' },
              ].map((log, i) => (
                <div key={i} className="flex gap-4 text-xs">
                  <span className="text-[var(--color-text-secondary)] font-mono shrink-0">{log.time}</span>
                  <span className={log.type === 'error' ? 'text-red-500' : log.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'}>
                    [{log.type.toUpperCase()}]
                  </span>
                  <span className="text-[var(--color-text-primary)]">{log.msg}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="System Resources">
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>CPU Usage</span>
                  <span>12%</span>
                </div>
                <div className="h-1.5 w-full bg-[var(--color-bg-stage)] rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: '12%' }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>Memory Usage</span>
                  <span>45%</span>
                </div>
                <div className="h-1.5 w-full bg-[var(--color-bg-stage)] rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500" style={{ width: '45%' }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>Storage (Sheets)</span>
                  <span>82%</span>
                </div>
                <div className="h-1.5 w-full bg-[var(--color-bg-stage)] rounded-full overflow-hidden">
                  <div className="h-full bg-red-500" style={{ width: '82%' }} />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </ManagerEditorLayout>
  );
};

export default SystemStatusPage;

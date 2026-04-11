
import React from 'react';
import { 
  ManagerEditorLayout, 
  Card, 
  StatCard, 
  Button,
  DataTable
} from '../ui';

const TrafficGA4Page: React.FC = () => {
  const landingPages = [
    { path: '/', sessions: '25,400' },
    { path: '/products/premium-tee', sessions: '12,800' },
    { path: '/collections/summer-2026', sessions: '8,500' },
    { path: '/about-us', sessions: '4,200' },
  ];

  const columns = [
    { header: 'Page Path', accessor: (p: any) => <span className="font-mono text-xs">{p.path}</span> },
    { header: 'Sessions', accessor: 'sessions', align: 'right' as const },
  ];

  return (
    <ManagerEditorLayout 
      title="Traffic Analytics (GA4)"
      toolbar={<Button onClick={() => window.open('https://analytics.google.com', '_blank')}>Open GA4</Button>}
    >
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Sessions" value="85K" trend={8.4} />
          <StatCard label="Users" value="62K" trend={10.2} />
          <StatCard label="Bounce Rate" value="42%" trend={-5.1} />
          <StatCard label="Avg Session Duration" value="2m 15s" trend={2.5} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card title="Top Landing Pages">
            <DataTable 
              data={landingPages} 
              columns={columns} 
            />
          </Card>

          <Card title="Traffic Sources">
            <div className="p-6 space-y-4">
              {[
                { label: 'Direct', value: '35,000', pct: 41 },
                { label: 'Organic Search', value: '22,000', pct: 26 },
                { label: 'Paid Search', value: '18,000', pct: 21 },
                { label: 'Social', value: '10,000', pct: 12 },
              ].map(item => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{item.label}</span>
                    <span>{item.value}</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--color-bg-stage)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--color-brand-primary)]" style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </ManagerEditorLayout>
  );
};

export default TrafficGA4Page;

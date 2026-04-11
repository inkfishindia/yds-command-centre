
import React from 'react';
import { 
  ManagerEditorLayout, 
  Card, 
  MetricsBar,
  TimelineChart
} from '../ui';

const FinancialReportsPage: React.FC = () => {
  const metrics = [
    { label: 'Annual Revenue', value: '₹5.2Cr', trend: 15.4 },
    { label: 'Net Margin', value: '28%', trend: 3.2 },
    { label: 'Burn Rate', value: '₹4.5L/mo', trend: -1.5 },
  ];

  return (
    <ManagerEditorLayout title="Financial Reports">
      <div className="space-y-8">
        <MetricsBar metrics={metrics} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card title="Revenue vs Expenses (Annual Trend)">
            <div className="p-4 h-64 flex items-center justify-center text-[var(--color-text-secondary)] italic">
              <TimelineChart data={[]} xKey="month" yKey="revenue" />
              {/* Placeholder for actual chart */}
            </div>
          </Card>

          <Card title="Cash Flow Projection">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold">Current Cash Balance</span>
                <span className="text-xl font-black">₹45,00,000</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold">Projected Runway</span>
                <span className="text-xl font-black text-green-500">10 Months</span>
              </div>
              <div className="h-2 w-full bg-[var(--color-bg-stage)] rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: '85%' }} />
              </div>
              <p className="text-[10px] text-[var(--color-text-secondary)]">
                Based on current burn rate of ₹4.5L/mo and projected revenue growth of 5% MoM.
              </p>
            </div>
          </Card>
        </div>

        <Card title="Key Financial Ratios">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
            {[
              { label: 'Current Ratio', value: '2.4' },
              { label: 'Quick Ratio', value: '1.8' },
              { label: 'Debt to Equity', value: '0.15' },
              { label: 'Inventory Turnover', value: '6.2x' },
            ].map(ratio => (
              <div key={ratio.label} className="text-center p-4 bg-[var(--color-bg-stage)]/50 rounded-lg">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)] mb-1">{ratio.label}</p>
                <p className="text-lg font-black">{ratio.value}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </ManagerEditorLayout>
  );
};

export default FinancialReportsPage;

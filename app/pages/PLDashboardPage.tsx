
import React from 'react';
import { 
  ManagerEditorLayout, 
  Card, 
  StatCard, 
  TimelineChart 
} from '../ui';
import { useFinance } from '../contexts/FinanceContext';

const PLDashboardPage: React.FC = () => {
  const { invoices, expenses } = useFinance();

  const totalRevenue = invoices.reduce((acc, inv) => acc + inv.amount, 0);
  const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const chartData = [
    { month: 'Jan', revenue: 3200000, expenses: 2100000 },
    { month: 'Feb', revenue: 3500000, expenses: 2300000 },
    { month: 'Mar', revenue: 3100000, expenses: 2000000 },
    { month: 'Apr', revenue: totalRevenue, expenses: totalExpenses },
  ];

  return (
    <ManagerEditorLayout title="P&L Dashboard">
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Total Revenue" value={`₹${(totalRevenue / 100000).toFixed(1)}L`} trend={12.5} />
          <StatCard label="Total Expenses" value={`₹${(totalExpenses / 100000).toFixed(1)}L`} trend={8.4} />
          <StatCard label="Net Profit" value={`₹${(netProfit / 100000).toFixed(1)}L`} trend={21.2} />
          <StatCard label="Gross Margin" value={`${margin.toFixed(0)}%`} trend={2.5} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card title="Revenue vs Expenses" className="lg:col-span-2">
            <div className="p-4">
              <TimelineChart 
                data={chartData} 
                xKey="month" 
                yKey="revenue" 
              />
              <div className="flex justify-center gap-4 mt-4 text-[10px] font-black uppercase tracking-widest">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[var(--color-brand-primary)] rounded-full" />
                  <span>Revenue</span>
                </div>
                <div className="flex items-center gap-2 opacity-50">
                  <div className="w-3 h-3 bg-[var(--color-text-secondary)] rounded-full" />
                  <span>Expenses (Projected)</span>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Expense Breakdown">
            <div className="p-6 space-y-4">
              {[
                { label: 'Cost of Goods', value: '₹12.4L', pct: 44 },
                { label: 'Marketing', value: '₹6.2L', pct: 22 },
                { label: 'Payroll', value: '₹5.8L', pct: 20 },
                { label: 'Operations', value: '₹3.8L', pct: 14 },
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

export default PLDashboardPage;

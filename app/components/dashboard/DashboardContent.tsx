
import React, { useState } from 'react';
import { useDashboard } from '../../contexts/DashboardContext';
import { Card, EmptyState, Button, MarkdownOutput, Modal, Input } from '../../ui';
import NexusAIAgent from '../ai/NexusAIAgent';
import { useAuth } from '../../contexts/AuthContext';
import DemoModeBanner from '../layout/DemoModeBanner';
import { useToast } from '../../contexts/ToastContext';
import { DeltaMetric, DailyReportData } from '../../types';
import { summarizeDashboardMetrics } from '../../services/geminiService';

const DeltaBadge: React.FC<{ metric: DeltaMetric, isCurrency?: boolean, inverse?: boolean }> = ({ metric, isCurrency, inverse }) => {
  const isPositive = metric.delta >= 0;
  const isGood = inverse ? !isPositive : isPositive;
  const colorClass = isGood ? 'text-green-500' : 'text-red-500';
  const arrow = isPositive ? '↑' : '↓';
  
  const formattedDelta = isCurrency 
    ? Math.abs(metric.delta).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    : Math.abs(metric.delta).toLocaleString();

  return (
    <div className={`text-xs font-bold ${colorClass} flex items-center gap-1`}>
      <span>{arrow} {formattedDelta}</span>
      <span className="opacity-70">({Math.abs(metric.percentChange).toFixed(1)}%)</span>
    </div>
  );
};

const MiniCard: React.FC<{ title: string, value: string, metric: DeltaMetric, icon: string, inverse?: boolean, isCurrency?: boolean }> = ({ title, value, metric, icon, inverse, isCurrency }) => (
  <Card className="flex flex-col justify-between h-full hover:border-[var(--color-brand-primary)] transition-all">
    <div className="flex justify-between items-start mb-2">
      <span className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest">{title}</span>
      <span className="text-xl">{icon}</span>
    </div>
    <div className="text-2xl font-black text-[var(--color-text-primary)]">{value}</div>
    <div className="mt-2 pt-2 border-t border-[var(--color-border-primary)]/50">
      <DeltaBadge metric={metric} inverse={inverse} isCurrency={isCurrency} />
    </div>
  </Card>
);

const DashboardContent: React.FC = () => {
    const { metrics, loading, error, loadReportData } = useDashboard();
    const { isMockMode, signIn } = useAuth();
    const { addToast } = useToast();
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [tempId, setTempId] = useState(localStorage.getItem('DAILY_REPORT_SHEET_ID') || '');

    const handleSaveConfig = () => {
      localStorage.setItem('DAILY_REPORT_SHEET_ID', tempId);
      addToast("Dashboard source updated.", "success");
      setIsConfigOpen(false);
      loadReportData(true);
    };

    const getAISummary = async () => {
      if (!metrics) return;
      setLoadingSummary(true);
      try {
          const summary = await summarizeDashboardMetrics(metrics, 'today');
          setAiSummary(summary);
      } catch (e: any) {
          addToast("AI Summary failed", "error");
      } finally {
          setLoadingSummary(false);
      }
    };

    if (loading && !metrics) {
        return <div className="flex items-center justify-center h-full py-20"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    if (!metrics) return <EmptyState title="Intelligence Gap Detected" description="No operational data available for the current period." action={<Button onClick={() => loadReportData(true)}>Initiate Sync</Button>} />;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex justify-between items-end">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-4xl font-black tracking-tighter text-[var(--color-text-primary)]">DESIGN LAB COMMAND</h1>
                    <button onClick={() => setIsConfigOpen(true)} className="p-1 opacity-20 hover:opacity-100 transition-opacity">⚙️</button>
                  </div>
                  <p className="text-[var(--color-text-secondary)] font-black text-xs uppercase tracking-widest mt-1">Marketing & Sales Production Matrix</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="accent" onClick={getAISummary} disabled={loadingSummary}>
                    {loadingSummary ? 'Synthesizing...' : '✨ Executive Brief'}
                  </Button>
                  <Button variant="secondary" onClick={() => loadReportData(true)}>🔄 Sync</Button>
                </div>
            </header>

            {isMockMode && <DemoModeBanner onSignIn={signIn} />}

            {aiSummary && (
                <Card title="🤖 AI Intelligence Report" className="border-l-4 border-l-[var(--color-brand-accent)] bg-amber-50/5">
                    <MarkdownOutput content={aiSummary} />
                    <Button variant="secondary" size="sm" className="mt-4" onClick={() => setAiSummary(null)}>Dismiss</Button>
                </Card>
            )}

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <MiniCard title="New Leads" value={metrics.registrations.value.toLocaleString()} metric={metrics.registrations} icon="🎯" />
              <MiniCard title="Active Orders" value={metrics.ordersReceived.value.toLocaleString()} metric={metrics.ordersReceived} icon="📦" />
              <MiniCard title="Win Rate" value={`${metrics.conversionRate.value.toFixed(2)}%`} metric={metrics.conversionRate} icon="📈" />
              <MiniCard title="Average Deal" value={metrics.aov.value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })} metric={metrics.aov} icon="💎" isCurrency />
              <MiniCard title="Gross Pipeline" value={metrics.totalRevenue.value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })} metric={metrics.totalRevenue} icon="💰" isCurrency />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card title="📊 Channel Distribution" className="lg:col-span-2">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                      { label: 'YDS Direct', val: metrics.revenueBreakdown.b2c, color: 'bg-blue-500' },
                      { label: 'B2B Large', val: metrics.revenueBreakdown.business, color: 'bg-green-500' },
                      { label: 'Partners', val: metrics.revenueBreakdown.partner, color: 'bg-yellow-500' },
                      { label: 'Offline/COD', val: metrics.revenueBreakdown.cod, color: 'bg-red-500' },
                      { label: 'Manual Sales', val: metrics.revenueBreakdown.manual, color: 'bg-purple-500' },
                      { label: 'Design Service', val: metrics.revenueBreakdown.ds, color: 'bg-orange-500' }
                    ].map(item => {
                      const share = (item.val / metrics.totalRevenue.value) * 100;
                      return (
                        <div key={item.label} className="p-3 bg-[var(--color-bg-stage)] rounded-lg border border-[var(--color-border-primary)]/50">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
                            <span className="text-[9px] font-black uppercase text-[var(--color-text-secondary)] tracking-widest">{item.label}</span>
                          </div>
                          <div className="text-sm font-bold">{item.val.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</div>
                          <div className="text-[10px] text-[var(--color-text-secondary)] font-medium">{share.toFixed(1)}% Flow</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="h-2 w-full bg-[var(--color-bg-stage)] rounded-full overflow-hidden flex shadow-inner">
                    {[
                      { val: metrics.revenueBreakdown.b2c, color: 'bg-blue-500' },
                      { val: metrics.revenueBreakdown.business, color: 'bg-green-500' },
                      { val: metrics.revenueBreakdown.partner, color: 'bg-yellow-500' },
                      { val: metrics.revenueBreakdown.cod, color: 'bg-red-500' },
                      { val: metrics.revenueBreakdown.manual, color: 'bg-purple-500' },
                      { val: metrics.revenueBreakdown.ds, color: 'bg-orange-500' }
                    ].map((item, i) => (
                      <div key={i} style={{ width: `${(item.val / metrics.totalRevenue.value) * 100}%` }} className={`${item.color} h-full transition-all duration-1000`}></div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card title="🚨 Market Sentiment">
                <div className="space-y-4">
                  {[
                    { label: 'Velocity', val: metrics.orderHealth.ordersPerReg.value.toFixed(2), metric: metrics.orderHealth.ordersPerReg, icon: '⚡' },
                    { label: 'Risk Factor', val: `${metrics.orderHealth.codPct.value.toFixed(1)}%`, metric: metrics.orderHealth.codPct, icon: '⚠️', inverse: true },
                    { label: 'Churn Risk', val: `${metrics.leakage.abandonmentRate.value.toFixed(1)}%`, metric: metrics.leakage.abandonmentRate, icon: '🩸', inverse: true },
                    { label: 'B2B Mix', val: `${metrics.orderHealth.businessOrderPct.value.toFixed(1)}%`, metric: metrics.orderHealth.businessOrderPct, icon: '🏢' }
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between p-3 border-b border-[var(--color-border-primary)]/30 last:border-0">
                      <div>
                        <div className="text-[9px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest">{item.label}</div>
                        <div className="text-lg font-black">{item.val}</div>
                      </div>
                      <DeltaBadge metric={item.metric} inverse={item.inverse} />
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card title="🌊 Fulfillment Trajectory">
                <div className="space-y-4">
                  {[
                    { label: 'Demand', color: 'bg-blue-400', field: 'ordersReceived' as keyof DailyReportData },
                    { label: 'Revenue', color: 'bg-green-400', field: 'totalOrderValue' as keyof DailyReportData },
                    { label: 'Performance', color: 'bg-purple-400', field: 'conversionRate' as keyof DailyReportData }
                  ].map(trend => (
                    <div key={trend.label}>
                      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1">
                        <span>{trend.label}</span>
                        <span>{metrics.trends[metrics.trends.length-1][trend.field]?.toLocaleString()}</span>
                      </div>
                      <div className="h-10 flex items-end gap-1 px-2 bg-[var(--color-bg-stage)] rounded-lg">
                        {metrics.trends.map((day, i) => {
                          const max = Math.max(...metrics.trends.map(d => Number(d[trend.field]) || 1));
                          const val = Number(day[trend.field]) || 0;
                          const height = (val / max) * 100;
                          return (
                            <div key={i} title={day.date?.toLocaleDateString()} className={`flex-1 ${trend.color} rounded-t-sm transition-all duration-500`} style={{ height: `${height}%` }}></div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              
              <Card title="⚡ Live Assistant">
                <div className="h-[240px]">
                   <NexusAIAgent />
                </div>
              </Card>
            </div>

            <Modal open={isConfigOpen} onClose={() => setIsConfigOpen(false)} title="Matrix Configuration">
                <div className="space-y-4">
                  <Input label="Intelligence Source (Sheet ID)" value={tempId} onChange={e => setTempId(e.target.value)} />
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setIsConfigOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleSaveConfig}>Authorize & Sync 🚀</Button>
                  </div>
                </div>
            </Modal>
        </div>
    );
};

export default DashboardContent;

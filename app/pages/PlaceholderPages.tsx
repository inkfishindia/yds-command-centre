
import React from 'react'
import { 
  ManagerEditorLayout, 
  EmptyState, 
  MetricsBar, 
  TimelineChart, 
  Card, 
  FilterBar, 
  SnoozeMenu, 
  HealthIndicator, 
  KanbanBoard, 
  CalendarView, 
  ApprovalCard 
} from '../ui'

const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => {
  return (
    <ManagerEditorLayout title={title}>
      <EmptyState 
        title={`${title} is coming soon`} 
        description="We are currently building this module to provide you with real-time insights and management capabilities."
      />
    </ManagerEditorLayout>
  )
}

export const CEODashboardPage = () => {
  const metrics = [
    { label: 'Total Revenue', value: '₹42.5L', trend: 12.5 },
    { label: 'Active Customers', value: '1,240', trend: 5.2 },
    { label: 'Avg Order Value', value: '₹3,427', trend: -2.1 },
    { label: 'Conversion Rate', value: '3.8%', trend: 0.4 },
  ]

  const revenueData = [
    { date: 'Jan', revenue: 3200000 },
    { date: 'Feb', revenue: 3500000 },
    { date: 'Mar', revenue: 3100000 },
    { date: 'Apr', revenue: 4200000 },
    { date: 'May', revenue: 3800000 },
    { date: 'Jun', revenue: 4500000 },
  ]

  return (
    <ManagerEditorLayout title="CEO Dashboard">
      <div className="space-y-8">
        <MetricsBar metrics={metrics} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card title="Revenue Trend (H1 2026)">
            <div className="p-4">
              <TimelineChart data={revenueData} xKey="date" yKey="revenue" />
            </div>
          </Card>
          <Card title="Strategic Focus Areas">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold">Market Expansion</span>
                <span className="text-xs text-green-500 font-black">ON TRACK</span>
              </div>
              <div className="h-2 w-full bg-[var(--color-bg-stage)] rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: '75%' }} />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold">Product Innovation</span>
                <span className="text-xs text-yellow-500 font-black">AT RISK</span>
              </div>
              <div className="h-2 w-full bg-[var(--color-bg-stage)] rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500" style={{ width: '45%' }} />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-bold">Customer Retention</span>
                <span className="text-xs text-green-500 font-black">ON TRACK</span>
              </div>
              <div className="h-2 w-full bg-[var(--color-bg-stage)] rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: '90%' }} />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </ManagerEditorLayout>
  )
}

export const ActionQueuePage = () => {
  const [search, setSearch] = React.useState('')
  const [priority, setPriority] = React.useState('all')

  const actions = [
    { id: '1', title: 'Approve Design for Acme Corp', type: 'Design', priority: 'high', due: 'Today' },
    { id: '2', title: 'Review Q2 Budget Allocation', type: 'Finance', priority: 'medium', due: 'Tomorrow' },
    { id: '3', title: 'Update Inventory for T-Shirts', type: 'Ops', priority: 'low', due: 'In 2 days' },
    { id: '4', title: 'Follow up with Global Tech Lead', type: 'Sales', priority: 'high', due: 'Today' },
  ]

  return (
    <ManagerEditorLayout title="Action Queue">
      <div className="space-y-6">
        <FilterBar 
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            { 
              label: 'Priority', 
              value: priority, 
              options: [
                { label: 'All', value: 'all' },
                { label: 'High', value: 'high' },
                { label: 'Medium', value: 'medium' },
                { label: 'Low', value: 'low' }
              ],
              onChange: setPriority
            }
          ]}
        />

        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-primary)] rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-bg-stage)]/50 border-b border-[var(--color-border-primary)]">
                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Action</th>
                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Type</th>
                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Priority</th>
                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Due</th>
                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)] text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-primary)]">
              {actions.map(action => (
                <tr key={action.id} className="hover:bg-[var(--color-bg-stage)]/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-black text-[var(--color-text-primary)]">{action.title}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black uppercase px-2 py-1 bg-[var(--color-bg-stage)] rounded">{action.type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-black uppercase ${
                      action.priority === 'high' ? 'text-red-500' : 
                      action.priority === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                    }`}>{action.priority}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-[var(--color-text-secondary)]">{action.due}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <SnoozeMenu onSnooze={(d) => alert(`Snoozed for ${d}`)} />
                      <button className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-[var(--color-brand-primary)] text-white rounded-lg hover:opacity-90 transition-opacity">
                        Complete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ManagerEditorLayout>
  )
}
export const FocusAreasPage = () => {
  const areas = [
    { id: '1', name: 'Financial Stability', status: 'healthy', owner: 'Vivek', trend: 'stable' },
    { id: '2', name: 'Product Quality', status: 'at-risk', owner: 'Surath', trend: 'declining' },
    { id: '3', name: 'Customer Satisfaction', status: 'healthy', owner: 'Danish', trend: 'improving' },
    { id: '4', name: 'Market Share', status: 'critical', owner: 'Vivek', trend: 'declining' },
    { id: '5', name: 'Team Morale', status: 'healthy', owner: 'Danish', trend: 'stable' },
  ]

  return (
    <ManagerEditorLayout title="Focus Areas">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {areas.map(area => (
          <Card key={area.id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-black uppercase tracking-tight text-[var(--color-text-primary)]">
                {area.name}
              </h3>
              <HealthIndicator status={area.status} size="lg" />
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
  )
}
export const DecisionsLogPage = () => <PlaceholderPage title="Decisions Log" />

export const LeadCRMPage = () => <PlaceholderPage title="Lead CRM" />

export const DealPipelinePage = () => {
  const columns = [
    {
      id: 'qualified',
      title: 'Qualified Leads',
      items: [
        { id: '1', title: 'Acme Corp Redesign', subtitle: 'Budget: ₹5L', priority: 'high' as const, tags: [{ label: 'Web' }] },
        { id: '2', title: 'Global Tech App', subtitle: 'Budget: ₹12L', priority: 'medium' as const, tags: [{ label: 'Mobile' }] },
      ]
    },
    {
      id: 'proposal',
      title: 'Proposal Sent',
      items: [
        { id: '3', title: 'Startup Branding', subtitle: 'Budget: ₹2L', priority: 'low' as const, tags: [{ label: 'Design' }] },
      ]
    },
    {
      id: 'negotiation',
      title: 'Negotiation',
      items: [
        { id: '4', title: 'Enterprise Portal', subtitle: 'Budget: ₹25L', priority: 'high' as const, tags: [{ label: 'Full Stack' }] },
      ]
    },
    {
      id: 'closed',
      title: 'Closed Won',
      items: [
        { id: '5', title: 'E-commerce Launch', subtitle: 'Budget: ₹8L', priority: 'medium' as const, tags: [{ label: 'Shopify' }] },
      ]
    }
  ]

  return (
    <ManagerEditorLayout title="Deal Pipeline">
      <KanbanBoard columns={columns} />
    </ManagerEditorLayout>
  )
}
export const CustomerDirectoryPage = () => <PlaceholderPage title="Customer Directory" />
export const CampaignsPage = () => <PlaceholderPage title="Campaigns" />

export const ContentCalendarPage = () => {
  const events = [
    { id: '1', title: 'IG: Product Launch', date: new Date(2026, 3, 15), type: 'marketing', color: '#ec4899' },
    { id: '2', title: 'Blog: Design Trends', date: new Date(2026, 3, 18), type: 'marketing', color: '#3b82f6' },
    { id: '3', title: 'YT: Behind the Scenes', date: new Date(2026, 3, 22), type: 'marketing', color: '#ef4444' },
    { id: '4', title: 'Newsletter: Monthly Recap', date: new Date(2026, 3, 30), type: 'marketing', color: '#10b981' },
  ]

  return (
    <ManagerEditorLayout title="Content Calendar">
      <CalendarView events={events as any} />
    </ManagerEditorLayout>
  )
}
export const InstagramOpsPage = () => <PlaceholderPage title="Instagram Ops" />

export const InvoicesPage = () => <PlaceholderPage title="Invoices" />

export const ExpensesPage = () => {
  const pendingExpenses = [
    { id: '1', title: 'Adobe Creative Cloud', subtitle: 'Subscription', description: 'Monthly subscription for design team.', amount: '₹4,500', requester: 'Danish' },
    { id: '2', title: 'Office Supplies', subtitle: 'Operations', description: 'Paper, ink, and stationery for the hub.', amount: '₹1,200', requester: 'Surath' },
    { id: '3', title: 'Client Lunch', subtitle: 'Sales', description: 'Meeting with Acme Corp stakeholders.', amount: '₹3,800', requester: 'Vivek' },
  ]

  return (
    <ManagerEditorLayout title="Expense Approvals">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pendingExpenses.map(expense => (
          <ApprovalCard 
            key={expense.id}
            title={expense.title}
            subtitle={expense.subtitle}
            description={expense.description}
            amount={expense.amount}
            requester={expense.requester}
            onApprove={() => alert(`Approved ${expense.title}`)}
            onReject={() => alert(`Rejected ${expense.title}`)}
          />
        ))}
      </div>
    </ManagerEditorLayout>
  )
}
export const PLDashboardPage = () => <PlaceholderPage title="P&L Dashboard" />

export const StockLevelsPage = () => <PlaceholderPage title="Stock Levels" />
export const SuppliersPage = () => <PlaceholderPage title="Suppliers" />
export const WarehousesPage = () => <PlaceholderPage title="Warehouses" />

export const GoogleAdsPage = () => <PlaceholderPage title="Google Ads" />
export const TrafficGA4Page = () => <PlaceholderPage title="Traffic (GA4)" />

export const WorkloadPage = () => <PlaceholderPage title="Workload" />
export const SprintBoardPage = () => <PlaceholderPage title="Sprint Board" />
export const TechDecisionsPage = () => <PlaceholderPage title="Tech Decisions" />

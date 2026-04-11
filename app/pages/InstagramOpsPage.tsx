
import React, { useState } from 'react';
import { 
  ManagerEditorLayout, 
  Card, 
  Button, 
  StatusPill, 
  TabBar,
  ApprovalCard,
  StatCard,
  DataTable
} from '../ui';
import { LayoutGrid, ListTodo, BarChart3 } from 'lucide-react';

const InstagramOpsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('approvals');

  const pendingApprovals = [
    { id: '1', title: 'Summer Collection Hook', subtitle: 'Reel - Hook Only', description: 'Stop scrolling! Your summer wardrobe just got an upgrade.', amount: 'Pillar: Style', requester: 'Danish' },
    { id: '2', title: 'Behind the Scenes', subtitle: 'Carousel', description: 'Showing the craftsmanship behind our premium cotton tees.', amount: 'Pillar: Trust', requester: 'Surath' },
  ];

  const pipeline = [
    { id: '1', title: 'Product Showcase', status: 'Draft', date: '2026-04-15' },
    { id: '2', title: 'Customer Testimonial', status: 'Scheduled', date: '2026-04-18' },
    { id: '3', title: 'Style Guide', status: 'In Review', date: '2026-04-20' },
  ];

  const pipelineColumns = [
    { header: 'Post', accessor: 'title' },
    { header: 'Status', accessor: (post: any) => <StatusPill status={post.status as any} /> },
    { header: 'Date', accessor: 'date' },
    { 
      header: 'Actions', 
      accessor: (post: any) => (
        <Button size="sm" variant="secondary" onClick={() => alert('Edit Post')}>Edit</Button>
      )
    }
  ];

  const tabs = [
    { id: 'approvals', label: 'Approvals', icon: <ListTodo size={16} /> },
    { id: 'pipeline', label: 'Pipeline', icon: <LayoutGrid size={16} /> },
    { id: 'metrics', label: 'Metrics', icon: <BarChart3 size={16} /> },
  ];

  return (
    <ManagerEditorLayout title="Instagram Ops">
      <div className="space-y-6">
        <TabBar 
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'approvals' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pendingApprovals.map(item => (
              <ApprovalCard 
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                description={item.description}
                amount={item.amount}
                requester={item.requester}
                onApprove={() => alert('Approved')}
                onReject={() => alert('Rejected')}
              />
            ))}
          </div>
        )}

        {activeTab === 'pipeline' && (
          <Card>
            <DataTable 
              data={pipeline} 
              columns={pipelineColumns} 
            />
          </Card>
        )}

        {activeTab === 'metrics' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard label="Reach" value="12.5K" trend={15} />
            <StatCard label="Engagement Rate" value="4.8%" trend={-2} />
            <StatCard label="New Followers" value="+420" trend={5} />
          </div>
        )}
      </div>
    </ManagerEditorLayout>
  );
};

export default InstagramOpsPage;

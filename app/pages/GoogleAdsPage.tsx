
import React from 'react';
import { 
  ManagerEditorLayout, 
  Card, 
  StatCard, 
  TimelineChart,
  Button,
  DataTable
} from '../ui';

const GoogleAdsPage: React.FC = () => {
  const campaigns = [
    { name: 'Search - Brand', spend: '₹15,000', roas: '8.4x', val: '₹1,26,000' },
    { name: 'PMax - Summer', spend: '₹45,000', roas: '4.2x', val: '₹1,89,000' },
    { name: 'Display - Retargeting', spend: '₹12,000', roas: '2.1x', val: '₹25,200' },
  ];

  const columns = [
    { header: 'Campaign', accessor: 'name' },
    { header: 'Spend', accessor: 'spend' },
    { 
      header: 'ROAS', 
      accessor: (c: any) => <span className="font-black text-green-500">{c.roas}</span> 
    },
    { header: 'Conv. Value', accessor: 'val' },
  ];

  return (
    <ManagerEditorLayout 
      title="Google Ads Performance"
      toolbar={<Button onClick={() => window.open('https://ads.google.com', '_blank')}>Open Google Ads</Button>}
    >
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Spend" value="₹1.2L" trend={5.4} />
          <StatCard label="Impressions" value="450K" trend={12.8} />
          <StatCard label="Clicks" value="12.4K" trend={8.2} />
          <StatCard label="Conversions" value="420" trend={15.5} />
        </div>

        <Card title="Campaign Performance (Last 30 Days)">
          <DataTable 
            data={campaigns} 
            columns={columns} 
          />
        </Card>

        <Card title="Ad Spend Trend">
          <div className="p-4">
            <TimelineChart data={[]} xKey="date" yKey="spend" />
          </div>
        </Card>
      </div>
    </ManagerEditorLayout>
  );
};

export default GoogleAdsPage;


import React from 'react';
import { 
  ManagerEditorLayout, 
  Card, 
  StatCard,
  DataTable,
  Button
} from '../ui';

const PayrollPage: React.FC = () => {
  const teamPayroll = [
    { name: 'Vivek', role: 'Founder', base: '₹1,50,000', bonus: '₹0', total: '₹1,50,000' },
    { name: 'Danish', role: 'Product', base: '₹1,20,000', bonus: '₹10,000', total: '₹1,30,000' },
    { name: 'Surath', role: 'Operations', base: '₹80,000', bonus: '₹5,000', total: '₹85,000' },
    { name: 'Anjali', role: 'Marketing', base: '₹60,000', bonus: '₹0', total: '₹60,000' },
  ];

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Role', accessor: 'role' },
    { header: 'Base Pay', accessor: 'base' },
    { header: 'Bonus', accessor: 'bonus' },
    { header: 'Total Payout', accessor: (r: any) => <span className="font-black">{r.total}</span> },
    { 
      header: 'Actions', 
      accessor: (r: any) => (
        <Button size="sm" variant="secondary" onClick={() => alert(`View Payslip for ${r.name}`)}>
          Payslip
        </Button>
      )
    }
  ];

  return (
    <ManagerEditorLayout 
      title="Payroll Management"
      toolbar={<Button onClick={() => alert('Run Payroll')}>Run Payroll</Button>}
    >
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Monthly Payroll" value="₹5.8L" trend={2.1} />
          <StatCard label="Headcount" value="12" trend={0} />
          <StatCard label="Next Payout" value="May 1" trend={0} />
        </div>

        <Card title="Monthly Breakdown (April 2026)">
          <DataTable data={teamPayroll} columns={columns} />
        </Card>
      </div>
    </ManagerEditorLayout>
  );
};

export default PayrollPage;


import React, { useState, useMemo } from 'react';
import { 
  ManagerEditorLayout, 
  DataTable, 
  FilterBar, 
  Button, 
  Card,
  DetailDrawer
} from '../ui';
import { mockLeads } from '../lib/mockData';

const CustomerDirectoryPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  const customers = useMemo(() => {
    return mockLeads.map(l => ({
      id: l.id,
      name: l.name,
      company: l.company,
      email: l.email,
      phone: l.phone,
      gstin: '27AAAAA0000A1Z5',
      orderHistory: [
        { id: 'ORD-001', date: '2026-03-15', amount: '₹25,000', status: 'Delivered' },
        { id: 'ORD-002', date: '2026-04-01', amount: '₹15,000', status: 'Processing' },
      ],
      totalSpend: '₹40,000'
    }));
  }, []);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.company?.toLowerCase().includes(search.toLowerCase())
    );
  }, [customers, search]);

  const columns = [
    { 
      header: 'Customer', 
      accessor: (c: any) => (
        <div className="flex flex-col">
          <span className="font-bold">{c.name}</span>
          <span className="text-[10px] text-[var(--color-text-secondary)]">{c.email}</span>
        </div>
      )
    },
    { header: 'Company', accessor: 'company' },
    { header: 'GSTIN', accessor: 'gstin' },
    { header: 'Orders', accessor: (c: any) => `${c.orderHistory.length} Orders` },
    { header: 'Total Spend', accessor: 'totalSpend' },
    { 
      header: 'Actions', 
      accessor: (c: any) => (
        <Button size="sm" variant="secondary" onClick={() => setSelectedCustomer(c)}>
          History
        </Button>
      )
    }
  ];

  return (
    <ManagerEditorLayout title="Customer Directory">
      <div className="space-y-6">
        <FilterBar 
          searchValue={search}
          onSearchChange={setSearch}
        />

        <Card>
          <DataTable 
            data={filteredCustomers} 
            columns={columns} 
            onRowClick={setSelectedCustomer}
          />
        </Card>

        {selectedCustomer && (
          <DetailDrawer
            isOpen={!!selectedCustomer}
            onClose={() => setSelectedCustomer(null)}
            title={`Order History: ${selectedCustomer.name}`}
          >
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                {selectedCustomer.orderHistory.map((order: any) => (
                  <div key={order.id} className="p-4 border border-[var(--color-border-primary)] rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold">{order.id}</p>
                      <p className="text-[10px] text-[var(--color-text-secondary)]">{order.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black">{order.amount}</p>
                      <p className="text-[10px] text-[var(--color-brand-primary)] font-bold">{order.status}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="w-full" variant="secondary" onClick={() => setSelectedCustomer(null)}>Close</Button>
            </div>
          </DetailDrawer>
        )}
      </div>
    </ManagerEditorLayout>
  );
};

export default CustomerDirectoryPage;

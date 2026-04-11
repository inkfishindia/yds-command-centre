
import React, { useState, useMemo } from 'react';
import { 
  ManagerEditorLayout, 
  DataTable, 
  FilterBar, 
  Button, 
  StatusPill, 
  Card,
  MetricsBar,
  FormDrawer,
  FormField
} from '../ui';
import { Invoice, InvoiceStatus } from '../types';
import { useFinance } from '../contexts/FinanceContext';

const InvoicesPage: React.FC = () => {
  const { invoices, addInvoice } = useFinance();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = inv.customerName.toLowerCase().includes(search.toLowerCase()) || 
                           inv.id.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, statusFilter]);

  const metrics = [
    { label: 'Total Outstanding', value: '₹1,50,000', trend: 5.4 },
    { label: 'Overdue', value: '₹25,000', trend: -2.1 },
    { label: 'Paid (MTD)', value: '₹4,25,000', trend: 12.8 },
  ];

  const columns = [
    { header: 'Invoice ID', accessor: 'id' },
    { header: 'Customer', accessor: 'customerName' },
    { header: 'Amount', accessor: (inv: Invoice) => `₹${inv.amount.toLocaleString()}` },
    { header: 'Status', accessor: (inv: Invoice) => <StatusPill status={inv.status} /> },
    { header: 'Due Date', accessor: 'dueDate' },
    { 
      header: 'Actions', 
      accessor: (inv: Invoice) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => alert('PDF Export')}>
            PDF
          </Button>
          <Button size="sm" variant="secondary" onClick={() => alert('Send Reminder')}>
            Remind
          </Button>
        </div>
      )
    }
  ];

  const formFields: FormField[] = [
    { name: 'customerName', label: 'Customer Name', type: 'text', required: true },
    { name: 'amount', label: 'Amount', type: 'number', required: true },
    { 
      name: 'status', 
      label: 'Status', 
      type: 'select', 
      options: [
        { label: 'Draft', value: InvoiceStatus.DRAFT },
        { label: 'Sent', value: InvoiceStatus.SENT },
        { label: 'Paid', value: InvoiceStatus.PAID },
        { label: 'Overdue', value: InvoiceStatus.OVERDUE },
      ]
    },
    { name: 'dueDate', label: 'Due Date', type: 'date', required: true },
  ];

  return (
    <ManagerEditorLayout 
      title="Invoices"
      toolbar={<Button onClick={() => setIsFormOpen(true)}>Create Invoice</Button>}
    >
      <div className="space-y-6">
        <MetricsBar metrics={metrics} />

        <FilterBar 
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            {
              label: 'Status',
              value: statusFilter,
              options: [
                { label: 'All', value: 'all' },
                { label: 'Draft', value: InvoiceStatus.DRAFT },
                { label: 'Sent', value: InvoiceStatus.SENT },
                { label: 'Paid', value: InvoiceStatus.PAID },
                { label: 'Overdue', value: InvoiceStatus.OVERDUE },
              ],
              onChange: setStatusFilter
            }
          ]}
        />

        <Card>
          <DataTable 
            data={filteredInvoices} 
            columns={columns} 
          />
        </Card>

        <FormDrawer 
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title="Create New Invoice"
          fields={formFields}
          onSubmit={addInvoice}
        />
      </div>
    </ManagerEditorLayout>
  );
};

export default InvoicesPage;

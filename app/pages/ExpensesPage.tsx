
import React, { useState, useMemo } from 'react';
import { 
  ManagerEditorLayout, 
  DataTable, 
  FilterBar, 
  Button, 
  StatusPill, 
  Card,
  FileUpload,
  FormDrawer,
  FormField
} from '../ui';
import { Expense, ExpenseStatus } from '../types';
import { useFinance } from '../contexts/FinanceContext';

const ExpensesPage: React.FC = () => {
  const { expenses, addExpense } = useFinance();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchesSearch = exp.title.toLowerCase().includes(search.toLowerCase()) || 
                           exp.vendor.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, search, categoryFilter]);

  const columns = [
    { header: 'Title', accessor: 'title' },
    { header: 'Category', accessor: 'category' },
    { header: 'Vendor', accessor: 'vendor' },
    { header: 'Amount', accessor: (exp: Expense) => `₹${exp.amount.toLocaleString()}` },
    { header: 'Status', accessor: (exp: Expense) => <StatusPill status={exp.status} /> },
    { header: 'Requester', accessor: 'requesterName' },
    { 
      header: 'Receipt', 
      accessor: (exp: Expense) => (
        <Button size="sm" variant="secondary" onClick={() => alert('View Receipt')}>
          View
        </Button>
      )
    }
  ];

  const formFields: FormField[] = [
    { name: 'title', label: 'Expense Title', type: 'text', required: true },
    { 
      name: 'category', 
      label: 'Category', 
      type: 'select', 
      options: [
        { label: 'Software', value: 'Software' },
        { label: 'Operations', value: 'Operations' },
        { label: 'Sales', value: 'Sales' },
        { label: 'Marketing', value: 'Marketing' },
      ]
    },
    { name: 'vendor', label: 'Vendor', type: 'text', required: true },
    { name: 'amount', label: 'Amount', type: 'number', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },
  ];

  return (
    <ManagerEditorLayout 
      title="Expenses"
      toolbar={<Button onClick={() => setIsFormOpen(true)}>Add Expense</Button>}
    >
      <div className="space-y-6">
        <FilterBar 
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            {
              label: 'Category',
              value: categoryFilter,
              options: [
                { label: 'All Categories', value: 'all' },
                { label: 'Software', value: 'Software' },
                { label: 'Operations', value: 'Operations' },
                { label: 'Sales', value: 'Sales' },
                { label: 'Marketing', value: 'Marketing' },
              ],
              onChange: setCategoryFilter
            }
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <DataTable 
                data={filteredExpenses} 
                columns={columns} 
              />
            </Card>
          </div>
          <div>
            <Card title="Quick Upload Receipt">
              <div className="p-4 space-y-4">
                <FileUpload 
                  label="Receipt File"
                  selectedFile={null}
                  onFileSelect={(file) => alert(`Selected ${file?.name}`)} 
                />
                <p className="text-[10px] text-[var(--color-text-secondary)] text-center">
                  Upload PDF or Image. Max 5MB.
                </p>
              </div>
            </Card>
          </div>
        </div>

        <FormDrawer 
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title="Add New Expense"
          fields={formFields}
          onSubmit={addExpense}
        />
      </div>
    </ManagerEditorLayout>
  );
};

export default ExpensesPage;

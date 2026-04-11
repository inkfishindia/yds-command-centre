
import React, { useState, useMemo } from 'react';
import { 
  ManagerEditorLayout, 
  DataTable, 
  FilterBar, 
  Button, 
  Card,
  DetailDrawer
} from '../ui';
import { Supplier } from '../types';
import { useInventory } from '../contexts/InventoryContext';

const SuppliersPage: React.FC = () => {
  const { suppliers, addSupplier } = useInventory();
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(sup => 
      sup.name.toLowerCase().includes(search.toLowerCase()) || 
      sup.contactPerson?.toLowerCase().includes(search.toLowerCase())
    );
  }, [suppliers, search]);

  const columns = [
    { header: 'Supplier Name', accessor: 'name' },
    { header: 'Contact Person', accessor: 'contactPerson' },
    { header: 'Lead Time', accessor: (s: Supplier) => `${s.leadTimeDays} days` },
    { 
      header: 'Rating', 
      accessor: (s: Supplier) => (
        <div className="flex items-center gap-1">
          <span className="font-bold">{s.rating}</span>
          <span className="text-yellow-500">★</span>
        </div>
      )
    },
    { header: 'Active POs', accessor: 'activePoCount' },
    { 
      header: 'Actions', 
      accessor: (s: Supplier) => (
        <Button size="sm" variant="secondary" onClick={() => setSelectedSupplier(s)}>
          Details
        </Button>
      )
    }
  ];

  return (
    <ManagerEditorLayout 
      title="Suppliers"
      toolbar={<Button onClick={() => alert('Add Supplier')}>Add Supplier</Button>}
    >
      <div className="space-y-6">
        <FilterBar 
          searchValue={search}
          onSearchChange={setSearch}
        />

        <Card>
          <DataTable 
            data={filteredSuppliers} 
            columns={columns} 
            onRowClick={setSelectedSupplier}
          />
        </Card>

        {selectedSupplier && (
          <DetailDrawer
            isOpen={!!selectedSupplier}
            onClose={() => setSelectedSupplier(null)}
            title={selectedSupplier.name}
          >
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Rating</label>
                  <p className="text-sm font-bold">{selectedSupplier.rating} / 5.0</p>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Lead Time</label>
                  <p className="text-sm font-bold">{selectedSupplier.leadTimeDays} Days</p>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Contact</label>
                <p className="text-sm font-bold">{selectedSupplier.contactPerson}</p>
                <p className="text-sm">{selectedSupplier.email}</p>
              </div>
              <div className="pt-6 border-t border-[var(--color-border-primary)]">
                <Button className="w-full" variant="secondary" onClick={() => alert('Create PO')}>Create Purchase Order</Button>
              </div>
            </div>
          </DetailDrawer>
        )}
      </div>
    </ManagerEditorLayout>
  );
};

export default SuppliersPage;

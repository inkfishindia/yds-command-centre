
import React, { useState, useMemo } from 'react';
import { 
  ManagerEditorLayout, 
  DataTable, 
  FilterBar, 
  Button, 
  Card,
  HealthIndicator
} from '../ui';
import { StockItem } from '../types';
import { useInventory } from '../contexts/InventoryContext';

const StockLevelsPage: React.FC = () => {
  const { stockItems } = useInventory();
  const [search, setSearch] = useState('');

  const filteredStock = useMemo(() => {
    return stockItems.filter(item => 
      item.name.toLowerCase().includes(search.toLowerCase()) || 
      item.sku.toLowerCase().includes(search.toLowerCase())
    );
  }, [stockItems, search]);

  const columns = [
    { header: 'Product', accessor: 'name' },
    { header: 'SKU', accessor: 'sku' },
    { 
      header: 'Stock Status', 
      accessor: (item: StockItem) => {
        const isLow = item.currentStock <= item.reorderLevel;
        return (
          <div className="flex items-center gap-2">
            <HealthIndicator status={isLow ? 'critical' : 'healthy'} />
            <span className={isLow ? 'text-red-500 font-bold' : ''}>
              {item.currentStock} {item.unit}
            </span>
          </div>
        );
      }
    },
    { header: 'Reorder Level', accessor: (item: StockItem) => `${item.reorderLevel} ${item.unit}` },
    { header: 'Daily Sales Rate', accessor: (item: StockItem) => `${item.dailySalesRate} ${item.unit}/day` },
    { 
      header: 'Actions', 
      accessor: (item: StockItem) => (
        <Button size="sm" variant="secondary" onClick={() => alert(`Create PO for ${item.name}`)}>
          Restock
        </Button>
      )
    }
  ];

  return (
    <ManagerEditorLayout title="Stock Levels">
      <div className="space-y-6">
        <FilterBar 
          searchValue={search}
          onSearchChange={setSearch}
        />

        <Card>
          <DataTable 
            data={filteredStock} 
            columns={columns} 
          />
        </Card>
      </div>
    </ManagerEditorLayout>
  );
};

export default StockLevelsPage;

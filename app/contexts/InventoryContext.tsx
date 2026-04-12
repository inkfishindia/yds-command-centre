
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { StockItem, Supplier } from '../types';

interface InventoryContextType {
  stockItems: StockItem[];
  suppliers: Supplier[];
  loading: boolean;
  updateStock: (id: string, qty: number) => void;
  addSupplier: (sup: Partial<Supplier>) => void;
  refresh: () => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

// Maps OPS_PRODUCTS_INVENTORY row -> StockItem shape used by ERP UI
function mapRowToStockItem(row: any): StockItem {
  const stock = parseInt(row['Stock'] || row['Current Stock'] || '0', 10) || 0;
  const reorder = parseInt(row['Reorder Level'] || row['Min Stock'] || '0', 10) || 0;
  return {
    id: row['Product SKU'] || row['Product Code'] || String(row.rowIndex),
    name: row['Product'] || row['Product Type'] || '',
    sku: row['Product SKU'] || row['Product Code'] || '',
    category: row['Category'] || '',
    currentStock: stock,
    reorderLevel: reorder,
    unit: row['Unit'] || 'pcs',
    dailySalesRate: parseFloat(row['Daily Sales Rate'] || '0') || 0,
    vendorId: row['Vendor'] || '',
  } as StockItem;
}

function mapRowToSupplier(row: any): Supplier {
  return {
    id: row['Vendor'] || String(row.rowIndex),
    name: row['Vendor'] || '',
    contactPerson: row['Contact'] || '',
    email: row['Email'] || '',
    leadTimeDays: parseInt(row['Lead time'] || '0', 10) || 0,
    rating: parseFloat(row['Vendor Ratio'] || row['Rating'] || '0') || 0,
    activePoCount: parseInt(row['Active POs'] || '0', 10) || 0,
  } as Supplier;
}

export const InventoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const [stockRes, vendorRes] = await Promise.all([
        fetch('/api/sheets/OPS_PRODUCTS_INVENTORY').then(r => r.json()),
        fetch('/api/sheets/OPS_VENDORS').then(r => r.json()),
      ]);
      if (stockRes.available !== false) {
        setStockItems((stockRes.rows || []).map(mapRowToStockItem));
      }
      if (vendorRes.available !== false) {
        setSuppliers((vendorRes.rows || []).map(mapRowToSupplier));
      }
    } catch (err) {
      console.error('[Inventory] Failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInventory(); }, []);

  const updateStock = (id: string, qty: number) => {
    setStockItems(prev => prev.map(item => item.id === id ? { ...item, currentStock: qty } : item));
  };

  const addSupplier = (sup: Partial<Supplier>) => {
    const newSup: Supplier = {
      id: Math.random().toString(36).substr(2, 9),
      name: sup.name || '',
      rating: sup.rating || 0,
      activePoCount: 0,
      ...sup,
    } as Supplier;
    setSuppliers(prev => [newSup, ...prev]);
  };

  return (
    <InventoryContext.Provider value={{ stockItems, suppliers, loading, updateStock, addSupplier, refresh: fetchInventory }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within a InventoryProvider');
  return context;
};

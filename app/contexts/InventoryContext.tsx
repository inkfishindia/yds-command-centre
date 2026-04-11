
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { StockItem, Supplier } from '../types';
import { mockStockItems, mockSuppliers } from '../lib/mockData';

interface InventoryContextType {
  stockItems: StockItem[];
  suppliers: Supplier[];
  updateStock: (id: string, qty: number) => void;
  addSupplier: (sup: Partial<Supplier>) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [stockItems, setStockItems] = useState<StockItem[]>(mockStockItems);
  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers);

  const updateStock = (id: string, qty: number) => {
    setStockItems(prev => prev.map(item => item.id === id ? { ...item, currentStock: qty } : item));
  };

  const addSupplier = (sup: Partial<Supplier>) => {
    const newSup: Supplier = {
      id: Math.random().toString(36).substr(2, 9),
      name: sup.name || '',
      rating: sup.rating || 0,
      activePoCount: 0,
      ...sup
    } as Supplier;
    setSuppliers(prev => [newSup, ...prev]);
  };

  return (
    <InventoryContext.Provider value={{ stockItems, suppliers, updateStock, addSupplier }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within a InventoryProvider');
  return context;
};

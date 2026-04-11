
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ActionItem {
  id: string;
  title: string;
  source: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  status: 'pending' | 'done' | 'snoozed';
}

interface ActionQueueContextType {
  items: ActionItem[];
  markDone: (id: string) => void;
  snooze: (id: string, days: number) => void;
}

const ActionQueueContext = createContext<ActionQueueContextType | undefined>(undefined);

export const ActionQueueProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ActionItem[]>([
    { id: '1', title: 'Approve Summer Campaign Budget', source: 'Finance', priority: 'high', dueDate: '2026-04-12', status: 'pending' },
    { id: '2', title: 'Restock Premium Tee - White', source: 'Inventory', priority: 'medium', dueDate: '2026-04-13', status: 'pending' },
    { id: '3', title: 'Review Q2 Tech Decisions', source: 'Strategy', priority: 'low', dueDate: '2026-04-15', status: 'pending' },
  ]);

  const markDone = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, status: 'done' } : item));
  };

  const snooze = (id: string, days: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newDate = new Date(item.dueDate);
        newDate.setDate(newDate.getDate() + days);
        return { ...item, dueDate: newDate.toISOString().split('T')[0], status: 'snoozed' };
      }
      return item;
    }));
  };

  return (
    <ActionQueueContext.Provider value={{ items, markDone, snooze }}>
      {children}
    </ActionQueueContext.Provider>
  );
};

export const useActionQueue = () => {
  const context = useContext(ActionQueueContext);
  if (!context) throw new Error('useActionQueue must be used within a ActionQueueProvider');
  return context;
};

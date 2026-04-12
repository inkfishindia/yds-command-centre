
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ActionItem {
  id: string;
  title: string;
  source: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  status: 'pending' | 'done' | 'snoozed';
  isOverdue: boolean;
  daysOverdue: number;
  assignedNames: string[];
  type: string;
}

interface ActionQueueContextType {
  items: ActionItem[];
  dansCount: number;
  runnersCount: number;
  loading: boolean;
  markDone: (id: string) => void;
  snooze: (id: string, days: number) => void;
  refresh: () => void;
}

const ActionQueueContext = createContext<ActionQueueContextType | undefined>(undefined);

export const ActionQueueProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [dansCount, setDansCount] = useState(0);
  const [runnersCount, setRunnersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchQueue = () => {
    setLoading(true);
    fetch('/api/notion/action-queue')
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(data => {
        const allItems = [...(data.dansQueue || []), ...(data.runnersQueue || [])];
        setItems(allItems.map((item: any) => ({
          id: item.id,
          title: item.name,
          source: item.focusAreaNames?.[0] || item.type || 'General',
          priority: (item.priority || 'medium').toLowerCase() as 'high' | 'medium' | 'low',
          dueDate: item.dueDate || '',
          status: item.status === 'Done' ? 'done' : 'pending',
          isOverdue: item.isOverdue || false,
          daysOverdue: item.daysOverdue || 0,
          assignedNames: item.assignedNames || [],
          type: item.type || '',
        })));
        setDansCount(data.dansQueueCount || 0);
        setRunnersCount(data.runnersQueueCount || 0);
      })
      .catch(err => console.error('[ActionQueue] Failed:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchQueue(); }, []);

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
    <ActionQueueContext.Provider value={{ items, dansCount, runnersCount, loading, markDone, snooze, refresh: fetchQueue }}>
      {children}
    </ActionQueueContext.Provider>
  );
};

export const useActionQueue = () => {
  const context = useContext(ActionQueueContext);
  if (!context) throw new Error('useActionQueue must be used within a ActionQueueProvider');
  return context;
};

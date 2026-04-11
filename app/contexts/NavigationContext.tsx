
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NavigationContextType {
  currentPath: string;
  setCurrentPath: (path: string) => void;
  selectedIds: {
    programId?: string;
    projectId?: string;
    leadId?: string;
    customerId?: string;
    invoiceId?: string;
  };
  setSelectedId: (key: string, id: string | undefined) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState('/');
  const [selectedIds, setSelectedIds] = useState({});

  const setSelectedId = (key: string, id: string | undefined) => {
    setSelectedIds(prev => ({ ...prev, [key]: id }));
  };

  return (
    <NavigationContext.Provider value={{ currentPath, setCurrentPath, selectedIds, setSelectedId }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) throw new Error('useNavigation must be used within a NavigationProvider');
  return context;
};


import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  capacity: number;
  currentLoad: number;
}

interface TeamContextType {
  members: TeamMember[];
  updateLoad: (id: string, load: number) => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const TeamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [members, setMembers] = useState<TeamMember[]>([
    { id: '1', name: 'Vivek', role: 'Founder', capacity: 100, currentLoad: 85 },
    { id: '2', name: 'Danish', role: 'Product', capacity: 100, currentLoad: 60 },
    { id: '3', name: 'Surath', role: 'Operations', capacity: 100, currentLoad: 95 },
    { id: '4', name: 'Anjali', role: 'Marketing', capacity: 100, currentLoad: 40 },
  ]);

  const updateLoad = (id: string, load: number) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, currentLoad: load } : m));
  };

  return (
    <TeamContext.Provider value={{ members, updateLoad }}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) throw new Error('useTeam must be used within a TeamProvider');
  return context;
};

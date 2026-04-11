
import React from 'react';

interface TabBarProps {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

const TabBar: React.FC<TabBarProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div className={`flex border-b border-[var(--color-border-primary)] overflow-x-auto no-scrollbar ${className}`}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all relative whitespace-nowrap
              ${isActive ? 'text-[var(--color-brand-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}
            `}
          >
            {tab.icon && <span>{tab.icon}</span>}
            {tab.label}
            {isActive && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--color-brand-primary)]" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default TabBar;

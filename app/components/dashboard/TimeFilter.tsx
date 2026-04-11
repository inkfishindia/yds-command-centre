import React from 'react';
import { useDashboard } from '../../contexts/DashboardContext';
import { Button } from '../../ui';

const TimeFilter: React.FC = () => {
  const { timeFilter, setTimeFilter } = useDashboard();
  const filters: Array<'7' | '30' | '90' | 'all'> = ['7', '30', '90', 'all'];

  return (
    <div className="flex items-center space-x-2 bg-[var(--color-bg-surface)] p-1 rounded-lg">
      {filters.map(filter => (
        <Button
          key={filter}
          onClick={() => setTimeFilter(filter)}
          variant={timeFilter === filter ? 'primary' : 'secondary'}
          size="sm"
          className={timeFilter !== filter ? '!bg-transparent border-none' : ''}
        >
          {filter === 'all' ? 'All Time' : `Last ${filter}D`}
        </Button>
      ))}
    </div>
  );
};

export default TimeFilter;

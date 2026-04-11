
import React, { ReactNode } from 'react';
import Card from './Card';

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: number; // percentage
  icon?: ReactNode;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, trend, icon, className }) => {
  const isPositive = trend !== undefined && trend >= 0;
  
  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">
            {label}
          </p>
          <h3 className="text-2xl font-black text-[var(--color-text-primary)]">
            {value}
          </h3>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              <span>{isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend)}%</span>
              <span className="text-[var(--color-text-secondary)] font-normal ml-1">vs last period</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="p-2 bg-[var(--color-bg-stage)] rounded-lg text-[var(--color-brand-primary)]">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

export default StatCard;

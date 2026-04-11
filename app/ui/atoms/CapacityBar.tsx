
import React from 'react';

interface CapacityBarProps {
  current: number;
  max: number;
  thresholds?: {
    warn: number;
    critical: number;
  };
  label?: string;
}

const CapacityBar: React.FC<CapacityBarProps> = ({ 
  current, 
  max, 
  thresholds = { warn: 0.8, critical: 0.95 },
  label 
}) => {
  const percentage = Math.min(Math.max(current / max, 0), 1);
  
  let colorClass = 'bg-green-500';
  if (percentage >= thresholds.critical) {
    colorClass = 'bg-red-500';
  } else if (percentage >= thresholds.warn) {
    colorClass = 'bg-yellow-500';
  }

  return (
    <div className="w-full space-y-1">
      {label && (
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">
          <span>{label}</span>
          <span>{Math.round(percentage * 100)}%</span>
        </div>
      )}
      <div className="h-2 w-full bg-[var(--color-bg-stage)] rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${colorClass}`} 
          style={{ width: `${percentage * 100}%` }} 
        />
      </div>
    </div>
  );
};

export default CapacityBar;

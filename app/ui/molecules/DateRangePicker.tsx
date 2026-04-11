
import React from 'react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  presets?: { label: string; days: number }[];
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ 
  startDate, 
  endDate, 
  onChange,
  presets = [
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 30 Days', days: 30 },
    { label: 'Last 90 Days', days: 90 },
  ]
}) => {
  const handlePreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    onChange(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
  };

  return (
    <div className="flex flex-wrap items-center gap-4 bg-[var(--color-bg-surface)] p-2 rounded-lg border border-[var(--color-border-primary)]">
      <div className="flex items-center gap-2">
        <input 
          type="date" 
          value={startDate} 
          onChange={(e) => onChange(e.target.value, endDate)}
          className="bg-transparent text-xs font-bold outline-none focus:text-[var(--color-brand-primary)]"
        />
        <span className="text-[var(--color-text-secondary)]">→</span>
        <input 
          type="date" 
          value={endDate} 
          onChange={(e) => onChange(startDate, e.target.value)}
          className="bg-transparent text-xs font-bold outline-none focus:text-[var(--color-brand-primary)]"
        />
      </div>
      <div className="h-4 w-px bg-[var(--color-border-primary)] hidden sm:block" />
      <div className="flex gap-2">
        {presets.map(preset => (
          <button
            key={preset.label}
            onClick={() => handlePreset(preset.days)}
            className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)] hover:text-[var(--color-brand-primary)] transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DateRangePicker;

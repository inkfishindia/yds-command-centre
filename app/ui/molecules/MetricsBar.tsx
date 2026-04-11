
import React from 'react'

interface MetricItem {
  label: string
  value: string | number
  trend?: number
  trendLabel?: string
  color?: string
}

interface MetricsBarProps {
  metrics: MetricItem[]
  className?: string
}

const MetricsBar: React.FC<MetricsBarProps> = ({ metrics, className = '' }) => {
  return (
    <div className={`flex flex-wrap items-center gap-8 py-4 px-6 bg-[var(--color-bg-surface)] border border-[var(--color-border-primary)] rounded-xl shadow-sm ${className}`}>
      {metrics.map((metric, index) => (
        <div key={index} className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)] mb-1">
            {metric.label}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-[var(--color-text-primary)]">
              {metric.value}
            </span>
            {metric.trend !== undefined && (
              <span className={`text-[10px] font-bold ${metric.trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {metric.trend >= 0 ? '↑' : '↓'} {Math.abs(metric.trend)}%
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default MetricsBar

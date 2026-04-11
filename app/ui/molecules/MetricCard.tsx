
import React, { ReactNode } from 'react'
import Card from './Card'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  tooltip?: string
  trendPct?: number
  headerAction?: ReactNode
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon, trendPct, headerAction }) => {
  const trendColor = trendPct === undefined ? '' : trendPct >= 0 ? 'text-green-500' : 'text-red-500'
  const trendSign = trendPct === undefined ? '' : trendPct >= 0 ? '+' : ''

  return (
    <Card title="" headerAction={headerAction} className="h-full">
      <div className="flex flex-col">
        <div className="flex items-center text-[var(--color-text-secondary)] text-xs sm:text-sm">
          {icon && <span className="text-base sm:text-lg md:text-xl mr-2">{icon}</span>}
          <span className="truncate">{title}</span>
        </div>
        <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] mt-2">{value}</p>
        <div className="flex items-center text-xs text-[var(--color-text-secondary)] mt-1">
          <span>{subtitle}</span>
          {trendPct !== undefined && (
            <span className={`font-semibold ml-2 ${trendColor}`}>
              {trendSign}{trendPct}%
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}

export default MetricCard

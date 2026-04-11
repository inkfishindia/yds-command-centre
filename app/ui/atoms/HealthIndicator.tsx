
import React from 'react'

export type HealthStatus = 'healthy' | 'at-risk' | 'critical' | 'unknown'

interface HealthIndicatorProps {
  status: HealthStatus | string
  label?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const HealthIndicator: React.FC<HealthIndicatorProps> = ({ 
  status, 
  label, 
  showLabel = true,
  size = 'md'
}) => {
  const getStatusInfo = (s: string) => {
    const normalized = s.toLowerCase()
    if (['healthy', 'on track', 'good', 'success', 'stable'].some(x => normalized.includes(x))) {
      return { color: 'bg-green-500', label: label || 'Healthy' }
    }
    if (['at-risk', 'warning', 'at risk', 'needs attention'].some(x => normalized.includes(x))) {
      return { color: 'bg-yellow-500', label: label || 'At Risk' }
    }
    if (['critical', 'blocked', 'failed', 'danger', 'off track'].some(x => normalized.includes(x))) {
      return { color: 'bg-red-500', label: label || 'Critical' }
    }
    return { color: 'bg-gray-400', label: label || 'Unknown' }
  }

  const info = getStatusInfo(String(status))
  
  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2.5 h-2.5',
    lg: 'w-4 h-4'
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`${sizeClasses[size]} rounded-full ${info.color} shadow-sm`} />
      {showLabel && (
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">
          {info.label}
        </span>
      )}
    </div>
  )
}

export default HealthIndicator

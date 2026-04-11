import React, { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action }) => {
  return (
    <div className="text-center p-8 border-2 border-dashed border-[var(--color-border-primary)] rounded-lg">
      <h3 className="text-lg font-medium text-[var(--color-text-primary)]">{title}</h3>
      {description && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export default EmptyState

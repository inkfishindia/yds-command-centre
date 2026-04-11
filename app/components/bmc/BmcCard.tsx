import React, { useState } from 'react'
import { Card } from '../../ui'

interface BmcCardProps {
  title: string
  tooltipText: string
  headerAction?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}

const BmcCard: React.FC<BmcCardProps> = ({ title, tooltipText, headerAction, children, className, bodyClassName }) => {
  const [showTooltip, setShowTooltip] = useState(false)

  const cardTitle = (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span>{title}</span>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-[var(--color-bg-canvas)] border border-[var(--color-border-primary)] rounded-md shadow-lg z-10 text-xs text-[var(--color-text-secondary)] leading-relaxed whitespace-normal">
          <p className="font-semibold mb-1 text-[var(--color-text-primary)]">Guiding Questions:</p>
          {tooltipText}
        </div>
      )}
    </div>
  )

  return (
    <Card title={cardTitle} headerAction={headerAction} className={className} bodyClassName={bodyClassName}>
      {children}
    </Card>
  )
}

export default BmcCard

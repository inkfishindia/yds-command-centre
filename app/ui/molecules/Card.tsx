
import React from 'react'

interface CardProps {
  title?: React.ReactNode
  children: React.ReactNode
  headerAction?: React.ReactNode
  className?: string
  bodyClassName?: string
}

const Card: React.FC<CardProps> = ({ title, children, headerAction, className, bodyClassName }) => {
  return (
    <div
      className={`bg-[var(--color-bg-surface)] border border-[var(--color-border-primary)] rounded-[var(--radius-component)] flex flex-col ${className}`}
      style={{ boxShadow: 'var(--shadow-elevation)' }}
    >
      {(title || headerAction) && (
        <div className="px-4 py-2.5 flex justify-between items-center border-b border-[var(--color-border-primary)] bg-[var(--color-bg-stage)]/20 shrink-0">
          {title && <div className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">{title}</div>}
          {headerAction && <div className="flex items-center">{headerAction}</div>}
        </div>
      )}
      <div className={`p-4 flex-1 ${bodyClassName || ''}`}>
        {children}
      </div>
    </div>
  )
}

export default Card

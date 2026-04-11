import React from 'react'

interface BmcNoteProps {
  children: React.ReactNode
  color: string
  onClick: () => void
}

const BmcNote: React.FC<BmcNoteProps> = ({ children, color, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="p-3 rounded-lg text-sm relative group cursor-pointer hover:ring-2 hover:ring-[var(--color-brand-primary)] transition-all"
      style={{
        backgroundColor: `var(--color-note-${color}-bg)`,
        color: `var(--color-note-${color}-text)`,
        boxShadow: 'var(--shadow-elevation)',
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
    >
      {children}
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg pointer-events-none">
        <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded">View Details</span>
      </div>
    </div>
  )
}

export default BmcNote
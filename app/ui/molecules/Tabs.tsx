import React from 'react'

export interface TabItem {
  id: string
  label: string
}

interface TabsProps {
  items: TabItem[]
  activeTab: string
  onTabClick: (tabId: string) => void
  mainSectionId?: string // OPTIONAL PROP: ID of the main section
}

const Tabs: React.FC<TabsProps> = ({ items, activeTab, onTabClick, mainSectionId }) => {
  return (
    <div className="border-b border-[var(--color-border-primary)]">
      <nav className="-mb-px flex flex-wrap gap-x-6" aria-label="Tabs">
        {items.map((item) => (
          <a
            key={item.id}
            href={mainSectionId ? `#/${mainSectionId}/${item.id}` : '#'} // Construct full hash path if possible
            onClick={(e) => {
              e.preventDefault()
              onTabClick(item.id)
            }}
            // REMOVED: whitespace-nowrap to allow text to wrap on multiple lines
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === item.id
                ? 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-gray-300'
              }`}
            aria-current={activeTab === item.id ? 'page' : undefined}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </div>
  )
}

export default Tabs
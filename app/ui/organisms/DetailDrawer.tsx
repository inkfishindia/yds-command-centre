
import React from 'react'
import Drawer from '../molecules/Drawer'
import Tag from '../atoms/Tag'
import StatusPill from '../atoms/StatusPill'

interface DetailField {
  label: string
  value: React.ReactNode
  type?: 'text' | 'status' | 'tag' | 'date' | 'currency'
}

interface DetailSection {
  title: string
  fields: DetailField[]
}

interface DetailDrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  sections?: DetailSection[]
  actions?: React.ReactNode
  width?: number
  children?: React.ReactNode
}

const DetailDrawer: React.FC<DetailDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  sections = [],
  actions,
  width = 500,
  children
}) => {
  const renderValue = (field: DetailField) => {
    if (field.value === null || field.value === undefined) return <span className="text-[var(--color-text-secondary)] italic">N/A</span>

    switch (field.type) {
      case 'status':
        return <StatusPill status={field.value} />
      case 'tag':
        return <Tag>{String(field.value)}</Tag>
      case 'currency':
        return <span className="font-black text-[var(--color-brand-primary)]">₹{Number(field.value).toLocaleString()}</span>
      default:
        return <span className="text-[var(--color-text-primary)] font-medium">{String(field.value)}</span>
    }
  }

  return (
    <Drawer open={isOpen} onClose={onClose} title={title} width={width}>
      <div className="space-y-8">
        {subtitle && (
          <p className="text-sm text-[var(--color-text-secondary)] -mt-4 mb-4">
            {subtitle}
          </p>
        )}

        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-brand-primary)] border-b border-[var(--color-border-primary)] pb-2">
              {section.title}
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {section.fields.map((field, fIdx) => (
                <div key={fIdx} className="space-y-1">
                  <h4 className="text-[9px] font-black uppercase tracking-tight text-[var(--color-text-secondary)]">
                    {field.label}
                  </h4>
                  <div className="text-sm">
                    {renderValue(field)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {actions && (
          <div className="pt-8 flex flex-wrap gap-3 border-t border-[var(--color-border-primary)]">
            {actions}
          </div>
        )}

        {children}
      </div>
    </Drawer>
  )
}

export default DetailDrawer

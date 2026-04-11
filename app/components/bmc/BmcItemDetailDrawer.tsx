import React from 'react'
import { Drawer, Button } from '../../ui'
import { BMC_SHEET_CONFIGS } from '../../hooks/useBmc'
import { BusinessModelCanvasData } from '../../types'

interface BmcItemDetailDrawerProps {
  isOpen: boolean
  onClose: () => void
  onEdit: (sectionKey: keyof BusinessModelCanvasData, item: any) => void
  data: { sectionKey: keyof BusinessModelCanvasData; item: any } | null
}

const BmcItemDetailDrawer: React.FC<BmcItemDetailDrawerProps> = ({ isOpen, onClose, onEdit, data }) => {
  if (!data) return null

  const { sectionKey, item: detailItem } = data
  const config = BMC_SHEET_CONFIGS.find(c => c.sectionKey === sectionKey)

  const renderValue = (value: any, field?: string) => {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
      return <span className="text-[var(--color-text-secondary)] italic">Not set</span>
    }
    // Handle array values (e.g., platforms)
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-[var(--color-text-secondary)] italic">None</span>;
      return value.join(', ');
    }
    // Check if the value is a URL and render as a link
    if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
      return <a href={value} target="_blank" rel="noopener noreferrer" className="text-[var(--color-brand-primary)] hover:underline">{value}</a>
    }
    return String(value)
  }

  const nameField = Object.keys(detailItem).find(k => k.toLowerCase().includes('name')) ||
                    Object.keys(detailItem).find(k => k.toLowerCase().includes('proposition')) ||
                    'id'

  // Adjust title for strategy
  const drawerTitle = sectionKey === 'strategy' ? "Core Strategy Details" : (detailItem[nameField] ? `Details for: ${detailItem[nameField]}` : "Item Details")

  return (
    <Drawer
      open={isOpen}
      onClose={onClose}
      title={drawerTitle}
      width={450}
    >
      {config && !config.isSimpleList ? (
        <div className="space-y-4">
          {Object.entries(config.fieldToHeaderMap || {})
            .filter(([field]) => {
              // Hide the 'id' field for strategy and auto-generated IDs
              if (sectionKey === 'strategy' && field === 'id') return false;
              if (field === 'id' && detailItem.id && detailItem.id.startsWith('generated-')) return false;
              return true;
            })
            .map(([field, header]) => (
            <div key={field}>
              <h4 className="text-xs font-bold uppercase text-[var(--color-text-secondary)] tracking-wider">{String(header)}</h4>
              <p className="text-base text-[var(--color-text-primary)] mt-1 break-words whitespace-pre-wrap">{renderValue(detailItem[field], field)}</p>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <h4 className="text-xs font-bold uppercase text-[var(--color-text-secondary)] tracking-wider">Description</h4>
          <p className="text-base text-[var(--color-text-primary)] mt-1 break-words whitespace-pre-wrap">{renderValue(detailItem.description)}</p>
        </div>
      )}

      <div className="mt-8 pt-4 border-t border-[var(--color-border-primary)]">
        <Button variant="primary" onClick={() => onEdit(sectionKey, detailItem)}>
          <span role="img" aria-label="edit" className="mr-2">✏️</span> Edit Item
        </Button>
      </div>
    </Drawer>
  )
}

export default BmcItemDetailDrawer;
import React from 'react'
import { Input, Table, Button, Tag, ManagerEditorLayout } from '../ui'

interface CatalogItem {
  sku: string
  title: string
  category: string
  status: 'Active' | 'Draft' | 'Archived'
}

const mockCatalogItems: CatalogItem[] = [
  { sku: 'TS-BLK-LG', title: 'Classic Black T-Shirt', category: 'Apparel', status: 'Active' },
  { sku: 'MUG-WHT-11', title: 'Company Logo Mug', category: 'Drinkware', status: 'Active' },
  { sku: 'PEN-BLU-01', title: 'Ret retractable Blue Pen', category: 'Office Supplies', status: 'Draft' },
  { sku: 'NB-GRN-A5', title: 'Spiral A5 Notebook', category: 'Stationery', status: 'Active' },
  { sku: 'HAT-RED-OS', title: 'Embroidered Red Cap', category: 'Headwear', status: 'Archived' },
  { sku: 'USB-SLV-16', title: '16GB Silver Flash Drive', category: 'Electronics', status: 'Active' },
]

const CatalogPage: React.FC = () => {
  const getStatusColor = (status: CatalogItem['status']): 'green' | 'blue' | 'gray' => {
    switch (status) {
      case 'Active': return 'green'
      case 'Draft': return 'blue'
      case 'Archived': return 'gray'
    }
  }

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-64 max-w-full">
        <Input
          placeholder="Search catalog..."
          aria-label="Search catalog items"
        />
      </div>
      <Button variant="accent">➕ Add Item</Button>
    </div>
  )

  return (
    <ManagerEditorLayout title="Catalog" toolbar={toolbar}>
      <p className="text-[var(--color-text-secondary)] mb-6">Search and manage your product catalog.</p>

      <Table headers={['SKU', 'Title', 'Category', 'Status', '']}>
        {mockCatalogItems.map((item) => (
          <tr key={item.sku} className="hover:bg-[var(--color-bg-stage)]/80 group">
            <td className="px-6 py-3 whitespace-nowrap text-sm font-mono text-[var(--color-brand-primary)]">{item.sku}</td>
            <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-[var(--color-text-primary)]">{item.title}</td>
            <td className="px-6 py-3 whitespace-nowrap text-sm text-[var(--color-text-secondary)]">{item.category}</td>
            <td className="px-6 py-3 whitespace-nowrap text-sm">
              <Tag color={getStatusColor(item.status)}>{item.status}</Tag>
            </td>
            <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
              <a href="#" className="text-[var(--color-brand-primary)] hover:text-opacity-80 opacity-0 group-hover:opacity-100 transition-opacity">
                View Media
              </a>
            </td>
          </tr>
        ))}
      </Table>
      <div className="mt-4 text-center text-[var(--color-text-secondary)] text-sm">
        <p>Pagination will be implemented here. Row clicks will navigate to the media detail view.</p>
      </div>
    </ManagerEditorLayout>
  )
}

export default CatalogPage
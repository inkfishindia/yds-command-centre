
import React from 'react'

interface TableProps {
  headers?: string[]
  data?: any[]
  columns?: { header: string; accessor: string | ((row: any) => React.ReactNode) }[]
  children?: React.ReactNode
  onRowClick?: (row: any) => void
}

const Table: React.FC<TableProps> = ({ headers, data, columns, children, onRowClick }) => {
  const resolvedHeaders = headers || columns?.map(c => c.header) || []

  return (
    <div className="overflow-x-auto bg-[var(--color-bg-surface)] border border-[var(--color-border-primary)] rounded-[var(--radius-component)]" style={{ boxShadow: 'var(--shadow-elevation)' }}>
      <table className="min-w-full divide-y divide-[var(--color-border-primary)]">
        <thead className="bg-[var(--color-bg-stage)]/50">
          <tr>
            {resolvedHeaders.map((header) => (
              <th
                key={header}
                scope="col"
                className="px-3 py-2 text-left text-[9px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border-primary)] text-[var(--color-text-primary)]">
          {data && columns ? (
            data.map((row, rowIndex) => (
              <tr 
                key={rowIndex} 
                className={onRowClick ? "cursor-pointer hover:bg-[var(--color-bg-stage)]/50 transition-colors" : ""}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className="px-3 py-2 text-xs">
                    {typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  )
}

export default Table

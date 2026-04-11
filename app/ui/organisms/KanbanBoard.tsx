
import React from 'react'
import Card from '../molecules/Card'
import { MoreHorizontal, Plus } from 'lucide-react'

export interface KanbanItem {
  id: string
  title: string
  subtitle?: string
  tags?: { label: string; color?: string }[]
  assignee?: { name: string; avatar?: string }
  priority?: 'low' | 'medium' | 'high'
}

export interface KanbanColumn {
  id: string
  title: string
  items: KanbanItem[]
}

interface KanbanBoardProps {
  columns: KanbanColumn[]
  onItemClick?: (item: KanbanItem) => void
  onAddItem?: (columnId: string) => void
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ columns, onItemClick, onAddItem }) => {
  return (
    <div className="flex gap-6 overflow-x-auto pb-6 h-full min-h-[600px] custom-scrollbar">
      {columns.map((column) => (
        <div key={column.id} className="flex-none w-80 flex flex-col">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--color-text-primary)]">
                {column.title}
              </h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[var(--color-bg-stage)] rounded border border-[var(--color-border-primary)]">
                {column.items.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => onAddItem?.(column.id)}
                className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-brand-primary)] transition-colors"
              >
                <Plus size={16} />
              </button>
              <button className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-brand-primary)] transition-colors">
                <MoreHorizontal size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-3 p-2 bg-[var(--color-bg-stage)]/30 rounded-xl border border-[var(--color-border-primary)]/50 overflow-y-auto custom-scrollbar">
            {column.items.map((item) => (
              <div
                key={item.id}
                onClick={() => onItemClick?.(item)}
                className="bg-[var(--color-bg-surface)] p-4 rounded-lg border border-[var(--color-border-primary)] shadow-sm hover:shadow-md hover:border-[var(--color-brand-primary)] transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-sm font-black uppercase tracking-tight text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-primary)] transition-colors">
                    {item.title}
                  </h4>
                </div>
                
                {item.subtitle && (
                  <p className="text-xs text-[var(--color-text-secondary)] mb-3 line-clamp-2">
                    {item.subtitle}
                  </p>
                )}

                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {item.tags?.map((tag, i) => (
                    <span 
                      key={i} 
                      className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm border border-black/5"
                      style={{ backgroundColor: tag.color || 'var(--color-bg-stage)', color: 'var(--color-text-secondary)' }}
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>

                {(item.assignee || item.priority) && (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--color-border-primary)]/30">
                    {item.assignee ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-[var(--color-bg-stage)] flex items-center justify-center text-[10px] font-bold">
                          {item.assignee.name[0]}
                        </div>
                        <span className="text-[10px] font-bold text-[var(--color-text-secondary)]">
                          {item.assignee.name}
                        </span>
                      </div>
                    ) : <div />}
                    
                    {item.priority && (
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                        item.priority === 'high' ? 'bg-red-100 text-red-600' : 
                        item.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' : 
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {item.priority}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
            {column.items.length === 0 && (
              <div className="flex-1 flex items-center justify-center p-8 border-2 border-dashed border-[var(--color-border-primary)] rounded-lg">
                <p className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">
                  Drop items here
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default KanbanBoard

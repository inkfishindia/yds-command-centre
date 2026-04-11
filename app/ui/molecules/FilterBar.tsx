
import React from 'react'
import Input from '../atoms/Input'
import Select from './Select'
import { Search, Filter } from 'lucide-react'

interface FilterOption {
  label: string
  value: string
}

interface FilterBarProps {
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  filters?: {
    label: string
    value: string
    options: FilterOption[]
    onChange: (value: string) => void
  }[]
  className?: string
}

const FilterBar: React.FC<FilterBarProps> = ({
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  filters = [],
  className = ''
}) => {
  return (
    <div className={`flex flex-wrap items-center gap-4 p-2 bg-[var(--color-bg-surface)] border border-[var(--color-border-primary)] rounded-xl ${className}`}>
      <div className="relative flex-1 min-w-[200px]">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">
          <Search size={14} />
        </div>
        <Input
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="pl-9 bg-[var(--color-bg-stage)] border-transparent focus:border-[var(--color-brand-primary)]"
        />
      </div>

      <div className="flex items-center gap-2">
        {filters.map((filter, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)] whitespace-nowrap">
              {filter.label}
            </span>
            <Select
              options={filter.options}
              value={filter.value}
              onChange={filter.onChange}
              className="min-w-[120px]"
            />
          </div>
        ))}
        {filters.length > 0 && (
          <div className="w-px h-6 bg-[var(--color-border-primary)] mx-2" />
        )}
        <button className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-brand-primary)] transition-colors">
          <Filter size={16} />
        </button>
      </div>
    </div>
  )
}

export default FilterBar

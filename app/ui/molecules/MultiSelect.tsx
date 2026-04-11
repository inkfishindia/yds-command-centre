import React, { useState, useRef, useEffect } from 'react'
import { Checkbox } from '../index'

interface Option {
  value: string
  label: string
}

interface MultiSelectProps {
  label?: string
  id?: string
  className?: string
  options: Option[]
  value: string[] // Array of selected values
  onChange: (value: string[]) => void
  placeholder?: string
}

const MultiSelect: React.FC<MultiSelectProps> = ({ label, id, className, options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const handleToggle = () => setIsOpen(!isOpen)

  const handleOptionChange = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue]
    onChange(newValue)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedLabel = value.length > 0
    ? `${value.length} selected`
    : placeholder || 'Select...'

  return (
    <div className={className} ref={wrapperRef}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          id={id}
          onClick={handleToggle}
          className="w-full bg-[var(--color-bg-surface)] border border-[var(--color-border-primary)] rounded-[var(--radius-component)] py-2 px-3 text-left text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="block truncate">{selectedLabel}</span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-[var(--color-bg-surface)] shadow-lg border border-[var(--color-border-primary)] rounded-md max-h-60 overflow-auto">
            <ul tabIndex={-1} role="listbox" className="py-1">
              {options.map(option => (
                <li key={option.value} className="px-3 py-2 cursor-pointer hover:bg-[var(--color-bg-stage)]">
                  <Checkbox
                    label={option.label}
                    checked={value.includes(option.value)}
                    onChange={() => handleOptionChange(option.value)}
                  />
                </li>
              ))}
              {options.length === 0 && <li className="px-3 py-2 text-sm text-[var(--color-text-secondary)]">No options available</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default MultiSelect
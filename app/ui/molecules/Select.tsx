import React from 'react'

interface Option {
  value: string
  label: string
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string
  id?: string
  className?: string
  options: Option[]
  value?: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
}

const Select: React.FC<SelectProps> = ({ label, id, className, options, value, onChange, error, placeholder, ...props }) => {
  const selectId = id || props.name
  const hasError = !!error

  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          {label}{props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        id={selectId}
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full bg-[var(--color-bg-surface)] border rounded-[var(--radius-component)] py-2 px-3 text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] focus:border-[var(--color-brand-primary)] transition appearance-none
          ${hasError ? 'border-red-500 focus:ring-red-500' : 'border-[var(--color-border-primary)]'}
        `}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 0.5rem center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '1.5em 1.5em',
          paddingRight: '2.5rem',
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {hasError && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export default Select

import React, { useId } from 'react'

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
}

const Checkbox: React.FC<CheckboxProps> = ({ checked, onChange, label, ...props }) => {
  const id = useId()
  return (
    <div className="flex items-center">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        {...props}
        className="h-4 w-4 rounded border-[var(--color-border-primary)] text-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]"
      />
      {label && (
        <label htmlFor={id} className="ml-2 block text-sm text-[var(--color-text-primary)]">
          {label}
        </label>
      )}
    </div>
  )
}

export default Checkbox

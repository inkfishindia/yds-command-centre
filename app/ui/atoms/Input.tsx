import React, { ReactNode } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  id?: string
  className?: string
  error?: string
  helperText?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  'aria-label'?: string
}

const Input: React.FC<InputProps> = ({ label, id, className, error, helperText, leftIcon, rightIcon, 'aria-label': ariaLabel, ...props }) => {
  const inputId = id || props.name
  const hasError = !!error

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          {label}{props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">{leftIcon}</div>}
        <input
          id={inputId}
          {...props}
          aria-label={ariaLabel}
          className={`
            w-full bg-[var(--color-bg-surface)] border rounded-[var(--radius-component)] py-2 text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] focus:border-[var(--color-brand-primary)] transition
            ${hasError ? 'border-red-500 focus:ring-red-500' : 'border-[var(--color-border-primary)]'}
            ${leftIcon ? 'pl-10' : 'px-3'}
            ${rightIcon ? 'pr-10' : ''}
          `}
        />
        {rightIcon && <div className="absolute inset-y-0 right-0 pr-3 flex items-center">{rightIcon}</div>}
      </div>
      {helperText && !hasError && <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{helperText}</p>}
      {hasError && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export default Input

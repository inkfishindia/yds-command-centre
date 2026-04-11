import React from 'react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  id?: string
  className?: string
}

const Textarea: React.FC<TextareaProps> = ({ label, id, className, error, helperText, ...props }) => {
  const textareaId = id || props.name
  const hasError = !!error

  return (
    <div className={className}>
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          {label}{props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        {...props}
        className={`
          w-full bg-[var(--color-bg-surface)] border rounded-[var(--radius-component)] py-2 px-3 text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] focus:border-[var(--color-brand-primary)] transition
          ${hasError ? 'border-red-500 focus:ring-red-500' : 'border-[var(--color-border-primary)]'}
        `}
      />
      {helperText && !hasError && <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{helperText}</p>}
      {hasError && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export default Textarea

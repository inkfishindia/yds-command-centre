import React, { useId } from 'react'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
}

const Switch: React.FC<SwitchProps> = ({ checked, onChange, label }) => {
  const id = useId()
  return (
    <div className="flex items-center">
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
                    relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] focus:ring-offset-2
                    ${checked ? 'bg-[var(--color-brand-primary)]' : 'bg-[var(--color-border-primary)]'}
                `}
      >
        <span
          aria-hidden="true"
          className={`
                        pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                        ${checked ? 'translate-x-5' : 'translate-x-0'}
                    `}
        />
      </button>
      {label && (
        <label htmlFor={id} className="ml-3 text-sm font-medium text-[var(--color-text-primary)] cursor-pointer" onClick={() => onChange(!checked)}>
          {label}
        </label>
      )}
    </div>
  )
}

export default Switch

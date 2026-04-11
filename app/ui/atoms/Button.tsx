import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'accent' | 'destructive' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const Button: React.FC<ButtonProps> = ({ children, className, variant = 'primary', size = 'md', ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-[var(--radius-component)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--color-bg-surface)] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed'

  const variantClasses = {
    primary: `bg-[var(--color-brand-primary)] text-[var(--color-brand-primary-fg)] hover:bg-opacity-90 focus:ring-[var(--color-brand-primary)]`,
    secondary: `bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border-primary)] hover:bg-[var(--color-border-primary)] hover:text-[var(--color-text-primary)] focus:ring-[var(--color-brand-primary)]`,
    accent: `bg-[var(--color-brand-accent)] text-[var(--color-brand-accent-fg)] hover:bg-opacity-90 focus:ring-[var(--color-brand-accent)]`,
    destructive: `bg-[var(--color-destructive)] text-[var(--color-destructive-fg)] hover:bg-opacity-90 focus:ring-[var(--color-destructive)]`,
    ghost: `bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-stage)] focus:ring-[var(--color-brand-primary)]`,
  }

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`

  return (
    <button className={classes} {...props} style={{ boxShadow: 'var(--shadow-elevation)' }}>
      {children}
    </button>
  )
}

export default Button

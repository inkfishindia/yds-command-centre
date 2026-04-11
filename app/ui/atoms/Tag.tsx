
import React from 'react'

interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
  color?: 'green' | 'blue' | 'gray' | 'red' | 'yellow' | 'destructive' | 'warning' | string
}

const Tag: React.FC<TagProps> = ({ children, color = 'gray', className, style, ...props }) => {
  const colorMap: Record<string, { bg: string; text: string }> = {
    green: { bg: 'var(--color-tag-green-bg)', text: 'var(--color-tag-green-text)' },
    blue: { bg: 'var(--color-tag-blue-bg)', text: 'var(--color-tag-blue-text)' },
    gray: { bg: 'var(--color-tag-gray-bg)', text: 'var(--color-tag-gray-text)' },
    red: { bg: 'var(--color-destructive)', text: 'var(--color-destructive-fg)' },
    destructive: { bg: 'var(--color-destructive)', text: 'var(--color-destructive-fg)' },
    yellow: { bg: 'var(--color-brand-accent)', text: 'var(--color-brand-accent-fg)' },
    warning: { bg: 'var(--color-note-orange-bg)', text: 'var(--color-note-orange-text)' },
  }

  const selectedColor = colorMap[color] || colorMap['gray']

  return (
    <span
      className={`px-1.5 py-0.5 inline-flex text-[9px] leading-none font-black uppercase tracking-tight rounded border border-black/5 ${className || ''}`}
      style={{
        backgroundColor: selectedColor.bg,
        color: selectedColor.text,
        ...style
      }}
      {...props}
    >
      {children}
    </span>
  )
}

export default Tag

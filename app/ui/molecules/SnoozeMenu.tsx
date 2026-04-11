
import React, { useState, useRef, useEffect } from 'react'
import { Clock } from 'lucide-react'
import Button from '../atoms/Button'

interface SnoozeMenuProps {
  onSnooze: (duration: string) => void
  label?: string
}

const SnoozeMenu: React.FC<SnoozeMenuProps> = ({ onSnooze, label = 'Snooze' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const options = [
    { label: '1 Hour', value: '1h' },
    { label: 'Tomorrow', value: 'tomorrow' },
    { label: 'Next Week', value: 'next-week' },
    { label: 'Custom...', value: 'custom' },
  ]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative inline-block" ref={menuRef}>
      <Button 
        variant="secondary" 
        size="sm" 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5"
      >
        <Clock size={12} />
        <span>{label}</span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-40 bg-[var(--color-bg-surface)] border border-[var(--color-border-primary)] rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option.value}
                className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-[var(--color-bg-stage)] text-[var(--color-text-primary)] transition-colors"
                onClick={() => {
                  onSnooze(option.value)
                  setIsOpen(false)
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default SnoozeMenu

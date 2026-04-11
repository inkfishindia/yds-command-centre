import React, { ReactNode, useEffect, useRef } from 'react'

interface DrawerProps {
  open: boolean
  title?: ReactNode
  onClose: () => void
  side?: 'left' | 'right'
  width?: number | string
  children: ReactNode
  disableOverlay?: boolean // New prop to optionally disable the overlay
  className?: string // Added className prop
}

const Drawer: React.FC<DrawerProps> = ({ open, title, onClose, side = 'right', width = 384, children, disableOverlay = false, className }) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose()
        }
      }
      document.addEventListener('keydown', handleKeyDown)
      // Focus the drawer when it opens for accessibility
      setTimeout(() => {
        if (drawerRef.current) {
          drawerRef.current.focus();
        }
      }, 100);
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [open, onClose])

  const sideClasses = side === 'right' ? 'right-0' : 'left-0'
  const transformClass = open ? 'translate-x-0' : (side === 'right' ? 'translate-x-full' : '-translate-x-full')

  return (
    <>
      {!disableOverlay && open && (
        <div
          className="fixed inset-0 bg-black/60 z-30" // Lower z-index than the drawer itself
          onClick={onClose}
          aria-hidden="true"
        ></div>
      )}
      <div
        ref={drawerRef}
        className={`fixed top-0 ${sideClasses} h-full bg-[var(--color-bg-surface)] z-40 transition-transform transform duration-300 ease-in-out flex flex-col ${transformClass} ${className}`}
        style={{ width: typeof width === 'number' ? `${width}px` : width, boxShadow: 'var(--shadow-elevation)' }}
        role="dialog"
        aria-modal="true" // Changed to true as it now acts as a modal overlay
        aria-hidden={!open}
        tabIndex={-1} // Make the drawer focusable
      >
        {title && (
          <div className="flex justify-between items-center p-4 border-b border-[var(--color-border-primary)] shrink-0">
            <div className="text-lg font-bold text-[var(--color-text-primary)]">{title}</div>
            <button
              onClick={onClose}
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-2xl"
              aria-label="Close drawer"
            >
              &times;
            </button>
          </div>
        )}
        <div className="p-6 flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  )
}

export default Drawer
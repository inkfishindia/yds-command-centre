import React, { useEffect, useRef, useId, ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, footer, className }) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (open) {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose()
          return
        }

        if (event.key === 'Tab') {
          const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
          if (!focusableElements || focusableElements.length === 0) return

          const firstElement = focusableElements[0]
          const lastElement = focusableElements[focusableElements.length - 1]

          if (event.shiftKey) { // Shift + Tab
            if (document.activeElement === firstElement) {
              lastElement.focus()
              event.preventDefault()
            }
          } else { // Tab
            if (document.activeElement === lastElement) {
              firstElement.focus()
              event.preventDefault()
            }
          }
        }
      }

      document.addEventListener('keydown', handleKeyDown)

      const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )

      setTimeout(() => {
        if (firstFocusable) {
          firstFocusable.focus()
        } else if (modalRef.current) {
          modalRef.current.focus()
        }
      }, 100)


      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [open, onClose])


  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={`bg-[var(--color-bg-surface)] rounded-[var(--radius-component)] w-full max-w-lg border border-[var(--color-border-primary)] flex flex-col max-h-[90vh] ${className}`}
        style={{ boxShadow: 'var(--shadow-elevation)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="flex justify-between items-center p-4 border-b border-[var(--color-border-primary)] shrink-0">
          <h2 id={titleId} className="text-lg font-bold text-[var(--color-text-primary)]">{title}</h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors text-2xl flex items-center justify-center w-8 h-8 rounded-full hover:bg-[var(--color-border-primary)]"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto">
          {children}
        </div>
        {footer && (
          <div className="p-4 border-t border-[var(--color-border-primary)] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default Modal

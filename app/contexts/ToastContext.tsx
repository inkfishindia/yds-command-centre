import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react'

export interface ToastMessage {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextType {
  addToast: (message: string, type: ToastMessage['type']) => void
  toasts: ToastMessage[]
  removeToast: (id: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const removeToast = useCallback((id: number) => {
    setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id))
  }, [])

  const addToast = useCallback((message: string, type: ToastMessage['type']) => {
    const id = Date.now()
    setToasts(currentToasts => [...currentToasts, { id, message, type }])
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export const useToast = (): { addToast: (message: string, type: ToastMessage['type']) => void } => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return { addToast: context.addToast }
}

export const useToastContext = (): ToastContextType => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider')
  }
  return context
}

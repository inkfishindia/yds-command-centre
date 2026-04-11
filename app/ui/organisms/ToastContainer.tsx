import React from 'react'
import { useToastContext } from '../../contexts/ToastContext'
import Toast from './Toast'

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastContext()

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-full max-w-sm">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}

export default ToastContainer

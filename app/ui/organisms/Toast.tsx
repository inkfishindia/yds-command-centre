import React, { useEffect, useState } from 'react'
import { ToastMessage } from '../../contexts/ToastContext'

interface ToastProps {
  toast: ToastMessage
  onRemove: (id: number) => void
  duration?: number
}

const Toast: React.FC<ToastProps> = ({ toast, onRemove, duration = 5000 }) => {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(() => onRemove(toast.id), 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [toast.id, duration, onRemove])

  const handleRemove = () => {
    setExiting(true)
    setTimeout(() => onRemove(toast.id), 300)
  }

  const typeClasses = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  }

  const emoji = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
  }

  return (
    <div
      className={`relative w-full max-w-sm rounded-md shadow-lg text-white p-4 mb-4 flex items-start transition-all duration-300 ease-in-out transform ${exiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'} ${typeClasses[toast.type]}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="text-xl mr-3">{emoji[toast.type]}</div>
      <div className="flex-grow text-sm">{toast.message}</div>
      <button
        onClick={handleRemove}
        className="ml-4 text-xl leading-none"
        aria-label="Close notification"
      >
        &times;
      </button>
    </div>
  )
}

export default Toast

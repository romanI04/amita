'use client'

import React, { useEffect, useState } from 'react'
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  message: string
  type?: ToastType
  duration?: number
  onClose?: () => void
  action?: {
    label: string
    onClick: () => void
  }
}

export function Toast({ message, type = 'info', duration = 5000, onClose, action }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => onClose?.(), 300) // Wait for animation
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  if (!isVisible) return null

  const icons = {
    success: <CheckCircleIcon className="h-5 w-5 text-primary-600" />,
    error: <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />,
    warning: <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />,
    info: <InformationCircleIcon className="h-5 w-5 text-blue-600" />
  }

  const backgrounds = {
    success: 'bg-primary-50 border-primary-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200'
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${isVisible ? 'animate-slide-up' : 'animate-slide-down'}`}>
      <div className={`flex items-start space-x-3 rounded-lg border p-4 shadow-lg ${backgrounds[type]} max-w-md`}>
        <div className="flex-shrink-0">{icons[type]}</div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{message}</p>
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              {action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(() => onClose?.(), 300)
          }}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

// Toast context for global toast management
interface ToastContextValue {
  showToast: (message: string, type?: ToastType, action?: { label: string; onClick: () => void }) => void
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Array<{
    id: string
    message: string
    type: ToastType
    action?: { label: string; onClick: () => void }
  }>>([])

  const showToast = (message: string, type: ToastType = 'info', action?: { label: string; onClick: () => void }) => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type, action }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            action={toast.action}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
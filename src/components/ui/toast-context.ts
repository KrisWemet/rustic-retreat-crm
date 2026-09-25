import { createContext, useContext } from 'react'

export type Toast = { id: string; message: string }
export type ToastContextType = {
  toasts: Toast[]
  show: (message: string, duration?: number) => void
  remove: (id: string) => void
}

export const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

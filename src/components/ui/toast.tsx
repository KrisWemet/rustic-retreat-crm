import React, { useCallback, useMemo, useState } from 'react'
import { ToastContext, type Toast } from './toast-context'

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback((message: string, duration = 2500) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message }])
    if (duration > 0) {
      setTimeout(() => remove(id), duration)
    }
  }, [remove])

  const value = useMemo(() => ({ toasts, show, remove }), [toasts, show, remove])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className="rounded-full border border-[var(--brand-accent)] bg-[var(--brand-terracotta)] px-4 py-2 text-sm text-white shadow-soft">
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

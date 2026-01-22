import React, { useEffect, useRef } from 'react'

export function Dropdown({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`relative inline-block ${className}`}>{children}</div>
}

export function DropdownTrigger({ children, onToggle }: { children: React.ReactNode; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="inline-flex items-center rounded-full p-1.5 text-[var(--brand-text)]/70 transition-colors hover:bg-[var(--brand-accent)]/20 hover:text-[var(--brand-text)]">
      {children}
    </button>
  )
}

export function DropdownContent({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, onClose])
  if (!open) return null
  return (
    <div ref={ref} className="absolute right-0 z-10 mt-2 w-44 rounded-md border border-[var(--brand-accent)] bg-white py-1 shadow-soft">
      {children}
    </div>
  )
}

export function DropdownItem({ children, onClick, tone = 'default' }: { children: React.ReactNode; onClick?: () => void; tone?: 'default' | 'danger' }) {
  const className =
    tone === 'danger'
      ? 'block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50'
      : 'block w-full px-3 py-2 text-left text-sm text-[var(--brand-text)] hover:bg-[var(--brand-cream)]'
  return (
    <button className={className} onClick={onClick}>
      {children}
    </button>
  )
}


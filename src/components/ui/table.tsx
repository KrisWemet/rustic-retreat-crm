import * as React from 'react'

export function Table({ className = '', ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={`min-w-full divide-y divide-[var(--brand-accent)]/60 ${className}`}
      {...props}
    />
  )
}

export function THead({ className = '', ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={`bg-[var(--brand-cream)]/60 ${className}`} {...props} />
  )
}

export function TBody({ className = '', ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={`divide-y divide-[var(--brand-accent)]/40 bg-white ${className}`} {...props} />
  )
}

export function TR({ className = '', ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={`hover:bg-[var(--brand-cream)]/60 transition-colors duration-200 ${className}`} {...props} />
}

export function TH({ className = '', ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`px-6 py-4 text-left text-sm font-medium tracking-wide text-[var(--brand-charcoal)]/80 ${className}`}
      {...props}
    />
  )
}

export function TD({ className = '', ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`px-6 py-4 text-sm text-[var(--brand-text)] ${className}`} {...props} />
}


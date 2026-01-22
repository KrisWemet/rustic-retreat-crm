import React from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type Size = 'sm' | 'md'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

const stylesByVariant: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-[var(--brand-terracotta)] to-[#c99080] text-white shadow-sm hover:shadow-md hover:from-[#e0b3a8] hover:to-[var(--brand-terracotta)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-terracotta)]',
  secondary:
    'bg-white text-[var(--brand-text)] border border-[var(--brand-accent)] hover:bg-[var(--brand-cream)]',
  ghost:
    'bg-transparent text-[var(--brand-text)] hover:bg-[var(--brand-cream)]',
  destructive:
    'bg-red-600 text-white hover:bg-red-700',
}

const stylesBySize: Record<Size, string> = {
  sm: 'px-4 py-1.5 text-sm rounded-full',
  md: 'px-5 py-2.5 text-sm rounded-full',
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`${stylesByVariant[variant]} ${stylesBySize[size]} ${className}`}
      {...props}
    />
  )
}

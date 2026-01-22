import React from 'react'

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'gray'
}

const map: Record<NonNullable<Props['color']>, string> = {
  blue: 'bg-blue-50 text-blue-700 border border-blue-200',
  green: 'bg-green-50 text-green-700 border border-green-200',
  amber: 'bg-amber-50 text-amber-700 border border-amber-200',
  purple: 'bg-purple-50 text-purple-700 border border-purple-200',
  gray: 'bg-gray-50 text-gray-700 border border-gray-200',
}

export function Badge({ color = 'gray', className = '', ...props }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[color]} ${className}`}
      {...props}
    />
  )
}

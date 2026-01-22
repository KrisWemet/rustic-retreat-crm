import * as React from 'react'

export function Card({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-[12px] border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:shadow-md ${className}`}
      {...props}
    />
  )
}

export function CardHeader({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-4 py-3 ${className}`} {...props} />
}

export function CardContent({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-4 py-3 ${className}`} {...props} />
}

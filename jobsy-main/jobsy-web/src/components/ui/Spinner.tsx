import React from 'react'

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-3',
}

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
  className?: string
}

export default function Spinner({ size = 'md', color = 'border-primary', className = '' }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-solid border-t-transparent ${color} ${sizeMap[size]} ${className}`}
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

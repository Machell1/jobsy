import React from 'react'

const sizeStyles: Record<string, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
}

interface AvatarProps {
  src?: string | null
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default function Avatar({ src, name = '', size = 'md', className = '' }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false)

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name || 'User avatar'}
        onError={() => setImgError(true)}
        className={`rounded-full object-cover shrink-0 ${sizeStyles[size]} ${className}`}
      />
    )
  }

  return (
    <div
      aria-label={name || 'User avatar'}
      className={`rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center shrink-0 ${sizeStyles[size]} ${className}`}
    >
      {name ? getInitials(name) : '?'}
    </div>
  )
}

import React from 'react'
import { LucideIcon } from 'lucide-react'
import Spinner from './Spinner'

const variantStyles: Record<string, string> = {
  primary:
    'bg-primary text-white hover:bg-green-700 focus:ring-primary/40',
  secondary:
    'bg-gold text-primary-dark hover:bg-gold-dark focus:ring-gold/40 font-semibold',
  outline:
    'border-2 border-primary text-primary hover:bg-primary hover:text-white focus:ring-primary/40',
  ghost:
    'text-gray-700 hover:bg-gray-100 focus:ring-gray-300',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-400',
}

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-md gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-lg gap-2',
  lg: 'px-7 py-3 text-base rounded-lg gap-2.5',
}

const iconSizes: Record<string, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: LucideIcon
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon: Icon,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className={`inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...rest}
    >
      {loading && <Spinner size="sm" color="border-current" />}
      {!loading && Icon && <Icon className={iconSizes[size]} />}
      {children}
    </button>
  )
}

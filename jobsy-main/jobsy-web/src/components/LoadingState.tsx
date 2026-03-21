import React from 'react'
import Spinner from './ui/Spinner'

interface LoadingStateProps {
  fullPage?: boolean
  message?: string
  variant?: 'spinner' | 'skeleton'
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

export default function LoadingState({
  fullPage = false,
  message = 'Loading...',
  variant = 'spinner',
}: LoadingStateProps) {
  if (variant === 'spinner' || fullPage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spinner size="lg" />
        {message && <p className="text-gray-500 text-sm">{message}</p>}
      </div>
    )
  }

  // Skeleton variant
  return (
    <div className="w-full space-y-4 py-6">
      {message && (
        <div className="flex items-center gap-3 mb-6">
          <Spinner size="md" />
          <p className="text-gray-500 text-sm">{message}</p>
        </div>
      )}
      <SkeletonBlock className="h-6 w-3/4" />
      <SkeletonBlock className="h-4 w-full" />
      <SkeletonBlock className="h-4 w-5/6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <SkeletonBlock className="h-32" />
        <SkeletonBlock className="h-32" />
        <SkeletonBlock className="h-32" />
      </div>
    </div>
  )
}

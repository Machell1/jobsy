import React from 'react'

type SkeletonVariant = 'text' | 'card' | 'avatar' | 'paragraph'

interface SkeletonProps {
  variant?: SkeletonVariant
  width?: string | number
  height?: string | number
  count?: number
  className?: string
}

const baseClass = 'animate-pulse bg-gray-200 rounded'

function singleSkeleton(
  variant: SkeletonVariant,
  width?: string | number,
  height?: string | number,
  className?: string,
  key?: number
) {
  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  switch (variant) {
    case 'avatar':
      return (
        <div
          key={key}
          className={`${baseClass} rounded-full ${className ?? ''}`}
          style={{ width: style.width || '40px', height: style.height || '40px' }}
        />
      )
    case 'card':
      return (
        <div
          key={key}
          className={`${baseClass} rounded-lg ${className ?? ''}`}
          style={{ width: style.width || '100%', height: style.height || '160px' }}
        />
      )
    case 'paragraph':
      return (
        <div key={key} className={`space-y-2 ${className ?? ''}`} style={{ width: style.width || '100%' }}>
          <div className={baseClass} style={{ height: '14px', width: '100%' }} />
          <div className={baseClass} style={{ height: '14px', width: '90%' }} />
          <div className={baseClass} style={{ height: '14px', width: '75%' }} />
        </div>
      )
    case 'text':
    default:
      return (
        <div
          key={key}
          className={`${baseClass} ${className ?? ''}`}
          style={{ width: style.width || '100%', height: style.height || '14px' }}
        />
      )
  }
}

export default function Skeleton({
  variant = 'text',
  width,
  height,
  count = 1,
  className,
}: SkeletonProps) {
  if (count <= 1) {
    return singleSkeleton(variant, width, height, className)
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) =>
        singleSkeleton(variant, width, height, className, i)
      )}
    </div>
  )
}

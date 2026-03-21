import React from 'react'
import { Link } from 'react-router-dom'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  separator?: string
  className?: string
}

export default function Breadcrumbs({
  items,
  separator = '>',
  className,
}: BreadcrumbsProps) {
  if (!items.length) return null

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-sm text-gray-500 ${className ?? ''}`}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <span className="mx-2 text-gray-400 select-none" aria-hidden="true">
                {separator}
              </span>
            )}
            {isLast || !item.href ? (
              <span
                className={isLast ? 'font-semibold text-gray-900' : ''}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                className="hover:text-gray-700 hover:underline transition"
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

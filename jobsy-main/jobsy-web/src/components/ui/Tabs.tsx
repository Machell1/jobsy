import React from 'react'
import { LucideIcon } from 'lucide-react'

interface Tab {
  key: string
  label: string
  /** Optional value kept for backwards compatibility; defaults to key */
  value?: string
  icon?: LucideIcon
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (value: string) => void
  className?: string
}

export default function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps) {
  return (
    <div className={`border-b border-gray-200 ${className}`} role="tablist">
      <nav className="flex gap-0 -mb-px">
        {tabs.map(tab => {
          const tabValue = tab.value ?? tab.key
          const isActive = activeTab === tabValue
          return (
            <button
              key={tabValue}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tabValue)}
              className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon && <tab.icon className="h-4 w-4" />}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    isActive ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

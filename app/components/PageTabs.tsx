'use client'

import React from 'react'

interface PageTab {
  id: string
  label: string
}

interface PageTabsProps {
  tabs: PageTab[]
  activeId: string
  onChange: (id: string) => void
}

export default function PageTabs({ tabs, activeId, onChange }: PageTabsProps) {
  return (
    <div className="flex">
      {tabs.map((tab) => {
        const isActive = tab.id === activeId
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
              isActive
                ? 'text-blue-600 dark:text-gray-300'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
            {isActive && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-0.5 bg-blue-600 dark:bg-gray-400 rounded-t-full" />
            )}
          </button>
        )
      })}
    </div>
  )
}


'use client'

import { useEffect, useState } from 'react'

const SIDEBAR_STATE_KEY = 'sidebar_expanded'

export function useSidebar() {
  const [isExpanded, setIsExpanded] = useState(true)

  useEffect(() => {
    // Load initial state
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem(SIDEBAR_STATE_KEY)
      if (savedState !== null) {
        setIsExpanded(savedState === 'true')
      }
    }

    // Listen for sidebar toggle events
    const handleToggle = (e: CustomEvent<{ expanded: boolean }>) => {
      setIsExpanded(e.detail.expanded)
    }

    window.addEventListener('sidebarToggle', handleToggle as EventListener)

    return () => {
      window.removeEventListener('sidebarToggle', handleToggle as EventListener)
    }
  }, [])

  return { isExpanded }
}

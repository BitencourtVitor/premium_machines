'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { PiGasCanBold } from 'react-icons/pi'

interface UserPermissions {
  can_view_dashboard: boolean
  can_view_map: boolean
  can_manage_sites: boolean
  can_manage_machines: boolean
  can_register_events: boolean
  can_approve_events: boolean
  can_view_financial: boolean
  can_manage_suppliers: boolean
  can_manage_users: boolean
  can_view_logs: boolean
  role?: string
}

const SIDEBAR_STATE_KEY = 'sidebar_expanded'

export default function Sidebar() {
  const pathname = usePathname()
  const [user, setUser] = useState<UserPermissions | null>(null)
  const [isDark, setIsDark] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem(SIDEBAR_STATE_KEY)
      if (savedState !== null) {
        setIsExpanded(savedState === 'true')
      }
    }
  }, [])

  const toggleSidebar = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    if (typeof window !== 'undefined') {
      localStorage.setItem(SIDEBAR_STATE_KEY, newState.toString())
      window.dispatchEvent(new CustomEvent('sidebarToggle', { detail: { expanded: newState } }))
    }
  }

  useEffect(() => {
    const { getSessionUser } = require('@/lib/session')
    const sessionUser = getSessionUser()
    if (sessionUser) {
      try {
        setUser({
          can_view_dashboard: sessionUser.can_view_dashboard || false,
          can_view_map: sessionUser.can_view_map || false,
          can_manage_sites: sessionUser.can_manage_sites || false,
          can_manage_machines: sessionUser.can_manage_machines || false,
          can_register_events: sessionUser.can_register_events || false,
          can_approve_events: sessionUser.can_approve_events || false,
          can_view_financial: sessionUser.can_view_financial || false,
          can_manage_suppliers: sessionUser.can_manage_suppliers || false,
          can_manage_users: sessionUser.can_manage_users || false,
          can_view_logs: sessionUser.can_view_logs || false,
          role: sessionUser.role || '',
        })
      } catch (error) {
        // Silently handle error
      }
    }
  }, [])

  useEffect(() => {
    const checkDarkMode = () => {
      if (typeof window !== 'undefined') {
        const isDarkMode = document.documentElement.classList.contains('dark') ||
          localStorage.theme === 'dark' ||
          (!localStorage.theme && window.matchMedia('(prefers-color-scheme: dark)').matches)
        setIsDark(isDarkMode)
      }
    }

    checkDarkMode()

    const observer = new MutationObserver(checkDarkMode)
    if (typeof document !== 'undefined') {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      })
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', checkDarkMode)

    const storageListener = () => checkDarkMode()
    window.addEventListener('storage', storageListener)

    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener('change', checkDarkMode)
      window.removeEventListener('storage', storageListener)
    }
  }, [])

  const allNavItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      requiredPermission: 'can_view_dashboard' as keyof UserPermissions,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: '/map',
      label: 'Map',
      requiredPermission: 'can_view_map' as keyof UserPermissions,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
    {
      href: '/sites',
      label: 'Jobsites',
      requiredPermission: 'can_manage_sites' as keyof UserPermissions,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      href: '/machines',
      label: 'Machines',
      requiredPermission: 'can_manage_machines' as keyof UserPermissions,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      href: '/refueling',
      label: 'Refueling',
      requiredPermission: 'can_register_events' as keyof UserPermissions,
      icon: <PiGasCanBold className="w-5 h-5" aria-label="Refueling" />,
    },
    {
      href: '/events',
      label: 'Events',
      requiredPermission: 'can_register_events' as keyof UserPermissions,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      href: '/reports',
      label: 'Reports',
      requiredPermission: 'can_view_financial' as keyof UserPermissions,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      href: '/usuarios',
      label: 'People',
      requiredPermission: 'can_manage_users' as keyof UserPermissions,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      href: '/logs',
      label: 'Logs',
      requiredPermission: 'can_view_logs' as keyof UserPermissions,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ]

  const navItems = allNavItems.filter((item) => {
    if (!user) return false

    // Admin and dev can see everything
    if (user.role === 'admin' || user.role === 'dev') return true

    if (item.requiredPermission) {
      return user[item.requiredPermission] === true
    }

    return false
  })

  if (navItems.length === 0) {
    return null
  }

  return (
    <aside className={`hidden md:flex fixed left-0 top-16 bottom-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex-col z-20 transition-all duration-250 ease-in-out ${
      isExpanded ? 'w-48 lg:w-64' : 'w-16 lg:w-20'
    }`}>
      <nav className="flex-1 overflow-y-auto py-4">
        <div className={`space-y-1 ${isExpanded ? 'px-3' : 'px-2'}`}>
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center rounded-lg transition-all duration-250 ease-in-out
                  ${isExpanded ? 'gap-3 px-3 py-2.5' : 'justify-center px-2 py-2.5'}
                  ${isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
                title={!isExpanded ? item.label : undefined}
              >
                {item.icon}
                {isExpanded && <span className="font-medium">{item.label}</span>}
              </Link>
            )
          })}
        </div>
      </nav>
      
      <div className="border-t border-gray-200 dark:border-gray-700 p-3">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-250 ease-in-out"
          title={isExpanded ? 'Collapse menu' : 'Expand menu'}
        >
          {isExpanded ? (
            <svg 
              className="w-5 h-5"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          ) : (
            <svg 
              className="w-5 h-5"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>
    </aside>
  )
}

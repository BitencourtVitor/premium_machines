'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { PiGasCanBold } from 'react-icons/pi'
import { LuForklift } from 'react-icons/lu'
import SettingsModal from '@/app/components/SettingsModal'

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
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

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
      icon: <LuForklift className="w-5 h-5" />,
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
    <>
      <aside className={`hidden md:flex fixed left-0 top-16 bottom-0 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-md border-r border-gray-100 dark:border-gray-800 flex-col z-20 transition-all duration-300 ease-in-out ${
        isExpanded ? 'w-52' : 'w-16'
      }`}>
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="space-y-1.5 px-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center h-12 rounded-xl transition-all duration-300 ease-in-out group overflow-hidden
                    ${isExpanded ? 'w-full' : 'w-12'}
                    ${isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/20'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                    }
                  `}
                  title={!isExpanded ? item.label : undefined}
                >
                  <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                    <div className={`transition-all duration-300 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200'}`}>
                      {item.icon}
                    </div>
                  </div>
                  <span className={`
                    font-medium text-sm truncate transition-all duration-300 ease-in-out
                    ${isExpanded ? 'opacity-100 translate-x-0 w-auto' : 'opacity-0 -translate-x-4 w-0'}
                  `}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </nav>
        
        <div className="py-2 px-2">
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className={`
              flex items-center h-12 rounded-xl transition-all duration-300 ease-in-out text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200 overflow-hidden group
              ${isExpanded ? 'w-full' : 'w-12'}
            `}
            title={!isExpanded ? 'Configurações' : undefined}
          >
            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className={`
              font-medium text-sm truncate transition-all duration-300 ease-in-out
              ${isExpanded ? 'opacity-100 translate-x-0 w-auto' : 'opacity-0 -translate-x-4 w-0'}
            `}>
              Configurações
            </span>
          </button>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 p-2">
          <button
            onClick={toggleSidebar}
            className={`
              flex items-center h-12 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 ease-in-out group overflow-hidden
              ${isExpanded ? 'w-full' : 'w-12'}
            `}
            title={isExpanded ? 'Collapse menu' : 'Expand menu'}
          >
            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
              {isExpanded ? (
                <svg className="w-5 h-5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              )}
            </div>
            <span className={`
              font-medium text-sm truncate transition-all duration-300 ease-in-out
              ${isExpanded ? 'opacity-100 translate-x-0 w-auto' : 'opacity-0 -translate-x-4 w-0'}
            `}>
              {isExpanded ? 'Recolher' : 'Expandir'}
            </span>
          </button>
        </div>
      </aside>

      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
      />
    </>
  )
}

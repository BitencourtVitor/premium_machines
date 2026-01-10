'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

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

export default function BottomNavigation() {
  const pathname = usePathname()
  const [user, setUser] = useState<UserPermissions | null>(null)

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

  const allNavItems = [
    {
      href: '/dashboard',
      label: 'Home',
      requiredPermission: 'can_view_dashboard' as keyof UserPermissions,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: '/map',
      label: 'Mapa',
      requiredPermission: 'can_view_map' as keyof UserPermissions,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
    {
      href: '/machines',
      label: 'Máquinas',
      requiredPermission: 'can_manage_machines' as keyof UserPermissions,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      href: '/events',
      label: 'Alocações',
      requiredPermission: 'can_register_events' as keyof UserPermissions,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
  ]

  const navItems = allNavItems.filter((item) => {
    if (!user) return false
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-30 pb-safe">
      <div className="grid grid-cols-4 h-16">
        {navItems.slice(0, 4).map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {item.icon}
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

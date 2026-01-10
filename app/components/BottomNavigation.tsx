'use client'

import { useEffect, useState, useRef } from 'react'
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

interface NavItem {
  href: string
  label: string
  requiredPermission?: keyof UserPermissions
  icon: JSX.Element
}

export default function BottomNavigation() {
  const pathname = usePathname()
  const [user, setUser] = useState<UserPermissions | null>(null)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const menuContainerRef = useRef<HTMLDivElement>(null)

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

  // Fechar menu ao clicar fora - usando ref para detecção precisa
  useEffect(() => {
    if (!showMoreMenu) return

    const handleClickOutside = (event: MouseEvent) => {
      // Se o clique foi dentro do container do menu (incluindo dropdown), não fecha
      if (menuContainerRef.current && menuContainerRef.current.contains(event.target as Node)) {
        return
      }
      setShowMoreMenu(false)
    }

    // Adicionar listener com pequeno delay para não capturar o clique que abriu o menu
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 10)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showMoreMenu])

  // Itens principais do menu inferior (primeiros 3)
  const mainNavItems: NavItem[] = [
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
      label: 'Mapa',
      requiredPermission: 'can_view_map' as keyof UserPermissions,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
    {
      href: '/events',
      label: 'Alocações',
      requiredPermission: 'can_register_events' as keyof UserPermissions,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
    },
  ]

  // Itens do dropdown "Mais"
  const moreNavItems: NavItem[] = [
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
      href: '/usuarios',
      label: 'Pessoas',
      requiredPermission: 'can_manage_users' as keyof UserPermissions,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      href: '/machines',
      label: 'Máquinas',
      requiredPermission: 'can_manage_machines' as keyof UserPermissions,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      href: '/reports',
      label: 'Relatórios',
      requiredPermission: 'can_view_financial' as keyof UserPermissions,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ]

  // Função para filtrar itens baseado em permissões
  const filterItemsByPermissions = (items: NavItem[]): NavItem[] => {
    return items.filter((item) => {
      if (!user) return false
      if (user.role === 'admin' || user.role === 'dev') return true
      if (item.requiredPermission) {
        return user[item.requiredPermission] === true
      }
      return false
    })
  }

  // Filtrar itens principais e do dropdown
  const mainItems = filterItemsByPermissions(mainNavItems)
  const moreItems = filterItemsByPermissions(moreNavItems)

  if (mainItems.length === 0 && moreItems.length === 0) {
    return null
  }

  // Verificar se alguma opção do "Mais" está ativa
  const isMoreMenuActive = moreItems.some((item) => pathname === item.href)

  // Handler para navegação - fecha o menu e navega
  const handleNavClick = () => {
    setShowMoreMenu(false)
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-30 pb-safe">
      <div className="grid grid-cols-4 h-16">
        {/* Itens principais: Dashboard, Mapa, Alocações */}
        {mainItems.map((item) => {
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
        
        {/* Botão "Mais" - sempre visível */}
        <div ref={menuContainerRef} className="relative h-full flex items-center justify-center">
          <button
            type="button"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              showMoreMenu || isMoreMenuActive
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
            <span className="text-xs font-medium">Mais</span>
          </button>
          
          {/* Dropdown para cima - Jobsites, Pessoas, Máquinas, Relatórios */}
          {showMoreMenu && moreItems.length > 0 && (
            <div className="absolute bottom-full right-1/2 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden whitespace-nowrap z-[60] animate-slide-up">
              <div className="py-1">
                {moreItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleNavClick}
                      className={`block px-4 py-2.5 transition-colors ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        {item.icon}
                        <span className="font-medium text-sm">{item.label}</span>
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

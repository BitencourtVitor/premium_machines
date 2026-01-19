'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase, Notification } from '@/lib/supabase'
import { getSessionUser } from '@/lib/session'
import NotificationsModal from './NotificationsModal'

export default function NotificationsMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [user, setUser] = useState<any>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const sessionUser = getSessionUser()
    if (sessionUser) {
      setUser(sessionUser)
    }
  }, [])

  const canSeeNotifications = user && (user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'dev')

  useEffect(() => {
    if (canSeeNotifications) {
      fetchNotifications()
      
      // Inscrever para atualizações em tempo real
      const channel = supabase
        .channel('notifications_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
          fetchNotifications()
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [canSeeNotifications, user?.id])

  async function fetchNotifications() {
    if (!user?.id) return

    try {
      const response = await fetch(`/api/notifications?userId=${user.id}&limit=20`)
      const result = await response.json()

      if (result.success) {
        setNotifications(result.notifications)
        setUnreadCount(result.notifications.filter((n: any) => !n.viewed_by?.includes(user.id)).length)
      } else {
        console.error('Erro ao buscar notificações:', result.message)
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error)
    }
  }

  async function markAsViewed(notification: Notification) {
    if (!user?.id || notification.viewed_by?.includes(user.id)) return

    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: notification.id,
          userId: user.id,
          action: 'view'
        })
      })

      const result = await response.json()

      if (result.success) {
        setNotifications(prev => prev.map(n => n.id === notification.id ? result.notification : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Erro ao marcar como lida:', error)
    }
  }

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (!canSeeNotifications) return null

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        className={`p-2 rounded-lg transition-all duration-250 ease-in-out focus:outline-none ${
          isOpen 
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
        }`}
        aria-label="Notificações"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Notificações"
      >
        <div className="relative">
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
            />
          </svg>
          
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] text-white items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          )}
        </div>
      </button>

      {/* Dropdown Panel */}
      <div
        className={`absolute mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 transform transition-all duration-200 origin-top-right z-[10006] w-[min(20rem,calc(100vw-2rem))] left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:w-96 sm:translate-x-0 overflow-hidden ${
          isOpen 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Painel de notificações"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notificações</h3>
          <button 
            onClick={() => {
              setIsOpen(false)
              setIsModalOpen(true)
            }}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Ver todas
          </button>
        </div>

        <div className="max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-full p-3 mb-3">
                <svg 
                  className="w-6 h-6 text-gray-400 dark:text-gray-500" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" 
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Nenhuma notificação</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Você será avisado quando houver novidades.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {notifications.map((notification) => {
                const isUnread = !notification.viewed_by?.includes(user?.id)
                return (
                  <li 
                    key={notification.id}
                    className={`p-4 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isUnread ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''}`}
                    onMouseEnter={() => isUnread && markAsViewed(notification)}
                  >
                    <div className="flex gap-3">
                      <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${isUnread ? 'bg-blue-600' : 'bg-transparent'}`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{notification.titulo}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{notification.mensagem}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                          {new Date(notification.trigger_date || notification.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <NotificationsModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  )
}

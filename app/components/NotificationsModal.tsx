'use client'

import { useEffect, useState } from 'react'
import { supabase, Notification } from '@/lib/supabase'
import { getSessionUser } from '@/lib/session'

interface NotificationsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function NotificationsModal({ isOpen, onClose }: NotificationsModalProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const sessionUser = getSessionUser()
    if (sessionUser) {
      setUser(sessionUser)
    }
  }, [])

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchNotifications()
    }
  }, [isOpen, user?.id])

  async function fetchNotifications() {
    if (!user?.id) return
    setLoading(true)
    try {
      const response = await fetch(`/api/notifications?userId=${user.id}&limit=100`)
      const result = await response.json()

      if (result.success) {
        setNotifications(result.notifications)
      } else {
        console.error('Error fetching notifications:', result.message)
      }
    } catch (err) {
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
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
      }
    } catch (error) {
      console.error('Error marking as viewed:', error)
    }
  }

  async function archiveNotification(notification: Notification) {
    if (!user?.id) return

    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: notification.id,
          userId: user.id,
          action: 'archive'
        })
      })

      const result = await response.json()

      if (result.success) {
        setNotifications(prev => prev.filter(n => n.id !== notification.id))
      }
    } catch (error) {
      console.error('Error archiving notification:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[11000] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Todas as Notificações</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

      <div className="px-6 py-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">Nenhuma notificação encontrada.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => {
                  const isUnread = !user?.id || !notification.viewed_by?.includes(user.id)
                  return (
                    <div 
                      key={notification.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        isUnread 
                          ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30' 
                          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                      }`}
                      onMouseEnter={() => isUnread && markAsViewed(notification)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {isUnread && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
                            <h4 className="font-semibold text-gray-900 dark:text-white">{notification.titulo}</h4>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{notification.mensagem}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span>{new Date(notification.trigger_date || notification.created_at).toLocaleDateString('pt-BR')}</span>
                            <span className="capitalize px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700">{notification.root_type}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => archiveNotification(notification)}
                          className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                          title="Arquivar"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>)
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '../components/Header'
import BottomNavigation from '../components/BottomNavigation'
import Sidebar from '../components/Sidebar'
import { useSession } from '@/lib/useSession'
import { useSidebar } from '@/lib/useSidebar'
import { 
  MACHINE_STATUS_LABELS, 
  EVENT_STATUS_LABELS,
  OWNERSHIP_TYPE_LABELS 
} from '@/lib/permissions'

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: sessionLoading } = useSession()
  const { isExpanded } = useSidebar()
  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [stats, setStats] = useState({
    totalMachines: 0,
    allocatedMachines: 0,
    availableMachines: 0,
    maintenanceMachines: 0,
    totalSites: 0,
    activeSites: 0,
    pendingEvents: 0,
    ownedMachines: 0,
    rentedMachines: 0,
  })
  const [recentEvents, setRecentEvents] = useState<any[]>([])
  const [expandedStats, setExpandedStats] = useState(false)
  const [expandedEvents, setExpandedEvents] = useState(false)

  const loadStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const response = await fetch('/api/dashboard/stats')
      const data = await response.json()

      if (data.success) {
        setStats(data.stats)
        setRecentEvents(data.recentEvents || [])
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }, [])

  useEffect(() => {
    if (sessionLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    // Admin e dev sempre têm acesso ao dashboard
    if (user.role === 'admin' || user.role === 'dev') {
      loadStats()
      setLoading(false)
      return
    }

    // Se não tem permissão de dashboard, redirecionar para mapa (não para login!)
    if (!user.can_view_dashboard) {
      router.push('/map')
      return
    }

    loadStats()
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionLoading])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-gray-400"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-safe-content">
      <Header title="Dashboard" />
      <div className="flex">
        <Sidebar />
        <main className={`flex-1 p-4 md:p-6 transition-all duration-250 ease-in-out ${isExpanded ? 'md:ml-48 lg:ml-64' : 'md:ml-16 lg:ml-20'}`}>
          <div className="max-w-7xl mx-auto">
            {/* Welcome Message */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Bem-vindo, {user?.nome}!
                </h2>
                <button
                  onClick={() => loadStats()}
                  className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  disabled={loadingStats}
                  title="Atualizar"
                >
                  {loadingStats ? (
                    <svg className="w-5 h-5 animate-spin-reverse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Total Machines */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-default">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-3">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Máquinas</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {loadingStats ? '...' : stats.totalMachines}
                    </p>
                  </div>
                </div>
              </div>

              {/* Allocated */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-default">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 dark:bg-green-900 rounded-full p-3">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Alocadas</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {loadingStats ? '...' : stats.allocatedMachines}
                    </p>
                  </div>
                </div>
              </div>

              {/* Available */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-default">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-100 dark:bg-yellow-900 rounded-full p-3">
                    <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Disponíveis</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {loadingStats ? '...' : stats.availableMachines}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pending Events */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-default">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 dark:bg-orange-900 rounded-full p-3">
                    <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Eventos Pendentes</p>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {loadingStats ? '...' : stats.pendingEvents}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Stats & Recent Events */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Machine Stats */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <button
                  onClick={() => setExpandedStats(!expandedStats)}
                  className="w-full text-left p-4 flex items-center justify-between"
                >
                  <span className="font-semibold text-gray-900 dark:text-white">Detalhes das Máquinas</span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${expandedStats ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${expandedStats ? 'max-h-96' : 'max-h-0'}`}>
                  <div className="px-4 pb-4 space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-300">Próprias</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{stats.ownedMachines}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-300">Alugadas</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{stats.rentedMachines}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-300">Em Manutenção</span>
                      <span className="font-semibold text-yellow-600 dark:text-yellow-400">{stats.maintenanceMachines}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-300">Obras Ativas</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{stats.activeSites}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Events */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <button
                  onClick={() => setExpandedEvents(!expandedEvents)}
                  className="w-full text-left p-4 flex items-center justify-between"
                >
                  <span className="font-semibold text-gray-900 dark:text-white">Eventos Recentes</span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${expandedEvents ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className={`overflow-hidden transition-all duration-250 ease-in-out ${expandedEvents ? 'max-h-96' : 'max-h-0'}`}>
                  <div className="px-4 pb-4">
                    {recentEvents.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        Nenhum evento recente
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {recentEvents.slice(0, 5).map((event: any) => (
                          <div
                            key={event.id}
                            className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {event.machine?.unit_number || 'N/A'}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                event.status === 'pending' ? 'event-pending' :
                                event.status === 'approved' ? 'event-approved' : 'event-rejected'
                              }`}>
                                {EVENT_STATUS_LABELS[event.status]}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {event.site?.title || 'Sem obra'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => router.push('/map')}
                className="p-4 bg-blue-600 dark:bg-blue-700 text-white rounded-lg shadow hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex flex-col items-center gap-2"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <span className="text-sm font-medium">Ver Mapa</span>
              </button>
              <button
                onClick={() => router.push('/machines')}
                className="p-4 bg-green-600 dark:bg-green-700 text-white rounded-lg shadow hover:bg-green-700 dark:hover:bg-green-600 transition-colors flex flex-col items-center gap-2"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-medium">Máquinas</span>
              </button>
              <button
                onClick={() => router.push('/events')}
                className="p-4 bg-orange-600 dark:bg-orange-700 text-white rounded-lg shadow hover:bg-orange-700 dark:hover:bg-orange-600 transition-colors flex flex-col items-center gap-2"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">Eventos</span>
              </button>
              <button
                onClick={() => router.push('/sites')}
                className="p-4 bg-purple-600 dark:bg-purple-700 text-white rounded-lg shadow hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors flex flex-col items-center gap-2"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-medium">Obras</span>
              </button>
            </div>
          </div>
        </main>
      </div>

      <BottomNavigation />
    </div>
  )
}

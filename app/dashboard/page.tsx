'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/app/components/Header'
import BottomNavigation from '@/app/components/BottomNavigation'
import Sidebar from '@/app/components/Sidebar'
import { useSession } from '@/lib/useSession'
import { useSidebar } from '@/lib/useSidebar'
import { useAllocationDataRefresh } from '@/lib/allocationEvents'
import { EVENT_STATUS_LABELS } from '@/lib/permissions'
import { formatDate, getEventConfig } from '@/app/events/utils'

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
    inTransitMachines: 0,
    totalSites: 0,
    activeSites: 0,
    pendingEvents: 0,
    ownedMachines: 0,
    rentedMachines: 0,
  })
  const [recentEvents, setRecentEvents] = useState<any[]>([])
  const [expandedStats, setExpandedStats] = useState(false)
  const [expandedEvents, setExpandedEvents] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [, setTimezoneTick] = useState(0)

  useEffect(() => {
    const handleTimezoneChange = () => {
      setTimezoneTick(prev => prev + 1)
    }
    window.addEventListener('timezoneChange', handleTimezoneChange)
    return () => window.removeEventListener('timezoneChange', handleTimezoneChange)
  }, [])

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

  // Atualizar automaticamente quando alocações mudam
  useAllocationDataRefresh(() => {
    loadStats()
  })

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

  const filteredRecentEvents = recentEvents.filter(event => {
    if (event.event_type === 'refueling' && event.status !== 'approved') {
      return false
    }
    return true
  })

  const itemsPerPage = 5
  const totalPages = Math.max(1, Math.ceil(filteredRecentEvents.length / itemsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedEvents = filteredRecentEvents.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage
  )

  return (
    <div className="min-h-screen md:h-screen md:max-h-screen bg-gray-50 dark:bg-gray-900 pb-safe-content md:pb-0 md:flex md:flex-col md:overflow-hidden">
      <Header />
      <div className="flex md:flex-1 md:overflow-hidden">
        <Sidebar />
        <main className={`flex-1 p-4 md:p-6 transition-all duration-300 ease-in-out md:overflow-y-auto ${isExpanded ? 'md:ml-52' : 'md:ml-16'}`}>
          <div className="w-full">
            {/* Welcome Message */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Welcome, {user?.nome}!
                </h2>
                <button
                  onClick={() => loadStats()}
                  className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  disabled={loadingStats}
                  title="Refresh"
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
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Machines</p>
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
                    <p className="text-sm text-gray-500 dark:text-gray-400">Allocated</p>
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
                    <p className="text-sm text-gray-500 dark:text-gray-400">Available</p>
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
                    <p className="text-sm text-gray-500 dark:text-gray-400">Pending Events</p>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {loadingStats ? '...' : stats.pendingEvents}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Stats & Recent Events */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:gap-6">
              {/* Machine Stats */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden lg:flex-1 mb-6 lg:mb-0">
                <button
                  onClick={() => setExpandedStats(!expandedStats)}
                  className="w-full text-left p-4 flex items-center justify-between"
                >
                  <span className="font-semibold text-gray-900 dark:text-white">Machine Details</span>
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
                      <span className="text-gray-600 dark:text-gray-300">Owned</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{stats.ownedMachines}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-300">Rented</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{stats.rentedMachines}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-300">Under Maintenance</span>
                      <span className="font-semibold text-yellow-600 dark:text-yellow-400">{stats.maintenanceMachines}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-300">In Transit</span>
                      <span className="font-semibold text-teal-600 dark:text-teal-400">{stats.inTransitMachines}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-300">Active Jobsites</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{stats.activeSites}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Events */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden lg:flex-1">
                <button
                  onClick={() => setExpandedEvents(!expandedEvents)}
                  className="w-full text-left p-4 flex items-center justify-between"
                >
                  <span className="font-semibold text-gray-900 dark:text-white">Recent Events</span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${expandedEvents ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className={`overflow-hidden transition-all duration-250 ease-in-out ${expandedEvents ? 'max-h-[28rem]' : 'max-h-0'}`}>
                  <div className="px-4 pb-4">
                    {recentEvents.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        Nenhum evento recente
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-3 max-h-[22rem] overflow-y-auto pr-1">
                          {paginatedEvents.map((event: any) => {
                            const config = getEventConfig(event.event_type)
                            const Icon = config.icon

                            return (
                              <div
                                key={event.id}
                                className="bg-gray-50 dark:bg-gray-800/70 rounded-xl p-3 border border-gray-100 dark:border-gray-700 hover:bg-gray-100/80 dark:hover:bg-gray-700 transition-colors flex items-start gap-3"
                              >
                                <div className={`w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center ${config.bgColor} ${config.textColor}`}>
                                  <Icon size={20} aria-label={config.label} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                      {event.machine?.unit_number || 'N/A'}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                    <span>
                                      {config.label}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                                    <span>
                                      {formatDate(event.event_date)}
                                    </span>
                                    {event.site?.title && (
                                      <>
                                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                                        <span className="truncate max-w-[10rem]">
                                          {event.site.title}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Página {safeCurrentPage} de {totalPages}
                            </span>
                            <div className="flex gap-1">
                              {Array.from({ length: totalPages }, (_, index) => {
                                const pageNumber = index + 1

                                return (
                                  <button
                                    key={pageNumber}
                                    onClick={() => setCurrentPage(pageNumber)}
                                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                      safeCurrentPage === pageNumber
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                                  >
                                    {pageNumber}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions removidos conforme solicitação */}
          </div>
        </main>
      </div>
      <BottomNavigation />
    </div>
  )
}

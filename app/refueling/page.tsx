'use client'

import { useEffect, useMemo, useState } from 'react'
import Header from '@/app/components/Header'
import BottomNavigation from '@/app/components/BottomNavigation'
import Sidebar from '@/app/components/Sidebar'
import { useSidebar } from '@/lib/useSidebar'
import { supabase } from '@/lib/supabase'
import { getEventConfig } from '@/app/events/utils'
import { formatDate } from '@/app/events/utils'

interface RefuelingEvent {
  id: string
  event_type: string
  event_date: string
  status: string
  notas: string | null
  machine: { id: string; unit_number: string } | null
  site: { id: string; title: string } | null
}

type TabKey = 'week' | 'templates' | 'suppliers'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

function getCurrentWeekRange() {
  const today = new Date()
  const day = today.getDay()
  const diffToMonday = (day + 6) % 7
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - diffToMonday)
  const sunday = new Date(monday.getTime() + 6 * ONE_DAY_MS)
  const start = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0))
  const end = new Date(Date.UTC(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), 23, 59, 59))
  return { start: start.toISOString(), end: end.toISOString(), labelStart: monday, labelEnd: sunday }
}

export default function RefuelingPage() {
  const { isExpanded } = useSidebar()
  const [activeTab, setActiveTab] = useState<TabKey>('week')
  const [events, setEvents] = useState<RefuelingEvent[]>([])
  const [loading, setLoading] = useState(false)

  const { start, end, labelStart, labelEnd } = useMemo(() => getCurrentWeekRange(), [])

  useEffect(() => {
    let isMounted = true
    const fetchEvents = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('allocation_events')
          .select(
            `
            id,
            event_type,
            event_date,
            status,
            notas,
            machine:machines(id, unit_number),
            site:sites(id, title)
          `
          )
          .eq('event_type', 'refueling')
          .gte('event_date', start)
          .lte('event_date', end)
          .order('event_date', { ascending: true })

        if (error) {
          console.error('Error fetching refueling events', error)
          if (!isMounted) return
          setEvents([])
          setLoading(false)
          return
        }

        if (!isMounted) return
        setEvents((data || []) as RefuelingEvent[])
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchEvents()
    return () => {
      isMounted = false
    }
  }, [start, end])

  const formatWeekDate = (date: Date) =>
    date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    })

  const weekLabel = `${formatWeekDate(labelStart)} - ${formatWeekDate(labelEnd)}`

  const renderWeekTab = () => {
    if (loading) {
      return (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-gray-400" />
        </div>
      )
    }

    if (!events.length) {
      return (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          No refueling events scheduled for this week.
        </div>
      )
    }

    return (
      <div className="p-4 space-y-3">
        {events.map((event) => {
          const config = getEventConfig(event.event_type)
          const Icon = config.icon
          return (
            <div
              key={event.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
            >
              <div
                className={`w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center ${config.bgColor} ${config.textColor} ${config.borderColor}`}
              >
                <Icon size={24} title={config.label} aria-label={config.label} />
              </div>
              <div className="flex-1 min-w-0 w-full">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {event.machine?.unit_number || 'Unknown machine'}
                    </span>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      {event.site?.title || 'Unknown site'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="px-2 py-0.5 rounded-full text-xs border border-gray-200 dark:border-gray-700">
                      {event.status}
                    </span>
                    <span>{formatDate(event.event_date)}</span>
                  </div>
                </div>
                {event.notas && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{event.notas}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderTemplatesTab = () => {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        Templates management will be implemented here.
      </div>
    )
  }

  const renderSuppliersTab = () => {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        Fuel suppliers management will be implemented here.
      </div>
    )
  }

  return (
    <div className="min-h-screen md:h-screen md:max-h-screen bg-gray-50 dark:bg-gray-900 pb-safe-content md:pb-0 md:flex md:flex-col md:overflow-hidden">
      <Header />
      <div className="flex md:flex-1 md:overflow-hidden">
        <Sidebar />
        <main
          className={`flex-1 p-4 md:p-6 md:overflow-hidden md:flex md:flex-col transition-all duration-250 ease-in-out ${
            isExpanded ? 'md:ml-48 lg:ml-64' : 'md:ml-16 lg:ml-20'
          }`}
        >
          <div className="max-w-7xl mx-auto md:flex md:flex-col md:flex-1 md:overflow-hidden md:w-full">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4 flex-shrink-0 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-col gap-1">
                  <h1 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">Refueling</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Scheduled refueling events and templates.
                  </p>
                </div>
                <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{weekLabel}</div>
              </div>
              <div className="px-4 pt-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('week')}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      activeTab === 'week'
                        ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    Weekly schedule
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('templates')}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      activeTab === 'templates'
                        ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    Templates
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('suppliers')}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      activeTab === 'suppliers'
                        ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    Fuel suppliers
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 md:min-h-0 md:overflow-y-auto">
              {activeTab === 'week' && renderWeekTab()}
              {activeTab === 'templates' && renderTemplatesTab()}
              {activeTab === 'suppliers' && renderSuppliersTab()}
            </div>
          </div>
        </main>
      </div>

      <BottomNavigation />
    </div>
  )
}


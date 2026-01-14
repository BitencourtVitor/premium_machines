import React, { useState, useRef, useEffect } from 'react'
import CustomDropdown from '../../components/CustomDropdown'
import { AllocationEvent } from '../types'
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS, DOWNTIME_REASON_LABELS } from '@/lib/permissions'
import { formatDate, getEventConfig } from '../utils'
import { 
  FiCalendar, 
  FiUser, 
  FiMapPin, 
  FiInfo,
  FiTool,
  FiCheckCircle,
  FiXCircle,
  FiFileText,
  FiFilter
} from 'react-icons/fi'
import { GiKeyCard } from "react-icons/gi"
import { LuPuzzle } from "react-icons/lu"

interface EventsTabProps {
  filterStatus: string
  setFilterStatus: (status: string) => void
  filterType: string
  setFilterType: (type: string) => void
  filteredEvents: AllocationEvent[]
  loadingEvents: boolean
  loadEvents: () => void
  user: any
  setShowCreateModal: (show: boolean) => void
  handleNewEvent: () => void
  handleEditEvent: (event: AllocationEvent) => void
  handleDeleteEvent: (event: AllocationEvent) => void
  startDate: string
  setStartDate: (date: string) => void
  endDate: string
  setEndDate: (date: string) => void
}

export default function EventsTab({
  filterStatus,
  setFilterStatus,
  filterType,
  setFilterType,
  filteredEvents,
  loadingEvents,
  loadEvents,
  user,
  setShowCreateModal,
  handleNewEvent,
  handleEditEvent,
  handleDeleteEvent,
  startDate,
  setStartDate,
  endDate,
  setEndDate
}: EventsTabProps) {
  const [showFilter, setShowFilter] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilter(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <>

      {/* Events List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 gap-2">
          <h2 className="text-base font-normal text-gray-500 dark:text-gray-400">
            Eventos • {filteredEvents.length}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={loadEvents}
              className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              disabled={loadingEvents}
              title="Atualizar"
              aria-label="Atualizar lista"
            >
              <svg className={`w-5 h-5 ${loadingEvents ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setShowFilter(!showFilter)}
                className={`p-2 rounded-lg transition-colors ${
                  showFilter || filterStatus || startDate || endDate
                    ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title="Filtrar"
              >
                <FiFilter className="w-5 h-5" />
              </button>

              {showFilter && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Filtros</h3>
                    
                    <CustomDropdown
                      label="Status"
                      value={filterStatus}
                      onChange={setFilterStatus}
                      options={[
                        { value: '', label: 'Todos' },
                        ...Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => ({
                          value,
                          label: label as string
                        }))
                      ]}
                    />

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Período
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                            placeholder="Início"
                          />
                        </div>
                        <div>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                            placeholder="Fim"
                          />
                        </div>
                      </div>
                    </div>

                    {(filterStatus || startDate || endDate) && (
                      <button
                        onClick={() => {
                          setFilterStatus('')
                          setStartDate('')
                          setEndDate('')
                        }}
                        className="w-full py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        Limpar Filtros
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {(user?.can_register_events || user?.role === 'admin' || user?.role === 'dev') && (
              <button
                onClick={handleNewEvent}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl shadow-sm transition-all bg-white dark:bg-transparent"
                title="Novo Evento"
                aria-label="Criar novo evento"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="font-medium">Novo Evento</span>
              </button>
            )}
          </div>
        </div>

        {loadingEvents ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-gray-400"></div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">Nenhuma alocação encontrada</p>
          </div>
        ) : (
          <div className="p-4 overflow-y-auto space-y-3">
            {filteredEvents.map((event) => {
              const config = getEventConfig(event.event_type)
              const Icon = config.icon

              return (
                <div 
                  key={event.id} 
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  {/* Icon Box */}
                  <div className={`w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center ${config.bgColor} ${config.textColor}`}>
                    <Icon size={24} title={config.label} aria-label={config.label} />
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-center justify-between md:justify-start gap-3 mb-1">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {event.machine?.unit_number}
                      </span>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {config.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-1 gap-x-6 text-sm">
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <FiCalendar className="flex-shrink-0" />
                        <span>{formatDate(event.event_date)}</span>
                      </div>
                      
                      {event.site && (
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                          <FiMapPin className="flex-shrink-0" />
                          <span className="truncate">{event.site.title}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <FiUser className="flex-shrink-0" />
                        <span>{event.created_by_user?.nome}</span>
                      </div>
                    </div>

                    {(event.downtime_reason || event.notas) && (
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                        <FiInfo className="mt-0.5 flex-shrink-0 text-gray-400" />
                        <div className="flex flex-wrap gap-x-4">
                          {event.downtime_reason && (
                            <span className={`${config.textColor}`}>
                              Motivo: {DOWNTIME_REASON_LABELS[event.downtime_reason]}
                            </span>
                          )}
                          {event.notas && (
                            <span className="italic">{event.notas}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {(user?.can_register_events || user?.role === 'admin' || user?.role === 'dev') && (
                    <div className="flex items-center gap-2 self-start md:self-center border-t md:border-t-0 border-gray-100 dark:border-gray-700 pt-3 md:pt-0 w-full md:w-auto mt-2 md:mt-0 justify-end md:justify-start">
                      <button
                        onClick={() => handleEditEvent(event)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Editar"
                        aria-label={`Editar evento da máquina ${event.machine?.unit_number}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Excluir"
                        aria-label={`Excluir evento da máquina ${event.machine?.unit_number}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

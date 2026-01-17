import React, { useState, useRef, useEffect } from 'react'
import MultiSelectDropdown from '../../components/MultiSelectDropdown'
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
import { LuPuzzle, LuFilterX } from "react-icons/lu"

import BaseList from '@/app/components/BaseList'
import ListActionButton from '@/app/components/ListActionButton'

interface EventsTabProps {
  filterStatus: string[]
  setFilterStatus: (status: string[]) => void
  filterType: string[]
  setFilterType: (type: string[]) => void
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
  const [, setTimezoneTick] = useState(0)

  useEffect(() => {
    const handleTimezoneChange = () => {
      setTimezoneTick(prev => prev + 1)
    }
    window.addEventListener('timezoneChange', handleTimezoneChange)
    return () => window.removeEventListener('timezoneChange', handleTimezoneChange)
  }, [])

  return (
    <BaseList
      title="Eventos"
      items={filteredEvents}
      totalCount={filteredEvents.length}
      loading={loadingEvents}
      onRefresh={loadEvents}
      showRefresh={true}
      showFilter={true}
      isFiltering={filterStatus.length > 0 || filterType.length > 0 || startDate !== '' || endDate !== ''}
      filterConfig={{
        title: 'Filtrar Eventos',
        popoverWidth: 'w-80'
      }}
      onClearFilters={() => {
        setFilterStatus([])
        setFilterType([])
        setStartDate('')
        setEndDate('')
      }}
      filterPanelContent={
        <>
          <MultiSelectDropdown
            label="Status"
            value={filterStatus}
            onChange={setFilterStatus}
            options={Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => ({
              value,
              label: label as string
            }))}
            placeholder="Todos os status"
          />

          <MultiSelectDropdown
            label="Tipo de Evento"
            value={filterType}
            onChange={setFilterType}
            options={Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({
              value,
              label: label as string
            }))}
            placeholder="Todos os tipos"
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
        </>
      }
      showSuperButton={user?.can_register_events || user?.role === 'admin' || user?.role === 'dev'}
      superButtonConfig={{
        label: "Novo Evento",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ),
        onClick: handleNewEvent,
        borderColor: 'border-blue-600',
        textColor: 'text-blue-600',
        hoverBg: 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
      }}
      renderItem={(event) => {
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
                <ListActionButton
                  icon="edit"
                  onClick={() => handleEditEvent(event)}
                  variant="blue"
                  title="Editar"
                  aria-label={`Editar evento da máquina ${event.machine?.unit_number}`}
                />
                <ListActionButton
                  icon="delete"
                  onClick={() => handleDeleteEvent(event)}
                  variant="red"
                  title="Excluir"
                  aria-label={`Excluir evento da máquina ${event.machine?.unit_number}`}
                />
              </div>
            )}
          </div>
        )
      }}
    />
  )
}

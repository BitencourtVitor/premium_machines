import React from 'react'
import CustomDropdown from '../../components/CustomDropdown'
import { AllocationEvent } from '../types'
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS, DOWNTIME_REASON_LABELS } from '@/lib/permissions'
import { formatDate } from '../utils'

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
  canApprove: boolean
  handleApproveEvent: (id: string) => void
  handleRejectEvent: (id: string) => void
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
  canApprove,
  handleApproveEvent,
  handleRejectEvent
}: EventsTabProps) {
  return (
    <>
      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 flex-shrink-0">
        <div className="flex gap-2 items-end flex-wrap">
          <CustomDropdown
            value={filterStatus}
            onChange={(value) => setFilterStatus(value)}
            options={[
              { value: '', label: 'Todos Status' },
              ...Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => ({
                value,
                label: label as string
              }))
            ]}
          />
          <CustomDropdown
            value={filterType}
            onChange={(value) => setFilterType(value)}
            options={[
              { value: '', label: 'Todos Tipos' },
              ...Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({
                value,
                label: label as string
              }))
            ]}
          />
        </div>
      </div>

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
            >
              <svg className={`w-5 h-5 ${loadingEvents ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            {(user?.can_register_events || user?.role === 'admin' || user?.role === 'dev') && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Nova Alocação"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
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
          <div className="divide-y divide-gray-200 dark:divide-gray-700 md:flex-1 md:overflow-y-auto">
            {filteredEvents.map((event) => (
              <div key={event.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {event.machine?.unit_number}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        event.status === 'pending' ? 'event-pending' :
                        event.status === 'approved' ? 'event-approved' : 'event-rejected'
                      }`}>
                        {EVENT_STATUS_LABELS[event.status]}
                      </span>
                    </div>
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      {EVENT_TYPE_LABELS[event.event_type]}
                    </p>
                    {event.site && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {event.site.title}
                        {event.construction_type && event.lot_building_number && (
                          <span className="ml-2">
                            • {event.construction_type === 'lot' ? 'Lote' : 'Prédio'} {event.lot_building_number}
                          </span>
                        )}
                      </p>
                    )}
                    {event.downtime_reason && (
                      <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                        Motivo: {DOWNTIME_REASON_LABELS[event.downtime_reason]}
                      </p>
                    )}
                    {event.extension_id && (
                      <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                        Extensão: {event.extension_id.substring(0, 8)}...
                      </p>
                    )}
                    {event.corrects_event_id && (
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                        {event.event_type === 'correction' ? 'Corrige evento: ' : 'Finaliza evento: '}
                        {event.corrects_event_id.substring(0, 8)}...
                      </p>
                    )}
                    {event.correction_description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">
                        {event.correction_description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
                      <span>{formatDate(event.event_date)}</span>
                      <span>{event.created_by_user?.nome}</span>
                      {event.approved_by_user && (
                        <span className="text-green-600 dark:text-green-400">
                          Aprovado por: {event.approved_by_user.nome}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {canApprove && event.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveEvent(event.id)}
                        className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                        title="Aprovar"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleRejectEvent(event.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Rejeitar"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

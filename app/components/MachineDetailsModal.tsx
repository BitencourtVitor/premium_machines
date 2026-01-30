'use client'

import React, { useEffect, useRef, useState } from 'react'
import MachineImage from '@/app/components/MachineImage'
import { MACHINE_STATUS_LABELS, OWNERSHIP_TYPE_LABELS, EVENT_TYPE_LABELS, getMachineStatusLabel } from '@/lib/permissions'
import { formatWithSystemTimezone, formatDateOnly } from '@/lib/timezone'
import EventDocumentPopover from '../events/components/EventDocumentPopover'

interface MachineDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  machine: any
  loading: boolean
  events: any[]
  allocations?: any[]
}

export default function MachineDetailsModal({
  isOpen,
  onClose,
  machine,
  loading,
  events
}: MachineDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [, setTimezoneTick] = useState(0)

  // Listener para mudanças de fuso horário
  useEffect(() => {
    const handleTimezoneChange = () => {
      setTimezoneTick(prev => prev + 1)
    }
    window.addEventListener('timezoneChange', handleTimezoneChange)
    return () => window.removeEventListener('timezoneChange', handleTimezoneChange)
  }, [])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Focus trap could be added here, but for now we ensure focus is returned or managed reasonably

  if (!isOpen) return null

  // Filtrar eventos de abastecimento para mostrar apenas os confirmados
  const filteredEvents = events.filter(event => {
    if (event.event_type === 'refueling' && event.status !== 'approved') {
      return false
    }
    return true
  })

  // Helper for status badge styles
  const getStatusBadgeStyle = (status: string, ownershipType?: string) => {
    if (status === 'available' && ownershipType === 'rented') {
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700'
    }

    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800'
      case 'allocated':
      case 'active':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
      case 'in_transit':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800'
      case 'exceeded':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800 font-bold'
      case 'moved':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200 dark:border-pink-800 font-bold'
      case 'scheduled':
        return 'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border-blue-100 dark:border-blue-800'
      case 'finished':
      case 'inactive':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'
    }
  }

  // Helper for ownership badge styles
  const getOwnershipBadgeStyle = (type: string) => {
    return type === 'owned'
      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800'
      : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800'
  }

  // Helper for event colors
  const getEventColors = (type: string) => {
    switch (type) {
      case 'start_allocation':
        return { ring: 'ring-green-100 dark:ring-green-900/30', dot: 'bg-green-500' }
      case 'end_allocation':
        return { ring: 'ring-red-100 dark:ring-red-900/30', dot: 'bg-red-500' }
      case 'downtime_start':
        return { ring: 'ring-orange-100 dark:ring-orange-900/30', dot: 'bg-orange-500' }
      case 'downtime_end':
        return { ring: 'ring-blue-100 dark:ring-blue-900/30', dot: 'bg-blue-500' }
      case 'request_allocation':
        return { ring: 'ring-purple-100 dark:ring-purple-900/30', dot: 'bg-purple-500' }
      case 'transport_start':
        return { ring: 'ring-teal-100 dark:ring-teal-900/30', dot: 'bg-teal-500' }
      case 'transport_arrival':
        return { ring: 'ring-cyan-100 dark:ring-cyan-900/30', dot: 'bg-cyan-500' }
      default:
        return { ring: 'ring-gray-100 dark:ring-gray-800', dot: 'bg-gray-400' }
    }
  }

  return (
    <div 
      className="fixed inset-0 z-[10010] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div 
        ref={modalRef}
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 transform transition-all"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-5">
            {/* Machine Image */}
            <div className="flex-shrink-0 w-16 h-16 relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
              {(() => {
                const getMachineImagePath = () => {
                  const icon = machine?.machine_type?.icon
                  if (!icon) return null
                  
                  if (icon.includes('.')) return `/${icon}`
                  
                  const jpgTypes = ['fork-extensions', 'man-basket', 'truss-boom']
                  const extension = jpgTypes.includes(icon) ? '.jpg' : '.png'
                  return `/${icon}${extension}`
                }
                const imagePath = getMachineImagePath()
                return imagePath ? (
                  <MachineImage src={imagePath} alt={machine?.machine_type?.nome} size={64} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                )
              })()}
            </div>

            <div>
              <h2 id="modal-title" className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                {machine?.unit_number || 'Detalhes da Máquina'}
              </h2>
              <p className="text-base text-gray-500 dark:text-gray-400 font-medium">
                {machine?.machine_type?.nome}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Fechar modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/50 dark:bg-black/20">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-blue-600 border-t-transparent"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Carregando detalhes...</p>
            </div>
          ) : (
            <div className="p-6 sm:p-8 space-y-8">
              
              {/* Modern Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Card */}
                <div className="bg-white dark:bg-gray-800/80 p-4 rounded-xl border border-gray-200 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Status Atual</div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium border ${getStatusBadgeStyle(machine?.status, machine?.ownership_type)}`}>
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      machine?.status === 'available' && machine?.ownership_type === 'rented' ? 'bg-gray-400' :
                      machine?.status === 'available' ? 'bg-green-500' :
                      machine?.status === 'allocated' || machine?.status === 'active' ? 'bg-blue-500' :
                      machine?.status === 'maintenance' ? 'bg-yellow-500' :
                      machine?.status === 'in_transit' ? 'bg-teal-500' : 
                      machine?.status === 'exceeded' ? 'bg-red-500' :
                      machine?.status === 'moved' ? 'bg-pink-500' :
                      machine?.status === 'scheduled' ? 'bg-blue-400' :
                      machine?.status === 'finished' || machine?.status === 'inactive' ? 'bg-indigo-500' :
                      'bg-gray-500'
                    }`}></span>
                    {getMachineStatusLabel(machine?.status, machine?.ownership_type) || 'Desconhecido'}
                  </span>
                </div>

                {/* Ownership Card */}
                <div className="bg-white dark:bg-gray-800/80 p-4 rounded-xl border border-gray-200 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Propriedade</div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium border ${getOwnershipBadgeStyle(machine?.ownership_type)}`}>
                    {OWNERSHIP_TYPE_LABELS[machine?.ownership_type] || machine?.ownership_type}
                  </span>
                </div>

                {/* Type Card */}
                <div className="bg-white dark:bg-gray-800/80 p-4 rounded-xl border border-gray-200 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Tipo</div>
                  <div className="text-base font-semibold text-gray-900 dark:text-white truncate" title={machine?.machine_type?.nome}>
                    {machine?.machine_type?.nome || 'N/A'}
                  </div>
                </div>

                {/* Supplier Card */}
                <div className="bg-white dark:bg-gray-800/80 p-4 rounded-xl border border-gray-200 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Fornecedor</div>
                  <div className="text-base font-semibold text-gray-900 dark:text-white truncate" title={machine?.supplier?.nome}>
                    {machine?.supplier?.nome || '—'}
                  </div>
                </div>
              </div>

              {/* Event Timeline */}
              <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Histórico de Eventos
                </h3>

                {filteredEvents.length === 0 ? (
                  <div className="text-center py-12 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum evento registrado para esta máquina</p>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-8">
                    {filteredEvents
                      .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
                      .map((event) => {
                        const eventColors = getEventColors(event.event_type)
                        
                        return (
                          <div key={event.id} className="relative ml-6 group">
                            {/* Timeline Dot */}
                            <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-[37px] top-1/2 -translate-y-1/2 ring-4 ring-white dark:ring-gray-900 transition-all duration-300 group-hover:scale-110 ${eventColors.ring} z-10`}>
                              <div className={`w-2.5 h-2.5 rounded-full ${eventColors.dot}`} />
                            </span>
                            
                            {/* Event Card */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-all hover:border-blue-200 dark:hover:border-blue-800">
                              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                                    event.event_type === 'start_allocation' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                                    event.event_type === 'end_allocation' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                                    event.event_type === 'downtime_start' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                                    event.event_type === 'downtime_end' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                                    event.event_type === 'request_allocation' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' :
                                    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                  }`}>
                                    {EVENT_TYPE_LABELS[event.event_type] || event.event_type?.replace(/_/g, ' ')}
                                  </span>
                                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {formatDateOnly(event.event_date)}
                                  </span>
                                </div>

                                <EventDocumentPopover 
                                  eventId={event.id} 
                                  unitNumber={machine?.unit_number || 'S/N'} 
                                  sharepointLinks={event.sharepoint_links}
                                />
                              </div>
                              
                              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                                  {event.site?.title && (
                                      <p className="flex items-start gap-2">
                                        <span className="font-semibold text-gray-900 dark:text-white min-w-[60px]">Obra:</span> 
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{event.site.title}</span>
                                      </p>
                                  )}
                                  {event.site?.address && (
                                      <p className="flex items-start gap-2 text-xs">
                                        <span className="font-semibold text-gray-900 dark:text-white min-w-[60px]">Endereço:</span> 
                                        <span className="text-gray-500 dark:text-gray-400 italic">{event.site.address}</span>
                                      </p>
                                  )}
                                  {event.downtime_reason && (
                                      <p className="flex items-start gap-2">
                                        <span className="font-semibold text-gray-900 dark:text-white min-w-[60px]">Motivo:</span> 
                                        <span>{event.downtime_reason}</span>
                                      </p>
                                  )}
                                  {event.downtime_description && (
                                      <p className="flex items-start gap-2">
                                        <span className="font-semibold text-gray-900 dark:text-white min-w-[60px]">Detalhes:</span> 
                                        <span className="italic">{event.downtime_description}</span>
                                      </p>
                                  )}
                                  {event.construction_type && event.lot_building_number && (
                                      <p className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-900 dark:text-white min-w-[60px]">Local:</span> 
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                          {event.construction_type === 'lot' ? 'Lote' : 'Prédio'} {event.lot_building_number}
                                        </span>
                                      </p>
                                  )}
                                  
                                  <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-700/50 flex justify-between items-center text-xs text-gray-400">
                                    <span>Registrado em {formatWithSystemTimezone(event.created_at)}</span>
                                    {event.created_by_user && (
                                      <span title={`Por: ${event.created_by_user.nome || 'Usuário'}`}>
                                        {event.created_by_user.nome ? event.created_by_user.nome.split(' ')[0] : 'Usuário'}
                                      </span>
                                    )}
                                  </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '../components/Header'
import BottomNavigation from '../components/BottomNavigation'
import Sidebar from '../components/Sidebar'
import CustomDropdown from '../components/CustomDropdown'
import { useSession } from '@/lib/useSession'
import { useSidebar } from '@/lib/useSidebar'
import { 
  EVENT_TYPE_LABELS, 
  EVENT_STATUS_LABELS,
  DOWNTIME_REASON_LABELS 
} from '@/lib/permissions'

interface AllocationEvent {
  id: string
  event_type: string
  machine: { id: string; unit_number: string }
  site?: { id: string; title: string }
  event_date: string
  status: string
  downtime_reason?: string
  created_by_user: { nome: string }
  created_at: string
  construction_type?: string
  lot_building_number?: string
}

export default function EventsPage() {
  const router = useRouter()
  const { user, loading: sessionLoading } = useSession()
  const { isExpanded } = useSidebar()
  const [loading, setLoading] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [events, setEvents] = useState<AllocationEvent[]>([])
  const [machines, setMachines] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newEvent, setNewEvent] = useState({
    event_type: 'start_allocation',
    machine_id: '',
    site_id: '',
    construction_type: '',
    lot_building_number: '',
    event_date: new Date().toISOString().slice(0, 16),
    downtime_reason: '',
    downtime_description: '',
    notas: '',
  })

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true)
    try {
      const response = await fetch('/api/events')
      const data = await response.json()

      if (data.success) {
        setEvents(data.events)
      }
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setLoadingEvents(false)
      setLoading(false)
    }
  }, [])

  const loadMachines = useCallback(async () => {
    try {
      const response = await fetch('/api/machines')
      const data = await response.json()
      if (data.success) {
        setMachines(data.machines)
      }
    } catch (error) {
      console.error('Error loading machines:', error)
    }
  }, [])

  const loadSites = useCallback(async () => {
    try {
      const response = await fetch('/api/sites')
      const data = await response.json()
      if (data.success) {
        setSites(data.sites)
      }
    } catch (error) {
      console.error('Error loading sites:', error)
    }
  }, [])

  useEffect(() => {
    if (sessionLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    if (!user.can_register_events && !user.can_approve_events && user.role !== 'admin' && user.role !== 'dev') {
      router.push('/dashboard')
      return
    }

    loadEvents()
    loadMachines()
    loadSites()
  }, [user, sessionLoading, router, loadEvents, loadMachines, loadSites])

  const handleCreateEvent = async () => {
    if (!newEvent.machine_id || !newEvent.event_date) {
      alert('Preencha os campos obrigatórios')
      return
    }

    if (['start_allocation', 'end_allocation'].includes(newEvent.event_type) && !newEvent.site_id) {
      alert('Selecione um jobsite para eventos de alocação')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEvent,
          created_by: user?.id,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setShowCreateModal(false)
        setNewEvent({
          event_type: 'start_allocation',
          machine_id: '',
          site_id: '',
          construction_type: '',
          lot_building_number: '',
          event_date: new Date().toISOString().slice(0, 16),
          downtime_reason: '',
          downtime_description: '',
          notas: '',
        })
        loadEvents()
      } else {
        alert(data.message || 'Error creating event')
      }
    } catch (error) {
      console.error('Error creating event:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleApproveEvent = async (eventId: string) => {
    if (!confirm('Aprovar este evento?')) return

    try {
      const response = await fetch(`/api/events/${eventId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: user?.id }),
      })

      const data = await response.json()
      if (data.success) {
        loadEvents()
      } else {
        alert(data.message || 'Error approving event')
      }
    } catch (error) {
      console.error('Error approving event:', error)
    }
  }

  const handleRejectEvent = async (eventId: string) => {
    const reason = prompt('Motivo da rejeição:')
    if (!reason) return

    try {
      const response = await fetch(`/api/events/${eventId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          approved_by: user?.id,
          rejection_reason: reason 
        }),
      })

      const data = await response.json()
      if (data.success) {
        loadEvents()
      } else {
        alert(data.message || 'Error rejecting event')
      }
    } catch (error) {
      console.error('Error rejecting event:', error)
    }
  }

  const filteredEvents = events.filter(event => {
    const matchesStatus = !filterStatus || event.status === filterStatus
    const matchesType = !filterType || event.event_type === filterType
    return matchesStatus && matchesType
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-gray-400"></div>
      </div>
    )
  }

  const canApprove = user?.can_approve_events || user?.role === 'admin' || user?.role === 'dev'

  return (
    <div className="min-h-screen md:h-screen md:max-h-screen bg-gray-50 dark:bg-gray-900 pb-safe-content md:pb-0 md:flex md:flex-col md:overflow-hidden">
      <Header title="Alocações" />
      <div className="flex md:flex-1 md:overflow-hidden">
        <Sidebar />
        <main className={`flex-1 p-4 md:p-6 md:overflow-hidden md:flex md:flex-col transition-all duration-250 ease-in-out ${isExpanded ? 'md:ml-48 lg:ml-64' : 'md:ml-16 lg:ml-20'}`}>
          <div className="max-w-7xl mx-auto md:flex md:flex-col md:flex-1 md:overflow-hidden md:w-full">
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
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Alocações ({filteredEvents.length})
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
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
                            <span>{formatDate(event.event_date)}</span>
                            <span>{event.created_by_user?.nome}</span>
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
          </div>
        </main>
      </div>

      <BottomNavigation />

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Nova Alocação</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              <CustomDropdown
                label="Tipo de Evento *"
                value={newEvent.event_type}
                onChange={(value) => setNewEvent({ ...newEvent, event_type: value })}
                options={Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({
                  value,
                  label: label as string
                }))}
                placeholder="Selecione o tipo de evento"
                required
              />

              <CustomDropdown
                label="Máquina *"
                value={newEvent.machine_id}
                onChange={(value) => setNewEvent({ ...newEvent, machine_id: value })}
                options={[
                  { value: '', label: 'Selecione...' },
                  ...machines.map((machine) => ({
                    value: machine.id,
                    label: `${machine.unit_number} - ${machine.machine_type?.nome}`
                  }))
                ]}
                placeholder="Selecione uma máquina"
                required
              />

              {['start_allocation', 'end_allocation'].includes(newEvent.event_type) && (
                <>
                  <CustomDropdown
                    label="Jobsite *"
                    value={newEvent.site_id}
                    onChange={(value) => setNewEvent({ ...newEvent, site_id: value })}
                    options={[
                      { value: '', label: 'Selecione...' },
                      ...sites.map((site) => ({
                        value: site.id,
                        label: site.title
                      }))
                    ]}
                    placeholder="Selecione um jobsite"
                    required
                  />

                  <CustomDropdown
                    label="Tipo de Construção"
                    value={newEvent.construction_type || ''}
                    onChange={(value) => setNewEvent({ ...newEvent, construction_type: value || '' })}
                    options={[
                      { value: '', label: 'Selecione...' },
                      { value: 'lot', label: 'Lote' },
                      { value: 'building', label: 'Prédio/Edifício' }
                    ]}
                    placeholder="Selecione o tipo de construção"
                  />

                  {newEvent.construction_type && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Número do {newEvent.construction_type === 'lot' ? 'Lote' : 'Prédio'}
                      </label>
                      <input
                        type="text"
                        value={newEvent.lot_building_number}
                        onChange={(e) => setNewEvent({ ...newEvent, lot_building_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder={`Número do ${newEvent.construction_type === 'lot' ? 'lote' : 'prédio'}`}
                      />
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data/Hora do Evento *
                </label>
                <input
                  type="datetime-local"
                  value={newEvent.event_date}
                  onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {['downtime_start'].includes(newEvent.event_type) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Motivo da Parada
                    </label>
                    <CustomDropdown
                      value={newEvent.downtime_reason || ''}
                      onChange={(value) => setNewEvent({ ...newEvent, downtime_reason: value || '' })}
                      options={[
                        { value: '', label: 'Selecione...' },
                        ...Object.entries(DOWNTIME_REASON_LABELS).map(([value, label]) => ({
                          value,
                          label: label as string
                        }))
                      ]}
                      placeholder="Selecione o motivo da parada"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Descrição
                    </label>
                    <textarea
                      value={newEvent.downtime_description}
                      onChange={(e) => setNewEvent({ ...newEvent, downtime_description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Descreva o motivo da parada..."
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notas
                </label>
                <textarea
                  value={newEvent.notas}
                  onChange={(e) => setNewEvent({ ...newEvent, notas: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Observações adicionais..."
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-gray-800 flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateEvent}
                disabled={creating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {creating ? 'Criando...' : 'Criar Evento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

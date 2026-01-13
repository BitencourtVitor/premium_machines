'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/app/components/Header'
import BottomNavigation from '@/app/components/BottomNavigation'
import Sidebar from '@/app/components/Sidebar'
import { useSession } from '@/lib/useSession'
import { useSidebar } from '@/lib/useSidebar'
import { refreshAfterAllocation } from '@/lib/allocationEvents'
import { AllocationEvent, ActiveAllocation, ActiveDowntime } from './types'
import AllocationsTab from './components/AllocationsTab'
import EventsTab from './components/EventsTab'
import CreateEventModal from './components/CreateEventModal'


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
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  
  // Novas funcionalidades: abas e alocações ativas
  const [activeTab, setActiveTab] = useState<'events' | 'allocations'>('events')
  const [activeAllocations, setActiveAllocations] = useState<ActiveAllocation[]>([])
  const [activeDowntimes, setActiveDowntimes] = useState<ActiveDowntime[]>([])
  const [loadingAllocations, setLoadingAllocations] = useState(false)
  
  const [newEvent, setNewEvent] = useState({
    event_type: 'start_allocation',
    machine_id: '',
    site_id: '',
    extension_id: '',
    construction_type: '',
    lot_building_number: '',
    event_date: new Date().toISOString().slice(0, 16),
    downtime_reason: '',
    downtime_description: '',
    corrects_event_id: '',
    correction_description: '',
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
      const response = await fetch('/api/sites?archived=false')
      const data = await response.json()
      if (data.success) {
        setSites(data.sites)
      }
    } catch (error) {
      console.error('Error loading sites:', error)
    }
  }, [])

  const loadActiveAllocations = useCallback(async () => {
    setLoadingAllocations(true)
    try {
      const response = await fetch('/api/allocations/active?include_downtimes=true')
      const data = await response.json()
      if (data.success) {
        setActiveAllocations(data.allocations || [])
        setActiveDowntimes(data.active_downtimes || [])
      }
    } catch (error) {
      console.error('Error loading active allocations:', error)
    } finally {
      setLoadingAllocations(false)
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
    loadActiveAllocations()
  }, [user, sessionLoading, router, loadEvents, loadMachines, loadSites, loadActiveAllocations])

  const handleCreateEvent = async () => {
    if (!newEvent.machine_id || !newEvent.event_date) {
      alert('Preencha os campos obrigatórios')
      return
    }

    // Validações específicas por tipo de evento
    if (['request_allocation', 'confirm_allocation', 'start_allocation', 'end_allocation'].includes(newEvent.event_type) && !newEvent.site_id) {
      alert('Selecione um jobsite para eventos de alocação')
      return
    }

    if (['extension_attach', 'extension_detach'].includes(newEvent.event_type) && !newEvent.extension_id) {
      alert('Selecione uma extensão para eventos de extensão')
      return
    }

    if (newEvent.event_type === 'downtime_start' && !newEvent.downtime_reason) {
      alert('Selecione um motivo para o início de downtime')
      return
    }

    setCreating(true)
    try {
      const url = editingEventId ? `/api/events/${editingEventId}` : '/api/events'
      const method = editingEventId ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEvent,
          created_by: user?.id,
          updated_by: user?.id,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setShowCreateModal(false)
        setEditingEventId(null)
        setNewEvent({
          event_type: 'start_allocation',
          machine_id: '',
          site_id: '',
          extension_id: '',
          construction_type: '',
          lot_building_number: '',
          event_date: new Date().toISOString().slice(0, 16),
          downtime_reason: '',
          downtime_description: '',
          corrects_event_id: '',
          correction_description: '',
          notas: '',
        })
        loadEvents()
        if (activeTab === 'allocations') loadActiveAllocations()
      } else {
        alert(data.message || 'Error saving event')
      }
    } catch (error) {
      console.error('Error saving event:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleEditEvent = (event: AllocationEvent) => {
    setEditingEventId(event.id)
    setNewEvent({
      event_type: event.event_type,
      machine_id: event.machine?.id || '',
      site_id: event.site?.id || '',
      extension_id: event.extension_id || '',
      construction_type: event.construction_type || '',
      lot_building_number: event.lot_building_number || '',
      event_date: event.event_date ? event.event_date.slice(0, 16) : '',
      downtime_reason: event.downtime_reason || '',
      downtime_description: event.downtime_description || '',
      corrects_event_id: event.corrects_event_id || '',
      correction_description: event.correction_description || '',
      notas: event.notas || '',
    })
    setShowCreateModal(true)
  }

  const handleApproveEvent = async (eventId: string) => {
    const event = events.find(e => e.id === eventId)
    if (!event) return

    // Eliminar confirmação redundante para solicitação de alocação
    if (event.event_type !== 'request_allocation') {
      if (!confirm('Aprovar este evento?')) return
    }

    try {
      const response = await fetch(`/api/events/${eventId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: user?.id }),
      })

      const data = await response.json()
      if (data.success) {
        loadEvents()
        // Disparar atualização global para todas as interfaces
        refreshAfterAllocation()
        alert(data.message || 'Evento aprovado com sucesso!')

        // Transição direta para início de alocação após aprovar solicitação
        if (event.event_type === 'request_allocation') {
          setNewEvent({
            ...newEvent,
            event_type: 'start_allocation',
            machine_id: event.machine?.id || '',
            site_id: event.site?.id || '',
            construction_type: event.construction_type || '',
            lot_building_number: event.lot_building_number || '',
            event_date: new Date().toISOString().slice(0, 16),
          })
          setShowCreateModal(true)
        }
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

  // Criar evento de fim de alocação a partir de uma alocação ativa
  const handleEndAllocation = async (allocation: ActiveAllocation) => {
    if (!confirm(`Encerrar alocação da máquina ${allocation.machine_unit_number} em ${allocation.site_title}?`)) return

    setCreating(true)
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'end_allocation',
          machine_id: allocation.machine_id,
          site_id: allocation.site_id,
          event_date: new Date().toISOString(),
          created_by: user?.id,
        }),
      })

      const data = await response.json()
      if (data.success) {
        loadActiveAllocations()
        loadEvents()
        // alert('Evento de fim de alocação criado. Aguardando aprovação.')
      } else {
        alert(data.message || 'Erro ao criar evento')
      }
    } catch (error) {
      console.error('Error creating end allocation event:', error)
    } finally {
      setCreating(false)
    }
  }

  // Criar evento de fim de downtime
  const handleEndDowntime = async (downtime: ActiveDowntime) => {
    if (!confirm(`Finalizar downtime da máquina ${downtime.machine_unit_number}?`)) return

    setCreating(true)
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'downtime_end',
          machine_id: downtime.machine_id,
          site_id: downtime.site_id,
          event_date: new Date().toISOString(),
          corrects_event_id: downtime.downtime_event_id,
          created_by: user?.id,
        }),
      })

      const data = await response.json()
      if (data.success) {
        loadActiveAllocations()
        loadEvents()
        // alert('Evento de fim de downtime criado. Aguardando aprovação.')
      } else {
        alert(data.message || 'Erro ao criar evento')
      }
    } catch (error) {
      console.error('Error creating end downtime event:', error)
    } finally {
      setCreating(false)
    }
  }

  // Criar evento de início de downtime a partir de uma alocação ativa
  const handleStartDowntime = (allocation: ActiveAllocation) => {
    setNewEvent({
      ...newEvent,
      event_type: 'downtime_start',
      machine_id: allocation.machine_id,
      site_id: allocation.site_id,
      event_date: new Date().toISOString().slice(0, 16),
    })
    setShowCreateModal(true)
  }

  const handleDeleteEvent = async (event: AllocationEvent) => {
    if (!confirm(`Tem certeza que deseja excluir o evento da máquina ${event.machine?.unit_number}?`)) return

    try {
      const response = await fetch(`/api/events/${event.id}?user_id=${user?.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        loadEvents()
        if (activeTab === 'allocations') loadActiveAllocations()
      } else {
        alert(data.message || 'Erro ao excluir evento')
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Erro ao excluir evento')
    }
  }

  const filteredEvents = events.filter(event => {
    const matchesStatus = !filterStatus || event.status === filterStatus
    const matchesType = !filterType || event.event_type === filterType
    
    let matchesDate = true
    if (startDate || endDate) {
      const eventDate = new Date(event.event_date)
      if (startDate) {
        matchesDate = matchesDate && eventDate >= new Date(startDate)
      }
      if (endDate) {
        const endDateTime = new Date(endDate)
        endDateTime.setHours(23, 59, 59, 999)
        matchesDate = matchesDate && eventDate <= endDateTime
      }
    }
    
    return matchesStatus && matchesType && matchesDate
  })


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
            
            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4 flex-shrink-0 overflow-hidden">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('allocations')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                    activeTab === 'allocations'
                      ? 'text-blue-600 dark:text-gray-300'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  Alocações Ativas
                  {activeTab === 'allocations' && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-0.5 bg-blue-600 dark:bg-gray-400 rounded-t-full"></div>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('events')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                    activeTab === 'events'
                      ? 'text-blue-600 dark:text-gray-300'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  Histórico de Eventos
                  {activeTab === 'events' && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-0.5 bg-blue-600 dark:bg-gray-400 rounded-t-full"></div>
                  )}
                </button>
              </div>
            </div>

            {/* Tab: Alocações Ativas */}
            {activeTab === 'allocations' && (
              <AllocationsTab
                activeAllocations={activeAllocations}
                loadingAllocations={loadingAllocations}
                loadActiveAllocations={loadActiveAllocations}
                user={user}
                setShowCreateModal={setShowCreateModal}
                handleStartDowntime={handleStartDowntime}
                handleEndAllocation={handleEndAllocation}
                handleEndDowntime={handleEndDowntime}
                activeDowntimes={activeDowntimes}
                creating={creating}
              />
            )}

            {/* Tab: Histórico de Eventos */}
            {activeTab === 'events' && (
              <EventsTab
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                filterType={filterType}
                setFilterType={setFilterType}
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                filteredEvents={filteredEvents}
                loadingEvents={loadingEvents}
                loadEvents={loadEvents}
                user={user}
                setShowCreateModal={setShowCreateModal}
                handleEditEvent={handleEditEvent}
                handleDeleteEvent={handleDeleteEvent}
              />
            )}
          </div>
        </main>
      </div>

      <BottomNavigation />

      {/* Create Event Modal */}
      <CreateEventModal
        showCreateModal={showCreateModal}
        setShowCreateModal={setShowCreateModal}
        newEvent={newEvent}
        setNewEvent={setNewEvent}
        machines={machines}
        sites={sites}
        activeAllocations={activeAllocations}
        activeDowntimes={activeDowntimes}
        creating={creating}
        handleCreateEvent={handleCreateEvent}
        editingEventId={editingEventId}
      />
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/app/components/Header'
import BottomNavigation from '@/app/components/BottomNavigation'
import Sidebar from '@/app/components/Sidebar'
import PageTabs from '@/app/components/PageTabs'
import { useSession } from '@/lib/useSession'
import { useSidebar } from '@/lib/useSidebar'
import { refreshAfterAllocation } from '@/lib/allocationEvents'
import { 
  convertLocalToUtc, 
  getLocalDateTimeForInput,
  getLocalDateForInput,
  adjustDateToSystemTimezone 
} from '@/lib/timezone'
import { AllocationEvent, ActiveAllocation, ActiveDowntime } from './types'
import AllocationsTab from './components/AllocationsTab'
import EventsTab from './components/EventsTab'
import CreateEventModal from './components/CreateEventModal'
import ConfirmModal from '@/app/components/ConfirmModal'


export default function EventsPage() {
  const router = useRouter()
  const { user, loading: sessionLoading } = useSession()
  const { isExpanded } = useSidebar()
  const [loading, setLoading] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [events, setEvents] = useState<AllocationEvent[]>([])
  const [machines, setMachines] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [extensions, setExtensions] = useState<any[]>([])
  const [filterStatus, setFilterStatus] = useState<string[]>([])
  const [filterType, setFilterType] = useState<string[]>([])
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    confirmButtonText?: string
    isDangerous?: boolean
    isLoading?: boolean
    error?: string | null
    showInput?: boolean
    inputValue?: string
    inputPlaceholder?: string
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDangerous: false,
    isLoading: false,
    error: null,
    showInput: false,
    inputValue: '',
    inputPlaceholder: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  // Atualizar o valor do input no confirmModal quando o rejectionReason mudar
  useEffect(() => {
    if (confirmModal.showInput) {
      setConfirmModal(prev => ({ ...prev, inputValue: rejectionReason }))
    }
  }, [rejectionReason, confirmModal.showInput])
  
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
    event_date: getLocalDateTimeForInput(),
    end_date: '',
    downtime_reason: '',
    downtime_description: '',
    corrects_event_id: '',
    correction_description: '',
    notas: '',
  })

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true)
    console.log('Loading events...')
    try {
      const response = await fetch('/api/events')
      console.log('Events response status:', response.status)
      const data = await response.json()

      if (data.success) {
        setEvents(data.events)
      } else {
        console.error('Failed to load events:', data.message)
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

  const loadExtensions = useCallback(async () => {
    try {
      const response = await fetch('/api/extensions?status=available')
      const data = await response.json()
      if (data.success) {
        setExtensions(data.extensions)
      }
    } catch (error) {
      console.error('Error loading extensions:', error)
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
    loadExtensions()
    loadActiveAllocations()
  }, [user, sessionLoading, router, loadEvents, loadMachines, loadSites, loadExtensions, loadActiveAllocations])

  const handleCreateEvent = async () => {
    // Basic safety check
    if (!newEvent.event_date) {
      return
    }

    setCreating(true)
    try {
      const url = editingEventId ? `/api/events/${editingEventId}` : '/api/events'
      const method = editingEventId ? 'PUT' : 'POST'
      
      // Clean empty strings to null for UUID fields to avoid database errors
      const payload: any = {
        ...newEvent,
        created_by: user?.id,
        updated_by: user?.id,
      }

      // Fields that must be null if empty string (UUIDs and Enum/Text fields)
      const nullableFields = ['site_id', 'machine_id', 'extension_id', 'corrects_event_id', 'construction_type', 'lot_building_number', 'downtime_reason']
      nullableFields.forEach(field => {
        if (payload[field as keyof typeof payload] === '') {
          // @ts-ignore
          payload[field as keyof typeof payload] = null
        }
      })

      if (payload.event_date) {
        payload.event_date = convertLocalToUtc(String(payload.event_date))
      }

      if (payload.end_date) {
        payload.end_date = convertLocalToUtc(String(payload.end_date))
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
          event_date: getLocalDateTimeForInput(),
          end_date: '',
          downtime_reason: '',
          downtime_description: '',
          corrects_event_id: '',
          correction_description: '',
          notas: '',
        })
        loadEvents()
        if (activeTab === 'allocations') loadActiveAllocations()
      } else {
        setConfirmModal({
          isOpen: true,
          title: 'Erro',
          message: data.message || 'Erro ao salvar evento',
          confirmButtonText: 'OK',
          onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        })
      }
    } catch (error) {
      console.error('Error saving event:', error)
      setConfirmModal({
        isOpen: true,
        title: 'Erro',
        message: 'Erro ao salvar evento. Verifique sua conexão e tente novamente.',
        confirmButtonText: 'OK',
        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
      })
    } finally {
      setCreating(false)
    }
  }

  const handleNewEvent = () => {
    setEditingEventId(null)
    setNewEvent({
      event_type: 'start_allocation',
      machine_id: '',
      site_id: '',
      extension_id: '',
      construction_type: '',
      lot_building_number: '',
      event_date: getLocalDateTimeForInput(),
      downtime_reason: '',
      downtime_description: '',
      corrects_event_id: '',
      correction_description: '',
      notas: '',
      end_date: '',
    })
    setShowCreateModal(true)
  }

  const handleEditEvent = (event: AllocationEvent) => {
    setEditingEventId(event.id)
    
    // Ajustar data para o formato esperado pelo input datetime-local (horário local)
    let localDateString = ''
    if (event.event_date) {
      const date = new Date(event.event_date)
      localDateString = getLocalDateTimeForInput(date)
    }

    let localEndDateString = ''
    if (event.end_date) {
      localEndDateString = getLocalDateForInput(event.end_date)
    }

    setNewEvent({
      event_type: event.event_type,
      machine_id: event.machine?.id || '',
      site_id: event.site?.id || '',
      extension_id: event.extension_id || '',
      construction_type: event.construction_type || '',
      lot_building_number: event.lot_building_number || '',
      event_date: localDateString,
      downtime_reason: event.downtime_reason || '',
      downtime_description: event.downtime_description || '',
      corrects_event_id: event.corrects_event_id || '',
      correction_description: event.correction_description || '',
      notas: event.notas || '',
      end_date: localEndDateString,
    })
    setShowCreateModal(true)
  }

  const handleApproveEvent = async (eventId: string) => {
    const event = events.find(e => e.id === eventId)
    if (!event) return

    const approve = async () => {
      setConfirmModal(prev => ({ ...prev, isLoading: true }))
      setError(null)
      try {
        const response = await fetch(`/api/events/${eventId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approved_by: user?.id }),
        })

        const data = await response.json()
        if (data.success) {
          setConfirmModal(prev => ({ ...prev, isOpen: false }))
          loadEvents()
          refreshAfterAllocation()

          if (event.event_type === 'request_allocation') {
            setNewEvent({
              ...newEvent,
              event_type: 'start_allocation',
              machine_id: event.machine?.id || '',
              site_id: event.site?.id || '',
              construction_type: event.construction_type || '',
              lot_building_number: event.lot_building_number || '',
              event_date: getLocalDateTimeForInput(),
              end_date: event.end_date ? getLocalDateForInput(event.end_date) : '',
            })
            setShowCreateModal(true)
          }
        } else {
          setError(data.message || 'Erro ao aprovar evento')
        }
      } catch (error) {
        console.error('Error approving event:', error)
        setError('Erro ao conectar com o servidor')
      } finally {
        setConfirmModal(prev => ({ ...prev, isLoading: false }))
      }
    }

    // Eliminar confirmação redundante para solicitação de alocação
    if (event.event_type !== 'request_allocation') {
      setError(null)
      setConfirmModal({
        isOpen: true,
        title: 'Aprovar Evento',
        message: 'Deseja aprovar este evento?',
        confirmButtonText: 'Aprovar',
        onConfirm: approve
      })
    } else {
      await approve()
    }
  }

  const handleRejectEvent = async (eventId: string) => {
    setRejectionReason('')
    setConfirmModal({
      isOpen: true,
      title: 'Rejeitar Evento',
      message: 'Por favor, informe o motivo da rejeição:',
      confirmButtonText: 'Rejeitar',
      isDangerous: true,
      showInput: true,
      inputValue: '',
      inputPlaceholder: 'Motivo da rejeição...',
      onConfirm: async () => {
        // O valor atualizado virá do estado rejectionReason via useEffect
        if (!rejectionReason.trim()) {
          setError('O motivo da rejeição é obrigatório')
          return
        }

        setConfirmModal(prev => ({ ...prev, isLoading: true }))
        setError(null)
        try {
          const response = await fetch(`/api/events/${eventId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              approved_by: user?.id,
              rejection_reason: rejectionReason 
            }),
          })

          const data = await response.json()
          if (data.success) {
            setConfirmModal(prev => ({ ...prev, isOpen: false }))
            loadEvents()
          } else {
            setError(data.message || 'Erro ao rejeitar evento')
          }
        } catch (error) {
          console.error('Error rejecting event:', error)
          setError('Erro ao conectar com o servidor')
        } finally {
          setConfirmModal(prev => ({ ...prev, isLoading: false }))
        }
      }
    })
  }

  // Criar evento de fim de alocação a partir de uma alocação ativa
  const handleEndAllocation = async (allocation: ActiveAllocation) => {
    setError(null)
    setConfirmModal({
      isOpen: true,
      title: 'Encerrar Alocação',
      message: `Tem certeza que deseja encerrar a alocação da máquina ${allocation.machine_unit_number} em ${allocation.site_title}?`,
      confirmButtonText: 'Encerrar',
      isDangerous: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }))
        setError(null)
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
            setConfirmModal(prev => ({ ...prev, isOpen: false }))
            loadActiveAllocations()
            loadEvents()
          } else {
            setError(data.message || 'Erro ao criar evento')
          }
        } catch (error) {
          console.error('Error creating end allocation event:', error)
          setError('Erro ao conectar com o servidor')
        } finally {
          setConfirmModal(prev => ({ ...prev, isLoading: false }))
        }
      }
    })
  }

  // Criar evento de fim de downtime
  const handleEndDowntime = async (downtime: ActiveDowntime) => {
    setError(null)
    setConfirmModal({
      isOpen: true,
      title: 'Finalizar Downtime',
      message: `Finalizar downtime da máquina ${downtime.machine_unit_number}?`,
      confirmButtonText: 'Finalizar',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }))
        setError(null)
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
            setConfirmModal(prev => ({ ...prev, isOpen: false }))
            loadActiveAllocations()
            loadEvents()
          } else {
            setError(data.message || 'Erro ao criar evento')
          }
        } catch (error) {
          console.error('Error creating end downtime event:', error)
          setError('Erro ao conectar com o servidor')
        } finally {
          setConfirmModal(prev => ({ ...prev, isLoading: false }))
        }
      }
    })
  }

  // Criar evento de início de downtime a partir de uma alocação ativa
  const handleStartDowntime = (allocation: ActiveAllocation) => {
    setNewEvent({
      ...newEvent,
      event_type: 'downtime_start',
      machine_id: allocation.machine_id,
      site_id: allocation.site_id,
      event_date: getLocalDateTimeForInput(),
    })
    setShowCreateModal(true)
  }

  const handleDeleteEvent = async (event: AllocationEvent) => {
    setError(null)
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Evento',
      message: `Tem certeza que deseja excluir o evento da máquina ${event.machine?.unit_number}? Esta ação não pode ser desfeita.`,
      confirmButtonText: 'Excluir',
      isDangerous: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }))
        setError(null)
        try {
          const response = await fetch(`/api/events/${event.id}?user_id=${user?.id}`, {
            method: 'DELETE',
          })

          const data = await response.json()

          if (data.success) {
            setConfirmModal(prev => ({ ...prev, isOpen: false }))
            loadEvents()
            if (activeTab === 'allocations') loadActiveAllocations()
          } else {
            setError(data.message || 'Erro ao excluir evento')
          }
        } catch (error) {
          console.error('Error deleting event:', error)
          setError('Erro ao conectar com o servidor')
        } finally {
          setConfirmModal(prev => ({ ...prev, isLoading: false }))
        }
      }
    })
  }

  const filteredEvents = events.filter(event => {
    // Apenas abastecimentos confirmados devem aparecer no sistema
    if (event.event_type === 'refueling' && event.status !== 'approved') {
      return false
    }

    const matchesStatus = filterStatus.length === 0 || filterStatus.includes(event.status)
    const matchesType = filterType.length === 0 || filterType.includes(event.event_type)
    
    let matchesDate = true
    if (startDate || endDate) {
      // Ajustar a data do evento para o fuso horário do sistema para o filtro
      const eventDate = adjustDateToSystemTimezone(event.event_date)
      
      if (startDate) {
        // Criar objeto Date para o início do dia no fuso horário do sistema
        const [sYear, sMonth, sDay] = startDate.split('-').map(Number)
        const startDateTime = new Date(Date.UTC(sYear, sMonth - 1, sDay, 0, 0, 0))
        matchesDate = matchesDate && eventDate.getTime() >= startDateTime.getTime()
      }
      if (endDate) {
        // Criar objeto Date para o fim do dia no fuso horário do sistema
        const [eYear, eMonth, eDay] = endDate.split('-').map(Number)
        const endDateTime = new Date(Date.UTC(eYear, eMonth - 1, eDay, 23, 59, 59, 999))
        matchesDate = matchesDate && eventDate.getTime() <= endDateTime.getTime()
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
        <main className={`flex-1 p-4 md:p-6 md:overflow-hidden md:flex md:flex-col transition-all duration-300 ease-in-out ${isExpanded ? 'md:ml-52' : 'md:ml-16'}`}>
          <div className="max-w-7xl mx-auto md:flex md:flex-col md:flex-1 md:overflow-hidden md:w-full">
            
            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4 flex-shrink-0 overflow-hidden">
              <PageTabs
                tabs={[
                  { id: 'allocations', label: 'Alocações Ativas' },
                  { id: 'events', label: 'Histórico de Eventos' },
                ]}
                activeId={activeTab}
                onChange={(id) => setActiveTab(id as 'events' | 'allocations')}
              />
            </div>

            {/* Tab: Alocações Ativas */}
            {activeTab === 'allocations' && (
              <AllocationsTab
                activeAllocations={activeAllocations}
                loadingAllocations={loadingAllocations}
                loadActiveAllocations={loadActiveAllocations}
                user={user}
                setShowCreateModal={setShowCreateModal}
                handleNewEvent={handleNewEvent}
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
                handleNewEvent={handleNewEvent}
                handleEditEvent={handleEditEvent}
                handleDeleteEvent={handleDeleteEvent}
              />
            )}
          </div>
        </main>
      </div>

      <BottomNavigation />
      
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmButtonText={confirmModal.confirmButtonText}
        isDangerous={confirmModal.isDangerous}
        isLoading={confirmModal.isLoading}
        error={error || undefined}
        showInput={confirmModal.showInput}
        inputValue={rejectionReason}
        onInputChange={setRejectionReason}
        inputPlaceholder={confirmModal.inputPlaceholder}
      />

      {/* Create Event Modal */}
      <CreateEventModal
          showCreateModal={showCreateModal}
          setShowCreateModal={setShowCreateModal}
          newEvent={newEvent}
          setNewEvent={setNewEvent}
          machines={machines}
          sites={sites}
          extensions={extensions}
          activeAllocations={activeAllocations}
          activeDowntimes={activeDowntimes}
          events={events}
          creating={creating}
          handleCreateEvent={handleCreateEvent}
          editingEventId={editingEventId}
        />
    </div>
  )
}

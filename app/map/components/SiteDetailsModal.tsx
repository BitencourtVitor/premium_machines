import { useState, useEffect, useMemo, useCallback } from 'react'
import MachineImage from '@/app/components/MachineImage'
import { AllocationEvent } from '@/app/events/types'
import { getEventConfig, formatDate, formatDateOnly } from '@/app/events/utils'
import { adjustDateToSystemTimezone, formatWithSystemTimezone } from '@/lib/timezone'
import { DOWNTIME_REASON_LABELS } from '@/lib/permissions'

interface SiteDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  site: any
  loading: boolean
  allocations: any[]
  events: any[]
}

export default function SiteDetailsModal({
  isOpen,
  onClose,
  site,
  loading,
  allocations,
  events
}: SiteDetailsModalProps) {
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null)
  const [selectedAllocationId, setSelectedAllocationId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState<'calendar' | 'history'>('calendar')
  const [, setTimezoneTick] = useState(0)

  // Memo para a alocação selecionada e seu intervalo de meses
  const selectedAllocation = useMemo(() => {
    return allocations.find(a => a.allocation_event_id === selectedAllocationId)
  }, [allocations, selectedAllocationId])

  const minMonth = useMemo(() => {
    if (!selectedAllocation) return null
    const date = new Date(selectedAllocation.start_date || selectedAllocation.allocation_start)
    return new Date(date.getFullYear(), date.getMonth(), 1)
  }, [selectedAllocation])

  const maxMonth = useMemo(() => {
    if (!selectedAllocation) return null
    // Se não tiver end_date, a alocação ainda está ativa, então permitimos até o mês atual
    const endDate = selectedAllocation.end_date ? new Date(selectedAllocation.end_date) : new Date()
    return new Date(endDate.getFullYear(), endDate.getMonth(), 1)
  }, [selectedAllocation])

  // Resetar o mês do calendário quando mudar de alocação para focar no início dela
  useEffect(() => {
    if (minMonth) {
      setCalendarMonth(minMonth)
    }
  }, [selectedAllocationId, minMonth])

  // Helper para obter string YYYY-MM-DD no fuso horário do sistema
  const getSystemDateStr = useCallback((date: Date | string) => {
    return adjustDateToSystemTimezone(date).toISOString().split('T')[0]
  }, [])

  // Filtrar eventos de abastecimento para mostrar apenas os confirmados
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (event.event_type === 'refueling' && event.status !== 'approved') {
        return false
      }
      return true
    })
  }, [events])

  useEffect(() => {
    const handleTimezoneChange = () => {
      setTimezoneTick(prev => prev + 1)
    }
    window.addEventListener('timezoneChange', handleTimezoneChange)
    return () => window.removeEventListener('timezoneChange', handleTimezoneChange)
  }, [])

  // Selecionar a primeira máquina automaticamente ao abrir ou mudar de site
  useEffect(() => {
    if (isOpen && !loading && allocations.length > 0) {
      // Sempre seleciona a primeira se não houver nada selecionado ou se o site mudou
      setSelectedMachineId(allocations[0].machine_id)
      setSelectedAllocationId(allocations[0].allocation_event_id)
      setSelectedDate(null)
    }
  }, [isOpen, loading, site?.id, allocations])

  // Resetar seleção ao fechar
  useEffect(() => {
    if (!isOpen) {
      setSelectedMachineId(null)
      setSelectedAllocationId(null)
      setSelectedDate(null)
      setActiveTab('calendar')
    }
  }, [isOpen])

  const getEntityEvents = useCallback((allEvents: any[], entityId: string | null) => {
    if (!entityId) return []
    return allEvents.filter(e => 
      e.machine_id === entityId ||
      e.machine?.id === entityId ||
      e.extension_id === entityId ||
      e.extension?.id === entityId
    )
  }, [])

  const getExpirationDate = useCallback((machineId: string | null) => {
    if (!machineId) return null
    // Prioriza a alocação selecionada no histórico lateral
    const allocation = selectedAllocationId 
      ? allocations.find(a => String(a.allocation_event_id) === String(selectedAllocationId))
      : allocations.find(a => a.machine_id === machineId)
      
    if (!allocation?.end_date) return null
    return getSystemDateStr(allocation.end_date)
  }, [allocations, getSystemDateStr, selectedAllocationId])

  const getStartDate = useCallback((machineId: string | null) => {
    if (!machineId) return null
    const allocation = selectedAllocationId 
      ? allocations.find(a => String(a.allocation_event_id) === String(selectedAllocationId))
      : allocations.find(a => a.machine_id === machineId)
      
    const dateToUse = allocation?.start_date || allocation?.allocation_start
    if (!dateToUse) return null
    return getSystemDateStr(dateToUse)
  }, [allocations, getSystemDateStr, selectedAllocationId])

  const getDayStatus = useCallback((date: Date, entityId: string | null, allEvents: any[]) => {
    if (!entityId) return 'not-allocated'

    const dateStr = getSystemDateStr(date)
    const todayStr = getSystemDateStr(new Date())
    
    // IMPORTANTE: Usamos todos os eventos da máquina, não apenas desta obra
    const entityEvents = getEntityEvents(allEvents, entityId)
    const sortedEvents = [...entityEvents].sort((a, b) => 
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    )

    let isAllocated = false
    let isInDowntime = false
    let isInTransit = false

    for (const event of sortedEvents) {
      const eventDateStr = getSystemDateStr(event.event_date)
      if (eventDateStr > dateStr) break
      
      // Consideramos eventos aprovados ou de abastecimento (que indicam atividade)
      if (event.status !== 'approved' && event.event_type !== 'refueling') continue

      switch (event.event_type) {
        case 'start_allocation':
        case 'extension_attach':
        case 'transport_arrival':
          isAllocated = true
          isInDowntime = false
          // No dia da chegada, o transporte ainda é a prioridade visual (roxo)
          if (event.event_type === 'transport_arrival' && eventDateStr === dateStr) {
            isInTransit = true
          } else {
            isInTransit = false
          }
          break
        
        case 'transport_start':
          isInTransit = true
          // O usuário ressaltou que alocação e presença física são coisas distintas.
          // Mesmo em trânsito, a máquina continua "alocada" comercialmente.
          // isAllocated = true // Mantemos como true se já estava alocada
          break

        case 'end_allocation':
        case 'extension_detach':
          // A máquina só deixa de estar alocada no dia SEGUINTE ao fim real
          if (eventDateStr < dateStr) {
            isAllocated = false
            isInTransit = false
            isInDowntime = false
          }
          break

        case 'downtime_start':
        case 'start_downtime':
          isInDowntime = true
          break

        case 'downtime_end':
        case 'end_downtime':
          // Fica em manutenção até o fim do dia do evento
          if (eventDateStr < dateStr) {
            isInDowntime = false
          }
          break
      }
    }

    if (isAllocated) {
      const expirationDate = getExpirationDate(entityId)
      // Se a data do calendário for POSTERIOR ao vencimento planejado
      if (expirationDate && dateStr > expirationDate) {
        // Se estiver em manutenção ou transporte no dia excedido, 
        // priorizamos a visualização do estado físico, mas garantimos que 
        // o 'working-exceeded' seja o fallback se não houver outro estado especial.
        if (isInTransit) return 'in-transit'
        if (isInDowntime) return 'maintenance'
        return 'working-exceeded'
      }
      
      if (isInTransit) return 'in-transit'
      if (isInDowntime) return 'maintenance'
      return 'working'
    }

    return 'not-allocated'
  }, [getExpirationDate, getSystemDateStr, getEntityEvents])

  const getAllocationStatusToday = (allocation: any) => {
    const machineId = allocation.machine_id
    const status = getDayStatus(new Date(), machineId, filteredEvents)
    const isMaintenance = status === 'maintenance'
    const isExceeded = status === 'working-exceeded'
    
    // Uma alocação é considerada ativa se o seu status no ciclo for 'allocated'
    // E se não houver um evento de fim real (end_allocation)
    const isStillAllocated = allocation.status === 'allocated'
    const today = getSystemDateStr(new Date())
    const dateToUse = allocation.start_date || allocation.allocation_start
    const startDate = dateToUse ? getSystemDateStr(dateToUse) : null

    if (isMaintenance) {
      return {
        isActive: true,
        label: 'Manutenção',
        className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      }
    }

    if (isExceeded) {
      return {
        isActive: true,
        label: 'Ativa (Excedida)',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-bold'
      }
    }

    if (isStillAllocated) {
      const expirationDateStr = allocation.end_date ? getSystemDateStr(allocation.end_date) : null
      const todayStr = getSystemDateStr(new Date())
      
      if (expirationDateStr && todayStr > expirationDateStr) {
        return {
          isActive: true,
          label: 'Ativa (Excedida)',
          className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-bold border border-red-200'
        }
      }

      return {
        isActive: true,
        label: 'Ativa',
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      }
    }

    if (startDate && startDate >= today) {
      return {
        isActive: false,
        label: 'Agendada',
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      }
    }

    return {
      isActive: false,
      label: 'Encerrada',
      className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-medium'
    }
  }

  const todayStatus = useMemo(() => {
    if (!selectedMachineId) return null
    return getDayStatus(new Date(), selectedMachineId, filteredEvents)
  }, [selectedMachineId, filteredEvents, getDayStatus])

  // Filtrar eventos para o histórico - Mostrar o ciclo completo da alocação selecionada
  const machineHistoryEvents = useMemo(() => {
    if (!selectedMachineId || !site?.id || !selectedAllocationId) return []
    
    // Pegamos todos os eventos da máquina para inferir os ciclos de alocação
    const allMachineEvents = getEntityEvents(filteredEvents, selectedMachineId)
    
    const siteId = site.id
    // Ordenação ascendente para processar a linha do tempo corretamente
    const sortedEvents = [...allMachineEvents].sort((a, b) => 
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    )

    const machineEventsInThisSite: any[] = []
    let isTrackingThisAllocation = false

    for (const event of sortedEvents) {
      // Começamos a rastrear EXATAMENTE a partir do evento de alocação selecionado
      if (event.id === selectedAllocationId) {
        isTrackingThisAllocation = true
      }

      if (isTrackingThisAllocation) {
        machineEventsInThisSite.push(event)
        
        // Se este evento NÃO é o de início, verificamos se ele encerra a LOCAÇÃO globalmente
        if (event.id !== selectedAllocationId) {
          // 1. Fim de alocação ou desengate de extensão (Fim absoluto)
          const isAbsoluteEnd = event.event_type === 'end_allocation' || event.event_type === 'extension_detach'
          
          // 2. Um NOVO início de alocação (significa que o ciclo anterior terminou, mesmo que sem evento de fim)
          const isNewAllocationStart = (event.event_type === 'start_allocation' || event.event_type === 'extension_attach') && 
                                       event.id !== selectedAllocationId

          if (isAbsoluteEnd || isNewAllocationStart) {
            isTrackingThisAllocation = false
            break // Ciclo encerrado
          }
        }
      }
    }

    // Retornamos os eventos em ordem DECRESCENTE (mais recente primeiro)
    return machineEventsInThisSite.sort((a, b) => 
      new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
    )
  }, [filteredEvents, selectedMachineId, selectedAllocationId, getEntityEvents, site?.id])

  // Fechar com ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  const isCurrentMonthSelected = 
    calendarMonth.getMonth() === new Date().getMonth() && 
    calendarMonth.getFullYear() === new Date().getFullYear()

  // Validar se deve renderizar
  if (!isOpen) return null
  if (!site && !loading) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10010] p-6"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-6xl h-[90vh] min-h-[600px] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-sm text-gray-500 dark:text-gray-400">
              {site?.title || 'Detalhes da Obra'}
            </h2>
            <p className="text-xl font-semibold text-gray-900 dark:text-white mt-1">
              {site?.address || site?.city}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            aria-label="Fechar modal"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 h-full min-h-0">
              {/* Máquinas Alocadas (Lista Selecionável) */}
              <div className="lg:col-span-4 p-6 border-r border-gray-200 dark:border-gray-700 overflow-y-auto bg-gray-50/50 dark:bg-gray-800/50 h-full min-h-0">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Alocações realizadas
                  </h3>
                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium rounded-full">
                    {allocations.length}
                  </span>
                </div>

                {allocations.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">Nenhuma alocação registrada nesta obra</p>
                ) : (
                  <div className="space-y-3">
                    {allocations.map((allocation) => {
                      const isSelected = selectedAllocationId === allocation.allocation_event_id
                      const allocationStatus = getAllocationStatusToday(allocation)
                      
                      // Formatar as datas do ciclo
                      const cycleStart = formatDateOnly(allocation.start_date || allocation.allocation_start)
                      const cycleEnd = allocation.end_date ? formatDateOnly(allocation.end_date) : 'Ativa'

                      // Determinar o caminho da imagem baseada no tipo de máquina
                      const getMachineImagePath = () => {
                        if (!allocation.machine_type) return null
                        let imageName = allocation.machine_type.toLowerCase().replace(/\s+/g, '-')
                        const jpgTypes = ['fork-extensions', 'man-basket', 'truss-boom']
                        const extension = jpgTypes.includes(imageName) ? '.jpg' : '.png'
                        return `/${imageName}${extension}`
                      }

                      const machineImagePath = getMachineImagePath()

                      return (
                        <div 
                          key={allocation.allocation_event_id} 
                          onClick={() => {
                            setSelectedMachineId(allocation.machine_id)
                            setSelectedAllocationId(allocation.allocation_event_id)
                          }}
                          className={`
                            group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 border
                            ${isSelected 
                              ? 'bg-white dark:bg-gray-700 border-blue-500 shadow-md ring-1 ring-blue-500' 
                              : 'bg-white dark:bg-gray-800 border-transparent hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
                            }
                          `}
                        >
                          {/* Imagem da máquina */}
                          <div className="flex-shrink-0 w-12 h-12 relative rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
                            {machineImagePath ? (
                              <MachineImage
                                src={machineImagePath}
                                alt={allocation.machine_type}
                                size={48}
                                className="w-full h-full"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-300 dark:bg-gray-600">
                                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                </svg>
                              </div>
                            )}
                          </div>

                          {/* Informações da máquina (Esquerda) */}
                          <div className="flex-1 min-w-0">
                            <span className={`font-bold text-lg block ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                              {allocation.machine_unit_number}
                            </span>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {allocation.machine_type}
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-1 whitespace-nowrap">
                              {cycleStart} — {cycleEnd}
                            </p>
                          </div>
                          
                          {/* Status da máquina (Direita) */}
                          <div className="flex-shrink-0 flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                              allocationStatus.className
                            }`}>
                              {allocationStatus.label}
                            </span>
                            
                            {/* Chevron indicando seleção */}
                            {isSelected && (
                              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Coluna Direita: Abas e Conteúdo */}
              <div className="lg:col-span-8 flex flex-col h-full bg-white dark:bg-gray-800 min-h-0">
                {/* Abas */}
                <div className="flex items-center border-b border-gray-200 dark:border-gray-700 px-6 flex-shrink-0">
                  <button
                    onClick={() => setActiveTab('calendar')}
                    className={`px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'calendar'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    Calendário de Uso
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'history'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    Histórico de Eventos
                  </button>
                </div>

                {activeTab === 'calendar' ? (
                  /* Visualização do Calendário */
                  <>
                    <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                          Visualização Mensal
                        </span>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                          {calendarMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                        </h3>
                      </div>
                      
                      <div className={`flex items-center bg-gray-50 dark:bg-gray-700/50 rounded-xl p-1.5 shadow-sm border ${isCurrentMonthSelected ? 'border-blue-200 ring-1 ring-blue-100 dark:border-blue-800 dark:ring-blue-900/30' : 'border-gray-100 dark:border-gray-600'}`}>
                        <button
                          onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                          disabled={!minMonth || calendarMonth.getTime() <= minMonth.getTime()}
                          className={`p-2 rounded-lg transition-all shadow-sm hover:shadow ${
                            !minMonth || calendarMonth.getTime() <= minMonth.getTime()
                              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                              : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600'
                          }`}
                          aria-label="Mês anterior"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setCalendarMonth(new Date())}
                          disabled={!minMonth || !maxMonth || new Date().getTime() < minMonth.getTime() || new Date().getTime() > new Date(maxMonth.getFullYear(), maxMonth.getMonth() + 1, 0).getTime()}
                          className={`px-4 py-2 mx-1 text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow ${
                            isCurrentMonthSelected 
                             ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-100 dark:border-blue-800' 
                             : (!minMonth || !maxMonth || new Date().getTime() < minMonth.getTime() || new Date().getTime() > new Date(maxMonth.getFullYear(), maxMonth.getMonth() + 1, 0).getTime())
                               ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                               : 'text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-600'
                          }`}
                        >
                          Hoje
                        </button>
                        <button
                          onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                          disabled={!maxMonth || calendarMonth.getTime() >= maxMonth.getTime()}
                          className={`p-2 rounded-lg transition-all shadow-sm hover:shadow ${
                            !maxMonth || calendarMonth.getTime() >= maxMonth.getTime()
                              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                              : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600'
                          }`}
                          aria-label="Próximo mês"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 p-6 flex flex-col xl:flex-row gap-8 overflow-y-auto min-h-0">
                      {/* Lado Esquerdo: Legenda e Detalhes do Dia */}
                      <div className="xl:w-64 flex-shrink-0 flex flex-col gap-6">
                        {/* Legenda (Sempre visível) */}
                        <div>
                          <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                            Legenda
                          </h4>
                          <div className="grid grid-cols-1 gap-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2.5">
                              <div className="w-3 h-3 bg-emerald-500 dark:bg-emerald-400 rounded-full shadow-sm"></div>
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Uso planejado</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <div className="w-3 h-3 bg-red-600 dark:bg-red-400 rounded-full shadow-sm"></div>
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Uso excedido</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <div className="w-3 h-3 bg-orange-600 dark:bg-orange-400 rounded-full shadow-sm"></div>
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Manutenção</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <div className="w-3 h-3 bg-purple-600 dark:bg-purple-400 rounded-full shadow-sm"></div>
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Encerrada / Transporte</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <div className="w-3 h-3 bg-pink-600 dark:bg-pink-400 rounded-full shadow-sm"></div>
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Movida</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <div className="w-3 h-3 bg-gray-500 dark:bg-gray-400/80 rounded-full"></div>
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Sem alocação</span>
                            </div>
                            
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-0.5 space-y-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-3 h-3 border-2 border-yellow-500 dark:border-yellow-400 rounded-sm"></div>
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Data atual</span>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <div className="w-3 h-3 border-2 border-blue-600 dark:border-blue-400 rounded-full"></div>
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Início</span>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <div className="w-3 h-3 border-2 border-red-600 dark:border-red-400 rounded-full"></div>
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Vencimento</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Detalhes do Dia (Condicional) */}
                        {selectedDate ? (
                          <div className="flex flex-col border-t border-gray-100 dark:border-gray-700 pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-widest">
                                {selectedDate.toLocaleString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '')}
                              </h4>
                              <button 
                                onClick={() => setSelectedDate(null)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                aria-label="Limpar seleção"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            
                            <div className="space-y-2">
                              {(() => {
                                const dateStr = getSystemDateStr(selectedDate)
                                const expirationDateStr = getExpirationDate(selectedMachineId)
                                const startDateStr = getStartDate(selectedMachineId)
                                const isExpirationDay = dateStr === expirationDateStr
                                const isStartDay = dateStr === startDateStr

                                const dayEvents = machineHistoryEvents.filter(e => {
                                  const eDate = getSystemDateStr(e.event_date)
                                  return eDate === dateStr
                                }).sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())

                                if (dayEvents.length === 0) {
                                  const status = getDayStatus(selectedDate, selectedMachineId, filteredEvents)
                                  return (
                                    <div className="space-y-2">
                                      <div className="p-2.5 bg-gray-50/80 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700/50">
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center font-medium">
                                          {status === 'working' ? 'Máquina em operação.' : 
                                           status === 'working-exceeded' ? 'Máquina em operação (Uso Excedido).' :
                                           status === 'maintenance' ? 'Máquina em manutenção.' :
                                           status === 'in-transit' ? 'Máquina em transporte.' :
                                           'Nenhum evento registrado.'}
                                        </p>
                                      </div>
                                      
                                      {isStartDay && (
                                        <div className="p-2.5 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-800/30 rounded-lg">
                                          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-0.5">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Início da Alocação</span>
                                          </div>
                                          <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 leading-tight">
                                            Data planejada para o início.
                                          </p>
                                        </div>
                                      )}

                                      {isExpirationDay && (
                                        <div className="p-2.5 bg-red-50/50 dark:bg-red-900/10 border border-red-100/50 dark:border-red-800/30 rounded-lg">
                                          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-0.5">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Vencimento</span>
                                          </div>
                                          <p className="text-[10px] text-red-600/80 dark:text-red-400/80 leading-tight">
                                            Encerramento planejado.
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )
                                }

                                return (
                                  <div className="space-y-2">
                                    {isStartDay && (
                                      <div className="p-2.5 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-800/30 rounded-lg">
                                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-0.5">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                          </svg>
                                          <span className="text-[10px] font-bold uppercase tracking-wider">Início da Alocação</span>
                                        </div>
                                      </div>
                                    )}
                                    {isExpirationDay && (
                                      <div className="p-2.5 bg-red-50/50 dark:bg-red-900/10 border border-red-100/50 dark:border-red-800/30 rounded-lg">
                                        <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-0.5">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          <span className="text-[10px] font-bold uppercase tracking-wider">Vencimento</span>
                                        </div>
                                      </div>
                                    )}
                                    {dayEvents.map(event => {
                                      const config = getEventConfig(event.event_type)
                                      const Icon = config.icon
                                      return (
                                        <div key={event.id} className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
                                          <div className="flex items-center gap-2.5">
                                            <div className={`p-1.5 rounded ${config.bgColor} ${config.textColor}`}>
                                              <Icon size={12} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <p className="text-[10px] font-bold text-gray-900 dark:text-white truncate">
                                                {config.label}
                                              </p>
                                              <p className="text-[9px] text-gray-500">
                                                {formatWithSystemTimezone(event.event_date, { hour: '2-digit', minute: '2-digit' })}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )
                              })()}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                            <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm mb-2 text-gray-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center font-medium leading-tight max-w-[180px]">
                              {selectedMachineId 
                                ? 'Selecione uma data no calendário para ver os detalhes.' 
                                : 'Selecione uma máquina à esquerda para carregar o histórico.'
                              }
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Lado Direito: Grade do Calendário */}
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm flex-1 flex flex-col">
                          <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                              <div key={day} className="py-3 text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                {day}
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-7 flex-1 bg-gray-50 dark:bg-gray-900/50 gap-[1px]">
                            {(() => {
                              const year = calendarMonth.getFullYear()
                              const month = calendarMonth.getMonth()
                              const firstDay = new Date(year, month, 1)
                              const startDate = new Date(firstDay)
                              startDate.setDate(startDate.getDate() - firstDay.getDay())

                              const days = []
                              const currentDate = new Date(startDate)
                              const expirationDateStr = getExpirationDate(selectedMachineId)
                              const startDateStr = getStartDate(selectedMachineId)

                              for (let i = 0; i < 42; i++) {
                                const dayDate = new Date(currentDate)
                                const dateStr = getSystemDateStr(dayDate)
                                // Passamos 'events' (prop) em vez de 'filteredEvents'
                                const dayStatus = getDayStatus(dayDate, selectedMachineId, events)
                                const isCurrentMonth = dayDate.getMonth() === month
                                const isToday = dateStr === getSystemDateStr(new Date())
                                const isExpirationDay = dateStr === expirationDateStr
                                const isStartDay = dateStr === startDateStr

                                const statusConfig = {
                                  'working': 'bg-emerald-500 dark:bg-emerald-400 text-white dark:text-emerald-950 font-bold border-emerald-600 dark:border-emerald-300',
                                  'working-exceeded': 'bg-red-600 dark:bg-red-400 text-white dark:text-red-950 font-black border-red-700 dark:border-red-300 shadow-md',
                                  'maintenance': 'bg-orange-600 dark:bg-orange-400 text-white dark:text-orange-950 font-bold border-orange-700 dark:border-orange-300',
                                  'in-transit': 'bg-purple-600 dark:bg-purple-400 text-white dark:text-purple-950 font-bold border-purple-700 dark:border-purple-300',
                                  'scheduled': 'bg-blue-600 dark:bg-blue-400 text-white dark:text-blue-950 font-bold border-blue-700 dark:border-blue-300 border-dashed',
                                  'not-allocated': 'text-gray-400 dark:text-gray-500'
                                }

                                days.push(
                                  <div
                                    key={dayDate.toISOString()}
                                    onClick={() => setSelectedDate(dayDate)}
                                    className={`
                                      relative flex items-center justify-center transition-all duration-200 cursor-pointer group aspect-square
                                      ${!isCurrentMonth ? 'bg-gray-50/50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30'}
                                      ${selectedDate && getSystemDateStr(selectedDate) === dateStr ? 'bg-gray-50 dark:bg-gray-800/80' : ''}
                                    `}
                                  >
                                    {/* Indicador de Seleção (Borda Externa) */}
                                    {selectedDate && getSystemDateStr(selectedDate) === dateStr && (
                                      <div className="absolute inset-0 border-2 border-gray-300 dark:border-gray-600 z-30 pointer-events-none" />
                                    )}

                                    {/* Indicador de Hoje (Quadrado Oco Amarelo) */}
                                    {isToday && (
                                      <div className="absolute w-[85%] h-[85%] border-2 border-yellow-400 rounded-md z-0" />
                                    )}

                                    {/* Indicador de Início (Círculo Azul) */}
                                    {isStartDay && (
                                      <div className="absolute w-11 h-11 border-2 border-blue-600 dark:border-blue-400 rounded-full z-20 pointer-events-none" />
                                    )}

                                    {/* Indicador de Vencimento (Círculo Vermelho) */}
                                    {isExpirationDay && (
                                      <div className="absolute w-11 h-11 border-2 border-red-600 dark:border-red-400 rounded-full z-20 pointer-events-none" />
                                    )}

                                    <div className={`
                                      w-10 h-10 flex items-center justify-center rounded-full text-sm font-medium transition-all relative border-2 z-10
                                      ${isCurrentMonth ? statusConfig[dayStatus] : 'text-gray-300 dark:text-gray-700 border-transparent'}
                                      ${isCurrentMonth && dayStatus === 'not-allocated' ? 'border-transparent' : ''}
                                    `}>
                                      {dayDate.getDate()}
                                    </div>
                                  </div>
                                )
                                currentDate.setDate(currentDate.getDate() + 1)
                              }

                              return days
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Visualização do Histórico */
                  <div className="flex-1 overflow-y-auto p-6 min-h-0">
                    {machineHistoryEvents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                        <svg className="w-12 h-12 mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p>Nenhum evento registrado para esta máquina.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {machineHistoryEvents.map((event, index) => {
                          const isLast = index === machineHistoryEvents.length - 1
                          const config = getEventConfig(event.event_type)
                          const Icon = config.icon
                          
                          return (
                            <div key={event.id} className="relative flex gap-4">
                              {/* Linha conectora */}
                              {!isLast && (
                                <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 -ml-px"></div>
                              )}
                              
                              {/* Ícone */}
                              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-gray-800 ${config.bgColor} ${config.textColor}`}>
                                <Icon size={20} />
                              </div>

                              {/* Conteúdo */}
                              <div className="flex-1 pt-1 pb-6">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                                    {config.label}
                                  </h4>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                    {formatDate(event.event_date)}
                                  </span>
                                </div>
                                
                                <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                  {event.end_date && (
                                    <div className="mb-2 flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                      <span className="font-medium">Vencimento Planejado:</span> 
                                      <span className="font-semibold">
                                        {formatDateOnly(event.end_date)}
                                      </span>
                                    </div>
                                  )}

                                  {(event.event_type === 'transport_arrival' || event.event_type === 'start_allocation') && 
                                   event.site?.id && event.site.id !== site?.id && (
                                    <div className="mb-2 flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                      </svg>
                                      <span className="font-medium">Chegou em:</span> 
                                      <span className="font-semibold text-gray-700 dark:text-gray-200">{event.site.title}</span>
                                    </div>
                                  )}

                                  {event.downtime_reason && (
                                    <div className="mb-1">
                                      <span className="font-medium">Motivo:</span> {DOWNTIME_REASON_LABELS[event.downtime_reason] || event.downtime_reason}
                                    </div>
                                  )}
                                  {event.downtime_description && (
                                    <div className="italic text-gray-500 dark:text-gray-400">
                                      &quot;{event.downtime_description}&quot;
                                    </div>
                                  )}
                                  {event.notas && (
                                     <div className="mt-1">
                                       <span className="font-medium">Notas:</span> {event.notas}
                                     </div>
                                  )}
                                  <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Registrado por {event.created_by_user?.nome || 'Sistema'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
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

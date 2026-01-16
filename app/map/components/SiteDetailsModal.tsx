import { useState, useEffect, useMemo, useCallback } from 'react'
import MachineImage from '@/app/components/MachineImage'
import { AllocationEvent } from '@/app/events/types'
import { getEventConfig, formatDate } from '@/app/events/utils'
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState<'calendar' | 'history'>('calendar')
  const [, setTimezoneTick] = useState(0)

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

  // Selecionar a primeira máquina automaticamente ao abrir
  useEffect(() => {
    if (isOpen && allocations.length > 0 && !selectedMachineId) {
      setSelectedMachineId(allocations[0].machine_id)
      setSelectedDate(null)
    }
  }, [isOpen, allocations, selectedMachineId])

  const getEntityEvents = useCallback((allEvents: any[], entityId: string | null) => {
    if (!entityId) return []
    return allEvents.filter(e => 
      e.machine_id === entityId ||
      e.machine?.id === entityId ||
      e.extension_id === entityId ||
      e.extension?.id === entityId
    )
  }, [])

  const getDayStatus = useCallback((date: Date, entityId: string | null, allEvents: any[]) => {
    if (!entityId) return 'not-allocated'

    // Formatar a data para comparação (YYYY-MM-DD) usando a data local do calendário
    // O calendário já gera datas locais do navegador, então usamos o formato ISO
    const dateStr = date.toISOString().split('T')[0]
    
    const entityEvents = getEntityEvents(allEvents, entityId)
    
    const sortedEvents = [...entityEvents].sort((a, b) => 
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    )

    let isAllocated = false
    let isInDowntime = false
    let lastAllocationStart = null

    for (const event of sortedEvents) {
      // Ajustar a data do evento para o fuso horário do sistema para comparação justa com o calendário
      const eventDateStr = adjustDateToSystemTimezone(event.event_date).toISOString().split('T')[0]
      if (eventDateStr > dateStr) break

      if (event.status !== 'approved') continue

      if (event.event_type === 'start_allocation' || event.event_type === 'extension_attach') {
        isAllocated = true
        isInDowntime = false
        lastAllocationStart = eventDateStr
      } else if (event.event_type === 'end_allocation' || event.event_type === 'extension_detach') {
        if (eventDateStr < dateStr) {
          isAllocated = false
        } else if (eventDateStr === dateStr) {
          isAllocated = true
        }
      } else if (event.event_type === 'downtime_start') {
        if (isAllocated) isInDowntime = true
      } else if (event.event_type === 'downtime_end') {
        if (isAllocated && eventDateStr < dateStr) {
          isInDowntime = false
        }
      }
    }

    if (!isAllocated) return 'not-allocated'
    if (isInDowntime) return 'maintenance'
    
    // Verificar se é futuro e solicitado usando o fuso horário do sistema
    const today = adjustDateToSystemTimezone(new Date()).toISOString().split('T')[0]
    if (dateStr > today) {
        // Lógica futura simplificada: se está alocado (sem fim definido), é 'working' (verde) ou 'requested' (azul)?
        // Se já começou, é working (verde planejado).
        return 'working' 
    }

    return 'working'
  }, [getEntityEvents])

  const getAllocationStatusToday = (machineId: string) => {
    const status = getDayStatus(new Date(), machineId, filteredEvents)
    const isActive = status === 'working' || status === 'maintenance'

    return {
      isActive,
      label: isActive ? 'Ativa' : 'Encerrada',
      className: isActive
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-300'
    }
  }

  const todayStatus = useMemo(() => {
    if (!selectedMachineId) return null
    return getDayStatus(new Date(), selectedMachineId, filteredEvents)
  }, [selectedMachineId, filteredEvents, getDayStatus])

  // Filtrar eventos para o histórico
  const machineHistoryEvents = useMemo(() => {
    if (!selectedMachineId) return []
    return getEntityEvents(filteredEvents, selectedMachineId)
      .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
  }, [filteredEvents, selectedMachineId, getEntityEvents])

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
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-6"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
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
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 h-full">
              {/* Máquinas Alocadas (Lista Selecionável) */}
              <div className="p-6 border-r border-gray-200 dark:border-gray-700 overflow-y-auto bg-gray-50/50 dark:bg-gray-800/50">
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
                      const isSelected = selectedMachineId === allocation.machine_id
                      const allocationStatus = getAllocationStatusToday(allocation.machine_id)
                      
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
                          onClick={() => setSelectedMachineId(allocation.machine_id)}
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

                          {/* Informações da máquina */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-medium ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                                {allocation.machine_unit_number}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                allocationStatus.className
                              }`}>
                                {allocationStatus.label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {allocation.machine_type}
                            </p>
                          </div>
                          
                          {/* Chevron indicando seleção */}
                          {isSelected && (
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Coluna Direita: Abas e Conteúdo */}
              <div className="col-span-2 flex flex-col h-full bg-white dark:bg-gray-800">
                {/* Abas */}
                <div className="flex items-center border-b border-gray-200 dark:border-gray-700 px-6">
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
                    <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                          Visualização Mensal
                        </span>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                          {calendarMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
                        </h3>
                        {selectedMachineId && (todayStatus === 'working' || todayStatus === 'maintenance') && (
                          <span className="inline-flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>
                            {todayStatus === 'working' && 'Status hoje: Alocada'}
                            {todayStatus === 'maintenance' && 'Status hoje: Em manutenção'}
                          </span>
                        )}
                      </div>
                      
                      <div className={`flex items-center bg-gray-50 dark:bg-gray-700/50 rounded-xl p-1.5 shadow-sm border ${isCurrentMonthSelected ? 'border-blue-200 ring-1 ring-blue-100 dark:border-blue-800 dark:ring-blue-900/30' : 'border-gray-100 dark:border-gray-600'}`}>
                        <button
                          onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                          className="p-2 hover:bg-white dark:hover:bg-gray-600 rounded-lg transition-all text-gray-600 dark:text-gray-300 shadow-sm hover:shadow"
                          aria-label="Mês anterior"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setCalendarMonth(new Date())}
                          className={`px-4 py-2 mx-1 text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow ${
                            isCurrentMonthSelected 
                             ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-100 dark:border-blue-800' 
                             : 'text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-600'
                          }`}
                        >
                          Hoje
                        </button>
                        <button
                          onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                          className="p-2 hover:bg-white dark:hover:bg-gray-600 rounded-lg transition-all text-gray-600 dark:text-gray-300 shadow-sm hover:shadow"
                          aria-label="Próximo mês"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 p-6 flex flex-col xl:flex-row gap-8 overflow-y-auto">
                      {/* Lado Esquerdo: Legenda ou Detalhes do Dia */}
                      <div className="xl:w-64 flex-shrink-0 flex flex-col gap-6">
                        {selectedDate ? (
                          <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                                {selectedDate.toLocaleString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}
                              </h4>
                              <button 
                                onClick={() => setSelectedDate(null)}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Voltar
                              </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                              {(() => {
                                const dayEvents = machineHistoryEvents.filter(e => {
                                  const eDate = adjustDateToSystemTimezone(e.event_date).toISOString().split('T')[0]
                                  const sDate = selectedDate.toISOString().split('T')[0]
                                  return eDate === sDate
                                }).sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())

                                if (dayEvents.length === 0) {
                                  // Verificar status do dia para mensagem contextual
                                  const status = getDayStatus(selectedDate, selectedMachineId, filteredEvents)
                                  return (
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl text-center">
                                      <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {status === 'working' ? 'Máquina em operação neste dia.' : 
                                         status === 'maintenance' ? 'Máquina em manutenção neste dia.' :
                                         'Nenhum evento registrado.'}
                                      </p>
                                    </div>
                                  )
                                }

                                return dayEvents.map(event => {
                                  const config = getEventConfig(event.event_type)
                                  const Icon = config.icon
                                  return (
                                    <div key={event.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                      <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg ${config.bgColor} ${config.textColor}`}>
                                          <Icon size={16} />
                                        </div>
                                        <div>
                                          <p className="text-xs font-bold text-gray-900 dark:text-white">
                                            {config.label}
                                          </p>
                                          <p className="text-[10px] text-gray-500 mt-0.5">
                                            {formatWithSystemTimezone(event.event_date, { hour: '2-digit', minute: '2-digit' })}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })
                              })()}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div>
                              <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
                                Legenda
                              </h4>
                              <div className="space-y-2 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-2xl border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-green-100 dark:ring-green-900/30"></div>
                                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Em funcionamento</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 bg-orange-500 rounded-full ring-2 ring-orange-100 dark:ring-orange-900/30"></div>
                                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Em manutenção</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Não alocado</span>
                                </div>
                              </div>
                            </div>

                            {!selectedMachineId && (
                              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl border border-yellow-100 dark:border-yellow-800">
                                <p className="text-xs text-yellow-700 dark:text-yellow-200">
                                  Selecione uma máquina à esquerda para visualizar sua distribuição no calendário.
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Lado Direito: Grade do Calendário */}
                      <div className="flex-1 min-w-0">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                          <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                              <div key={day} className="py-3 text-center text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                {day}
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-7 auto-rows-fr">
                            {(() => {
                              const year = calendarMonth.getFullYear()
                              const month = calendarMonth.getMonth()
                              const firstDay = new Date(year, month, 1)
                              const startDate = new Date(firstDay)
                              startDate.setDate(startDate.getDate() - firstDay.getDay())

                              const days = []
                              const currentDate = new Date(startDate)

                              for (let i = 0; i < 42; i++) {
                                const dayStatus = getDayStatus(currentDate, selectedMachineId, filteredEvents)
                                const isCurrentMonth = currentDate.getMonth() === month
                                const isToday = currentDate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]

                                days.push(
                                  <div
                                    key={currentDate.toISOString()}
                                    className={`
                                      relative aspect-square flex items-center justify-center border-b border-r border-gray-50 dark:border-gray-700/50 transition-all duration-200
                                      ${!isCurrentMonth ? 'bg-gray-50/50 dark:bg-gray-900/50' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}
                                    `}
                                  >
                                    <div className={`
                                      w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-sm font-medium transition-all
                                      ${isToday ? 'font-bold ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800' : ''}
                                      ${
                                        isCurrentMonth
                                          ? dayStatus === 'working'
                                            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                            : dayStatus === 'maintenance'
                                            ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                                            : 'text-gray-700 dark:text-gray-300'
                                          : 'text-gray-300 dark:text-gray-600'
                                      }
                                    `}>
                                      {currentDate.getDate()}
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
                  <div className="flex-1 overflow-y-auto p-6">
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

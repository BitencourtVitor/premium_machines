import { useState, useEffect, useMemo } from 'react'
import MachineImage from '@/app/components/MachineImage'
import { AllocationEvent } from '@/app/events/types'

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
  const [activeTab, setActiveTab] = useState<'calendar' | 'history'>('calendar')

  // Selecionar a primeira máquina automaticamente ao abrir
  useEffect(() => {
    if (isOpen && allocations.length > 0 && !selectedMachineId) {
      setSelectedMachineId(allocations[0].machine_id)
    }
  }, [isOpen, allocations, selectedMachineId])

  if (!isOpen) return null

  // Helper function for day status based on selected machine events
  const getDayStatus = (date: Date, machineId: string | null, allEvents: any[]) => {
    if (!machineId) return 'not-allocated'

    const dateStr = date.toISOString().split('T')[0]
    
    // Filtrar eventos apenas da máquina selecionada
    const machineEvents = allEvents.filter(e => e.machine_id === machineId || e.machine?.id === machineId)
    
    // Verificar se há alocação ativa nesta data
    // Uma máquina está alocada se existe um start_allocation <= data 
    // E (não existe end_allocation OU end_allocation > data)
    
    // Vamos ordenar eventos por data para processar cronologicamente
    const sortedEvents = [...machineEvents].sort((a, b) => 
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    )

    let isAllocated = false
    let isInDowntime = false
    let lastAllocationStart = null

    // Simular o estado até a data alvo
    for (const event of sortedEvents) {
      const eventDateStr = new Date(event.event_date).toISOString().split('T')[0]
      
      if (eventDateStr > dateStr) break // Parar se passar da data

      if (event.event_type === 'start_allocation' && event.status === 'approved') {
        isAllocated = true
        isInDowntime = false // Reset downtime on new allocation just in case
        lastAllocationStart = eventDateStr
      } else if (event.event_type === 'end_allocation' && event.status === 'approved') {
        // Se o fim é exatamente hoje, ainda conta como alocado? Normalmente fim é inclusivo ou exclusivo?
        // Vamos assumir que end_allocation marca o fim, então se eventDateStr <= dateStr, não está mais alocado
        // Mas se o evento foi HOJE, ela trabalhou hoje? Depende da hora, mas para dia inteiro, vamos considerar que encerrou.
        // Se o end_allocation for no dia X, dia X ainda pode ter trabalho? 
        // Geralmente "fim de alocação" é o último dia. Vamos considerar que no dia do fim ela ainda estava lá?
        // Se end_allocation é 15/01, dia 15 ela estava lá? Sim. Dia 16 não.
        if (eventDateStr < dateStr) { 
           isAllocated = false
        } else if (eventDateStr === dateStr) {
           // No dia do fim, ela ainda conta como alocada
           isAllocated = true
        }
      } else if (event.event_type === 'downtime_start' && event.status === 'approved') {
        if (isAllocated) isInDowntime = true
      } else if (event.event_type === 'downtime_end' && event.status === 'approved') {
        if (isAllocated) isInDowntime = false
      }
    }

    if (!isAllocated) return 'not-allocated'
    if (isInDowntime) return 'maintenance'
    
    // Verificar se é futuro e solicitado
    const today = new Date().toISOString().split('T')[0]
    if (dateStr > today) {
        // Lógica futura simplificada: se está alocado (sem fim definido), é 'working' (verde) ou 'requested' (azul)?
        // Se já começou, é working (verde planejado).
        return 'working' 
    }

    return 'working'
  }

  // Filtrar eventos para o histórico
  const machineHistoryEvents = useMemo(() => {
    if (!selectedMachineId) return []
    return events
      .filter(e => e.machine_id === selectedMachineId || e.machine?.id === selectedMachineId)
      .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
  }, [events, selectedMachineId])

  const isCurrentMonthSelected = 
    calendarMonth.getMonth() === new Date().getMonth() && 
    calendarMonth.getFullYear() === new Date().getFullYear()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
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
                    Máquinas
                  </h3>
                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium rounded-full">
                    {allocations.length}
                  </span>
                </div>

                {allocations.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">Nenhuma máquina alocada nesta obra</p>
                ) : (
                  <div className="space-y-3">
                    {allocations.map((allocation) => {
                      const isSelected = selectedMachineId === allocation.machine_id
                      
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
                                allocation.is_in_downtime
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              }`}>
                                {allocation.is_in_downtime ? 'Downtime' : 'Ativa'}
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
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                          Visualização Mensal
                        </span>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                          {calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </h3>
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
                      {/* Lado Esquerdo: Legenda */}
                      <div className="xl:w-64 flex-shrink-0">
                        <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
                          Legenda
                        </h4>
                        <div className="space-y-3 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors">
                            <div className="w-3 h-3 bg-green-500 rounded-full ring-2 ring-green-100 dark:ring-green-900/30"></div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Em Funcionamento</span>
                          </div>
                          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors">
                            <div className="w-3 h-3 bg-orange-500 rounded-full ring-2 ring-orange-100 dark:ring-orange-900/30"></div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Em Manutenção</span>
                          </div>
                          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors">
                            <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Não Alocado</span>
                          </div>
                        </div>

                        {!selectedMachineId && (
                           <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl border border-yellow-100 dark:border-yellow-800">
                             <p className="text-xs text-yellow-700 dark:text-yellow-200">
                               Selecione uma máquina à esquerda para visualizar sua distribuição no calendário.
                             </p>
                           </div>
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
                                const dayStatus = getDayStatus(currentDate, selectedMachineId, events)
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
                                            : dayStatus === 'requested'
                                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
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
                      <div className="space-y-6">
                        {machineHistoryEvents.map((event, index) => {
                          const isLast = index === machineHistoryEvents.length - 1
                          
                          // Configuração visual baseada no tipo de evento
                          let icon = (
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                             </svg>
                          )
                          let colorClass = "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                          let title = "Evento"

                          switch(event.event_type) {
                            case 'start_allocation':
                              icon = <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              colorClass = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              title = "Início de Alocação"
                              break
                            case 'end_allocation':
                              icon = <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                              colorClass = "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                              title = "Fim de Alocação"
                              break
                            case 'downtime_start':
                              icon = <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                              colorClass = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              title = "Início de Manutenção"
                              break
                            case 'downtime_end':
                              icon = <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              colorClass = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              title = "Fim de Manutenção"
                              break
                          }

                          return (
                            <div key={event.id} className="relative flex gap-4">
                              {/* Linha conectora */}
                              {!isLast && (
                                <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 -ml-px"></div>
                              )}
                              
                              {/* Ícone */}
                              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-gray-800 ${colorClass}`}>
                                {icon}
                              </div>

                              {/* Conteúdo */}
                              <div className="flex-1 pt-1 pb-6">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                                    {title}
                                  </h4>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                    {new Date(event.event_date).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                                
                                <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                  {event.downtime_reason && (
                                    <div className="mb-1">
                                      <span className="font-medium">Motivo:</span> {event.downtime_reason}
                                    </div>
                                  )}
                                  {event.downtime_description && (
                                    <div className="italic text-gray-500 dark:text-gray-400">
                                      "{event.downtime_description}"
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

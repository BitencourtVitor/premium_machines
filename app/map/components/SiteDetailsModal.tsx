import { useState } from 'react'
import MachineImage from '@/app/components/MachineImage'

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

  if (!isOpen) return null

  // Helper function for day status
  const getDayStatus = (date: Date, allocations: any[], events: any[]) => {
    const dateStr = date.toISOString().split('T')[0]
    const today = new Date().toISOString().split('T')[0]

    // Se é futuro, verificar se há solicitação aprovada para começar
    if (dateStr > today) {
      // Se há solicitações, verificar se já foi iniciado
      const hasStarted = events.some(event =>
        event.event_type === 'start_allocation' &&
        event.site?.id === site?.id &&
        event.status === 'approved' &&
        new Date(event.event_date).toISOString().split('T')[0] <= dateStr
      )

      if (!hasStarted) {
        return 'requested'
      }
    }

    // Para cada máquina alocada neste dia, verificar se estava em manutenção
    for (const allocation of allocations) {
      // Verificar se a máquina estava alocada neste dia
      const allocationStart = new Date(allocation.allocation_start).toISOString().split('T')[0]
      const isAllocatedOnDate = dateStr >= allocationStart

      if (isAllocatedOnDate) {
        // Verificar se havia downtime ativo neste dia
        const activeDowntime = events.find(event =>
          event.event_type === 'downtime_start' &&
          event.machine_id === allocation.machine_id &&
          event.status === 'approved' &&
          new Date(event.event_date).toISOString().split('T')[0] <= dateStr &&
          !events.some(endEvent =>
            endEvent.event_type === 'downtime_end' &&
            endEvent.corrects_event_id === event.id &&
            endEvent.status === 'approved' &&
            new Date(endEvent.event_date).toISOString().split('T')[0] <= dateStr
          )
        )

        if (activeDowntime) {
          return 'maintenance'
        }

        return 'working'
      }
    }

    return 'not-allocated'
  }

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
              {/* Máquinas Alocadas */}
              <div className="p-6 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
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
                      // Determinar o caminho da imagem baseado no tipo de máquina
                      const getMachineImagePath = () => {
                        if (!allocation.machine_type) return null

                        let imageName = allocation.machine_type.toLowerCase().replace(/\s+/g, '-')

                        // Alguns tipos usam JPG ao invés de PNG
                        const jpgTypes = ['fork-extensions', 'man-basket', 'truss-boom']
                        const extension = jpgTypes.includes(imageName) ? '.jpg' : '.png'

                        return `/${imageName}${extension}`
                      }

                      const machineImagePath = getMachineImagePath()

                      return (
                        <div key={allocation.allocation_event_id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
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
                              <span className="font-medium text-gray-900 dark:text-white">
                                {allocation.machine_unit_number}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                allocation.is_in_downtime
                                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              }`}>
                                {allocation.is_in_downtime ? 'Em Downtime' : 'Operando'}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                allocation.machine_ownership === 'owned'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                  : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                              }`}>
                                {allocation.machine_ownership === 'owned' ? 'Própria' : 'Alugada'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {allocation.machine_type}
                              {allocation.machine_supplier_name && (
                                <span className="ml-2">• {allocation.machine_supplier_name}</span>
                              )}
                            </p>
                            {allocation.construction_type && allocation.lot_building_number && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {allocation.construction_type === 'lot' ? 'lot' : 'building'} {allocation.lot_building_number}
                              </p>
                            )}
                          </div>

                          {/* Ícone de olho */}
                          <button
                            onClick={() => window.dispatchEvent(new CustomEvent('openMachineDetails', {
                              detail: { machineId: allocation.machine_id, siteId: site?.id }
                            }))}
                            className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Ver detalhes da máquina"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                            </svg>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Calendário e Legenda */}
              <div className="col-span-2 flex flex-col h-full bg-white dark:bg-gray-800">
                {/* Cabeçalho do Calendário */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                      Calendário de Obras
                    </span>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                      {calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </h3>
                  </div>
                  
                  <div className="flex items-center bg-gray-50 dark:bg-gray-700/50 rounded-xl p-1.5 shadow-sm border border-gray-100 dark:border-gray-600">
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
                      className="px-4 py-2 mx-1 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-600 rounded-lg transition-all shadow-sm hover:shadow"
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
                      Legenda de Status
                    </h4>
                    <div className="space-y-3 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors">
                        <div className="w-3 h-3 bg-blue-500 rounded-full ring-2 ring-blue-100 dark:ring-blue-900/30"></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Solicitado</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors">
                        <div className="w-3 h-3 bg-green-500 rounded-full ring-2 ring-green-100 dark:ring-green-900/30"></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Funcionando</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors">
                        <div className="w-3 h-3 bg-orange-500 rounded-full ring-2 ring-orange-100 dark:ring-orange-900/30"></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Manutenção</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors">
                        <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Não solicitado</span>
                      </div>
                    </div>

                    {/* Resumo do Mês (Opcional) */}
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                       <h4 className="text-xs font-bold text-blue-600 dark:text-blue-300 uppercase tracking-wider mb-2">
                         Dica
                       </h4>
                       <p className="text-xs text-blue-700 dark:text-blue-200 leading-relaxed">
                         Visualize rapidamente o status das máquinas dia a dia. Dias com manutenção têm prioridade visual sobre funcionamento.
                       </p>
                    </div>
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
                          const lastDay = new Date(year, month + 1, 0)
                          const startDate = new Date(firstDay)
                          startDate.setDate(startDate.getDate() - firstDay.getDay())

                          const days = []
                          const currentDate = new Date(startDate)

                          // Generate 6 weeks to ensure consistent height
                          for (let i = 0; i < 42; i++) {
                            const dayStatus = getDayStatus(currentDate, allocations, events)
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

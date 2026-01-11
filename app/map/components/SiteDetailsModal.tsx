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
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {site?.title || 'Detalhes da Obra'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Máquinas Alocadas ({allocations.length})
                </h3>

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
                                {allocation.construction_type === 'lot' ? 'Lote' : 'Prédio'} {allocation.lot_building_number}
                              </p>
                            )}
                          </div>

                          {/* Ícone de olho */}
                          <button
                            onClick={() => window.dispatchEvent(new CustomEvent('openMachineDetails', {
                              detail: { machineId: allocation.machine_id, siteId: siteDetails?.id }
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

              {/* Calendário */}
              <div className="col-span-2 p-4 md:p-6 overflow-y-auto">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white capitalize text-center sm:text-left">
                    {calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                      className="w-12 h-12 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors text-gray-600 dark:text-gray-300"
                      aria-label="Mês anterior"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setCalendarMonth(new Date())}
                      className="h-12 px-6 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      Hoje
                    </button>
                    <button
                      onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                      className="w-12 h-12 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors text-gray-600 dark:text-gray-300"
                      aria-label="Próximo mês"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Legenda */}
                <div className="flex flex-wrap gap-3 mb-6 justify-center sm:justify-start">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">Solicitado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">Funcionando</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-500 rounded"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">Manutenção</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-300 rounded"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">Não solicitado</span>
                  </div>
                </div>

                {/* Grade do Calendário */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {/* Cabeçalhos dos dias da semana */}
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                    <div key={day} className="py-2 text-center text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {day}
                    </div>
                  ))}

                  {/* Dias do mês */}
                  {(() => {
                    const year = calendarMonth.getFullYear()
                    const month = calendarMonth.getMonth()
                    const firstDay = new Date(year, month, 1)
                    const lastDay = new Date(year, month + 1, 0)
                    const startDate = new Date(firstDay)
                    startDate.setDate(startDate.getDate() - firstDay.getDay())

                    const days = []
                    const currentDate = new Date(startDate)

                    while (currentDate <= lastDay || days.length < 42) {
                      const dayStatus = getDayStatus(currentDate, allocations, events)
                      const isCurrentMonth = currentDate.getMonth() === month

                      days.push(
                        <div
                          key={currentDate.toISOString()}
                          className={`aspect-square flex items-center justify-center text-sm sm:text-base font-medium border rounded-xl transition-all ${
                            isCurrentMonth
                              ? dayStatus === 'working'
                                ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-900 dark:text-green-100'
                                : dayStatus === 'maintenance'
                                ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-900 dark:text-orange-100'
                                : dayStatus === 'requested'
                                ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500'
                              : 'bg-gray-50 dark:bg-gray-900/50 border-transparent text-gray-300 dark:text-gray-600'
                          }`}
                        >
                          {currentDate.getDate()}
                        </div>
                      )

                      currentDate.setDate(currentDate.getDate() + 1)
                    }

                    return days
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

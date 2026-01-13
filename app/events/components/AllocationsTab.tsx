import React from 'react'
import { ActiveAllocation, ActiveDowntime } from '../types'
import { DOWNTIME_REASON_LABELS } from '@/lib/permissions'
import { formatDate } from '../utils'
import { FiCalendar, FiMapPin, FiTool, FiAlertTriangle, FiCheckCircle, FiPlay, FiStopCircle, FiXCircle, FiRefreshCw } from 'react-icons/fi'

interface AllocationsTabProps {
  activeAllocations: ActiveAllocation[]
  loadingAllocations: boolean
  loadActiveAllocations: () => void
  user: any
  setShowCreateModal: (show: boolean) => void
  handleNewEvent: () => void
  handleStartDowntime: (allocation: ActiveAllocation) => void
  handleEndAllocation: (allocation: ActiveAllocation) => void
  handleEndDowntime: (downtime: ActiveDowntime) => void
  activeDowntimes: ActiveDowntime[]
  creating: boolean
}

export default function AllocationsTab({
  activeAllocations,
  loadingAllocations,
  loadActiveAllocations,
  user,
  setShowCreateModal,
  handleNewEvent,
  handleStartDowntime,
  handleEndAllocation,
  handleEndDowntime,
  activeDowntimes,
  creating
}: AllocationsTabProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 gap-2">
        <div>
          <h2 className="text-base font-normal text-gray-500 dark:text-gray-400">
            Máquinas Alocadas
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadActiveAllocations}
            className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={loadingAllocations}
            title="Atualizar"
            aria-label="Atualizar lista"
          >
            <FiRefreshCw className={`w-5 h-5 ${loadingAllocations ? 'animate-spin' : ''}`} />
          </button>
          {(user?.can_register_events || user?.role === 'admin' || user?.role === 'dev') && (
            <button
              onClick={handleNewEvent}
              className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Novo Evento"
              aria-label="Criar novo evento"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {loadingAllocations ? (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-gray-400"></div>
        </div>
      ) : activeAllocations.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">Nenhuma máquina alocada</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Crie um evento de &quot;Alocação de Máquina&quot; para começar
          </p>
        </div>
      ) : (
        <div className="p-4 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeAllocations.map((allocation) => (
            <div key={allocation.allocation_event_id} className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-gray-900 dark:text-white">
                      {allocation.machine_unit_number}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      allocation.is_in_downtime 
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {allocation.is_in_downtime ? <FiAlertTriangle size={12} /> : <FiCheckCircle size={12} />}
                      {allocation.is_in_downtime ? 'Em Downtime' : 'Operando'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {/* Machine Type & Ownership */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <FiTool className="text-gray-400 flex-shrink-0" />
                    <span>
                      {allocation.machine_type}
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                         ({allocation.machine_ownership === 'owned' ? 'Própria' : 'Alugada'})
                      </span>
                    </span>
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-2 text-sm text-blue-600 dark:text-blue-400">
                    <FiMapPin className="text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{allocation.site_title}</p>
                      {(allocation.construction_type || allocation.lot_building_number) && (
                        <p className="text-xs text-blue-500/80">
                          {allocation.construction_type === 'lot' ? 'Lote' : 'Prédio'} {allocation.lot_building_number}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Downtime Reason */}
                  {allocation.is_in_downtime && allocation.current_downtime_reason && (
                    <div className="flex items-start gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                      <FiAlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" />
                      <p>
                        {DOWNTIME_REASON_LABELS[allocation.current_downtime_reason] || allocation.current_downtime_reason}
                      </p>
                    </div>
                  )}

                  {/* Allocation Start */}
                  <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <FiCalendar className="text-gray-400 flex-shrink-0" />
                    <span>Desde: {formatDate(allocation.allocation_start)}</span>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              {(user?.can_register_events || user?.role === 'admin' || user?.role === 'dev') && (
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-600 flex justify-end gap-2">
                  {!allocation.is_in_downtime && (
                    <>
                      <button
                        onClick={() => handleStartDowntime(allocation)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 rounded-lg transition-colors"
                        title="Iniciar Downtime"
                      >
                        <FiStopCircle />
                        Parada
                      </button>
                      <button
                        onClick={() => handleEndAllocation(allocation)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                        disabled={creating}
                        title="Encerrar Alocação"
                      >
                        <FiXCircle />
                        Encerrar
                      </button>
                    </>
                  )}
                  {allocation.is_in_downtime && (
                    <button
                      onClick={() => {
                        const downtime = activeDowntimes.find(d => d.machine_id === allocation.machine_id)
                        if (downtime) handleEndDowntime(downtime)
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-lg transition-colors"
                      disabled={creating}
                      title="Finalizar Downtime"
                    >
                      <FiPlay />
                      Retomar
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

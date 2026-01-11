import React from 'react'
import { ActiveAllocation, ActiveDowntime } from '../types'
import { DOWNTIME_REASON_LABELS } from '@/lib/permissions'
import { formatDate } from '../utils'

interface AllocationsTabProps {
  activeAllocations: ActiveAllocation[]
  loadingAllocations: boolean
  loadActiveAllocations: () => void
  user: any
  setShowCreateModal: (show: boolean) => void
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
            Máquinas Alocadas • {activeAllocations.length}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadActiveAllocations}
            className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={loadingAllocations}
            title="Atualizar"
          >
            <svg className={`w-5 h-5 ${loadingAllocations ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {(user?.can_register_events || user?.role === 'admin' || user?.role === 'dev') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Novo Evento"
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
            Crie um evento de &quot;Início de Alocação&quot; para começar
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700 md:flex-1 md:overflow-y-auto">
          {activeAllocations.map((allocation) => (
            <div key={allocation.allocation_event_id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {allocation.machine_unit_number}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      allocation.is_in_downtime 
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {allocation.is_in_downtime ? 'Em Downtime' : 'Operando'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      allocation.machine_ownership === 'owned'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    }`}>
                      {allocation.machine_ownership === 'owned' ? 'Própria' : 'Alugada'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {allocation.machine_type}
                    {allocation.machine_supplier_name && (
                      <span className="text-gray-400 dark:text-gray-500"> • {allocation.machine_supplier_name}</span>
                    )}
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    📍 {allocation.site_title}
                    {allocation.construction_type && allocation.lot_building_number && (
                      <span className="ml-2">
                        • {allocation.construction_type === 'lot' ? 'Lote' : 'Prédio'} {allocation.lot_building_number}
                      </span>
                    )}
                  </p>
                  {allocation.is_in_downtime && allocation.current_downtime_reason && (
                    <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                      ⚠️ {DOWNTIME_REASON_LABELS[allocation.current_downtime_reason] || allocation.current_downtime_reason}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Alocada desde: {formatDate(allocation.allocation_start)}
                  </p>
                </div>
                
                {(user?.can_register_events || user?.role === 'admin' || user?.role === 'dev') && (
                  <div className="flex flex-col gap-1 ml-2">
                    {!allocation.is_in_downtime && (
                      <>
                        <button
                          onClick={() => handleStartDowntime(allocation)}
                          className="px-3 py-1 text-xs text-yellow-600 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-700 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                          title="Iniciar Downtime"
                        >
                          Parada
                        </button>
                        <button
                          onClick={() => handleEndAllocation(allocation)}
                          className="px-3 py-1 text-xs text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          disabled={creating}
                          title="Encerrar Alocação"
                        >
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
                        className="px-3 py-1 text-xs text-green-600 dark:text-green-400 border border-green-300 dark:border-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                        disabled={creating}
                        title="Finalizar Downtime"
                      >
                        Retomar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

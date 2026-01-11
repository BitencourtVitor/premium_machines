import { SiteMetrics } from '../types'

interface MetricsCardsProps {
  metrics: SiteMetrics
  loadingMetrics: boolean
}

export default function MetricsCards({ metrics, loadingMetrics }: MetricsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 flex-shrink-0 min-w-0">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden min-w-0">
        <div className="p-3 md:p-4">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">Obras Ativas</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {loadingMetrics ? '...' : metrics.totalActiveSites}
              </p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-1.5 md:p-2 flex-shrink-0">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden min-w-0">
        <div className="p-3 md:p-4">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">Máquinas Alocadas</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {loadingMetrics ? '...' : metrics.totalMachinesAllocated}
              </p>
            </div>
            <div className="bg-green-100 dark:bg-green-900 rounded-full p-1.5 md:p-2 flex-shrink-0">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden min-w-0">
        <div className="p-3 md:p-4">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">Alocações Pendentes</p>
              <p className={`text-xl md:text-2xl font-bold mt-1 ${metrics.pendingAllocations > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}>
                {loadingMetrics ? '...' : metrics.pendingAllocations}
              </p>
            </div>
            <div className={`rounded-full p-1.5 md:p-2 flex-shrink-0 ${metrics.pendingAllocations > 0 ? 'bg-yellow-100 dark:bg-yellow-900' : 'bg-gray-100 dark:bg-gray-700'}`}>
              <svg className={`w-4 h-4 md:w-5 md:h-5 ${metrics.pendingAllocations > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden min-w-0">
        <div className="p-3 md:p-4">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">Máquinas com Problemas</p>
              <p className={`text-xl md:text-2xl font-bold mt-1 ${metrics.machinesWithIssues > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                {loadingMetrics ? '...' : metrics.machinesWithIssues}
              </p>
            </div>
            <div className={`rounded-full p-1.5 md:p-2 flex-shrink-0 ${metrics.machinesWithIssues > 0 ? 'bg-red-100 dark:bg-red-900' : 'bg-gray-100 dark:bg-gray-700'}`}>
              <svg className={`w-4 h-4 md:w-5 md:h-5 ${metrics.machinesWithIssues > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

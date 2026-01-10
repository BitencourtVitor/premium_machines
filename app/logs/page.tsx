'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '../components/Header'
import BottomNavigation from '../components/BottomNavigation'
import Sidebar from '../components/Sidebar'
import CustomDropdown from '../components/CustomDropdown'
import CustomInput from '../components/CustomInput'
import { useSession } from '@/lib/useSession'
import { useSidebar } from '@/lib/useSidebar'

interface Log {
  id: string
  entidade: string
  entidade_id: string
  acao: string
  dados_antes: any
  dados_depois: any
  usuario_id: string
  created_at: string
  users: {
    id: string
    nome: string
    role: string
  } | null
}

export default function LogsPage() {
  const router = useRouter()
  const { user, loading: sessionLoading } = useSession()
  const { isExpanded } = useSidebar()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<Log[]>([])
  const [allLogs, setAllLogs] = useState<Log[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  
  const [filterEntity, setFilterEntity] = useState<string>('all')
  const [filterAction, setFilterAction] = useState<string>('all')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')
  const [searchText, setSearchText] = useState<string>('')
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true)
    try {
      const params = new URLSearchParams({
        ...(user?.id && { userId: user.id }),
        ...(user?.role && { userRole: user.role }),
      })

      const response = await fetch(`/api/logs?${params.toString()}`)
      const data = await response.json()

      if (response.ok && data.success) {
        setAllLogs(data.logs || [])
      } else {
        console.error('Erro ao carregar logs:', data.error)
      }
    } catch (error) {
      console.error('Erro ao carregar logs:', error)
    } finally {
      setLoadingLogs(false)
    }
  }, [user])

  useEffect(() => {
    if (sessionLoading) return

    if (!user) {
      router.push('/login')
      return
    }
      
    if (!user.can_view_logs && user.role !== 'admin' && user.role !== 'dev') {
      router.push('/dashboard')
      return
    }
    
    loadLogs()
    setLoading(false)
  }, [user, sessionLoading, router, loadLogs])

  const formatLogAction = (log: Log): string => {
    const action = log.acao
    const entity = log.entidade

    switch (action) {
      case 'insert':
        return `Criou ${entity}`
      case 'update':
        return `Atualizou ${entity}`
      case 'delete':
        return `Deletou ${entity}`
      default:
        return `${action} ${entity}`
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'dev':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        )
      case 'admin':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'insert':
        return (
          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        )
      case 'update':
        return (
          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        )
      case 'delete':
        return (
          <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        )
      default:
        return null
    }
  }

  const toggleLogExpansion = (logId: string) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedLogs(newExpanded)
  }

  const uniqueEntities = Array.from(new Set(allLogs.map(log => log.entidade)))
  const uniqueActions = Array.from(new Set(allLogs.map(log => log.acao)))

  const filteredLogs = allLogs.filter(log => {
    if (filterEntity !== 'all' && log.entidade !== filterEntity) return false
    if (filterAction !== 'all' && log.acao !== filterAction) return false
    
    if (filterDateFrom) {
      const logDate = new Date(log.created_at)
      const fromDate = new Date(filterDateFrom)
      if (logDate < fromDate) return false
    }
    if (filterDateTo) {
      const logDate = new Date(log.created_at)
      const toDate = new Date(filterDateTo)
      toDate.setHours(23, 59, 59, 999)
      if (logDate > toDate) return false
    }
    
    if (searchText) {
      const searchLower = searchText.toLowerCase()
      const actionText = formatLogAction(log).toLowerCase()
      const userText = log.users?.nome?.toLowerCase() || ''
      if (!actionText.includes(searchLower) && !userText.includes(searchLower)) return false
    }
    
    return true
  })

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage)

  const clearFilters = () => {
    setFilterEntity('all')
    setFilterAction('all')
    setFilterDateFrom('')
    setFilterDateTo('')
    setSearchText('')
    setCurrentPage(1)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-gray-400"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen md:h-screen md:max-h-screen bg-gray-50 dark:bg-gray-900 pb-safe-content md:pb-0 md:flex md:flex-col md:overflow-hidden">
      <Header title="Logs" />
      <div className="flex md:flex-1 md:overflow-hidden">
        <Sidebar />
        <main className={`flex-1 p-4 md:p-6 md:overflow-hidden md:flex md:flex-col transition-all duration-250 ease-in-out ${isExpanded ? 'md:ml-48 lg:ml-64' : 'md:ml-16 lg:ml-20'}`}>
          <div className="max-w-7xl mx-auto md:flex md:flex-col md:flex-1 md:overflow-hidden md:w-full">
            {/* Search Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 flex-shrink-0">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <CustomInput
                    type="text"
                    placeholder="Buscar logs..."
                    value={searchText}
                    onChange={(e) => {
                      setSearchText(e.target.value)
                      setCurrentPage(1)
                    }}
                  />
                </div>
                {(filterEntity !== 'all' || filterAction !== 'all' || filterDateFrom || filterDateTo || searchText) && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 flex-shrink-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <CustomDropdown
                  label="Entidade"
                  value={filterEntity}
                  onChange={(value) => {
                    setFilterEntity(value)
                    setCurrentPage(1)
                  }}
                  options={[
                    { value: 'all', label: 'Todas' },
                    ...uniqueEntities.map(entity => ({ value: entity, label: entity }))
                  ]}
                />
                <CustomDropdown
                  label="Ação"
                  value={filterAction}
                  onChange={(value) => {
                    setFilterAction(value)
                    setCurrentPage(1)
                  }}
                  options={[
                    { value: 'all', label: 'Todas' },
                    ...uniqueActions.map(action => ({ value: action, label: action }))
                  ]}
                />
                <CustomInput
                  label="Data Inicial"
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => {
                    setFilterDateFrom(e.target.value)
                    setCurrentPage(1)
                  }}
                />
                <CustomInput
                  label="Data Final"
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => {
                    setFilterDateTo(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
            </div>

            {/* Results Count */}
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">
              Mostrando {paginatedLogs.length} de {filteredLogs.length} logs
              {filteredLogs.length !== allLogs.length && ` (filtrados de ${allLogs.length} total)`}
            </div>

            {/* Logs List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Histórico de Atividades</h2>
                <button
                  onClick={loadLogs}
                  className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  disabled={loadingLogs}
                  title="Atualizar"
                >
                  <svg className={`w-5 h-5 ${loadingLogs ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              
              {loadingLogs ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-gray-400"></div>
                </div>
              ) : paginatedLogs.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    {allLogs.length === 0 ? 'Nenhum log registrado.' : 'Nenhum log corresponde aos filtros.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700 md:flex-1 md:overflow-y-auto">
                    {paginatedLogs.map((log) => {
                      const isExpanded = expandedLogs.has(log.id)
                      return (
                        <div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {getActionIcon(log.acao)}
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {formatLogAction(log)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {log.users?.role && (
                                  <div className="text-gray-500 dark:text-gray-400">
                                    {getRoleIcon(log.users.role)}
                                  </div>
                                )}
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {log.users?.nome || 'Usuário desconhecido'}
                                </span>
                                <span className="text-gray-300 dark:text-gray-600">•</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {new Date(log.created_at).toLocaleString('pt-BR')}
                                </span>
                              </div>
                              
                              {isExpanded && (
                                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Detalhes</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      <span className="font-medium">Entidade:</span> {log.entidade}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      <span className="font-medium">ID:</span> {log.entidade_id}
                                    </p>
                                  </div>
                                  
                                  {log.dados_antes && (
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Antes</h4>
                                      <pre className="text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-2 rounded overflow-auto max-h-40 border border-gray-200 dark:border-gray-600">
                                        {JSON.stringify(log.dados_antes, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  
                                  {log.dados_depois && (
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Depois</h4>
                                      <pre className="text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-2 rounded overflow-auto max-h-40 border border-gray-200 dark:border-gray-600">
                                        {JSON.stringify(log.dados_depois, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <button
                              onClick={() => toggleLogExpansion(log.id)}
                              className="ml-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                              title={isExpanded ? 'Recolher' : 'Expandir'}
                            >
                              <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Página {currentPage} de {totalPages}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Anterior
                        </button>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Próxima
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      <BottomNavigation />
    </div>
  )
}

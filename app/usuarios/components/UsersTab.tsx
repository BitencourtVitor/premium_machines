import { useState, useEffect } from 'react'
import { getRoleIcon } from './UserIcons'

interface UsersTabProps {
  users: any[]
  loading: boolean
  onReload: () => void
  onEdit: (user?: any) => void
  onValidate: (user: any) => void
  onDelete: (user: any) => void
}

export default function UsersTab({
  users,
  loading,
  onReload,
  onEdit,
  onValidate,
  onDelete
}: UsersTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [showOnlyPending, setShowOnlyPending] = useState(false)

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.relative')) {
        setShowSearchDropdown(false)
      }
    }

    if (showSearchDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSearchDropdown])

  const filteredUsers = users.filter(u => {
    // Mostrar apenas usuários internos (sem supplier_id) na aba users
    if (u.supplier_id && u.supplier_id !== null) return false
    
    if (showOnlyPending && u.validado) return false
    if (searchQuery.trim() && !u.nome.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const pendingCount = users.filter(u => !u.validado && u.role !== 'fornecedor').length

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 gap-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {showOnlyPending ? 'Usuários Pendentes' : 'Lista de Usuários'}
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowSearchDropdown(!showSearchDropdown)}
              className={`p-2 rounded-lg transition-colors ${
                searchQuery.trim()
                  ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
                  : showSearchDropdown
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-gray-700'
                  : 'text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Buscar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            {showSearchDropdown && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-10">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar usuário..."
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      title="Limpar busca"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          {pendingCount > 0 && (
            <button
              onClick={() => setShowOnlyPending(!showOnlyPending)}
              className={`p-2 rounded-lg transition-colors ${
                showOnlyPending
                  ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                  : 'text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
              }`}
              title={`Pendentes (${pendingCount})`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </button>
          )}
          <button
            onClick={onReload}
            className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={loading}
            title="Atualizar"
          >
            {loading ? (
              <svg className="w-5 h-5 animate-spin-reverse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>
          <button 
            onClick={() => onEdit()}
            className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Novo Usuário"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

    {loading ? (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-gray-400"></div>
      </div>
    ) : filteredUsers.length === 0 ? (
      <div className="p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          Nenhum funcionário encontrado.
        </p>
      </div>
    ) : (
      <div className="divide-y divide-gray-200 dark:divide-gray-700 md:flex-1 md:overflow-y-auto">
        {filteredUsers.map((u) => (
          <div key={u.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-gray-600 dark:text-gray-400">
                  {getRoleIcon(u.role)}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{u.nome}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{u.role}</p>
                </div>
                {!u.validado && (
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
                    Pendente
                  </span>
                )}
              </div>
              {u.role !== 'dev' && (
                <div className="flex items-center gap-2">
                  {!u.validado && (
                    <button
                      onClick={() => onValidate(u)}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Validar
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(u)}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(u)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title="Deletar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
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
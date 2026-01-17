import { useState } from 'react'
import { getRoleIcon } from './UserIcons'
import BaseList from '@/app/components/BaseList'
import ListActionButton from '@/app/components/ListActionButton'
import { HiOutlineExclamationTriangle } from 'react-icons/hi2'

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
  const [showOnlyPending, setShowOnlyPending] = useState(false)

  const filteredUsers = users.filter(u => {
    // Mostrar apenas usuários internos (sem supplier_id) na aba users
    if (u.supplier_id && u.supplier_id !== null) return false
    
    if (showOnlyPending && u.validado) return false
    return true
  })

  const pendingCount = users.filter(u => !u.validado && u.role !== 'fornecedor').length

  return (
    <BaseList
      title={showOnlyPending ? 'Usuários Pendentes' : 'Usuários'}
      items={filteredUsers}
      totalCount={filteredUsers.length}
      loading={loading}
      onRefresh={onReload}
      showRefresh={true}
      showAdd={true}
      onAdd={() => onEdit()}
      showSearch={true}
      searchPlaceholder="Buscar usuário..."
      searchFields={['nome']}
      emptyMessage="Nenhum funcionário encontrado."
      emptyConfig={{
        icon: <HiOutlineExclamationTriangle className="w-12 h-12" />,
        title: "Nenhum usuário",
        description: showOnlyPending ? "Não há usuários aguardando validação no momento." : "Nenhum funcionário cadastrado no sistema."
      }}
      filterPanelContent={
        pendingCount > 0 ? (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowOnlyPending(!showOnlyPending)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                showOnlyPending
                  ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <HiOutlineExclamationTriangle className="w-5 h-5 text-yellow-500" />
                <span className="text-sm font-medium">Apenas Pendentes</span>
              </div>
              <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full text-xs font-bold">
                {pendingCount}
              </span>
            </button>
          </div>
        ) : null
      }
      showFilter={pendingCount > 0}
      isFiltering={showOnlyPending}
      filterConfig={{
        title: 'Filtros de Usuários',
        popoverWidth: 'w-64'
      }}
      onClearFilters={() => setShowOnlyPending(false)}
      renderItem={(u) => (
        <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
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
                  <ListActionButton
                    icon="check"
                    onClick={() => onValidate(u)}
                    variant="green"
                    title="Validar"
                  />
                )}
                <ListActionButton
                  icon="edit"
                  onClick={() => onEdit(u)}
                  variant="blue"
                  title="Editar"
                />
                <ListActionButton
                  icon="delete"
                  onClick={() => onDelete(u)}
                  variant="red"
                  title="Deletar"
                />
              </div>
            )}
          </div>
        </div>
      )}
    />
  )
}
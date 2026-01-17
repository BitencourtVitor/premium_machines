import { useState } from 'react'
import { getRoleIcon, getSupplierIcon } from './UserIcons'
import BaseList from '@/app/components/BaseList'
import ListActionButton from '@/app/components/ListActionButton'
import { HiOutlineBuildingOffice2 } from 'react-icons/hi2'

interface SuppliersTabProps {
  suppliers: any[]
  users: any[]
  loadingSuppliers: boolean
  showArchivedSuppliers: boolean
  expandedSuppliers: Set<string>
  onToggleExpand: (supplierId: string) => void
  onEditSupplier: (supplier?: any) => void
  onArchiveSupplier: (supplier: any) => void
  onUnarchiveSupplier: (supplier: any) => void
  onReload: (showArchived: boolean) => void
  onToggleArchived: (show: boolean) => void
  onValidateUser: (user: any) => void
  onEditUser: (user: any) => void
  onDeleteUser: (user: any) => void
}

export default function SuppliersTab({
  suppliers,
  users,
  loadingSuppliers,
  showArchivedSuppliers,
  expandedSuppliers,
  onToggleExpand,
  onEditSupplier,
  onArchiveSupplier,
  onUnarchiveSupplier,
  onReload,
  onToggleArchived,
  onValidateUser,
  onEditUser,
  onDeleteUser,
}: SuppliersTabProps) {
  return (
    <BaseList
      title={showArchivedSuppliers ? 'Fornecedores Arquivados' : 'Fornecedores'}
      items={suppliers}
      totalCount={suppliers.length}
      loading={loadingSuppliers}
      onRefresh={() => onReload(showArchivedSuppliers)}
      showRefresh={true}
      showArchive={true}
      onArchive={() => onToggleArchived(!showArchivedSuppliers)}
      isArchivedView={showArchivedSuppliers}
      showAdd={!showArchivedSuppliers}
      onAdd={() => onEditSupplier()}
      showSearch={true}
      searchPlaceholder="Buscar fornecedor..."
      searchFields={['nome']}
      emptyMessage="Nenhuma empresa fornecedora cadastrada."
      emptyConfig={{
        icon: <HiOutlineBuildingOffice2 className="w-12 h-12" />,
        title: showArchivedSuppliers ? "Nenhum arquivado" : "Nenhum fornecedor",
        description: showArchivedSuppliers 
          ? "Não há fornecedores arquivados no momento." 
          : "Nenhum fornecedor cadastrado no sistema."
      }}
      renderItem={(supplier) => {
        // Filtrar apenas usuários que têm supplier_id não nulo e que corresponde ao fornecedor atual
        const supplierUsers = users.filter(u => {
          if (!u.supplier_id || u.supplier_id === null) return false
          return String(u.supplier_id).trim() === String(supplier.id).trim()
        })

        return (
          <div key={supplier.id} className="p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-2">
              {/* Mobile: Todo o bloco de informações com botões ao lado */}
              <div className="flex items-start justify-between gap-3 md:hidden">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {(() => {
                    const supplierIcon = getSupplierIcon(supplier.supplier_type || 'rental')
                    return (
                      <div className={`w-10 h-10 rounded-lg ${supplierIcon.bgColor} flex items-center justify-center flex-shrink-0 ${supplierIcon.textColor}`}>
                        {supplierIcon.icon}
                      </div>
                    )
                  })()}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{supplier.nome}</p>
                    <div className="space-y-1 mt-1">
                      {supplier.email && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 break-words">{supplier.email}</p>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400 break-words">
                        {supplier.telefone || 'Sem telefone'}
                      </p>
                      {supplier.supplier_type && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {supplier.supplier_type === 'rental'
                            ? 'Aluguel de Máquinas'
                            : supplier.supplier_type === 'maintenance'
                            ? 'Manutenção'
                            : supplier.supplier_type === 'both'
                            ? 'Alocação e Manutenção'
                            : 'Abastecimento (Combustível)'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <ListActionButton
                    icon="edit"
                    onClick={() => onEditSupplier(supplier)}
                    variant="blue"
                    title="Editar empresa"
                  />
                  <ListActionButton
                    icon={showArchivedSuppliers ? "unarchive" : "archive"}
                    onClick={() => showArchivedSuppliers ? onUnarchiveSupplier(supplier) : onArchiveSupplier(supplier)}
                    variant={showArchivedSuppliers ? "green" : "orange"}
                    title={showArchivedSuppliers ? "Desarquivar empresa" : "Arquivar empresa"}
                  />
                </div>
              </div>

              {/* Desktop: Informações do fornecedor */}
              <div className="hidden md:flex items-center gap-3 flex-1 min-w-0">
                {(() => {
                  const supplierIcon = getSupplierIcon(supplier.supplier_type || 'rental')
                  return (
                    <div className={`w-10 h-10 rounded-lg ${supplierIcon.bgColor} flex items-center justify-center flex-shrink-0 ${supplierIcon.textColor}`}>
                      {supplierIcon.icon}
                    </div>
                  )
                })()}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{supplier.nome}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 break-words">
                    {supplier.email && `${supplier.email} • `}
                    {supplier.telefone || 'Sem telefone'}
                    {supplier.supplier_type &&
                      ` • ${
                        supplier.supplier_type === 'rental'
                          ? 'Aluguel'
                          : supplier.supplier_type === 'maintenance'
                          ? 'Manutenção'
                          : supplier.supplier_type === 'both'
                          ? 'Alocação e Manutenção'
                          : 'Abastecimento'
                      }`}
                  </p>
                </div>
              </div>

              {/* Mobile: Container de usuários abaixo */}
              <div className="md:hidden">
                <div className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-1.5 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="text-gray-500 dark:text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {supplierUsers.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditUser({ role: 'fornecedor', supplier_id: supplier.id })
                      }}
                      className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                      title="Adicionar usuário"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onToggleExpand(supplier.id)}
                      className="p-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    >
                      <svg className={`w-4 h-4 transition-transform duration-200 ${expandedSuppliers.has(supplier.id) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Desktop: Ações */}
              <div className="hidden md:flex items-center gap-4">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="text-gray-500 dark:text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {supplierUsers.length}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditUser({ role: 'fornecedor', supplier_id: supplier.id })
                    }}
                    className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                    title="Adicionar usuário"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onToggleExpand(supplier.id)}
                    className="p-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    title={expandedSuppliers.has(supplier.id) ? "Recolher usuários" : "Expandir usuários"}
                  >
                    <svg className={`w-4 h-4 transition-transform duration-200 ${expandedSuppliers.has(supplier.id) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
                <ListActionButton
                  icon="edit"
                  onClick={() => onEditSupplier(supplier)}
                  variant="blue"
                  title="Editar empresa"
                />
                <ListActionButton
                  icon={showArchivedSuppliers ? "unarchive" : "archive"}
                  onClick={() => showArchivedSuppliers ? onUnarchiveSupplier(supplier) : onArchiveSupplier(supplier)}
                  variant={showArchivedSuppliers ? "green" : "orange"}
                  title={showArchivedSuppliers ? "Desarquivar empresa" : "Arquivar empresa"}
                />
              </div>
            </div>
            {/* Lista expandida de usuários */}
            {expandedSuppliers.has(supplier.id) && supplierUsers.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
                {supplierUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="text-gray-600 dark:text-gray-400 flex-shrink-0">
                        {getRoleIcon(u.role)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.nome}</p>
                        {!u.validado && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
                              Pendente
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!u.validado && (
                        <ListActionButton
                          icon="check"
                          onClick={() => onValidateUser(u)}
                          variant="green"
                          title="Validar"
                        />
                      )}
                      <ListActionButton
                        icon="edit"
                        onClick={() => onEditUser(u)}
                        variant="blue"
                        title="Editar"
                      />
                      <ListActionButton
                        icon="delete"
                        onClick={() => onDeleteUser(u)}
                        variant="red"
                        title="Deletar"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      }}
    />
  )
}

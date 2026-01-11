import { getRoleIcon, getSupplierIcon } from './UserIcons'

interface SuppliersTabProps {
  suppliers: any[]
  users: any[]
  loadingSuppliers: boolean
  showArchivedSuppliers: boolean
  expandedSuppliers: Set<string>
  onToggleExpand: (supplierId: string) => void
  onEditSupplier: (supplier?: any) => void
  onArchiveSupplier: (supplierId: string) => void
  onUnarchiveSupplier: (supplierId: string) => void
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 gap-2">
        <h2 className="text-base font-normal text-gray-500 dark:text-gray-400 truncate min-w-0 flex-1">
          {showArchivedSuppliers ? 'Fornecedores Arquivados' : 'Fornecedores'} • {suppliers.length}
        </h2>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onToggleArchived(!showArchivedSuppliers)}
            className={`p-2 rounded-lg transition-colors ${
              showArchivedSuppliers
                ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
                : 'text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title={showArchivedSuppliers ? 'Mostrar ativos' : 'Mostrar arquivados'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </button>
          <button
            onClick={() => onReload(showArchivedSuppliers)}
            className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={loadingSuppliers}
            title="Atualizar"
          >
            {loadingSuppliers ? (
              <svg className="w-5 h-5 animate-spin-reverse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>
          {!showArchivedSuppliers && (
            <button 
              onClick={() => onEditSupplier()}
              className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Nova Empresa"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {loadingSuppliers ? (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-gray-400"></div>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Nenhuma empresa fornecedora cadastrada.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700 md:flex-1 md:overflow-y-auto">
          {suppliers.map((supplier) => {
            // Filtrar apenas usuários que têm supplier_id não nulo e que corresponde ao fornecedor atual
            const supplierUsers = users.filter(u => {
              // Ignorar usuários sem supplier_id (funcionários da Premium)
              if (!u.supplier_id || u.supplier_id === null) {
                return false
              }
              
              // Comparar supplier_id do usuário com o id do fornecedor (convertendo para string)
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
                        {/* Informações detalhadas (email, telefone, tipo) */}
                        <div className="space-y-1 mt-1">
                          {supplier.email && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 break-words">{supplier.email}</p>
                          )}
                          <p className="text-sm text-gray-500 dark:text-gray-400 break-words">
                            {supplier.telefone || 'Sem telefone'}
                          </p>
                          {supplier.supplier_type && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {supplier.supplier_type === 'rental' ? 'Aluguel de Máquinas' : supplier.supplier_type === 'maintenance' ? 'Manutenção' : 'Alocação e Manutenção'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Botões editar e arquivar empilhados verticalmente */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => onEditSupplier(supplier)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Editar empresa"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {showArchivedSuppliers ? (
                        <button
                          onClick={() => onUnarchiveSupplier(supplier.id)}
                          className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                          title="Desarquivar empresa"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          onClick={() => onArchiveSupplier(supplier.id)}
                          className="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
                          title="Arquivar empresa"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                        </button>
                      )}
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
                        {supplier.supplier_type && ` • ${supplier.supplier_type === 'rental' ? 'Aluguel' : supplier.supplier_type === 'maintenance' ? 'Manutenção' : 'Alocação e Manutenção'}`}
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
                    <button
                      onClick={() => onEditSupplier(supplier)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      title="Editar empresa"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {showArchivedSuppliers ? (
                      <button
                        onClick={() => onUnarchiveSupplier(supplier.id)}
                        className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                        title="Desarquivar empresa"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => onArchiveSupplier(supplier.id)}
                        className="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
                        title="Arquivar empresa"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      </button>
                    )}
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
                            <button
                              onClick={() => onValidateUser(u)}
                              className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                              title="Validar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => onEditUser(u)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => onDeleteUser(u)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Deletar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {expandedSuppliers.has(supplier.id) && supplierUsers.length === 0 && (
                  <div className="mt-3 p-3 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3">
                    Nenhum usuário cadastrado para esta empresa
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

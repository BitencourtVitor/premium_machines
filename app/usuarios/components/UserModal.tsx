import React from 'react'
import CustomInput from '@/app/components/CustomInput'
import CustomDropdown from '@/app/components/CustomDropdown'
import PinInput from '@/app/components/PinInput'

interface UserModalProps {
  isOpen: boolean
  onClose: () => void
  editingUser: any
  onSave: (e: React.FormEvent) => Promise<void>
  saving: boolean
  formData: {
    nome: string
    email: string
    pin: string
    role: string
    can_view_dashboard: boolean
    can_view_map: boolean
    can_manage_sites: boolean
    can_manage_machines: boolean
    can_register_events: boolean
    can_approve_events: boolean
    can_view_financial: boolean
    can_manage_suppliers: boolean
    can_manage_users: boolean
    can_view_logs: boolean
    validado: boolean
  }
  setFormData: (data: any) => void
  error: string
  suppliers: any[]
  selectedSupplier: string | null
  setSelectedSupplier: (id: string | null) => void
}

export default function UserModal({
  isOpen,
  onClose,
  editingUser,
  onSave,
  saving,
  formData,
  setFormData,
  error,
  suppliers,
  selectedSupplier,
  setSelectedSupplier
}: UserModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-6 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Cabeçalho com borda */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-6 flex-1 overflow-y-auto">
          <form onSubmit={onSave} className="space-y-4">
            <CustomInput
              label={formData.role === 'fornecedor' ? 'Primeiro Nome' : 'Nome'}
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
            />
            {formData.role !== 'fornecedor' && (
              <CustomInput
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            )}
            {formData.role === 'fornecedor' && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                O email será o da empresa fornecedora selecionada abaixo.
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {editingUser ? 'Novo PIN (deixe vazio para manter)' : 'PIN (6 dígitos)'}
              </label>
              {!editingUser ? (
                <PinInput
                  length={6}
                  onComplete={(pin) => setFormData({ ...formData, pin })}
                  disabled={false}
                />
              ) : (
                <div>
                  <PinInput
                    length={6}
                    onComplete={(pin) => setFormData({ ...formData, pin })}
                    disabled={false}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Deixe vazio para manter o PIN atual
                  </p>
                </div>
              )}
            </div>
            <CustomDropdown
              label="Perfil"
              value={formData.role}
              onChange={(value) => {
                const isSupplier = value === 'fornecedor'
                setFormData({ 
                  ...formData, 
                  role: value,
                  // Ajustar permissões automaticamente para fornecedores
                  can_view_dashboard: isSupplier ? false : formData.can_view_dashboard,
                  can_view_map: isSupplier ? true : formData.can_view_map,
                  can_manage_sites: isSupplier ? false : formData.can_manage_sites,
                  can_manage_machines: isSupplier ? false : formData.can_manage_machines,
                  can_register_events: isSupplier ? true : formData.can_register_events,
                  can_approve_events: isSupplier ? true : formData.can_approve_events,
                  can_view_financial: isSupplier ? false : formData.can_view_financial,
                  can_manage_suppliers: isSupplier ? false : formData.can_manage_suppliers,
                  can_manage_users: isSupplier ? false : formData.can_manage_users,
                  can_view_logs: isSupplier ? false : formData.can_view_logs,
                })
                if (!isSupplier) {
                  setSelectedSupplier(null)
                }
              }}
              options={[
                { value: 'operador', label: 'Operador' },
                { value: 'admin', label: 'Administrador' },
                { value: 'fornecedor', label: 'Fornecedor' },
              ]}
            />
            {formData.role === 'fornecedor' && (
              <CustomDropdown
                label="Empresa Fornecedora"
                value={selectedSupplier || ''}
                onChange={(value) => setSelectedSupplier(value || null)}
                options={[
                  { value: '', label: 'Selecione uma empresa' },
                  ...suppliers.map(s => ({ value: s.id, label: s.nome }))
                ]}
                required={formData.role === 'fornecedor'}
              />
            )}
            {selectedSupplier && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Usuários fornecedores têm acesso ao mapa com demandas da empresa e podem registrar/aprovar eventos relacionados à empresa.
              </p>
            )}

            {/* Permissões */}
            {formData.role !== 'fornecedor' && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Permissões</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'can_view_dashboard', label: 'Dashboard' },
                    { key: 'can_view_map', label: 'Mapa' },
                    { key: 'can_manage_sites', label: 'Jobsites' },
                    { key: 'can_manage_machines', label: 'Máquinas' },
                    { key: 'can_register_events', label: 'Registrar Eventos' },
                    { key: 'can_approve_events', label: 'Aprovar Eventos' },
                    { key: 'can_view_financial', label: 'Financeiro' },
                    { key: 'can_manage_suppliers', label: 'Fornecedores' },
                    { key: 'can_manage_users', label: 'Usuários' },
                    { key: 'can_view_logs', label: 'Logs' },
                  ].map((perm) => (
                    <label key={perm.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(formData as any)[perm.key]}
                        onChange={(e) => setFormData({ ...formData, [perm.key]: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            {/* Rodapé com borda - dentro do form */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Salvando...' : editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

import { Machine, MachineType } from '../types'
import CustomDropdown from '@/app/components/CustomDropdown'
import { BILLING_TYPE_LABELS } from '@/lib/permissions'

interface CreateMachineModalProps {
  showCreateModal: boolean
  setShowCreateModal: (show: boolean) => void
  editingMachine: Machine | null
  setEditingMachine: (machine: Machine | null) => void
  newMachine: any
  setNewMachine: (machine: any) => void
  handleCreateMachine: () => void
  creating: boolean
  machineTypes: MachineType[]
  suppliers: any[]
  machines: Machine[]
  error?: string | null
}

export default function CreateMachineModal({
  showCreateModal,
  setShowCreateModal,
  editingMachine,
  setEditingMachine,
  newMachine,
  setNewMachine,
  handleCreateMachine,
  creating,
  machineTypes,
  suppliers,
  machines,
  error
}: CreateMachineModalProps) {
  if (!showCreateModal) return null

  const isDuplicate = machines.some(m => 
    m.unit_number.trim().toLowerCase() === newMachine.unit_number.trim().toLowerCase() && 
    (!editingMachine || m.id !== editingMachine.id)
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10010] p-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-white dark:bg-gray-800 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingMachine ? 'Editar Máquina' : 'Nova Máquina'}
          </h2>
          <button
            onClick={() => {
              setShowCreateModal(false)
              setEditingMachine(null)
              setNewMachine({
                unit_number: '',
                machine_type_id: '',
                ownership_type: 'owned',
                supplier_id: '',
                billing_type: 'daily',
                daily_rate: '',
                weekly_rate: '',
                monthly_rate: '',
              })
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Número da Unidade *
            </label>
            <input
              type="text"
              value={newMachine.unit_number}
              onChange={(e) => setNewMachine({ ...newMachine, unit_number: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                isDuplicate 
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
              }`}
              placeholder="Ex: EXC-001"
            />
            {isDuplicate && (
              <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                Unidade já cadastrada.
              </p>
            )}
          </div>

          <CustomDropdown
            label="Tipo de Máquina *"
            value={newMachine.machine_type_id}
            onChange={(value: any) => setNewMachine({ ...newMachine, machine_type_id: value })}
            options={[
              { value: '', label: 'Selecione...' },
              ...machineTypes.map((type) => ({
                value: type.id,
                label: type.nome
              }))
            ]}
            placeholder="Selecione um tipo de máquina"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Propriedade
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="owned"
                  checked={newMachine.ownership_type === 'owned'}
                  onChange={(e) => setNewMachine({ 
                    ...newMachine, 
                    ownership_type: e.target.value as 'owned' | 'rented',
                    supplier_id: ''
                  })}
                  className="text-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">Própria</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="rented"
                  checked={newMachine.ownership_type === 'rented'}
                  onChange={(e) => setNewMachine({ 
                    ...newMachine, 
                    ownership_type: e.target.value as 'owned' | 'rented'
                  })}
                  className="text-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">Alugada</span>
              </label>
            </div>
          </div>

          {newMachine.ownership_type === 'rented' && (
            <>
              <CustomDropdown
                label="Fornecedor *"
                value={newMachine.supplier_id}
                onChange={(value: any) => setNewMachine({ ...newMachine, supplier_id: value })}
                options={[
                  { value: '', label: 'Selecione...' },
                  ...suppliers.map((supplier) => ({
                    value: supplier.id,
                    label: supplier.nome
                  }))
                ]}
                placeholder="Selecione um fornecedor"
                required
              />

              <CustomDropdown
                label="Billing Type"
                value={newMachine.billing_type}
                onChange={(value: any) => setNewMachine({
                  ...newMachine,
                  billing_type: value as 'daily' | 'weekly' | 'monthly'
                })}
                options={Object.entries(BILLING_TYPE_LABELS).map(([value, label]) => ({
                  value,
                  label: label as string
                }))}
                placeholder="Select billing type"
              />

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Daily (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMachine.daily_rate}
                    onChange={(e) => setNewMachine({ ...newMachine, daily_rate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Weekly (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMachine.weekly_rate}
                    onChange={(e) => setNewMachine({ ...newMachine, weekly_rate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Monthly (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMachine.monthly_rate}
                    onChange={(e) => setNewMachine({ ...newMachine, monthly_rate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-800 flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              setShowCreateModal(false)
              setEditingMachine(null)
              setNewMachine({
                unit_number: '',
                machine_type_id: '',
                ownership_type: 'owned',
                supplier_id: '',
                billing_type: 'daily',
                daily_rate: '',
                weekly_rate: '',
                monthly_rate: '',
              })
            }}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreateMachine}
            disabled={creating || isDuplicate}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {creating ? (editingMachine ? 'Salvando...' : 'Criando...') : (editingMachine ? 'Salvar Alterações' : 'Criar Máquina')}
          </button>
        </div>
      </div>
    </div>
  )
}

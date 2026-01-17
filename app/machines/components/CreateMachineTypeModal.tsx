import { MachineType } from '../types'

interface CreateMachineTypeModalProps {
  showTypeModal: boolean
  setShowTypeModal: (show: boolean) => void
  editingType: MachineType | null
  setEditingType: (type: MachineType | null) => void
  newType: any
  setNewType: (type: any) => void
  handleCreateType: () => void
  creatingType: boolean
  user: any
  error?: string | null
}

export default function CreateMachineTypeModal({
  showTypeModal,
  setShowTypeModal,
  editingType,
  setEditingType,
  newType,
  setNewType,
  handleCreateType,
  creatingType,
  user,
  error
}: CreateMachineTypeModalProps) {
  if (!showTypeModal) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingType ? 'Editar Tipo de Máquina' : 'Novo Tipo de Máquina'}
          </h2>
          <button
            onClick={() => {
              setShowTypeModal(false)
              setEditingType(null)
              setNewType({
                nome: '',
                icon: '',
                is_attachment: false,
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
              Nome *
            </label>
            <input
              type="text"
              value={newType.nome}
              onChange={(e) => setNewType({ ...newType, nome: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Ex: Excavadora, Boomlift, etc."
            />
          </div>

          {user?.role === 'dev' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ícone
              </label>
              <input
                type="text"
                value={newType.icon}
                onChange={(e) => setNewType({ ...newType, icon: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Nome do ícone (opcional)"
              />
            </div>
          )}

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newType.is_attachment}
                onChange={(e) => setNewType({ ...newType, is_attachment: e.target.checked })}
                className="text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                É um Attachment/Extension
              </span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
              Marque esta opção se este tipo é um acessório/attachment (ex: Bucket, Grapple) ao invés de uma máquina principal
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              setShowTypeModal(false)
              setEditingType(null)
              setNewType({
                nome: '',
                icon: '',
                is_attachment: false,
              })
            }}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreateType}
            disabled={creatingType || !newType.nome.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {creatingType ? (editingType ? 'Salvando...' : 'Criando...') : (editingType ? 'Salvar Alterações' : 'Criar Tipo')}
          </button>
        </div>
      </div>
    </div>
  )
}

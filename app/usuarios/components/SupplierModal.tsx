import React from 'react'
import CustomInput from '@/app/components/CustomInput'
import CustomDropdown from '@/app/components/CustomDropdown'
import { formatUSPhone } from '../utils'

interface SupplierModalProps {
  isOpen: boolean
  onClose: () => void
  editingSupplier: any
  onSave: (e: React.FormEvent) => Promise<void>
  saving: boolean
  formData: {
    nome: string
    email: string
    telefone: string
    supplier_type: 'rental' | 'maintenance' | 'both'
  }
  setFormData: (data: any) => void
  error: string
}

export default function SupplierModal({
  isOpen,
  onClose,
  editingSupplier,
  onSave,
  saving,
  formData,
  setFormData,
  error
}: SupplierModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-6 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Cabeçalho com borda */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {editingSupplier ? 'Editar Empresa' : 'Nova Empresa Fornecedora'}
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
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={onSave} className="space-y-4">
            <CustomInput
              label="Nome da Empresa"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
            />
            <CustomInput
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <CustomInput
              label="Telefone"
              type="tel"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: formatUSPhone(e.target.value) })}
              placeholder="+1 (555) 123-4567"
            />
            <CustomDropdown
              label="Tipo de Fornecedor"
              value={formData.supplier_type}
              onChange={(value) => setFormData({ ...formData, supplier_type: value as 'rental' | 'maintenance' | 'both' })}
              options={[
                { value: 'rental', label: 'Aluguel de Máquinas' },
                { value: 'maintenance', label: 'Manutenção' },
                { value: 'both', label: 'Alocação e Manutenção' },
              ]}
            />
          </form>
        </div>

        {/* Rodapé com borda */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvando...' : editingSupplier ? 'Salvar Alterações' : 'Criar Empresa'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

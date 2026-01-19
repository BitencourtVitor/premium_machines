import React, { useState } from 'react'
import CustomInput from '@/app/components/CustomInput'
import CustomDropdown from '@/app/components/CustomDropdown'
import { formatUSPhone, validateEmail, validateUSPhone } from '@/app/utils/input'

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
    supplier_type: 'rental' | 'maintenance' | 'both' | 'fuel'
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
  const [localEmailError, setLocalEmailError] = useState('')
  const [localPhoneError, setLocalPhoneError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    let hasError = false
    if (formData.email && !validateEmail(formData.email)) {
      setLocalEmailError('Formato de email inválido')
      hasError = true
    }
    
    if (formData.telefone && !validateUSPhone(formData.telefone)) {
      setLocalPhoneError('Telefone inválido (requer 10 dígitos)')
      hasError = true
    }

    if (hasError) return

    await onSave(e)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-6 z-[10010]">
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

          <form onSubmit={handleSubmit} className="space-y-4">
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
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value })
                if (e.target.value && !validateEmail(e.target.value)) {
                  setLocalEmailError('Formato de email inválido')
                } else {
                  setLocalEmailError('')
                }
              }}
              error={!!localEmailError}
              helperText={localEmailError}
            />
            <CustomInput
              label="Telefone"
              type="tel"
              value={formData.telefone}
              onChange={(e) => {
                const formatted = formatUSPhone(e.target.value)
                setFormData({ ...formData, telefone: formatted })
                if (formatted && !validateUSPhone(formatted)) {
                  setLocalPhoneError('Telefone inválido (requer 10 dígitos)')
                } else {
                  setLocalPhoneError('')
                }
              }}
              placeholder="(555) 123-4567"
              error={!!localPhoneError}
              helperText={localPhoneError}
            />
            <CustomDropdown
              label="Tipo de Fornecedor"
              value={formData.supplier_type}
              onChange={(value) =>
                setFormData({
                  ...formData,
                  supplier_type: value as 'rental' | 'maintenance' | 'both' | 'fuel',
                })
              }
              options={[
                { value: 'rental', label: 'Aluguel de Máquinas' },
                { value: 'maintenance', label: 'Manutenção' },
                { value: 'both', label: 'Alocação e Manutenção' },
                { value: 'fuel', label: 'Abastecimento (Combustível)' },
              ]}
            />
          </form>
        </div>

        {/* Rodapé com borda */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            disabled={saving}
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

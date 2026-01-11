import React from 'react'

interface DeleteUserModalProps {
  isOpen: boolean
  onClose: () => void
  userToDelete: any
  onDelete: () => Promise<void>
  deleting: boolean
  error: string
}

export default function DeleteUserModal({
  isOpen,
  onClose,
  userToDelete,
  onDelete,
  deleting,
  error
}: DeleteUserModalProps) {
  if (!isOpen || !userToDelete) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md flex flex-col">
        {/* Cabeçalho com borda */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Confirmar Exclusão
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
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to delete the user <span className="font-semibold">{userToDelete.nome}</span>?
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Esta ação não pode ser desfeita.
          </p>
        </div>

        {/* Rodapé com borda */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? 'Deletando...' : 'Deletar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

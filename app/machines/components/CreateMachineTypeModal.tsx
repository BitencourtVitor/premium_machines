import { useState, useEffect } from 'react'
import { MachineType } from '../types'
import MachineImage from '@/app/components/MachineImage'
import { supabase, getMachineIconUrlFromBucket } from '@/lib/supabase'

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
  const [availableIcons, setAvailableIcons] = useState<{ id: string, name: string, url: string, bucketName: string }[]>([])
  const [loadingIcons, setLoadingIcons] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>('')

  useEffect(() => {
    if (showTypeModal) {
      fetchIcons()
    }
  }, [showTypeModal])

  const fetchIcons = async () => {
    setLoadingIcons(true)
    setDebugInfo('Buscando em "Machine Types"... ')
    try {
      const { data, error } = await supabase.storage.from('Machine Types').list('', {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      })

      if (error) {
        console.error('Erro detalhado do Supabase:', error)
        setDebugInfo(`Erro Supabase: ${error.message} (Code: ${error.name})`)
        return
      }

      if (data && data.length > 0) {
        const filteredData = data.filter(file => file.name !== '.emptyFolderPlaceholder')
        setDebugInfo(`Encontrados ${filteredData.length} arquivos em "Machine Types"`)
        
        const icons = filteredData.map(file => ({
          id: file.name,
          name: file.name.split('.')[0], // Mantém hifens conforme padrão do sistema
          url: file.name,
          bucketName: 'Machine Types'
        }))
        setAvailableIcons(icons)
      } else {
        setDebugInfo('Bucket "Machine Types" está vazio ou não retornou dados.')
      }
    } catch (err: any) {
      console.error('Erro catch fatal:', err)
      setDebugInfo(`Erro fatal: ${err.message}`)
    } finally {
      setLoadingIcons(false)
    }
  }

  if (!showTypeModal) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10010] p-6">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ícone
            </label>
            {debugInfo && (
              <p className="text-[10px] text-gray-400 mb-1 font-mono">{debugInfo}</p>
            )}
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <button
                type="button"
                onClick={() => setNewType({ ...newType, icon: '' })}
                className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                  !newType.icon 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-500' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-white dark:hover:bg-gray-700'
                }`}
              >
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">None</span>
                </div>
                <span className="text-sm text-gray-900 dark:text-white font-medium">Sem ícone</span>
              </button>
              {loadingIcons ? (
                <div className="col-span-2 py-4 flex justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                </div>
              ) : availableIcons.length > 0 ? (
                availableIcons.map((icon) => (
                  <button
                    key={icon.id}
                    type="button"
                    onClick={() => setNewType({ ...newType, icon: icon.id })}
                    className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                      newType.icon === icon.id 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-500' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-white dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="w-8 h-8 relative rounded overflow-hidden bg-white dark:bg-gray-800 flex-shrink-0 border border-gray-100 dark:border-gray-600">
                      <MachineImage
                        src={getMachineIconUrlFromBucket(icon.url, icon.bucketName) || ''}
                        alt={icon.name}
                        size={32}
                        className="w-full h-full object-contain p-0.5"
                        showFallback={false}
                      />
                    </div>
                    <span className="text-sm text-gray-900 dark:text-white font-medium truncate text-left">{icon.name}</span>
                  </button>
                ))
              ) : (
                <div className="col-span-2 py-8 text-center flex flex-col items-center justify-center gap-2">
                  <span className="text-xs text-gray-500">Nenhum ícone encontrado no Storage</span>
                  <button 
                    onClick={() => fetchIcons()}
                    className="text-[10px] text-blue-500 hover:underline"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}
            </div>
          </div>

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

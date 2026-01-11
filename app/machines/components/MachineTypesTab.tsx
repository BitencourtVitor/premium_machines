import { MachineType } from '../types'
import MachineImage from '@/app/components/MachineImage'

interface MachineTypesTabProps {
  loadingTypes: boolean
  loadTypes: () => void
  types: MachineType[]
  setShowTypeModal: (show: boolean) => void
  setEditingType: (type: MachineType | null) => void
  setNewType: (type: any) => void
  handleEditType: (type: MachineType) => void
  handleDeleteType: (type: MachineType) => void
  loadMachineTypes: () => void
}

export default function MachineTypesTab({
  loadingTypes,
  loadTypes,
  types,
  setShowTypeModal,
  setEditingType,
  setNewType,
  handleEditType,
  handleDeleteType,
  loadMachineTypes
}: MachineTypesTabProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden flex flex-col max-h-[calc(100vh-300px)] md:max-h-none">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 gap-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Tipos de Máquinas ({types.length})
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={loadTypes}
            className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={loadingTypes}
            title="Atualizar"
          >
            <svg className={`w-5 h-5 ${loadingTypes ? 'animate-spin-reverse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={() => {
              setEditingType(null)
              setNewType({
                nome: '',
                icon: '',
                is_attachment: false,
              })
              setShowTypeModal(true)
            }}
            className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Novo Tipo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {loadingTypes ? (
        <div className="p-8 text-center flex-shrink-0">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-gray-400"></div>
        </div>
      ) : types.length === 0 ? (
        <div className="p-8 text-center flex-shrink-0">
          <p className="text-gray-500 dark:text-gray-400">
            Nenhum tipo cadastrado
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700 overflow-y-auto flex-1 min-h-0">
          {types.map((type) => {
            // Determinar o caminho da imagem baseado no campo icon ou nome
            const getImagePath = () => {
              let imageName = ''
              
              if (type.icon && type.icon.trim() !== '') {
                // Se tem icon definido, usar ele (remover extensão se houver)
                imageName = type.icon.toLowerCase().replace(/\s+/g, '-').replace(/\.(png|jpg|jpeg)$/i, '')
              } else {
                // Se não tem icon, usar o nome do tipo convertido para slug
                imageName = type.nome.toLowerCase().replace(/\s+/g, '-')
              }

              // Alguns tipos usam JPG ao invés de PNG
              const jpgTypes = ['fork-extensions', 'man-basket', 'truss-boom']
              const extension = jpgTypes.includes(imageName) ? '.jpg' : '.png'

              return `/${imageName}${extension}`
            }

            const imagePath = getImagePath()

            return (
              <div
                key={type.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 flex items-center gap-3">
                    {/* Imagem do tipo de máquina */}
                    <div className="flex-shrink-0 w-12 h-12 relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                      <MachineImage
                        src={imagePath}
                        alt={type.nome}
                        size={48}
                        className="w-full h-full"
                        showFallback={false}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-white">{type.nome}</p>
                        {type.is_attachment && (
                          <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                            Attachment
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditType(type)
                      }}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteType(type)
                      }}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Deletar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

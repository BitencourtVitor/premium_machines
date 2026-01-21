import { MachineType } from '../types'
import MachineImage from '@/app/components/MachineImage'
import BaseList from '@/app/components/BaseList'
import ListActionButton from '@/app/components/ListActionButton'

interface MachineTypesTabProps {
  loadingTypes: boolean
  loadTypes: () => void
  types: MachineType[]
  onAddType: () => void
  handleEditType: (type: MachineType) => void
  handleDeleteType: (type: MachineType) => void
  loadMachineTypes: () => void
}

export default function MachineTypesTab({
  loadingTypes,
  loadTypes,
  types,
  onAddType,
  handleEditType,
  handleDeleteType,
  loadMachineTypes
}: MachineTypesTabProps) {
  const renderTypeItem = (type: MachineType) => {
    // Determinar o caminho da imagem baseado no campo icon
    const getImagePath = () => {
      const icon = type.icon
      if (!icon) return null
      
      if (icon.includes('.')) return `/${icon}`
      
      const jpgTypes = ['fork-extensions', 'man-basket', 'truss-boom']
      const extension = jpgTypes.includes(icon) ? '.jpg' : '.png'
      return `/${icon}${extension}`
    }

    const imagePath = getImagePath()

    return (
      <div
        key={type.id}
        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 flex items-center gap-4">
            {/* Imagem do tipo de máquina */}
            <div className="flex-shrink-0 w-14 h-14 relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
              <MachineImage
                src={imagePath}
                alt={type.nome}
                size={56}
                className="w-full h-full object-contain p-1"
                showFallback={false}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900 dark:text-white text-lg">{type.nome}</p>
                {type.is_attachment && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-100 dark:border-purple-800 font-semibold">
                    Attachment
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ListActionButton
              icon="edit"
              onClick={() => handleEditType(type)}
              variant="blue"
              title="Editar"
            />
            <ListActionButton
              icon="delete"
              onClick={() => handleDeleteType(type)}
              variant="red"
              title="Deletar"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <BaseList
      title="Tipos de Máquinas"
      items={types}
      loading={loadingTypes}
      renderItem={renderTypeItem}
      showSearch
      searchFields={['nome']}
      showRefresh
      onRefresh={loadTypes}
      showAdd
      onAdd={onAddType}
      searchPlaceholder="Pesquisar tipos..."
      emptyMessage="Nenhum tipo cadastrado"
    />
  )
}

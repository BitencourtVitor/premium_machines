import { Machine } from '../types'
import MachineImage from '@/app/components/MachineImage'
import { MACHINE_STATUS_LABELS, OWNERSHIP_TYPE_LABELS } from '@/lib/permissions'
import BaseList from '@/app/components/BaseList'
import ListActionButton from '@/app/components/ListActionButton'

interface MachinesTabProps {
  loadingMachines: boolean
  loadMachines: () => void
  machines: Machine[]
  setShowCreateModal: (show: boolean) => void
  setEditingMachine: (machine: Machine | null) => void
  setNewMachine: (machine: any) => void
  handleDeleteMachine: (machine: Machine) => void
  handleExportExcel: () => void
  onMachineClick?: (machine: Machine) => void
}

export default function MachinesTab({
  loadingMachines,
  loadMachines,
  machines,
  setShowCreateModal,
  setEditingMachine,
  setNewMachine,
  handleDeleteMachine,
  handleExportExcel,
  onMachineClick
}: MachinesTabProps) {
  const renderMachineItem = (machine: Machine) => {
    // Determinar o caminho da imagem baseado no tipo de máquina
    const getMachineImagePath = () => {
      if (!machine.machine_type) return null

      let imageName = ''

      if (machine.machine_type.nome) {
        // Converter nome do tipo para slug
        imageName = machine.machine_type.nome.toLowerCase().replace(/\s+/g, '-')
      }

      // Alguns tipos usam JPG ao invés de PNG
      const jpgTypes = ['fork-extensions', 'man-basket', 'truss-boom']
      const extension = jpgTypes.includes(imageName) ? '.jpg' : '.png'

      return imageName ? `/${imageName}${extension}` : null
    }

    const machineImagePath = getMachineImagePath()

    // Cores para status
    const getStatusColor = () => {
      switch (machine.status) {
        case 'available':
          return 'text-green-600 dark:text-green-400'
        case 'allocated':
          return 'text-blue-600 dark:text-blue-400'
        case 'maintenance':
          return 'text-yellow-600 dark:text-yellow-400'
        default:
          return 'text-gray-600 dark:text-gray-400'
      }
    }

    // Cor para ownership
    const getOwnershipColor = () => {
      return machine.ownership_type === 'owned'
        ? 'text-green-600 dark:text-green-400'
        : 'text-orange-600 dark:text-orange-400'
    }

    return (
      <div
        key={machine.id}
        onClick={() => onMachineClick?.(machine)}
        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Imagem do tipo de máquina */}
            {machineImagePath && (
              <div className="flex-shrink-0 w-14 h-14 relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
                <MachineImage
                  src={machineImagePath}
                  alt={machine.machine_type?.nome || 'Máquina'}
                  size={56}
                  className="w-full h-full object-contain p-1"
                  showFallback={false}
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <p className="font-bold text-gray-900 dark:text-white text-lg">{machine.unit_number}</p>
                {/* Status com bolinha + texto */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <div className={`w-2 h-2 rounded-full ${
                    machine.status === 'available' ? 'bg-green-500' :
                    machine.status === 'allocated' ? 'bg-blue-500' :
                    machine.status === 'maintenance' ? 'bg-yellow-500' :
                    'bg-gray-500'
                  }`}></div>
                  <span className={`text-xs font-semibold ${getStatusColor()}`}>
                    {MACHINE_STATUS_LABELS[machine.status]}
                  </span>
                </div>
                {/* Ownership com bolinha + texto */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <div className={`w-2 h-2 rounded-full ${
                    machine.ownership_type === 'owned' ? 'bg-green-500' : 'bg-orange-500'
                  }`}></div>
                  <span className={`text-xs font-semibold ${getOwnershipColor()}`}>
                    {OWNERSHIP_TYPE_LABELS[machine.ownership_type]}
                    {machine.ownership_type === 'rented' && machine.supplier && (
                      <span className="ml-1 opacity-75">- {machine.supplier.nome}</span>
                    )}
                  </span>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                {machine.machine_type?.nome}
              </p>
              {machine.current_site && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    {machine.current_site.title}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ListActionButton
              icon="edit"
              onClick={() => {
                setEditingMachine(machine)
                setShowCreateModal(true)
              }}
              variant="blue"
              title="Editar"
            />
            <ListActionButton
              icon="delete"
              onClick={() => handleDeleteMachine(machine)}
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
      title="Máquinas"
      items={machines}
      loading={loadingMachines}
      renderItem={renderMachineItem}
      showRefresh
      onRefresh={loadMachines}
      showAdd
      onAdd={() => setShowCreateModal(true)}
      showDownload
      onDownload={handleExportExcel}
      searchTerm=""
      onSearchChange={() => {}}
      searchPlaceholder="Pesquisar máquinas..."
      emptyMessage="Nenhuma máquina cadastrada"
    />
  )
}

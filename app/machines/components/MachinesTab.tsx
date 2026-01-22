import { Machine } from '../types'
import MachineImage from '@/app/components/MachineImage'
import { MACHINE_STATUS_LABELS, OWNERSHIP_TYPE_LABELS } from '@/lib/permissions'
import BaseList from '@/app/components/BaseList'
import ListActionButton from '@/app/components/ListActionButton'

interface MachinesTabProps {
  loadingMachines: boolean
  loadMachines: () => void
  machines: Machine[]
  onAddMachine: () => void
  handleEditMachine: (machine: Machine) => void
  handleDeleteMachine: (machine: Machine) => void
  handleExportExcel: () => void
  onMachineClick?: (machine: Machine) => void
}

export default function MachinesTab({
  loadingMachines,
  loadMachines,
  machines,
  onAddMachine,
  handleEditMachine,
  handleDeleteMachine,
  handleExportExcel,
  onMachineClick
}: MachinesTabProps) {
  const renderMachineItem = (machine: Machine) => {
    // Determinar o caminho da imagem baseado no tipo de máquina
    const getMachineImagePath = () => {
      const icon = machine.machine_type?.icon
      if (!icon) return null
      
      if (icon.includes('.')) return `/${icon}`
      
      const jpgTypes = ['fork-extensions', 'man-basket', 'truss-boom']
      const extension = jpgTypes.includes(icon) ? '.jpg' : '.png'
      return `/${icon}${extension}`
    }

    const machineImagePath = getMachineImagePath()

    // Cores para status
    const getStatusColor = () => {
      switch (machine.status) {
        case 'available':
          return 'text-green-600 dark:text-green-400'
        case 'allocated':
        case 'active':
          return 'text-blue-600 dark:text-blue-400'
        case 'maintenance':
          return 'text-yellow-600 dark:text-yellow-400'
        case 'in_transit':
          return 'text-teal-600 dark:text-teal-400'
        case 'exceeded':
          return 'text-red-600 dark:text-red-400'
        case 'moved':
          return 'text-pink-600 dark:text-pink-400'
        case 'scheduled':
          return 'text-blue-500 dark:text-blue-300'
        case 'finished':
        case 'inactive':
          return 'text-indigo-600 dark:text-indigo-400'
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
                    machine.status === 'allocated' || machine.status === 'active' ? 'bg-blue-500' :
                    machine.status === 'maintenance' ? 'bg-yellow-500' :
                    machine.status === 'in_transit' ? 'bg-teal-500' :
                    machine.status === 'exceeded' ? 'bg-red-500' :
                    machine.status === 'moved' ? 'bg-pink-500' :
                    machine.status === 'scheduled' ? 'bg-blue-400' :
                    machine.status === 'finished' || machine.status === 'inactive' ? 'bg-indigo-500' :
                    'bg-gray-500'
                  }`}></div>
                  <span className={`text-xs font-semibold ${getStatusColor()}`}>
                    {MACHINE_STATUS_LABELS[machine.status] || machine.status}
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
              onClick={() => handleEditMachine(machine)}
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
      showSearch
      searchFields={['unit_number', 'machine_type.nome', 'current_site.title']}
      showRefresh
      onRefresh={loadMachines}
      showAdd
      onAdd={onAddMachine}
      showDownload
      onDownload={handleExportExcel}
      searchPlaceholder="Pesquisar máquinas..."
      emptyMessage="Nenhuma máquina cadastrada"
    />
  )
}

import { Machine } from '../types'
import MachineImage from '@/app/components/MachineImage'
import ExportDropdown from '@/app/components/ExportDropdown'
import { MACHINE_STATUS_LABELS, OWNERSHIP_TYPE_LABELS } from '@/lib/permissions'

interface MachinesTabProps {
  loadingMachines: boolean
  loadMachines: () => void
  filteredMachines: Machine[]
  setShowCreateModal: (show: boolean) => void
  handleEditMachine: (machine: Machine) => void
  handleDeleteMachine: (machine: Machine) => void
  handleExportExcel: () => void
}

export default function MachinesTab({
  loadingMachines,
  loadMachines,
  filteredMachines,
  setShowCreateModal,
  handleEditMachine,
  handleDeleteMachine,
  handleExportExcel
}: MachinesTabProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 gap-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Máquinas ({filteredMachines.length})
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={loadMachines}
            className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={loadingMachines}
            title="Atualizar"
          >
            <svg className={`w-5 h-5 ${loadingMachines ? 'animate-spin-reverse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Nova Máquina"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <ExportDropdown onExportExcel={handleExportExcel} />
        </div>
      </div>

      {loadingMachines ? (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-gray-400"></div>
        </div>
      ) : filteredMachines.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Nenhuma máquina cadastrada
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700 md:flex-1 md:overflow-y-auto">
          {filteredMachines.map((machine) => {
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
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Imagem do tipo de máquina */}
                    {machineImagePath && (
                      <div className="flex-shrink-0 w-12 h-12 relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                        <MachineImage
                          src={machineImagePath}
                          alt={machine.machine_type?.nome || 'Máquina'}
                          size={48}
                          className="w-full h-full"
                          showFallback={false}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="font-medium text-gray-900 dark:text-white">{machine.unit_number}</p>
                        {/* Status com bolinha + texto */}
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${
                            machine.status === 'available' ? 'bg-green-600 dark:bg-green-400' :
                            machine.status === 'allocated' ? 'bg-blue-600 dark:bg-blue-400' :
                            machine.status === 'maintenance' ? 'bg-yellow-600 dark:bg-yellow-400' :
                            'bg-gray-600 dark:bg-gray-400'
                          }`}></div>
                          <span className={`text-xs font-medium ${getStatusColor()}`}>
                            {MACHINE_STATUS_LABELS[machine.status]}
                          </span>
                        </div>
                        {/* Ownership com bolinha + texto */}
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${
                            machine.ownership_type === 'owned'
                              ? 'bg-green-600 dark:bg-green-400'
                              : 'bg-orange-600 dark:bg-orange-400'
                          }`}></div>
                          <span className={`text-xs font-medium ${getOwnershipColor()}`}>
                            {OWNERSHIP_TYPE_LABELS[machine.ownership_type]}
                            {machine.ownership_type === 'rented' && machine.supplier && (
                              <span className="ml-1">- {machine.supplier.nome}</span>
                            )}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {machine.machine_type?.nome}
                      </p>
                      {machine.current_site && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {machine.current_site.title}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditMachine(machine)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteMachine(machine)}
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

import MachineImage from '@/app/components/MachineImage'

interface MachineDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  machine: any
  loading: boolean
  events: any[]
  allocations?: any[]
}

export default function MachineDetailsModal({
  isOpen,
  onClose,
  machine,
  loading,
  events
}: MachineDetailsModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-4">
            {/* Imagem da máquina */}
            <div className="flex-shrink-0 w-12 h-12 relative rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
              {(() => {
                const getMachineImagePath = () => {
                  if (!machine?.machine_type) return null
                  let imageName = machine.machine_type.nome.toLowerCase().replace(/\s+/g, '-')
                  const jpgTypes = ['fork-extensions', 'man-basket', 'truss-boom']
                  const extension = jpgTypes.includes(imageName) ? '.jpg' : '.png'
                  return `/${imageName}${extension}`
                }
                const imagePath = getMachineImagePath()
                return imagePath ? (
                  <MachineImage src={imagePath} alt={machine?.machine_type?.nome} size={48} className="w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                  </div>
                )
              })()}
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {machine?.unit_number || 'Máquina'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {machine?.machine_type?.nome}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="p-6">
              {/* Informações da Máquina */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Status Atual</div>
                  <div className={`text-lg font-medium ${
                    machine?.status === 'allocated' ? 'text-green-600 dark:text-green-400' :
                    machine?.status === 'maintenance' ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-gray-600 dark:text-gray-400'
                  }`}>
                    {machine?.status || 'Desconhecido'}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Propriedade</div>
                  <div className={`text-lg font-medium ${
                    machine?.ownership_type === 'owned' ? 'text-blue-600 dark:text-blue-400' :
                    'text-orange-600 dark:text-orange-400'
                  }`}>
                    {machine?.ownership_type === 'owned' ? 'Própria' : 'Alugada'}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Tipo</div>
                  <div className="text-lg font-medium text-gray-900 dark:text-white">
                    {machine?.machine_type?.nome || 'N/A'}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Fornecedor</div>
                  <div className="text-lg font-medium text-gray-900 dark:text-white">
                    {machine?.supplier?.nome || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Timeline de Eventos da Máquina */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                  Histórico de Eventos nesta Obra
                </h3>

                {events.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">Nenhum evento registrado para esta máquina nesta obra</p>
                ) : (
                  <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-8">
                    {events
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((event) => (
                        <div key={event.id} className="relative ml-6">
                          <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-[37px] ring-4 ring-white dark:ring-gray-800 ${
                            event.status === 'approved' ? 'bg-green-100 dark:bg-green-900' :
                            event.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900' :
                            'bg-red-100 dark:bg-red-900'
                          }`}>
                            <div className={`w-2.5 h-2.5 rounded-full ${
                              event.status === 'approved' ? 'bg-green-500' :
                              event.status === 'pending' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`} />
                          </span>
                          
                          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                event.event_type === 'start_allocation' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                event.event_type === 'end_allocation' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                event.event_type === 'downtime_start' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                event.event_type === 'downtime_end' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                event.event_type === 'request_allocation' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                event.event_type === 'confirm_allocation' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                              }`}>
                                {event.event_type.replace('_', ' ')}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(event.event_date).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                                {event.downtime_reason && (
                                    <p><span className="font-medium text-gray-900 dark:text-white">Motivo:</span> {event.downtime_reason}</p>
                                )}
                                {event.downtime_description && (
                                    <p><span className="font-medium text-gray-900 dark:text-white">Descrição:</span> {event.downtime_description}</p>
                                )}
                                {event.construction_type && event.lot_building_number && (
                                    <p><span className="font-medium text-gray-900 dark:text-white">Localização:</span> {event.construction_type === 'lot' ? 'lot' : 'building'} {event.lot_building_number}</p>
                                )}
                                <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                    Registrado em {new Date(event.created_at).toLocaleString('pt-BR')}
                                </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

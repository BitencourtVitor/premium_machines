import React, { useState, useEffect } from 'react'
import CustomDropdown from '../../components/CustomDropdown'
import { NewEventState, ActiveDowntime, ActiveAllocation } from '../types'
import { DOWNTIME_REASON_LABELS } from '@/lib/permissions'
import { filterMachinesForEvent } from '../utils'
import { GiKeyCard } from "react-icons/gi"
import { LuPuzzle } from "react-icons/lu"
import { PiGasCanBold } from "react-icons/pi"

interface CreateEventModalProps {
  showCreateModal: boolean
  setShowCreateModal: (show: boolean) => void
  newEvent: NewEventState
  setNewEvent: (event: NewEventState) => void
  machines: any[]
  sites: any[]
  extensions: any[]
  activeAllocations: ActiveAllocation[]
  activeDowntimes: ActiveDowntime[]
  creating: boolean
  handleCreateEvent: () => void
  editingEventId?: string | null
}

export default function CreateEventModal({
  showCreateModal,
  setShowCreateModal,
  newEvent,
  setNewEvent,
  machines,
  sites,
  extensions,
  activeAllocations,
  activeDowntimes,
  creating,
  handleCreateEvent,
  editingEventId
}: CreateEventModalProps) {
  const [step, setStep] = useState<'selection' | 'form'>('selection')
  const [validationError, setValidationError] = useState<string | null>(null)

  // Reset step when modal closes or editing changes
  useEffect(() => {
    if (!showCreateModal) {
      setStep('selection')
      setValidationError(null)
    } else if (editingEventId) {
      setStep('form')
    } else if (newEvent.machine_id && newEvent.event_type === 'downtime_start') {
      // Direct open for downtime start
      setStep('form')
    }
  }, [showCreateModal, editingEventId, newEvent.machine_id, newEvent.event_type])

  const validateForm = () => {
    if (!newEvent.event_date) return 'A data do evento é obrigatória.'
    
    if (!newEvent.machine_id) {
      return newEvent.event_type === 'extension_attach' 
        ? 'A seleção de extensão é obrigatória.' 
        : 'A seleção de máquina é obrigatória.'
    }

    if (['start_allocation', 'request_allocation', 'extension_attach'].includes(newEvent.event_type)) {
      if (!newEvent.site_id) return 'O local (jobsite) é obrigatório.'
      
      if (newEvent.construction_type && !newEvent.lot_building_number) {
        return 'O número do lote/prédio é obrigatório quando o tipo de construção é selecionado.'
      }
    }

    if (newEvent.event_type === 'downtime_start') {
      if (!newEvent.downtime_reason) return 'O motivo da manutenção é obrigatório.'
    }

    return null
  }

  const handleSave = () => {
    const error = validateForm()
    if (error) {
      setValidationError(error)
      return
    }
    setValidationError(null)
    handleCreateEvent()
  }

  if (!showCreateModal) return null

  const handleTypeSelect = (type: string) => {
    setNewEvent({ ...newEvent, event_type: type })
    setStep('form')
    setValidationError(null)
  }

  const filteredMachines = filterMachinesForEvent(
    newEvent.event_type,
    machines,
    activeAllocations,
    activeDowntimes
  )

  // Ensure selected machine is in the list when editing
  let machinesToDisplay: any[] = []

  if (newEvent.event_type === 'extension_attach') {
    // Para alocação de extensão, mostrar apenas extensões disponíveis
    // Agora tratamos extensões como máquinas independentes neste fluxo
    machinesToDisplay = (extensions || []).filter(e => e.status === 'available')
    
    if (editingEventId && newEvent.machine_id) {
      const selectedExtension = extensions.find(e => e.id === newEvent.machine_id)
      if (selectedExtension && !machinesToDisplay.find(e => e.id === selectedExtension.id)) {
        machinesToDisplay.unshift(selectedExtension)
      }
    }
  } else {
    machinesToDisplay = [...filteredMachines]
    
    if (editingEventId && newEvent.machine_id) {
      const selectedMachine = machines.find(m => m.id === newEvent.machine_id)
      if (selectedMachine && !machinesToDisplay.find(m => m.id === selectedMachine.id)) {
        machinesToDisplay.unshift(selectedMachine)
      }
    }
  }

  const availableExtensions = (extensions || []).filter((ext) => ext.status === 'available')
  const extensionsToDisplay = [...availableExtensions]
  if (editingEventId && newEvent.extension_id) {
    const selectedExtension = extensions.find((e) => e.id === newEvent.extension_id)
    if (selectedExtension && !extensionsToDisplay.find((e) => e.id === selectedExtension.id)) {
      extensionsToDisplay.unshift(selectedExtension)
    }
  }

  const getAvailableCount = (type: string) => {
    if (type === 'extension_attach') {
      return extensions.length
    }
    if (type === 'refueling') {
      return machines.length
    }
    return filterMachinesForEvent(type, machines, activeAllocations, activeDowntimes).length
  }

  // Helpers for auto-filling and feedback
  const activeAlloc = activeAllocations.find(a => a.machine_id === newEvent.machine_id)
  const activeDowntime = activeDowntimes.find(d => d.machine_id === newEvent.machine_id)
  
  // Logic for Extension Allocation Feedback: Machines at selected site
  const machinesAtSite = newEvent.site_id 
    ? activeAllocations
        .filter(a => a.site_id === newEvent.site_id)
        .map(a => `${a.machine_unit_number}`)
    : []

  const renderSelection = () => {
    const counts = {
      start_allocation: getAvailableCount('start_allocation'),
      end_allocation: getAvailableCount('end_allocation'),
      request_allocation: getAvailableCount('request_allocation'),
      downtime_start: getAvailableCount('downtime_start'),
      downtime_end: getAvailableCount('downtime_end'),
      refueling: getAvailableCount('refueling'),
      extension_attach: getAvailableCount('extension_attach')
    }

    const Button = ({ type, label, desc, color, icon, count, customStyle }: any) => {
      // Default classes based on color prop
      const defaultClasses = {
        button: `hover:bg-${color}-50 dark:hover:bg-${color}-900/20 hover:border-${color}-200 dark:hover:border-${color}-800`,
        iconBox: `bg-${color}-100 dark:bg-${color}-900/40 text-${color}-600 dark:text-${color}-400 group-hover:bg-${color}-200 dark:group-hover:bg-${color}-800`
      }

      // Use custom styles if provided, otherwise default
      const buttonClass = customStyle?.button || defaultClasses.button
      const iconBoxClass = customStyle?.iconBox || defaultClasses.iconBox

      const shouldDisable =
        ['end_allocation', 'downtime_start', 'downtime_end'].includes(type) && count === 0

      return (
        <button
          onClick={() => handleTypeSelect(type)}
          disabled={shouldDisable}
          className={`w-full flex items-center p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl transition-all group shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-left mb-3 ${buttonClass}`}
        >
          <div className={`p-2 rounded-lg mr-3 transition-colors ${iconBoxClass}`}>
            {icon}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <span className="block font-semibold text-gray-900 dark:text-white text-sm">{label}</span>
              {count === 0 && <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">0</span>}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{desc}</span>
          </div>
        </button>
      )
    }

    return (
      <div className="flex flex-col md:flex-row gap-6 p-2">
        {/* Section 1: Eventos de Alocação */}
        <div className="flex-1">
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1 border-b border-gray-100 dark:border-gray-700 pb-2">
            Eventos de Alocação
          </h3>
          <div className="mt-3">
            <Button 
              type="request_allocation" 
              label="Solicitação de Alocação" 
              desc="Solicitar máquina para obra" 
              color="purple" 
              count={counts.request_allocation}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            />
            <Button 
              type="start_allocation" 
              label="Alocação de Máquina" 
              desc="Iniciar nova alocação" 
              color="blue" 
              count={counts.start_allocation}
              customStyle={{
                button: "hover:bg-[#2E86C1]/10 dark:hover:bg-[#2E86C1]/20 hover:border-[#2E86C1]/30",
                iconBox: "bg-[#2E86C1]/10 dark:bg-[#2E86C1]/20 text-[#2E86C1] group-hover:bg-[#2E86C1]/20"
              }}
              icon={<GiKeyCard className="w-5 h-5" aria-label="Ícone de servidor" title="Alocação de Máquina" />}
            />
            <Button 
              type="extension_attach" 
              label="Alocação de Extensão" 
              desc="Vincular extensão a uma obra" 
              color="indigo" 
              count={counts.extension_attach}
              customStyle={{
                button: "hover:bg-[#F39C12]/10 dark:hover:bg-[#F39C12]/20 hover:border-[#F39C12]/30",
                iconBox: "bg-[#F39C12]/10 dark:bg-[#F39C12]/20 text-[#F39C12] group-hover:bg-[#F39C12]/20"
              }}
              icon={<LuPuzzle className="w-5 h-5" aria-label="Ícone de quebra-cabeça" title="Alocação de Extensão" />}
            />
            <Button 
              type="end_allocation" 
              label="Fim de Alocação" 
              desc="Finalizar alocação existente" 
              color="red" 
              count={counts.end_allocation}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
          </div>
        </div>

        {/* Section 2: Demais Eventos */}
        <div className="flex-1">
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1 border-b border-gray-100 dark:border-gray-700 pb-2">
            Demais Eventos
          </h3>
          <div className="mt-3">
            <Button 
              type="refueling" 
              label="Abastecimento de Combustível" 
              desc="Registrar abastecimento" 
              color="yellow" 
              count={counts.refueling}
              icon={<PiGasCanBold className="w-5 h-5" aria-label="Abastecimento de Combustível" title="Abastecimento de Combustível" />}
            />
            <Button 
              type="downtime_start" 
              label="Início de Manutenção" 
              desc="Registrar parada" 
              color="orange" 
              count={counts.downtime_start}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
            />
            <Button 
              type="downtime_end" 
              label="Fim de Manutenção" 
              desc="Finalizar manutenção" 
              color="green" 
              count={counts.downtime_end}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
          </div>
        </div>
      </div>
    )
  }

  const getTitle = () => {
    if (step === 'selection') return 'Novo Evento'
    
    const prefix = editingEventId ? 'Editar ' : ''
    
    switch (newEvent.event_type) {
      case 'start_allocation': return `${prefix}Alocação de Máquina`
      case 'end_allocation': return `${prefix}Fim de Alocação`
      case 'request_allocation': return `${prefix}Solicitação de Alocação`
      case 'downtime_start': return `${prefix}Início de Manutenção`
      case 'downtime_end': return `${prefix}Fim de Manutenção`
      case 'refueling': return `${prefix}Abastecimento de Combustível`
      case 'extension_attach': return `${prefix}Alocação de Extensão`
      default: return `${prefix}Evento`
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 sm:p-6">
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full ${step === 'selection' ? 'max-w-4xl' : 'max-w-lg'} max-h-[90vh] overflow-hidden flex flex-col transition-all duration-300`}>
        <div className="bg-white dark:bg-gray-800 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
             {step === 'form' && !editingEventId && (
              <button 
                onClick={() => setStep('selection')}
                className="mr-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                {getTitle()}
                {editingEventId && (
                  <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    ID: {editingEventId.slice(0, 8)}...
                  </span>
                )}
              </h2>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {step === 'selection' ? renderSelection() : (
            <>
              {/* Special Case: Extension Attach shows Site FIRST */}
              {newEvent.event_type === 'extension_attach' && (
                <>
                  <CustomDropdown
                    label="Jobsite *"
                    value={newEvent.site_id}
                    onChange={(value) => setNewEvent({ ...newEvent, site_id: value })}
                    options={[
                      { value: '', label: 'Selecione...' },
                      ...sites.map((site) => ({
                        value: site.id,
                        label: site.title,
                        description: site.address
                      }))
                    ]}
                    placeholder="Selecione um jobsite"
                    required
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <CustomDropdown
                      label="Tipo de Construção"
                      value={newEvent.construction_type || ''}
                      onChange={(value) => setNewEvent({ ...newEvent, construction_type: value as any, lot_building_number: value ? newEvent.lot_building_number : '' })}
                      options={[
                        { value: '', label: 'Nenhum' },
                        { value: 'lot', label: 'Lote' },
                        { value: 'building', label: 'Prédio' }
                      ]}
                      placeholder="Selecione..."
                    />
                    {newEvent.construction_type && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Número *
                        </label>
                        <input
                          type="text"
                          value={newEvent.lot_building_number || ''}
                          onChange={(e) => setNewEvent({ ...newEvent, lot_building_number: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ex: 123"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Machine/Extension Selection */}
              <CustomDropdown
                label={
                  newEvent.event_type === 'request_allocation' ? "Máquina (Tipo) *" : 
                  newEvent.event_type === 'extension_attach' ? "Extensão *" : "Máquina *"
                }
                value={newEvent.machine_id}
                onChange={(value) => setNewEvent({ ...newEvent, machine_id: value })}
                options={[
                  { value: '', label: 'Selecione...' },
                  ...machinesToDisplay.map((item) => ({
                    value: item.id,
                    label: `${item.unit_number} - ${item.machine_type?.nome || item.extension_type?.nome || ''}`
                  }))
                ]}
                placeholder={newEvent.event_type === 'extension_attach' ? "Selecione uma extensão" : "Selecione uma máquina"}
                required
              />

              {/* Feedback Info Boxes */}
              
              {/* End Allocation: Show current allocation info */}
              {newEvent.event_type === 'end_allocation' && activeAlloc && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                   <p className="text-sm text-red-800 dark:text-red-200">
                     <span className="font-semibold">Alocado em:</span> {activeAlloc.site_title}
                   </p>
                   {activeAlloc.construction_type && (
                      <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                        Tipo: {activeAlloc.construction_type === 'lot' ? 'Lote' : 'Prédio'} {activeAlloc.lot_building_number}
                      </p>
                   )}
                </div>
              )}

              {/* Start Maintenance: Show current status */}
              {newEvent.event_type === 'downtime_start' && activeAlloc && (
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                   <p className="text-sm text-orange-800 dark:text-orange-200">
                     <span className="font-semibold">Status Atual:</span> Alocado em {activeAlloc.site_title}
                   </p>
                </div>
              )}

              {/* End Maintenance: Show maintenance info */}
              {newEvent.event_type === 'downtime_end' && activeDowntime && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                   <p className="text-sm text-green-800 dark:text-green-200">
                     <span className="font-semibold">Em manutenção em:</span> {activeDowntime.site_title}
                   </p>
                   <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                     Motivo: {DOWNTIME_REASON_LABELS[activeDowntime.downtime_reason] || activeDowntime.downtime_reason}
                   </p>
                </div>
              )}

              {/* Refueling: Show location info */}
              {newEvent.event_type === 'refueling' && activeAlloc && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                   <p className="text-sm text-yellow-800 dark:text-yellow-200">
                     <span className="font-semibold">Local de Registro:</span> {activeAlloc.site_title}
                   </p>
                </div>
              )}



              {/* Standard Site Selection (Only for request/start) */}
              {['request_allocation', 'start_allocation'].includes(newEvent.event_type) && (
                <>
                  <CustomDropdown
                    label="Jobsite *"
                    value={newEvent.site_id}
                    onChange={(value) => setNewEvent({ ...newEvent, site_id: value })}
                    options={[
                      { value: '', label: 'Selecione...' },
                      ...sites.map((site) => ({
                        value: site.id,
                        label: site.title,
                        description: site.address
                      }))
                    ]}
                    placeholder="Selecione um jobsite"
                    required
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <CustomDropdown
                      label="Tipo de Construção"
                      value={newEvent.construction_type || ''}
                      onChange={(value) => setNewEvent({ ...newEvent, construction_type: value as any, lot_building_number: value ? newEvent.lot_building_number : '' })}
                      options={[
                        { value: '', label: 'Nenhum' },
                        { value: 'lot', label: 'Lote' },
                        { value: 'building', label: 'Prédio' }
                      ]}
                      placeholder="Selecione..."
                    />

                    {newEvent.construction_type && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Número *
                        </label>
                        <input
                          type="text"
                          value={newEvent.lot_building_number || ''}
                          onChange={(e) => setNewEvent({ ...newEvent, lot_building_number: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={`Número do ${newEvent.construction_type === 'lot' ? 'lote' : 'prédio'}`}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {newEvent.event_type === 'request_allocation' ? "Data/Hora de Necessidade *" : "Data/Hora do Evento *"}
                </label>
                <input
                  type="datetime-local"
                  value={newEvent.event_date}
                  onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {newEvent.event_type === 'request_allocation' && (
                  <p className="text-xs text-gray-500 mt-1">Informe quando a máquina será necessária na obra.</p>
                )}
              </div>

              {['downtime_start'].includes(newEvent.event_type) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Motivo da Parada *
                    </label>
                    <CustomDropdown
                      value={newEvent.downtime_reason || ''}
                      onChange={(value) => setNewEvent({ ...newEvent, downtime_reason: value || '' })}
                      options={[
                        { value: '', label: 'Selecione...' },
                        ...Object.entries(DOWNTIME_REASON_LABELS).map(([value, label]) => ({
                          value,
                          label: label as string
                        }))
                      ]}
                      placeholder="Selecione o motivo da parada"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Descrição
                    </label>
                    <textarea
                      value={newEvent.downtime_description}
                      onChange={(e) => setNewEvent({ ...newEvent, downtime_description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Descreva o motivo da parada..."
                    />
                  </div>
                </>
              )}
              
              {['downtime_end'].includes(newEvent.event_type) && (
                <CustomDropdown
                  label="Downtime Ativo *"
                  value={newEvent.corrects_event_id}
                  onChange={(value) => {
                    setNewEvent({ ...newEvent, corrects_event_id: value })
                  }}
                  options={[
                    { value: '', label: 'Selecione...' },
                    ...activeDowntimes
                      .filter(d => d.machine_id === newEvent.machine_id)
                      .map((d) => ({
                        value: d.downtime_event_id,
                        label: `${d.downtime_reason} - ${new Date(d.downtime_start).toLocaleDateString()}`
                      }))
                  ]}
                  placeholder="Selecione o downtime a finalizar"
                  required
                />
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notas/Observações
                </label>
                <textarea
                  value={newEvent.notas}
                  onChange={(e) => setNewEvent({ ...newEvent, notas: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Observações adicionais..."
                />
              </div>
            </>
          )}
        </div>

        {step === 'form' && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
            {validationError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300 text-sm animate-shake">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {validationError}
              </div>
            )}
            
            <button
              onClick={handleSave}
              disabled={creating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{editingEventId ? 'Atualizando...' : 'Criando...'}</span>
                </>
              ) : (
                <span>{editingEventId ? 'Atualizar Evento' : 'Criar Evento'}</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

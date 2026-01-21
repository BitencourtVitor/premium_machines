import React, { useState, useEffect } from 'react'
import CustomDropdown from '../../components/CustomDropdown'
import { NewEventState, ActiveDowntime, ActiveAllocation, AllocationEvent } from '../types'
import { DOWNTIME_REASON_LABELS } from '@/lib/permissions'
import { formatDateOnly } from '@/lib/timezone'
import { filterMachinesForEvent } from '../utils'
import { GiKeyCard } from "react-icons/gi"
import { LuPuzzle } from "react-icons/lu"

interface CreateEventModalProps {
  showCreateModal: boolean
  setShowCreateModal: (show: boolean) => void
  newEvent: NewEventState
  setNewEvent: (event: NewEventState) => void
  machines: any[]
  sites: any[]
  suppliers: any[]
  extensions: any[]
  machineTypes: any[]
  activeAllocations: ActiveAllocation[]
  activeDowntimes: ActiveDowntime[]
  events?: AllocationEvent[]
  creating: boolean
  handleCreateEvent: (files?: File[]) => void
  editingEventId?: string | null
}

const MANDATORY_DOC_TYPES = ['start_allocation', 'end_allocation', 'extension_attach', 'downtime_end', 'transport_arrival']

export default function CreateEventModal({
  showCreateModal,
  setShowCreateModal,
  newEvent,
  setNewEvent,
  machines,
  sites,
  suppliers,
  extensions,
  machineTypes,
  activeAllocations,
  activeDowntimes,
  events = [],
  creating,
  handleCreateEvent,
  editingEventId
}: CreateEventModalProps) {
  const [step, setStep] = useState<'selection' | 'form'>('selection')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [existingFiles, setExistingFiles] = useState<any[]>([])
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Reset step when modal closes or editing changes
  useEffect(() => {
    if (!showCreateModal) {
      setStep('selection')
      setValidationError(null)
      setFiles([])
      setExistingFiles([])
    } else if (editingEventId) {
      setStep('form')
      // Carregar documentos existentes se estiver editando
      const fetchExistingFiles = async () => {
        setLoadingExisting(true)
        try {
          const { supabase } = await import('@/lib/supabase')
          const { data, error } = await supabase.storage
            .from('Allocation Documents')
            .list(editingEventId)
          
          if (!error && data) {
            setExistingFiles(data.filter(f => f.name !== '.keep'))
          }
        } catch (err) {
          console.error('Error fetching existing files:', err)
        } finally {
          setLoadingExisting(false)
        }
      }
      fetchExistingFiles()
    } else if (newEvent.machine_id && newEvent.event_type === 'downtime_start') {
      // Direct open for downtime start
      setStep('form')
    }
  }, [showCreateModal, editingEventId, newEvent.machine_id, newEvent.event_type])

  // Auto-preencher site_id para fim de alocação baseado no histórico
  useEffect(() => {
    if (newEvent.event_type === 'end_allocation' && newEvent.machine_id && !editingEventId && showCreateModal) {
      const lastSiteEvent = events
        .filter(e => 
          e.machine?.id === newEvent.machine_id && 
          e.site?.id && 
          e.status === 'approved' &&
          ['start_allocation', 'transport_arrival', 'extension_attach'].includes(e.event_type)
        )
        .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())[0]

      if (lastSiteEvent) {
        const newSiteId = lastSiteEvent.site?.id || ''
        const newConstructionType = lastSiteEvent.construction_type || ''
        const newLotBuildingNumber = lastSiteEvent.lot_building_number || ''

        // Só atualiza se for diferente para evitar loops infinitos se newEvent for adicionado às dependências
        if (
          newEvent.site_id !== newSiteId ||
          newEvent.construction_type !== newConstructionType ||
          newEvent.lot_building_number !== newLotBuildingNumber
        ) {
          setNewEvent({
            ...newEvent,
            site_id: newSiteId,
            construction_type: newConstructionType,
            lot_building_number: newLotBuildingNumber
          })
        }
      }
    }
  }, [newEvent, showCreateModal, events, editingEventId, setNewEvent])

  const validateForm = () => {
    if (!newEvent.event_date) return 'A data do evento é obrigatória.'
    
    if (newEvent.event_type === 'request_allocation') {
      if (!newEvent.supplier_id) return 'A seleção do fornecedor é obrigatória para solicitações.'
      if (!newEvent.machine_type_id) return 'A seleção do tipo de máquina é obrigatória.'
    } else {
      if (!newEvent.machine_id) {
        return newEvent.event_type === 'extension_attach' 
          ? 'A seleção de extensão é obrigatória.' 
          : 'A seleção de máquina é obrigatória.'
      }
    }

    if (['start_allocation', 'request_allocation', 'extension_attach', 'transport_start', 'transport_arrival'].includes(newEvent.event_type)) {
      if (newEvent.event_type !== 'transport_start' && !newEvent.site_id) return 'O local (jobsite) é obrigatório.'
      
      if (['start_allocation', 'request_allocation', 'extension_attach'].includes(newEvent.event_type) && !newEvent.end_date) {
        return 'A data de vencimento é obrigatória.'
      }
      
      if (newEvent.construction_type && !newEvent.lot_building_number) {
        return 'O número do lote/prédio é obrigatório quando o tipo de construção é selecionado.'
      }
    }

    if (newEvent.event_type === 'downtime_start') {
      if (!newEvent.downtime_reason) return 'O motivo da manutenção é obrigatório.'
    }

    // Bloqueia se o tipo exige documento e não há arquivos selecionados (apenas na criação)
    if (MANDATORY_DOC_TYPES.includes(newEvent.event_type) && files.length === 0 && !editingEventId) {
      return 'Este tipo de evento exige obrigatoriamente o anexo de documentos (Imagem ou PDF).'
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
    handleCreateEvent(files)
  }

  if (!showCreateModal) return null

  const handleTypeSelect = (type: string) => {
    setNewEvent({ ...newEvent, event_type: type })
    setStep('form')
    setValidationError(null)
  }

  // Deduplicar máquinas e extensões por ID, dando preferência ao objeto em 'extensions' se disponível
  // pois ele pode conter campos extras como 'extension_type'
  const allItemsMap = new Map();
  [...(machines || []), ...(extensions || [])].forEach(item => {
    if (item && item.id) {
      allItemsMap.set(item.id, { ...allItemsMap.get(item.id), ...item });
    }
  });
  const allPossibleItems = Array.from(allItemsMap.values());

  const filteredMachines = filterMachinesForEvent(
    newEvent.event_type,
    allPossibleItems,
    activeAllocations,
    activeDowntimes,
    events
  )

  // Ensure selected machine is in the list when editing
  let machinesToDisplay: any[] = []

  if (newEvent.event_type === 'request_allocation') {
    // Para solicitações, mostramos apenas tipos de máquinas (não extensões)
    machinesToDisplay = (machineTypes || [])
      .filter(t => !t.is_attachment)
      .map(t => ({
        id: t.id,
        nome: t.nome
      }))
  } else {
    // Para todos os outros eventos, usar a lista filtrada pelo utils.ts
    // que já separa máquinas e extensões corretamente
    machinesToDisplay = [...filteredMachines]
    
    if (editingEventId && newEvent.machine_id) {
      // Garantir que o item selecionado apareça na lista mesmo que não passasse no filtro (ex: já alocado)
      const selectedItem = allPossibleItems.find(m => m.id === newEvent.machine_id)
      if (selectedItem && !machinesToDisplay.find(m => m.id === selectedItem.id)) {
        machinesToDisplay.unshift(selectedItem)
      }
    }
  }

  const getAvailableCount = (type: string) => {
    return filterMachinesForEvent(type, allPossibleItems, activeAllocations, activeDowntimes, events).length
  }

  // Helpers for auto-filling and feedback
  const activeAlloc = activeAllocations.find(a => a.machine_id === newEvent.machine_id)
  
  // Buscar o evento mais recente que tenha um site associado para esta máquina
  const lastSiteEvent = events
    .filter(e => 
      e.machine?.id === newEvent.machine_id && 
      e.site?.id && 
      e.status === 'approved' &&
      ['start_allocation', 'transport_arrival', 'extension_attach'].includes(e.event_type)
    )
    .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())[0]

  const activeDowntime = activeDowntimes.find(d => d.machine_id === newEvent.machine_id)
  const selectedMachine = machines.find(m => m.id === newEvent.machine_id)
  
  // Definir o título do site atual baseado na alocação ativa ou no evento mais recente
  const machineCurrentSiteTitle = activeAlloc?.site_title || 
                                 lastSiteEvent?.site?.title || 
                                 selectedMachine?.current_site?.title
  
  // Definir os dados da obra atual para exibição no Fim de Alocação
  const currentSiteInfo = activeAlloc ? {
    title: activeAlloc.site_title,
    construction_type: activeAlloc.construction_type,
    lot_building_number: activeAlloc.lot_building_number
  } : lastSiteEvent ? {
    title: lastSiteEvent.site?.title,
    construction_type: lastSiteEvent.construction_type,
    lot_building_number: lastSiteEvent.lot_building_number
  } : null

  // Logic for Extension Allocation Feedback: Machines at selected site
  const machinesAtSite = newEvent.site_id 
    ? activeAllocations
        .filter(a => a.site_id === newEvent.site_id)
        .map(a => `${a.machine_unit_number}`)
    : []

  const renderSelection = () => {
    const counts = {
      start_allocation: getAvailableCount('start_allocation'),
      request_allocation: getAvailableCount('request_allocation'),
      end_allocation: getAvailableCount('end_allocation'),
      downtime_start: getAvailableCount('downtime_start'),
      downtime_end: getAvailableCount('downtime_end'),
      extension_attach: getAvailableCount('extension_attach'),
      extension_detach: getAvailableCount('extension_detach'),
      transport_start: getAvailableCount('transport_start'),
      transport_arrival: getAvailableCount('transport_arrival')
    }

    const Button = ({ type, label, desc, color, icon, count }: any) => {
      // Definindo as classes de cor de forma literal para o Tailwind processar corretamente
      const styles: Record<string, { button: string, iconBox: string }> = {
        request_allocation: {
          button: "hover:bg-[#8E44AD]/10 dark:hover:bg-[#8E44AD]/20 hover:border-[#8E44AD]/30",
          iconBox: "bg-[#8E44AD]/10 dark:bg-[#8E44AD]/20 text-[#8E44AD] group-hover:bg-[#8E44AD]/20"
        },
        start_allocation: {
          button: "hover:bg-[#2E86C1]/10 dark:hover:bg-[#2E86C1]/20 hover:border-[#2E86C1]/30",
          iconBox: "bg-[#2E86C1]/10 dark:bg-[#2E86C1]/20 text-[#2E86C1] group-hover:bg-[#2E86C1]/20"
        },
        extension_attach: {
          button: "hover:bg-[#F39C12]/10 dark:hover:bg-[#F39C12]/20 hover:border-[#F39C12]/30",
          iconBox: "bg-[#F39C12]/10 dark:bg-[#F39C12]/20 text-[#F39C12] group-hover:bg-[#F39C12]/20"
        },
        extension_detach: {
          button: "hover:bg-[#E67E22]/10 dark:hover:bg-[#E67E22]/20 hover:border-[#E67E22]/30",
          iconBox: "bg-[#E67E22]/10 dark:bg-[#E67E22]/20 text-[#E67E22] group-hover:bg-[#E67E22]/20"
        },
        end_allocation: {
          button: "hover:bg-[#E74C3C]/10 dark:hover:bg-[#E74C3C]/20 hover:border-[#E74C3C]/30",
          iconBox: "bg-[#E74C3C]/10 dark:bg-[#E74C3C]/20 text-[#E74C3C] group-hover:bg-[#E74C3C]/20"
        },
        transport_start: {
          button: "hover:bg-[#16A085]/10 dark:hover:bg-[#16A085]/20 hover:border-[#16A085]/30",
          iconBox: "bg-[#16A085]/10 dark:bg-[#16A085]/20 text-[#16A085] group-hover:bg-[#16A085]/20"
        },
        transport_arrival: {
          button: "hover:bg-[#1ABC9C]/10 dark:hover:bg-[#1ABC9C]/20 hover:border-[#1ABC9C]/30",
          iconBox: "bg-[#1ABC9C]/10 dark:bg-[#1ABC9C]/20 text-[#1ABC9C] group-hover:bg-[#1ABC9C]/20"
        },
        downtime_start: {
          button: "hover:bg-[#D35400]/10 dark:hover:bg-[#D35400]/20 hover:border-[#D35400]/30",
          iconBox: "bg-[#D35400]/10 dark:bg-[#D35400]/20 text-[#D35400] group-hover:bg-[#D35400]/20"
        },
        downtime_end: {
          button: "hover:bg-[#27AE60]/10 dark:hover:bg-[#27AE60]/20 hover:border-[#27AE60]/30",
          iconBox: "bg-[#27AE60]/10 dark:bg-[#27AE60]/20 text-[#27AE60] group-hover:bg-[#27AE60]/20"
        }
      }

      const activeStyle = styles[type] || {
        button: "hover:bg-gray-500/10 hover:border-gray-500/30",
        iconBox: "bg-gray-500/10 text-gray-500"
      }

      const shouldDisable =
        ['end_allocation', 'downtime_start', 'downtime_end', 'transport_arrival'].includes(type) && count === 0

      return (
        <button
          onClick={() => handleTypeSelect(type)}
          disabled={shouldDisable}
          className={`w-full flex items-center p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl transition-all group shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-left mb-3 ${activeStyle.button}`}
        >
          <div className={`p-2 rounded-lg mr-3 transition-colors ${activeStyle.iconBox}`}>
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
        {/* Section 1: Alocação */}
        <div className="flex-1">
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1 border-b border-gray-100 dark:border-gray-700 pb-2">
            Alocação
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
              icon={<GiKeyCard className="w-5 h-5" aria-label="Ícone de servidor" title="Alocação de Máquina" />}
            />
            <Button 
              type="extension_attach" 
              label="Alocação de Extensão" 
              desc="Vincular extensão a uma obra" 
              color="indigo" 
              count={counts.extension_attach}
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

        {/* Section 2: Transporte */}
        <div className="flex-1">
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1 border-b border-gray-100 dark:border-gray-700 pb-2">
            Transporte
          </h3>
          <div className="mt-3">
            <Button 
              type="transport_start" 
              label="Início de Transporte" 
              desc="Máquina saiu para outra obra" 
              color="teal" 
              count={counts.transport_start}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>}
            />
            <Button 
              type="transport_arrival" 
              label="Chegada em Obra" 
              desc="Máquina chegou no destino" 
              color="cyan" 
              count={counts.transport_arrival}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            />
          </div>

          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 mt-6 px-1 border-b border-gray-100 dark:border-gray-700 pb-2">
            Manutenção
          </h3>
          <div className="mt-3">
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
      case 'extension_attach': return `${prefix}Alocação de Extensão`
      case 'extension_detach': return `${prefix}Fim de Alocação de Extensão`
      case 'transport_start': return `${prefix}Início de Transporte`
      case 'transport_arrival': return `${prefix}Chegada em Obra`
      default: return `${prefix}Evento`
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10010] p-4 sm:p-6">
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
              {/* Seção Principal de Seleção (Item e Jobsite) */}
              <div className="grid grid-cols-1 gap-4">
                <CustomDropdown
                  label={
                    newEvent.event_type === 'request_allocation' ? "Tipo de Máquina *" : 
                    ['extension_attach', 'extension_detach'].includes(newEvent.event_type) ? "Extensão *" : "Máquina *"
                  }
                  value={newEvent.event_type === 'request_allocation' ? newEvent.machine_type_id : newEvent.machine_id}
                  onChange={(value) => {
                    if (newEvent.event_type === 'request_allocation') {
                      setNewEvent({ ...newEvent, machine_type_id: value, machine_id: '' })
                    } else {
                      setNewEvent({ ...newEvent, machine_id: value, machine_type_id: '' })
                    }
                  }}
                  options={[
                    { value: '', label: 'Selecione...' },
                    ...machinesToDisplay.map((item) => ({
                      value: item.id,
                      label: newEvent.event_type === 'request_allocation' 
                        ? item.nome 
                        : `${item.unit_number} - ${item.machine_type?.nome || item.extension_type?.nome || ''}`
                    }))
                  ]}
                  placeholder={
                    newEvent.event_type === 'request_allocation' ? "Selecione o tipo" :
                    ['extension_attach', 'extension_detach'].includes(newEvent.event_type) ? "Selecione uma extensão" : "Selecione uma máquina"
                  }
                  required
                />

                {['start_allocation', 'request_allocation', 'extension_attach', 'transport_arrival'].includes(newEvent.event_type) && (
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
                )}
              </div>

              {/* Informações Complementares de Obra */}
              {['start_allocation', 'request_allocation', 'extension_attach', 'transport_arrival'].includes(newEvent.event_type) && (
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Número *
                      </label>
                      <input
                        type="text"
                        value={newEvent.lot_building_number || ''}
                        onChange={(e) => setNewEvent({ ...newEvent, lot_building_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={newEvent.construction_type === 'lot' ? "Nº do Lote" : "Nº do Prédio"}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Feedback Info Boxes */}
              <div className="space-y-3">
                {/* Transport Start: Show current site */}
                {newEvent.event_type === 'transport_start' && machineCurrentSiteTitle && (
                  <div className="p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg">
                    <p className="text-sm text-teal-800 dark:text-teal-200">
                      <span className="font-semibold">Saindo de:</span> {machineCurrentSiteTitle}
                    </p>
                  </div>
                )}

                {/* End Allocation: Show current allocation info */}
                {newEvent.event_type === 'end_allocation' && currentSiteInfo && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                     <p className="text-sm text-red-800 dark:text-red-200">
                       <span className="font-semibold">Local Atual (Último Evento):</span> {currentSiteInfo.title}
                     </p>
                     {currentSiteInfo.construction_type && (
                        <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                          Tipo: {currentSiteInfo.construction_type === 'lot' ? 'Lote' : 'Prédio'} {currentSiteInfo.lot_building_number}
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
              </div>

              {newEvent.event_type === 'request_allocation' && (
                <CustomDropdown
                  label="Fornecedor *"
                  value={newEvent.supplier_id}
                  onChange={(value) => setNewEvent({ ...newEvent, supplier_id: value })}
                  options={[
                    { value: '', label: 'Selecione...' },
                    ...suppliers
                      .filter(s => {
                        if (newEvent.event_type === 'request_allocation') {
                          return s.supplier_type === 'rental' || s.supplier_type === 'both';
                        }
                        return true;
                      })
                      .map((s) => ({
                        value: s.id,
                        label: s.nome
                      }))
                  ]}
                  placeholder="Selecione o fornecedor"
                  required
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {newEvent.event_type === 'request_allocation' ? "Data de Necessidade *" : "Data/Hora do Evento *"}
                  </label>
                  <input
                    type={newEvent.event_type === 'request_allocation' ? "date" : "datetime-local"}
                    value={newEvent.event_date}
                    onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  {newEvent.event_type === 'request_allocation' && (
                    <p className="text-xs text-gray-500 mt-1">Informe quando a máquina deverá chegar na obra.</p>
                  )}
                </div>

                {['start_allocation', 'request_allocation', 'extension_attach'].includes(newEvent.event_type) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Data de Vencimento *
                    </label>
                    <input
                      type="date"
                      value={newEvent.end_date || ''}
                      onChange={(e) => setNewEvent({ ...newEvent, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {newEvent.event_type === 'request_allocation' 
                        ? "Data limite da validade desta solicitação." 
                        : "Data final do aluguel/alocação."}
                    </p>
                  </div>
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
                        label: `${d.downtime_reason} - ${formatDateOnly(d.downtime_start)}`
                      }))
                  ]}
                  placeholder="Selecione o downtime a finalizar"
                  required
                />
              )}

              {MANDATORY_DOC_TYPES.includes(newEvent.event_type) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Documentos (Imagens ou PDF) *
                  </label>
                  {/* Documentos existentes (apenas em edição) */}
                  {editingEventId && (existingFiles.length > 0 || loadingExisting) && (
                    <div className="mb-4">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
                        Documentos já anexados
                      </span>
                      {loadingExisting ? (
                        <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                          Carregando arquivos...
                        </div>
                      ) : (
                        <ul className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden bg-gray-50/50 dark:bg-gray-900/20">
                          {existingFiles.map((file, index) => (
                            <li key={index} className="flex items-center justify-between py-2 px-3">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                  {file.name.split('_').slice(1).join('_') || file.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400">Existente</span>
                                <button 
                                  onClick={async () => {
                                    if (confirm('Deseja realmente excluir este documento permanentemente?')) {
                                      try {
                                        const { supabase } = await import('@/lib/supabase')
                                        const { error } = await supabase.storage
                                          .from('Allocation Documents')
                                          .remove([`${editingEventId}/${file.name}`])
                                        
                                        if (!error) {
                                          setExistingFiles(prev => prev.filter((_, i) => i !== index))
                                        } else {
                                          alert('Erro ao excluir arquivo')
                                        }
                                      } catch (err) {
                                        console.error('Error deleting file:', err)
                                      }
                                    }
                                  }}
                                  className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                                  title="Excluir permanentemente"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <div 
                    className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors ${
                      isDragging 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setIsDragging(true)
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault()
                      setIsDragging(false)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      setIsDragging(false)
                      const droppedFiles = Array.from(e.dataTransfer.files)
                      const validFiles = droppedFiles.filter(file => {
                        if (file.size > 10 * 1024 * 1024) {
                          alert(`Arquivo ${file.name} excede o limite de 10MB e não será adicionado.`)
                          return false
                        }
                        const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf'
                        if (!isValidType) {
                          alert(`Arquivo ${file.name} não é uma imagem ou PDF.`)
                          return false
                        }
                        return true
                      })
                      setFiles(prev => [...prev, ...validFiles])
                      if (validationError && validationError.includes('documento')) {
                        setValidationError(null)
                      }
                    }}
                  >
                    <div className="space-y-1 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="flex text-sm text-gray-600 dark:text-gray-400">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                          <span>Fazer upload de arquivos</span>
                          <input 
                            id="file-upload" 
                            name="file-upload" 
                            type="file" 
                            className="sr-only" 
                            multiple 
                            accept="image/*,application/pdf"
                            onChange={(e) => {
                              const selectedFiles = Array.from(e.target.files || [])
                              const validFiles = selectedFiles.filter(file => {
                                if (file.size > 10 * 1024 * 1024) {
                                  alert(`Arquivo ${file.name} excede o limite de 10MB e não será adicionado.`)
                                  return false
                                }
                                return true
                              })
                              setFiles(prev => [...prev, ...validFiles])
                              if (validationError && validationError.includes('documento')) {
                                setValidationError(null)
                              }
                            }}
                          />
                        </label>
                        <p className="pl-1">ou arraste e solte</p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        PNG, JPG, PDF até 10MB
                      </p>
                    </div>
                  </div>

                  {files.length > 0 && (
                    <ul className="mt-3 divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      {files.map((file, index) => (
                        <li key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-900/30">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
                            <span className="text-[10px] text-gray-500 flex-shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                          </div>
                          <button 
                            onClick={() => setFiles(prev => prev.filter((_, i) => i !== index))}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
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

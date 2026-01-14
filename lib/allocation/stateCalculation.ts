import { supabaseServer } from '../supabase-server'
import { MachineAllocationState, ExtensionState } from './types'

/**
 * Calcula o estado atual de uma máquina a partir de uma lista de eventos já carregada
 * Função pura, sem acesso ao banco de dados
 */
export function calculateStateFromEvents(machineId: string, events: any[]): MachineAllocationState {
  // Estado inicial
  const state: MachineAllocationState = {
    machine_id: machineId,
    current_site_id: null,
    current_site_title: null,
    current_allocation_event_id: null,
    construction_type: null,
    lot_building_number: null,
    status: 'available',
    is_in_downtime: false,
    current_downtime_event_id: null,
    allocation_start: null,
    downtime_start: null,
    attached_extensions: [],
  }

  if (!events || events.length === 0) {
    return state
  }

  // Processar eventos em ordem cronológica
  for (const event of events) {
    switch (event.event_type) {
      case 'request_allocation':
        // Eventos de solicitação não afetam o estado atual da máquina
        // São apenas registros de intenção de alocação
        break

      case 'confirm_allocation':
        // Confirmação também não afeta estado, apenas registra aprovação da solicitação
        break

      case 'start_allocation':
        if (event.site_id) {
          state.current_site_id = event.site_id
          state.current_site_title = event.site?.title || null
          state.current_allocation_event_id = event.id
          state.construction_type = event.construction_type
          state.lot_building_number = event.lot_building_number
          state.allocation_start = event.event_date
          state.status = 'allocated'
          // Limpar downtime ao iniciar nova alocação
          state.is_in_downtime = false
          state.current_downtime_event_id = null
          state.downtime_start = null
        }
        break

      case 'end_allocation':
        // Só encerra se o site corresponder
        if (state.current_site_id && (!event.site_id || state.current_site_id === event.site_id)) {
          state.current_site_id = null
          state.current_site_title = null
          state.current_allocation_event_id = null
          state.construction_type = null
          state.lot_building_number = null
          state.allocation_start = null
          state.status = 'available'
          // Limpar downtime ao encerrar alocação
          state.is_in_downtime = false
          state.current_downtime_event_id = null
          state.downtime_start = null
        }
        break

      case 'downtime_start':
        if (state.current_site_id) {
          state.is_in_downtime = true
          state.current_downtime_event_id = event.id
          state.downtime_start = event.event_date
          state.status = 'maintenance'
        }
        break

      case 'downtime_end':
        if (state.is_in_downtime) {
          state.is_in_downtime = false
          state.current_downtime_event_id = null
          state.downtime_start = null
          state.status = state.current_site_id ? 'allocated' : 'available'
        }
        break

      case 'extension_attach':
        // Lógica antiga: Máquina Pai anexando uma extensão
        if (event.extension_id) {
          // Verificar se a extensão já está na lista
          const existingIndex = state.attached_extensions.findIndex(e => e.extension_id === event.extension_id)
          if (existingIndex === -1) {
            state.attached_extensions.push({
              extension_id: event.extension_id,
              extension_unit_number: event.extension?.unit_number || '',
              extension_type: event.extension?.machine_type?.nome || '',
              attach_event_id: event.id,
              attached_at: event.event_date,
            })
          }
        } 
        // Lógica nova: Extensão sendo alocada (tratada como máquina independente)
        else if (event.site_id) {
          state.current_site_id = event.site_id
          state.current_site_title = event.site?.title || null
          state.current_allocation_event_id = event.id
          state.construction_type = event.construction_type
          state.lot_building_number = event.lot_building_number
          state.allocation_start = event.event_date
          state.status = 'allocated'
          state.is_in_downtime = false
          state.current_downtime_event_id = null
          state.downtime_start = null
        }
        break

      case 'extension_detach':
        if (event.extension_id) {
          state.attached_extensions = state.attached_extensions.filter(
            e => e.extension_id !== event.extension_id
          )
        }
        break
    }
  }

  return state
}

/**
 * Calcula o estado atual de uma máquina a partir dos eventos aprovados
 * Esta é a função fundamental que deriva o estado dos eventos
 */
export async function calculateMachineAllocationState(machineId: string): Promise<MachineAllocationState> {
  // Buscar todos os eventos aprovados para esta máquina, ordenados cronologicamente
  const { data: events, error } = await supabaseServer
    .from('allocation_events')
    .select(`
      *,
      site:sites(id, title),
      extension:machines(id, unit_number, machine_type:machine_types(id, nome, is_attachment))
    `)
    .eq('machine_id', machineId)
    .eq('status', 'approved')
    .order('event_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Erro ao buscar eventos: ${error.message}`)
  }

  return calculateStateFromEvents(machineId, events || [])
}

/**
 * Calcula o estado atual de uma extensão a partir dos eventos aprovados
 */
export async function calculateExtensionState(extensionId: string): Promise<ExtensionState> {
  const { data: events, error } = await supabaseServer
    .from('allocation_events')
    .select(`
      *,
      machine:machines(id, unit_number)
    `)
    .eq('extension_id', extensionId)
    .eq('status', 'approved')
    .in('event_type', ['extension_attach', 'extension_detach'])
    .order('event_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Erro ao buscar eventos de extensão: ${error.message}`)
  }

  const state: ExtensionState = {
    extension_id: extensionId,
    current_machine_id: null,
    current_machine_unit_number: null,
    attach_event_id: null,
    status: 'available',
    attached_at: null,
  }

  if (!events || events.length === 0) {
    return state
  }

  for (const event of events) {
    if (event.event_type === 'extension_attach' && event.machine_id) {
      state.current_machine_id = event.machine_id
      state.current_machine_unit_number = event.machine?.unit_number || null
      state.attach_event_id = event.id
      state.status = 'attached'
      state.attached_at = event.event_date
    } else if (event.event_type === 'extension_detach') {
      state.current_machine_id = null
      state.current_machine_unit_number = null
      state.attach_event_id = null
      state.status = 'available'
      state.attached_at = null
    }
  }

  return state
}

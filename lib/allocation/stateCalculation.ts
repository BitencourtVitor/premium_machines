import { supabaseServer } from '../supabase-server'
import { MachineAllocationState, ExtensionState } from './types'

/**
 * Calcula o estado atual de uma máquina a partir de uma lista de eventos já carregada
 * Função pura, sem acesso ao banco de dados
 */
export function calculateStateFromEvents(machineId: string, events: any[], referenceDate: Date = new Date()): MachineAllocationState {
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
    end_date: null,
    downtime_start: null,
    attached_extensions: [],
    previous_site_id: null,
    destination_site_id: null,
  }

  if (!events || events.length === 0) {
    return state
  }

  // Obter data de referência em formato ISO (YYYY-MM-DD) para comparação
  const refDateStr = referenceDate.toISOString().split('T')[0]

  // Processar eventos em ordem cronológica
  for (const event of events) {
    // Se o evento é futuro em relação à data de referência, ignoramos para o estado "atual"
    const eventDateStr = event.event_date.split('T')[0]
    if (eventDateStr > refDateStr) {
      break
    }

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
          // Se ela já estava em outro lugar, esse lugar vira o anterior
          if (state.current_site_id && state.current_site_id !== event.site_id) {
            state.previous_site_id = state.current_site_id
          }
          state.current_site_id = event.site_id
          state.current_site_title = event.site?.title || null
          state.current_allocation_event_id = event.id
          state.construction_type = event.construction_type
          state.lot_building_number = event.lot_building_number
          state.allocation_start = event.event_date
          state.end_date = event.end_date
          state.status = 'allocated'
        }
        break

      case 'end_allocation':
        // Só encerra se o site corresponder
        if (state.current_site_id && (!event.site_id || state.current_site_id === event.site_id)) {
          // Se a máquina já está em trânsito, o fim da alocação apenas limpa os dados do contrato,
          // mas não muda o status físico de 'in_transit'
          const wasInTransit = state.status === 'in_transit'

          // A máquina só deixa de estar alocada no dia SEGUINTE ao fim real (conforme SiteDetailsModal)
          if (eventDateStr < refDateStr) {
            if (!wasInTransit) state.status = 'available'
            state.current_allocation_event_id = null
            state.construction_type = null
            state.lot_building_number = null
            state.allocation_start = null
            state.end_date = null
          } else {
            // No dia do evento de fim, ela ainda é considerada 'allocated' (ou 'exceeded' se passar da data)
            // A menos que já tenha iniciado um transporte
            if (!wasInTransit) state.status = 'allocated'
          }
        }
        break

      case 'downtime_start':
        state.is_in_downtime = true
        state.current_downtime_event_id = event.id
        state.downtime_start = event.event_date
        state.status = 'maintenance'
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
              extension_type_icon: event.extension?.machine_type?.icon || null,
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
          state.end_date = event.end_date
          state.status = 'allocated'
        }
        break

      case 'extension_detach':
        if (event.extension_id) {
          state.attached_extensions = state.attached_extensions.filter(
            e => e.extension_id !== event.extension_id
          )
        }
        break

      case 'transport_start':
        // A máquina inicia o deslocamento.
        // MANTEMOS o current_site_id como a obra de origem.
        // O site de destino está no event.site_id, mas a máquina fisicamente ainda não chegou lá.
        
        // Status físico muda para em trânsito
        state.status = 'in_transit'
        state.destination_site_id = event.site_id
        
        // Se o destino não estiver no evento de início, buscamos no próximo evento de chegada (mesmo que futuro)
        if (!state.destination_site_id) {
          const nextArrival = events.find(e => 
            e.event_type === 'transport_arrival' && 
            new Date(e.event_date) >= new Date(event.event_date) &&
            e.site_id
          )
          if (nextArrival) {
            state.destination_site_id = nextArrival.site_id
          }
        }
        
        // Registrar o evento de início de transporte como o evento ativo para sabermos o destino
        state.current_allocation_event_id = event.id
        break

      case 'transport_arrival':
        // A máquina chega no local de destino.
        if (event.site_id) {
          // Se ela já estava em outro lugar, esse lugar vira o anterior
          if (state.current_site_id && state.current_site_id !== event.site_id) {
            state.previous_site_id = state.current_site_id
          }
          
          state.current_site_id = event.site_id
          state.current_site_title = event.site?.title || null
          state.destination_site_id = null
          
          // Na chegada, se não houver downtime, o status é 'allocated' (Ativa)
          state.status = state.is_in_downtime ? 'maintenance' : 'allocated'
          
          if (event.construction_type) state.construction_type = event.construction_type
          if (event.lot_building_number) state.lot_building_number = event.lot_building_number
          
          // O evento de chegada passa a ser o evento atual da máquina no local
          state.current_allocation_event_id = event.id
        }
        break
    }
  }

  // Verificar se a alocação está excedida (se estiver alocada ou em manutenção no site)
  if (state.current_site_id && state.end_date) {
    const endDateStr = state.end_date.split('T')[0]
    if (refDateStr > endDateStr) {
      // Se estiver 'allocated', vira 'exceeded' (Ativa Excedida)
      // Se estiver em 'maintenance', mantemos 'maintenance' para fins técnicos, 
      // mas a UI saberá lidar com o rótulo prioritário se necessário.
      // No entanto, para o status de mapa, 'exceeded' é mais crítico que 'allocated'.
      if (state.status === 'allocated') {
        state.status = 'exceeded'
      }
    }
  }

  return state
}

/**
 * Calcula o estado atual de uma máquina a partir dos eventos aprovados
 * Esta é a função fundamental que deriva o estado dos eventos
 */
export async function calculateMachineAllocationState(machineId: string, referenceDate?: Date): Promise<MachineAllocationState> {
  // Buscar todos os eventos para esta máquina, ordenados cronologicamente
  const { data: events, error } = await supabaseServer
    .from('allocation_events')
    .select(`
      *,
      site:sites(id, title),
      extension:machines(id, unit_number, machine_type:machine_types(id, nome, is_attachment))
    `)
    .or(`machine_id.eq.${machineId},extension_id.eq.${machineId}`)
    .or('status.eq.approved,event_type.neq.refueling')
    .order('event_date', { ascending: true })
    .order('created_at', { ascending: true }) // Ordem determinística para eventos no mesmo dia

  if (error) {
    throw new Error(`Erro ao buscar eventos: ${error.message}`)
  }

  return calculateStateFromEvents(machineId, events || [], referenceDate)
}

/**
 * Calcula o estado atual de uma extensão a partir dos eventos
 */
export async function calculateExtensionState(extensionId: string): Promise<ExtensionState> {
  const { data: events, error } = await supabaseServer
    .from('allocation_events')
    .select(`
      *,
      machine:machines(id, unit_number)
    `)
    .eq('extension_id', extensionId)
    .or('status.eq.approved,event_type.neq.refueling')
    .in('event_type', ['extension_attach', 'extension_detach', 'end_allocation'])
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
    } else if ((event.event_type === 'extension_detach' || event.event_type === 'end_allocation') && state.current_machine_id) {
      state.current_machine_id = null
      state.current_machine_unit_number = null
      state.attach_event_id = null
      state.status = 'available'
      state.attached_at = null
    }
  }

  return state
}

import { supabaseServer } from '../supabase-server'
import { MachineState, ExtensionState } from './types'

/**
 * Calcula o estado atual de uma máquina baseado em todos os eventos
 */
export async function calculateMachineState(machineId: string): Promise<MachineState> {
  // Buscar todos os eventos para esta máquina, ordenados por data
  const { data: events, error } = await supabaseServer
    .from('allocation_events')
    .select('*')
    .eq('machine_id', machineId)
    .or('status.eq.approved,event_type.neq.refueling')
    .order('event_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Erro ao buscar eventos: ${error.message}`)
  }

  const state: MachineState = {
    current_site_id: null,
    status: 'available',
    is_in_downtime: false,
    current_downtime_event_id: null,
    last_allocation_event_id: null,
  }

  if (!events || events.length === 0) {
    return state
  }

  // Processar eventos em ordem cronológica
  for (const event of events) {
    switch (event.event_type) {
      case 'start_allocation':
        if (event.site_id) {
          state.current_site_id = event.site_id
          state.status = 'allocated'
          state.last_allocation_event_id = event.id
        }
        break

      case 'end_allocation':
        // Só termina alocação se estiver alocada no mesmo site
        if (state.current_site_id === event.site_id) {
          // Mantemos o current_site_id pois a máquina continua fisicamente no local
          // até que um transporte seja registrado.
          // state.current_site_id = null
          state.status = state.is_in_downtime ? 'maintenance' : 'available'
          state.last_allocation_event_id = null
        }
        break

      case 'transport_start':
        // A máquina inicia o deslocamento.
        state.status = 'in_transit'
        break

      case 'transport_arrival':
        // A máquina chega em um novo site.
        if (event.site_id) {
          state.current_site_id = event.site_id
          state.status = state.is_in_downtime ? 'maintenance' : 'available'
        }
        break

      case 'downtime_start':
        // Só inicia downtime se estiver alocada
        if (state.current_site_id) {
          state.is_in_downtime = true
          state.current_downtime_event_id = event.id
          state.status = 'maintenance'
        }
        break

      case 'downtime_end':
        // Só termina downtime se estiver em downtime e o evento referenciar o início correto
        if (state.is_in_downtime) {
          // Se o evento tem corrects_event_id, verificar se corresponde ao downtime atual
          if (event.corrects_event_id) {
            if (state.current_downtime_event_id === event.corrects_event_id) {
              state.is_in_downtime = false
              state.current_downtime_event_id = null
              // Se ainda estiver alocada, volta para allocated, senão available
              state.status = state.current_site_id ? 'allocated' : 'available'
            }
          } else {
            // Se não tem corrects_event_id, assumir que está finalizando o downtime atual
            // (compatibilidade com eventos antigos)
            state.is_in_downtime = false
            state.current_downtime_event_id = null
            state.status = state.current_site_id ? 'allocated' : 'available'
          }
        }
        break

      case 'correction':
        // Correções podem alterar qualquer aspecto do estado
        // Precisamos recalcular a partir do evento corrigido
        if (event.corrects_event_id) {
          // Buscar o evento corrigido e recalcular a partir dele
          const correctedEvent = events.find((e: any) => e.id === event.corrects_event_id)
          if (correctedEvent) {
            // Aplicar a correção - isso é complexo, pode precisar de lógica específica
            // Por enquanto, vamos apenas marcar que houve uma correção
          }
        }
        break
    }
  }

  return state
}

/**
 * Calcula o estado atual de uma extensão baseado em todos os eventos
 */
export async function calculateExtensionState(extensionId: string): Promise<ExtensionState> {
  const { data: events, error } = await supabaseServer
    .from('allocation_events')
    .select('*')
    .eq('extension_id', extensionId)
    .or('status.eq.approved,event_type.neq.refueling')
    .in('event_type', ['extension_attach', 'extension_detach'])
    .order('event_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Erro ao buscar eventos de extensão: ${error.message}`)
  }

  const state: ExtensionState = {
    current_machine_id: null,
    status: 'available',
  }

  if (!events || events.length === 0) {
    return state
  }

  for (const event of events) {
    if (event.event_type === 'extension_attach' && event.machine_id) {
      state.current_machine_id = event.machine_id
      state.status = 'attached'
    } else if (event.event_type === 'extension_detach') {
      state.current_machine_id = null
      state.status = 'available'
    }
  }

  return state
}

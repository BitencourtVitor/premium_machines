// Biblioteca completa para processamento de eventos de alocação
// Gerencia validações, cálculos de estado e atualizações de máquinas/extensões
// 
// NOTA: Esta biblioteca usa o allocationService para cálculos de estado derivados de eventos

import { supabaseServer } from './supabase-server'
import { 
  validateEvent, 
  syncMachineState, 
  syncExtensionState,
  calculateMachineAllocationState,
  calculateExtensionState as calcExtState
} from './allocationService'

export type EventType = 
  | 'start_allocation'
  | 'end_allocation'
  | 'downtime_start'
  | 'downtime_end'
  | 'correction'
  | 'extension_attach'
  | 'extension_detach'

export interface AllocationEvent {
  id: string
  event_type: EventType
  machine_id: string
  site_id?: string | null
  extension_id?: string | null
  supplier_id?: string | null
  construction_type?: string | null
  lot_building_number?: string | null
  event_date: string
  end_date?: string | null
  downtime_reason?: string | null
  downtime_description?: string | null
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: string | null
  approved_at?: string | null
  rejection_reason?: string | null
  corrects_event_id?: string | null
  correction_description?: string | null
  created_by: string
  notas?: string | null
  created_at: string
  updated_at: string
}

export interface MachineState {
  current_site_id: string | null
  status: 'available' | 'allocated' | 'maintenance' | 'inactive'
  is_in_downtime: boolean
  current_downtime_event_id: string | null
  last_allocation_event_id: string | null
}

export interface ExtensionState {
  current_machine_id: string | null
  status: 'available' | 'attached' | 'maintenance' | 'inactive'
}

/**
 * Calcula o estado atual de uma máquina baseado em todos os eventos aprovados
 */
export async function calculateMachineState(machineId: string): Promise<MachineState> {
  // Buscar todos os eventos aprovados para esta máquina, ordenados por data
  const { data: events, error } = await supabaseServer
    .from('allocation_events')
    .select('*')
    .eq('machine_id', machineId)
    .eq('status', 'approved')
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
          state.current_site_id = null
          state.status = state.is_in_downtime ? 'maintenance' : 'available'
          state.last_allocation_event_id = null
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
          const correctedEvent = events.find(e => e.id === event.corrects_event_id)
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
 * Calcula o estado atual de uma extensão baseado em todos os eventos aprovados
 */
export async function calculateExtensionState(extensionId: string): Promise<ExtensionState> {
  const { data: events, error } = await supabaseServer
    .from('allocation_events')
    .select('*')
    .eq('extension_id', extensionId)
    .eq('status', 'approved')
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

/**
 * Valida se um evento pode ser aprovado baseado no estado atual
 */
export async function validateEventApproval(event: AllocationEvent): Promise<{
  valid: boolean
  reason?: string
}> {
  // Buscar estado atual da máquina
  const currentState = await calculateMachineState(event.machine_id)

  switch (event.event_type) {
    case 'start_allocation':
      // Não pode iniciar alocação se já estiver alocada
      if (currentState.current_site_id) {
        return {
          valid: false,
          reason: `Máquina já está alocada no site ${currentState.current_site_id}. É necessário finalizar a alocação atual primeiro.`
        }
      }
      // Deve ter site_id
      if (!event.site_id) {
        return {
          valid: false,
          reason: 'Evento de início de alocação requer um site_id'
        }
      }
      break

    case 'end_allocation':
      // Não pode terminar alocação se não estiver alocada
      if (!currentState.current_site_id) {
        return {
          valid: false,
          reason: 'Máquina não está alocada. Não é possível finalizar uma alocação inexistente.'
        }
      }
      // Deve terminar a alocação no mesmo site
      if (currentState.current_site_id !== event.site_id) {
        return {
          valid: false,
          reason: `Máquina está alocada em um site diferente (${currentState.current_site_id}). O evento de fim deve referenciar o mesmo site.`
        }
      }
      break

    case 'downtime_start':
      // Só pode iniciar downtime se estiver alocada
      if (!currentState.current_site_id) {
        return {
          valid: false,
          reason: 'Máquina não está alocada. Downtime só pode ser iniciado para máquinas alocadas.'
        }
      }
      // Não pode iniciar downtime se já estiver em downtime
      if (currentState.is_in_downtime) {
        return {
          valid: false,
          reason: 'Máquina já está em downtime. É necessário finalizar o downtime atual primeiro.'
        }
      }
      // Deve ter motivo
      if (!event.downtime_reason) {
        return {
          valid: false,
          reason: 'Evento de início de downtime requer um motivo (downtime_reason)'
        }
      }
      break

    case 'downtime_end':
      // Só pode terminar downtime se estiver em downtime
      if (!currentState.is_in_downtime) {
        return {
          valid: false,
          reason: 'Máquina não está em downtime. Não é possível finalizar um downtime inexistente.'
        }
      }
      // Deve referenciar o evento de início do downtime
      if (!event.corrects_event_id || event.corrects_event_id !== currentState.current_downtime_event_id) {
        return {
          valid: false,
          reason: 'Evento de fim de downtime deve referenciar o evento de início correspondente (corrects_event_id)'
        }
      }
      break

    case 'extension_attach':
      // Validar se a extensão existe
      if (!event.extension_id) {
        return {
          valid: false,
          reason: 'Evento de conexão de extensão requer extension_id'
        }
      }
      // Buscar estado atual da extensão
      const extensionState = await calculateExtensionState(event.extension_id)
      if (extensionState.status === 'attached') {
        return {
          valid: false,
          reason: `Extensão já está conectada à máquina ${extensionState.current_machine_id}`
        }
      }
      // Validar se a máquina existe e está disponível
      const { data: machine } = await supabaseServer
        .from('machines')
        .select('id, status')
        .eq('id', event.machine_id)
        .single()
      
      if (!machine) {
        return {
          valid: false,
          reason: 'Máquina não encontrada'
        }
      }
      break

    case 'extension_detach':
      // Validar se a extensão existe e está conectada
      if (!event.extension_id) {
        return {
          valid: false,
          reason: 'Evento de desconexão de extensão requer extension_id'
        }
      }
      const detachExtensionState = await calculateExtensionState(event.extension_id)
      if (detachExtensionState.status !== 'attached') {
        return {
          valid: false,
          reason: 'Extensão não está conectada a nenhuma máquina'
        }
      }
      // Deve estar conectada à máquina especificada
      if (detachExtensionState.current_machine_id !== event.machine_id) {
        return {
          valid: false,
          reason: `Extensão está conectada à máquina ${detachExtensionState.current_machine_id}, não à máquina ${event.machine_id}`
        }
      }
      break

    case 'correction':
      // Correções devem referenciar um evento existente
      if (!event.corrects_event_id) {
        return {
          valid: false,
          reason: 'Evento de correção deve referenciar um evento existente (corrects_event_id)'
        }
      }
      // Validar que o evento corrigido existe
      const { data: correctedEvent } = await supabaseServer
        .from('allocation_events')
        .select('id')
        .eq('id', event.corrects_event_id)
        .single()
      
      if (!correctedEvent) {
        return {
          valid: false,
          reason: 'Evento a ser corrigido não encontrado'
        }
      }
      break
  }

  return { valid: true }
}

/**
 * Processa a aprovação de um evento e atualiza o estado das máquinas/extensões
 * Usa o allocationService para validação e sincronização de estado
 */
export async function processEventApproval(
  eventId: string,
  approvedBy: string
): Promise<{ success: boolean; message: string; error?: any }> {
  try {
    // Buscar o evento
    const { data: event, error: fetchError } = await supabaseServer
      .from('allocation_events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (fetchError || !event) {
      return {
        success: false,
        message: 'Evento não encontrado',
        error: fetchError
      }
    }

    // Validar usando o serviço de alocação (lógica centralizada)
    const validation = await validateEvent(event)
    if (!validation.valid) {
      return {
        success: false,
        message: validation.reason || 'Evento não pode ser aprovado'
      }
    }

    // Atualizar o evento para aprovado
    const { error: updateError } = await supabaseServer
      .from('allocation_events')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString()
      })
      .eq('id', eventId)

    if (updateError) {
      return {
        success: false,
        message: 'Erro ao atualizar status do evento',
        error: updateError
      }
    }

    // Sincronizar o estado da máquina usando o serviço de alocação
    const syncResult = await syncMachineState(event.machine_id)
    if (!syncResult.success) {
      console.error('Erro ao sincronizar estado da máquina:', syncResult.error)
      // Não falha a aprovação, mas loga o erro
    }

    // Se for evento de extensão, sincronizar também a extensão
    if (event.extension_id && (event.event_type === 'extension_attach' || event.event_type === 'extension_detach')) {
      const extSyncResult = await syncExtensionState(event.extension_id)
      if (!extSyncResult.success) {
        console.error('Erro ao sincronizar estado da extensão:', extSyncResult.error)
      }
    }

    return {
      success: true,
      message: 'Evento aprovado com sucesso'
    }
  } catch (error: any) {
    return {
      success: false,
      message: 'Erro ao processar aprovação',
      error
    }
  }
}

/**
 * Atualiza o estado da máquina baseado em todos os eventos aprovados
 */
export async function updateMachineStateFromEvents(machineId: string): Promise<{
  success: boolean
  error?: any
}> {
  try {
    const state = await calculateMachineState(machineId)

    const { error } = await supabaseServer
      .from('machines')
      .update({
        current_site_id: state.current_site_id,
        status: state.status
      })
      .eq('id', machineId)

    if (error) {
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
}

/**
 * Atualiza o estado da extensão baseado em todos os eventos aprovados
 */
export async function updateExtensionStateFromEvents(extensionId: string): Promise<{
  success: boolean
  error?: any
}> {
  try {
    const state = await calculateExtensionState(extensionId)

    const { error } = await supabaseServer
      .from('machine_extensions')
      .update({
        current_machine_id: state.current_machine_id,
        status: state.status
      })
      .eq('id', extensionId)

    if (error) {
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
}

/**
 * Processa a rejeição de um evento
 */
export async function processEventRejection(
  eventId: string,
  rejectedBy: string,
  rejectionReason: string
): Promise<{ success: boolean; message: string; error?: any }> {
  try {
    const { error } = await supabaseServer
      .from('allocation_events')
      .update({
        status: 'rejected',
        approved_by: rejectedBy, // Usando o mesmo campo para quem rejeitou
        rejection_reason: rejectionReason
      })
      .eq('id', eventId)

    if (error) {
      return {
        success: false,
        message: 'Erro ao rejeitar evento',
        error
      }
    }

    return {
      success: true,
      message: 'Evento rejeitado com sucesso'
    }
  } catch (error: any) {
    return {
      success: false,
      message: 'Erro ao processar rejeição',
      error
    }
  }
}

/**
 * Sincroniza o estado de todas as máquinas baseado em eventos aprovados
 * Útil para corrigir inconsistências ou após migrações
 */
export async function syncAllMachineStates(): Promise<{
  success: boolean
  updated: number
  errors: Array<{ machineId: string; error: any }>
}> {
  const errors: Array<{ machineId: string; error: any }> = []
  let updated = 0

  try {
    // Buscar todas as máquinas ativas
    const { data: machines, error: machinesError } = await supabaseServer
      .from('machines')
      .select('id')
      .eq('ativo', true)

    if (machinesError) {
      return {
        success: false,
        updated: 0,
        errors: [{ machineId: 'all', error: machinesError }]
      }
    }

    if (!machines || machines.length === 0) {
      return { success: true, updated: 0, errors: [] }
    }

    // Atualizar estado de cada máquina
    for (const machine of machines) {
      try {
        const result = await updateMachineStateFromEvents(machine.id)
        if (result.success) {
          updated++
        } else {
          errors.push({ machineId: machine.id, error: result.error })
        }
      } catch (error) {
        errors.push({ machineId: machine.id, error })
      }
    }

    return {
      success: errors.length === 0,
      updated,
      errors
    }
  } catch (error: any) {
    return {
      success: false,
      updated,
      errors: [{ machineId: 'all', error }]
    }
  }
}

/**
 * Sincroniza o estado de todas as extensões baseado em eventos aprovados
 */
export async function syncAllExtensionStates(): Promise<{
  success: boolean
  updated: number
  errors: Array<{ extensionId: string; error: any }>
}> {
  const errors: Array<{ extensionId: string; error: any }> = []
  let updated = 0

  try {
    // Buscar todas as extensões ativas
    const { data: extensions, error: extensionsError } = await supabaseServer
      .from('machine_extensions')
      .select('id')
      .eq('ativo', true)

    if (extensionsError) {
      return {
        success: false,
        updated: 0,
        errors: [{ extensionId: 'all', error: extensionsError }]
      }
    }

    if (!extensions || extensions.length === 0) {
      return { success: true, updated: 0, errors: [] }
    }

    // Atualizar estado de cada extensão
    for (const extension of extensions) {
      try {
        const result = await updateExtensionStateFromEvents(extension.id)
        if (result.success) {
          updated++
        } else {
          errors.push({ extensionId: extension.id, error: result.error })
        }
      } catch (error) {
        errors.push({ extensionId: extension.id, error })
      }
    }

    return {
      success: errors.length === 0,
      updated,
      errors
    }
  } catch (error: any) {
    return {
      success: false,
      updated,
      errors: [{ extensionId: 'all', error }]
    }
  }
}

/**
 * Obtém o histórico completo de eventos de uma máquina
 */
export async function getMachineEventHistory(machineId: string): Promise<{
  success: boolean
  events?: AllocationEvent[]
  error?: any
}> {
  try {
    const { data: events, error } = await supabaseServer
      .from('allocation_events')
      .select(`
        *,
        machine:machines(id, unit_number),
        site:sites(id, title),
        extension:machine_extensions(id, unit_number),
        supplier:suppliers(id, nome),
        created_by_user:users!allocation_events_created_by_fkey(id, nome),
        approved_by_user:users!allocation_events_approved_by_fkey(id, nome)
      `)
      .eq('machine_id', machineId)
      .order('event_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error }
    }

    return { success: true, events: events as any }
  } catch (error: any) {
    return { success: false, error }
  }
}

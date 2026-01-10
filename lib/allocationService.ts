/**
 * =============================================================================
 * SERVIÇO CENTRAL DE ALOCAÇÕES
 * =============================================================================
 * 
 * Este serviço é o coração do sistema orientado a eventos.
 * 
 * PRINCÍPIO FUNDAMENTAL:
 * - Eventos são imutáveis e representam fatos ocorridos
 * - O estado atual de máquinas e extensões é DERIVADO dos eventos
 * - Uma alocação está ativa se há um start_allocation sem end_allocation correspondente
 * - Um downtime está ativo se há um downtime_start sem downtime_end correspondente
 * 
 * TIPOS DE EVENTOS:
 * - start_allocation: Máquina foi alocada em um site (lote/prédio específico)
 * - end_allocation: Máquina foi desalocada do site
 * - downtime_start: Máquina entrou em parada (com motivo)
 * - downtime_end: Máquina saiu da parada
 * - extension_attach: Extensão foi conectada a uma máquina
 * - extension_detach: Extensão foi desconectada da máquina
 * - correction: Correção de um evento anterior
 * 
 * =============================================================================
 */

import { supabaseServer } from './supabase-server'

// =============================================================================
// TIPOS
// =============================================================================

export interface AllocationEvent {
  id: string
  event_type: string
  machine_id: string
  site_id: string | null
  extension_id: string | null
  supplier_id: string | null
  construction_type: 'lot' | 'building' | null
  lot_building_number: string | null
  event_date: string
  end_date: string | null
  downtime_reason: string | null
  downtime_description: string | null
  status: 'pending' | 'approved' | 'rejected'
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  corrects_event_id: string | null
  correction_description: string | null
  created_by: string
  notas: string | null
  created_at: string
  updated_at: string
}

export interface ActiveAllocation {
  allocation_event_id: string
  machine_id: string
  machine_unit_number: string
  machine_type: string
  machine_ownership: 'owned' | 'rented'
  machine_supplier_id: string | null
  machine_supplier_name: string | null
  site_id: string
  site_title: string
  construction_type: 'lot' | 'building' | null
  lot_building_number: string | null
  allocation_start: string
  is_in_downtime: boolean
  current_downtime_event_id: string | null
  current_downtime_reason: string | null
  current_downtime_start: string | null
  attached_extensions: AttachedExtension[]
}

export interface AttachedExtension {
  extension_id: string
  extension_unit_number: string
  extension_type: string
  attach_event_id: string
  attached_at: string
}

export interface ActiveDowntime {
  downtime_event_id: string
  machine_id: string
  machine_unit_number: string
  site_id: string
  site_title: string
  downtime_reason: string
  downtime_description: string | null
  downtime_start: string
}

export interface MachineAllocationState {
  machine_id: string
  current_site_id: string | null
  current_site_title: string | null
  current_allocation_event_id: string | null
  construction_type: 'lot' | 'building' | null
  lot_building_number: string | null
  status: 'available' | 'allocated' | 'maintenance' | 'inactive'
  is_in_downtime: boolean
  current_downtime_event_id: string | null
  allocation_start: string | null
  downtime_start: string | null
  attached_extensions: AttachedExtension[]
}

export interface ExtensionState {
  extension_id: string
  current_machine_id: string | null
  current_machine_unit_number: string | null
  attach_event_id: string | null
  status: 'available' | 'attached' | 'maintenance' | 'inactive'
  attached_at: string | null
}

export interface SiteAllocationSummary {
  site_id: string
  site_title: string
  total_machines: number
  machines_in_downtime: number
  machines_working: number
  allocations: ActiveAllocation[]
}

// =============================================================================
// FUNÇÕES DE CÁLCULO DE ESTADO
// =============================================================================

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
      extension:machine_extensions(id, unit_number, extension_type:extension_types(nome))
    `)
    .eq('machine_id', machineId)
    .eq('status', 'approved')
    .order('event_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Erro ao buscar eventos: ${error.message}`)
  }

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
        if (event.extension_id) {
          // Verificar se a extensão já está na lista
          const existingIndex = state.attached_extensions.findIndex(e => e.extension_id === event.extension_id)
          if (existingIndex === -1) {
            state.attached_extensions.push({
              extension_id: event.extension_id,
              extension_unit_number: event.extension?.unit_number || '',
              extension_type: event.extension?.extension_type?.nome || '',
              attach_event_id: event.id,
              attached_at: event.event_date,
            })
          }
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

// =============================================================================
// FUNÇÕES DE CONSULTA DE ALOCAÇÕES ATIVAS
// =============================================================================

/**
 * Retorna todas as alocações ativas no sistema
 * Uma alocação está ativa se há um start_allocation aprovado sem end_allocation correspondente
 */
export async function getActiveAllocations(): Promise<ActiveAllocation[]> {
  // Buscar todas as máquinas ativas
  const { data: machines, error: machinesError } = await supabaseServer
    .from('machines')
    .select(`
      id,
      unit_number,
      ownership_type,
      machine_type:machine_types(id, nome),
      supplier:suppliers(id, nome)
    `)
    .eq('ativo', true)

  if (machinesError) {
    throw new Error(`Erro ao buscar máquinas: ${machinesError.message}`)
  }

  if (!machines || machines.length === 0) {
    return []
  }

  const activeAllocations: ActiveAllocation[] = []

  // Calcular estado de cada máquina
  for (const machine of machines) {
    try {
      const state = await calculateMachineAllocationState(machine.id)

      // Se a máquina está alocada, adicionar à lista
      if (state.current_site_id && state.current_allocation_event_id) {
        activeAllocations.push({
          allocation_event_id: state.current_allocation_event_id,
          machine_id: machine.id,
          machine_unit_number: machine.unit_number,
          machine_type: machine.machine_type?.nome || '',
          machine_ownership: machine.ownership_type,
          machine_supplier_id: machine.supplier?.id || null,
          machine_supplier_name: machine.supplier?.nome || null,
          site_id: state.current_site_id,
          site_title: state.current_site_title || '',
          construction_type: state.construction_type,
          lot_building_number: state.lot_building_number,
          allocation_start: state.allocation_start || '',
          is_in_downtime: state.is_in_downtime,
          current_downtime_event_id: state.current_downtime_event_id,
          current_downtime_reason: null, // Será preenchido abaixo se houver
          current_downtime_start: state.downtime_start,
          attached_extensions: state.attached_extensions,
        })
      }
    } catch (error) {
      console.error(`Erro ao calcular estado da máquina ${machine.id}:`, error)
    }
  }

  // Buscar informações adicionais de downtime se necessário
  for (const allocation of activeAllocations) {
    if (allocation.current_downtime_event_id) {
      const { data: downtimeEvent } = await supabaseServer
        .from('allocation_events')
        .select('downtime_reason')
        .eq('id', allocation.current_downtime_event_id)
        .single()

      if (downtimeEvent) {
        allocation.current_downtime_reason = downtimeEvent.downtime_reason
      }
    }
  }

  return activeAllocations
}

/**
 * Retorna todas as alocações ativas em um site específico
 */
export async function getActiveAllocationsBySite(siteId: string): Promise<ActiveAllocation[]> {
  const allAllocations = await getActiveAllocations()
  return allAllocations.filter(a => a.site_id === siteId)
}

/**
 * Retorna o resumo de alocações por site
 */
export async function getSiteAllocationSummary(siteId: string): Promise<SiteAllocationSummary | null> {
  const { data: site, error: siteError } = await supabaseServer
    .from('sites')
    .select('id, title')
    .eq('id', siteId)
    .single()

  if (siteError || !site) {
    return null
  }

  const allocations = await getActiveAllocationsBySite(siteId)

  return {
    site_id: site.id,
    site_title: site.title,
    total_machines: allocations.length,
    machines_in_downtime: allocations.filter(a => a.is_in_downtime).length,
    machines_working: allocations.filter(a => !a.is_in_downtime).length,
    allocations,
  }
}

/**
 * Retorna todos os downtimes ativos (para facilitar criação de downtime_end)
 */
export async function getActiveDowntimes(): Promise<ActiveDowntime[]> {
  const allAllocations = await getActiveAllocations()
  
  return allAllocations
    .filter(a => a.is_in_downtime && a.current_downtime_event_id)
    .map(a => ({
      downtime_event_id: a.current_downtime_event_id!,
      machine_id: a.machine_id,
      machine_unit_number: a.machine_unit_number,
      site_id: a.site_id,
      site_title: a.site_title,
      downtime_reason: a.current_downtime_reason || '',
      downtime_description: null,
      downtime_start: a.current_downtime_start || '',
    }))
}

/**
 * Retorna downtimes ativos de uma máquina específica
 */
export async function getActiveDowntimeByMachine(machineId: string): Promise<ActiveDowntime | null> {
  const state = await calculateMachineAllocationState(machineId)
  
  if (!state.is_in_downtime || !state.current_downtime_event_id) {
    return null
  }

  const { data: downtimeEvent } = await supabaseServer
    .from('allocation_events')
    .select(`
      id,
      downtime_reason,
      downtime_description,
      event_date,
      site:sites(id, title)
    `)
    .eq('id', state.current_downtime_event_id)
    .single()

  if (!downtimeEvent) {
    return null
  }

  const { data: machine } = await supabaseServer
    .from('machines')
    .select('unit_number')
    .eq('id', machineId)
    .single()

  return {
    downtime_event_id: downtimeEvent.id,
    machine_id: machineId,
    machine_unit_number: machine?.unit_number || '',
    site_id: downtimeEvent.site?.id || '',
    site_title: downtimeEvent.site?.title || '',
    downtime_reason: downtimeEvent.downtime_reason || '',
    downtime_description: downtimeEvent.downtime_description,
    downtime_start: downtimeEvent.event_date,
  }
}

// =============================================================================
// FUNÇÕES DE SINCRONIZAÇÃO
// =============================================================================

/**
 * Sincroniza o estado de uma máquina na tabela machines
 * com base nos eventos aprovados
 */
export async function syncMachineState(machineId: string): Promise<{ success: boolean; error?: any }> {
  try {
    const state = await calculateMachineAllocationState(machineId)

    const { error } = await supabaseServer
      .from('machines')
      .update({
        current_site_id: state.current_site_id,
        status: state.status,
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
 * Sincroniza o estado de uma extensão na tabela machine_extensions
 */
export async function syncExtensionState(extensionId: string): Promise<{ success: boolean; error?: any }> {
  try {
    const state = await calculateExtensionState(extensionId)

    const { error } = await supabaseServer
      .from('machine_extensions')
      .update({
        current_machine_id: state.current_machine_id,
        status: state.status,
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
 * Sincroniza o estado de todas as máquinas
 */
export async function syncAllMachineStates(): Promise<{
  success: boolean
  synced: number
  errors: Array<{ machineId: string; error: any }>
}> {
  const { data: machines, error: machinesError } = await supabaseServer
    .from('machines')
    .select('id')
    .eq('ativo', true)

  if (machinesError) {
    return { success: false, synced: 0, errors: [{ machineId: 'all', error: machinesError }] }
  }

  if (!machines || machines.length === 0) {
    return { success: true, synced: 0, errors: [] }
  }

  const errors: Array<{ machineId: string; error: any }> = []
  let synced = 0

  for (const machine of machines) {
    const result = await syncMachineState(machine.id)
    if (result.success) {
      synced++
    } else {
      errors.push({ machineId: machine.id, error: result.error })
    }
  }

  return {
    success: errors.length === 0,
    synced,
    errors,
  }
}

// =============================================================================
// FUNÇÕES DE VALIDAÇÃO
// =============================================================================

/**
 * Valida se um evento pode ser criado/aprovado baseado no estado atual
 */
export async function validateEvent(event: Partial<AllocationEvent>): Promise<{
  valid: boolean
  reason?: string
}> {
  if (!event.machine_id) {
    return { valid: false, reason: 'machine_id é obrigatório' }
  }

  const state = await calculateMachineAllocationState(event.machine_id)

  switch (event.event_type) {
    case 'start_allocation':
      if (state.current_site_id) {
        return {
          valid: false,
          reason: `Máquina já está alocada em ${state.current_site_title || state.current_site_id}. Finalize a alocação atual primeiro.`
        }
      }
      if (!event.site_id) {
        return { valid: false, reason: 'site_id é obrigatório para início de alocação' }
      }
      break

    case 'end_allocation':
      if (!state.current_site_id) {
        return { valid: false, reason: 'Máquina não está alocada em nenhum site' }
      }
      if (event.site_id && state.current_site_id !== event.site_id) {
        return {
          valid: false,
          reason: `Máquina está alocada em outro site (${state.current_site_title})`
        }
      }
      break

    case 'downtime_start':
      if (!state.current_site_id) {
        return { valid: false, reason: 'Máquina não está alocada. Downtime só pode ser registrado para máquinas alocadas.' }
      }
      if (state.is_in_downtime) {
        return { valid: false, reason: 'Máquina já está em downtime. Finalize o downtime atual primeiro.' }
      }
      if (!event.downtime_reason) {
        return { valid: false, reason: 'Motivo do downtime é obrigatório' }
      }
      break

    case 'downtime_end':
      if (!state.is_in_downtime) {
        return { valid: false, reason: 'Máquina não está em downtime' }
      }
      break

    case 'extension_attach':
      if (!event.extension_id) {
        return { valid: false, reason: 'extension_id é obrigatório' }
      }
      // Verificar se a extensão já está anexada a outra máquina
      const extensionState = await calculateExtensionState(event.extension_id)
      if (extensionState.current_machine_id && extensionState.current_machine_id !== event.machine_id) {
        return {
          valid: false,
          reason: `Extensão já está anexada à máquina ${extensionState.current_machine_unit_number}`
        }
      }
      break

    case 'extension_detach':
      if (!event.extension_id) {
        return { valid: false, reason: 'extension_id é obrigatório' }
      }
      const detachExtState = await calculateExtensionState(event.extension_id)
      if (!detachExtState.current_machine_id) {
        return { valid: false, reason: 'Extensão não está anexada a nenhuma máquina' }
      }
      if (detachExtState.current_machine_id !== event.machine_id) {
        return {
          valid: false,
          reason: `Extensão está anexada à máquina ${detachExtState.current_machine_unit_number}, não à máquina especificada`
        }
      }
      break
  }

  return { valid: true }
}

// =============================================================================
// FUNÇÕES DE CÁLCULO FINANCEIRO
// =============================================================================

/**
 * Calcula os dias de uma alocação
 */
export interface AllocationDaysCalculation {
  machine_id: string
  site_id: string
  supplier_id: string | null
  period_start: Date
  period_end: Date
  total_days: number
  downtime_days: number
  billable_days: number
  daily_rate: number
  estimated_cost: number
}

/**
 * Calcula os dias de alocação de uma máquina em um período
 */
export async function calculateAllocationDays(
  machineId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<AllocationDaysCalculation | null> {
  // Buscar informações da máquina
  const { data: machine, error: machineError } = await supabaseServer
    .from('machines')
    .select('id, ownership_type, supplier_id, daily_rate, weekly_rate, monthly_rate, billing_type')
    .eq('id', machineId)
    .single()

  if (machineError || !machine) {
    return null
  }

  // Buscar eventos aprovados no período
  const { data: events, error: eventsError } = await supabaseServer
    .from('allocation_events')
    .select('*')
    .eq('machine_id', machineId)
    .eq('status', 'approved')
    .gte('event_date', periodStart.toISOString())
    .lte('event_date', periodEnd.toISOString())
    .order('event_date', { ascending: true })

  if (eventsError) {
    return null
  }

  // Calcular dias
  let currentSiteId: string | null = null
  let allocationStart: Date | null = null
  let isInDowntime = false
  let downtimeStart: Date | null = null
  let totalDays = 0
  let downtimeDays = 0

  // Processar eventos para calcular dias
  const sortedEvents = events || []

  for (const event of sortedEvents) {
    const eventDate = new Date(event.event_date)

    switch (event.event_type) {
      case 'start_allocation':
        currentSiteId = event.site_id
        allocationStart = eventDate
        break

      case 'end_allocation':
        if (allocationStart && currentSiteId) {
          const days = Math.ceil((eventDate.getTime() - allocationStart.getTime()) / (1000 * 60 * 60 * 24))
          totalDays += days
        }
        currentSiteId = null
        allocationStart = null
        break

      case 'downtime_start':
        if (currentSiteId) {
          isInDowntime = true
          downtimeStart = eventDate
        }
        break

      case 'downtime_end':
        if (isInDowntime && downtimeStart) {
          const days = Math.ceil((eventDate.getTime() - downtimeStart.getTime()) / (1000 * 60 * 60 * 24))
          downtimeDays += days
          isInDowntime = false
          downtimeStart = null
        }
        break
    }
  }

  // Se ainda está alocada no final do período
  if (allocationStart && currentSiteId) {
    const days = Math.ceil((periodEnd.getTime() - allocationStart.getTime()) / (1000 * 60 * 60 * 24))
    totalDays += days
  }

  // Se ainda está em downtime no final do período
  if (isInDowntime && downtimeStart) {
    const days = Math.ceil((periodEnd.getTime() - downtimeStart.getTime()) / (1000 * 60 * 60 * 24))
    downtimeDays += days
  }

  const billableDays = Math.max(0, totalDays - downtimeDays)

  // Calcular taxa diária
  let dailyRate = 0
  if (machine.ownership_type === 'rented') {
    if (machine.billing_type === 'daily' && machine.daily_rate) {
      dailyRate = parseFloat(machine.daily_rate)
    } else if (machine.billing_type === 'weekly' && machine.weekly_rate) {
      dailyRate = parseFloat(machine.weekly_rate) / 7
    } else if (machine.billing_type === 'monthly' && machine.monthly_rate) {
      dailyRate = parseFloat(machine.monthly_rate) / 30
    }
  }

  const estimatedCost = billableDays * dailyRate

  return {
    machine_id: machineId,
    site_id: currentSiteId || '',
    supplier_id: machine.supplier_id,
    period_start: periodStart,
    period_end: periodEnd,
    total_days: totalDays,
    downtime_days: downtimeDays,
    billable_days: billableDays,
    daily_rate: dailyRate,
    estimated_cost: estimatedCost,
  }
}

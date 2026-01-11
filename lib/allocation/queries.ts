import { supabaseServer } from '../supabase-server'
import { ActiveAllocation, ActiveDowntime, SiteAllocationSummary } from './types'
import { calculateMachineAllocationState } from './stateCalculation'

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
    site_id: (downtimeEvent.site as any)?.id || '',
    site_title: (downtimeEvent.site as any)?.title || '',
    downtime_reason: downtimeEvent.downtime_reason || '',
    downtime_description: downtimeEvent.downtime_description,
    downtime_start: downtimeEvent.event_date,
  }
}

import { supabaseServer } from '../supabase-server'
import { ActiveAllocation, ActiveDowntime, SiteAllocationSummary } from './types'
import { calculateMachineAllocationState, calculateStateFromEvents } from './stateCalculation'

/**
 * Retorna todas as alocações ativas no sistema
 * Otimizado para fazer poucas queries ao banco de dados (bulk fetch)
 */
export async function getActiveAllocations(): Promise<ActiveAllocation[]> {
  // 1. Buscar todas as máquinas ativas
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

  // 2. Buscar TODOS os eventos aprovados de uma vez
  // Isso evita o problema de N+1 queries que causava timeout
  const { data: allEvents, error: eventsError } = await supabaseServer
    .from('allocation_events')
    .select(`
      *,
      site:sites(id, title),
      extension:machines(id, unit_number, machine_type:machine_types(id, nome, is_attachment))
    `)
    .eq('status', 'approved')
    .order('event_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (eventsError) {
    throw new Error(`Erro ao buscar eventos: ${eventsError.message}`)
  }

  // 3. Agrupar eventos por machine_id para processamento rápido
  const eventsByMachine = new Map<string, any[]>()
  if (allEvents) {
    for (const event of allEvents) {
      if (!event.machine_id) continue
      
      if (!eventsByMachine.has(event.machine_id)) {
        eventsByMachine.set(event.machine_id, [])
      }
      eventsByMachine.get(event.machine_id)?.push(event)
    }
  }

  const activeAllocations: ActiveAllocation[] = []

  // 4. Calcular estado de cada máquina em memória
  for (const machine of machines) {
    try {
      // Usar os eventos já carregados em memória
      const machineEvents = eventsByMachine.get(machine.id) || []
      const state = calculateStateFromEvents(machine.id, machineEvents)

      // Se a máquina está alocada, adicionar à lista
      if (state.current_site_id && state.current_allocation_event_id) {
        activeAllocations.push({
          allocation_event_id: state.current_allocation_event_id,
          machine_id: machine.id,
          machine_unit_number: machine.unit_number,
          machine_type: (() => {
            const type = machine.machine_type;
            if (Array.isArray(type)) {
              return (type[0] as any)?.nome || '';
            }
            return (type as any)?.nome || '';
          })(),
          machine_ownership: machine.ownership_type,
          machine_supplier_id: (() => {
            const supplier = machine.supplier;
            if (Array.isArray(supplier)) {
              return (supplier[0] as any)?.id || null;
            }
            return (supplier as any)?.id || null;
          })(),
          machine_supplier_name: (() => {
            const supplier = machine.supplier;
            if (Array.isArray(supplier)) {
              return (supplier[0] as any)?.nome || null;
            }
            return (supplier as any)?.nome || null;
          })(),
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

  // 5. Otimização final: Preencher downtime reasons usando os eventos já carregados (se possível)
  // ou buscar apenas os necessários se não estiverem no payload inicial (mas estão, pois selecionamos *)
  
  // Criar mapa de eventos por ID para busca rápida de reason
  const eventsById = new Map<string, any>()
  if (allEvents) {
    for (const event of allEvents) {
      eventsById.set(event.id, event)
    }
  }

  for (const allocation of activeAllocations) {
    if (allocation.current_downtime_event_id) {
      const downtimeEvent = eventsById.get(allocation.current_downtime_event_id)
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
 * Retorna o histórico completo de máquinas que já passaram pelo site
 * Independente se estão ativas ou não no momento
 */
export async function getHistoricalSiteAllocations(siteId: string): Promise<ActiveAllocation[]> {
  // 1. Buscar eventos relevantes de alocação para este site
  // Inclui:
  // - start_allocation: alocações de máquinas
  // - extension_attach: alocações de extensões
  const { data: events, error: eventsError } = await supabaseServer
    .from('allocation_events')
    .select(`
      id,
      event_type,
      machine_id,
      extension_id,
      site_id,
      machine:machines(
        id,
        unit_number,
        ownership_type,
        machine_type:machine_types(id, nome, is_attachment),
        supplier:suppliers(id, nome)
      ),
      extension:machines(
        id,
        unit_number,
        ownership_type,
        machine_type:machine_types(id, nome, is_attachment),
        supplier:suppliers(id, nome)
      )
    `)
    .eq('site_id', siteId)
    .in('event_type', ['start_allocation', 'extension_attach'])
    .eq('status', 'approved')
    .order('event_date', { ascending: false })

  if (eventsError) {
    throw new Error(`Erro ao buscar histórico de eventos: ${eventsError.message}`)
  }

  if (!events || events.length === 0) {
    return []
  }

  // 2. Filtrar itens únicos (máquinas e extensões)
  const uniqueItems = new Map<string, any>()
  
  for (const event of events as any[]) {
    // Máquinas (start_allocation normal ou extensão tratada como máquina independente)
    if (event.event_type === 'start_allocation' && event.machine && event.machine_id) {
      const key = `machine:${event.machine_id}`
      if (!uniqueItems.has(key)) {
        uniqueItems.set(key, {
          kind: 'machine',
          event_id: event.id,
          machine: event.machine,
        })
      }
    }

    // Extensões anexadas a uma máquina (lógica antiga)
    if (event.event_type === 'extension_attach' && event.extension && event.extension.id) {
      const key = `extension:${event.extension.id}`
      if (!uniqueItems.has(key)) {
        uniqueItems.set(key, {
          kind: 'extension',
          event_id: event.id,
          machine: event.extension,
        })
      }
    }

    // Extensões tratadas como máquinas independentes (lógica nova)
    if (event.event_type === 'extension_attach' && !event.extension && event.machine && event.machine_id) {
      const key = `machine:${event.machine_id}`
      if (!uniqueItems.has(key)) {
        uniqueItems.set(key, {
          kind: 'machine',
          event_id: event.id,
          machine: event.machine,
        })
      }
    }
  }

  // 3. Mapear para o formato ActiveAllocation (adaptado para histórico)
  const historicalAllocations: ActiveAllocation[] = []
  
  const items = Array.from(uniqueItems.values())
  for (const data of items) {
    const { machine, event_id } = data
    
    historicalAllocations.push({
      allocation_event_id: event_id,
      machine_id: machine.id,
      machine_unit_number: machine.unit_number,
      machine_type: (() => {
        const type = machine.machine_type;
        if (Array.isArray(type)) {
          return (type[0] as any)?.nome || '';
        }
        return (type as any)?.nome || '';
      })(),
      machine_ownership: machine.ownership_type,
      machine_supplier_id: (() => {
        const supplier = machine.supplier;
        if (Array.isArray(supplier)) {
          return (supplier[0] as any)?.id || null;
        }
        return (supplier as any)?.id || null;
      })(),
      machine_supplier_name: (() => {
        const supplier = machine.supplier;
        if (Array.isArray(supplier)) {
          return (supplier[0] as any)?.nome || null;
        }
        return (supplier as any)?.nome || null;
      })(),
      site_id: siteId,
      site_title: '',
      construction_type: null,
      lot_building_number: null,
      allocation_start: '',
      is_in_downtime: false,
      current_downtime_event_id: null,
      current_downtime_reason: null,
      current_downtime_start: null,
      attached_extensions: [],
    })
  }

  return historicalAllocations
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

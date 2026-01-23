import { supabaseServer } from '../supabase-server'
import { ActiveAllocation, ActiveDowntime, SiteAllocationSummary, MachineAllocationState } from './types'
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
      machine_type:machine_types(id, nome, icon),
      supplier:suppliers(id, nome)
    `)
    .eq('ativo', true)

  if (machinesError) {
    throw new Error(`Erro ao buscar máquinas: ${machinesError.message}`)
  }

  if (!machines || machines.length === 0) {
    return []
  }

  // 2. Buscar TODOS os eventos de uma vez (aprovados ou não-abastecimento)
  // Isso evita o problema de N+1 queries que causava timeout
  const { data: allEvents, error: eventsError } = await supabaseServer
    .from('allocation_events')
    .select(`
      *,
      site:sites(id, title),
      extension:machines(id, unit_number, machine_type:machine_types(id, nome, icon, is_attachment))
    `)
    .or('status.eq.approved,event_type.neq.refueling')
    .order('event_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (eventsError) {
    throw new Error(`Erro ao buscar eventos: ${eventsError.message}`)
  }

  // 3. Agrupar eventos por machine_id e extension_id para processamento rápido
  const eventsByMachine = new Map<string, any[]>()
  const siteTitles = new Map<string, string>()

  if (allEvents) {
    for (const event of allEvents) {
      // Coletar nomes de sites
      if (event.site_id && event.site?.title) {
        siteTitles.set(event.site_id, event.site.title)
      }

      // Adicionar para a máquina principal
      if (event.machine_id) {
        if (!eventsByMachine.has(event.machine_id)) {
          eventsByMachine.set(event.machine_id, [])
        }
        eventsByMachine.get(event.machine_id)?.push(event)
      }
      
      // Adicionar também para a extensão (se houver uma e for diferente da máquina principal)
      if (event.extension_id && event.extension_id !== event.machine_id) {
        if (!eventsByMachine.has(event.extension_id)) {
          eventsByMachine.set(event.extension_id, [])
        }
        eventsByMachine.get(event.extension_id)?.push(event)
      }
    }
  }

  const activeAllocations: ActiveAllocation[] = []

  // 4. Calcular estado de cada máquina em memória
  for (const machine of machines) {
    try {
      // Usar os eventos já carregados em memória
      const machineEvents = eventsByMachine.get(machine.id) || []
      const state = calculateStateFromEvents(machine.id, machineEvents)

      // Se a máquina está alocada, em trânsito, em manutenção OU em uma obra, adicionar à lista
      if (state.current_allocation_event_id || state.status === 'in_transit' || state.is_in_downtime || state.current_site_id) {
        // Objeto base da alocação
        const baseAllocation: ActiveAllocation = {
          allocation_event_id: state.current_allocation_event_id,
          machine_id: machine.id,
          machine_unit_number: machine.unit_number,
          machine_type: (() => {
            const type = machine.machine_type;
            if (Array.isArray(type)) return (type[0] as any)?.nome || '';
            return (type as any)?.nome || '';
          })(),
          machine_type_icon: (() => {
            const type = machine.machine_type;
            if (Array.isArray(type)) return (type[0] as any)?.icon || null;
            return (type as any)?.icon || null;
          })(),
          machine_ownership: machine.ownership_type,
          machine_supplier_id: (() => {
            const supplier = machine.supplier;
            if (Array.isArray(supplier)) return (supplier[0] as any)?.id || null;
            return (supplier as any)?.id || null;
          })(),
          machine_supplier_name: (() => {
            const supplier = machine.supplier;
            if (Array.isArray(supplier)) return (supplier[0] as any)?.nome || null;
            return (supplier as any)?.nome || null;
          })(),
          site_id: state.current_site_id,
          site_title: state.current_site_title || siteTitles.get(state.current_site_id || '') || '',
          construction_type: state.construction_type,
          lot_building_number: state.lot_building_number,
          allocation_start: state.allocation_start || '',
          end_date: state.end_date,
          planned_end_date: state.planned_end_date,
          is_in_downtime: state.is_in_downtime,
          current_downtime_event_id: state.current_downtime_event_id,
          current_downtime_reason: null,
          current_downtime_start: state.downtime_start,
          attached_extensions: state.attached_extensions,
          status: state.status,
          is_currently_at_site: !!state.current_site_id && state.status !== 'in_transit',
          previous_site_id: state.previous_site_id,
          origin_site_id: state.status === 'in_transit' ? state.current_site_id : null,
          destination_site_id: state.status === 'in_transit' ? state.destination_site_id : null,
          physical_site_id: state.status !== 'in_transit' ? state.current_site_id : null
        }

        activeAllocations.push(baseAllocation)
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
    machines_working: allocations.filter(a => a.status === 'allocated' || a.status === 'exceeded').length,
    allocations,
  }
}

/**
 * Retorna o histórico completo de máquinas que já passaram pelo site
 * Independente se estão ativas ou não no momento
 */
export async function getHistoricalSiteAllocations(siteId: string): Promise<ActiveAllocation[]> {
  // 1. Identificar todas as máquinas que já passaram por este site
  const { data: machineRefs, error: refsError } = await supabaseServer
    .from('allocation_events')
    .select('machine_id, extension_id')
    .eq('site_id', siteId)
    .or('status.eq.approved,event_type.neq.refueling')

  if (refsError) {
    throw new Error(`Erro ao buscar referências de máquinas: ${refsError.message}`)
  }

  const machineIds = new Set<string>()
  machineRefs?.forEach(ref => {
    if (ref.machine_id) machineIds.add(ref.machine_id)
    if (ref.extension_id) machineIds.add(ref.extension_id)
  })

  if (machineIds.size === 0) return []

  // 2. Buscar o histórico COMPLETO dessas máquinas para entender os ciclos de alocação (cross-site)
  const { data: allEvents, error: eventsError } = await supabaseServer
    .from('allocation_events')
    .select(`
      *,
      site:sites(id, title)
    `)
    .or(`machine_id.in.(${Array.from(machineIds).join(',')}),extension_id.in.(${Array.from(machineIds).join(',')})`)
    .or('status.eq.approved,event_type.neq.refueling')
    .order('event_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (eventsError) {
    console.error('Error fetching historical events:', eventsError)
    throw new Error(`Error fetching historical events: ${eventsError.message}`)
  }

  // 2.5 Buscar os dados de todas as máquinas envolvidas para evitar problemas de relacionamento múltiplo
  const { data: machinesData, error: machinesError } = await supabaseServer
    .from('machines')
    .select(`
      id,
      unit_number,
      ownership_type,
      machine_type:machine_types(id, nome, icon, is_attachment),
      supplier:suppliers(id, nome)
    `)
    .in('id', Array.from(machineIds))

  if (machinesError) {
    console.error('Error fetching machines data:', machinesError)
    throw new Error(`Error fetching machines data: ${machinesError.message}`)
  }

  // Criar um mapa de máquinas para acesso rápido
  const machinesMap = new Map()
  machinesData?.forEach(m => machinesMap.set(m.id, m))

  // 3. Processar eventos por máquina
  const eventsByMachine = new Map<string, any[]>()
  
  allEvents?.forEach(event => {
    if (event.machine_id) {
      if (!eventsByMachine.has(event.machine_id)) eventsByMachine.set(event.machine_id, [])
      eventsByMachine.get(event.machine_id)?.push(event)
    }
    if (event.extension_id && event.extension_id !== event.machine_id) {
      if (!eventsByMachine.has(event.extension_id)) eventsByMachine.set(event.extension_id, [])
      eventsByMachine.get(event.extension_id)?.push(event)
    }
  })

  const historicalAllocations: ActiveAllocation[] = []

  // 4. Para cada máquina, processar sua linha do tempo de eventos em ciclos
  for (const [mId, mEvents] of Array.from(eventsByMachine.entries())) {
    const machine = machinesMap.get(mId)
    if (!machine) continue

    let currentCycleEvents: any[] = []
    let rootAllocationId: string | null = null
    
    for (let i = 0; i < mEvents.length; i++) {
      const event = mEvents[i]
      
      // Se estamos começando um novo ciclo, guardamos o ID do evento raiz
      if (currentCycleEvents.length === 0) {
        rootAllocationId = event.id
      }
      
      currentCycleEvents.push(event)

      // Uma alocação só termina de fato no end_allocation, extension_detach ou se o histórico acabar.
      // transport_start NÃO termina a alocação comercial, apenas muda a máquina de lugar físico.
      const isCycleEnd = event.event_type === 'end_allocation' || 
                         event.event_type === 'extension_detach' || 
                         i === mEvents.length - 1;

      if (isCycleEnd) {
        // Verificamos se este site participou de alguma forma deste ciclo
        // Participação = evento no site OU destino de um transporte
        const siteParticipated = currentCycleEvents.some(e => 
          e.site_id === siteId || 
          (e.event_type === 'transport_start' && e.site_id === siteId)
        )
        
        if (siteParticipated && rootAllocationId) {
          const firstEvent = currentCycleEvents[0]
          
          // Calcular estado ao final deste ciclo específico
          const cycleState: MachineAllocationState = calculateStateFromEvents(machine.id, currentCycleEvents)
          
          // Verificar se a máquina AINDA está neste site HOJE (usando histórico COMPLETO)
          const currentState: MachineAllocationState = calculateStateFromEvents(machine.id, mEvents)
          
          // Regra de presença física conforme feedback do usuário:
          // 1. Se a máquina está em trânsito hoje:
          //    - Na obra de DESTINO: ela está "Em trânsito" (isCurrentlyAtSite = true)
          //    - Na obra de ORIGEM: ela já saiu, portanto "Movida" (isCurrentlyAtSite = false)
          // 2. Se a máquina NÃO está em trânsito hoje:
          //    - Está presente apenas se o siteId for o site atual (currentState.current_site_id)
          //    - E se a alocação não tiver sido encerrada (status !== 'available')

          let isCurrentlyAtSite = false;
          
          if (currentState.status === 'in_transit') {
            // Se está em trânsito, só é considerada "presente" (para fins de status ativo/em trânsito) na obra de DESTINO
            isCurrentlyAtSite = currentState.destination_site_id === siteId;
          } else {
            // Se não está em trânsito, está presente apenas se este for o site atual
            isCurrentlyAtSite = currentState.current_site_id === siteId && currentState.status !== 'available';
          }

          // Evitar duplicidade: Usar o ID da alocação raiz (start_allocation)
          const isDuplicate = historicalAllocations.some(a => 
            a.machine_id === machine.id && 
            a.site_id === siteId && 
            a.allocation_event_id === rootAllocationId
          );

          if (!isDuplicate) {
            // Tentar encontrar a data de início específica para ESTE site dentro do ciclo
            const siteFirstEvent = currentCycleEvents.find(e => 
              e.site_id === siteId || (e.event_type === 'transport_start' && e.site_id === siteId)
            );

            historicalAllocations.push({
              allocation_event_id: rootAllocationId,
              machine_id: machine.id,
              machine_unit_number: machine.unit_number,
              machine_type: machine.machine_type?.nome || '',
              machine_type_icon: machine.machine_type?.icon || null,
              machine_ownership: machine.ownership_type,
              machine_supplier_id: machine.supplier?.id || null,
              machine_supplier_name: machine.supplier?.nome || null,
              site_id: siteId,
              site_title: currentCycleEvents.find(e => e.site_id === siteId)?.site?.title || '',
              construction_type: siteFirstEvent?.construction_type || firstEvent.construction_type,
              lot_building_number: siteFirstEvent?.lot_building_number || firstEvent.lot_building_number,
              allocation_start: siteFirstEvent?.event_date || firstEvent.event_date,
              planned_end_date: cycleState.planned_end_date,
              actual_end_date: event.event_type === 'end_allocation' || event.event_type === 'extension_detach' ? event.event_date : null,
              end_date: event.event_type === 'end_allocation' || event.event_type === 'extension_detach' ? event.event_date : cycleState.planned_end_date,
              status: cycleState.status,
              is_in_downtime: cycleState.is_in_downtime,
              attached_extensions: [],
              is_currently_at_site: isCurrentlyAtSite,
              destination_site_id: currentState.destination_site_id || undefined,
              current_downtime_event_id: cycleState.current_downtime_event_id || null,
              current_downtime_reason: cycleState.current_downtime_reason || null,
              current_downtime_start: cycleState.current_downtime_start || null,
            })
          }
        }
        
        // Se foi um evento de encerramento de ciclo, limpamos para o próximo
        if (event.event_type === 'end_allocation' || event.event_type === 'extension_detach') {
          currentCycleEvents = []
          rootAllocationId = null
        }
      }
    }
  }

  // 4. Ordenar por data de início decrescente para o UI
  return historicalAllocations.sort((a, b) => {
    const dateA = new Date(a.start_date || a.allocation_start).getTime()
    const dateB = new Date(b.start_date || b.allocation_start).getTime()
    return dateB - dateA
  })
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
      site_id: a.site_id || null,
      site_title: a.site_title || null,
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
    site_id: (downtimeEvent.site as any)?.id || null,
    site_title: (downtimeEvent.site as any)?.title || null,
    downtime_reason: downtimeEvent.downtime_reason || '',
    downtime_description: downtimeEvent.downtime_description,
    downtime_start: downtimeEvent.event_date,
  }
}

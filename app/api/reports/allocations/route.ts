import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { calculateStateFromEvents } from '@/lib/allocation/stateCalculation'
import { ActiveAllocation } from '@/lib/allocation/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateTo = searchParams.get('dateTo')
    const allPeriod = searchParams.get('allPeriod') === 'true'

    // 1. Fetch all machines
    const { data: machines, error: machinesError } = await supabaseServer
      .from('machines')
      .select(`
        id,
        unit_number,
        notas,
        ownership_type,
        machine_type:machine_types(id, nome, icon),
        supplier:suppliers(id, nome)
      `)
      .eq('ativo', true)

    if (machinesError) throw machinesError

    // 2. Fetch events up to dateTo (if not allPeriod)
    let query = supabaseServer
      .from('allocation_events')
      .select(`
        *,
        site:sites(id, title),
        extension:machines(id, unit_number, machine_type:machine_types(id, nome, icon, is_attachment))
      `)
      .or('status.eq.approved,event_type.neq.refueling')
      .order('event_date', { ascending: true })
      .order('created_at', { ascending: true })

    if (!allPeriod && dateTo) {
      // We want to see the state at the end of dateTo
      // So we include all events up to the end of that day
      const endOfDay = new Date(dateTo)
      endOfDay.setHours(23, 59, 59, 999)
      query = query.lte('event_date', endOfDay.toISOString())
    }

    const { data: allEvents, error: eventsError } = await query

    if (eventsError) throw eventsError

    // 3. Group events by machine
    const eventsByMachine = new Map<string, any[]>()
    const siteTitles = new Map<string, string>()

    if (allEvents) {
      for (const event of allEvents) {
        if (event.site_id && event.site?.title) {
          siteTitles.set(event.site_id, event.site.title)
        }
        if (event.machine_id) {
          if (!eventsByMachine.has(event.machine_id)) eventsByMachine.set(event.machine_id, [])
          eventsByMachine.get(event.machine_id)?.push(event)
        }
        if (event.extension_id && event.extension_id !== event.machine_id) {
          if (!eventsByMachine.has(event.extension_id)) eventsByMachine.set(event.extension_id, [])
          eventsByMachine.get(event.extension_id)?.push(event)
        }
      }
    }

    // 4. Calculate state for each machine
    const allocations: any[] = []
    for (const machine of machines) {
      const machineEvents = eventsByMachine.get(machine.id) || []
      const state = calculateStateFromEvents(machine.id, machineEvents)

      // Even if not currently allocated, we might want to show it in the report if requested
      // But the user said "Quais máquinas estão alocadas", so we filter those with a site or in transit
      if (state.current_site_id || state.status === 'in_transit' || state.status === 'maintenance') {
        allocations.push({
          machine_id: machine.id,
          machine_unit_number: machine.unit_number,
          machine_description: machine.notas,
          machine_type: (machine.machine_type as any)?.nome || '',
          site_title: state.current_site_title || siteTitles.get(state.current_site_id || '') || 'Sem Localização',
          construction_type: state.construction_type,
          lot_building_number: state.lot_building_number,
          status: state.status,
          is_in_downtime: state.is_in_downtime,
          attached_extensions: state.attached_extensions,
          end_date: state.end_date
        })
      }
    }

    return NextResponse.json({ success: true, allocations })
  } catch (error: any) {
    console.error('Error in allocations report API:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

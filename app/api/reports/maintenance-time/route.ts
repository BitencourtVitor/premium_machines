import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const allPeriod = searchParams.get('allPeriod') === 'true'
    const provider = searchParams.get('provider') // 'owned' or 'rented'

    // 1. Fetch machines with basic info
    let machinesQuery = supabaseServer
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

    if (provider === 'owned') {
      machinesQuery = machinesQuery.like('unit_number', 'P%')
    } else if (provider === 'rented') {
      machinesQuery = machinesQuery.not('unit_number', 'like', 'P%')
    }

    const { data: machines, error: machinesError } = await machinesQuery
    if (machinesError) throw machinesError

    const machineIds = machines.map(m => m.id)
    if (machineIds.length === 0) {
      return NextResponse.json({ success: true, maintenanceEvents: [] })
    }

    // 2. Fetch maintenance-related events for these machines
    // We only need downtime_start and downtime_end for this report
    let eventsQuery = supabaseServer
      .from('allocation_events')
      .select(`
        *,
        site:sites(id, title, address),
        user:users!allocation_events_created_by_fkey(id, nome)
      `)
      .in('machine_id', machineIds)
      .eq('status', 'approved')
      .in('event_type', ['downtime_start', 'downtime_end'])
      .order('event_date', { ascending: true })
      .order('created_at', { ascending: true })

    const { data: events, error: eventsError } = await eventsQuery
    if (eventsError) throw eventsError

    // 3. Process events to group maintenance periods
    const maintenanceEvents: any[] = []
    const maintenanceReasons = ['maintenance', 'preventive', 'corrective', 'defect']
    
    const getDowntimeDescription = (event: any) => {
      if (event.downtime_description) return event.downtime_description
      if (event.downtime_reason === 'preventive' || event.downtime_reason === 'maintenance') return 'Manutenção Preventiva'
      if (event.downtime_reason === 'corrective' || event.downtime_reason === 'defect') return 'Manutenção Corretiva'
      return 'N/A'
    }

    // Group events by machine
    const machineEventsMap = new Map<string, any[]>()
    for (const event of events || []) {
      if (!machineEventsMap.has(event.machine_id)) {
        machineEventsMap.set(event.machine_id, [])
      }
      machineEventsMap.get(event.machine_id)?.push(event)
    }

    // Reference dates for filtering
    const startDateFilter = dateFrom && !allPeriod ? new Date(dateFrom) : null
    const endDateFilter = dateTo && !allPeriod ? new Date(dateTo) : null
    if (endDateFilter) endDateFilter.setHours(23, 59, 59, 999)

    for (const machine of machines) {
      const machineEvents = machineEventsMap.get(machine.id) || []
      let currentStartEvent: any = null

      for (const event of machineEvents) {
        // We look for downtime_start with maintenance-related reasons
        if (event.event_type === 'downtime_start' && maintenanceReasons.includes(event.downtime_reason)) {
          // If we already had one, we close it as "ongoing" (though usually sequential)
          if (currentStartEvent) {
            const maintenanceStart = new Date(currentStartEvent.event_date)
            
            // Filter: Must have started before or during the period, OR be ongoing
            const startsBeforeEnd = !endDateFilter || maintenanceStart <= endDateFilter
            
            if (startsBeforeEnd) {
              maintenanceEvents.push({
                machine_unit_number: machine.unit_number,
                machine_type: (machine.machine_type as any)?.nome || '',
                ownership_type: machine.ownership_type,
                start_date: currentStartEvent.event_date,
                end_date: null,
                site_title: currentStartEvent.site?.title || 'N/A',
                site_address: currentStartEvent.site?.address || '',
                description: getDowntimeDescription(currentStartEvent),
                user_name: currentStartEvent.user?.nome || 'N/A',
                is_ongoing: true
              })
            }
          }
          currentStartEvent = event
        } else if (event.event_type === 'downtime_end' && currentStartEvent) {
          // Found a complete maintenance period
          const maintenanceStart = new Date(currentStartEvent.event_date)
          const maintenanceEnd = new Date(event.event_date)

          // Filter: Must overlap with the selected period
          // (Starts before period ends AND ends after period starts)
          const overlaps = (!endDateFilter || maintenanceStart <= endDateFilter) && 
                           (!startDateFilter || maintenanceEnd >= startDateFilter)

          if (overlaps) {
            maintenanceEvents.push({
              machine_unit_number: machine.unit_number,
              machine_type: (machine.machine_type as any)?.nome || '',
              ownership_type: machine.ownership_type,
              start_date: currentStartEvent.event_date,
              end_date: event.event_date,
              site_title: currentStartEvent.site?.title || 'N/A',
              site_address: currentStartEvent.site?.address || '',
              description: getDowntimeDescription(currentStartEvent),
              user_name: currentStartEvent.user?.nome || 'N/A',
              is_ongoing: false
            })
          }
          currentStartEvent = null
        }
      }

      // If we finished processing events for this machine and still have a start event,
      // it means maintenance is ongoing
      if (currentStartEvent) {
        const maintenanceStart = new Date(currentStartEvent.event_date)
        
        // Filter: Must have started before or during the period
        const startsBeforeEnd = !endDateFilter || maintenanceStart <= endDateFilter

        if (startsBeforeEnd) {
          maintenanceEvents.push({
            machine_unit_number: machine.unit_number,
            machine_type: (machine.machine_type as any)?.nome || '',
            ownership_type: machine.ownership_type,
            start_date: currentStartEvent.event_date,
            end_date: null,
            site_title: currentStartEvent.site?.title || 'N/A',
            site_address: currentStartEvent.site?.address || '',
            description: getDowntimeDescription(currentStartEvent),
            user_name: currentStartEvent.user?.nome || 'N/A',
            is_ongoing: true
          })
        }
      }
    }

    // Sort by start_date descending
    maintenanceEvents.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())

    return NextResponse.json({ success: true, maintenanceEvents })
  } catch (error: any) {
    console.error('Error in maintenance time report API:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

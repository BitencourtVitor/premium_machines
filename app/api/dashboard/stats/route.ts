import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getActiveAllocations } from '@/lib/allocation/queries'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Get machines stats based on allocation engine (events)
    const { data: machines, error: machinesError } = await supabaseServer
      .from('machines')
      .select('id, ownership_type, ativo')

    if (machinesError) {
      console.error('Error fetching machines:', machinesError)
    }

    const machinesList = (machines || []).filter(m => m.ativo)
    const totalMachines = machinesList.length

    // Use active allocations to determine allocated/maintenance
    const activeAllocations = await getActiveAllocations()
    const allocatedMachineIds = new Set(activeAllocations.map(a => a.machine_id))
    const maintenanceMachineIds = new Set(
      activeAllocations.filter(a => a.is_in_downtime).map(a => a.machine_id)
    )
    const inTransitMachineIds = new Set(
      activeAllocations.filter(a => a.status === 'in_transit').map(a => a.machine_id)
    )

    const allocatedMachines = machinesList.filter(m => allocatedMachineIds.has(m.id)).length
    const maintenanceMachines = machinesList.filter(m => maintenanceMachineIds.has(m.id)).length
    const inTransitMachines = machinesList.filter(m => inTransitMachineIds.has(m.id)).length
    const availableMachines = totalMachines - allocatedMachines

    const ownedMachines = machinesList.filter(m => m.ownership_type === 'owned').length
    const rentedMachines = machinesList.filter(m => m.ownership_type === 'rented').length

    // Get sites stats
    const { data: sites, error: sitesError } = await supabaseServer
      .from('sites')
      .select('id, ativo, is_headquarters')

    if (sitesError) {
      console.error('Error fetching sites:', sitesError)
    }

    const sitesList = sites || []
    const totalSites = sitesList.length
    const activeSites = sitesList.filter(s => s.ativo && !s.is_headquarters).length

    // Get pending events
    const { data: pendingEvents, error: eventsError } = await supabaseServer
      .from('allocation_events')
      .select('id')
      .eq('status', 'pending')

    if (eventsError) {
      console.error('Error fetching events:', eventsError)
    }

    const pendingCount = pendingEvents?.length || 0

    // Get recent events ordered by event date (most recent first)
    const { data: recentEvents, error: recentError } = await supabaseServer
      .from('allocation_events')
      .select(`
        id,
        event_type,
        status,
        event_date,
        created_at,
        machine:machines(id, unit_number),
        site:sites(id, title)
      `)
      .order('event_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50)

    if (recentError) {
      console.error('Error fetching recent events:', recentError)
    }

    const stats = {
      totalMachines,
      allocatedMachines,
      availableMachines,
      maintenanceMachines,
      inTransitMachines,
      totalSites,
      activeSites,
      pendingEvents: pendingCount,
      ownedMachines,
      rentedMachines,
    }

    return NextResponse.json({ 
      success: true, 
      stats,
      recentEvents: recentEvents || []
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    // Get machines stats
    const { data: machines, error: machinesError } = await supabaseServer
      .from('machines')
      .select('id, status, ownership_type')
      .eq('ativo', true)

    if (machinesError) {
      console.error('Error fetching machines:', machinesError)
    }

    const machinesList = machines || []
    const totalMachines = machinesList.length
    const allocatedMachines = machinesList.filter(m => m.status === 'allocated').length
    const availableMachines = machinesList.filter(m => m.status === 'available').length
    const maintenanceMachines = machinesList.filter(m => m.status === 'maintenance').length
    const ownedMachines = machinesList.filter(m => m.ownership_type === 'owned').length
    const rentedMachines = machinesList.filter(m => m.ownership_type === 'rented').length

    // Get sites stats
    const { data: sites, error: sitesError } = await supabaseServer
      .from('sites')
      .select('id, ativo')

    if (sitesError) {
      console.error('Error fetching sites:', sitesError)
    }

    const sitesList = sites || []
    const totalSites = sitesList.length
    const activeSites = sitesList.filter(s => s.ativo).length

    // Get pending events
    const { data: pendingEvents, error: eventsError } = await supabaseServer
      .from('allocation_events')
      .select('id')
      .eq('status', 'pending')

    if (eventsError) {
      console.error('Error fetching events:', eventsError)
    }

    const pendingCount = pendingEvents?.length || 0

    // Get recent events
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
      .order('created_at', { ascending: false })
      .limit(10)

    if (recentError) {
      console.error('Error fetching recent events:', recentError)
    }

    const stats = {
      totalMachines,
      allocatedMachines,
      availableMachines,
      maintenanceMachines,
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

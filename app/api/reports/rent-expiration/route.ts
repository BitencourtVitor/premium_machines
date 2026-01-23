import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { calculateStateFromEvents } from '@/lib/allocation/stateCalculation'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateTo = searchParams.get('dateTo')
    const allPeriod = searchParams.get('allPeriod') === 'true'

    // 1. Fetch all machines with billing info
    const { data: machines, error: machinesError } = await supabaseServer
      .from('machines')
      .select(`
        id,
        unit_number,
        notas,
        ownership_type,
        billing_type,
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
        site:sites(id, title, address)
      `)
      .or('status.eq.approved,event_type.neq.refueling')
      .order('event_date', { ascending: true })
      .order('created_at', { ascending: true })

    if (!allPeriod && dateTo) {
      const endOfDay = new Date(dateTo)
      endOfDay.setHours(23, 59, 59, 999)
      query = query.lte('event_date', endOfDay.toISOString())
    }

    const { data: allEvents, error: eventsError } = await query

    if (eventsError) throw eventsError

    // 3. Group events by machine
    const eventsByMachine = new Map<string, any[]>()
    const siteInfo = new Map<string, { title: string, address: string }>()

    if (allEvents) {
      for (const event of allEvents) {
        if (event.site_id && event.site) {
          siteInfo.set(event.site_id, { 
            title: event.site.title, 
            address: event.site.address 
          })
        }
        if (event.machine_id) {
          if (!eventsByMachine.has(event.machine_id)) eventsByMachine.set(event.machine_id, [])
          eventsByMachine.get(event.machine_id)?.push(event)
        }
      }
    }

    // 4. Calculate state and expiration for each machine
    const referenceDate = !allPeriod && dateTo ? new Date(dateTo) : new Date()
    if (!allPeriod && dateTo) {
      referenceDate.setUTCHours(23, 59, 59, 999)
    }

    const expirations: any[] = []
    for (const machine of machines) {
      const machineEvents = eventsByMachine.get(machine.id) || []
      const state = calculateStateFromEvents(machine.id, machineEvents, referenceDate)

      // Only active allocations
      if (state.status === 'allocated' || state.status === 'maintenance' || state.status === 'exceeded') {
        let expirationDate = state.end_date || null

        if (!expirationDate && state.allocation_start && machine.billing_type) {
          const startDate = new Date(state.allocation_start)
          const calcDate = new Date(startDate.getTime())
          switch (machine.billing_type) {
            case 'monthly':
              calcDate.setUTCDate(calcDate.getUTCDate() + 30)
              break
            case 'weekly':
              calcDate.setUTCDate(calcDate.getUTCDate() + 7)
              break
            case 'daily':
              calcDate.setUTCDate(calcDate.getUTCDate() + 1)
              break
          }
          expirationDate = calcDate.toISOString()
        }

        const site = state.current_site_id ? siteInfo.get(state.current_site_id) : null

        expirations.push({
          machine_id: machine.id,
          machine_unit_number: machine.unit_number,
          machine_description: machine.notas,
          machine_type: (machine.machine_type as any)?.nome || '',
          site_title: site?.title || 'Sem Localização',
          site_address: site?.address || '',
          construction_type: state.construction_type,
          lot_building_number: state.lot_building_number,
          allocation_start: state.allocation_start,
          expiration_date: expirationDate,
          billing_type: machine.billing_type,
          status: state.status
        })
      }
    }

    // 5. Sort expirations by date (earliest/overdue first)
    expirations.sort((a, b) => {
      if (!a.expiration_date) return 1
      if (!b.expiration_date) return -1
      return new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime()
    })

    return NextResponse.json({ success: true, expirations })
  } catch (error: any) {
    console.error('Error in rent expiration report API:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

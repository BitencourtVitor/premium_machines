import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const machineId = searchParams.get('machineId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const allPeriod = searchParams.get('allPeriod') === 'true'

    if (!machineId) {
      return NextResponse.json({ success: false, message: 'ID da máquina é obrigatório' }, { status: 400 })
    }

    // 1. Fetch machine details
    const { data: machine, error: machineError } = await supabaseServer
      .from('machines')
      .select(`
        *,
        machine_type:machine_types(*),
        supplier:suppliers(*)
      `)
      .eq('id', machineId)
      .single()

    if (machineError) throw machineError

    // 2. Fetch all events for this machine
    let query = supabaseServer
      .from('allocation_events')
      .select(`
        *,
        site:sites(*),
        extension:machines(id, unit_number, machine_type:machine_types(nome)),
        user:users!allocation_events_created_by_fkey(id, nome)
      `)
      .or(`machine_id.eq.${machineId},extension_id.eq.${machineId}`)
      .order('event_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (!allPeriod) {
      if (dateFrom) query = query.gte('event_date', dateFrom)
      if (dateTo) {
        const endOfDay = new Date(dateTo)
        endOfDay.setHours(23, 59, 59, 999)
        query = query.lte('event_date', endOfDay.toISOString())
      }
    }

    const { data: allEvents, error: eventsError } = await query

    if (eventsError) throw eventsError

    // 3. Filter out pending refueling events
    const events = (allEvents || []).filter(event => {
      if (event.event_type === 'refueling' && event.status === 'pending') {
        return false
      }
      return true
    })

    return NextResponse.json({ 
      success: true, 
      machine,
      events 
    })
  } catch (error: any) {
    console.error('Error in machine history report API:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

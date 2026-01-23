import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')

    if (!start_date || !end_date) {
      return NextResponse.json({ success: false, message: 'Intervalo de datas é obrigatório' }, { status: 400 })
    }

    // 1. Fetch all refueling events in range
    const { data: events, error: eventsError } = await supabaseServer
      .from('allocation_events')
      .select(`
        *,
        machine:machines(id, unit_number, machine_type:machine_types(nome)),
        site:sites(id, title, address),
        user:users!allocation_events_created_by_fkey(id, nome)
      `)
      .eq('event_type', 'refueling')
      .gte('event_date', start_date)
      .lte('event_date', end_date)
      .order('event_date', { ascending: true })

    if (eventsError) throw eventsError

    // 2. Fetch all templates to see what was planned
    const { data: templates, error: templatesError } = await supabaseServer
      .from('refueling_templates')
      .select(`
        *,
        machine:machines(id, unit_number, machine_type:machine_types(nome)),
        site:sites(id, title, address),
        supplier:suppliers(id, nome)
      `)
      .eq('is_active', true)

    if (templatesError) throw templatesError

    return NextResponse.json({ 
      success: true, 
      events,
      templates
    })
  } catch (error: any) {
    console.error('Error in refueling control report API:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

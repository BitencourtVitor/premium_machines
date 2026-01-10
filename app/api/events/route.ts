import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { data: events, error } = await supabaseServer
      .from('allocation_events')
      .select(`
        *,
        machine:machines(id, unit_number),
        site:sites(id, title),
        supplier:suppliers(id, nome, supplier_type),
        created_by_user:users!allocation_events_created_by_fkey(id, nome),
        approved_by_user:users!allocation_events_approved_by_fkey(id, nome)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching events:', error)
      return NextResponse.json({ success: false, message: 'Erro ao buscar eventos' }, { status: 500 })
    }

    return NextResponse.json({ success: true, events })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Create the event
    const { data: event, error } = await supabaseServer
      .from('allocation_events')
      .insert({
        event_type: body.event_type,
        machine_id: body.machine_id,
        site_id: body.site_id || null,
        event_date: body.event_date,
        downtime_reason: body.downtime_reason || null,
        downtime_description: body.downtime_description || null,
        supplier_id: body.supplier_id || null,
        notas: body.notas || null,
        created_by: body.created_by,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating event:', error)
      return NextResponse.json({ success: false, message: 'Erro ao criar evento' }, { status: 500 })
    }

    return NextResponse.json({ success: true, event })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 })
  }
}

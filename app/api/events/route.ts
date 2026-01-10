import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const machineId = searchParams.get('machine_id')
    const siteId = searchParams.get('site_id')
    const status = searchParams.get('status')

    let query = supabaseServer
      .from('allocation_events')
      .select(`
        *,
        machine:machines(id, unit_number),
        site:sites(id, title),
        extension:machine_extensions(id, unit_number),
        supplier:suppliers(id, nome, supplier_type),
        created_by_user:users!allocation_events_created_by_fkey(id, nome),
        approved_by_user:users!allocation_events_approved_by_fkey(id, nome)
      `)

    if (machineId) {
      query = query.eq('machine_id', machineId)
    }

    if (siteId) {
      query = query.eq('site_id', siteId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: events, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit)

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

    // Validações básicas
    if (!body.event_type || !body.machine_id || !body.event_date || !body.created_by) {
      return NextResponse.json(
        { success: false, message: 'Campos obrigatórios: event_type, machine_id, event_date, created_by' },
        { status: 400 }
      )
    }

    // Create the event
    const { data: event, error } = await supabaseServer
      .from('allocation_events')
      .insert({
        event_type: body.event_type,
        machine_id: body.machine_id,
        site_id: body.site_id || null,
        extension_id: body.extension_id || null,
        construction_type: body.construction_type || null,
        lot_building_number: body.lot_building_number || null,
        event_date: body.event_date,
        end_date: body.end_date || null,
        downtime_reason: body.downtime_reason || null,
        downtime_description: body.downtime_description || null,
        supplier_id: body.supplier_id || null,
        corrects_event_id: body.corrects_event_id || null,
        correction_description: body.correction_description || null,
        notas: body.notas || null,
        created_by: body.created_by,
        status: 'pending',
      })
      .select(`
        *,
        machine:machines(id, unit_number),
        site:sites(id, title),
        extension:machine_extensions(id, unit_number),
        supplier:suppliers(id, nome, supplier_type),
        created_by_user:users!allocation_events_created_by_fkey(id, nome)
      `)
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

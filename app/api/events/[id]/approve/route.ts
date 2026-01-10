import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { approved_by } = body

    if (!approved_by) {
      return NextResponse.json(
        { success: false, message: 'ID do usuário aprovador é obrigatório' },
        { status: 400 }
      )
    }

    // First get the event to know its type and machine
    const { data: eventData, error: fetchError } = await supabaseServer
      .from('allocation_events')
      .select('*, machine:machines(id), site:sites(id)')
      .eq('id', params.id)
      .single()

    if (fetchError || !eventData) {
      console.error('Error fetching event:', fetchError)
      return NextResponse.json(
        { success: false, message: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    // Update the event to approved status
    const { data: event, error } = await supabaseServer
      .from('allocation_events')
      .update({
        status: 'approved',
        approved_by: approved_by,
        approved_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select(`
        *,
        machine:machines(id, unit_number),
        site:sites(id, title),
        supplier:suppliers(id, nome, supplier_type),
        created_by_user:users!allocation_events_created_by_fkey(id, nome),
        approved_by_user:users!allocation_events_approved_by_fkey(id, nome)
      `)
      .single()

    if (error) {
      console.error('Error approving event:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao aprovar evento' },
        { status: 500 }
      )
    }

    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    // Update machine's current_site_id and status based on event type
    let machineUpdateError = null
    if (event.event_type === 'allocation') {
      // For allocation events, set the machine's current site and status
      const { error: updateError } = await supabaseServer
        .from('machines')
        .update({
          current_site_id: event.site_id,
          status: 'allocated'
        })
        .eq('id', event.machine_id)

      machineUpdateError = updateError
    } else if (event.event_type === 'deallocation') {
      // For deallocation events, clear the machine's current site and set status to available
      const { error: updateError } = await supabaseServer
        .from('machines')
        .update({
          current_site_id: null,
          status: 'available'
        })
        .eq('id', event.machine_id)

      machineUpdateError = updateError
    }

    if (machineUpdateError) {
      console.error('Error updating machine site:', machineUpdateError)
      // Don't fail the request, just log the error
      // The event was approved successfully, just the machine site update failed
    }

    return NextResponse.json({ success: true, event })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      { status: 500 }
    )
  }
}
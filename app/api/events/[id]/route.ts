import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { createAuditLog } from '@/lib/auditLog'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { data: event, error } = await supabaseServer
      .from('allocation_events')
      .select(`
        *,
        machine:machines(id, unit_number),
        site:sites(id, title),
        extension:machine_extensions(id, unit_number),
        supplier:suppliers(id, nome, supplier_type),
        created_by_user:users!allocation_events_created_by_fkey(id, nome)
      `)
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, message: 'Evento não encontrado' },
        { status: 404 }
      )
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    // Validate if event exists
    const { data: existingEvent, error: fetchError } = await supabaseServer
      .from('allocation_events')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingEvent) {
      return NextResponse.json(
        { success: false, message: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {
      ...body,
      updated_at: new Date().toISOString(),
    }

    // Remove immutable fields
    delete updateData.id
    delete updateData.created_at
    delete updateData.created_by 

    const { data: updatedEvent, error: updateError } = await supabaseServer
      .from('allocation_events')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        machine:machines(id, unit_number),
        site:sites(id, title),
        extension:machine_extensions(id, unit_number),
        supplier:suppliers(id, nome, supplier_type),
        created_by_user:users!allocation_events_created_by_fkey(id, nome)
      `)
      .single()

    if (updateError) {
      console.error('Error updating event:', updateError)
      return NextResponse.json(
        { success: false, message: 'Erro ao atualizar evento' },
        { status: 500 }
      )
    }

    // Log action
    await createAuditLog({
      entidade: 'allocation_events',
      entidade_id: id,
      acao: 'update',
      dados_antes: existingEvent,
      dados_depois: updatedEvent,
      usuario_id: body.updated_by || existingEvent.created_by,
    })

    return NextResponse.json({ success: true, event: updatedEvent })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')

    // Validate if event exists
    const { data: existingEvent, error: fetchError } = await supabaseServer
      .from('allocation_events')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingEvent) {
      return NextResponse.json(
        { success: false, message: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    const { error: deleteError } = await supabaseServer
      .from('allocation_events')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting event:', deleteError)
      return NextResponse.json(
        { success: false, message: 'Erro ao deletar evento' },
        { status: 500 }
      )
    }

    // Log action
    await createAuditLog({
      entidade: 'allocation_events',
      entidade_id: id,
      acao: 'delete',
      dados_antes: existingEvent,
      usuario_id: userId || 'unknown',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      { status: 500 }
    )
  }
}

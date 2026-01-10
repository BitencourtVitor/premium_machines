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

    return NextResponse.json({ success: true, event })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      { status: 500 }
    )
  }
}
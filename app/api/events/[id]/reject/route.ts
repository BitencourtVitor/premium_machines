import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { processEventRejection } from '@/lib/eventProcessor'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { approved_by, rejection_reason } = body

    if (!approved_by) {
      return NextResponse.json(
        { success: false, message: 'ID do usuário que está rejeitando é obrigatório' },
        { status: 400 }
      )
    }

    if (!rejection_reason || rejection_reason.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Motivo da rejeição é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o evento existe
    const { data: eventData, error: fetchError } = await supabaseServer
      .from('allocation_events')
      .select(`
        *,
        machine:machines(id, unit_number),
        site:sites(id, title),
        created_by_user:users!allocation_events_created_by_fkey(id, nome)
      `)
      .eq('id', params.id)
      .single()

    if (fetchError || !eventData) {
      console.error('Error fetching event:', fetchError)
      return NextResponse.json(
        { success: false, message: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o evento já foi processado
    if (eventData.status === 'approved') {
      return NextResponse.json(
        { success: false, message: 'Evento já foi aprovado e não pode ser rejeitado' },
        { status: 400 }
      )
    }

    if (eventData.status === 'rejected') {
      return NextResponse.json(
        { success: false, message: 'Evento já foi rejeitado anteriormente' },
        { status: 400 }
      )
    }

    // Processar rejeição usando a biblioteca de eventos
    const result = await processEventRejection(params.id, approved_by, rejection_reason)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 500 }
      )
    }

    // Buscar o evento atualizado para retornar na resposta
    const { data: updatedEvent } = await supabaseServer
      .from('allocation_events')
      .select(`
        *,
        machine:machines(id, unit_number),
        site:sites(id, title),
        created_by_user:users!allocation_events_created_by_fkey(id, nome),
        approved_by_user:users!allocation_events_approved_by_fkey(id, nome)
      `)
      .eq('id', params.id)
      .single()

    return NextResponse.json({
      success: true,
      event: updatedEvent,
      message: 'Evento rejeitado com sucesso'
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}

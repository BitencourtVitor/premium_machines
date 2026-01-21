import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
import { processEventApproval } from '@/lib/eventProcessor'
import { createAuditLog } from '@/lib/auditLog'

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

    // Verificar se o evento existe e obter informações para a resposta
    const { data: eventData, error: fetchError } = await supabaseServer
      .from('allocation_events')
      .select(`
        *,
        machine:machines(id, unit_number),
        site:sites(id, title),
        supplier:suppliers(id, nome, supplier_type),
        created_by_user:users!allocation_events_created_by_fkey(id, nome),
        approved_by_user:users!allocation_events_approved_by_fkey(id, nome)
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
        { success: false, message: 'Evento já foi aprovado anteriormente' },
        { status: 400 }
      )
    }

    if (eventData.status === 'rejected') {
      return NextResponse.json(
        { success: false, message: 'Evento já foi rejeitado e não pode ser aprovado' },
        { status: 400 }
      )
    }

    // Processar aprovação usando a biblioteca de eventos
    const result = await processEventApproval(params.id, approved_by)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      )
    }

    // Buscar o evento atualizado para retornar na resposta
    const { data: updatedEvent } = await supabaseServer
      .from('allocation_events')
      .select(`
        *,
        machine:machines(id, unit_number),
        site:sites(id, title),
        supplier:suppliers(id, nome, supplier_type),
        created_by_user:users!allocation_events_created_by_fkey(id, nome),
        approved_by_user:users!allocation_events_approved_by_fkey(id, nome)
      `)
      .eq('id', params.id)
      .single()

    // Log action
    await createAuditLog({
      entidade: 'allocation_events',
      entidade_id: params.id,
      acao: 'update',
      dados_antes: eventData,
      dados_depois: updatedEvent,
      usuario_id: approved_by,
    })

    // Gerar mensagem apropriada baseada no tipo de evento
    let message = 'Evento aprovado com sucesso'
    if (updatedEvent?.machine?.unit_number) {
      const eventType = updatedEvent.event_type
      switch (eventType) {
        case 'start_allocation':
          message = `Máquina ${updatedEvent.machine.unit_number} alocada com sucesso`
          break
        case 'end_allocation':
          message = `Alocação da máquina ${updatedEvent.machine.unit_number} finalizada com sucesso`
          break
        case 'downtime_start':
          message = `Downtime iniciado para máquina ${updatedEvent.machine.unit_number}`
          break
        case 'downtime_end':
          message = `Downtime finalizado para máquina ${updatedEvent.machine.unit_number}`
          break
        case 'extension_attach':
          message = `Extensão conectada à máquina ${updatedEvent.machine.unit_number}`
          break
        case 'extension_detach':
          message = `Extensão desconectada da máquina ${updatedEvent.machine.unit_number}`
          break
        case 'correction':
          message = `Correção aplicada para máquina ${updatedEvent.machine.unit_number}`
          break
      }
    }

    return NextResponse.json({
      success: true,
      event: updatedEvent,
      message
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}
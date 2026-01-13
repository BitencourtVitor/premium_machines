import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { processEventRejection } from '@/lib/eventProcessor'
import { createAuditLog } from '@/lib/auditLog'
import { 
  handleEventError, 
  ValidationError, 
  PermissionError, 
  ConnectionError, 
  ErrorContext 
} from '@/lib/error-handling/eventRejection'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let userId = 'unknown'
  let rejectionReason = ''

  try {
    const body = await request.json()
    const { approved_by, rejection_reason } = body
    
    userId = approved_by || 'unknown'
    rejectionReason = rejection_reason

    const errorContext: ErrorContext = {
      eventId: params.id,
      userId: userId,
      action: 'reject',
      reason: rejectionReason
    }

    if (!approved_by) {
      throw new ValidationError('ID do usuário que está rejeitando é obrigatório', errorContext)
    }

    if (!rejection_reason || rejection_reason.trim() === '') {
      throw new ValidationError('Motivo da rejeição é obrigatório', errorContext)
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

    if (fetchError) {
      throw new ConnectionError(`Erro ao buscar evento: ${fetchError.message}`, errorContext)
    }

    if (!eventData) {
      throw new ValidationError('Evento não encontrado', errorContext)
    }

    // Verificar se o evento já foi processado
    if (eventData.status === 'approved') {
      throw new PermissionError('Evento já foi aprovado e não pode ser rejeitado', errorContext)
    }

    if (eventData.status === 'rejected') {
      throw new PermissionError('Evento já foi rejeitado anteriormente', errorContext)
    }

    // Processar rejeição usando a biblioteca de eventos
    try {
      const result = await processEventRejection(params.id, approved_by, rejection_reason)
      if (!result.success) {
        throw new Error(result.message)
      }
    } catch (procError: any) {
      throw new ConnectionError(`Falha no processamento da rejeição: ${procError.message}`, errorContext)
    }

    // Buscar o evento atualizado para retornar na resposta
    const { data: updatedEvent, error: updateFetchError } = await supabaseServer
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

    if (updateFetchError) {
      // Non-critical error, just logging
      console.warn('Erro ao buscar evento atualizado:', updateFetchError)
    }

    // Log action
    await createAuditLog({
      entidade: 'allocation_events',
      entidade_id: params.id,
      acao: 'update', // Rejection is an update to status
      dados_antes: eventData,
      dados_depois: updatedEvent || { status: 'rejected' },
      usuario_id: approved_by,
    })

    return NextResponse.json({
      success: true,
      event: updatedEvent,
      message: 'Evento rejeitado com sucesso'
    })
  } catch (error: any) {
    // Tratamento centralizado de erros
    const context: ErrorContext = {
      eventId: params.id,
      userId: userId,
      action: 'reject',
      reason: rejectionReason
    }

    const handled = await handleEventError(error, context)

    // Determinar status code baseado no tipo de erro
    let status = 500
    if (error instanceof ValidationError) status = 400
    if (error instanceof PermissionError) status = 403 // or 400 depending on API contract
    
    return NextResponse.json(
      { 
        success: false, 
        message: handled.message,
        code: handled.code,
        retryable: handled.isRetryable
      },
      { status }
    )
  }
}

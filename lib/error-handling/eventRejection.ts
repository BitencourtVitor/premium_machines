import { supabaseServer } from '@/lib/supabase-server'
import { createAuditLog } from '@/lib/auditLog'
import { sendNotification } from '../notifications'

export type ErrorContext = {
  eventId: string
  userId: string
  action: 'reject' | 'approve'
  reason?: string
  metadata?: any
}

export class EventProcessingError extends Error {
  code: string
  context: ErrorContext
  isRetryable: boolean

  constructor(message: string, code: string, context: ErrorContext, isRetryable: boolean = true) {
    super(message)
    this.name = 'EventProcessingError'
    this.code = code
    this.context = context
    this.isRetryable = isRetryable
  }
}

export class ValidationError extends EventProcessingError {
  constructor(message: string, context: ErrorContext) {
    super(message, 'VALIDATION_ERROR', context, false)
  }
}

export class ConnectionError extends EventProcessingError {
  constructor(message: string, context: ErrorContext) {
    super(message, 'CONNECTION_ERROR', context, true)
  }
}

export class PermissionError extends EventProcessingError {
  constructor(message: string, context: ErrorContext) {
    super(message, 'PERMISSION_ERROR', context, false)
  }
}

export async function handleEventError(error: Error | EventProcessingError, context: ErrorContext) {
  console.error(`[EventError] ${context.action} failed for event ${context.eventId}:`, error)

  const isRetryable = error instanceof EventProcessingError ? error.isRetryable : true
  const errorCode = error instanceof EventProcessingError ? error.code : 'UNEXPECTED_ERROR'
  const errorMessage = error.message

  // 1. Log to Audit Log (always)
  await createAuditLog({
    entidade: 'event_retry_queue', // Logging broadly as system error
    entidade_id: context.eventId,
    acao: 'error',
    dados_antes: { context },
    dados_depois: { error: errorMessage, code: errorCode },
    usuario_id: context.userId
  })

  // 2. Insert into Retry Queue (if retryable)
  if (isRetryable) {
    try {
      await supabaseServer.from('event_retry_queue').insert({
        event_id: context.eventId,
        user_id: context.userId,
        action_type: context.action,
        reason: context.reason,
        error_details: {
          message: errorMessage,
          code: errorCode,
          stack: error.stack,
          metadata: context.metadata
        },
        status: 'pending',
        retry_count: 0,
        max_retries: 3
      })
    } catch (queueError) {
      console.error('Failed to insert into retry queue:', queueError)
    }
  }

  // 3. Notify Admins
  await sendNotification({
    type: 'error',
    recipient: 'admin',
    subject: `Erro em Evento: ${errorCode}`,
    message: `Falha na operação ${context.action} do evento ${context.eventId}. Erro: ${errorMessage}`
  })

  return {
    success: false,
    message: errorMessage,
    code: errorCode,
    isRetryable
  }
}

import { handleEventError, ValidationError, ErrorContext } from '@/lib/error-handling/eventRejection'
import { createAuditLog } from '@/lib/auditLog'
import { sendNotification } from '@/lib/notifications'
import { supabaseServer } from '@/lib/supabase-server'

// Mocks
jest.mock('@/lib/auditLog')
jest.mock('@/lib/notifications')
jest.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ error: null })
    }))
  }
}))

describe('Event Rejection Error Handling', () => {
  const context: ErrorContext = {
    eventId: 'evt-123',
    userId: 'user-456',
    action: 'reject',
    reason: 'Bad data'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle ValidationError correctly', async () => {
    const error = new ValidationError('Invalid input', context)
    const result = await handleEventError(error, context)

    expect(result.success).toBe(false)
    expect(result.code).toBe('VALIDATION_ERROR')
    expect(result.isRetryable).toBe(false)

    // Should log to audit
    expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      acao: 'error',
      entidade: 'event_retry_queue'
    }))

    // Should NOT insert into retry queue (validation is not retryable)
    expect(supabaseServer.from).not.toHaveBeenCalled()
  })

  it('should handle unexpected errors as retryable', async () => {
    const error = new Error('Database timeout')
    const result = await handleEventError(error, context)

    expect(result.isRetryable).toBe(true)
    
    // Should insert into retry queue
    expect(supabaseServer.from).toHaveBeenCalledWith('event_retry_queue')
    
    // Should notify admin
    expect(sendNotification).toHaveBeenCalledWith(expect.objectContaining({
      recipient: 'admin',
      type: 'error'
    }))
  })
})

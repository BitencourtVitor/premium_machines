import { supabaseServer } from '../supabase-server'
import { validateEvent, syncMachineState, syncExtensionState } from '../allocationService'

/**
 * Processa a aprovação de um evento e atualiza o estado das máquinas/extensões
 * Usa o allocationService para validação e sincronização de estado
 */
export async function processEventApproval(
  eventId: string,
  approvedBy: string
): Promise<{ success: boolean; message: string; error?: any }> {
  try {
    // Buscar o evento
    const { data: event, error: fetchError } = await supabaseServer
      .from('allocation_events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (fetchError || !event) {
      return {
        success: false,
        message: 'Evento não encontrado',
        error: fetchError
      }
    }

    // Validar usando o serviço de alocação (lógica centralizada)
    const validation = await validateEvent(event)
    if (!validation.valid) {
      return {
        success: false,
        message: validation.reason || 'Evento não pode ser aprovado'
      }
    }

    // Atualizar o evento para aprovado
    const { error: updateError } = await supabaseServer
      .from('allocation_events')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString()
      })
      .eq('id', eventId)

    if (updateError) {
      return {
        success: false,
        message: 'Erro ao atualizar status do evento',
        error: updateError
      }
    }

    // Sincronizar o estado da máquina usando o serviço de alocação
    const syncResult = await syncMachineState(event.machine_id)
    if (!syncResult.success) {
      console.error('Erro ao sincronizar estado da máquina:', syncResult.error)
      // Não falha a aprovação, mas loga o erro
    }

    // Se for evento de extensão, sincronizar também a extensão
    if (event.extension_id && (event.event_type === 'extension_attach' || event.event_type === 'extension_detach')) {
      const extSyncResult = await syncExtensionState(event.extension_id)
      if (!extSyncResult.success) {
        console.error('Erro ao sincronizar estado da extensão:', extSyncResult.error)
      }
    }

    return {
      success: true,
      message: 'Evento aprovado com sucesso'
    }
  } catch (error: any) {
    return {
      success: false,
      message: 'Erro ao processar aprovação',
      error
    }
  }
}

/**
 * Processa a rejeição de um evento
 */
export async function processEventRejection(
  eventId: string,
  rejectedBy: string,
  rejectionReason: string
): Promise<{ success: boolean; message: string; error?: any }> {
  try {
    const { error } = await supabaseServer
      .from('allocation_events')
      .update({
        status: 'rejected',
        approved_by: rejectedBy, // Usando o mesmo campo para quem rejeitou
        rejection_reason: rejectionReason
      })
      .eq('id', eventId)

    if (error) {
      return {
        success: false,
        message: 'Erro ao rejeitar evento',
        error
      }
    }

    return {
      success: true,
      message: 'Evento rejeitado com sucesso'
    }
  } catch (error: any) {
    return {
      success: false,
      message: 'Erro ao processar rejeição',
      error
    }
  }
}

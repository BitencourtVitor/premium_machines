import { supabaseServer } from './supabase-server'

export interface CreateNotificationParams {
  event_id: string
  root_type: string
  titulo: string
  mensagem: string
  trigger_date: string | Date
}

/**
 * Cria uma notificação no banco de dados
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const { data, error } = await supabaseServer
      .from('notifications')
      .insert({
        event_id: params.event_id,
        root_type: params.root_type,
        titulo: params.titulo,
        mensagem: params.mensagem,
        trigger_date: typeof params.trigger_date === 'string' 
          ? params.trigger_date 
          : params.trigger_date.toISOString(),
        archived_by: [],
        viewed_by: []
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating notification:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Unexpected error creating notification:', error)
    return { success: false, error }
  }
}

/**
 * Agenda notificações automáticas baseadas em um evento de alocação
 * Atualmente: No dia do vencimento para start_allocation e extension_attach
 */
export async function scheduleAllocationNotifications(event: any) {
  // Apenas para tipos que possuem data de término
  if (!['start_allocation', 'extension_attach'].includes(event.event_type)) {
    return { success: true, skipped: true, reason: 'Not an allocation start event' }
  }

  if (!event.end_date) {
    return { success: true, skipped: true, reason: 'No end_date provided' }
  }

  // Se o evento não estiver aprovado, não agendamos notificação ainda
  if (event.status !== 'approved') {
    return { success: true, skipped: true, reason: 'Event not approved' }
  }

  try {
    const endDate = new Date(event.end_date)
    
    // O trigger_date PRECISA ser a data de vencimento
    const triggerDate = new Date(endDate)

    const unitNumber = event.machine?.unit_number || event.extension?.unit_number || 'Desconhecida'
    const siteTitle = event.site?.title || 'Desconhecido'
    const formattedEndDate = endDate.toLocaleDateString('pt-BR')

    const titulo = 'Vencimento de Alocação'
    const mensagem = `A alocação da máquina/extensão ${unitNumber} em ${siteTitle} vence em ${formattedEndDate}.`

    return await createNotification({
      event_id: event.id,
      root_type: 'allocation_due',
      titulo,
      mensagem,
      trigger_date: triggerDate
    })
  } catch (error) {
    console.error('Error scheduling allocation notification:', error)
    return { success: false, error }
  }
}

/**
 * Atualiza notificações automáticas quando um evento é editado
 */
export async function updateAllocationNotification(event: any) {
  try {
    // 1. Verificar se o evento ainda é elegível para notificação
    const isEligible = ['start_allocation', 'extension_attach'].includes(event.event_type) && 
                      event.end_date && 
                      event.status === 'approved'

    // 2. Buscar notificação existente para este evento
    const { data: existingNotification } = await supabaseServer
      .from('notifications')
      .select('*')
      .eq('event_id', event.id)
      .eq('root_type', 'allocation_due')
      .maybeSingle()

    if (!isEligible) {
      // Se não é mais elegível mas existe notificação, removemos
      if (existingNotification) {
        await supabaseServer
          .from('notifications')
          .delete()
          .eq('id', existingNotification.id)
      }
      return { success: true, skipped: true, reason: 'Event no longer eligible for notification' }
    }

    // 3. Se é elegível, calculamos os novos dados
    const endDate = new Date(event.end_date)
    const triggerDate = new Date(endDate)

    const now = new Date()
    if (triggerDate < now) {
      triggerDate.setTime(now.getTime() + 60000)
    }

    const unitNumber = event.machine?.unit_number || event.extension?.unit_number || 'Desconhecida'
    const siteTitle = event.site?.title || 'Desconhecido'
    const formattedEndDate = endDate.toLocaleDateString('pt-BR')

    const titulo = 'Vencimento de Alocação'
    const mensagem = `A alocação da máquina/extensão ${unitNumber} em ${siteTitle} vence em ${formattedEndDate}.`

    if (existingNotification) {
      // Atualizar notificação existente
      const { error: updateError } = await supabaseServer
        .from('notifications')
        .update({
          titulo,
          mensagem,
          trigger_date: triggerDate.toISOString(),
          // Se a data mudou, talvez queiramos "desarquivar" para os usuários? 
          // Por enquanto vamos apenas atualizar os dados.
        })
        .eq('id', existingNotification.id)

      if (updateError) {
        console.error('Error updating notification:', updateError)
        return { success: false, error: updateError }
      }
      return { success: true, updated: true }
    } else {
      // Criar nova se não existir
      return await scheduleAllocationNotifications(event)
    }
  } catch (error) {
    console.error('Error in updateAllocationNotification:', error)
    return { success: false, error }
  }
}

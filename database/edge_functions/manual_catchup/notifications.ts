// @ts-nocheck
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

export interface NotificationInput {
  event_id: string
  root_type: string
  titulo: string
  mensagem: string
  trigger_date: string
}

export async function processNotifications(supabase: SupabaseClient, notifications: NotificationInput[]) {
  // 1. Mecanismo de espera de 5 segundos conforme solicitado
  console.log("[Notifications] Aguardando 5 segundos antes de processar...")
  await new Promise((resolve) => setTimeout(resolve, 5000))

  if (!notifications || !Array.isArray(notifications)) {
    console.error("[Notifications] Payload inválido: array de notificações esperado")
    return { error: "Invalid payload" }
  }

  console.log(`[Notifications] Iniciando cadastro de ${notifications.length} notificações...`)

  const { data, error } = await supabase
    .from("notifications")
    .insert(
      notifications.map((n) => ({
        event_id: n.event_id,
        root_type: n.root_type,
        titulo: n.titulo,
        mensagem: n.mensagem,
        trigger_date: n.trigger_date,
        archived_by: [],
        viewed_by: [],
      }))
    )
    .select()

  if (error) {
    console.error("[Notifications] Erro ao inserir notificações:", error)
    return { error }
  }

  console.log(`[Notifications] ${data?.length} notificações cadastradas com sucesso.`)
  return { data, success: true }
}

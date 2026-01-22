// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { processNotifications, NotificationInput } from "./notifications.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const BR_OFFSET = 3

// Configuração fixa para a semana atual (19/01/2026 a 23/01/2026)
function getCatchupWeekRange() {
  const start = new Date(Date.UTC(2026, 0, 19, 0, 0, 0)) // Segunda
  const end = new Date(Date.UTC(2026, 0, 23, 23, 59, 59)) // Sexta
  return { start, end }
}

function getScheduledDatesForTemplate(
  weekStart: Date,
  weekEnd: Date,
  dayOfWeek: number,
  timeOfDay: string,
) {
  const results: Date[] = []
  const timeParts = timeOfDay.split(":").map((v) => parseInt(v, 10))
  const hour = timeParts[0] || 0
  const minute = timeParts[1] || 0

  for (let d = new Date(weekStart); d <= weekEnd; d = new Date(d.getTime() + ONE_DAY_MS)) {
    if (d.getUTCDay() === dayOfWeek) {
      const scheduled = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour + BR_OFFSET, minute, 0),
      )
      results.push(scheduled)
    }
  }

  return results
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  console.log("[Catchup] Iniciando processamento manual para a semana de 19/01 a 23/01...")

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response("Missing Supabase environment variables", { status: 500 })
  }

  // 1. Get a fallback user ID
  const { data: fallbackUser } = await supabase
    .from("users")
    .select("id")
    .in("role", ["admin", "dev"])
    .limit(1)
    .maybeSingle()

  const { start, end } = getCatchupWeekRange()

  const { data: templates, error: templatesError } = await supabase
    .from("refueling_templates")
    .select(`
      id,
      site_id,
      machine_id,
      fuel_supplier_id,
      day_of_week,
      time_of_day,
      is_active,
      created_by,
      machines (unit_number),
      sites (title)
    `)
    .eq("is_active", true)

  if (templatesError) {
    console.error("[Catchup] Erro ao buscar templates:", templatesError)
    return new Response(JSON.stringify(templatesError), { status: 500 })
  }

  if (!templates || templates.length === 0) {
    return new Response("No active refueling templates", { status: 200 })
  }

  const notificationsToCreate: NotificationInput[] = []
  let eventsCreated = 0

  for (const template of templates) {
    const dates = getScheduledDatesForTemplate(
      start,
      end,
      template.day_of_week,
      template.time_of_day,
    )

    const createdBy = template.created_by || fallbackUser?.id

    for (const scheduledAt of dates) {
      const scheduledIso = scheduledAt.toISOString()
      
      // Check if event already exists
      const { data: existing } = await supabase
        .from("allocation_events")
        .select("id")
        .eq("event_type", "refueling")
        .eq("machine_id", template.machine_id)
        .eq("site_id", template.site_id)
        .eq("event_date", scheduledIso)
        .limit(1)
        .maybeSingle()

      if (existing) {
        console.log(`[Catchup] Evento já existe para ${template.machines?.unit_number} em ${scheduledIso}`)
        continue
      }

      const { data: newEvent, error: insertError } = await supabase
        .from("allocation_events")
        .insert({
          event_type: "refueling",
          machine_id: template.machine_id,
          site_id: template.site_id,
          supplier_id: template.fuel_supplier_id,
          event_date: scheduledIso,
          status: "pending",
          has_refueling: true,
          created_by: createdBy,
        })
        .select("id")
        .single()

      if (insertError) {
        console.error("[Catchup] Erro ao criar evento:", insertError)
        continue
      }

      eventsCreated++

      // Prepare notification
      const machineUnit = template.machines?.unit_number || "Desconhecida"
      const siteTitle = template.sites?.title || "Desconhecido"
      const formattedDate = new Date(scheduledIso).toLocaleDateString("pt-BR")

      // Event day local
      const eventDay = new Date(scheduledAt.getTime() - (BR_OFFSET * 60 * 60 * 1000))
      const triggerDate = new Date(
        Date.UTC(eventDay.getUTCFullYear(), eventDay.getUTCMonth(), eventDay.getUTCDate(), 3, 0, 0, 0)
      )

      notificationsToCreate.push({
        event_id: newEvent.id,
        root_type: "refueling",
        titulo: `Abastecimento da ${machineUnit}`,
        mensagem: `Este evento precisa acontecer hoje para a máquina ${machineUnit} no site ${siteTitle} para o dia ${formattedDate}. Aguardamos a confirmação.`,
        trigger_date: triggerDate.toISOString(),
      })
    }
  }

  console.log(`[Catchup] Total de eventos criados: ${eventsCreated}`)

  // 4. Chamar a função de processamento de notificações
  if (notificationsToCreate.length > 0) {
    console.log(`[Catchup] Processando ${notificationsToCreate.length} notificações...`)
    await processNotifications(supabase, notificationsToCreate)
  }

  return new Response(JSON.stringify({
    message: "Processamento concluído",
    events_created: eventsCreated,
    notifications_created: notificationsToCreate.length
  }), { 
    status: 200,
    headers: { "Content-Type": "application/json" }
  })
})

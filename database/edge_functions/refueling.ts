import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

type RefuelingTemplate = {
  id: string
  site_id: string
  machine_id: string
  fuel_supplier_id: string | null
  day_of_week: number
  time_of_day: string
  is_active: boolean
  created_by: string | null
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

// Standard project timezone offset (Brazil/Sao Paulo = UTC-3)
// We add 3 hours to the wall-clock time to get the correct UTC representation
// that will be displayed back as the intended local time in the browser.
const BR_OFFSET = 3

function getNextWeekRange() {
  const now = new Date()
  const day = now.getUTCDay()
  const diffToNextMonday = (8 - day) % 7 || 7
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToNextMonday),
  )
  const sunday = new Date(monday.getTime() + 6 * ONE_DAY_MS)
  const start = new Date(
    Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate(), 0, 0, 0),
  )
  const end = new Date(
    Date.UTC(sunday.getUTCFullYear(), sunday.getUTCMonth(), sunday.getUTCDate(), 23, 59, 59),
  )
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

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response("Missing Supabase environment variables", { status: 500 })
  }

  // 1. Get a fallback user ID (admin or dev) in case template.created_by is null
  const { data: fallbackUser, error: fallbackError } = await supabase
    .from("users")
    .select("id")
    .in("role", ["admin", "dev"])
    .limit(1)
    .maybeSingle()

  if (fallbackError) {
    console.error("Error fetching fallback user", fallbackError)
  }

  const { start, end } = getNextWeekRange()

  const { data: templates, error: templatesError } = await supabase
    .from("refueling_templates")
    .select(
      `
      id,
      site_id,
      machine_id,
      fuel_supplier_id,
      day_of_week,
      time_of_day,
      is_active,
      created_by
    `,
    )
    .eq("is_active", true)

  if (templatesError) {
    console.error("Error fetching refueling templates", templatesError)
    return new Response("Error fetching refueling templates", { status: 500 })
  }

  if (!templates || templates.length === 0) {
    return new Response("No active refueling templates", { status: 200 })
  }

  for (const template of templates as RefuelingTemplate[]) {
    const dates = getScheduledDatesForTemplate(
      start,
      end,
      template.day_of_week,
      template.time_of_day,
    )

    // Ensure we have a created_by ID
    const createdBy = template.created_by || fallbackUser?.id

    if (!createdBy) {
      console.error(`Skipping template ${template.id}: No creator or fallback user found`)
      continue
    }

    for (const scheduledAt of dates) {
      const scheduledIso = scheduledAt.toISOString()

      const { data: existing, error: existingError } = await supabase
        .from("allocation_events")
        .select("id")
        .eq("event_type", "refueling")
        .eq("machine_id", template.machine_id)
        .eq("site_id", template.site_id)
        .eq("event_date", scheduledIso)
        .limit(1)
        .maybeSingle()

      if (existingError) {
        console.error("Error checking existing refueling event", existingError)
        continue
      }

      if (existing) {
        continue
      }

      const { error: insertError } = await supabase.from("allocation_events").insert({
        event_type: "refueling",
        machine_id: template.machine_id,
        site_id: template.site_id,
        supplier_id: template.fuel_supplier_id,
        event_date: scheduledIso,
        status: "pending",
        has_refueling: true,
        created_by: createdBy,
      })

      if (insertError) {
        console.error("Error inserting refueling event", insertError)
      } else {
        console.log("Refueling request created", {
          template_id: template.id,
          machine_id: template.machine_id,
          site_id: template.site_id,
          scheduled_for: scheduledIso,
        })
      }
    }
  }

  return new Response("Refueling events generated for next week", { status: 200 })
})

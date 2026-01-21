import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data: templates, error: templatesError } = await supabaseServer
      .from('refueling_templates')
      .select('*')

    const { data: events, error: eventsError } = await supabaseServer
        .from('allocation_events')
        .select(`
          id,
          event_type,
          event_date,
          status,
          notas,
          approved_at,
          machine:machines(id, unit_number, supplier_id),
          site:sites(id, title),
          approved_by_user:users!allocation_events_approved_by_fkey(id, nome)
        `)
        .eq('event_type', 'refueling')
        .order('event_date', { ascending: false })
        .limit(50)

    return NextResponse.json({
      success: true,
      templates: templates || [],
      recentEvents: events || [],
      errors: { templatesError, eventsError }
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message })
  }
}

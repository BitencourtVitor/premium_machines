import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const allPeriod = searchParams.get('allPeriod') === 'true'

    let query = supabaseServer
      .from('allocation_events')
      .select(`
        id,
        event_date,
        downtime_reason,
        downtime_description,
        correction_description,
        backcharge_suppliers,
        subcontractor_receipt_links,
        notas,
        created_at,
        machine:machines!machine_id(id, unit_number, machine_type:machine_types(id, nome)),
        site:sites(id, title, address),
        supplier:suppliers(id, nome),
        created_by_user:users!created_by(id, nome)
      `)
      .eq('event_type', 'downtime_start')
      .eq('downtime_reason', 'corrective')
      .eq('gera_backcharge', true)
      .eq('status', 'approved')
      .order('event_date', { ascending: false })

    if (!allPeriod) {
      if (dateFrom) query = query.gte('event_date', dateFrom)
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        query = query.lte('event_date', end.toISOString())
      }
    }

    const { data: backcharges, error } = await query
    if (error) throw error

    return NextResponse.json({ success: true, backcharges: backcharges || [] })
  } catch (error: any) {
    console.error('Error in backcharges report API:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const allPeriod = searchParams.get('allPeriod') === 'true'
    const siteIdsParam = searchParams.get('siteIds')
    const siteIds = siteIdsParam ? siteIdsParam.split(',').filter(Boolean) : []

    let query = supabaseServer
      .from('allocation_events')
      .select(`
        id,
        event_type,
        event_date,
        end_date,
        downtime_reason,
        downtime_description,
        gera_backcharge,
        construction_type,
        lot_building_number,
        status,
        machine:machines!machine_id(id, unit_number, machine_type:machine_types(id, nome)),
        extension:machines!extension_id(id, unit_number, machine_type:machine_types(id, nome)),
        site:sites(id, title, address, city),
        created_by_user:users!created_by(id, nome)
      `)
      .eq('status', 'approved')
      .not('site_id', 'is', null)
      .order('event_date', { ascending: true })

    if (!allPeriod) {
      if (dateFrom) query = query.gte('event_date', dateFrom)
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        query = query.lte('event_date', end.toISOString())
      }
    }

    if (siteIds.length > 0) {
      query = query.in('site_id', siteIds)
    }

    const { data: events, error } = await query
    if (error) throw error

    // Group by site
    const siteMap = new Map<string, { site: any; events: any[] }>()
    for (const event of events || []) {
      const siteObj = Array.isArray(event.site) ? event.site[0] : event.site
      if (!siteObj) continue
      const siteId = siteObj.id
      if (!siteMap.has(siteId)) {
        siteMap.set(siteId, { site: siteObj, events: [] })
      }
      siteMap.get(siteId)!.events.push(event)
    }

    // Sort events within each site by date desc and sort sites by event count desc
    const sites = Array.from(siteMap.values())
      .map(s => ({ ...s, events: s.events.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()) }))
      .sort((a, b) => b.events.length - a.events.length)

    return NextResponse.json({ success: true, sites })
  } catch (error: any) {
    console.error('Error in events-by-site report API:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

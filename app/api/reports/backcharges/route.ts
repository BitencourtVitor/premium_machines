import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { calculateAllocationDayBreakdown } from '@/lib/allocation/financial'

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

    // Custo (contexto) da alocação vigente no momento de cada backcharge — reaproveita o mesmo
    // motor de cálculo por blocos, não é um valor de backcharge em si (o sistema não tem valor
    // monetário de backcharge cadastrado hoje, só quem foi cobrado e os recibos anexados).
    const rows = backcharges || []
    const machineIds = Array.from(new Set(rows.map((b: any) => b.machine?.id).filter(Boolean)))

    const allocationEventsByMachine = new Map<string, any[]>()
    if (machineIds.length > 0) {
      const { data: allocationEvents } = await supabaseServer
        .from('allocation_events')
        .select('id, machine_id, event_type, event_date')
        .in('machine_id', machineIds)
        .eq('status', 'approved')
        .in('event_type', ['start_allocation', 'end_allocation'])
        .order('event_date', { ascending: true })

      for (const ev of allocationEvents || []) {
        if (!allocationEventsByMachine.has(ev.machine_id)) allocationEventsByMachine.set(ev.machine_id, [])
        allocationEventsByMachine.get(ev.machine_id)!.push(ev)
      }
    }

    const findEnclosingAllocationStart = (machineId: string, atIso: string): string | null => {
      const events = allocationEventsByMachine.get(machineId) || []
      const atMs = new Date(atIso).getTime()
      let openStart: string | null = null
      for (const ev of events) {
        const evMs = new Date(ev.event_date).getTime()
        if (evMs > atMs) break
        if (ev.event_type === 'start_allocation') openStart = ev.event_date
        else if (ev.event_type === 'end_allocation') openStart = null
      }
      return openStart
    }

    await Promise.all(
      rows.map(async (b: any) => {
        b.allocation_cost = null
        const machineId = b.machine?.id
        if (!machineId) return
        const allocationStart = findEnclosingAllocationStart(machineId, b.event_date)
        if (!allocationStart) return
        try {
          const breakdown = await calculateAllocationDayBreakdown(machineId, allocationStart, b.event_date)
          b.allocation_cost = breakdown.valid_cost
        } catch (error) {
          console.error(`Erro ao calcular custo da alocação vigente no backcharge ${b.id}:`, error)
        }
      })
    )

    return NextResponse.json({ success: true, backcharges: rows })
  } catch (error: any) {
    console.error('Error in backcharges report API:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

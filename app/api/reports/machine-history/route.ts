import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { calculateAllocationDayBreakdown } from '@/lib/allocation/financial'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const machineId = searchParams.get('machineId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const allPeriod = searchParams.get('allPeriod') === 'true'

    if (!machineId) {
      return NextResponse.json({ success: false, message: 'ID da máquina é obrigatório' }, { status: 400 })
    }

    // 1. Fetch machine details
    const { data: machine, error: machineError } = await supabaseServer
      .from('machines')
      .select(`
        *,
        machine_type:machine_types(*),
        supplier:suppliers(*)
      `)
      .eq('id', machineId)
      .single()

    if (machineError) throw machineError

    // 2. Fetch all events for this machine
    let query = supabaseServer
      .from('allocation_events')
      .select(`
        *,
        site:sites(*),
        extension:machines!extension_id(id, unit_number, machine_type:machine_types(nome)),
        user:users!allocation_events_created_by_fkey(id, nome)
      `)
      .or(`machine_id.eq.${machineId},extension_id.eq.${machineId}`)
      .order('event_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (!allPeriod) {
      if (dateFrom) query = query.gte('event_date', dateFrom)
      if (dateTo) {
        const endOfDay = new Date(dateTo)
        endOfDay.setHours(23, 59, 59, 999)
        query = query.lte('event_date', endOfDay.toISOString())
      }
    }

    const { data: allEvents, error: eventsError } = await query

    if (eventsError) throw eventsError

    // 3. Filter out pending refueling events
    const events = (allEvents || []).filter(event => {
      if (event.event_type === 'refueling' && event.status === 'pending') {
        return false
      }
      return true
    })

    // 4. Custo por ciclo de alocação (start_allocation -> end_allocation), separado por alocação —
    // nunca agregado, mesmo quando a máquina passou por vários ciclos. Pareamento em ordem
    // cronológica ascendente (events vem em ordem descendente da query acima).
    const allocationCycles: Array<{
      start_event_id: string
      end_event_id: string | null
      start_date: string
      end_date: string | null
      valid_cost: number | null
      gross_cost: number | null
      credit_amount: number | null
      rate_source: 'category' | 'machine' | 'none'
    }> = []

    if (machine.ownership_type === 'rented') {
      const chronological = [...events]
        .filter(e => e.machine_id === machineId && e.status === 'approved')
        .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())

      let openStart: any = null
      for (const ev of chronological) {
        if (ev.event_type === 'start_allocation') {
          openStart = ev
        } else if (ev.event_type === 'end_allocation' && openStart) {
          allocationCycles.push({
            start_event_id: openStart.id,
            end_event_id: ev.id,
            start_date: openStart.event_date,
            end_date: ev.event_date,
            valid_cost: null,
            gross_cost: null,
            credit_amount: null,
            rate_source: 'none',
          })
          openStart = null
        }
      }
      if (openStart) {
        allocationCycles.push({
          start_event_id: openStart.id,
          end_event_id: null,
          start_date: openStart.event_date,
          end_date: null,
          valid_cost: null,
          gross_cost: null,
          credit_amount: null,
          rate_source: 'none',
        })
      }

      const today = new Date().toISOString()
      await Promise.all(
        allocationCycles.map(async (cycle) => {
          try {
            const breakdown = await calculateAllocationDayBreakdown(machineId, cycle.start_date, cycle.end_date || today)
            cycle.valid_cost = breakdown.valid_cost
            cycle.gross_cost = breakdown.gross_cost
            cycle.credit_amount = breakdown.credit_amount
            cycle.rate_source = breakdown.rate_source
          } catch (error) {
            console.error(`Erro ao calcular custo do ciclo ${cycle.start_event_id}:`, error)
          }
        })
      )
    }

    return NextResponse.json({
      success: true,
      machine,
      events,
      allocation_cycles: allocationCycles
    })
  } catch (error: any) {
    console.error('Error in machine history report API:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

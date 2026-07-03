import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { diffDays, buildMaintenancePeriods, maintenanceCreditDaysFromDurationMs } from '@/lib/allocation/financial'

export const dynamic = 'force-dynamic'

const toMs = (iso: string) => new Date(iso).getTime()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const periodDateFrom = searchParams.get('dateFrom')
    const periodDateTo = searchParams.get('dateTo')
    const allPeriod = searchParams.get('allPeriod') === 'true'

    const startDateFilter = periodDateFrom && !allPeriod ? new Date(periodDateFrom) : null
    const endDateFilter = periodDateTo && !allPeriod ? new Date(periodDateTo) : null

    const nowMs = Date.now()
    const ongoingEffectiveEndMs = endDateFilter ? Math.min(nowMs, endDateFilter.getTime()) : nowMs
    const ongoingEffectiveEndIso = new Date(ongoingEffectiveEndMs).toISOString()

    const { data: machines, error: machinesError } = await supabaseServer
      .from('machines')
      .select(
        `
        id,
        unit_number,
        notas,
        ownership_type,
        supplier:suppliers(id, nome),
        machine_type:machine_types(id, nome, is_attachment)
      `
      )
      .eq('ativo', true)

    if (machinesError) throw machinesError

    const rentedMachineIds = (machines || []).filter(m => m.ownership_type === 'rented').map(m => m.id)
    if (!rentedMachineIds.length) {
      return NextResponse.json({ success: true, summaryBySupplier: [], allocations: [] })
    }

    const { data: allocationEvents, error: allocationEventsError } = await supabaseServer
      .from('allocation_events')
      .select(
        `
        id,
        event_type,
        machine_id,
        site_id,
        extension_id,
        event_date,
        end_date,
        created_at,
        site:sites(id, title, address)
      `
      )
      .in('machine_id', rentedMachineIds)
      .eq('status', 'approved')
      .in('event_type', ['start_allocation', 'end_allocation', 'extension_attach'])
      .order('event_date', { ascending: true })
      .order('created_at', { ascending: true })

    if (allocationEventsError) throw allocationEventsError

    const { data: downtimeEvents, error: downtimeEventsError } = await supabaseServer
      .from('allocation_events')
      .select(
        `
        id,
        event_type,
        machine_id,
        event_date,
        created_at,
        downtime_reason,
        downtime_description
      `
      )
      .in('machine_id', rentedMachineIds)
      .eq('status', 'approved')
      .in('event_type', ['downtime_start', 'downtime_end'])
      .order('event_date', { ascending: true })
      .order('created_at', { ascending: true })

    if (downtimeEventsError) throw downtimeEventsError

    const machinesById = new Map<string, any>()
    for (const m of machines || []) {
      machinesById.set(m.id, m)
    }

    const eventsByMachine = new Map<string, any[]>()
    for (const e of allocationEvents || []) {
      if (!e.machine_id) continue
      if (!eventsByMachine.has(e.machine_id)) eventsByMachine.set(e.machine_id, [])
      eventsByMachine.get(e.machine_id)!.push(e)
    }

    const downtimeEventsByMachine = new Map<string, any[]>()
    for (const e of downtimeEvents || []) {
      if (!e.machine_id) continue
      if (!downtimeEventsByMachine.has(e.machine_id)) downtimeEventsByMachine.set(e.machine_id, [])
      downtimeEventsByMachine.get(e.machine_id)!.push(e)
    }

    const maintenancePeriodsByMachine = new Map<
      string,
      Array<{ start_date: string; end_date: string | null; description: string }>
    >()
    for (const [machineId, machineEvents] of Array.from(downtimeEventsByMachine.entries())) {
      const periods = buildMaintenancePeriods(machineEvents)
      if (periods.length) maintenancePeriodsByMachine.set(machineId, periods)
    }

    const allocationCredits: Array<{
      allocation_event_id: string
      machine_id: string
      unit_number: string
      supplier_id: string
      supplier_name: string
      machine_type: string
      site_title: string
      site_address: string
      start_date: string
      due_date: string
      end_date: string | null
      is_ongoing: boolean
      base_credit_days: number
      maintenance_credit_days: number
      maintenance_periods: Array<{ start_date: string; end_date: string; days: number; description: string }>
      credit_days: number
      total_days: number
      valid_days: number
      invalid_days: number
    }> = []

    for (const [machineId, machineEvents] of Array.from(eventsByMachine.entries())) {
      const machine = machinesById.get(machineId)
      if (!machine) continue

      if (machine.ownership_type !== 'rented') continue

      const unitNumber = machine.unit_number || ''
      const machineType = (() => {
        const t = machine.machine_type
        if (Array.isArray(t)) return t[0]?.nome || 'Unknown type'
        return t?.nome || 'Unknown type'
      })()

      const supplier = (() => {
        const s = machine.supplier
        if (Array.isArray(s)) return s[0] || null
        return s || null
      })()

      const supplierId = supplier?.id || 'unknown'
      const supplierName = supplier?.nome || 'Unknown supplier'

      let currentStart: any | null = null
      const machineMaintenancePeriods = maintenancePeriodsByMachine.get(machineId) || []

      const pushAllocationCredit = (startEvent: any, endDate: string | null) => {
        const startDate = startEvent.event_date
        const dueDate = startEvent.end_date
        if (!startDate || !dueDate) return

        const isOngoing = !endDate
        const effectiveEndDate = endDate || ongoingEffectiveEndIso

        const allocationStartMs = toMs(startDate)
        const allocationEndMs = toMs(effectiveEndDate)

        const maintenance_periods: Array<{ start_date: string; end_date: string; days: number; description: string }> = []
        let maintenance_credit_days = 0

        for (const p of machineMaintenancePeriods) {
          const maintStartMs = toMs(p.start_date)
          const maintEndMs = toMs(p.end_date || effectiveEndDate)

          const overlapStartMs = Math.max(allocationStartMs, maintStartMs)
          const overlapEndMs = Math.min(allocationEndMs, maintEndMs)

          if (overlapEndMs <= overlapStartMs) continue

          const durationMs = overlapEndMs - overlapStartMs
          const days = maintenanceCreditDaysFromDurationMs(durationMs)
          if (days > 0) maintenance_credit_days += days

          maintenance_periods.push({
            start_date: new Date(overlapStartMs).toISOString(),
            end_date: new Date(overlapEndMs).toISOString(),
            days,
            description: p.description,
          })
        }

        const base_credit_days = diffDays(dueDate, effectiveEndDate)
        const credit_days = base_credit_days + maintenance_credit_days

        const total_days = diffDays(effectiveEndDate, startDate)
        const invalid_days = maintenance_credit_days
        const valid_days = Math.max(0, total_days - invalid_days)

        allocationCredits.push({
          allocation_event_id: startEvent.id,
          machine_id: machineId,
          unit_number: unitNumber,
          supplier_id: supplierId,
          supplier_name: supplierName,
          machine_type: machineType,
          site_title: startEvent.site?.title || 'No site',
          site_address: startEvent.site?.address || '-',
          start_date: startDate,
          due_date: dueDate,
          end_date: endDate,
          is_ongoing: isOngoing,
          base_credit_days,
          maintenance_credit_days,
          maintenance_periods,
          credit_days,
          total_days,
          valid_days,
          invalid_days,
        })
      }

      for (const ev of machineEvents) {
        const isIndependentExtensionAllocationStart =
          ev.event_type === 'extension_attach' && !ev.extension_id && !!ev.site_id && !!ev.end_date

        const isStart = ev.event_type === 'start_allocation' || isIndependentExtensionAllocationStart
        const isEnd = ev.event_type === 'end_allocation'

        if (isStart) {
          currentStart = ev
          continue
        }

        if (isEnd && currentStart?.end_date) {
          pushAllocationCredit(currentStart, ev.event_date)
          currentStart = null
        }
      }

      // Alocação ainda ativa (sem end_allocation) — participa do relatório se sobrepor o período.
      if (currentStart?.end_date) {
        pushAllocationCredit(currentStart, null)
      }
    }

    const periodFilteredCredits = (startDateFilter || endDateFilter)
      ? allocationCredits.filter(row => {
          const rowStartMs = new Date(row.start_date).getTime()
          const rowEndMs = new Date(row.end_date || ongoingEffectiveEndIso).getTime()
          return (
            (!endDateFilter || rowStartMs <= endDateFilter.getTime()) &&
            (!startDateFilter || rowEndMs >= startDateFilter.getTime())
          )
        })
      : allocationCredits

    periodFilteredCredits.sort(
      (a, b) => new Date(b.end_date || ongoingEffectiveEndIso).getTime() - new Date(a.end_date || ongoingEffectiveEndIso).getTime()
    )

    const creditsBySupplier = new Map<
      string,
      {
        supplier_id: string
        supplier_name: string
        creditsByType: Map<string, number>
        baseCreditsByType: Map<string, number>
        maintenanceCreditsByType: Map<string, number>
      }
    >()
    for (const row of periodFilteredCredits) {
      const key = row.supplier_id
      if (!creditsBySupplier.has(key)) {
        creditsBySupplier.set(key, {
          supplier_id: row.supplier_id,
          supplier_name: row.supplier_name,
          creditsByType: new Map(),
          baseCreditsByType: new Map(),
          maintenanceCreditsByType: new Map(),
        })
      }
      const bucket = creditsBySupplier.get(key)!
      bucket.creditsByType.set(row.machine_type, (bucket.creditsByType.get(row.machine_type) || 0) + row.credit_days)
      bucket.baseCreditsByType.set(row.machine_type, (bucket.baseCreditsByType.get(row.machine_type) || 0) + row.base_credit_days)
      bucket.maintenanceCreditsByType.set(
        row.machine_type,
        (bucket.maintenanceCreditsByType.get(row.machine_type) || 0) + row.maintenance_credit_days
      )
    }

    const summaryBySupplier = Array.from(creditsBySupplier.values())
      .map(s => ({
        supplier_id: s.supplier_id,
        supplier_name: s.supplier_name,
        machine_types: Array.from(s.creditsByType.entries())
          .map(([machine_type, credit_days]) => ({
            machine_type,
            credit_days,
            base_credit_days: s.baseCreditsByType.get(machine_type) || 0,
            maintenance_credit_days: s.maintenanceCreditsByType.get(machine_type) || 0,
          }))
          .sort((a, b) => a.machine_type.localeCompare(b.machine_type, 'en')),
      }))
      .sort((a, b) => a.supplier_name.localeCompare(b.supplier_name, 'en'))

    return NextResponse.json({
      success: true,
      summaryBySupplier,
      allocations: periodFilteredCredits,
    })
  } catch (error: any) {
    console.error('Error in allocation credits report API:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const MS_PER_DAY = 24 * 60 * 60 * 1000

const toUtcMidnightMs = (iso: string) => {
  const d = iso.split('T')[0]
  return new Date(`${d}T00:00:00.000Z`).getTime()
}

const diffDays = (aIso: string, bIso: string) => {
  return Math.trunc((toUtcMidnightMs(aIso) - toUtcMidnightMs(bIso)) / MS_PER_DAY)
}

const toMs = (iso: string) => new Date(iso).getTime()

const maintenanceCreditDaysFromDurationMs = (durationMs: number) => {
  return durationMs > MS_PER_DAY ? Math.floor(durationMs / MS_PER_DAY) : 0
}

const maintenanceReasons = ['maintenance', 'preventive', 'corrective', 'defect']

const getDowntimeDescription = (event: any) => {
  if (event.downtime_description) return event.downtime_description
  if (event.downtime_reason === 'preventive' || event.downtime_reason === 'maintenance') return 'Manutenção Preventiva'
  if (event.downtime_reason === 'corrective' || event.downtime_reason === 'defect') return 'Manutenção Corretiva'
  return 'N/A'
}

export async function GET(_request: NextRequest) {
  try {
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
      const periods: Array<{ start_date: string; end_date: string | null; description: string }> = []
      let currentStart: any | null = null

      for (const ev of machineEvents) {
        if (ev.event_type === 'downtime_start' && maintenanceReasons.includes(ev.downtime_reason)) {
          if (currentStart) {
            periods.push({
              start_date: currentStart.event_date,
              end_date: null,
              description: getDowntimeDescription(currentStart),
            })
          }
          currentStart = ev
          continue
        }

        if (ev.event_type === 'downtime_end' && currentStart) {
          periods.push({
            start_date: currentStart.event_date,
            end_date: ev.event_date,
            description: getDowntimeDescription(currentStart),
          })
          currentStart = null
        }
      }

      if (currentStart) {
        periods.push({
          start_date: currentStart.event_date,
          end_date: null,
          description: getDowntimeDescription(currentStart),
        })
      }

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
      end_date: string
      base_credit_days: number
      maintenance_credit_days: number
      maintenance_periods: Array<{ start_date: string; end_date: string; days: number; description: string }>
      credit_days: number
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
          const startDate = currentStart.event_date
          const dueDate = currentStart.end_date
          const endDate = ev.event_date

          if (startDate && dueDate && endDate) {
            const allocationStartMs = toMs(startDate)
            const allocationEndMs = toMs(endDate)

            const maintenance_periods: Array<{ start_date: string; end_date: string; days: number; description: string }> = []
            let maintenance_credit_days = 0

            for (const p of machineMaintenancePeriods) {
              const maintStartMs = toMs(p.start_date)
              const maintEndMs = toMs(p.end_date || endDate)

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

            const base_credit_days = diffDays(dueDate, endDate)
            const credit_days = base_credit_days + maintenance_credit_days

            allocationCredits.push({
              allocation_event_id: currentStart.id,
              machine_id: machineId,
              unit_number: unitNumber,
              supplier_id: supplierId,
              supplier_name: supplierName,
              machine_type: machineType,
              site_title: currentStart.site?.title || 'No site',
              site_address: currentStart.site?.address || '-',
              start_date: startDate,
              due_date: dueDate,
              end_date: endDate,
              base_credit_days,
              maintenance_credit_days,
              maintenance_periods,
              credit_days,
            })
          }

          currentStart = null
        }
      }
    }

    allocationCredits.sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())

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
    for (const row of allocationCredits) {
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
      allocations: allocationCredits,
    })
  } catch (error: any) {
    console.error('Error in allocation credits report API:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}


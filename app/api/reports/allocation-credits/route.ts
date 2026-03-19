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

    const { data: events, error: eventsError } = await supabaseServer
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
      .eq('status', 'approved')
      .in('event_type', ['start_allocation', 'end_allocation', 'extension_attach'])
      .order('event_date', { ascending: true })
      .order('created_at', { ascending: true })

    if (eventsError) throw eventsError

    const machinesById = new Map<string, any>()
    for (const m of machines || []) {
      machinesById.set(m.id, m)
    }

    const eventsByMachine = new Map<string, any[]>()
    for (const e of events || []) {
      if (!e.machine_id) continue
      if (!eventsByMachine.has(e.machine_id)) eventsByMachine.set(e.machine_id, [])
      eventsByMachine.get(e.machine_id)!.push(e)
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
              credit_days: diffDays(dueDate, endDate),
            })
          }

          currentStart = null
        }
      }
    }

    allocationCredits.sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())

    const creditsBySupplier = new Map<string, { supplier_id: string; supplier_name: string; creditsByType: Map<string, number> }>()
    for (const row of allocationCredits) {
      const key = row.supplier_id
      if (!creditsBySupplier.has(key)) {
        creditsBySupplier.set(key, { supplier_id: row.supplier_id, supplier_name: row.supplier_name, creditsByType: new Map() })
      }
      const bucket = creditsBySupplier.get(key)!
      bucket.creditsByType.set(row.machine_type, (bucket.creditsByType.get(row.machine_type) || 0) + row.credit_days)
    }

    const summaryBySupplier = Array.from(creditsBySupplier.values())
      .map(s => ({
        supplier_id: s.supplier_id,
        supplier_name: s.supplier_name,
        machine_types: Array.from(s.creditsByType.entries())
          .map(([machine_type, credit_days]) => ({ machine_type, credit_days }))
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


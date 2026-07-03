import { supabaseServer } from '../supabase-server'
import { AllocationDayBreakdown, AllocationDaysCalculation, MaintenancePeriod } from './types'

const MS_PER_DAY = 24 * 60 * 60 * 1000

export const toUtcMidnightMs = (iso: string): number => {
  const d = iso.split('T')[0]
  return new Date(`${d}T00:00:00.000Z`).getTime()
}

export const diffDays = (aIso: string, bIso: string): number => {
  return Math.trunc((toUtcMidnightMs(aIso) - toUtcMidnightMs(bIso)) / MS_PER_DAY)
}

const maintenanceReasons = ['maintenance', 'preventive', 'corrective', 'defect']

const getDowntimeDescription = (event: any): string => {
  if (event.downtime_description) return event.downtime_description
  if (event.downtime_reason === 'preventive' || event.downtime_reason === 'maintenance') return 'Manutenção Preventiva'
  if (event.downtime_reason === 'corrective' || event.downtime_reason === 'defect') return 'Manutenção Corretiva'
  return 'N/A'
}

export const maintenanceCreditDaysFromDurationMs = (durationMs: number): number => {
  return durationMs > MS_PER_DAY ? Math.floor(durationMs / MS_PER_DAY) : 0
}

/**
 * Agrupa eventos downtime_start/downtime_end (ordenados por event_date) de UMA máquina em
 * períodos de manutenção. Um período ainda em aberto (sem downtime_end correspondente) sai
 * com end_date null — quem consome (overlapDays) decide onde clampar.
 */
export function buildMaintenancePeriods(downtimeEvents: any[]): Array<{ start_date: string; end_date: string | null; description: string }> {
  const periods: Array<{ start_date: string; end_date: string | null; description: string }> = []
  let currentStart: any | null = null

  for (const ev of downtimeEvents) {
    if (ev.event_type === 'downtime_start' && maintenanceReasons.includes(ev.downtime_reason)) {
      if (currentStart) {
        periods.push({ start_date: currentStart.event_date, end_date: null, description: getDowntimeDescription(currentStart) })
      }
      currentStart = ev
      continue
    }
    if (ev.event_type === 'downtime_end' && currentStart) {
      periods.push({ start_date: currentStart.event_date, end_date: ev.event_date, description: getDowntimeDescription(currentStart) })
      currentStart = null
    }
  }

  if (currentStart) {
    periods.push({ start_date: currentStart.event_date, end_date: null, description: getDowntimeDescription(currentStart) })
  }

  return periods
}

/**
 * Soma os dias de manutenção sobrepostos à janela [windowStartIso, windowEndIso], clampando
 * períodos ainda em aberto (end_date null) no fim da janela.
 */
export function overlapDays(
  windowStartIso: string,
  windowEndIso: string,
  periods: Array<{ start_date: string; end_date: string | null; description: string }>
): { totalOverlapDays: number; overlappingPeriods: MaintenancePeriod[] } {
  const windowStartMs = new Date(windowStartIso).getTime()
  const windowEndMs = new Date(windowEndIso).getTime()

  const overlappingPeriods: MaintenancePeriod[] = []
  let totalOverlapDays = 0

  for (const p of periods) {
    const maintStartMs = new Date(p.start_date).getTime()
    const maintEndMs = new Date(p.end_date || windowEndIso).getTime()

    const overlapStartMs = Math.max(windowStartMs, maintStartMs)
    const overlapEndMs = Math.min(windowEndMs, maintEndMs)
    if (overlapEndMs <= overlapStartMs) continue

    const durationMs = overlapEndMs - overlapStartMs
    const days = maintenanceCreditDaysFromDurationMs(durationMs)
    if (days > 0) totalOverlapDays += days

    overlappingPeriods.push({
      start_date: new Date(overlapStartMs).toISOString(),
      end_date: new Date(overlapEndMs).toISOString(),
      days,
      description: p.description,
    })
  }

  return { totalOverlapDays, overlappingPeriods }
}

/**
 * Quebra de dias válidos (cobrados) vs. inválidos (crédito por manutenção, dia sem uso) de
 * UMA alocação específica (par start_allocation/end_allocation), não de um período genérico.
 */
export async function calculateAllocationDayBreakdown(
  machineId: string,
  startDate: string,
  endDate: string
): Promise<AllocationDayBreakdown> {
  const { data: downtimeEvents } = await supabaseServer
    .from('allocation_events')
    .select('id, event_type, event_date, downtime_reason, downtime_description')
    .eq('machine_id', machineId)
    .eq('status', 'approved')
    .in('event_type', ['downtime_start', 'downtime_end'])
    .lte('event_date', endDate)
    .order('event_date', { ascending: true })
    .order('created_at', { ascending: true })

  const periods = buildMaintenancePeriods(downtimeEvents || [])
  const { totalOverlapDays, overlappingPeriods } = overlapDays(startDate, endDate, periods)

  const total_days = diffDays(endDate, startDate)
  const invalid_days = totalOverlapDays
  const valid_days = Math.max(0, total_days - invalid_days)

  return {
    start_date: startDate,
    end_date: endDate,
    total_days,
    valid_days,
    invalid_days,
    maintenance_periods: overlappingPeriods,
  }
}

/**
 * Calcula os dias de alocação de uma máquina em um período
 */
export async function calculateAllocationDays(
  machineId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<AllocationDaysCalculation | null> {
  // Buscar informações da máquina
  const { data: machine, error: machineError } = await supabaseServer
    .from('machines')
    .select('id, ownership_type, supplier_id, daily_rate, weekly_rate, monthly_rate, billing_type')
    .eq('id', machineId)
    .single()

  if (machineError || !machine) {
    return null
  }

  // Buscar eventos no período
  const { data: events, error: eventsError } = await supabaseServer
    .from('allocation_events')
    .select('*')
    .eq('machine_id', machineId)
    .neq('status', 'rejected')
    .neq('event_type', 'refueling')
    .gte('event_date', periodStart.toISOString())
    .lte('event_date', periodEnd.toISOString())
    .order('event_date', { ascending: true })

  if (eventsError) {
    return null
  }

  // Calcular dias
  let currentSiteId: string | null = null
  let allocationStart: Date | null = null
  let isInDowntime = false
  let downtimeStart: Date | null = null
  let totalDays = 0
  let downtimeDays = 0

  // Processar eventos para calcular dias
  const sortedEvents = events || []

  for (const event of sortedEvents) {
    const eventDate = new Date(event.event_date)

    switch (event.event_type) {
      case 'start_allocation':
        currentSiteId = event.site_id
        allocationStart = eventDate
        break

      case 'end_allocation':
        if (allocationStart && currentSiteId) {
          const days = Math.ceil((eventDate.getTime() - allocationStart.getTime()) / (1000 * 60 * 60 * 24))
          totalDays += days
        }
        currentSiteId = null
        allocationStart = null
        break

      case 'downtime_start':
        if (currentSiteId) {
          isInDowntime = true
          downtimeStart = eventDate
        }
        break

      case 'downtime_end':
        if (isInDowntime && downtimeStart) {
          const days = Math.ceil((eventDate.getTime() - downtimeStart.getTime()) / (1000 * 60 * 60 * 24))
          downtimeDays += days
          isInDowntime = false
          downtimeStart = null
        }
        break
    }
  }

  // Se ainda está alocada no final do período
  if (allocationStart && currentSiteId) {
    const days = Math.ceil((periodEnd.getTime() - allocationStart.getTime()) / (1000 * 60 * 60 * 24))
    totalDays += days
  }

  // Se ainda está em downtime no final do período
  if (isInDowntime && downtimeStart) {
    const days = Math.ceil((periodEnd.getTime() - downtimeStart.getTime()) / (1000 * 60 * 60 * 24))
    downtimeDays += days
  }

  const billableDays = Math.max(0, totalDays - downtimeDays)

  // Calcular taxa diária
  let dailyRate = 0
  if (machine.ownership_type === 'rented') {
    if (machine.billing_type === 'daily' && machine.daily_rate) {
      dailyRate = parseFloat(machine.daily_rate)
    } else if (machine.billing_type === 'weekly' && machine.weekly_rate) {
      dailyRate = parseFloat(machine.weekly_rate) / 7
    } else if (machine.billing_type === 'monthly' && machine.monthly_rate) {
      dailyRate = parseFloat(machine.monthly_rate) / 30
    }
  }

  const estimatedCost = billableDays * dailyRate

  return {
    machine_id: machineId,
    site_id: currentSiteId || '',
    supplier_id: machine.supplier_id,
    period_start: periodStart,
    period_end: periodEnd,
    total_days: totalDays,
    downtime_days: downtimeDays,
    billable_days: billableDays,
    daily_rate: dailyRate,
    estimated_cost: estimatedCost,
  }
}

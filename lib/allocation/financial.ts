import { supabaseServer } from '../supabase-server'
import { AllocationDaysCalculation } from './types'

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

  // Buscar eventos aprovados no período
  const { data: events, error: eventsError } = await supabaseServer
    .from('allocation_events')
    .select('*')
    .eq('machine_id', machineId)
    .eq('status', 'approved')
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

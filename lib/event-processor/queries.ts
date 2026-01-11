import { supabaseServer } from '../supabase-server'
import { AllocationEvent } from './types'

/**
 * Obtém o histórico completo de eventos de uma máquina
 */
export async function getMachineEventHistory(machineId: string): Promise<{
  success: boolean
  events?: AllocationEvent[]
  error?: any
}> {
  try {
    const { data: events, error } = await supabaseServer
      .from('allocation_events')
      .select(`
        *,
        machine:machines(id, unit_number),
        site:sites(id, title),
        extension:machine_extensions(id, unit_number),
        supplier:suppliers(id, nome),
        created_by_user:users!allocation_events_created_by_fkey(id, nome),
        approved_by_user:users!allocation_events_approved_by_fkey(id, nome)
      `)
      .eq('machine_id', machineId)
      .order('event_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error }
    }

    return { success: true, events: events as any }
  } catch (error: any) {
    return { success: false, error }
  }
}

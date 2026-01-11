import { supabaseServer } from '../supabase-server'
import { calculateMachineAllocationState, calculateExtensionState } from './stateCalculation'

/**
 * Sincroniza o estado de uma máquina na tabela machines
 * com base nos eventos aprovados
 */
export async function syncMachineState(machineId: string): Promise<{ success: boolean; error?: any }> {
  try {
    const state = await calculateMachineAllocationState(machineId)

    const { error } = await supabaseServer
      .from('machines')
      .update({
        current_site_id: state.current_site_id,
        status: state.status,
      })
      .eq('id', machineId)

    if (error) {
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
}

/**
 * Sincroniza o estado de uma extensão na tabela machine_extensions
 */
export async function syncExtensionState(extensionId: string): Promise<{ success: boolean; error?: any }> {
  try {
    const state = await calculateExtensionState(extensionId)

    const { error } = await supabaseServer
      .from('machine_extensions')
      .update({
        current_machine_id: state.current_machine_id,
        status: state.status,
      })
      .eq('id', extensionId)

    if (error) {
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
}

/**
 * Sincroniza o estado de todas as máquinas
 */
export async function syncAllMachineStates(): Promise<{
  success: boolean
  synced: number
  errors: Array<{ machineId: string; error: any }>
}> {
  const { data: machines, error: machinesError } = await supabaseServer
    .from('machines')
    .select('id')
    .eq('ativo', true)

  if (machinesError) {
    return { success: false, synced: 0, errors: [{ machineId: 'all', error: machinesError }] }
  }

  if (!machines || machines.length === 0) {
    return { success: true, synced: 0, errors: [] }
  }

  const errors: Array<{ machineId: string; error: any }> = []
  let synced = 0

  for (const machine of machines) {
    const result = await syncMachineState(machine.id)
    if (result.success) {
      synced++
    } else {
      errors.push({ machineId: machine.id, error: result.error })
    }
  }

  return {
    success: errors.length === 0,
    synced,
    errors,
  }
}

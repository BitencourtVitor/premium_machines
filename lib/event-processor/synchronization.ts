import { supabaseServer } from '../supabase-server'
import { calculateMachineState, calculateExtensionState } from './stateCalculation'

/**
 * Atualiza o estado da máquina baseado em todos os eventos aprovados
 */
export async function updateMachineStateFromEvents(machineId: string): Promise<{
  success: boolean
  error?: any
}> {
  try {
    const state = await calculateMachineState(machineId)

    const { error } = await supabaseServer
      .from('machines')
      .update({
        current_site_id: state.current_site_id,
        status: state.status
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
 * Atualiza o estado da extensão baseado em todos os eventos aprovados
 */
export async function updateExtensionStateFromEvents(extensionId: string): Promise<{
  success: boolean
  error?: any
}> {
  try {
    const state = await calculateExtensionState(extensionId)

    const { error } = await supabaseServer
      .from('machine_extensions')
      .update({
        current_machine_id: state.current_machine_id,
        status: state.status
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
 * Sincroniza o estado de todas as máquinas baseado em eventos aprovados
 * Útil para corrigir inconsistências ou após migrações
 */
export async function syncAllMachineStates(): Promise<{
  success: boolean
  updated: number
  errors: Array<{ machineId: string; error: any }>
}> {
  const errors: Array<{ machineId: string; error: any }> = []
  let updated = 0

  try {
    // Buscar todas as máquinas ativas
    const { data: machines, error: machinesError } = await supabaseServer
      .from('machines')
      .select('id')
      .eq('ativo', true)

    if (machinesError) {
      return {
        success: false,
        updated: 0,
        errors: [{ machineId: 'all', error: machinesError }]
      }
    }

    if (!machines || machines.length === 0) {
      return { success: true, updated: 0, errors: [] }
    }

    // Atualizar estado de cada máquina
    for (const machine of machines) {
      try {
        const result = await updateMachineStateFromEvents(machine.id)
        if (result.success) {
          updated++
        } else {
          errors.push({ machineId: machine.id, error: result.error })
        }
      } catch (error) {
        errors.push({ machineId: machine.id, error })
      }
    }

    return {
      success: errors.length === 0,
      updated,
      errors
    }
  } catch (error: any) {
    return {
      success: false,
      updated,
      errors: [{ machineId: 'all', error }]
    }
  }
}

/**
 * Sincroniza o estado de todas as extensões baseado em eventos aprovados
 */
export async function syncAllExtensionStates(): Promise<{
  success: boolean
  updated: number
  errors: Array<{ extensionId: string; error: any }>
}> {
  const errors: Array<{ extensionId: string; error: any }> = []
  let updated = 0

  try {
    // Buscar todas as extensões ativas
    const { data: extensions, error: extensionsError } = await supabaseServer
      .from('machine_extensions')
      .select('id')
      .eq('ativo', true)

    if (extensionsError) {
      return {
        success: false,
        updated: 0,
        errors: [{ extensionId: 'all', error: extensionsError }]
      }
    }

    if (!extensions || extensions.length === 0) {
      return { success: true, updated: 0, errors: [] }
    }

    // Atualizar estado de cada extensão
    for (const extension of extensions) {
      try {
        const result = await updateExtensionStateFromEvents(extension.id)
        if (result.success) {
          updated++
        } else {
          errors.push({ extensionId: extension.id, error: result.error })
        }
      } catch (error) {
        errors.push({ extensionId: extension.id, error })
      }
    }

    return {
      success: errors.length === 0,
      updated,
      errors
    }
  } catch (error: any) {
    return {
      success: false,
      updated,
      errors: [{ extensionId: 'all', error }]
    }
  }
}

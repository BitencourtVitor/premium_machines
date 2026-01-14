import { AllocationEvent } from './types'
import { calculateMachineAllocationState, calculateExtensionState } from './stateCalculation'

/**
 * Valida se um evento pode ser criado/aprovado baseado no estado atual
 */
export async function validateEvent(event: Partial<AllocationEvent>): Promise<{
  valid: boolean
  reason?: string
}> {
  const requiresMachineId = event.event_type !== 'extension_attach'
  if (requiresMachineId && !event.machine_id) {
    return { valid: false, reason: 'machine_id é obrigatório' }
  }

  const state = event.machine_id
    ? await calculateMachineAllocationState(event.machine_id)
    : null

  switch (event.event_type) {
    case 'request_allocation':
      if (!event.site_id) {
        return { valid: false, reason: 'site_id é obrigatório para solicitação de alocação' }
      }
      // Pode solicitar alocação mesmo se já estiver alocada (será uma realocação)
      break

    case 'confirm_allocation':
      if (!event.site_id) {
        return { valid: false, reason: 'site_id é obrigatório para confirmação de alocação' }
      }
      // Verificar se existe uma solicitação pendente para este site
      // TODO: Implementar validação de solicitação pendente
      break

    case 'start_allocation':
      if (!state) {
        return { valid: false, reason: 'Estado da máquina não pôde ser calculado' }
      }
      if (state.current_site_id) {
        return {
          valid: false,
          reason: `Máquina já está alocada em ${state.current_site_title || state.current_site_id}. Finalize a alocação atual primeiro.`
        }
      }
      if (!event.site_id) {
        return { valid: false, reason: 'site_id é obrigatório para início de alocação' }
      }
      break

    case 'end_allocation':
      if (!state) {
        return { valid: false, reason: 'Estado da máquina não pôde ser calculado' }
      }
      if (!state.current_site_id) {
        return { valid: false, reason: 'Máquina não está alocada em nenhum site' }
      }
      if (event.site_id && state.current_site_id !== event.site_id) {
        return {
          valid: false,
          reason: `Máquina está alocada em outro site (${state.current_site_title})`
        }
      }
      break

    case 'downtime_start':
      if (!state) {
        return { valid: false, reason: 'Estado da máquina não pôde ser calculado' }
      }
      if (!state.current_site_id) {
        return { valid: false, reason: 'Máquina não está alocada. Downtime só pode ser registrado para máquinas alocadas.' }
      }
      if (state.is_in_downtime) {
        return { valid: false, reason: 'Máquina já está em downtime. Finalize o downtime atual primeiro.' }
      }
      if (!event.downtime_reason) {
        return { valid: false, reason: 'Motivo do downtime é obrigatório' }
      }
      break

    case 'downtime_end':
      if (!state) {
        return { valid: false, reason: 'Estado da máquina não pôde ser calculado' }
      }
      if (!state.is_in_downtime) {
        return { valid: false, reason: 'Máquina não está em downtime' }
      }
      break

    case 'extension_attach':
      // Se tiver extension_id, segue fluxo antigo (anexar a uma máquina pai)
      if (event.extension_id) {
        // Verificar se a extensão já está anexada a outra máquina
        const extensionState = await calculateExtensionState(event.extension_id)
        if (
          extensionState.current_machine_id &&
          (!event.machine_id || extensionState.current_machine_id !== event.machine_id)
        ) {
          return {
            valid: false,
            reason: `Extensão já está anexada à máquina ${extensionState.current_machine_unit_number}`
          }
        }
      } 
      // Fluxo novo: Alocação independente da extensão
      else {
        if (!event.site_id) {
          return { valid: false, reason: 'site_id é obrigatório para alocação de extensão' }
        }
        
        // Verificar se a extensão (machine_id) já está alocada
        if (state && state.current_site_id) {
           return {
            valid: false,
            reason: `Extensão já está alocada em ${state.current_site_title || state.current_site_id}. Finalize a alocação atual primeiro.`
          }
        }
      }
      break

    case 'extension_detach':
      if (!event.extension_id) {
        return { valid: false, reason: 'extension_id é obrigatório' }
      }
      const detachExtState = await calculateExtensionState(event.extension_id)
      if (!detachExtState.current_machine_id) {
        return { valid: false, reason: 'Extensão não está anexada a nenhuma máquina' }
      }
      if (detachExtState.current_machine_id !== event.machine_id) {
        return {
          valid: false,
          reason: `Extensão está anexada à máquina ${detachExtState.current_machine_unit_number}, não à máquina especificada`
        }
      }
      break

    case 'material_entry':
    case 'product_exit':
      if (!state) {
        return { valid: false, reason: 'Estado da máquina não pôde ser calculado' }
      }
      if (!state.current_site_id) {
        return { 
          valid: false, 
          reason: 'Máquina não está alocada. Este evento só pode ser registrado para máquinas em operação.' 
        }
      }
      break

    case 'refueling':
      break
  }

  return { valid: true }
}

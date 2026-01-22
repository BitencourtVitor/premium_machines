import { AllocationEvent } from './types'
import { calculateMachineAllocationState, calculateExtensionState } from './stateCalculation'

/**
 * Valida se um evento pode ser criado/aprovado baseado no estado atual
 */
export async function validateEvent(event: Partial<AllocationEvent>): Promise<{
  valid: boolean
  reason?: string
}> {
  const isRequest = event.event_type === 'request_allocation'
  const requiresMachineId = event.event_type !== 'extension_attach' && !isRequest
  
  if (requiresMachineId && !event.machine_id) {
    return { valid: false, reason: 'machine_id é obrigatório' }
  }

  // Para solicitações sem machine_id específico, validamos o machine_type_id
  if (isRequest && !event.machine_id && !event.machine_type_id) {
    return { valid: false, reason: 'Tipo de máquina é obrigatório para solicitações' }
  }

  // Para transporte, olhamos o estado final da linha do tempo (ignorando a data de hoje)
  // Isso permite vincular chegadas a transportes agendados para o futuro.
  const isTransportEvent = ['transport_start', 'transport_arrival'].includes(event.event_type || '')
  const state = event.machine_id
    ? await calculateMachineAllocationState(
        event.machine_id, 
        isTransportEvent ? new Date('9999-12-31') : undefined
      )
    : null

  switch (event.event_type) {
    case 'request_allocation':
      if (!event.site_id) {
        return { valid: false, reason: 'site_id é obrigatório para solicitação de alocação' }
      }
      if (!event.end_date) {
        return { valid: false, reason: 'Data de vencimento (end_date) é obrigatória para solicitação de alocação' }
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
      if (!event.end_date) {
        return { valid: false, reason: 'Data de vencimento (end_date) é obrigatória para início de alocação' }
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
        
        if (!event.end_date) {
          return { valid: false, reason: 'Data de vencimento (end_date) é obrigatória para alocação de extensão' }
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

    case 'transport_start':
      if (!state) return { valid: false, reason: 'Estado da máquina não pôde ser calculado' }
      
      // Validação solicitada pelo usuário: Máquina precisa ter uma "alocação" (origem) para ser transportada
      if (!state.current_site_id) {
        return { valid: false, reason: 'A máquina não possui um local de origem definido para iniciar o transporte' }
      }

      // Permitir transporte para máquinas alocadas, disponíveis ou em manutenção
      const validStatuses = ['allocated', 'available', 'maintenance']
      if (!validStatuses.includes(state.status)) {
        return { valid: false, reason: 'Apenas máquinas alocadas, disponíveis ou em manutenção podem iniciar transporte' }
      }
      // Removido o bloqueio por downtime_start para permitir transportar máquinas quebradas
      break

    case 'transport_arrival':
      if (!state) return { valid: false, reason: 'Estado da máquina não pôde ser calculado' }
      if (state.status !== 'in_transit') {
        return { valid: false, reason: 'A máquina precisa estar "Em Trânsito" para registrar a chegada' }
      }
      if (!event.site_id) {
        return { valid: false, reason: 'O local de destino (site_id) é obrigatório na chegada' }
      }
      // Não permitir chegar no mesmo lugar de onde saiu (redundante)
      if (state.current_site_id === event.site_id && 
          state.construction_type === event.construction_type && 
          state.lot_building_number === event.lot_building_number) {
        return { valid: false, reason: 'O destino da chegada é o mesmo endereço de onde a máquina saiu' }
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

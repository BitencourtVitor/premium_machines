// Hook para gerenciar eventos de alocação globalmente
import { useEffect, useCallback } from 'react'

export type AllocationEventType = 'start_allocation' | 'end_allocation'

export interface AllocationUpdateEvent {
  type: 'allocation_updated'
  eventType: AllocationEventType
  machineId: string
  siteId?: string
  machineUnitNumber: string
  siteTitle?: string
}

export const ALLOCATION_EVENTS = {
  ALLOCATION_UPDATED: 'allocation_updated' as const,
} as const

// Função para disparar evento de atualização de alocação
export const dispatchAllocationUpdate = (event: AllocationUpdateEvent) => {
  window.dispatchEvent(new CustomEvent(ALLOCATION_EVENTS.ALLOCATION_UPDATED, {
    detail: event
  }))
}

// Hook para ouvir eventos de alocação
export const useAllocationUpdates = (callback: (event: AllocationUpdateEvent) => void) => {
  useEffect(() => {
    const handleAllocationUpdate = (e: CustomEvent<AllocationUpdateEvent>) => {
      callback(e.detail)
    }

    window.addEventListener(ALLOCATION_EVENTS.ALLOCATION_UPDATED, handleAllocationUpdate as EventListener)

    return () => {
      window.removeEventListener(ALLOCATION_EVENTS.ALLOCATION_UPDATED, handleAllocationUpdate as EventListener)
    }
  }, [callback])
}

// Função utilitária para atualizar dados após alocação
export const refreshAfterAllocation = () => {
  // Dispara evento para atualizar todas as interfaces
  window.dispatchEvent(new CustomEvent('refresh_allocation_data'))
}

// Hook para ouvir eventos de refresh geral
export const useAllocationDataRefresh = (callback: () => void) => {
  useEffect(() => {
    const handleRefresh = () => {
      callback()
    }

    window.addEventListener('refresh_allocation_data', handleRefresh)

    return () => {
      window.removeEventListener('refresh_allocation_data', handleRefresh)
    }
  }, [callback])
}
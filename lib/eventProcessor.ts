/**
 * =============================================================================
 * PROCESSADOR DE EVENTOS DE ALOCAÇÃO
 * =============================================================================
 * 
 * Este arquivo agora re-exporta as funcionalidades modularizadas em lib/event-processor/
 * para manter compatibilidade com o código existente.
 */

export * from './event-processor/types'
export * from './event-processor/stateCalculation'
export * from './event-processor/processing'
export * from './event-processor/synchronization'
export * from './event-processor/queries'

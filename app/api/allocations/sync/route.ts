import { NextRequest, NextResponse } from 'next/server'
import { syncAllMachineStates, syncMachineState } from '@/lib/allocationService'

export const dynamic = 'force-dynamic'

/**
 * POST /api/allocations/sync
 * 
 * Sincroniza o estado das máquinas na tabela machines
 * com base nos eventos aprovados.
 * 
 * Útil para corrigir inconsistências ou após migrações.
 * 
 * Body (opcional):
 * - machine_id: Sincronizar apenas uma máquina específica
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const machineId = body.machine_id

    if (machineId) {
      const result = await syncMachineState(machineId)
      return NextResponse.json({
        success: result.success,
        message: result.success 
          ? 'Estado da máquina sincronizado com sucesso'
          : 'Erro ao sincronizar estado da máquina',
        error: result.error
      })
    }

    const result = await syncAllMachineStates()

    return NextResponse.json({
      success: result.success,
      message: `${result.synced} máquinas sincronizadas`,
      synced: result.synced,
      errors: result.errors.length > 0 ? result.errors : undefined
    })
  } catch (error: any) {
    console.error('Erro ao sincronizar estados:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}

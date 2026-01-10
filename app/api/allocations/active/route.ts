import { NextRequest, NextResponse } from 'next/server'
import { getActiveAllocations, getActiveDowntimes } from '@/lib/allocationService'

/**
 * GET /api/allocations/active
 * 
 * Retorna todas as alocações ativas no sistema.
 * Uma alocação está ativa se há um start_allocation aprovado sem end_allocation correspondente.
 * 
 * Query params:
 * - include_downtimes: 'true' para incluir lista de downtimes ativos
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeDowntimes = searchParams.get('include_downtimes') === 'true'

    const allocations = await getActiveAllocations()

    const response: any = {
      success: true,
      allocations,
      summary: {
        total_allocations: allocations.length,
        machines_working: allocations.filter(a => !a.is_in_downtime).length,
        machines_in_downtime: allocations.filter(a => a.is_in_downtime).length,
        owned_machines: allocations.filter(a => a.machine_ownership === 'owned').length,
        rented_machines: allocations.filter(a => a.machine_ownership === 'rented').length,
      }
    }

    if (includeDowntimes) {
      const downtimes = await getActiveDowntimes()
      response.active_downtimes = downtimes
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Erro ao buscar alocações ativas:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}

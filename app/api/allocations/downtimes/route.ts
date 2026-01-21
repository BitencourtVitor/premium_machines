import { NextRequest, NextResponse } from 'next/server'
import { getActiveDowntimes, getActiveDowntimeByMachine } from '@/lib/allocationService'

export const dynamic = 'force-dynamic'

/**
 * GET /api/allocations/downtimes
 * 
 * Retorna todos os downtimes ativos no sistema.
 * Útil para a interface de criação de eventos de downtime_end.
 * 
 * Query params:
 * - machine_id: Filtrar por máquina específica
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const machineId = searchParams.get('machine_id')

    if (machineId) {
      const downtime = await getActiveDowntimeByMachine(machineId)
      return NextResponse.json({
        success: true,
        downtime,
        has_active_downtime: !!downtime
      })
    }

    const downtimes = await getActiveDowntimes()

    return NextResponse.json({
      success: true,
      downtimes,
      total: downtimes.length
    })
  } catch (error: any) {
    console.error('Erro ao buscar downtimes ativos:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}

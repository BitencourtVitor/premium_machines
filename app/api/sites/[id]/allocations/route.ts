import { NextRequest, NextResponse } from 'next/server'
import { getSiteAllocationSummary } from '@/lib/allocationService'

/**
 * GET /api/sites/[id]/allocations
 * 
 * Retorna o resumo de alocações ativas em um site específico.
 * Inclui todas as máquinas alocadas, extensões conectadas e status de downtime.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const siteId = params.id

    if (!siteId) {
      return NextResponse.json(
        { success: false, message: 'ID do site é obrigatório' },
        { status: 400 }
      )
    }

    const summary = await getSiteAllocationSummary(siteId)

    if (!summary) {
      return NextResponse.json(
        { success: false, message: 'Site não encontrado' },
        { status: 404 }
      )
    }

    // Agrupar alocações por construction_type e lot_building_number
    const allocationsByLocation: Record<string, typeof summary.allocations> = {}
    
    for (const allocation of summary.allocations) {
      const locationKey = allocation.construction_type && allocation.lot_building_number
        ? `${allocation.construction_type === 'lot' ? 'Lote' : 'Prédio'} ${allocation.lot_building_number}`
        : 'Sem localização específica'
      
      if (!allocationsByLocation[locationKey]) {
        allocationsByLocation[locationKey] = []
      }
      allocationsByLocation[locationKey].push(allocation)
    }

    return NextResponse.json({
      success: true,
      site_id: summary.site_id,
      site_title: summary.site_title,
      summary: {
        total_machines: summary.total_machines,
        machines_working: summary.machines_working,
        machines_in_downtime: summary.machines_in_downtime,
      },
      allocations: summary.allocations,
      allocations_by_location: allocationsByLocation,
    })
  } catch (error: any) {
    console.error('Erro ao buscar alocações do site:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}

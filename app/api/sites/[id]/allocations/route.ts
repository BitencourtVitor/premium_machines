import { NextRequest, NextResponse } from 'next/server'
import { getSiteAllocationSummary, getHistoricalSiteAllocations } from '@/lib/allocationService'

export const dynamic = 'force-dynamic'

/**
 * GET /api/sites/[id]/allocations
 * 
 * Retorna o resumo de alocações em um site específico.
 * Se ?history=true, retorna TODAS as máquinas que já passaram pelo site.
 * Caso contrário, retorna apenas as alocações ATIVAS.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const siteId = params.id
    const { searchParams } = new URL(request.url)
    const showHistory = searchParams.get('history') === 'true'

    if (!siteId) {
      return NextResponse.json(
        { success: false, message: 'ID do site é obrigatório' },
        { status: 400 }
      )
    }

    if (showHistory) {
      const historicalAllocations = await getHistoricalSiteAllocations(siteId)
      
      return NextResponse.json({
        success: true,
        site_id: siteId,
        allocations: historicalAllocations
      })
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

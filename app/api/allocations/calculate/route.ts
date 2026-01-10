import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getActiveAllocations, calculateAllocationDays } from '@/lib/allocationService'

/**
 * POST /api/allocations/calculate
 * 
 * Calcula e gera financial snapshots para um período.
 * 
 * Body:
 * - period_start: Data inicial (obrigatório)
 * - period_end: Data final (obrigatório)
 * - site_id: Filtrar por site específico (opcional)
 * - supplier_id: Filtrar por fornecedor específico (opcional)
 * - regenerate: Se true, recalcula mesmo se já existir (padrão: false)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.period_start || !body.period_end) {
      return NextResponse.json(
        { success: false, message: 'period_start e period_end são obrigatórios' },
        { status: 400 }
      )
    }

    const periodStart = new Date(body.period_start)
    const periodEnd = new Date(body.period_end)

    if (periodStart >= periodEnd) {
      return NextResponse.json(
        { success: false, message: 'period_start deve ser anterior a period_end' },
        { status: 400 }
      )
    }

    // Buscar todas as máquinas alugadas ativas
    let machinesQuery = supabaseServer
      .from('machines')
      .select('id, ownership_type, supplier_id')
      .eq('ativo', true)
      .eq('ownership_type', 'rented')

    if (body.supplier_id) {
      machinesQuery = machinesQuery.eq('supplier_id', body.supplier_id)
    }

    const { data: machines, error: machinesError } = await machinesQuery

    if (machinesError) {
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar máquinas' },
        { status: 500 }
      )
    }

    if (!machines || machines.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhuma máquina alugada encontrada',
        snapshots_created: 0,
      })
    }

    const snapshots: any[] = []
    const errors: any[] = []

    for (const machine of machines) {
      try {
        const calculation = await calculateAllocationDays(
          machine.id,
          periodStart,
          periodEnd
        )

        if (calculation && calculation.total_days > 0) {
          // Verificar se deve filtrar por site
          if (body.site_id && calculation.site_id !== body.site_id) {
            continue
          }

          // Verificar se já existe snapshot para este período/máquina
          if (!body.regenerate) {
            const { data: existing } = await supabaseServer
              .from('financial_snapshots')
              .select('id')
              .eq('machine_id', machine.id)
              .eq('period_start', periodStart.toISOString().split('T')[0])
              .eq('period_end', periodEnd.toISOString().split('T')[0])
              .single()

            if (existing) {
              continue // Pular se já existe
            }
          } else {
            // Deletar snapshots existentes para regenerar
            await supabaseServer
              .from('financial_snapshots')
              .delete()
              .eq('machine_id', machine.id)
              .eq('period_start', periodStart.toISOString().split('T')[0])
              .eq('period_end', periodEnd.toISOString().split('T')[0])
          }

          // Criar snapshot
          const { data: snapshot, error: snapshotError } = await supabaseServer
            .from('financial_snapshots')
            .insert({
              site_id: calculation.site_id || null,
              machine_id: calculation.machine_id,
              supplier_id: calculation.supplier_id,
              period_start: calculation.period_start.toISOString().split('T')[0],
              period_end: calculation.period_end.toISOString().split('T')[0],
              total_days: calculation.total_days,
              downtime_days: calculation.downtime_days,
              billable_days: calculation.billable_days,
              daily_rate: calculation.daily_rate,
              estimated_cost: calculation.estimated_cost,
              calculated_at: new Date().toISOString(),
            })
            .select()
            .single()

          if (snapshotError) {
            errors.push({ machine_id: machine.id, error: snapshotError.message })
          } else if (snapshot) {
            snapshots.push(snapshot)
          }
        }
      } catch (error: any) {
        errors.push({ machine_id: machine.id, error: error.message })
      }
    }

    return NextResponse.json({
      success: true,
      message: `${snapshots.length} snapshots criados`,
      snapshots_created: snapshots.length,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total_machines_processed: machines.length,
        snapshots_created: snapshots.length,
        errors_count: errors.length,
        total_estimated_cost: snapshots.reduce((sum, s) => sum + s.estimated_cost, 0),
      }
    })
  } catch (error: any) {
    console.error('Erro ao calcular snapshots:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/allocations/calculate
 * 
 * Retorna um preview do cálculo sem salvar.
 * 
 * Query params:
 * - period_start: Data inicial
 * - period_end: Data final
 * - machine_id: Máquina específica (opcional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const periodStartStr = searchParams.get('period_start')
    const periodEndStr = searchParams.get('period_end')
    const machineId = searchParams.get('machine_id')

    if (!periodStartStr || !periodEndStr) {
      return NextResponse.json(
        { success: false, message: 'period_start e period_end são obrigatórios' },
        { status: 400 }
      )
    }

    const periodStart = new Date(periodStartStr)
    const periodEnd = new Date(periodEndStr)

    if (machineId) {
      const calculation = await calculateAllocationDays(machineId, periodStart, periodEnd)
      return NextResponse.json({
        success: true,
        calculation,
      })
    }

    // Buscar todas as máquinas alugadas
    const { data: machines } = await supabaseServer
      .from('machines')
      .select('id, unit_number')
      .eq('ativo', true)
      .eq('ownership_type', 'rented')

    if (!machines || machines.length === 0) {
      return NextResponse.json({
        success: true,
        calculations: [],
        summary: { total_cost: 0, total_billable_days: 0 }
      })
    }

    const calculations: any[] = []

    for (const machine of machines) {
      const calc = await calculateAllocationDays(machine.id, periodStart, periodEnd)
      if (calc && calc.total_days > 0) {
        calculations.push({
          ...calc,
          machine_unit_number: machine.unit_number,
        })
      }
    }

    return NextResponse.json({
      success: true,
      calculations,
      summary: {
        total_machines: calculations.length,
        total_billable_days: calculations.reduce((sum, c) => sum + c.billable_days, 0),
        total_downtime_days: calculations.reduce((sum, c) => sum + c.downtime_days, 0),
        total_cost: calculations.reduce((sum, c) => sum + c.estimated_cost, 0),
      }
    })
  } catch (error: any) {
    console.error('Erro ao calcular preview:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}

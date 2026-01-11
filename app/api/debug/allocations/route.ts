import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { calculateMachineAllocationState, getActiveAllocations } from '@/lib/allocationService'

/**
 * GET /api/debug/allocations
 *
 * API de debug para testar o cálculo das alocações ativas
 */
export async function GET() {
  try {
    console.log('🔍 Debug: Iniciando teste de alocações ativas')

    // 1. Buscar todas as máquinas ativas
    const { data: machines, error: machinesError } = await supabaseServer
      .from('machines')
      .select('id, unit_number, status, current_site_id')
      .eq('ativo', true)

    console.log('🔍 Debug: Máquinas encontradas:', machines?.length || 0)

    if (machinesError) {
      return NextResponse.json({
        success: false,
        message: 'Erro ao buscar máquinas',
        error: machinesError
      }, { status: 500 })
    }

    // 2. Para cada máquina, calcular o estado
    const machineStates = []
    for (const machine of machines || []) {
      try {
        console.log(`🔍 Debug: Calculando estado da máquina ${machine.unit_number}`)
        const state = await calculateMachineAllocationState(machine.id)
        machineStates.push({
          machine_id: machine.id,
          unit_number: machine.unit_number,
          current_status: machine.status,
          calculated_state: state
        })
      } catch (error: any) {
        console.error(`Erro ao calcular estado da máquina ${machine.id}:`, error)
        machineStates.push({
          machine_id: machine.id,
          unit_number: machine.unit_number,
          error: error.message
        })
      }
    }

    // 3. Buscar alocações ativas usando a função completa
    console.log('🔍 Debug: Buscando alocações ativas')
    const activeAllocations = await getActiveAllocations()

    console.log('🔍 Debug: Alocações ativas encontradas:', activeAllocations.length)

    return NextResponse.json({
      success: true,
      summary: {
        total_machines: machines?.length || 0,
        machines_with_allocation: machineStates.filter(m => m.calculated_state?.current_site_id).length,
        active_allocations: activeAllocations.length
      },
      machine_states: machineStates,
      active_allocations: activeAllocations
    })
  } catch (error: any) {
    console.error('Erro no debug de alocações:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}

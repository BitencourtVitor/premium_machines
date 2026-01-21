import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getActiveAllocations } from '@/lib/allocationService'

export const dynamic = 'force-dynamic'

/**
 * GET /api/test/system
 *
 * Testa se o sistema está funcionando corretamente
 */
export async function GET() {
  try {
    const results = {
      database: false,
      events: false,
      allocations: false,
      machines: false,
      sites: false,
      details: {} as any
    }

    // 1. Testar conexão com banco
    try {
      const { data: test, error } = await supabaseServer
        .from('users')
        .select('count')
        .limit(1)

      results.database = !error
      results.details.database = error ? error.message : 'OK'
    } catch (error: any) {
      results.details.database = error.message
    }

    // 2. Testar eventos
    try {
      const { data: events, error } = await supabaseServer
        .from('allocation_events')
        .select('id, status')
        .limit(1)

      results.events = !error
      results.details.events = error ? error.message : `${events?.length || 0} eventos encontrados`
    } catch (error: any) {
      results.details.events = error.message
    }

    // 3. Testar máquinas
    try {
      const { data: machines, error } = await supabaseServer
        .from('machines')
        .select('id, unit_number, status')
        .eq('ativo', true)
        .limit(5)

      results.machines = !error
      results.details.machines = error ? error.message : `${machines?.length || 0} máquinas ativas`
    } catch (error: any) {
      results.details.machines = error.message
    }

    // 4. Testar sites
    try {
      const { data: sites, error } = await supabaseServer
        .from('sites')
        .select('id, title, ativo')
        .eq('ativo', true)
        .limit(5)

      results.sites = !error
      results.details.sites = error ? error.message : `${sites?.length || 0} sites ativos`
    } catch (error: any) {
      results.details.sites = error.message
    }

    // 5. Testar alocações ativas
    try {
      const allocations = await getActiveAllocations()
      results.allocations = true
      results.details.allocations = `${allocations.length} alocações ativas`
    } catch (error: any) {
      results.details.allocations = error.message
    }

    const allWorking = results.database && results.events && results.allocations && results.machines && results.sites

    return NextResponse.json({
      success: allWorking,
      message: allWorking ? 'Sistema funcionando!' : 'Sistema com problemas',
      results,
      recommendations: allWorking ? [] : [
        'Verifique se há eventos aprovados',
        'Use /debug para ver todos os eventos',
        'Use /api/sync/all para sincronizar estados',
        'Verifique se as máquinas têm status correto'
      ]
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: 'Erro crítico no sistema',
        error: error.message
      },
      { status: 500 }
    )
  }
}

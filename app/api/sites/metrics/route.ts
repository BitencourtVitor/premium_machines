import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    // Total de obras ativas (excluindo sede)
    const { count: totalActiveSites } = await supabaseServer
      .from('sites')
      .select('id', { count: 'exact', head: true })
      .eq('ativo', true)
      .eq('is_headquarters', false)

    // Total de máquinas alocadas em obras (excluindo sede)
    const { data: allocatedMachines } = await supabaseServer
      .from('machines')
      .select('id, current_site_id, sites!machines_current_site_id_fkey(is_headquarters)')
      .eq('ativo', true)
      .not('current_site_id', 'is', null)

    // Filtrar para não contar máquinas na sede
    const machinesInSites = allocatedMachines?.filter(
      (m: any) => m.sites && !m.sites.is_headquarters
    ) || []
    const totalMachinesAllocated = machinesInSites.length

    // Alocações/Eventos pendentes de aprovação
    const { count: pendingAllocations } = await supabaseServer
      .from('allocation_events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')

    // Máquinas com downtime ativo (paradas por manutenção, quebra, etc.)
    const { count: machinesWithIssues } = await supabaseServer
      .from('machines')
      .select('id', { count: 'exact', head: true })
      .eq('ativo', true)
      .in('status', ['maintenance', 'broken', 'downtime'])

    // Obras arquivadas
    const { count: archivedSites } = await supabaseServer
      .from('sites')
      .select('id', { count: 'exact', head: true })
      .eq('ativo', false)
      .eq('is_headquarters', false)

    return NextResponse.json({
      success: true,
      metrics: {
        totalActiveSites: totalActiveSites || 0,
        totalMachinesAllocated: totalMachinesAllocated || 0,
        pendingAllocations: pendingAllocations || 0,
        machinesWithIssues: machinesWithIssues || 0,
        archivedSites: archivedSites || 0,
      }
    })
  } catch (error) {
    console.error('Error fetching site metrics:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Erro ao buscar métricas' 
    }, { status: 500 })
  }
}

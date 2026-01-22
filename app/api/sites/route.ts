import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { createAuditLog } from '@/lib/auditLog'
import { getActiveAllocations } from '@/lib/allocation/queries'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const withMachines = searchParams.get('with_machines') === 'true'
    const archived = searchParams.get('archived')

    // Buscar todos os sites primeiro
    const { data: allSites, error } = await supabaseServer
      .from('sites')
      .select('*')
      .order('title', { ascending: true })

    if (error) {
      console.error('Error fetching sites:', error)
      return NextResponse.json({ success: false, message: 'Error fetching jobsites' }, { status: 500 })
    }

    let sites = allSites || []

    // Filtragem simplificada conforme solicitação do usuário:
    // "toda obra que não estiver arquivada precisa ser listada no dropdown de jobsite"
    if (archived === 'true') {
      sites = sites.filter(s => s.ativo === false)
    } else {
      // Mostra tudo que não está explicitamente arquivado (ativo !== false inclui true e null)
      sites = sites.filter(s => s.ativo !== false)
    }

    // Ordenação robusta
    sites.sort((a, b) => {
      if (a.is_headquarters && !b.is_headquarters) return -1
      if (!a.is_headquarters && b.is_headquarters) return 1
      const titleA = a.title || ''
      const titleB = b.title || ''
      return titleA.localeCompare(titleB)
    })

    if (withMachines) {
      // AÇÃO 1: Fonte única da verdade - Motor de cálculo
      const activeAllocations = await getActiveAllocations()
      
      const { data: allSystemMachines } = await supabaseServer
        .from('machines')
        .select('id, unit_number, machine_type:machine_types(nome, icon)')
        .eq('ativo', true)

      const sitesWithMachines = sites.map((site) => {
        // AÇÃO: Filtrar máquinas que pertencem a este site (origem ou destino de transporte, ou local físico)
        const activeMachinesForSite = activeAllocations.flatMap(alloc => {
          const machines: any[] = []
          
          // Se status for in_transit, projetar nos dois sites
          if (alloc.status === 'in_transit') {
            if (alloc.origin_site_id === site.id) {
              machines.push({
                id: alloc.machine_id,
                unit_number: alloc.machine_unit_number,
                status: 'moved', // Projetado como Movida na origem
                ownership_type: alloc.machine_ownership,
                machine_type: alloc.machine_type,
                machine_type_icon: alloc.machine_type_icon,
                start_date: alloc.allocation_start,
                end_date: alloc.end_date,
                current_site_id: site.id,
                is_currently_at_site: false,
                previous_site_id: alloc.previous_site_id,
                origin_site_id: alloc.origin_site_id,
                destination_site_id: alloc.destination_site_id,
                physical_site_id: alloc.physical_site_id
              })
            }
            if (alloc.destination_site_id === site.id) {
              machines.push({
                id: alloc.machine_id,
                unit_number: alloc.machine_unit_number,
                status: 'in_transit', // Projetado como Em Trânsito no destino
                ownership_type: alloc.machine_ownership,
                machine_type: alloc.machine_type,
                machine_type_icon: alloc.machine_type_icon,
                start_date: alloc.allocation_start,
                end_date: alloc.end_date,
                current_site_id: site.id,
                is_currently_at_site: true,
                previous_site_id: alloc.previous_site_id,
                origin_site_id: alloc.origin_site_id,
                destination_site_id: alloc.destination_site_id,
                physical_site_id: alloc.physical_site_id
              })
            }
          } 
          // Caso contrário, projetar apenas no physical_site_id
          else if (alloc.physical_site_id === site.id) {
            machines.push({
              id: alloc.machine_id,
              unit_number: alloc.machine_unit_number,
              status: alloc.status,
              ownership_type: alloc.machine_ownership,
              machine_type: alloc.machine_type,
              machine_type_icon: alloc.machine_type_icon,
              start_date: alloc.allocation_start,
              end_date: alloc.end_date,
              current_site_id: site.id,
              is_currently_at_site: true,
              previous_site_id: alloc.previous_site_id,
              origin_site_id: alloc.origin_site_id,
              destination_site_id: alloc.destination_site_id,
              physical_site_id: alloc.physical_site_id
            })
          }
          
          return machines
        })

        // Se for a sede, adicionar máquinas disponíveis
        if (site.is_headquarters && allSystemMachines) {
          const busyMachineIds = new Set(activeAllocations.filter(a => a.status !== 'in_transit' && a.physical_site_id).map(a => a.machine_id))
          // Adicionar também máquinas em trânsito (elas não estão disponíveis na sede se estiverem em trânsito)
          activeAllocations.forEach(a => {
            if (a.status === 'in_transit') busyMachineIds.add(a.machine_id)
          })

          allSystemMachines.forEach(m => {
            if (!busyMachineIds.has(m.id)) {
              activeMachinesForSite.push({
                id: m.id,
                unit_number: m.unit_number,
                status: 'available',
                ownership_type: 'owned',
                machine_type: (m.machine_type as any)?.nome || '',
                machine_type_icon: (m.machine_type as any)?.icon || null,
                start_date: null,
                current_site_id: site.id,
                is_currently_at_site: true
              } as any)
            }
          })
        }

        return {
          ...site,
          machines_count: activeMachinesForSite.length,
          machines: activeMachinesForSite,
          all_machines: activeMachinesForSite // No mapa, all_machines é o que importa
        }
      })

      return NextResponse.json({ success: true, sites: sitesWithMachines })
    }

    return NextResponse.json({ success: true, sites: sites })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.title) {
      return NextResponse.json({ success: false, message: 'Jobsite title is required' }, { status: 400 })
    }

    if (!body.address) {
      return NextResponse.json({ success: false, message: 'Endereço é obrigatório' }, { status: 400 })
    }

    if (body.latitude === null || body.latitude === undefined ||
        body.longitude === null || body.longitude === undefined) {
      return NextResponse.json({
        success: false,
        message: 'Coordinates (latitude and longitude) are required. It is necessary to geocode the address before saving.'
      }, { status: 400 })
    }

    const latitude = Number(body.latitude)
    const longitude = Number(body.longitude)

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json({
        success: false,
        message: 'Coordenadas inválidas. Latitude e longitude devem ser números válidos.'
      }, { status: 400 })
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({
        success: false,
        message: 'Coordenadas fora do range válido. Latitude deve estar entre -90 e 90, longitude entre -180 e 180.'
      }, { status: 400 })
    }

    const { data: site, error } = await supabaseServer
      .from('sites')
      .insert({
        title: body.title,
        address: body.address,
        latitude: latitude,
        longitude: longitude,
        geocoding_confidence: body.geocoding_confidence || 0,
        place_type: body.place_type || 'unknown',
        city: body.city || null,
        state: body.state || null,
        country: body.country || 'Brasil',
        notas: body.notas || null,
        ativo: body.ativo !== undefined ? body.ativo : true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating site:', error)
      return NextResponse.json({
        success: false,
        message: error.message || 'Error creating jobsite',
        error: error.details || error.hint || error.code
      }, { status: 500 })
    }

    await createAuditLog({
      entidade: 'sites',
      entidade_id: site.id,
      acao: 'insert',
      dados_depois: site,
      usuario_id: body.currentUserId,
    })

    return NextResponse.json({ success: true, site })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({
      success: false,
      message: error.message || 'Erro interno'
    }, { status: 500 })
  }
}

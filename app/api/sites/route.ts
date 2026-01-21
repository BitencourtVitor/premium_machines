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

    // Filtrar no código para garantir que a sede sempre apareça
    let sites = allSites || []

    if (archived === 'true') {
      // Arquivados: sites inativos (EXCLUINDO sede se estiver ativa, mas sede geralmente não é arquivada)
      // Se o usuário quer APENAS arquivados, mostramos apenas inativos.
      sites = sites.filter(s => s.ativo === false)
    } else if (archived === 'false') {
      // Ativos: sites ativos
      sites = sites.filter(s => s.ativo === true)
    }
    // Se archived não for especificado, retornar todos

    // Ordenar: sede primeiro, depois por título
    if (sites) {
      sites.sort((a, b) => {
        if (a.is_headquarters && !b.is_headquarters) return -1
        if (!a.is_headquarters && b.is_headquarters) return 1
        return a.title.localeCompare(b.title)
      })
    }

    // If machines are requested, fetch them for each site
    if (withMachines && sites) {
      // Fetch all active allocations (calculated from events) to ensure real-time accuracy
      const activeAllocations = await getActiveAllocations()
      
      // Get all machines in the system to identify available ones
      const { data: allSystemMachines } = await supabaseServer
        .from('machines')
        .select('id, unit_number, machine_type:machine_types(nome, icon)')
        .eq('ativo', true)

      // Fetch all historical and future associations (all events with site_id)
      const { data: allEvents, error: eventsError } = await supabaseServer
        .from('allocation_events')
        .select(`
          site_id,
          machine_id,
          event_date,
          end_date,
          event_type,
          machine:machines(
            unit_number,
            machine_type:machine_types(nome, icon)
          )
        `)
        .in('event_type', ['start_allocation', 'extension_attach'])
        .or('status.eq.approved,event_type.neq.refueling')
        .not('site_id', 'is', null)
        .order('event_date', { ascending: false })

      // Map site_id to all machines ever/scheduled to be there
      const historicalMachinesMap = new Map<string, Map<string, any>>()
      
      // Map machine_id to its current site_id for "moved" status detection
      const globalActiveMap = new Map(activeAllocations.map(a => [a.machine_id, a.site_id]));
      
      const now = new Date().toISOString().split('T')[0]

      if (!eventsError && allEvents) {
        allEvents.forEach(event => {
          if (!event.site_id || !event.machine_id || !event.machine) return
          
          if (!historicalMachinesMap.has(event.site_id)) {
            historicalMachinesMap.set(event.site_id, new Map())
          }
          
          const siteMap = historicalMachinesMap.get(event.site_id)!
          if (!siteMap.has(event.machine_id)) {
            const machine = event.machine as any
            const isFuture = event.event_date > now
            const currentSiteId = globalActiveMap.get(event.machine_id);
            
            siteMap.set(event.machine_id, {
              id: event.machine_id,
              unit_number: machine.unit_number,
              machine_type: machine.machine_type?.nome || '',
              machine_type_icon: machine.machine_type?.icon || null,
              start_date: event.event_date,
              end_date: event.end_date,
              status: isFuture ? 'scheduled' : 'inactive',
              current_site_id: currentSiteId || null
            })
          }
        })
      }
      
      const sitesWithMachines = sites.map((site) => {
        // Filter active allocations for this site
        const siteAllocations = activeAllocations.filter(a => a.site_id === site.id)
        
        // Map to active machine objects
        const activeMachinesMap = new Map()
        
        siteAllocations.forEach(alloc => {
            // Add the main machine
            activeMachinesMap.set(alloc.machine_id, {
                id: alloc.machine_id,
                unit_number: alloc.machine_unit_number,
                status: alloc.status,
                ownership_type: alloc.machine_ownership,
                machine_type: alloc.machine_type,
                machine_type_icon: alloc.machine_type_icon,
                start_date: alloc.allocation_start,
                end_date: alloc.end_date,
                current_site_id: alloc.site_id
            })

            // Add attached extensions
                alloc.attached_extensions.forEach(ext => {
                    if (!activeMachinesMap.has(ext.extension_id)) {
                        activeMachinesMap.set(ext.extension_id, {
                            id: ext.extension_id,
                            unit_number: ext.extension_unit_number,
                            status: alloc.status, // Extensão herda o status da máquina (ex: exceeded)
                            ownership_type: 'owned',
                            machine_type: ext.extension_type,
                            machine_type_icon: ext.extension_type_icon,
                            start_date: alloc.allocation_start, // Extension follows machine start
                            end_date: alloc.end_date,
                            current_site_id: alloc.site_id
                        })
                    }
                })
        })

        // If this is headquarters, also add all machines that are NOT currently allocated anywhere
        if (site.is_headquarters && allSystemMachines) {
          const currentlyAllocatedMachineIds = new Set(activeAllocations.map(a => a.machine_id))
          
          allSystemMachines.forEach(m => {
            if (!currentlyAllocatedMachineIds.has(m.id)) {
              activeMachinesMap.set(m.id, {
                id: m.id,
                unit_number: m.unit_number,
                status: 'available',
                ownership_type: 'owned', // Default
                machine_type: (m.machine_type as any)?.nome || '',
                machine_type_icon: (m.machine_type as any)?.icon || null,
                start_date: null,
                current_site_id: site.id // At HQ
              })
            }
          })
        }

        const activeMachines = Array.from(activeMachinesMap.values())
        
        // Get all machines for search (including historical/future)
        const siteHistoricalMachines = historicalMachinesMap.get(site.id)
        const allMachinesForSearchMap = new Map()
        
        // Start with historical/future ones
        if (siteHistoricalMachines) {
          siteHistoricalMachines.forEach((m, id) => {
            allMachinesForSearchMap.set(id, {
              ...m
            })
          })
        }
        
        // Add current ones (includes available if HQ) to ensure they have the correct current status
        activeMachines.forEach(m => {
          allMachinesForSearchMap.set(m.id, {
            id: m.id,
            unit_number: m.unit_number,
            machine_type: m.machine_type,
            status: m.status,
            start_date: m.start_date,
            end_date: m.end_date,
            current_site_id: m.current_site_id
          })
        })

        const allMachinesForSearch = Array.from(allMachinesForSearchMap.values())

        return {
          ...site,
          machines_count: allMachinesForSearch.length,
          machines: activeMachines,
          all_machines: allMachinesForSearch
        }
      })

      return NextResponse.json({ success: true, sites: sitesWithMachines })
    }

    // Get machines count for each site
    const sitesWithCount = await Promise.all(
      (sites || []).map(async (site) => {
        const { count } = await supabaseServer
          .from('machines')
          .select('id', { count: 'exact', head: true })
          .eq('current_site_id', site.id)
          .eq('ativo', true)

        return {
          ...site,
          machines_count: count || 0,
        }
      })
    )

    return NextResponse.json({ success: true, sites: sitesWithCount })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar campos obrigatórios
    if (!body.title) {
      return NextResponse.json({ success: false, message: 'Jobsite title is required' }, { status: 400 })
    }

    if (!body.address) {
      return NextResponse.json({ success: false, message: 'Endereço é obrigatório' }, { status: 400 })
    }

    // Validar que latitude e longitude são obrigatórios
    if (body.latitude === null || body.latitude === undefined ||
        body.longitude === null || body.longitude === undefined) {
      return NextResponse.json({
        success: false,
        message: 'Coordinates (latitude and longitude) are required. It is necessary to geocode the address before saving.'
      }, { status: 400 })
    }

    // Validar que são números válidos
    const latitude = Number(body.latitude)
    const longitude = Number(body.longitude)

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json({
        success: false,
        message: 'Coordenadas inválidas. Latitude e longitude devem ser números válidos.'
      }, { status: 400 })
    }

    // Validar range de coordenadas
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

    // Log action
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
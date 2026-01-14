import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { createAuditLog } from '@/lib/auditLog'
import { getActiveAllocations } from '@/lib/allocation/queries'

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
      
      const sitesWithMachines = sites.map((site) => {
        // Filter allocations for this site
        const siteAllocations = activeAllocations.filter(a => a.site_id === site.id)
        
        // Map to machine objects
        const machinesMap = new Map()
        
        siteAllocations.forEach(alloc => {
            // Add the main machine
            machinesMap.set(alloc.machine_id, {
                id: alloc.machine_id,
                unit_number: alloc.machine_unit_number,
                status: alloc.is_in_downtime ? 'maintenance' : 'allocated',
                ownership_type: alloc.machine_ownership,
                // Add extra fields if needed by frontend
                machine_type: alloc.machine_type
            })

            // Add attached extensions
            alloc.attached_extensions.forEach(ext => {
                if (!machinesMap.has(ext.extension_id)) {
                    machinesMap.set(ext.extension_id, {
                        id: ext.extension_id,
                        unit_number: ext.extension_unit_number,
                        status: 'allocated', // Extensions attached are working
                        ownership_type: 'owned', // Default or unknown
                        machine_type: ext.extension_type
                    })
                }
            })
        })

        const machines = Array.from(machinesMap.values())

        return {
          ...site,
          machines_count: machines.length,
          machines: machines,
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
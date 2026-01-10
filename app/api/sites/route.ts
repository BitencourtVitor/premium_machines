import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

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
      return NextResponse.json({ success: false, message: 'Erro ao buscar obras' }, { status: 500 })
    }

    // Filtrar no código para garantir que a sede sempre apareça
    let sites = allSites || []
    
    if (archived === 'true') {
      // Arquivados: sites inativos OU sede
      sites = sites.filter(s => s.ativo === false || s.is_headquarters === true)
    } else if (archived === 'false') {
      // Ativos: sites ativos OU sede
      sites = sites.filter(s => s.ativo === true || s.is_headquarters === true)
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
      const sitesWithMachines = await Promise.all(
        sites.map(async (site) => {
          const { data: machines } = await supabaseServer
            .from('machines')
            .select('id, unit_number, status, ownership_type')
            .eq('current_site_id', site.id)
            .eq('ativo', true)

          return {
            ...site,
            machines_count: machines?.length || 0,
            machines: machines || [],
          }
        })
      )

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
      return NextResponse.json({ success: false, message: 'Título da obra é obrigatório' }, { status: 400 })
    }

    if (!body.address) {
      return NextResponse.json({ success: false, message: 'Endereço é obrigatório' }, { status: 400 })
    }

    // Validar que latitude e longitude são obrigatórios
    if (body.latitude === null || body.latitude === undefined || 
        body.longitude === null || body.longitude === undefined) {
      return NextResponse.json({ 
        success: false, 
        message: 'Coordenadas (latitude e longitude) são obrigatórias. É necessário geocodificar o endereço antes de salvar.' 
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
        message: error.message || 'Erro ao criar obra',
        error: error.details || error.hint || error.code
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, site })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Erro interno' 
    }, { status: 500 })
  }
}

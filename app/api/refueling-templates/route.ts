import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { createAuditLog } from '@/lib/auditLog'

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'

    let query = supabaseServer.from('refueling_templates').select(`
      *,
      machine:machines(id, unit_number),
      site:sites(id, title)
    `)

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data: templates, error } = await query.order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching refueling templates:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar templates de abastecimento' },
        { status: 500, headers: noCacheHeaders }
      )
    }

    return NextResponse.json(
      { success: true, templates: templates || [] },
      { headers: noCacheHeaders }
    )
  } catch (error) {
    console.error('Error fetching refueling templates:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      { status: 500, headers: noCacheHeaders }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      site_id,
      machine_id,
      fuel_supplier_id,
      day_of_week,
      time_of_day,
      is_active,
      notes,
      currentUserId,
    } = body

    if (!site_id || !machine_id || day_of_week === undefined || !time_of_day) {
      return NextResponse.json(
        { success: false, message: 'Site, máquina, dia da semana e horário são obrigatórios' },
        { status: 400, headers: noCacheHeaders }
      )
    }

    const { data: template, error } = await supabaseServer
      .from('refueling_templates')
      .insert({
        site_id,
        machine_id,
        fuel_supplier_id: fuel_supplier_id || null,
        day_of_week,
        time_of_day,
        is_active: is_active !== undefined ? !!is_active : true,
        notes: notes || null,
        created_by: currentUserId || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating refueling template:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao criar template de abastecimento' },
        { status: 500, headers: noCacheHeaders }
      )
    }

    if (template) {
      await createAuditLog({
        entidade: 'refueling_templates',
        entidade_id: template.id,
        acao: 'insert',
        dados_depois: template,
        usuario_id: currentUserId,
      })
    }

    return NextResponse.json(
      { success: true, template },
      { headers: noCacheHeaders }
    )
  } catch (error) {
    console.error('Error creating refueling template:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      { status: 500, headers: noCacheHeaders }
    )
  }
}


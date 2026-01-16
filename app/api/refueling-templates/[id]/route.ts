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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: template, error } = await supabaseServer
      .from('refueling_templates')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error fetching refueling template:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar template de abastecimento' },
        { status: 500, headers: noCacheHeaders }
      )
    }

    if (!template) {
      return NextResponse.json(
        { success: false, message: 'Template de abastecimento não encontrado' },
        { status: 404, headers: noCacheHeaders }
      )
    }

    return NextResponse.json(
      { success: true, template },
      { headers: noCacheHeaders }
    )
  } catch (error) {
    console.error('Error getting refueling template:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      { status: 500, headers: noCacheHeaders }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { data: currentData } = await supabaseServer
      .from('refueling_templates')
      .select('*')
      .eq('id', params.id)
      .single()

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (site_id !== undefined) updateData.site_id = site_id
    if (machine_id !== undefined) updateData.machine_id = machine_id
    if (fuel_supplier_id !== undefined) updateData.fuel_supplier_id = fuel_supplier_id
    if (day_of_week !== undefined) updateData.day_of_week = day_of_week
    if (time_of_day !== undefined) updateData.time_of_day = time_of_day
    if (is_active !== undefined) updateData.is_active = !!is_active
    if (notes !== undefined) updateData.notes = notes

    const { data: template, error } = await supabaseServer
      .from('refueling_templates')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating refueling template:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao atualizar template de abastecimento' },
        { status: 500, headers: noCacheHeaders }
      )
    }

    if (template) {
      await createAuditLog({
        entidade: 'refueling_templates',
        entidade_id: params.id,
        acao: 'update',
        dados_antes: currentData,
        dados_depois: updateData,
        usuario_id: currentUserId,
      })
    }

    return NextResponse.json(
      { success: true, template },
      { headers: noCacheHeaders }
    )
  } catch (error) {
    console.error('Error updating refueling template:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      { status: 500, headers: noCacheHeaders }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const currentUserId = searchParams.get('userId')

    const { data: currentData } = await supabaseServer
      .from('refueling_templates')
      .select('*')
      .eq('id', params.id)
      .single()

    const { error } = await supabaseServer
      .from('refueling_templates')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting refueling template:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao excluir template de abastecimento' },
        { status: 500, headers: noCacheHeaders }
      )
    }

    if (currentData) {
      await createAuditLog({
        entidade: 'refueling_templates',
        entidade_id: params.id,
        acao: 'delete',
        dados_antes: currentData,
        usuario_id: currentUserId ?? undefined,
      })
    }

    return NextResponse.json(
      { success: true },
      { headers: noCacheHeaders }
    )
  } catch (error) {
    console.error('Error deleting refueling template:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      { status: 500, headers: noCacheHeaders }
    )
  }
}

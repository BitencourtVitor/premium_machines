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
    const { data: supplier, error } = await supabaseServer
      .from('fuel_suppliers')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error fetching fuel supplier:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar fornecedor de combustível' },
        { status: 500, headers: noCacheHeaders }
      )
    }

    if (!supplier) {
      return NextResponse.json(
        { success: false, message: 'Fornecedor de combustível não encontrado' },
        { status: 404, headers: noCacheHeaders }
      )
    }

    return NextResponse.json(
      { success: true, supplier },
      { headers: noCacheHeaders }
    )
  } catch (error) {
    console.error('Error getting fuel supplier:', error)
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
      name,
      contact_name,
      phone,
      email,
      notes,
      is_active,
      currentUserId,
    } = body

    const { data: currentData } = await supabaseServer
      .from('fuel_suppliers')
      .select('*')
      .eq('id', params.id)
      .single()

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updateData.name = name
    if (contact_name !== undefined) updateData.contact_name = contact_name
    if (phone !== undefined) updateData.phone = phone
    if (email !== undefined) updateData.email = email
    if (notes !== undefined) updateData.notes = notes
    if (is_active !== undefined) updateData.is_active = !!is_active

    const { data: supplier, error } = await supabaseServer
      .from('fuel_suppliers')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating fuel supplier:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao atualizar fornecedor de combustível' },
        { status: 500, headers: noCacheHeaders }
      )
    }

    if (supplier) {
      await createAuditLog({
        entidade: 'fuel_suppliers',
        entidade_id: params.id,
        acao: 'update',
        dados_antes: currentData,
        dados_depois: updateData,
        usuario_id: currentUserId,
      })
    }

    return NextResponse.json(
      { success: true, supplier },
      { headers: noCacheHeaders }
    )
  } catch (error) {
    console.error('Error updating fuel supplier:', error)
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
      .from('fuel_suppliers')
      .select('*')
      .eq('id', params.id)
      .single()

    const { error } = await supabaseServer
      .from('fuel_suppliers')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting fuel supplier:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao excluir fornecedor de combustível' },
        { status: 500, headers: noCacheHeaders }
      )
    }

    if (currentData) {
      await createAuditLog({
        entidade: 'fuel_suppliers',
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
    console.error('Error deleting fuel supplier:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      { status: 500, headers: noCacheHeaders }
    )
  }
}

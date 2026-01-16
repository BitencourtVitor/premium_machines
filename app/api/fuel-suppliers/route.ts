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
    const includeInactive = searchParams.get('includeInactive') === 'true'

    let query = supabaseServer.from('fuel_suppliers').select('*')

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data: suppliers, error } = await query.order('name', { ascending: true })

    if (error) {
      console.error('Error fetching fuel suppliers:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar fornecedores de combustível' },
        { status: 500, headers: noCacheHeaders }
      )
    }

    return NextResponse.json(
      { success: true, suppliers: suppliers || [] },
      { headers: noCacheHeaders }
    )
  } catch (error) {
    console.error('Error:', error)
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
      name,
      contact_name,
      phone,
      email,
      notes,
      is_active,
      currentUserId,
    } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, message: 'Nome é obrigatório' },
        { status: 400, headers: noCacheHeaders }
      )
    }

    const { data: supplier, error } = await supabaseServer
      .from('fuel_suppliers')
      .insert({
        name: name.trim(),
        contact_name: contact_name || null,
        phone: phone || null,
        email: email || null,
        notes: notes || null,
        is_active: is_active !== undefined ? !!is_active : true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating fuel supplier:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao criar fornecedor de combustível' },
        { status: 500, headers: noCacheHeaders }
      )
    }

    if (supplier) {
      await createAuditLog({
        entidade: 'fuel_suppliers',
        entidade_id: supplier.id,
        acao: 'insert',
        dados_depois: supplier,
        usuario_id: currentUserId,
      })
    }

    return NextResponse.json(
      { success: true, supplier },
      { headers: noCacheHeaders }
    )
  } catch (error) {
    console.error('Error creating fuel supplier:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      { status: 500, headers: noCacheHeaders }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { createAuditLog } from '@/lib/auditLog'

// Forçar rota dinâmica para evitar cache
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Headers para evitar cache
const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const archived = searchParams.get('archived') === 'true'

    let query = supabaseServer
      .from('suppliers')
      .select('*')
      .eq('ativo', true)

    if (archived) {
      query = query.eq('archived', true)
    } else {
      query = query.eq('archived', false)
    }

    const { data: suppliers, error } = await query.order('nome', { ascending: true })

    if (error) {
      console.error('Error fetching suppliers:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar fornecedores' }, 
        { status: 500, headers: noCacheHeaders }
      )
    }

    return NextResponse.json(
      { success: true, suppliers },
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

    const { data: supplier, error } = await supabaseServer
      .from('suppliers')
      .insert({
        nome: body.nome,
        email: body.email || null,
        telefone: body.telefone || null,
        supplier_type: body.supplier_type || 'rental',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating supplier:', error)
      return NextResponse.json({ success: false, message: 'Erro ao criar fornecedor' }, { status: 500 })
    }

    // Log action
    await createAuditLog({
      entidade: 'suppliers',
      entidade_id: supplier.id,
      acao: 'insert',
      dados_depois: supplier,
      usuario_id: body.currentUserId,
    })

    return NextResponse.json({ success: true, supplier })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 })
  }
}

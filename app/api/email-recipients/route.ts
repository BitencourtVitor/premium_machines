import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lista = searchParams.get('lista')

    let query = supabaseServer
      .from('email_recipients')
      .select('*')
      .order('nome', { ascending: true })

    if (lista) {
      query = query.eq('lista', lista)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    return NextResponse.json({ success: true, recipients: data })
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, nome, lista } = body
    if (!email || !nome || !lista) {
      return NextResponse.json({ success: false, message: 'email, nome e lista são obrigatórios' }, { status: 400 })
    }
    if (!['geral', 'manutencao_corretiva'].includes(lista)) {
      return NextResponse.json({ success: false, message: 'lista inválida' }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from('email_recipients')
      .insert({ email: email.trim(), nome: nome.trim(), lista })
      .select()
      .single()

    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    return NextResponse.json({ success: true, recipient: data })
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 })
  }
}

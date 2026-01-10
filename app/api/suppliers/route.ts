import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    const { data: suppliers, error } = await supabaseServer
      .from('suppliers')
      .select('*')
      .eq('ativo', true)
      .order('nome', { ascending: true })

    if (error) {
      console.error('Error fetching suppliers:', error)
      return NextResponse.json({ success: false, message: 'Erro ao buscar fornecedores' }, { status: 500 })
    }

    return NextResponse.json({ success: true, suppliers })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data: supplier, error } = await supabaseServer
      .from('suppliers')
      .insert({
        nome: body.nome,
        cnpj: body.cnpj,
        email: body.email,
        telefone: body.telefone,
        endereco: body.endereco,
        contato_nome: body.contato_nome,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating supplier:', error)
      return NextResponse.json({ success: false, message: 'Erro ao criar fornecedor' }, { status: 500 })
    }

    return NextResponse.json({ success: true, supplier })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    const { data: machineTypes, error } = await supabaseServer
      .from('machine_types')
      .select('*')
      .order('nome', { ascending: true })

    if (error) {
      console.error('Error fetching machine types:', error)
      return NextResponse.json({ success: false, message: 'Erro ao buscar tipos' }, { status: 500 })
    }

    return NextResponse.json({ success: true, machineTypes })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data: machineType, error } = await supabaseServer
      .from('machine_types')
      .insert({
        nome: body.nome,
        descricao: body.descricao,
        icon: body.icon,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating machine type:', error)
      return NextResponse.json({ success: false, message: 'Erro ao criar tipo' }, { status: 500 })
    }

    return NextResponse.json({ success: true, machineType })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// Headers para evitar cache
const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const { data: machineTypes, error } = await supabaseServer
      .from('machine_types')
      .select('*')
      .order('nome', { ascending: true })

    if (error) {
      console.error('Error fetching machine types:', error)
      return NextResponse.json({ success: false, message: 'Error fetching types' }, { status: 500, headers: noCacheHeaders })
    }

    return NextResponse.json({ success: true, machineTypes }, { headers: noCacheHeaders })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500, headers: noCacheHeaders })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.nome || body.nome.trim() === '') {
      return NextResponse.json({ success: false, message: 'Nome é obrigatório' }, { status: 400, headers: noCacheHeaders })
    }

    const { data: machineType, error } = await supabaseServer
      .from('machine_types')
      .insert({
        nome: body.nome.trim(),
        icon: body.icon || null,
        is_attachment: body.is_attachment || false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating machine type:', error)
      if (error.code === '23505') {
        return NextResponse.json({ success: false, message: 'Já existe um tipo de máquina com este nome' }, { status: 400, headers: noCacheHeaders })
      }
      return NextResponse.json({ success: false, message: 'Error creating type' }, { status: 500, headers: noCacheHeaders })
    }

    return NextResponse.json({ success: true, machineType }, { headers: noCacheHeaders })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500, headers: noCacheHeaders })
  }
}

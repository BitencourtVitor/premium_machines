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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: machineType, error } = await supabaseServer
      .from('machine_types')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error fetching machine type:', error)
      return NextResponse.json({ success: false, message: 'Tipo de máquina não encontrado' }, { status: 404, headers: noCacheHeaders })
    }

    return NextResponse.json({ success: true, machineType }, { headers: noCacheHeaders })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500, headers: noCacheHeaders })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    // Construir objeto de atualização apenas com campos fornecidos
    const updateData: any = {}
    
    if (body.nome !== undefined) {
      if (!body.nome || body.nome.trim() === '') {
        return NextResponse.json({ success: false, message: 'Nome não pode ser vazio' }, { status: 400, headers: noCacheHeaders })
      }
      updateData.nome = body.nome.trim()
    }
    
    if (body.icon !== undefined) {
      updateData.icon = body.icon || null
    }
    
    if (body.is_attachment !== undefined) {
      updateData.is_attachment = body.is_attachment
    }

    const { data: machineType, error } = await supabaseServer
      .from('machine_types')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating machine type:', error)
      if (error.code === '23505') {
        return NextResponse.json({ success: false, message: 'Já existe um tipo de máquina com este nome' }, { status: 400, headers: noCacheHeaders })
      }
      return NextResponse.json({ success: false, message: 'Erro ao atualizar tipo' }, { status: 500, headers: noCacheHeaders })
    }

    if (!machineType) {
      return NextResponse.json({ success: false, message: 'Tipo de máquina não encontrado' }, { status: 404, headers: noCacheHeaders })
    }

    return NextResponse.json({ success: true, machineType }, { headers: noCacheHeaders })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500, headers: noCacheHeaders })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar se há máquinas usando este tipo
    const { data: machines, error: machinesError } = await supabaseServer
      .from('machines')
      .select('id')
      .eq('machine_type_id', params.id)
      .limit(1)

    if (machinesError) {
      console.error('Error checking machines:', machinesError)
      return NextResponse.json({ success: false, message: 'Erro ao verificar dependências' }, { status: 500, headers: noCacheHeaders })
    }

    if (machines && machines.length > 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Não é possível deletar este tipo de máquina pois existem máquinas cadastradas com este tipo' 
      }, { status: 400, headers: noCacheHeaders })
    }

    const { error } = await supabaseServer
      .from('machine_types')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting machine type:', error)
      return NextResponse.json({ success: false, message: 'Erro ao deletar tipo' }, { status: 500, headers: noCacheHeaders })
    }

    return NextResponse.json({ success: true }, { headers: noCacheHeaders })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500, headers: noCacheHeaders })
  }
}

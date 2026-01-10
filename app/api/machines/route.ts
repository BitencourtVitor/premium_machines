import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { data: machines, error } = await supabaseServer
      .from('machines')
      .select(`
        *,
        machine_type:machine_types(id, nome),
        supplier:suppliers(id, nome),
        current_site:sites(id, title)
      `)
      .eq('ativo', true)
      .order('unit_number', { ascending: true })

    if (error) {
      console.error('Error fetching machines:', error)
      return NextResponse.json({ success: false, message: 'Erro ao buscar máquinas' }, { status: 500 })
    }

    return NextResponse.json({ success: true, machines })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check if unit_number already exists
    const { data: existing } = await supabaseServer
      .from('machines')
      .select('id')
      .eq('unit_number', body.unit_number)
      .single()

    if (existing) {
      return NextResponse.json({ 
        success: false, 
        message: 'Já existe uma máquina com este número de unidade' 
      }, { status: 400 })
    }

    const { data: machine, error } = await supabaseServer
      .from('machines')
      .insert({
        unit_number: body.unit_number,
        machine_type_id: body.machine_type_id,
        ownership_type: body.ownership_type,
        supplier_id: body.ownership_type === 'rented' ? body.supplier_id : null,
        billing_type: body.ownership_type === 'rented' ? body.billing_type : null,
        daily_rate: body.daily_rate,
        weekly_rate: body.weekly_rate,
        monthly_rate: body.monthly_rate,
        status: 'available',
        notas: body.notas,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating machine:', error)
      return NextResponse.json({ success: false, message: 'Erro ao criar máquina' }, { status: 500 })
    }

    return NextResponse.json({ success: true, machine })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { createAuditLog } from '@/lib/auditLog'

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
      return NextResponse.json({ success: false, message: 'Error fetching machines' }, { status: 500 })
    }

    return NextResponse.json({ success: true, machines })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
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
        message: 'A machine with this unit number already exists' 
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
      return NextResponse.json({ success: false, message: 'Error creating machine' }, { status: 500 })
    }

    // Log action
    await createAuditLog({
      entidade: 'machines',
      entidade_id: machine.id,
      acao: 'insert',
      dados_depois: machine,
      usuario_id: body.currentUserId,
    })

    return NextResponse.json({ success: true, machine })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, message: 'Machine ID is required' }, { status: 400 })
    }

    const body = await request.json()

    // Check if unit_number already exists (excluding current machine)
    const { data: existing } = await supabaseServer
      .from('machines')
      .select('id')
      .eq('unit_number', body.unit_number)
      .neq('id', id)
      .single()

    if (existing) {
      return NextResponse.json({
        success: false,
        message: 'A machine with this unit number already exists'
      }, { status: 400 })
    }

    // Get current data for logging
    const { data: currentData } = await supabaseServer
      .from('machines')
      .select('*')
      .eq('id', id)
      .single()

    const { data: machine, error } = await supabaseServer
      .from('machines')
      .update({
        unit_number: body.unit_number,
        machine_type_id: body.machine_type_id,
        ownership_type: body.ownership_type,
        supplier_id: body.ownership_type === 'rented' ? body.supplier_id : null,
        billing_type: body.ownership_type === 'rented' ? body.billing_type : null,
        daily_rate: body.daily_rate,
        weekly_rate: body.weekly_rate,
        monthly_rate: body.monthly_rate,
        notas: body.notas,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating machine:', error)
      return NextResponse.json({ success: false, message: 'Error updating machine' }, { status: 500 })
    }

    return NextResponse.json({ success: true, machine })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, message: 'Machine ID is required' }, { status: 400 })
    }

    // Check if machine has active allocations
    const { data: allocations } = await supabaseServer
      .from('allocations')
      .select('id')
      .eq('machine_id', id)
      .eq('status', 'active')

    if (allocations && allocations.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Cannot delete a machine that has active allocations'
      }, { status: 400 })
    }

    // Fetch data before delete for audit log
    const { data: machineData } = await supabaseServer
      .from('machines')
      .select('*')
      .eq('id', id)
      .single()

    const { error } = await supabaseServer
      .from('machines')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting machine:', error)
      return NextResponse.json({ success: false, message: 'Error deleting machine' }, { status: 500 })
    }

    // Log action
    await createAuditLog({
      entidade: 'machines',
      entidade_id: id,
      acao: 'delete',
      dados_antes: machineData,
      usuario_id: searchParams.get('currentUserId') || undefined, // DELETE usually passes params in query or body. Here request is used.
    })

    return NextResponse.json({ success: true, message: 'Machine deleted successfully' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { hashPin } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: user, error } = await supabaseServer
      .from('users')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuário não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true, user: { ...user, pin_hash: undefined } })
  } catch (error) {
    console.error('Error in get user API:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { 
      nome, 
      email, 
      pin,
      role,
      supplier_id,
      can_view_dashboard,
      can_view_map,
      can_manage_sites,
      can_manage_machines,
      can_register_events,
      can_approve_events,
      can_view_financial,
      can_manage_suppliers,
      can_manage_users,
      can_view_logs,
      validado,
      currentUserId,
      currentUserRole,
    } = body

    // Check if current user can update users
    if (currentUserRole !== 'admin' && currentUserRole !== 'dev') {
      return NextResponse.json({ success: false, error: 'Permissão negada' }, { status: 403 })
    }

    // Get current user data for logging and for preserving unchanged fields
    const { data: currentData, error: fetchError } = await supabaseServer
      .from('users')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !currentData) {
      return NextResponse.json({ success: false, error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Build update object - only update fields that are explicitly provided
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    // Update only fields that are explicitly provided (not undefined)
    if (nome !== undefined) updateData.nome = nome
    if (email !== undefined) updateData.email = email || null
    if (role !== undefined) updateData.role = role
    if (supplier_id !== undefined) updateData.supplier_id = supplier_id || null
    if (can_view_dashboard !== undefined) updateData.can_view_dashboard = can_view_dashboard
    if (can_view_map !== undefined) updateData.can_view_map = can_view_map
    if (can_manage_sites !== undefined) updateData.can_manage_sites = can_manage_sites
    if (can_manage_machines !== undefined) updateData.can_manage_machines = can_manage_machines
    if (can_register_events !== undefined) updateData.can_register_events = can_register_events
    if (can_approve_events !== undefined) updateData.can_approve_events = can_approve_events
    if (can_view_financial !== undefined) updateData.can_view_financial = can_view_financial
    if (can_manage_suppliers !== undefined) updateData.can_manage_suppliers = can_manage_suppliers
    if (can_manage_users !== undefined) updateData.can_manage_users = can_manage_users
    if (can_view_logs !== undefined) updateData.can_view_logs = can_view_logs
    if (validado !== undefined) updateData.validado = validado

    // If PIN is provided and valid, hash and update it
    if (pin && pin.length === 6) {
      updateData.pin_hash = await hashPin(pin)
    }

    const { data: user, error } = await supabaseServer
      .from('users')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Log the action
    await supabaseServer
      .from('audit_logs')
      .insert({
        entidade: 'users',
        entidade_id: params.id,
        acao: 'update',
        dados_antes: currentData,
        dados_depois: { ...updateData, pin_hash: undefined },
        usuario_id: currentUserId,
      })

    return NextResponse.json({ success: true, user: { ...user, pin_hash: undefined } })
  } catch (error) {
    console.error('Error in update user API:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { currentUserId, currentUserRole } = body

    // Check if current user can delete users
    if (currentUserRole !== 'admin' && currentUserRole !== 'dev') {
      return NextResponse.json({ success: false, error: 'Permissão negada' }, { status: 403 })
    }

    // Get user data for logging
    const { data: userData } = await supabaseServer
      .from('users')
      .select('*')
      .eq('id', params.id)
      .single()

    // Prevent deleting dev users
    if (userData?.role === 'dev') {
      return NextResponse.json({ success: false, error: 'Não é possível deletar usuários dev' }, { status: 403 })
    }

    const { error } = await supabaseServer
      .from('users')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting user:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Log the action
    await supabaseServer
      .from('audit_logs')
      .insert({
        entidade: 'users',
        entidade_id: params.id,
        acao: 'delete',
        dados_antes: userData,
        usuario_id: currentUserId,
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete user API:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

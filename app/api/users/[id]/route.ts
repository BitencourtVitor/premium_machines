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

    // Get current user data for logging
    const { data: currentData } = await supabaseServer
      .from('users')
      .select('*')
      .eq('id', params.id)
      .single()

    // Build update object
    const updateData: any = {
      nome,
      email: email || null,
      role,
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
      updated_at: new Date().toISOString(),
    }

    // If PIN is provided, hash and update it
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

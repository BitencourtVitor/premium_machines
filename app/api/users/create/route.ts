import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
import { hashPin } from '@/lib/auth'

export async function POST(request: NextRequest) {
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

    // Validate required fields
    if (!nome || !pin) {
      return NextResponse.json({ success: false, error: 'Nome e PIN são obrigatórios' }, { status: 400 })
    }

    // Validate PIN
    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json({ success: false, error: 'PIN deve ter 6 dígitos' }, { status: 400 })
    }

    // Check if current user can create users
    if (currentUserRole !== 'admin' && currentUserRole !== 'dev') {
      return NextResponse.json({ success: false, error: 'Permissão negada' }, { status: 403 })
    }

    // Hash the PIN
    const pin_hash = await hashPin(pin)

    // Create user
    const { data: user, error } = await supabaseServer
      .from('users')
      .insert({
        nome,
        email: email || null,
        pin_hash,
        role: role || 'operador',
        supplier_id: supplier_id || null,
        can_view_dashboard: can_view_dashboard || false,
        can_view_map: can_view_map || false,
        can_manage_sites: can_manage_sites || false,
        can_manage_machines: can_manage_machines || false,
        can_register_events: can_register_events || false,
        can_approve_events: can_approve_events || false,
        can_view_financial: can_view_financial || false,
        can_manage_suppliers: can_manage_suppliers || false,
        can_manage_users: can_manage_users || false,
        can_view_logs: can_view_logs || false,
        validado: validado !== undefined ? validado : true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating user:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Log the action
    await supabaseServer
      .from('audit_logs')
      .insert({
        entidade: 'users',
        entidade_id: user.id,
        acao: 'insert',
        dados_depois: { nome, email, role },
        usuario_id: currentUserId,
      })

    return NextResponse.json({ success: true, user: { ...user, pin_hash: undefined } })
  } catch (error) {
    console.error('Error in create user API:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

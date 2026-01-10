import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { verifyPin } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { userId, pin } = await request.json()

    if (!userId || !pin) {
      return NextResponse.json({ success: false, message: 'Dados incompletos' }, { status: 400 })
    }

    // Fetch user
    const { data: user, error } = await supabaseServer
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('validado', true)
      .single()

    if (error || !user) {
      return NextResponse.json({ success: false, message: 'Usuário não encontrado' }, { status: 404 })
    }

    // Verify PIN
    const isValid = await verifyPin(pin, user.pin_hash)

    if (!isValid) {
      return NextResponse.json({ success: false, message: 'PIN incorreto' }, { status: 401 })
    }

    // Return user data (without sensitive info)
    const sessionUser = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      can_view_dashboard: user.can_view_dashboard,
      can_view_map: user.can_view_map,
      can_manage_sites: user.can_manage_sites,
      can_manage_machines: user.can_manage_machines,
      can_register_events: user.can_register_events,
      can_approve_events: user.can_approve_events,
      can_view_financial: user.can_view_financial,
      can_manage_suppliers: user.can_manage_suppliers,
      can_manage_users: user.can_manage_users,
      can_view_logs: user.can_view_logs,
      supplier_id: user.supplier_id,
    }

    return NextResponse.json({ success: true, user: sessionUser })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 })
  }
}

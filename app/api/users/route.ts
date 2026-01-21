import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Headers para evitar cache
const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
}

export async function GET(request: NextRequest) {
  try {
    const { data: users, error } = await supabaseServer
      .from('users')
      .select(`
        id,
        nome,
        email,
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
        created_at,
        updated_at,
        supplier:suppliers(id, nome, email, telefone, supplier_type)
      `)
      .order('nome', { ascending: true })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { success: false, error: error.message }, 
        { status: 500, headers: noCacheHeaders }
      )
    }

    return NextResponse.json(
      { success: true, users: users || [] },
      { headers: noCacheHeaders }
    )
  } catch (error) {
    console.error('Error in users API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' }, 
      { status: 500, headers: noCacheHeaders }
    )
  }
}

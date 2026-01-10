import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const userRole = searchParams.get('userRole')

    // Build query
    let query = supabaseServer
      .from('audit_logs')
      .select(`
        *,
        users:usuario_id (
          id,
          nome,
          role
        )
      `)
      .order('created_at', { ascending: false })
      .limit(500)

    const { data: logs, error } = await query

    if (error) {
      console.error('Error fetching logs:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, logs: logs || [] })
  } catch (error) {
    console.error('Error in logs API:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

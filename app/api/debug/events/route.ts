import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * GET /api/debug/events
 *
 * API de debug para ver todos os eventos do sistema
 */
export async function GET() {
  try {
    const { data: events, error } = await supabaseServer
      .from('allocation_events')
      .select(`
        *,
        machine:machines(id, unit_number),
        site:sites(id, title),
        created_by_user:users!allocation_events_created_by_fkey(id, nome),
        approved_by_user:users!allocation_events_approved_by_fkey(id, nome)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching events:', error)
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    // Contar por status
    const stats = {
      total: events?.length || 0,
      pending: events?.filter(e => e.status === 'pending').length || 0,
      approved: events?.filter(e => e.status === 'approved').length || 0,
      rejected: events?.filter(e => e.status === 'rejected').length || 0,
    }

    return NextResponse.json({
      success: true,
      stats,
      events: events || []
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}

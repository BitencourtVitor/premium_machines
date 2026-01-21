import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { data: snapshots, error } = await supabaseServer
      .from('financial_snapshots')
      .select(`
        *,
        machine:machine_id (
          unit_number,
          machine_type:machine_type_id (
            nome
          )
        ),
        site:site_id (
          title
        ),
        supplier:supplier_id (
          nome
        )
      `)
      .order('period_start', { ascending: false })
      .limit(200)

    if (error) {
      console.error('Error fetching snapshots:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, snapshots: snapshots || [] })
  } catch (error) {
    console.error('Error in snapshots API:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

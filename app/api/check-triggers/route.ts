import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data, error } = await supabaseServer.rpc('get_table_triggers', { table_name: 'notifications' })
    
    if (error) {
      // Se a RPC não existir, tentamos via query direta se possível (mas Supabase JS não permite query SQL direta facilmente)
      // Vamos tentar buscar informações de sistema se permitido
      const { data: triggers, error: err2 } = await supabaseServer
        .from('pg_trigger')
        .select('*')
        .limit(1)
      
      return NextResponse.json({ success: false, error, err2 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message })
  }
}

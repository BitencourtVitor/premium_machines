import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// Forçar rota dinâmica para evitar cache
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const { data: users, error } = await supabaseServer
      .from('users')
      .select('id, nome, role, supplier_id')
      .or('validado.eq.true,validado.is.null')
      .order('nome', { ascending: true })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar usuários' },
        {
          status: 500,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      )
    }

    console.log(`[API] Users fetched: ${users?.length || 0}`)

    return NextResponse.json(
      { success: true, users },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  }
}

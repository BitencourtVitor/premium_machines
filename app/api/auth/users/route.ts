import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    const { data: users, error } = await supabaseServer
      .from('users')
      .select('id, nome, role')
      .eq('validado', true)
      .order('nome', { ascending: true })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ success: false, message: 'Erro ao buscar usuários' }, { status: 500 })
    }

    return NextResponse.json({ success: true, users })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // Busca todos os usuários sem filtros
    const { data: users, error } = await supabaseServer
      .from('users')
      .select('*')
      .order('nome', { ascending: true })

    if (error) {
      return NextResponse.json({ success: false, error: error }, { status: 500 })
    }

    // Análise dos dados
    const analysis = users?.map(u => ({
      id: u.id,
      nome: u.nome,
      role: u.role,
      validado: u.validado,
      supplier_id: u.supplier_id,
      // Verifica se passaria no filtro da API original
      api_filter_pass: u.validado === true || u.validado === null,
      // Verifica se passaria no filtro do Frontend original
      frontend_filter_pass: u.role !== 'fornecedor',
      // Verifica problemas comuns
      issues: [] as string[]
    }))

    analysis?.forEach(u => {
      if (u.role && u.role !== u.role.trim()) u.issues.push('Role tem espaços')
      if (u.role && u.role !== u.role.toLowerCase()) u.issues.push('Role não é lowercase')
    })

    return NextResponse.json({
      count: users?.length || 0,
      timestamp: new Date().toISOString(),
      analysis
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

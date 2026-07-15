import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { calculateExtensionState } from '@/lib/allocationService'

export const dynamic = 'force-dynamic'

/**
 * GET /api/extensions
 * 
 * Lista todas as extensões físicas.
 * 
 * Query params:
 * - status: Filtrar por status (available, attached, maintenance, inactive)
 * - include_state: 'true' para incluir estado calculado dos eventos
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const includeState = searchParams.get('include_state') === 'true'

    let query = supabaseServer
      .from('machines')
      .select(`
        *,
        machine_type:machine_types(id, nome, is_attachment),
        supplier:suppliers(id, nome)
      `)
      .eq('ativo', true)

    const { data: machines, error } = await query.order('unit_number', { ascending: true })

    if (error) {
      console.error('Erro ao buscar extensões:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar extensões' },
        { status: 500 }
      )
    }

    const allExtensions = (machines || []).filter(
      (m: any) => m.machine_type?.is_attachment
    )

    const filteredByStatus = status
      ? allExtensions.filter((e: any) => e.status === status)
      : allExtensions

    const mapped = filteredByStatus.map((m: any) => ({
      ...m,
      extension_type: m.machine_type,
    }))

    // Se solicitado, incluir estado calculado dos eventos
    if (includeState && mapped.length > 0) {
      const extensionsWithState = await Promise.all(
        mapped.map(async (extension) => {
          try {
            const state = await calculateExtensionState(extension.id)
            return {
              ...extension,
              calculated_state: state,
            }
          } catch (error) {
            return extension
          }
        })
      )
      return NextResponse.json({ success: true, extensions: extensionsWithState })
    }

    return NextResponse.json({ success: true, extensions: mapped })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      { status: 500 }
    )
  }
}

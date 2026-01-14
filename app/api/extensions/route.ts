import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { createAuditLog } from '@/lib/auditLog'
import { calculateExtensionState } from '@/lib/allocationService'

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

/**
 * POST /api/extensions
 * 
 * Cria uma nova extensão física.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validações
    if (!body.unit_number) {
      return NextResponse.json(
        { success: false, message: 'Número da unidade é obrigatório' },
        { status: 400 }
      )
    }

    if (!body.extension_type_id) {
      return NextResponse.json(
        { success: false, message: 'Tipo de extensão é obrigatório' },
        { status: 400 }
      )
    }

    if (!body.ownership_type || !['owned', 'rented'].includes(body.ownership_type)) {
      return NextResponse.json(
        { success: false, message: 'Tipo de propriedade inválido' },
        { status: 400 }
      )
    }

    // Verificar se unit_number já existe
    const { data: existing } = await supabaseServer
      .from('machine_extensions')
      .select('id')
      .eq('unit_number', body.unit_number)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Uma extensão com este número já existe' },
        { status: 400 }
      )
    }

    const { data: extension, error } = await supabaseServer
      .from('machine_extensions')
      .insert({
        unit_number: body.unit_number,
        extension_type_id: body.extension_type_id,
        ownership_type: body.ownership_type,
        supplier_id: body.ownership_type === 'rented' ? body.supplier_id : null,
        billing_type: body.ownership_type === 'rented' ? body.billing_type : null,
        daily_rate: body.daily_rate,
        weekly_rate: body.weekly_rate,
        monthly_rate: body.monthly_rate,
        status: 'available',
        ativo: true,
      })
      .select(`
        *,
        extension_type:extension_types(id, nome),
        supplier:suppliers(id, nome)
      `)
      .single()

    if (error) {
      console.error('Erro ao criar extensão:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao criar extensão' },
        { status: 500 }
      )
    }

    // Log action
    await createAuditLog({
      entidade: 'machine_extensions',
      entidade_id: extension.id,
      acao: 'insert',
      dados_depois: extension,
      usuario_id: body.currentUserId,
    })

    return NextResponse.json({ success: true, extension })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      { status: 500 }
    )
  }
}

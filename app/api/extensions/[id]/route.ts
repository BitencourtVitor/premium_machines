import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { calculateExtensionState } from '@/lib/allocationService'
import { createAuditLog } from '@/lib/auditLog'

export const dynamic = 'force-dynamic'

/**
 * GET /api/extensions/[id]
 * 
 * Retorna detalhes de uma extensão específica.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: extension, error } = await supabaseServer
      .from('machines')
      .select(`
        *,
        machine_type:machine_types(id, nome, is_attachment),
        supplier:suppliers(id, nome)
      `)
      .eq('id', params.id)
      .single()

    if (error || !extension) {
      return NextResponse.json(
        { success: false, message: 'Extensão não encontrada' },
        { status: 404 }
      )
    }

    // Calcular estado a partir dos eventos
    const state = await calculateExtensionState(params.id)

    return NextResponse.json({
      success: true,
      extension: {
        ...extension,
        extension_type: extension.machine_type,
        calculated_state: state,
      }
    })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/extensions/[id]
 * 
 * Atualiza uma extensão existente.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    // Verificar se a extensão existe
    const { data: existing, error: fetchError } = await supabaseServer
      .from('machines')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, message: 'Extensão não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se unit_number já existe em outra extensão
    if (body.unit_number) {
      const { data: duplicate } = await supabaseServer
        .from('machines')
        .select('id')
        .eq('unit_number', body.unit_number)
        .neq('id', params.id)
        .single()

      if (duplicate) {
        return NextResponse.json(
          { success: false, message: 'Uma extensão com este número já existe' },
          { status: 400 }
        )
      }
    }

    const { data: extension, error } = await supabaseServer
      .from('machines')
      .update({
        unit_number: body.unit_number,
        machine_type_id: body.machine_type_id || existing.machine_type_id,
        ownership_type: body.ownership_type,
        supplier_id: body.ownership_type === 'rented' ? body.supplier_id : null,
        billing_type: body.ownership_type === 'rented' ? body.billing_type : null,
        daily_rate: body.daily_rate,
        weekly_rate: body.weekly_rate,
        monthly_rate: body.monthly_rate,
      })
      .eq('id', params.id)
      .select(`
        *,
        machine_type:machine_types(id, nome, is_attachment),
        supplier:suppliers(id, nome)
      `)
      .single()

    if (error) {
      console.error('Erro ao atualizar extensão:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao atualizar extensão' },
        { status: 500 }
      )
    }

    // Log action
    await createAuditLog({
      entidade: 'machines',
      entidade_id: extension.id,
      acao: 'update',
      dados_antes: existing,
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

/**
 * DELETE /api/extensions/[id]
 * 
 * Desativa uma extensão (soft delete).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar se a extensão está anexada a alguma máquina
    const state = await calculateExtensionState(params.id)
    
    if (state.current_machine_id) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Não é possível excluir. Extensão está anexada à máquina ${state.current_machine_unit_number}` 
        },
        { status: 400 }
      )
    }

    // Get data for logging
    const { data: extensionData } = await supabaseServer
      .from('machines')
      .select('*')
      .eq('id', params.id)
      .single()

    const { error } = await supabaseServer
      .from('machines')
      .update({ ativo: false })
      .eq('id', params.id)

    if (error) {
      console.error('Erro ao excluir extensão:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao excluir extensão' },
        { status: 500 }
      )
    }

    // Log action
    // Try to get currentUserId from body if present
    let currentUserId = undefined
    try {
        const body = await request.json()
        currentUserId = body.currentUserId
    } catch (e) {
        // ignore
    }

    await createAuditLog({
      entidade: 'machines',
      entidade_id: params.id,
      acao: 'delete', // Soft delete
      dados_antes: extensionData,
      usuario_id: currentUserId,
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Extensão excluída com sucesso' 
    })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      { status: 500 }
    )
  }
}

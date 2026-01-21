import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
import { createAuditLog } from '@/lib/auditLog'

/**
 * GET /api/machines/[id]
 *
 * Busca detalhes de uma máquina específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: machine, error } = await supabaseServer
      .from('machines')
      .select(`
        *,
        machine_type:machine_types(id, nome, icon),
        supplier:suppliers(id, nome, supplier_type),
        current_site:sites(id, title, address, city)
      `)
      .eq('id', params.id)
      .single()

    if (error || !machine) {
      return NextResponse.json(
        { success: false, message: 'Máquina não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      machine
    })
  } catch (error: any) {
    console.error('Erro ao buscar máquina:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/machines/[id]
 *
 * Atualiza uma máquina específica
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    // Verificar se a máquina existe
    const { data: existingMachine, error: fetchError } = await supabaseServer
      .from('machines')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !existingMachine) {
      return NextResponse.json(
        { success: false, message: 'Máquina não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se unit_number já existe em outra máquina
    if (body.unit_number) {
      const { data: duplicate } = await supabaseServer
        .from('machines')
        .select('id')
        .eq('unit_number', body.unit_number)
        .neq('id', params.id)
        .single()

      if (duplicate) {
        return NextResponse.json(
          { success: false, message: 'Uma máquina com este número já existe' },
          { status: 400 }
        )
      }
    }

    const { data: machine, error } = await supabaseServer
      .from('machines')
      .update({
        unit_number: body.unit_number,
        machine_type_id: body.machine_type_id,
        ownership_type: body.ownership_type,
        supplier_id: body.ownership_type === 'rented' ? body.supplier_id : null,
        billing_type: body.ownership_type === 'rented' ? body.billing_type : null,
        daily_rate: body.daily_rate,
        weekly_rate: body.weekly_rate,
        monthly_rate: body.monthly_rate,
        current_site_id: body.current_site_id,
        status: body.status,
        notas: body.notas,
      })
      .eq('id', params.id)
      .select(`
        *,
        machine_type:machine_types(id, nome, icon),
        supplier:suppliers(id, nome, supplier_type),
        current_site:sites(id, title, address, city)
      `)
      .single()

    if (error) {
      console.error('Erro ao atualizar máquina:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao atualizar máquina' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, machine })
  } catch (error: any) {
    console.error('Erro:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/machines/[id]
 *
 * Desativa uma máquina (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar se a máquina está alocada
    const { data: machine } = await supabaseServer
      .from('machines')
      .select('current_site_id, status')
      .eq('id', params.id)
      .single()

    if (machine && machine.current_site_id) {
      return NextResponse.json(
        { success: false, message: 'Não é possível excluir uma máquina alocada. Finalize a alocação primeiro.' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))

    const { error } = await supabaseServer
      .from('machines')
      .update({ ativo: false })
      .eq('id', params.id)

    if (error) {
      console.error('Erro ao excluir máquina:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao excluir máquina' },
        { status: 500 }
      )
    }

    // Log action
    await createAuditLog({
      entidade: 'machines',
      entidade_id: params.id,
      acao: 'delete', // Soft delete
      dados_antes: machine,
      usuario_id: body.currentUserId,
    })

    return NextResponse.json({
      success: true,
      message: 'Máquina excluída com sucesso'
    })
  } catch (error: any) {
    console.error('Erro:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}

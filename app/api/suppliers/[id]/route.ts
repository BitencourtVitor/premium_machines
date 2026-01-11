import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { createAuditLog } from '@/lib/auditLog'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: supplier, error } = await supabaseServer
      .from('suppliers')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!supplier) {
      return NextResponse.json({ success: false, error: 'Fornecedor não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true, supplier })
  } catch (error) {
    console.error('Error in get supplier API:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { 
      nome, 
      email, 
      telefone,
      supplier_type,
      ativo,
      archived,
      currentUserId,
    } = body

    // Get current data for logging
    const { data: currentData } = await supabaseServer
      .from('suppliers')
      .select('*')
      .eq('id', params.id)
      .single()

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    // Only update fields that are explicitly provided
    if (nome !== undefined) updateData.nome = nome
    if (email !== undefined) updateData.email = email || null
    if (telefone !== undefined) updateData.telefone = telefone || null
    if (supplier_type !== undefined) updateData.supplier_type = supplier_type || 'rental'
    if (ativo !== undefined) updateData.ativo = ativo
    if (archived !== undefined) updateData.archived = archived

    const { data: supplier, error } = await supabaseServer
      .from('suppliers')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating supplier:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Log the action
    if (currentUserId) {
      await supabaseServer
        .from('audit_logs')
        .insert({
          entidade: 'suppliers',
          entidade_id: params.id,
          acao: 'update',
          dados_antes: currentData,
          dados_depois: updateData,
          usuario_id: currentUserId,
        })
    }

    return NextResponse.json({ success: true, supplier })
  } catch (error) {
    console.error('Error in update supplier API:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { currentUserId } = body

    // Get supplier data for logging
    const { data: supplierData } = await supabaseServer
      .from('suppliers')
      .select('*')
      .eq('id', params.id)
      .single()

    const { error } = await supabaseServer
      .from('suppliers')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting supplier:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Log the action
    if (currentUserId) {
      await supabaseServer
        .from('audit_logs')
        .insert({
          entidade: 'suppliers',
          entidade_id: params.id,
          acao: 'delete',
          dados_antes: supplierData,
          usuario_id: currentUserId,
        })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete supplier API:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

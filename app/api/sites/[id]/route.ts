import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
import { createAuditLog } from '@/lib/auditLog'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: site, error } = await supabaseServer
      .from('sites')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error fetching site:', error)
      return NextResponse.json({ success: false, message: 'Jobsite não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true, site })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    const updateData: any = {}
    
    if (body.title !== undefined) updateData.title = body.title
    if (body.address !== undefined) updateData.address = body.address
    if (body.latitude !== undefined) updateData.latitude = body.latitude
    if (body.longitude !== undefined) updateData.longitude = body.longitude
    if (body.city !== undefined) updateData.city = body.city
    if (body.state !== undefined) updateData.state = body.state
    if (body.country !== undefined) updateData.country = body.country
    if (body.notas !== undefined) updateData.notas = body.notas
    if (body.ativo !== undefined) updateData.ativo = body.ativo
    if (body.geocoding_confidence !== undefined) updateData.geocoding_confidence = body.geocoding_confidence
    if (body.place_type !== undefined) updateData.place_type = body.place_type

    updateData.updated_at = new Date().toISOString()

    const { data: site, error } = await supabaseServer
      .from('sites')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating site:', error)
      return NextResponse.json({ 
        success: false, 
        message: error.message || 'Erro ao atualizar obra' 
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, site })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Erro interno' 
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}))

    // Get site data for log
    const { data: siteData } = await supabaseServer
      .from('sites')
      .select('*')
      .eq('id', params.id)
      .single()

    const { error } = await supabaseServer
      .from('sites')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting site:', error)
      return NextResponse.json({ 
        success: false, 
        message: error.message || 'Erro ao deletar jobsite' 
      }, { status: 500 })
    }

    // Log action
    await createAuditLog({
      entidade: 'sites',
      entidade_id: params.id,
      acao: 'delete',
      dados_antes: siteData,
      usuario_id: body.currentUserId,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Erro interno' 
    }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get user from request body (client passes user id since auth is localStorage-based)
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const confirmedBy = formData.get('confirmed_by') as string | null
    const userRole = formData.get('user_role') as string | null

    if (!confirmedBy) {
      return NextResponse.json({ success: false, message: 'Não autenticado' }, { status: 401 })
    }

    if (userRole !== 'admin' && userRole !== 'dev') {
      return NextResponse.json({ success: false, message: 'Sem permissão' }, { status: 403 })
    }

    if (!file) {
      return NextResponse.json({ success: false, message: 'Arquivo obrigatório' }, { status: 400 })
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, message: 'Tipo de arquivo inválido. Use PNG, JPG ou PDF.' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: 'Arquivo muito grande. Máximo 10 MB.' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()
    const path = `event-confirmations/${params.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('Allocation Documents')
      .upload(path, file, { upsert: true })
    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ success: false, message: 'Erro no upload' }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('Allocation Documents').getPublicUrl(path)

    const { error: insertError } = await supabaseServer
      .from('allocation_event_confirmations')
      .upsert({
        event_id: params.id,
        confirmed_by: confirmedBy,
        attachment_url: urlData.publicUrl,
        attachment_name: file.name,
      }, { onConflict: 'event_id' })
    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ success: false, message: 'Erro ao salvar confirmação' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error confirming event:', err)
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 })
  }
}

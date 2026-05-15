import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const allowed = ['email', 'lista', 'active']
    const updates: Record<string, any> = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }
    // Mantém nome espelhando email (coluna NOT NULL no banco)
    if ('email' in updates && typeof updates.email === 'string') {
      updates.email = updates.email.trim().toLowerCase()
      updates.nome = updates.email
    }

    const { data, error } = await supabaseServer
      .from('email_recipients')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    return NextResponse.json({ success: true, recipient: data })
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await supabaseServer
      .from('email_recipients')
      .delete()
      .eq('id', params.id)

    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 })
  }
}

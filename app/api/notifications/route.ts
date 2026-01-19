import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const userId = searchParams.get('userId')

    const now = new Date().toISOString()
    let query = supabaseServer
      .from('notifications')
      .select('*')
      .lte('trigger_date', now)
      .order('trigger_date', { ascending: false })
      .limit(limit)

    const { data, error } = await query

    console.log(`[Notifications API] Found ${data?.length || 0} notifications`)
    if (error) {
      console.error('[Notifications API] Error fetching notifications:', error)
      return NextResponse.json({ success: false, message: 'Error fetching notifications' }, { status: 500 })
    }

    // Filtrar no servidor se o userId for fornecido (para evitar carregar dados arquivados desnecessariamente)
    let notifications = data || []
    if (userId) {
      const initialCount = notifications.length
      notifications = notifications.filter(n => !n.archived_by?.includes(userId))
      console.log(`[Notifications API] Filtered out ${initialCount - notifications.length} archived notifications for user ${userId}`)
    }

    return NextResponse.json({ success: true, notifications })
  } catch (error) {
    console.error('Unexpected error in notifications API:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, userId, action } = await request.json()

    if (!id || !userId || !action) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 })
    }

    // Primeiro, buscar a notificação atual
    const { data: notification, error: fetchError } = await supabaseServer
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !notification) {
      return NextResponse.json({ success: false, message: 'Notification not found' }, { status: 404 })
    }

    let updateData = {}

    if (action === 'view') {
      const viewedBy = notification.viewed_by || []
      if (!viewedBy.includes(userId)) {
        updateData = { viewed_by: [...viewedBy, userId] }
      } else {
        return NextResponse.json({ success: true, notification })
      }
    } else if (action === 'archive') {
      const archivedBy = notification.archived_by || []
      if (!archivedBy.includes(userId)) {
        updateData = { archived_by: [...archivedBy, userId] }
      } else {
        return NextResponse.json({ success: true, notification })
      }
    }

    const { data: updated, error: updateError } = await supabaseServer
      .from('notifications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating notification:', updateError)
      return NextResponse.json({ success: false, message: 'Error updating notification' }, { status: 500 })
    }

    return NextResponse.json({ success: true, notification: updated })
  } catch (error) {
    console.error('Unexpected error in notifications PATCH:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

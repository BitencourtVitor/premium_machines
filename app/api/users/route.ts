import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { data: users, error } = await supabaseServer
      .from('users')
      .select('*')
      .order('nome', { ascending: true })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Remove sensitive data
    const sanitizedUsers = (users || []).map(user => ({
      ...user,
      pin_hash: undefined,
    }))

    return NextResponse.json({ success: true, users: sanitizedUsers })
  } catch (error) {
    console.error('Error in users API:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

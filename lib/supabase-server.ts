import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client with service role key for API routes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    // Bypass Next.js 14 Data Cache so all queries always hit the DB directly
    fetch: (url, options = {}) => fetch(url, { ...options, cache: 'no-store' })
  }
})

export default supabaseServer

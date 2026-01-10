'use client'

import { useEffect, useState } from 'react'
import { getSessionUser, SessionUser } from './session'

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sessionUser = getSessionUser()
    setUser(sessionUser)
    setLoading(false)
  }, [])

  return { user, loading }
}

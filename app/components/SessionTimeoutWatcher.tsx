'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const SESSION_KEY = 'premium_machines_session'
const LAST_ACTIVITY_KEY = 'premium_machines_last_activity'
const INACTIVITY_LIMIT_MS = 30 * 60 * 1000

export default function SessionTimeoutWatcher() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const isAuthPage = pathname === '/login'

    const updateActivity = () => {
      const session = localStorage.getItem(SESSION_KEY)
      if (!session) return
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString())
    }

    const handleActivity = () => {
      if (document.visibilityState === 'visible') {
        updateActivity()
      }
    }

    const checkTimeout = () => {
      const session = localStorage.getItem(SESSION_KEY)
      if (!session) return

      const lastActivityRaw = localStorage.getItem(LAST_ACTIVITY_KEY)
      const lastActivity = lastActivityRaw ? parseInt(lastActivityRaw, 10) : 0

      if (!lastActivity) {
        updateActivity()
        return
      }

      const now = Date.now()
      if (now - lastActivity >= INACTIVITY_LIMIT_MS) {
        localStorage.removeItem(SESSION_KEY)
        localStorage.removeItem(LAST_ACTIVITY_KEY)
        if (!isAuthPage) {
          router.push('/login')
        }
      }
    }

    const windowEvents: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
    ]

    const documentEvents: (keyof DocumentEventMap)[] = [
      'visibilitychange',
    ]

    windowEvents.forEach(eventName => {
      window.addEventListener(eventName, handleActivity)
    })

    documentEvents.forEach(eventName => {
      document.addEventListener(eventName, handleActivity)
    })

    checkTimeout()
    const intervalId = window.setInterval(checkTimeout, 60 * 1000)

    return () => {
      windowEvents.forEach(eventName => {
        window.removeEventListener(eventName, handleActivity)
      })

      documentEvents.forEach(eventName => {
        document.removeEventListener(eventName, handleActivity)
      })
      window.clearInterval(intervalId)
    }
  }, [pathname, router])

  return null
}

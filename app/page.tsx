'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const hasRedirected = useRef(false)

  useEffect(() => {
    if (!hasRedirected.current) {
      hasRedirected.current = true
      router.push('/login')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-gray-400"></div>
    </div>
  )
}

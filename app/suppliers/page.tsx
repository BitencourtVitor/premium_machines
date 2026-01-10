'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SuppliersPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirecionar para página de usuários com aba suppliers
    router.replace('/usuarios?tab=suppliers')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-gray-400"></div>
    </div>
  )
}

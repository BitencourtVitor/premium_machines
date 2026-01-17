'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getHomePageForUser } from '@/lib/userNavigation'
import LoginHeader from './components/LoginHeader'
import BlockedMessage from './components/BlockedMessage'
import UserTypeSelection from './components/UserTypeSelection'
import UserList from './components/UserList'
import SupplierList from './components/SupplierList'
import PinEntry from './components/PinEntry'

export default function LoginPage() {
  const router = useRouter()
  const [userType, setUserType] = useState<'internal' | 'external' | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null)
  const [blocked, setBlocked] = useState(false)
  const [blockedUntil, setBlockedUntil] = useState<Date | null>(null)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null)
  
  // Estado de montagem do cliente para evitar hydration mismatch
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const hasCheckedSession = useRef(false)

  // Marcar como montado no cliente (evita hydration mismatch)
  useEffect(() => {
    setMounted(true)
    
    // Verificar tema inicial
    const htmlElement = document.documentElement
    const hasDarkClass = htmlElement.classList.contains('dark')
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = hasDarkClass || savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setIsDark(prefersDark)
  }, [])

  // Verificar se já está logado - redirecionar para página correta
  useEffect(() => {
    if (!mounted || hasCheckedSession.current) return
    
    hasCheckedSession.current = true
    
    const checkSession = async () => {
      try {
        const { getSessionUser } = await import('@/lib/session')
        const sessionUser = getSessionUser()
        if (sessionUser) {
          const homePage = getHomePageForUser(sessionUser)
          router.push(homePage)
        }
      } catch (e) {
        // Continuar para login
      }
    }
    checkSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  // Observar mudanças no tema
  useEffect(() => {
    if (!mounted) return
    
    const checkTheme = () => {
      const htmlElement = document.documentElement
      const hasDarkClass = htmlElement.classList.contains('dark')
      const savedTheme = localStorage.getItem('theme')
      const prefersDark = hasDarkClass || savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
      setIsDark(prefersDark)
    }
    
    // Observar mudanças no tema via MutationObserver
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    // Observar mudanças no tema do sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', checkTheme)
    
    // Observar mudanças no localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme') {
        checkTheme()
      }
    }
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener('change', checkTheme)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [mounted])

  const loadUsers = async () => {
    setLoadingUsers(true)
    setError('')
    try {
      // Usar timestamp único e headers de cache para garantir dados frescos
      const timestamp = Date.now()
      const response = await fetch(`/api/auth/users?t=${timestamp}&_=${Math.random()}`, {
        cache: 'no-store',
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && Array.isArray(data.users)) {
        // Filtrar apenas usuários internos (não fornecedores)
        const usersList = data.users.filter((user: any) => 
          user && user.id && user.nome && user.role && user.role !== 'fornecedor'
        )
        setUsers(usersList)
        if (usersList.length === 0) {
          setError('Nenhum usuário validado encontrado')
        }
      } else {
        console.error('[Login] Error loading users:', data)
        setError(data.error || data.message || 'Erro ao carregar usuários')
      }
    } catch (err) {
      console.error('Error loading users:', err)
      setError('Erro ao conectar com o servidor. Tente novamente.')
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadSuppliers = async () => {
    setLoadingSuppliers(true)
    setError('')
    try {
      const timestamp = Date.now()
      const response = await fetch(`/api/suppliers?t=${timestamp}&_=${Math.random()}`, {
        cache: 'no-store',
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && Array.isArray(data.suppliers)) {
        setSuppliers(data.suppliers.filter((s: any) => s && s.id && s.nome && s.ativo))
      } else {
        console.error('[Login] Error loading suppliers:', data)
        setError(data.error || data.message || 'Erro ao carregar fornecedores')
      }
    } catch (err) {
      console.error('Error loading suppliers:', err)
      setError('Erro ao conectar com o servidor. Tente novamente.')
    } finally {
      setLoadingSuppliers(false)
    }
  }

  const loadSupplierUsers = async (supplierId: string) => {
    setLoadingUsers(true)
    setError('')
    try {
      const timestamp = Date.now()
      const response = await fetch(`/api/auth/users?t=${timestamp}&_=${Math.random()}`, {
        cache: 'no-store',
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && Array.isArray(data.users)) {
        // Filtrar apenas usuários do fornecedor selecionado
        // Converter ambos para string para garantir comparação correta
        const usersList = data.users.filter((user: any) => 
          user && 
          user.id && 
          user.nome && 
          user.role === 'fornecedor' && 
          user.supplier_id && 
          String(user.supplier_id) === String(supplierId)
        )
        setUsers(usersList)
        if (usersList.length === 0) {
          setError('Nenhum usuário encontrado para este fornecedor')
        }
      } else {
        console.error('[Login] Error loading supplier users:', data)
        setError(data.error || data.message || 'Erro ao carregar usuários')
      }
    } catch (err) {
      console.error('Error loading supplier users:', err)
      setError('Erro ao conectar com o servidor. Tente novamente.')
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleUserTypeSelect = (type: 'internal' | 'external') => {
    setUserType(type)
    setSelectedUserId(null)
    setUsers([])
    setSuppliers([])
    setError('')
    setRemainingAttempts(null)
    
    if (type === 'internal') {
      loadUsers()
    } else {
      loadSuppliers()
    }
  }

  const handleBackToTypeSelection = () => {
    setUserType(null)
    setSelectedUserId(null)
    setUsers([])
    setSuppliers([])
    setError('')
    setRemainingAttempts(null)
  }

  const handleSupplierSelect = (supplierId: string) => {
    setSelectedSupplierId(supplierId)
    loadSupplierUsers(supplierId)
  }

  const handleBackToSupplierSelection = () => {
    setSelectedSupplierId(null)
    setUsers([])
    setError('')
    setRemainingAttempts(null)
  }

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId)
    setError('')
    setRemainingAttempts(null)
  }

  const handleBackToUserSelection = () => {
    setSelectedUserId(null)
    setError('')
    setRemainingAttempts(null)
  }

  const handlePinComplete = async (completedPin: string) => {
    if (!selectedUserId) {
      setError('Por favor, selecione um usuário primeiro')
      return
    }

    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: selectedUserId, pin: completedPin }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          // Bloqueado
          setBlocked(true)
          if (data.blockedUntil) {
            setBlockedUntil(new Date(data.blockedUntil))
          }
          setError('IP bloqueado devido a muitas tentativas')
        } else if (response.status === 403) {
          // Usuário não validado
          setError(data.error || 'Seu cadastro ainda não foi validado. Por favor, aguarde a aprovação do administrador.')
        } else if (response.status === 401) {
          // PIN incorreto
          setRemainingAttempts(data.remainingAttempts || 0)
          
          if (data.blocked) {
            setBlocked(true)
            if (data.blockedUntil) {
              setBlockedUntil(new Date(data.blockedUntil))
            }
            setError('Muitas tentativas incorretas. IP bloqueado por 5 minutos.')
          } else {
            const attemptsText = data.remainingAttempts > 0 
              ? `Tentativas restantes: ${data.remainingAttempts}`
              : 'Última tentativa!'
            setError(`PIN incorreto. ${attemptsText}`)
          }
        } else {
          setError(data.error || data.message || 'Erro no login')
        }
        return
      }

      // Login bem-sucedido - redirecionar para página correta
      if (data.success && data.user) {
        const { setSessionUser } = await import('@/lib/session')
        setSessionUser(data.user)
        const homePage = getHomePageForUser(data.user)
        router.push(homePage)
      }
    } catch (err: any) {
      setError('Erro ao conectar com o servidor')
      console.error('Erro no login:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCountdownComplete = () => {
    setBlocked(false)
    setBlockedUntil(null)
    setRemainingAttempts(null)
    setError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <LoginHeader 
            mounted={mounted} 
            isDark={isDark} 
            userType={userType} 
            selectedUserId={selectedUserId} 
          />
          
          <BlockedMessage 
            blocked={blocked} 
            blockedUntil={blockedUntil} 
            onComplete={handleCountdownComplete} 
          />

          {!blocked && (
            <>
              {!userType ? (
                <UserTypeSelection onSelect={handleUserTypeSelect} />
              ) : !selectedUserId ? (
                userType === 'internal' ? (
                  <UserList 
                    users={users} 
                    loading={loadingUsers} 
                    onSelect={handleUserSelect} 
                    onRefresh={loadUsers} 
                    onBack={handleBackToTypeSelection}
                  />
                ) : selectedSupplierId ? (
                  <UserList 
                    users={users} 
                    loading={loadingUsers} 
                    onSelect={handleUserSelect} 
                    selectedSupplierName={suppliers.find(s => s.id === selectedSupplierId)?.nome} 
                    onRefresh={() => loadSupplierUsers(selectedSupplierId)}
                    onBack={handleBackToSupplierSelection}
                  />
                ) : (
                  <SupplierList 
                    suppliers={suppliers} 
                    loading={loadingSuppliers} 
                    onSelect={handleSupplierSelect} 
                    onRefresh={loadSuppliers} 
                    onBack={handleBackToTypeSelection}
                  />
                )
              ) : (
                <PinEntry 
                  selectedUser={users.find(u => u.id === selectedUserId)} 
                  loading={loading} 
                  blocked={blocked} 
                  error={error} 
                  remainingAttempts={remainingAttempts} 
                  onBack={handleBackToUserSelection} 
                  onComplete={handlePinComplete} 
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

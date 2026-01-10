'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import PinInput from '../components/PinInput'
import CountdownTimer from '../components/CountdownTimer'
import { getHomePageForUser } from '@/lib/userNavigation'

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
  
  // Estado de montagem do cliente para evitar hydration mismatch
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)

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
    if (!mounted) return
    
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
  }, [mounted, router])

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

  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null)

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
          setError(data.error || 'Seu cadastro ainda não foi validado. Aguarde a aprovação do administrador.')
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
          setError(data.error || data.message || 'Erro ao fazer login')
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

  const calculateRemainingSeconds = (): number => {
    if (!blockedUntil) return 0
    const now = new Date()
    const diff = Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000)
    return Math.max(0, diff)
  }

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        )
      case 'dev':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        )
      case 'operador':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )
      case 'fornecedor':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )
    }
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Logo/Título */}
          <div className="text-center mb-8 relative z-10">
            <div className="flex items-center justify-center gap-3 mb-2">
              {/* Logo com renderização condicional para evitar hydration mismatch */}
              {mounted ? (
                <Image
                  src={isDark ? '/premium_logo_vetorizado_white.png' : '/premium_logo_vetorizado.png'}
                  alt="Premium Logo"
                  width={28}
                  height={28}
                  className="object-contain flex-shrink-0"
                  priority
                />
              ) : (
                // Placeholder durante SSR para evitar hydration mismatch
                <div className="w-7 h-7 flex-shrink-0" />
              )}
              <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />
              <span className="text-3xl text-gray-900 dark:text-white">Machines</span>
            </div>
            {!userType ? (
              <p className="text-gray-600 dark:text-gray-400">Selecione seu tipo de acesso</p>
            ) : !selectedUserId ? (
              <p className="text-gray-600 dark:text-gray-400">
                {userType === 'internal' ? 'Selecione um usuário para continuar' : 'Selecione sua empresa ou prestador'}
              </p>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">Digite seu PIN de 6 dígitos</p>
            )}
          </div>

          {/* Bloqueio */}
          {blocked && blockedUntil && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <CountdownTimer
                seconds={calculateRemainingSeconds()}
                onComplete={handleCountdownComplete}
              />
            </div>
          )}

          {/* Seleção de Tipo, Usuário ou Input de PIN */}
          {!blocked && (
            <>
              {!userType ? (
                // Seleção de tipo de usuário
                <div className="space-y-2">
                  <button
                    onClick={() => handleUserTypeSelect('internal')}
                    className="w-full p-3 text-left bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/30 dark:hover:to-blue-800/30 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">Funcionário Premium</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Acesso para funcionários internos</p>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                  <button
                    onClick={() => handleUserTypeSelect('external')}
                    className="w-full p-3 text-left bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/30 dark:hover:to-blue-800/30 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">Prestador de Serviço</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Fornecedores e mecânicos</p>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                </div>
              ) : !selectedUserId ? (
                // Lista de usuários ou fornecedores
                <div>
                  {/* Botão de voltar */}
                  <button
                    onClick={selectedSupplierId ? handleBackToSupplierSelection : handleBackToTypeSelection}
                    className="mb-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Voltar
                  </button>

                  {userType === 'internal' ? (
                    // Lista de usuários internos
                    <>
                      {/* Botão de refresh */}
                      <div className="mb-3 flex justify-end">
                        <button
                          onClick={loadUsers}
                          disabled={loadingUsers}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Recarregar lista de usuários"
                        >
                          <svg
                            className={`w-4 h-4 ${loadingUsers ? 'animate-spin' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                          <span className="text-xs">Atualizar</span>
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto pr-2">
                        <div className="space-y-2">
                          {loadingUsers ? (
                            <div className="text-center py-8">
                              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-gray-400"></div>
                              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Carregando usuários...</p>
                            </div>
                          ) : users.length === 0 ? (
                            <div className="text-center py-8">
                              <p className="text-gray-600 dark:text-gray-400">Nenhum usuário disponível</p>
                            </div>
                          ) : (
                            users.map((user) => (
                              <button
                                key={user.id}
                                onClick={() => handleUserSelect(user.id)}
                                className="w-full p-3 text-left bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/30 dark:hover:to-blue-800/30 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                                      {getRoleIcon(user.role)}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{user.nome}</p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
                                    </div>
                                  </div>
                                  <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  ) : selectedSupplierId ? (
                    // Lista de usuários do fornecedor selecionado
                    <>
                      <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Empresa selecionada:</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {suppliers.find((s: any) => s.id === selectedSupplierId)?.nome}
                        </p>
                      </div>
                      <div className="max-h-80 overflow-y-auto pr-2">
                        <div className="space-y-2">
                          {loadingUsers ? (
                            <div className="text-center py-8">
                              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-gray-400"></div>
                              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Carregando usuários...</p>
                            </div>
                          ) : users.length === 0 ? (
                            <div className="text-center py-8">
                              <p className="text-gray-600 dark:text-gray-400">Nenhum usuário disponível para este fornecedor</p>
                            </div>
                          ) : (
                            users.map((user) => (
                              <button
                                key={user.id}
                                onClick={() => handleUserSelect(user.id)}
                                className="w-full p-3 text-left bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/30 dark:hover:to-blue-800/30 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                                      {getRoleIcon(user.role)}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{user.nome}</p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
                                    </div>
                                  </div>
                                  <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    // Lista de fornecedores e mecânicos
                    <>
                      <div className="mb-3 flex justify-end">
                        <button
                          onClick={loadSuppliers}
                          disabled={loadingSuppliers}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Recarregar lista"
                        >
                          <svg
                            className={`w-4 h-4 ${loadingSuppliers ? 'animate-spin' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                          <span className="text-xs">Atualizar</span>
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto pr-2 space-y-4">
                        {/* Fornecedores de Máquinas */}
                        {suppliers.filter((s: any) => s.supplier_type === 'rental' || s.supplier_type === 'both').length > 0 && (
                          <div>
                            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 px-1">Fornecedores de Máquinas</h3>
                            <div className="space-y-2">
                              {suppliers
                                .filter((s: any) => s.supplier_type === 'rental' || s.supplier_type === 'both')
                                .map((supplier: any) => (
                                  <button
                                    key={supplier.id}
                                    onClick={() => handleSupplierSelect(supplier.id)}
                                    className="w-full p-3 text-left bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/30 dark:hover:to-blue-800/30 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                          </svg>
                                        </div>
                                        <div>
                                          <p className="font-semibold text-gray-900 dark:text-white text-sm">{supplier.nome}</p>
                                          <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {supplier.supplier_type === 'both' 
                                              ? 'Fornecedor de máquinas e manutenção' 
                                              : 'Fornecedor de máquinas'}
                                          </p>
                                        </div>
                                      </div>
                                      <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </div>
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Mecânicos */}
                        {/* Empresas com 'both' aparecem apenas em 'Fornecedores de Máquinas', não aqui */}
                        {suppliers.filter((s: any) => s.supplier_type === 'maintenance').length > 0 && (
                          <div>
                            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 px-1">Mecânicos</h3>
                            <div className="space-y-2">
                              {suppliers
                                .filter((s: any) => s.supplier_type === 'maintenance')
                                .map((supplier: any) => (
                                  <button
                                    key={supplier.id}
                                    onClick={() => handleSupplierSelect(supplier.id)}
                                    className="w-full p-3 text-left bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 hover:from-green-50 hover:to-green-100 dark:hover:from-green-900/30 dark:hover:to-green-800/30 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0 text-green-600 dark:text-green-400">
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          </svg>
                                        </div>
                                        <div>
                                          <p className="font-semibold text-gray-900 dark:text-white text-sm">{supplier.nome}</p>
                                          <p className="text-xs text-gray-500 dark:text-gray-400">Mecânico</p>
                                        </div>
                                      </div>
                                      <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </div>
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}

                        {loadingSuppliers ? (
                          <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-gray-400"></div>
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Carregando...</p>
                          </div>
                        ) : suppliers.length === 0 && !loadingSuppliers ? (
                          <div className="text-center py-8">
                            <p className="text-gray-600 dark:text-gray-400">Nenhum fornecedor disponível</p>
                          </div>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                // Input de PIN
                <>
                  {/* Botão de voltar */}
                  <button
                    onClick={handleBackToUserSelection}
                    className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Voltar para seleção de usuário
                  </button>

                  {/* Nome do usuário selecionado */}
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Entrando como:</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {users.find(u => u.id === selectedUserId)?.nome}
                    </p>
                  </div>

                  <PinInput
                    onComplete={handlePinComplete}
                    disabled={loading || blocked}
                    error={!!error && !blocked}
                  />
                </>
              )}

              {/* Mensagens de erro */}
              {error && (
                <div className={`mt-4 p-3 rounded-lg text-sm text-center ${
                  blocked 
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800' 
                    : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800'
                }`}>
                  {error}
                </div>
              )}

              {/* Tentativas restantes */}
              {remainingAttempts !== null && remainingAttempts > 0 && !blocked && (
                <div className="mt-2 text-center text-sm text-blue-600 dark:text-blue-400">
                  Tentativas restantes: {remainingAttempts}
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div className="mt-4 text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-gray-400"></div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

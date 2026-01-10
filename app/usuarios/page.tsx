'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '../components/Header'
import BottomNavigation from '../components/BottomNavigation'
import Sidebar from '../components/Sidebar'
import CustomInput from '../components/CustomInput'
import CustomDropdown from '../components/CustomDropdown'
import PinInput from '../components/PinInput'
import { useSession } from '@/lib/useSession'
import { useSidebar } from '@/lib/useSidebar'

function getRoleIcon(role: string) {
  switch (role) {
    case 'dev':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      )
    case 'admin':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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

export default function UsuariosPage() {
  const router = useRouter()
  const { user, loading: sessionLoading } = useSession()
  const { isExpanded } = useSidebar()
  const [users, setUsers] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [activeTab, setActiveTab] = useState<'users' | 'suppliers'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.get('tab') === 'suppliers' ? 'suppliers' : 'users'
    }
    return 'users'
  })
  const [showModal, setShowModal] = useState(false)
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [editingSupplier, setEditingSupplier] = useState<any>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null)
  const [showOnlyPending, setShowOnlyPending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    pin: '',
    role: 'operador',
    can_view_dashboard: false,
    can_view_map: false,
    can_manage_sites: false,
    can_manage_machines: false,
    can_register_events: false,
    can_approve_events: false,
    can_view_financial: false,
    can_manage_suppliers: false,
    can_manage_users: false,
    can_view_logs: false,
    validado: true,
  })
  const [saving, setSaving] = useState(false)
  const [savingSupplier, setSavingSupplier] = useState(false)
  const [error, setError] = useState('')
  const [supplierFormData, setSupplierFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    supplier_type: 'rental' as 'rental' | 'maintenance' | 'both',
  })

  useEffect(() => {
    if (sessionLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    if (!user.can_manage_users && user.role !== 'admin' && user.role !== 'dev') {
      router.push('/dashboard')
      return
    }

    loadUsers()
    setLoading(false)
  }, [user, sessionLoading, router])

  useEffect(() => {
    if (activeTab === 'suppliers' && !loading) {
      loadSuppliers()
    }
  }, [activeTab, loading, loadSuppliers])

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.relative')) {
        setShowSearchDropdown(false)
      }
    }

    if (showSearchDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSearchDropdown])

  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const response = await fetch(`/api/users?t=${Date.now()}`, {
        cache: 'no-store',
      })
      const data = await response.json()

      if (response.ok && data.success) {
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadSuppliers = useCallback(async () => {
    setLoadingSuppliers(true)
    try {
      const response = await fetch(`/api/suppliers?t=${Date.now()}`, {
        cache: 'no-store',
      })
      const data = await response.json()

      if (response.ok && data.success) {
        setSuppliers(data.suppliers || [])
      }
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error)
    } finally {
      setLoadingSuppliers(false)
    }
  }, [])

  const handleOpenModal = (userToEdit?: any) => {
    if (userToEdit) {
      setEditingUser(userToEdit)
      setFormData({
        nome: userToEdit.nome,
        email: userToEdit.email || '',
        pin: '',
        role: userToEdit.role,
        can_view_dashboard: userToEdit.can_view_dashboard,
        can_view_map: userToEdit.can_view_map,
        can_manage_sites: userToEdit.can_manage_sites,
        can_manage_machines: userToEdit.can_manage_machines,
        can_register_events: userToEdit.can_register_events,
        can_approve_events: userToEdit.can_approve_events,
        can_view_financial: userToEdit.can_view_financial,
        can_manage_suppliers: userToEdit.can_manage_suppliers,
        can_manage_users: userToEdit.can_manage_users,
        can_view_logs: userToEdit.can_view_logs,
        validado: userToEdit.validado,
      })
      setSelectedSupplier(userToEdit.supplier_id || null)
    } else {
      setEditingUser(null)
      setFormData({
        nome: '',
        email: '',
        pin: '',
        role: selectedSupplier ? 'fornecedor' : 'operador',
        can_view_dashboard: false,
        can_view_map: false,
        can_manage_sites: false,
        can_manage_machines: false,
        can_register_events: false,
        can_approve_events: false,
        can_view_financial: false,
        can_manage_suppliers: false,
        can_manage_users: false,
        can_view_logs: false,
        validado: true,
      })
    }
    setError('')
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const url = editingUser 
        ? `/api/users/${editingUser.id}` 
        : '/api/users/create'
      
      const body: any = {
        ...formData,
        role: selectedSupplier ? 'fornecedor' : formData.role,
        supplier_id: selectedSupplier || (formData.role === 'fornecedor' && editingUser?.supplier_id) || null,
        currentUserId: user?.id,
        currentUserRole: user?.role,
      }

      if (!editingUser && !formData.pin) {
        setError('PIN é obrigatório para novos usuários')
        setSaving(false)
        return
      }

      if (!formData.pin && editingUser) {
        delete body.pin
      }

      const response = await fetch(url, {
        method: editingUser ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setShowModal(false)
        if (!editingUser) {
          setSelectedSupplier(null)
        }
        loadUsers()
        if (activeTab === 'suppliers') {
          loadSuppliers()
        }
      } else {
        setError(data.error || 'Erro ao salvar usuário')
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSupplier(true)
    setError('')

    try {
      const url = editingSupplier 
        ? `/api/suppliers/${editingSupplier.id}` 
        : '/api/suppliers'
      
      const body: any = {
        ...supplierFormData,
        currentUserId: user?.id,
      }

      const response = await fetch(url, {
        method: editingSupplier ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setShowSupplierModal(false)
        setEditingSupplier(null)
        setSupplierFormData({
          nome: '',
          email: '',
          telefone: '',
          supplier_type: 'rental',
        })
        loadSuppliers()
        loadUsers()
      } else {
        setError(data.error || 'Erro ao salvar fornecedor')
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor')
    } finally {
      setSavingSupplier(false)
    }
  }

  const handleOpenSupplierModal = (supplierToEdit?: any) => {
    if (supplierToEdit) {
      setEditingSupplier(supplierToEdit)
      setSupplierFormData({
        nome: supplierToEdit.nome,
        email: supplierToEdit.email || '',
        telefone: supplierToEdit.telefone || '',
        supplier_type: supplierToEdit.supplier_type || 'rental',
      })
    } else {
      setEditingSupplier(null)
      setSupplierFormData({
        nome: '',
        email: '',
        telefone: '',
        supplier_type: 'rental',
      })
    }
    setShowSupplierModal(true)
  }

  const handleValidate = async (userToValidate: any) => {
    try {
      const response = await fetch(`/api/users/${userToValidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userToValidate,
          validado: true,
          currentUserId: user?.id,
          currentUserRole: user?.role,
        }),
      })

      if (response.ok) {
        loadUsers()
      }
    } catch (err) {
      console.error('Erro ao validar usuário:', err)
    }
  }

  const filteredUsers = users.filter(u => {
    // Filtrar por tab
    if (activeTab === 'suppliers' && u.role !== 'fornecedor') return false
    if (activeTab === 'users' && u.role === 'fornecedor') return false
    
    if (showOnlyPending && u.validado) return false
    if (searchQuery.trim() && !u.nome.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const pendingCount = users.filter(u => !u.validado && (activeTab === 'users' ? u.role !== 'fornecedor' : u.role === 'fornecedor')).length
  const supplierUsers = users.filter(u => u.role === 'fornecedor')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-gray-400"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen md:h-screen md:max-h-screen bg-gray-50 dark:bg-gray-900 pb-safe-content md:pb-0 md:flex md:flex-col md:overflow-hidden">
      <Header title="Usuários" />
      <div className="flex md:flex-1 md:overflow-hidden">
        <Sidebar />
        <main className={`flex-1 p-4 md:p-6 md:overflow-hidden md:flex md:flex-col transition-all duration-250 ease-in-out ${isExpanded ? 'md:ml-48 lg:ml-64' : 'md:ml-16 lg:ml-20'}`}>
          <div className="max-w-7xl mx-auto md:flex md:flex-col md:flex-1 md:overflow-hidden md:w-full">
            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4 flex-shrink-0">
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setActiveTab('users')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'users'
                      ? 'text-blue-600 dark:text-gray-300 border-b-2 border-blue-600 dark:border-gray-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  Users
                </button>
                <button
                  onClick={() => {
                    setActiveTab('suppliers')
                    loadSuppliers()
                  }}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'suppliers'
                      ? 'text-blue-600 dark:text-gray-300 border-b-2 border-blue-600 dark:border-gray-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  Suppliers
                </button>
              </div>
            </div>

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {showOnlyPending ? 'Usuários Pendentes' : 'Lista de Usuários'}
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button
                        onClick={() => setShowSearchDropdown(!showSearchDropdown)}
                        className={`p-2 rounded-lg transition-colors ${
                          searchQuery.trim()
                            ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
                            : showSearchDropdown
                            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-gray-700'
                            : 'text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        title="Buscar"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                      {showSearchDropdown && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-10">
                          <div className="relative">
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Buscar usuário..."
                              className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              autoFocus
                            />
                            {searchQuery && (
                              <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                title="Limpar busca"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {pendingCount > 0 && (
                      <button
                        onClick={() => setShowOnlyPending(!showOnlyPending)}
                        className={`p-2 rounded-lg transition-colors ${
                          showOnlyPending
                            ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                            : 'text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                        }`}
                        title={`Pendentes (${pendingCount})`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={loadUsers}
                      className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      disabled={loadingUsers}
                      title="Atualizar"
                    >
                      {loadingUsers ? (
                        <svg className="w-5 h-5 animate-spin-reverse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                    </button>
                    <button 
                      onClick={() => handleOpenModal()}
                      className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Novo Usuário"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>

              {loadingUsers ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-gray-400"></div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    Nenhum usuário encontrado.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700 md:flex-1 md:overflow-y-auto">
                  {filteredUsers.map((u) => (
                    <div key={u.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-gray-600 dark:text-gray-400">
                            {getRoleIcon(u.role)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{u.nome}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{u.role}</p>
                          </div>
                          {!u.validado && (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
                              Pendente
                            </span>
                          )}
                        </div>
                        {u.role !== 'dev' && (
                          <div className="flex items-center gap-2">
                            {!u.validado && (
                              <button
                                onClick={() => handleValidate(u)}
                                className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Validar
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenModal(u)}
                              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            )}

            {/* Suppliers Tab */}
            {activeTab === 'suppliers' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Suppliers ({suppliers.length})
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenSupplierModal()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Nova Empresa
                    </button>
                    <button
                      onClick={() => {
                        loadSuppliers()
                        loadUsers()
                      }}
                      className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      disabled={loadingSuppliers}
                      title="Atualizar"
                    >
                      {loadingSuppliers ? (
                        <svg className="w-5 h-5 animate-spin-reverse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {loadingSuppliers ? (
                  <div className="p-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-gray-400"></div>
                  </div>
                ) : suppliers.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      Nenhuma empresa fornecedora cadastrada.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700 md:flex-1 md:overflow-y-auto">
                    {suppliers.map((supplier) => {
                      const supplierUsers = users.filter(u => u.supplier_id === supplier.id)
                      return (
                        <div key={supplier.id} className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white">{supplier.nome}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {supplier.email && `${supplier.email} • `}
                                  {supplier.telefone || 'Sem telefone'}
                                  {supplier.supplier_type && ` • ${supplier.supplier_type === 'rental' ? 'Aluguel' : supplier.supplier_type === 'maintenance' ? 'Manutenção' : 'Ambos'}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedSupplier(supplier.id)
                                  setEditingUser(null)
                                  setFormData({
                                    nome: '',
                                    email: '',
                                    pin: '',
                                    role: 'fornecedor',
                                    can_view_dashboard: false,
                                    can_view_map: false,
                                    can_manage_sites: false,
                                    can_manage_machines: false,
                                    can_register_events: false,
                                    can_approve_events: false,
                                    can_view_financial: false,
                                    can_manage_suppliers: false,
                                    can_manage_users: false,
                                    can_view_logs: false,
                                    validado: true,
                                  })
                                  setShowModal(true)
                                }}
                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center gap-1"
                                title="Adicionar usuário"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Usuário
                              </button>
                              <button
                                onClick={() => handleOpenSupplierModal(supplier)}
                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                title="Editar empresa"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          {supplierUsers.length > 0 && (
                            <div className="ml-13 mt-3 space-y-2">
                              {supplierUsers.map((u) => (
                                <div key={u.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    {getRoleIcon(u.role)}
                                    <div>
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">{u.nome}</p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">{u.email || 'Sem email'}</p>
                                    </div>
                                    {!u.validado && (
                                      <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
                                        Pendente
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {!u.validado && (
                                      <button
                                        onClick={() => handleValidate(u)}
                                        className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                        title="Validar"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleOpenModal(u)}
                                      className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                                      title="Editar"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <BottomNavigation />

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingSupplier ? 'Editar Empresa' : 'Nova Empresa Fornecedora'}
                </h2>
                <button
                  onClick={() => {
                    setShowSupplierModal(false)
                    setEditingSupplier(null)
                    setSupplierFormData({
                      nome: '',
                      email: '',
                      telefone: '',
                      supplier_type: 'rental',
                    })
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSaveSupplier} className="space-y-4">
                <CustomInput
                  label="Nome da Empresa"
                  value={supplierFormData.nome}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, nome: e.target.value })}
                  required
                />
                <CustomInput
                  label="Email"
                  type="email"
                  value={supplierFormData.email}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                />
                <CustomInput
                  label="Telefone"
                  type="tel"
                  value={supplierFormData.telefone}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, telefone: e.target.value })}
                />
                <CustomDropdown
                  label="Tipo de Fornecedor"
                  value={supplierFormData.supplier_type}
                  onChange={(value) => setSupplierFormData({ ...supplierFormData, supplier_type: value as 'rental' | 'maintenance' | 'both' })}
                  options={[
                    { value: 'rental', label: 'Aluguel de Máquinas' },
                    { value: 'maintenance', label: 'Manutenção/Mecânico' },
                    { value: 'both', label: 'Ambos' },
                  ]}
                />

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSupplierModal(false)
                      setEditingSupplier(null)
                      setSupplierFormData({
                        nome: '',
                        email: '',
                        telefone: '',
                        supplier_type: 'rental',
                      })
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingSupplier}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingSupplier ? 'Salvando...' : editingSupplier ? 'Salvar Alterações' : 'Criar Empresa'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <CustomInput
                  label="Nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
                <CustomInput
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <CustomInput
                  label={editingUser ? 'Novo PIN (deixe vazio para manter)' : 'PIN (6 dígitos)'}
                  type="password"
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  maxLength={6}
                  placeholder="••••••"
                  required={!editingUser}
                />
                {selectedSupplier && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <span className="font-medium">Empresa:</span> {suppliers.find(s => s.id === selectedSupplier)?.nome || 'Selecionada'}
                    </p>
                  </div>
                )}
                <CustomDropdown
                  label="Perfil"
                  value={formData.role}
                  onChange={(value) => setFormData({ ...formData, role: value })}
                  options={[
                    { value: 'operador', label: 'Operador' },
                    { value: 'admin', label: 'Administrador' },
                    { value: 'fornecedor', label: 'Fornecedor' },
                  ]}
                  disabled={!!selectedSupplier}
                />
                {selectedSupplier && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Usuários de empresas fornecedoras sempre têm perfil "Fornecedor"
                  </p>
                )}

                {/* Permissões */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Permissões</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'can_view_dashboard', label: 'Dashboard' },
                      { key: 'can_view_map', label: 'Mapa' },
                      { key: 'can_manage_sites', label: 'Obras' },
                      { key: 'can_manage_machines', label: 'Máquinas' },
                      { key: 'can_register_events', label: 'Registrar Eventos' },
                      { key: 'can_approve_events', label: 'Aprovar Eventos' },
                      { key: 'can_view_financial', label: 'Financeiro' },
                      { key: 'can_manage_suppliers', label: 'Fornecedores' },
                      { key: 'can_manage_users', label: 'Usuários' },
                      { key: 'can_view_logs', label: 'Logs' },
                    ].map((perm) => (
                      <label key={perm.key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(formData as any)[perm.key]}
                          onChange={(e) => setFormData({ ...formData, [perm.key]: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-blue-600 dark:bg-gray-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '../components/Header'
import BottomNavigation from '../components/BottomNavigation'
import Sidebar from '../components/Sidebar'
import CustomInput from '../components/CustomInput'
import CustomDropdown from '../components/CustomDropdown'
import PinInput from '../components/PinInput'
import { useSession } from '@/lib/useSession'
import { useSidebar } from '@/lib/useSidebar'

// Função para formatar telefone americano: +1 (XXX) XXX-XXXX ou (XXX) XXX-XXXX
function formatUSPhone(value: string): string {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '')
  
  // Verifica se começa com 1 (código do país)
  const hasCountryCode = numbers.startsWith('1') && numbers.length > 10
  const phoneNumbers = hasCountryCode ? numbers.slice(1) : numbers
  
  // Limita a 10 dígitos (sem o código do país)
  const limited = phoneNumbers.slice(0, 10)
  
  // Aplica a máscara
  if (limited.length === 0) {
    return hasCountryCode ? '+1 ' : ''
  } else if (limited.length <= 3) {
    return hasCountryCode ? `+1 (${limited}` : `(${limited}`
  } else if (limited.length <= 6) {
    return hasCountryCode 
      ? `+1 (${limited.slice(0, 3)}) ${limited.slice(3)}`
      : `(${limited.slice(0, 3)}) ${limited.slice(3)}`
  } else {
    return hasCountryCode
      ? `+1 (${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`
      : `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`
  }
}

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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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

function getSupplierIcon(supplierType: string) {
  switch (supplierType) {
    case 'rental':
      // Ícone de prédio (alocação) - azul
      return {
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
        bgColor: 'bg-blue-100 dark:bg-blue-900/50',
        textColor: 'text-blue-600 dark:text-blue-400'
      }
    case 'maintenance':
      // Ícone de engrenagem (manutenção) - verde
      return {
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
        bgColor: 'bg-green-100 dark:bg-green-900/50',
        textColor: 'text-green-600 dark:text-green-400'
      }
    case 'both':
      // Ícone de prédio (alocação e manutenção) - azul (mesmo que rental)
      return {
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
        bgColor: 'bg-blue-100 dark:bg-blue-900/50',
        textColor: 'text-blue-600 dark:text-blue-400'
      }
    default:
      // Default: prédio azul
      return {
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
        bgColor: 'bg-blue-100 dark:bg-blue-900/50',
        textColor: 'text-blue-600 dark:text-blue-400'
      }
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
  const [userToDelete, setUserToDelete] = useState<any>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set())
  const [showArchivedSuppliers, setShowArchivedSuppliers] = useState(false)
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

  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const response = await fetch(`/api/users?_=${Date.now()}&refresh=${Math.random()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
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

  const loadSuppliers = useCallback(async (showArchived = false) => {
    setLoadingSuppliers(true)
    try {
      const url = showArchived 
        ? `/api/suppliers?archived=true&_=${Date.now()}&refresh=${Math.random()}`
        : `/api/suppliers?_=${Date.now()}&refresh=${Math.random()}`
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
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

  useEffect(() => {
    if (activeTab === 'suppliers' && !loading) {
      loadSuppliers(showArchivedSuppliers)
    }
  }, [activeTab, loading, loadSuppliers, showArchivedSuppliers])

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

  const handleOpenModal = (userToEdit?: any) => {
    // Carregar fornecedores se ainda não foram carregados
    if (suppliers.length === 0) {
      loadSuppliers()
    }
    
    if (userToEdit) {
      setEditingUser(userToEdit)
      const isSupplier = userToEdit.role === 'fornecedor'
      setFormData({
        nome: userToEdit.nome,
        email: userToEdit.email || '',
        pin: '',
        role: userToEdit.role,
        can_view_dashboard: isSupplier ? false : userToEdit.can_view_dashboard,
        can_view_map: isSupplier ? true : userToEdit.can_view_map,
        can_manage_sites: isSupplier ? false : userToEdit.can_manage_sites,
        can_manage_machines: isSupplier ? false : userToEdit.can_manage_machines,
        can_register_events: isSupplier ? true : userToEdit.can_register_events,
        can_approve_events: isSupplier ? true : userToEdit.can_approve_events,
        can_view_financial: isSupplier ? false : userToEdit.can_view_financial,
        can_manage_suppliers: isSupplier ? false : userToEdit.can_manage_suppliers,
        can_manage_users: isSupplier ? false : userToEdit.can_manage_users,
        can_view_logs: isSupplier ? false : userToEdit.can_view_logs,
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
        can_view_map: selectedSupplier ? true : false,
        can_manage_sites: false,
        can_manage_machines: false,
        can_register_events: selectedSupplier ? true : false,
        can_approve_events: selectedSupplier ? true : false,
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
      
      // Validar se fornecedor foi selecionado quando role é fornecedor
      if (formData.role === 'fornecedor' && !selectedSupplier) {
        setError('É necessário selecionar uma empresa fornecedora para usuários com perfil Fornecedor')
        setSaving(false)
        return
      }

      const body: any = {
        ...formData,
        role: formData.role,
        supplier_id: formData.role === 'fornecedor' ? selectedSupplier : null,
        // Remover email se for fornecedor (usa email da empresa)
        email: formData.role === 'fornecedor' ? null : formData.email,
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
        setSelectedSupplier(null)
        setFormData({
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
        setEditingUser(null)
        await loadUsers()
        if (activeTab === 'suppliers') {
          loadSuppliers()
        }
      } else {
        setError(data.error || 'Error saving user')
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
        setError(data.error || 'Error saving supplier')
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

  const handleArchiveSupplier = async (supplierId: string) => {
    if (!confirm('Are you sure you want to archive this company? It will not be deleted, but will be hidden from the list.')) {
      return
    }

    try {
      const response = await fetch(`/api/suppliers/${supplierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archived: true,
          currentUserId: user?.id,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        await loadSuppliers(showArchivedSuppliers)
        await loadUsers()
      } else {
        setError(data.error || 'Error archiving supplier')
      }
    } catch (err) {
      console.error('Erro ao arquivar fornecedor:', err)
      setError('Erro ao conectar com o servidor')
    }
  }

  const handleUnarchiveSupplier = async (supplierId: string) => {
    if (!confirm('Are you sure you want to unarchive this company?')) {
      return
    }

    try {
      const response = await fetch(`/api/suppliers/${supplierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archived: false,
          currentUserId: user?.id,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        await loadSuppliers(showArchivedSuppliers)
        await loadUsers()
      } else {
        setError(data.error || 'Error unarchiving supplier')
      }
    } catch (err) {
      console.error('Erro ao desarquivar fornecedor:', err)
      setError('Erro ao conectar com o servidor')
    }
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

  const handleDelete = async () => {
    if (!userToDelete) return

    setDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentUserId: user?.id,
          currentUserRole: user?.role,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setShowDeleteModal(false)
        setUserToDelete(null)
        await loadUsers()
        if (activeTab === 'suppliers') {
          loadSuppliers()
        }
      } else {
        setError(data.error || 'Error deleting user')
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor')
    } finally {
      setDeleting(false)
    }
  }

  const toggleSupplierExpansion = (supplierId: string) => {
    setExpandedSuppliers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(supplierId)) {
        newSet.delete(supplierId)
      } else {
        newSet.add(supplierId)
      }
      return newSet
    })
  }

  const filteredUsers = users.filter(u => {
    // Mostrar apenas usuários internos (sem supplier_id) na aba users
    if (u.supplier_id && u.supplier_id !== null) return false
    
    if (showOnlyPending && u.validado) return false
    if (searchQuery.trim() && !u.nome.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const pendingCount = users.filter(u => !u.validado && u.role !== 'fornecedor').length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-gray-400"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen md:h-screen md:max-h-screen bg-gray-50 dark:bg-gray-900 pb-safe-content md:pb-0 md:flex md:flex-col md:overflow-hidden">
      <Header title="Pessoas" />
      <div className="flex md:flex-1 md:overflow-hidden">
        <Sidebar />
        <main className={`flex-1 p-4 md:p-6 md:overflow-hidden md:flex md:flex-col transition-all duration-250 ease-in-out ${isExpanded ? 'md:ml-48 lg:ml-64' : 'md:ml-16 lg:ml-20'}`}>
          <div className="max-w-7xl mx-auto md:flex md:flex-col md:flex-1 md:overflow-hidden md:w-full">
            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4 flex-shrink-0 overflow-hidden">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('users')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                    activeTab === 'users'
                      ? 'text-blue-600 dark:text-gray-300'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  Funcionários
                  {activeTab === 'users' && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-0.5 bg-blue-600 dark:bg-gray-400 rounded-t-full"></div>
                  )}
                </button>
                <button
                  onClick={() => {
                    setActiveTab('suppliers')
                    loadSuppliers()
                  }}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                    activeTab === 'suppliers'
                      ? 'text-blue-600 dark:text-gray-300'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  Fornecedores
                  {activeTab === 'suppliers' && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-0.5 bg-blue-600 dark:bg-gray-400 rounded-t-full"></div>
                  )}
                </button>
              </div>
            </div>

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 gap-2">
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
                    Nenhum funcionário encontrado.
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
                            <button
                              onClick={() => {
                                setUserToDelete(u)
                                setShowDeleteModal(true)
                                setError('')
                              }}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              title="Deletar"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 gap-2">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate min-w-0 flex-1">
                    {showArchivedSuppliers ? 'Fornecedores Arquivados' : 'Fornecedores'} ({suppliers.length})
                  </h2>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        const newShowArchived = !showArchivedSuppliers
                        setShowArchivedSuppliers(newShowArchived)
                        loadSuppliers(newShowArchived)
                        loadUsers()
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        showArchivedSuppliers
                          ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
                          : 'text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title={showArchivedSuppliers ? 'Mostrar ativos' : 'Mostrar arquivados'}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        loadSuppliers(showArchivedSuppliers)
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
                    {!showArchivedSuppliers && (
                      <button 
                        onClick={() => handleOpenSupplierModal()}
                        className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Nova Empresa"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    )}
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
                      // Filtrar apenas usuários que têm supplier_id não nulo e que corresponde ao fornecedor atual
                      const supplierUsers = users.filter(u => {
                        // Ignorar usuários sem supplier_id (funcionários da Premium)
                        if (!u.supplier_id || u.supplier_id === null) {
                          return false
                        }
                        
                        // Comparar supplier_id do usuário com o id do fornecedor (convertendo para string)
                        return String(u.supplier_id).trim() === String(supplier.id).trim()
                      })
                      return (
                        <div key={supplier.id} className="p-4">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-2">
                            {/* Mobile: Todo o bloco de informações com botões ao lado */}
                            <div className="flex items-start justify-between gap-3 md:hidden">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                {(() => {
                                  const supplierIcon = getSupplierIcon(supplier.supplier_type || 'rental')
                                  return (
                                    <div className={`w-10 h-10 rounded-lg ${supplierIcon.bgColor} flex items-center justify-center flex-shrink-0 ${supplierIcon.textColor}`}>
                                      {supplierIcon.icon}
                                    </div>
                                  )
                                })()}
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-gray-900 dark:text-white truncate">{supplier.nome}</p>
                                  {/* Informações detalhadas (email, telefone, tipo) */}
                                  <div className="space-y-1 mt-1">
                                    {supplier.email && (
                                      <p className="text-sm text-gray-500 dark:text-gray-400 break-words">{supplier.email}</p>
                                    )}
                                    <p className="text-sm text-gray-500 dark:text-gray-400 break-words">
                                      {supplier.telefone || 'Sem telefone'}
                                    </p>
                                    {supplier.supplier_type && (
                                      <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {supplier.supplier_type === 'rental' ? 'Aluguel de Máquinas' : supplier.supplier_type === 'maintenance' ? 'Manutenção' : 'Alocação e Manutenção'}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {/* Botões editar e arquivar empilhados verticalmente */}
                              <div className="flex flex-col gap-2 flex-shrink-0">
                                <button
                                  onClick={() => handleOpenSupplierModal(supplier)}
                                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                  title="Editar empresa"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                {showArchivedSuppliers ? (
                                  <button
                                    onClick={() => handleUnarchiveSupplier(supplier.id)}
                                    className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                    title="Desarquivar empresa"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleArchiveSupplier(supplier.id)}
                                    className="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
                                    title="Arquivar empresa"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Desktop: Informações do fornecedor */}
                            <div className="hidden md:flex items-center gap-3 flex-1 min-w-0">
                              {(() => {
                                const supplierIcon = getSupplierIcon(supplier.supplier_type || 'rental')
                                return (
                                  <div className={`w-10 h-10 rounded-lg ${supplierIcon.bgColor} flex items-center justify-center flex-shrink-0 ${supplierIcon.textColor}`}>
                                    {supplierIcon.icon}
                                  </div>
                                )
                              })()}
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-gray-900 dark:text-white truncate">{supplier.nome}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 break-words">
                                  {supplier.email && `${supplier.email} • `}
                                  {supplier.telefone || 'Sem telefone'}
                                  {supplier.supplier_type && ` • ${supplier.supplier_type === 'rental' ? 'Aluguel' : supplier.supplier_type === 'maintenance' ? 'Manutenção' : 'Alocação e Manutenção'}`}
                                </p>
                              </div>
                            </div>

                            {/* Mobile: Container de usuários abaixo */}
                            <div className="md:hidden">
                              <div className="flex items-center justify-evenly px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg">
                                {/* Bonequinho com número de usuários */}
                                <div className="flex items-center gap-1.5">
                                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    {supplierUsers.length}
                                  </span>
                                </div>
                                {/* Botão de adicionar usuário */}
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
                                  className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                                  title="Adicionar usuário"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                </button>
                                {/* Botão de expandir/colapsar */}
                                <button
                                  onClick={() => toggleSupplierExpansion(supplier.id)}
                                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                  title={expandedSuppliers.has(supplier.id) ? 'Ocultar usuários' : 'Mostrar usuários'}
                                >
                                  <svg 
                                    className={`w-5 h-5 transition-transform ${expandedSuppliers.has(supplier.id) ? 'rotate-180' : ''}`}
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </div>
                            </div>

                            {/* Desktop: Botões de ação */}
                            <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                              {/* Container compacto de usuários */}
                              <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg">
                                {/* Bonequinho com número de usuários */}
                                <div className="flex items-center gap-1">
                                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    {supplierUsers.length}
                                  </span>
                                </div>
                                {/* Botão de adicionar usuário */}
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
                                  className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                                  title="Adicionar usuário"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                </button>
                                {/* Botão de expandir/colapsar */}
                                <button
                                  onClick={() => toggleSupplierExpansion(supplier.id)}
                                  className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                  title={expandedSuppliers.has(supplier.id) ? 'Ocultar usuários' : 'Mostrar usuários'}
                                >
                                  <svg 
                                    className={`w-4 h-4 transition-transform ${expandedSuppliers.has(supplier.id) ? 'rotate-180' : ''}`}
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </div>
                              <button
                                onClick={() => handleOpenSupplierModal(supplier)}
                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                title="Editar empresa"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              {showArchivedSuppliers ? (
                                <button
                                  onClick={() => handleUnarchiveSupplier(supplier.id)}
                                  className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                  title="Desarquivar empresa"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleArchiveSupplier(supplier.id)}
                                  className="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
                                  title="Arquivar empresa"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                          {/* Lista expandida de usuários */}
                          {expandedSuppliers.has(supplier.id) && supplierUsers.length > 0 && (
                            <div className="mt-3 space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
                              {supplierUsers.map((u) => (
                                <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg gap-2">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="text-gray-600 dark:text-gray-400 flex-shrink-0">
                                      {getRoleIcon(u.role)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.nome}</p>
                                      {!u.validado && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                          <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
                                            Pendente
                                          </span>
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {!u.validado && (
                                      <button
                                        onClick={() => handleValidate(u)}
                                        className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                        title="Validar"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleOpenModal(u)}
                                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                      title="Editar"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setUserToDelete(u)
                                        setShowDeleteModal(true)
                                        setError('')
                                      }}
                                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                      title="Deletar"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {expandedSuppliers.has(supplier.id) && supplierUsers.length === 0 && (
                            <div className="mt-3 p-3 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3">
                              Nenhum usuário cadastrado para esta empresa
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Cabeçalho com borda */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between">
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
            </div>

            {/* Conteúdo */}
            <div className="p-6 flex-1 overflow-y-auto">
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
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, telefone: formatUSPhone(e.target.value) })}
                  placeholder="+1 (555) 123-4567"
                />
                <CustomDropdown
                  label="Tipo de Fornecedor"
                  value={supplierFormData.supplier_type}
                  onChange={(value) => setSupplierFormData({ ...supplierFormData, supplier_type: value as 'rental' | 'maintenance' | 'both' })}
                  options={[
                    { value: 'rental', label: 'Aluguel de Máquinas' },
                    { value: 'maintenance', label: 'Manutenção' },
                    { value: 'both', label: 'Alocação e Manutenção' },
                  ]}
                />

              </form>
            </div>

            {/* Rodapé com borda */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex gap-3">
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
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Cabeçalho com borda */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between">
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
            </div>

            {/* Conteúdo */}
            <div className="p-6 flex-1 overflow-y-auto">
              <form onSubmit={handleSave} className="space-y-4">
                <CustomInput
                  label={formData.role === 'fornecedor' ? 'Primeiro Nome' : 'Nome'}
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
                {formData.role !== 'fornecedor' && (
                  <CustomInput
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                )}
                {formData.role === 'fornecedor' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    O email será o da empresa fornecedora selecionada abaixo.
                  </p>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {editingUser ? 'Novo PIN (deixe vazio para manter)' : 'PIN (6 dígitos)'}
                  </label>
                  {!editingUser ? (
                    <PinInput
                      length={6}
                      onComplete={(pin) => setFormData({ ...formData, pin })}
                      disabled={false}
                    />
                  ) : (
                    <div>
                      <PinInput
                        length={6}
                        onComplete={(pin) => setFormData({ ...formData, pin })}
                        disabled={false}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Deixe vazio para manter o PIN atual
                      </p>
                    </div>
                  )}
                </div>
                <CustomDropdown
                  label="Perfil"
                  value={formData.role}
                  onChange={(value) => {
                    const isSupplier = value === 'fornecedor'
                    setFormData({ 
                      ...formData, 
                      role: value,
                      // Ajustar permissões automaticamente para fornecedores
                      can_view_dashboard: isSupplier ? false : formData.can_view_dashboard,
                      can_view_map: isSupplier ? true : formData.can_view_map,
                      can_manage_sites: isSupplier ? false : formData.can_manage_sites,
                      can_manage_machines: isSupplier ? false : formData.can_manage_machines,
                      can_register_events: isSupplier ? true : formData.can_register_events,
                      can_approve_events: isSupplier ? true : formData.can_approve_events,
                      can_view_financial: isSupplier ? false : formData.can_view_financial,
                      can_manage_suppliers: isSupplier ? false : formData.can_manage_suppliers,
                      can_manage_users: isSupplier ? false : formData.can_manage_users,
                      can_view_logs: isSupplier ? false : formData.can_view_logs,
                    })
                    if (!isSupplier) {
                      setSelectedSupplier(null)
                    }
                  }}
                  options={[
                    { value: 'operador', label: 'Operador' },
                    { value: 'admin', label: 'Administrador' },
                    { value: 'fornecedor', label: 'Fornecedor' },
                  ]}
                />
                {formData.role === 'fornecedor' && (
                  <CustomDropdown
                    label="Empresa Fornecedora"
                    value={selectedSupplier || ''}
                    onChange={(value) => setSelectedSupplier(value || null)}
                    options={[
                      { value: '', label: 'Selecione uma empresa' },
                      ...suppliers.map(s => ({ value: s.id, label: s.nome }))
                    ]}
                    required={formData.role === 'fornecedor'}
                  />
                )}
                {selectedSupplier && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Usuários fornecedores têm acesso ao mapa com demandas da empresa e podem registrar/aprovar eventos relacionados à empresa.
                  </p>
                )}

                {/* Permissões */}
                {formData.role !== 'fornecedor' && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Permissões</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'can_view_dashboard', label: 'Dashboard' },
                        { key: 'can_view_map', label: 'Mapa' },
                        { key: 'can_manage_sites', label: 'Jobsites' },
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
                )}

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                    {error}
                  </div>
                )}

                {/* Rodapé com borda - dentro do form */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <div className="flex gap-3">
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
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Salvando...' : editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Deleção */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md flex flex-col">
            {/* Cabeçalho com borda */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Confirmar Exclusão
                </h2>
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setUserToDelete(null)
                    setError('')
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-6 flex-1">
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}
              <p className="text-gray-700 dark:text-gray-300">
                Are you sure you want to delete the user <span className="font-semibold">{userToDelete.nome}</span>?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Esta ação não pode ser desfeita.
              </p>
            </div>

            {/* Rodapé com borda */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setUserToDelete(null)
                    setError('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Deletando...' : 'Deletar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

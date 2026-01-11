import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/useSession'

export function useUsersPage() {
  const router = useRouter()
  const { user, loading: sessionLoading } = useSession()
  
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

  const [fixedRole, setFixedRole] = useState<string | undefined>(undefined)
  const [fixedSupplierId, setFixedSupplierId] = useState<string | undefined>(undefined)

  // Auth check
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

  const handleOpenModal = (userToEdit?: any) => {
    // Carregar fornecedores se ainda não foram carregados
    if (suppliers.length === 0) {
      loadSuppliers()
    }
    
    if (userToEdit && userToEdit.id) {
      // Edição de usuário existente
      setEditingUser(userToEdit)
      setFixedRole(undefined)
      setFixedSupplierId(undefined)
      
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
    } else if (userToEdit && !userToEdit.id) {
      // Novo usuário com predefinições (ex: adicionar usuário para um fornecedor específico)
      setEditingUser(null)
      setFixedRole(userToEdit.role)
      setFixedSupplierId(userToEdit.supplier_id)
      
      const isSupplier = userToEdit.role === 'fornecedor'
      setFormData({
        nome: '',
        email: '',
        pin: '',
        role: userToEdit.role,
        can_view_dashboard: false,
        can_view_map: isSupplier ? true : false,
        can_manage_sites: false,
        can_manage_machines: false,
        can_register_events: isSupplier ? true : false,
        can_approve_events: isSupplier ? true : false,
        can_view_financial: false,
        can_manage_suppliers: false,
        can_manage_users: false,
        can_view_logs: false,
        validado: true,
      })
      setSelectedSupplier(userToEdit.supplier_id || null)
    } else {
      // Novo usuário sem predefinições
      setEditingUser(null)
      setFixedRole(undefined)
      setFixedSupplierId(undefined)
      
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
      setSelectedSupplier(null)
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

  return {
    users,
    suppliers,
    loading,
    loadingUsers,
    loadingSuppliers,
    activeTab,
    setActiveTab,
    showModal,
    setShowModal,
    showSupplierModal,
    setShowSupplierModal,
    editingUser,
    setEditingUser,
    editingSupplier,
    setEditingSupplier,
    selectedSupplier,
    setSelectedSupplier,
    formData,
    setFormData,
    saving,
    setSaving,
    savingSupplier,
    setSavingSupplier,
    error,
    setError,
    userToDelete,
    setUserToDelete,
    showDeleteModal,
    setShowDeleteModal,
    deleting,
    expandedSuppliers,
    showArchivedSuppliers,
    setShowArchivedSuppliers,
    supplierFormData,
    setSupplierFormData,
    loadUsers,
    loadSuppliers,
    handleOpenModal,
    handleSave,
    handleSaveSupplier,
    handleOpenSupplierModal,
    handleArchiveSupplier,
    handleUnarchiveSupplier,
    handleValidate,
    handleDelete,
    toggleSupplierExpansion,
    fixedRole,
    fixedSupplierId,
  }
}

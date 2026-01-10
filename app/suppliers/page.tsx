'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '../components/Header'
import BottomNavigation from '../components/BottomNavigation'
import Sidebar from '../components/Sidebar'
import CustomInput from '../components/CustomInput'
import { useSession } from '@/lib/useSession'
import { useSidebar } from '@/lib/useSidebar'

interface Supplier {
  id: string
  nome: string
  cnpj: string | null
  email: string | null
  telefone: string | null
  endereco: string | null
  contato_nome: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export default function SuppliersPage() {
  const router = useRouter()
  const { user, loading: sessionLoading } = useSession()
  const { isExpanded } = useSidebar()
  const [loading, setLoading] = useState(true)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    contato_nome: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadSuppliers = useCallback(async () => {
    setLoadingSuppliers(true)
    try {
      const response = await fetch('/api/suppliers')
      const data = await response.json()

      if (response.ok && data.success) {
        setSuppliers(data.suppliers || [])
      } else {
        console.error('Erro ao carregar fornecedores:', data.error)
      }
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error)
    } finally {
      setLoadingSuppliers(false)
    }
  }, [])

  useEffect(() => {
    if (sessionLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    if (!user.can_manage_suppliers && user.role !== 'admin' && user.role !== 'dev') {
      router.push('/dashboard')
      return
    }

    loadSuppliers()
    setLoading(false)
  }, [user, sessionLoading, router, loadSuppliers])

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier)
      setFormData({
        nome: supplier.nome,
        cnpj: supplier.cnpj || '',
        email: supplier.email || '',
        telefone: supplier.telefone || '',
        endereco: supplier.endereco || '',
        contato_nome: supplier.contato_nome || '',
      })
    } else {
      setEditingSupplier(null)
      setFormData({
        nome: '',
        cnpj: '',
        email: '',
        telefone: '',
        endereco: '',
        contato_nome: '',
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
      const url = editingSupplier 
        ? `/api/suppliers/${editingSupplier.id}` 
        : '/api/suppliers'
      
      const response = await fetch(url, {
        method: editingSupplier ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          currentUserId: user?.id,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setShowModal(false)
        loadSuppliers()
      } else {
        setError(data.error || 'Erro ao salvar fornecedor')
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (supplier: Supplier) => {
    try {
      const response = await fetch(`/api/suppliers/${supplier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...supplier,
          ativo: !supplier.ativo,
          currentUserId: user?.id,
        }),
      })

      if (response.ok) {
        loadSuppliers()
      }
    } catch (err) {
      console.error('Erro ao atualizar fornecedor:', err)
    }
  }

  const filteredSuppliers = suppliers.filter(s =>
    s.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.cnpj?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-gray-400"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen md:h-screen md:max-h-screen bg-gray-50 dark:bg-gray-900 pb-safe-content md:pb-0 md:flex md:flex-col md:overflow-hidden">
      <Header title="Fornecedores" />
      <div className="flex md:flex-1 md:overflow-hidden">
        <Sidebar />
        <main className={`flex-1 p-4 md:p-6 md:overflow-hidden md:flex md:flex-col transition-all duration-250 ease-in-out ${isExpanded ? 'md:ml-48 lg:ml-64' : 'md:ml-16 lg:ml-20'}`}>
          <div className="max-w-7xl mx-auto md:flex md:flex-col md:flex-1 md:overflow-hidden md:w-full">
            {/* Search Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 flex-shrink-0">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <CustomInput
                    type="text"
                    placeholder="Buscar fornecedor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => handleOpenModal()}
                  className="px-4 py-2 bg-blue-600 dark:bg-gray-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden md:inline">Novo Fornecedor</span>
                </button>
              </div>
            </div>

            {/* Suppliers List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Fornecedores ({filteredSuppliers.length})
                </h2>
                <button
                  onClick={loadSuppliers}
                  className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  disabled={loadingSuppliers}
                  title="Atualizar"
                >
                  <svg className={`w-5 h-5 ${loadingSuppliers ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>

              {loadingSuppliers ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-gray-400"></div>
                </div>
              ) : filteredSuppliers.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    {suppliers.length === 0 ? 'Nenhum fornecedor cadastrado.' : 'Nenhum fornecedor encontrado.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700 md:flex-1 md:overflow-y-auto">
                  {filteredSuppliers.map((supplier) => (
                    <div
                      key={supplier.id}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${supplier.ativo ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <p className="font-medium text-gray-900 dark:text-white">{supplier.nome}</p>
                          </div>
                          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 space-y-1">
                            {supplier.cnpj && <p>CNPJ: {supplier.cnpj}</p>}
                            {supplier.email && <p>{supplier.email}</p>}
                            {supplier.telefone && <p>{supplier.telefone}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenModal(supplier)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleToggleActive(supplier)}
                            className={`p-2 rounded-lg transition-colors ${
                              supplier.ativo 
                                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30'
                                : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
                            }`}
                            title={supplier.ativo ? 'Desativar' : 'Ativar'}
                          >
                            {supplier.ativo ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <BottomNavigation />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
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
                  label="CNPJ"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                />
                <CustomInput
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <CustomInput
                  label="Telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
                <CustomInput
                  label="Endereço"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                />
                <CustomInput
                  label="Nome do Contato"
                  value={formData.contato_nome}
                  onChange={(e) => setFormData({ ...formData, contato_nome: e.target.value })}
                />

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

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '../components/Header'
import BottomNavigation from '../components/BottomNavigation'
import Sidebar from '../components/Sidebar'
import CustomInput from '../components/CustomInput'
import CustomDropdown from '../components/CustomDropdown'
import { useSession } from '@/lib/useSession'
import { useSidebar } from '@/lib/useSidebar'
import { 
  MACHINE_STATUS_LABELS, 
  OWNERSHIP_TYPE_LABELS,
  BILLING_TYPE_LABELS 
} from '@/lib/permissions'

interface Machine {
  id: string
  unit_number: string
  machine_type: { id: string; nome: string }
  ownership_type: 'owned' | 'rented'
  supplier?: { id: string; nome: string }
  current_site?: { id: string; title: string }
  status: string
  ativo: boolean
}

export default function MachinesPage() {
  const router = useRouter()
  const { user, loading: sessionLoading } = useSession()
  const { isExpanded } = useSidebar()
  const [loading, setLoading] = useState(true)
  const [loadingMachines, setLoadingMachines] = useState(false)
  const [machines, setMachines] = useState<Machine[]>([])
  const [machineTypes, setMachineTypes] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterOwnership, setFilterOwnership] = useState<string>('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newMachine, setNewMachine] = useState({
    unit_number: '',
    machine_type_id: '',
    ownership_type: 'owned' as 'owned' | 'rented',
    supplier_id: '',
    billing_type: 'daily' as 'daily' | 'weekly' | 'monthly',
    daily_rate: '',
    weekly_rate: '',
    monthly_rate: '',
  })

  const loadMachines = useCallback(async () => {
    setLoadingMachines(true)
    try {
      const response = await fetch('/api/machines')
      const data = await response.json()

      if (data.success) {
        setMachines(data.machines)
      }
    } catch (error) {
      console.error('Error loading machines:', error)
    } finally {
      setLoadingMachines(false)
      setLoading(false)
    }
  }, [])

  const loadMachineTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/machine-types')
      const data = await response.json()
      if (data.success) {
        setMachineTypes(data.machineTypes)
      }
    } catch (error) {
      console.error('Error loading machine types:', error)
    }
  }, [])

  const loadSuppliers = useCallback(async () => {
    try {
      const response = await fetch('/api/suppliers')
      const data = await response.json()
      if (data.success) {
        setSuppliers(data.suppliers)
      }
    } catch (error) {
      console.error('Error loading suppliers:', error)
    }
  }, [])

  useEffect(() => {
    if (sessionLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    if (!user.can_manage_machines && user.role !== 'admin' && user.role !== 'dev') {
      router.push('/dashboard')
      return
    }

    loadMachines()
    loadMachineTypes()
    loadSuppliers()
  }, [user, sessionLoading, router, loadMachines, loadMachineTypes, loadSuppliers])

  const handleCreateMachine = async () => {
    if (!newMachine.unit_number || !newMachine.machine_type_id) {
      alert('Preencha os campos obrigatórios')
      return
    }

    if (newMachine.ownership_type === 'rented' && !newMachine.supplier_id) {
      alert('Selecione um fornecedor para máquina alugada')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMachine,
          daily_rate: newMachine.daily_rate ? parseFloat(newMachine.daily_rate) : null,
          weekly_rate: newMachine.weekly_rate ? parseFloat(newMachine.weekly_rate) : null,
          monthly_rate: newMachine.monthly_rate ? parseFloat(newMachine.monthly_rate) : null,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setShowCreateModal(false)
        setNewMachine({
          unit_number: '',
          machine_type_id: '',
          ownership_type: 'owned',
          supplier_id: '',
          billing_type: 'daily',
          daily_rate: '',
          weekly_rate: '',
          monthly_rate: '',
        })
        loadMachines()
      } else {
        alert(data.message || 'Erro ao criar máquina')
      }
    } catch (error) {
      console.error('Error creating machine:', error)
    } finally {
      setCreating(false)
    }
  }

  const filteredMachines = machines.filter(machine => {
    const matchesSearch = 
      machine.unit_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      machine.machine_type?.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      machine.current_site?.title.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = !filterStatus || machine.status === filterStatus
    const matchesOwnership = !filterOwnership || machine.ownership_type === filterOwnership

    return matchesSearch && matchesStatus && matchesOwnership
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-gray-400"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen md:h-screen md:max-h-screen bg-gray-50 dark:bg-gray-900 pb-safe-content md:pb-0 md:flex md:flex-col md:overflow-hidden">
      <Header title="Máquinas" />
      <div className="flex md:flex-1 md:overflow-hidden">
        <Sidebar />
        <main className={`flex-1 p-4 md:p-6 md:overflow-hidden md:flex md:flex-col transition-all duration-250 ease-in-out ${isExpanded ? 'md:ml-48 lg:ml-64' : 'md:ml-16 lg:ml-20'}`}>
          <div className="max-w-7xl mx-auto md:flex md:flex-col md:flex-1 md:overflow-hidden md:w-full">
            {/* Search Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 flex-shrink-0">
              <div className="flex gap-2 items-end flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <CustomInput
                    type="text"
                    placeholder="Buscar máquinas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <CustomDropdown
                  value={filterStatus}
                  onChange={(value) => setFilterStatus(value)}
                  options={[
                    { value: '', label: 'Todos Status' },
                    ...Object.entries(MACHINE_STATUS_LABELS).map(([value, label]) => ({
                      value,
                      label: label as string
                    }))
                  ]}
                />
                <CustomDropdown
                  value={filterOwnership}
                  onChange={(value) => setFilterOwnership(value)}
                  options={[
                    { value: '', label: 'Todas' },
                    ...Object.entries(OWNERSHIP_TYPE_LABELS).map(([value, label]) => ({
                      value,
                      label: label as string
                    }))
                  ]}
                />
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Nova Máquina"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Machines List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Máquinas ({filteredMachines.length})
                </h2>
                <button
                  onClick={loadMachines}
                  className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  disabled={loadingMachines}
                  title="Atualizar"
                >
                  <svg className={`w-5 h-5 ${loadingMachines ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>

              {loadingMachines ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-gray-400"></div>
                </div>
              ) : filteredMachines.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchQuery ? 'Nenhuma máquina encontrada' : 'Nenhuma máquina cadastrada'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700 md:flex-1 md:overflow-y-auto">
                  {filteredMachines.map((machine) => (
                    <div
                      key={machine.id}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => router.push(`/machines/${machine.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 dark:text-white">{machine.unit_number}</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              machine.status === 'allocated' ? 'status-allocated' :
                              machine.status === 'available' ? 'status-available' :
                              machine.status === 'maintenance' ? 'status-maintenance' : 'status-inactive'
                            }`}>
                              {MACHINE_STATUS_LABELS[machine.status]}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              machine.ownership_type === 'owned' 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                : 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                            }`}>
                              {OWNERSHIP_TYPE_LABELS[machine.ownership_type]}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {machine.machine_type?.nome}
                          </p>
                          {machine.current_site && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {machine.current_site.title}
                            </p>
                          )}
                          {machine.supplier && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              Fornecedor: {machine.supplier.nome}
                            </p>
                          )}
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
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

      {/* Create Machine Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Nova Máquina</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Número da Unidade *
                </label>
                <input
                  type="text"
                  value={newMachine.unit_number}
                  onChange={(e) => setNewMachine({ ...newMachine, unit_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Ex: EXC-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de Máquina *
                </label>
                <select
                  value={newMachine.machine_type_id}
                  onChange={(e) => setNewMachine({ ...newMachine, machine_type_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Selecione...</option>
                  {machineTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Propriedade
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="owned"
                      checked={newMachine.ownership_type === 'owned'}
                      onChange={(e) => setNewMachine({ 
                        ...newMachine, 
                        ownership_type: e.target.value as 'owned' | 'rented',
                        supplier_id: ''
                      })}
                      className="text-blue-600"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Própria</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="rented"
                      checked={newMachine.ownership_type === 'rented'}
                      onChange={(e) => setNewMachine({ 
                        ...newMachine, 
                        ownership_type: e.target.value as 'owned' | 'rented'
                      })}
                      className="text-blue-600"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Alugada</span>
                  </label>
                </div>
              </div>

              {newMachine.ownership_type === 'rented' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Fornecedor *
                    </label>
                    <select
                      value={newMachine.supplier_id}
                      onChange={(e) => setNewMachine({ ...newMachine, supplier_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Selecione...</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>{supplier.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tipo de Cobrança
                    </label>
                    <select
                      value={newMachine.billing_type}
                      onChange={(e) => setNewMachine({ 
                        ...newMachine, 
                        billing_type: e.target.value as 'daily' | 'weekly' | 'monthly'
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {Object.entries(BILLING_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Diária (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={newMachine.daily_rate}
                        onChange={(e) => setNewMachine({ ...newMachine, daily_rate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Semanal (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={newMachine.weekly_rate}
                        onChange={(e) => setNewMachine({ ...newMachine, weekly_rate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Mensal (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={newMachine.monthly_rate}
                        onChange={(e) => setNewMachine({ ...newMachine, monthly_rate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-gray-800 flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateMachine}
                disabled={creating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {creating ? 'Criando...' : 'Criar Máquina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

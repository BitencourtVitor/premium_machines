'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/app/components/Header'
import BottomNavigation from '@/app/components/BottomNavigation'
import Sidebar from '@/app/components/Sidebar'
import { useSession } from '@/lib/useSession'
import { useSidebar } from '@/lib/useSidebar'
import { Machine, MachineType } from './types'
import MachinesTab from './components/MachinesTab'
import MachineTypesTab from './components/MachineTypesTab'
import CreateMachineModal from './components/CreateMachineModal'
import CreateMachineTypeModal from './components/CreateMachineTypeModal'

export default function MachinesPage() {
  const router = useRouter()
  const { user, loading: sessionLoading } = useSession()
  const { isExpanded } = useSidebar()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'machines' | 'types'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.get('tab') === 'types' ? 'types' : 'machines'
    }
    return 'machines'
  })

  // Estados para Máquinas
  const [loadingMachines, setLoadingMachines] = useState(false)
  const [machines, setMachines] = useState<Machine[]>([])
  const [machineTypes, setMachineTypes] = useState<MachineType[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null)
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

  // Estados para Tipos de Máquinas
  const [loadingTypes, setLoadingTypes] = useState(false)
  const [types, setTypes] = useState<MachineType[]>([])
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [editingType, setEditingType] = useState<MachineType | null>(null)
  const [creatingType, setCreatingType] = useState(false)
  const [newType, setNewType] = useState({
    nome: '',
    icon: '',
    is_attachment: false,
  })

  const handleExportExcel = () => {
    // TODO: Implementar exportação para Excel
    alert('Excel export will be implemented soon')
  }

  const loadMachines = useCallback(async () => {
    setLoadingMachines(true)
    try {
      const timestamp = Date.now()
      const response = await fetch(`/api/machines?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
        },
      })
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
      const timestamp = Date.now()
      const response = await fetch(`/api/machine-types?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
        },
      })
      const data = await response.json()
      if (data.success) {
        setMachineTypes(data.machineTypes)
      }
    } catch (error) {
      console.error('Error loading machine types:', error)
    }
  }, [])

  const loadTypes = useCallback(async () => {
    setLoadingTypes(true)
    try {
      const timestamp = Date.now()
      const response = await fetch(`/api/machine-types?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
        },
      })
      const data = await response.json()
      if (data.success) {
        setTypes(data.machineTypes)
      }
    } catch (error) {
      console.error('Error loading types:', error)
    } finally {
      setLoadingTypes(false)
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
    if (activeTab === 'types') {
      loadTypes()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionLoading])

  useEffect(() => {
    if (activeTab === 'types' && !loading) {
      loadTypes()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, loading])


  const handleCreateMachine = async () => {
    if (!newMachine.unit_number || !newMachine.machine_type_id) {
      alert('Please fill in the required fields')
      return
    }

    if (newMachine.ownership_type === 'rented' && !newMachine.supplier_id) {
      alert('Select a supplier for rented machine')
      return
    }

    setCreating(true)
    try {
      const url = editingMachine ? `/api/machines/${editingMachine.id}` : '/api/machines'
      const method = editingMachine ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
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
        setEditingMachine(null)
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
        alert(data.message || 'Error saving machine')
      }
    } catch (error) {
      console.error('Error saving machine:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleCreateType = async () => {
    if (!newType.nome || newType.nome.trim() === '') {
      alert('Name is required')
      return
    }

    setCreatingType(true)
    try {
      const url = editingType ? `/api/machine-types/${editingType.id}` : '/api/machine-types'
      const method = editingType ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newType),
      })

      const data = await response.json()

      if (data.success) {
        setShowTypeModal(false)
        setEditingType(null)
        setNewType({
          nome: '',
          icon: '',
          is_attachment: false,
        })
        loadTypes()
        loadMachineTypes() // Atualizar também para o dropdown de máquinas
      } else {
        alert(data.message || 'Error saving type')
      }
    } catch (error) {
      console.error('Error saving type:', error)
      alert('Error connecting to server')
    } finally {
      setCreatingType(false)
    }
  }

  const handleDeleteMachine = async (machine: Machine) => {
    if (!confirm(`Are you sure you want to delete the machine "${machine.unit_number}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/machines?id=${machine.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        loadMachines()
      } else {
        alert(data.message || 'Error deleting machine')
      }
    } catch (error) {
      console.error('Error deleting machine:', error)
      alert('Error connecting to server')
    }
  }

  const handleEditMachine = (machine: Machine) => {
    setEditingMachine(machine)
    setNewMachine({
      unit_number: machine.unit_number,
      machine_type_id: machine.machine_type?.id || '',
      ownership_type: machine.ownership_type,
      supplier_id: machine.supplier?.id || '',
      billing_type: machine.billing_type || 'daily',
      daily_rate: machine.daily_rate || '',
      weekly_rate: machine.weekly_rate || '',
      monthly_rate: machine.monthly_rate || '',
    })
    setShowCreateModal(true)
  }

  const handleDeleteType = async (type: MachineType) => {
    if (!confirm(`Are you sure you want to delete the type "${type.nome}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/machine-types/${type.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        loadTypes()
        loadMachineTypes()
      } else {
        alert(data.message || 'Error deleting type')
      }
    } catch (error) {
      console.error('Error deleting type:', error)
      alert('Error connecting to server')
    }
  }

  const handleEditType = (type: MachineType) => {
    setEditingType(type)
    setNewType({
      nome: type.nome,
      icon: type.icon || '',
      is_attachment: type.is_attachment,
    })
    setShowTypeModal(true)
  }

  // Por enquanto, sem filtros - mostrar todas as máquinas
  const filteredMachines = machines


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
            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4 flex-shrink-0 overflow-hidden">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('machines')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                    activeTab === 'machines'
                      ? 'text-blue-600 dark:text-gray-300'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  Máquinas
                  {activeTab === 'machines' && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-0.5 bg-blue-600 dark:bg-gray-400 rounded-t-full"></div>
                  )}
                </button>
                <button
                  onClick={() => {
                    setActiveTab('types')
                    loadTypes()
                  }}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                    activeTab === 'types'
                      ? 'text-blue-600 dark:text-gray-300'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  Tipos de Máquinas
                  {activeTab === 'types' && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-0.5 bg-blue-600 dark:bg-gray-400 rounded-t-full"></div>
                  )}
                </button>
              </div>
            </div>

            {/* Machines Tab */}
            {activeTab === 'machines' && (
              <MachinesTab
                loadingMachines={loadingMachines}
                loadMachines={loadMachines}
                filteredMachines={filteredMachines}
                setShowCreateModal={setShowCreateModal}
                handleEditMachine={handleEditMachine}
                handleDeleteMachine={handleDeleteMachine}
                handleExportExcel={handleExportExcel}
              />
            )}

            {/* Types Tab */}
            {activeTab === 'types' && (
              <MachineTypesTab
                loadingTypes={loadingTypes}
                loadTypes={loadTypes}
                types={types}
                setShowTypeModal={setShowTypeModal}
                setEditingType={setEditingType}
                setNewType={setNewType}
                handleEditType={handleEditType}
                handleDeleteType={handleDeleteType}
                loadMachineTypes={loadMachineTypes}
              />
            )}
          </div>
        </main>
      </div>

      <BottomNavigation />

      {/* Create Machine Modal */}
      <CreateMachineModal
        showCreateModal={showCreateModal}
        setShowCreateModal={setShowCreateModal}
        editingMachine={editingMachine}
        setEditingMachine={setEditingMachine}
        newMachine={newMachine}
        setNewMachine={setNewMachine}
        handleCreateMachine={handleCreateMachine}
        creating={creating}
        machineTypes={machineTypes}
        suppliers={suppliers}
      />

      {/* Create/Edit Type Modal */}
      <CreateMachineTypeModal
        showTypeModal={showTypeModal}
        setShowTypeModal={setShowTypeModal}
        editingType={editingType}
        setEditingType={setEditingType}
        newType={newType}
        setNewType={setNewType}
        handleCreateType={handleCreateType}
        creatingType={creatingType}
        user={user}
      />
    </div>
  )
}

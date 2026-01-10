'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Header from '../components/Header'
import BottomNavigation from '../components/BottomNavigation'
import Sidebar from '../components/Sidebar'
import ExportDropdown from '../components/ExportDropdown'
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
  billing_type?: 'daily' | 'weekly' | 'monthly'
  daily_rate?: string
  weekly_rate?: string
  monthly_rate?: string
}

interface MachineType {
  id: string
  nome: string
  icon?: string
  is_attachment: boolean
  created_at: string
  updated_at: string
}

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
      <Header title="Machines" />
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
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 gap-2">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Máquinas ({filteredMachines.length})
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={loadMachines}
                      className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      disabled={loadingMachines}
                      title="Atualizar"
                    >
                      <svg className={`w-5 h-5 ${loadingMachines ? 'animate-spin-reverse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Nova Máquina"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    <ExportDropdown onExportExcel={handleExportExcel} />
                  </div>
                </div>

                  {loadingMachines ? (
                    <div className="p-8 text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-gray-400"></div>
                    </div>
                  ) : filteredMachines.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-gray-500 dark:text-gray-400">
                        Nenhuma máquina cadastrada
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700 md:flex-1 md:overflow-y-auto">
                      {filteredMachines.map((machine) => {
                        // Determinar o caminho da imagem baseado no tipo de máquina
                        const getMachineImagePath = () => {
                          if (!machine.machine_type) return null

                          let imageName = ''

                          if (machine.machine_type.nome) {
                            // Converter nome do tipo para slug
                            imageName = machine.machine_type.nome.toLowerCase().replace(/\s+/g, '-')
                          }

                          // Alguns tipos usam JPG ao invés de PNG
                          const jpgTypes = ['fork-extensions', 'man-basket', 'truss-boom']
                          const extension = jpgTypes.includes(imageName) ? '.jpg' : '.png'

                          return imageName ? `/${imageName}${extension}` : null
                        }

                        const machineImagePath = getMachineImagePath()

                        // Cores para status
                        const getStatusColor = () => {
                          switch (machine.status) {
                            case 'available':
                              return 'text-green-600 dark:text-green-400'
                            case 'allocated':
                              return 'text-blue-600 dark:text-blue-400'
                            case 'maintenance':
                              return 'text-yellow-600 dark:text-yellow-400'
                            default:
                              return 'text-gray-600 dark:text-gray-400'
                          }
                        }

                        // Cor para ownership
                        const getOwnershipColor = () => {
                          return machine.ownership_type === 'owned'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-orange-600 dark:text-orange-400'
                        }

                        return (
                          <div
                            key={machine.id}
                            className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {/* Imagem do tipo de máquina */}
                                {machineImagePath && (
                                  <div className="flex-shrink-0 w-12 h-12 relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                                    <img
                                      src={machineImagePath}
                                      alt={machine.machine_type?.nome || 'Máquina'}
                                      className="w-full h-full object-cover rounded-lg"
                                      onError={(e) => {
                                        // Se a imagem não carregar, ocultar o container
                                        const target = e.target as HTMLImageElement
                                        target.style.display = 'none'
                                      }}
                                    />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <p className="font-medium text-gray-900 dark:text-white">{machine.unit_number}</p>
                                    {/* Status com bolinha + texto */}
                                    <div className="flex items-center gap-1.5">
                                      <div className={`w-2 h-2 rounded-full ${
                                        machine.status === 'available' ? 'bg-green-600 dark:bg-green-400' :
                                        machine.status === 'allocated' ? 'bg-blue-600 dark:bg-blue-400' :
                                        machine.status === 'maintenance' ? 'bg-yellow-600 dark:bg-yellow-400' :
                                        'bg-gray-600 dark:bg-gray-400'
                                      }`}></div>
                                      <span className={`text-xs font-medium ${getStatusColor()}`}>
                                        {MACHINE_STATUS_LABELS[machine.status]}
                                      </span>
                                    </div>
                                    {/* Ownership com bolinha + texto */}
                                    <div className="flex items-center gap-1.5">
                                      <div className={`w-2 h-2 rounded-full ${
                                        machine.ownership_type === 'owned'
                                          ? 'bg-green-600 dark:bg-green-400'
                                          : 'bg-orange-600 dark:bg-orange-400'
                                      }`}></div>
                                      <span className={`text-xs font-medium ${getOwnershipColor()}`}>
                                        {OWNERSHIP_TYPE_LABELS[machine.ownership_type]}
                                        {machine.ownership_type === 'rented' && machine.supplier && (
                                          <span className="ml-1">- {machine.supplier.nome}</span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {machine.machine_type?.nome}
                                  </p>
                                  {machine.current_site && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                      {machine.current_site.title}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEditMachine(machine)}
                                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                  title="Editar"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteMachine(machine)}
                                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                  title="Deletar"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
            )}

            {/* Types Tab */}
            {activeTab === 'types' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden flex flex-col max-h-[calc(100vh-300px)] md:max-h-none">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 gap-2">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Tipos de Máquinas ({types.length})
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={loadTypes}
                      className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      disabled={loadingTypes}
                      title="Atualizar"
                    >
                      <svg className={`w-5 h-5 ${loadingTypes ? 'animate-spin-reverse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        setEditingType(null)
                        setNewType({
                          nome: '',
                          icon: '',
                          is_attachment: false,
                        })
                        setShowTypeModal(true)
                      }}
                      className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Novo Tipo"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>

                {loadingTypes ? (
                  <div className="p-8 text-center flex-shrink-0">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-gray-400"></div>
                  </div>
                ) : types.length === 0 ? (
                  <div className="p-8 text-center flex-shrink-0">
                    <p className="text-gray-500 dark:text-gray-400">
                      Nenhum tipo cadastrado
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700 overflow-y-auto flex-1 min-h-0">
                    {types.map((type) => {
                      // Determinar o caminho da imagem baseado no campo icon ou nome
                      const getImagePath = () => {
                        let imageName = ''
                        
                        if (type.icon && type.icon.trim() !== '') {
                          // Se tem icon definido, usar ele (remover extensão se houver)
                          imageName = type.icon.toLowerCase().replace(/\s+/g, '-').replace(/\.(png|jpg|jpeg)$/i, '')
                        } else {
                          // Se não tem icon, usar o nome do tipo convertido para slug
                          imageName = type.nome.toLowerCase().replace(/\s+/g, '-')
                        }

                        // Alguns tipos usam JPG ao invés de PNG
                        const jpgTypes = ['fork-extensions', 'man-basket', 'truss-boom']
                        const extension = jpgTypes.includes(imageName) ? '.jpg' : '.png'

                        return `/${imageName}${extension}`
                      }

                      const imagePath = getImagePath()

                      return (
                        <div
                          key={type.id}
                          className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 flex items-center gap-3">
                              {/* Imagem do tipo de máquina */}
                              <div className="flex-shrink-0 w-12 h-12 relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                                <img
                                  src={imagePath}
                                  alt={type.nome}
                                  className="w-full h-full object-cover rounded-lg"
                                  onError={(e) => {
                                    // Se a imagem não carregar, ocultar o container
                                    const target = e.target as HTMLImageElement
                                    target.style.display = 'none'
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900 dark:text-white">{type.nome}</p>
                                  {type.is_attachment && (
                                    <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                      Attachment
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditType(type)
                                }}
                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteType(type)
                                }}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                title="Deletar"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
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

      {/* Create Machine Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingMachine ? 'Editar Máquina' : 'Nova Máquina'}
              </h2>
              <button
                onClick={() => {
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
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
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

              <CustomDropdown
                label="Tipo de Máquina *"
                value={newMachine.machine_type_id}
                onChange={(value) => setNewMachine({ ...newMachine, machine_type_id: value })}
                options={[
                  { value: '', label: 'Selecione...' },
                  ...machineTypes.map((type) => ({
                    value: type.id,
                    label: type.nome
                  }))
                ]}
                placeholder="Selecione um tipo de máquina"
                required
              />

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
                  <CustomDropdown
                    label="Fornecedor *"
                    value={newMachine.supplier_id}
                    onChange={(value) => setNewMachine({ ...newMachine, supplier_id: value })}
                    options={[
                      { value: '', label: 'Selecione...' },
                      ...suppliers.map((supplier) => ({
                        value: supplier.id,
                        label: supplier.nome
                      }))
                    ]}
                    placeholder="Selecione um fornecedor"
                    required
                  />

                  <CustomDropdown
                    label="Billing Type"
                    value={newMachine.billing_type}
                    onChange={(value) => setNewMachine({
                      ...newMachine,
                      billing_type: value as 'daily' | 'weekly' | 'monthly'
                    })}
                    options={Object.entries(BILLING_TYPE_LABELS).map(([value, label]) => ({
                      value,
                      label: label as string
                    }))}
                    placeholder="Select billing type"
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Daily (USD)
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
                        Weekly (USD)
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
                        Monthly (USD)
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

            <div className="sticky bottom-0 bg-white dark:bg-gray-800 flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
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
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateMachine}
                disabled={creating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {creating ? (editingMachine ? 'Salvando...' : 'Criando...') : (editingMachine ? 'Salvar Alterações' : 'Criar Máquina')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Type Modal */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingType ? 'Editar Tipo de Máquina' : 'Novo Tipo de Máquina'}
              </h2>
              <button
                onClick={() => {
                  setShowTypeModal(false)
                  setEditingType(null)
                  setNewType({
                    nome: '',
                    icon: '',
                    is_attachment: false,
                  })
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={newType.nome}
                  onChange={(e) => setNewType({ ...newType, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Ex: Excavadora, Boomlift, etc."
                />
              </div>

              {user?.role === 'dev' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ícone
                  </label>
                  <input
                    type="text"
                    value={newType.icon}
                    onChange={(e) => setNewType({ ...newType, icon: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Nome do ícone (opcional)"
                  />
                </div>
              )}

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newType.is_attachment}
                    onChange={(e) => setNewType({ ...newType, is_attachment: e.target.checked })}
                    className="text-blue-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    É um Attachment/Extension
                  </span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                  Marque esta opção se este tipo é um acessório/attachment (ex: Bucket, Grapple) ao invés de uma máquina principal
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowTypeModal(false)
                  setEditingType(null)
                  setNewType({
                    nome: '',
                    icon: '',
                    is_attachment: false,
                  })
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateType}
                disabled={creatingType || !newType.nome.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {creatingType ? (editingType ? 'Salvando...' : 'Criando...') : (editingType ? 'Salvar Alterações' : 'Criar Tipo')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

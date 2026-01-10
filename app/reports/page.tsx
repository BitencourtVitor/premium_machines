'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '../components/Header'
import BottomNavigation from '../components/BottomNavigation'
import Sidebar from '../components/Sidebar'
import CustomDropdown from '../components/CustomDropdown'
import CustomInput from '../components/CustomInput'
import { useSession } from '@/lib/useSession'
import { useSidebar } from '@/lib/useSidebar'

interface FinancialSnapshot {
  id: string
  site_id: string
  machine_id: string
  supplier_id: string
  period_start: string
  period_end: string
  total_days: number
  downtime_days: number
  billable_days: number
  daily_rate: number
  estimated_cost: number
  calculated_at: string
  machine?: {
    unit_number: string
    machine_type?: { nome: string }
  }
  site?: {
    title: string
  }
  supplier?: {
    nome: string
  }
}

export default function ReportsPage() {
  const router = useRouter()
  const { user, loading: sessionLoading } = useSession()
  const { isExpanded } = useSidebar()
  const [loading, setLoading] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  
  const [reportType, setReportType] = useState<'period' | 'site' | 'supplier'>('period')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedSite, setSelectedSite] = useState('all')
  const [selectedSupplier, setSelectedSupplier] = useState('all')
  
  const [sites, setSites] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [snapshots, setSnapshots] = useState<FinancialSnapshot[]>([])
  
  const [summaryData, setSummaryData] = useState({
    totalMachines: 0,
    totalDays: 0,
    downtimeDays: 0,
    billableDays: 0,
    totalCost: 0,
  })

  const loadData = useCallback(async () => {
    setLoadingData(true)
    try {
      // Carregar sites
      const sitesResponse = await fetch('/api/sites')
      const sitesData = await sitesResponse.json()
      if (sitesData.success) {
        setSites(sitesData.sites || [])
      }

      // Carregar fornecedores
      const suppliersResponse = await fetch('/api/suppliers')
      const suppliersData = await suppliersResponse.json()
      if (suppliersData.success) {
        setSuppliers(suppliersData.suppliers || [])
      }

      // Carregar snapshots
      const snapshotsResponse = await fetch('/api/reports/snapshots')
      const snapshotsData = await snapshotsResponse.json()
      if (snapshotsData.success) {
        setSnapshots(snapshotsData.snapshots || [])
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    if (sessionLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    if (!user.can_view_financial && user.role !== 'admin' && user.role !== 'dev') {
      router.push('/dashboard')
      return
    }

    loadData()
    setLoading(false)
  }, [user, sessionLoading, router, loadData])

  // Filtrar e calcular resumo
  useEffect(() => {
    let filtered = [...snapshots]

    // Filtrar por período
    if (dateFrom) {
      filtered = filtered.filter(s => new Date(s.period_start) >= new Date(dateFrom))
    }
    if (dateTo) {
      filtered = filtered.filter(s => new Date(s.period_end) <= new Date(dateTo))
    }

    // Filtrar por site
    if (selectedSite !== 'all') {
      filtered = filtered.filter(s => s.site_id === selectedSite)
    }

    // Filtrar por fornecedor
    if (selectedSupplier !== 'all') {
      filtered = filtered.filter(s => s.supplier_id === selectedSupplier)
    }

    // Calcular resumo
    const summary = filtered.reduce((acc, s) => ({
      totalMachines: acc.totalMachines + 1,
      totalDays: acc.totalDays + s.total_days,
      downtimeDays: acc.downtimeDays + s.downtime_days,
      billableDays: acc.billableDays + s.billable_days,
      totalCost: acc.totalCost + s.estimated_cost,
    }), {
      totalMachines: 0,
      totalDays: 0,
      downtimeDays: 0,
      billableDays: 0,
      totalCost: 0,
    })

    setSummaryData(summary)
  }, [snapshots, dateFrom, dateTo, selectedSite, selectedSupplier])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-gray-400"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen md:h-screen md:max-h-screen bg-gray-50 dark:bg-gray-900 pb-safe-content md:pb-0 md:flex md:flex-col md:overflow-hidden">
      <Header title="Relatórios" />
      <div className="flex md:flex-1 md:overflow-hidden">
        <Sidebar />
        <main className={`flex-1 p-4 md:p-6 md:overflow-hidden md:flex md:flex-col transition-all duration-250 ease-in-out ${isExpanded ? 'md:ml-48 lg:ml-64' : 'md:ml-16 lg:ml-20'}`}>
          <div className="max-w-7xl mx-auto md:flex md:flex-col md:flex-1 md:overflow-hidden md:w-full">
            {/* Tipo de Relatório */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4 flex-shrink-0 overflow-hidden">
              <div className="flex">
                <button
                  onClick={() => setReportType('period')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                    reportType === 'period'
                      ? 'text-blue-600 dark:text-gray-300'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  Por Período
                  {reportType === 'period' && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-0.5 bg-blue-600 dark:bg-gray-400 rounded-t-full"></div>
                  )}
                </button>
                <button
                  onClick={() => setReportType('site')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                    reportType === 'site'
                      ? 'text-blue-600 dark:text-gray-300'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  Por Jobsite
                  {reportType === 'site' && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-0.5 bg-blue-600 dark:bg-gray-400 rounded-t-full"></div>
                  )}
                </button>
                <button
                  onClick={() => setReportType('supplier')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                    reportType === 'supplier'
                      ? 'text-blue-600 dark:text-gray-300'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  Por Fornecedor
                  {reportType === 'supplier' && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-0.5 bg-blue-600 dark:bg-gray-400 rounded-t-full"></div>
                  )}
                </button>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 flex-shrink-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <CustomInput
                  label="Data Inicial"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
                <CustomInput
                  label="Data Final"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
                {reportType === 'site' && (
                  <CustomDropdown
                    label="Obra"
                    value={selectedSite}
                    onChange={setSelectedSite}
                    options={[
                      { value: 'all', label: 'Todos os Jobsites' },
                      ...sites.map(s => ({ value: s.id, label: s.title }))
                    ]}
                  />
                )}
                {reportType === 'supplier' && (
                  <CustomDropdown
                    label="Fornecedor"
                    value={selectedSupplier}
                    onChange={setSelectedSupplier}
                    options={[
                      { value: 'all', label: 'Todos os Fornecedores' },
                      ...suppliers.map(s => ({ value: s.id, label: s.nome }))
                    ]}
                  />
                )}
              </div>
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 flex-shrink-0">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Máquinas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summaryData.totalMachines}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Dias</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summaryData.totalDays}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Dias Parados</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {summaryData.downtimeDays}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Dias Cobráveis</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {summaryData.billableDays}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 col-span-2 md:col-span-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">Custo Total</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(summaryData.totalCost)}
                </p>
              </div>
            </div>

            {/* Mensagem quando não há dados */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 gap-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Detalhamento</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadData}
                    className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    disabled={loadingData}
                    title="Atualizar"
                  >
                    <svg className={`w-5 h-5 ${loadingData ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>

              {loadingData ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-gray-400"></div>
                </div>
              ) : snapshots.length === 0 ? (
                <div className="p-8 text-center">
                  <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Nenhum dado financeiro disponível
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Os snapshots financeiros são gerados automaticamente a partir dos eventos de alocação aprovados.
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Registre eventos de alocação e aguarde a aprovação para ver os dados aqui.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700 md:flex-1 md:overflow-y-auto">
                  {snapshots.map((snapshot) => (
                    <div key={snapshot.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {snapshot.machine?.unit_number || 'Máquina'}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {snapshot.site?.title || 'Jobsite'} • {snapshot.supplier?.nome || 'Fornecedor'}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {new Date(snapshot.period_start).toLocaleDateString('en-US')} - {new Date(snapshot.period_end).toLocaleDateString('en-US')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(snapshot.estimated_cost)}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {snapshot.billable_days} dias cobráveis
                          </p>
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
    </div>
  )
}

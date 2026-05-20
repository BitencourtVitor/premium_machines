'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import BottomNavigation from '../components/BottomNavigation'
import BaseList from '../components/BaseList'
import CustomInput from '../components/CustomInput'
import CustomDropdown from '../components/CustomDropdown'
import { useSidebar } from '@/lib/useSidebar'
import { HiCheck, HiChevronLeft, HiChevronRight, HiOutlineCalendarDays } from 'react-icons/hi2'
import { BsFileEarmarkPdf, BsFileEarmarkExcel } from 'react-icons/bs'
import {
  generateAllocationStatusPDF,
  generateMachineHistoryPDF,
  generateRefuelingControlPDF,
  generateMaintenanceTimePDF,
  generateAllocationCreditsPDF,
  generateBackchargesPDF,
  generateEventsBySitePDF
} from '@/lib/reportGenerator'
import {
  generateAllocationStatusExcel,
  generateMachineHistoryExcel,
  generateRefuelingControlExcel,
  generateMaintenanceTimeExcel,
  generateAllocationCreditsExcel,
  generateBackchargesExcel
} from '@/lib/excelGenerator'
import { adjustDateToSystemTimezone, formatDateOnly } from '@/lib/timezone'

// ── Multi-select de obras (portal para evitar overflow cortado) ────────────────
function SiteMultiSelect({
  sites,
  selected,
  onChange,
  loading,
}: {
  sites: { id: string; title: string }[]
  selected: string[]
  onChange: (ids: string[]) => void
  loading: boolean
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })

  useEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const label = loading ? 'Carregando...' :
    selected.length === 0 ? 'Todas as obras' :
    selected.length === 1 ? (sites.find(s => s.id === selected[0])?.title ?? '1 obra') :
    `${selected.length} obras`

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left flex items-center justify-between cursor-pointer"
      >
        <span className="text-sm truncate">{label}</span>
        <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && typeof window !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto py-1"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          <label className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors border-b border-gray-200 dark:border-gray-600">
            <input
              type="checkbox"
              checked={selected.length === 0}
              onChange={() => onChange([])}
              className="w-3.5 h-3.5 rounded accent-blue-600 flex-shrink-0"
            />
            <span className="text-sm font-semibold text-gray-700 dark:text-white">Todas as obras</span>
          </label>
          {sites.map(site => (
            <label key={site.id} className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              <input
                type="checkbox"
                checked={selected.includes(site.id)}
                onChange={() => onChange(
                  selected.includes(site.id)
                    ? selected.filter(id => id !== site.id)
                    : [...selected, site.id]
                )}
                className="w-3.5 h-3.5 rounded accent-blue-600 flex-shrink-0"
              />
              <span className="text-sm text-gray-700 dark:text-white truncate">{site.title}</span>
            </label>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
// ──────────────────────────────────────────────────────────────────────────────

interface ReportItem {
  id: string
  title: string
  subtitle: string
}

interface Equipment {
  id: string
  unit_number: string
  type: 'machine' | 'extension'
  description?: string
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

export default function ReportsPage() {
  const { isExpanded } = useSidebar()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [allPeriod, setAllPeriod] = useState(false)
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('')
  const [equipments, setEquipments] = useState<Equipment[]>([])
  const [loadingEquipments, setLoadingEquipments] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [hasFuelData, setHasFuelData] = useState(false)
  const [checkingFuelData, setCheckingFuelData] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null)
  const [generatingExcel, setGeneratingExcel] = useState<string | null>(null)
  const [providerFilter, setProviderFilter] = useState('all') // 'all', 'owned', 'rented'

  // Backcharges — verificar se há dados no período
  const [hasBackchargeData, setHasBackchargeData] = useState<boolean | null>(null)
  const [checkingBackchargeData, setCheckingBackchargeData] = useState(false)

  // Events by site — lista de obras disponíveis e seleção
  const [availableSites, setAvailableSites] = useState<{ id: string; title: string }[]>([])
  const [loadingSites, setLoadingSites] = useState(false)
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([])

  // Backcharges — checar disponibilidade quando o período muda
  useEffect(() => {
    if (!allPeriod && (!dateFrom || !dateTo)) {
      setHasBackchargeData(null)
      return
    }
    async function checkBackchargeData() {
      setCheckingBackchargeData(true)
      try {
        const q = new URLSearchParams()
        if (allPeriod) q.append('allPeriod', 'true')
        else {
          if (dateFrom) q.append('dateFrom', dateFrom)
          if (dateTo) q.append('dateTo', dateTo)
        }
        const res = await fetch(`/api/reports/backcharges?${q.toString()}`, { cache: 'no-store' })
        const data = await res.json()
        setHasBackchargeData(data.success && (data.backcharges?.length ?? 0) > 0)
      } catch { setHasBackchargeData(null) }
      finally { setCheckingBackchargeData(false) }
    }
    checkBackchargeData()
  }, [dateFrom, dateTo, allPeriod])

  // Events by site — buscar obras disponíveis
  useEffect(() => {
    async function fetchSites() {
      setLoadingSites(true)
      try {
        const res = await fetch('/api/sites')
        const data = await res.json()
        const sites = (data.sites || [])
          .map((s: any) => ({ id: s.id, title: s.title }))
          .sort((a: any, b: any) => a.title.localeCompare(b.title))
        setAvailableSites(sites)
      } catch {} finally { setLoadingSites(false) }
    }
    fetchSites()
  }, [])

  // Persist week offset
  useEffect(() => {
    const saved = localStorage.getItem('reports_week_offset')
    if (saved) setWeekOffset(parseInt(saved, 10))
  }, [])

  useEffect(() => {
    localStorage.setItem('reports_week_offset', weekOffset.toString())
  }, [weekOffset])

  const weekRange = useMemo(() => {
    const today = new Date()
    const day = today.getDay()
    const diffToMonday = (day + 6) % 7
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - diffToMonday + (weekOffset * 7))
    const sunday = new Date(monday.getTime() + 6 * ONE_DAY_MS)
    
    const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0)
    const end = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), 23, 59, 59)
    
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      labelStart: monday,
      labelEnd: sunday
    }
  }, [weekOffset])

  const formatWeekRange = (start: Date, end: Date) => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${start.toLocaleDateString('pt-BR', options)} - ${end.toLocaleDateString('pt-BR', options)}`
  }

  // Check if there is fuel data for the selected week
  useEffect(() => {
    async function checkFuelData() {
      setCheckingFuelData(true)
      try {
        const res = await fetch(`/api/events?event_type=refueling&start_date=${weekRange.start}&end_date=${weekRange.end}&limit=1`)
        const data = await res.json()
        setHasFuelData(data.success && data.events && data.events.length > 0)
      } catch (error) {
        console.error('Error checking fuel data:', error)
        setHasFuelData(false)
      } finally {
        setCheckingFuelData(false)
      }
    }

    checkFuelData()
  }, [weekRange])

  useEffect(() => {
    async function fetchEquipments() {
      setLoadingEquipments(true)
      try {
        const [machinesRes, extensionsRes] = await Promise.all([
          fetch('/api/machines'),
          fetch('/api/extensions')
        ])
        
        const machinesData = await machinesRes.json()
        const extensionsData = await extensionsRes.json()

        const allEquipmentsMap = new Map<string, Equipment>()

        // Process machines first
        ;(machinesData.machines || []).forEach((m: any) => {
          const isExtension = m.machine_type?.is_attachment
          allEquipmentsMap.set(m.id, {
            id: m.id,
            unit_number: m.unit_number,
            type: isExtension ? 'extension' : 'machine',
            description: isExtension ? 'Extensão' : 'Máquina'
          })
        })

        // Process extensions (might override if same ID, which is fine as we prefer extension info)
        ;(extensionsData.extensions || []).forEach((e: any) => {
          allEquipmentsMap.set(e.id, {
            id: e.id,
            unit_number: e.unit_number,
            type: 'extension',
            description: 'Extensão'
          })
        })

        const combined = Array.from(allEquipmentsMap.values())
        setEquipments(combined.sort((a, b) => 
          a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true, sensitivity: 'base' })
        ))
      } catch (error) {
        console.error('Error fetching equipments:', error)
      } finally {
        setLoadingEquipments(false)
      }
    }

    fetchEquipments()
  }, [])

  const reports: ReportItem[] = [
    {
      id: 'alocacoes',
      title: 'Status das Alocações',
      subtitle: 'Quais máquinas estão alocadas, aonde estão e qual a condição de cada uma',
    },
    {
      id: 'historico',
      title: 'Histórico do Equipamento',
      subtitle: 'Tudo o que aconteceu com a máquina ou extensão escolhida',
    },
    {
      id: 'abastecimento',
      title: 'Controle de Abastecimento',
      subtitle: 'Para o intervalo selecionado, o que estava planejado, o que foi executado, onde, quando e com qual máquina',
    },
    {
      id: 'manutencao',
      title: 'Tempo de Manutenção',
      subtitle: 'Mapeamento completo de todos os eventos de manutenção no período selecionado',
    },
    {
      id: 'allocation-credits',
      title: 'Créditos de alocação',
      subtitle: 'Créditos (dias) gerados por alocações finalizadas, agrupados por fornecedor',
    },
    {
      id: 'backcharges',
      title: 'Backcharges',
      subtitle: 'Lista de cobranças retroativas registradas no período selecionado',
    },
    {
      id: 'events-by-site',
      title: 'Eventos por Obra',
      subtitle: 'Histórico completo de todos os eventos agrupados por obra no período',
    },
  ]

  const isReportReady = (reportId: string) => {
    if (reportId === 'allocation-credits') return true
    if (reportId === 'historico') return !!selectedEquipmentId
    if (reportId === 'abastecimento') return true
    if (reportId === 'alocacoes') return allPeriod || (!!dateFrom && !!dateTo)
    if (reportId === 'manutencao') {
      const periodSelected = allPeriod || (!!dateFrom && !!dateTo)
      if (!periodSelected) return false
      return !!providerFilter
    }
    if (reportId === 'backcharges') {
      if (!(allPeriod || (!!dateFrom && !!dateTo))) return false
      if (checkingBackchargeData) return false
      return hasBackchargeData === true
    }
    if (reportId === 'events-by-site') return allPeriod || (!!dateFrom && !!dateTo)
    return false
  }

  const handleGeneratePDF = async (reportId: string) => {
    if (!isReportReady(reportId)) return

    setGeneratingPDF(reportId)
    try {
      if (reportId === 'alocacoes') {
        const queryParams = new URLSearchParams()
        if (allPeriod) {
          queryParams.append('allPeriod', 'true')
        } else if (dateTo) {
          queryParams.append('dateTo', dateTo)
        }
        if (providerFilter !== 'all') {
          queryParams.append('provider', providerFilter)
        }

        const res = await fetch(`/api/reports/allocations?${queryParams.toString()}`, { cache: 'no-store' })
        const data = await res.json()

        if (data.success) {
          const periodLabel = allPeriod 
            ? 'Atualmente' 
            : `Até ${formatDateOnly(dateTo)}`
          await generateAllocationStatusPDF(data.allocations, periodLabel)
        } else {
          alert('Erro ao gerar relatório: ' + data.message)
        }
      } else if (reportId === 'historico') {
        const queryParams = new URLSearchParams({
          machineId: selectedEquipmentId,
          allPeriod: allPeriod.toString()
        })
        if (!allPeriod) {
          if (dateFrom) queryParams.append('dateFrom', dateFrom)
          if (dateTo) queryParams.append('dateTo', dateTo)
        }

        const res = await fetch(`/api/reports/machine-history?${queryParams.toString()}`, { cache: 'no-store' })
        const data = await res.json()

        if (data.success) {
          const periodLabel = allPeriod ? 'Atualmente' : `${dateFrom ? `De ${formatDateOnly(dateFrom)} ` : ''}Até ${formatDateOnly(dateTo)}`
          await generateMachineHistoryPDF(data.machine, data.events, periodLabel)
        } else {
          alert('Erro ao gerar relatório: ' + data.message)
        }
      } else if (reportId === 'abastecimento') {
        const queryParams = new URLSearchParams({
          start_date: weekRange.start,
          end_date: weekRange.end
        })
        if (providerFilter !== 'all') {
          queryParams.append('provider', providerFilter)
        }

        const res = await fetch(`/api/reports/refueling-control?${queryParams.toString()}`, { cache: 'no-store' })
        const data = await res.json()

        if (data.success) {
          const periodLabel = formatWeekRange(weekRange.labelStart, weekRange.labelEnd)
          await generateRefuelingControlPDF(data, periodLabel)
        } else {
          alert('Erro ao gerar relatório: ' + data.message)
        }
      } else if (reportId === 'manutencao') {
        const queryParams = new URLSearchParams()
        if (allPeriod) {
          queryParams.append('allPeriod', 'true')
        } else {
          if (dateFrom) queryParams.append('dateFrom', dateFrom)
          if (dateTo) queryParams.append('dateTo', dateTo)
        }
        if (providerFilter !== 'all') {
          queryParams.append('provider', providerFilter)
        }

        const res = await fetch(`/api/reports/maintenance-time?${queryParams.toString()}`, { cache: 'no-store' })
        const data = await res.json()

        if (data.success) {
          const periodLabel = allPeriod ? 'Todo o período' : `${dateFrom ? `De ${formatDateOnly(dateFrom)} ` : ''}Até ${formatDateOnly(dateTo)}`
          await generateMaintenanceTimePDF(data.maintenanceEvents, periodLabel)
        } else {
          alert('Erro ao gerar relatório: ' + data.message)
        }
      } else if (reportId === 'allocation-credits') {
        const res = await fetch(`/api/reports/allocation-credits`, { cache: 'no-store' })
        const data = await res.json()

        if (data.success) {
          await generateAllocationCreditsPDF(data.summaryBySupplier, data.allocations)
        } else {
          alert('Erro ao gerar relatório: ' + data.message)
        }
      } else if (reportId === 'backcharges') {
        const queryParams = new URLSearchParams()
        if (allPeriod) queryParams.append('allPeriod', 'true')
        else {
          if (dateFrom) queryParams.append('dateFrom', dateFrom)
          if (dateTo) queryParams.append('dateTo', dateTo)
        }
        const res = await fetch(`/api/reports/backcharges?${queryParams.toString()}`, { cache: 'no-store' })
        const data = await res.json()
        if (data.success) {
          const periodLabel = allPeriod ? 'Todo o período' : `${dateFrom ? `De ${formatDateOnly(dateFrom)} ` : ''}Até ${formatDateOnly(dateTo)}`
          await generateBackchargesPDF(data.backcharges, periodLabel)
        } else {
          alert('Erro ao gerar relatório: ' + data.message)
        }
      } else if (reportId === 'events-by-site') {
        const queryParams = new URLSearchParams()
        if (allPeriod) queryParams.append('allPeriod', 'true')
        else {
          if (dateFrom) queryParams.append('dateFrom', dateFrom)
          if (dateTo) queryParams.append('dateTo', dateTo)
        }
        if (selectedSiteIds.length > 0) queryParams.append('siteIds', selectedSiteIds.join(','))
        const res = await fetch(`/api/reports/events-by-site?${queryParams.toString()}`, { cache: 'no-store' })
        const data = await res.json()
        if (data.success) {
          const periodLabel = allPeriod ? 'Todo o período' : `${dateFrom ? `De ${formatDateOnly(dateFrom)} ` : ''}Até ${formatDateOnly(dateTo)}`
          await generateEventsBySitePDF(data.sites, periodLabel)
        } else {
          alert('Erro ao gerar relatório: ' + data.message)
        }
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Erro ao gerar relatório. Tente novamente.')
    } finally {
      setGeneratingPDF(null)
    }
  }

  const handleGenerateExcel = async (reportId: string) => {
    if (!isReportReady(reportId)) return

    setGeneratingExcel(reportId)
    try {
      if (reportId === 'alocacoes') {
        const queryParams = new URLSearchParams()
        if (allPeriod) {
          queryParams.append('allPeriod', 'true')
        } else if (dateTo) {
          queryParams.append('dateTo', dateTo)
        }
        if (providerFilter !== 'all') {
          queryParams.append('provider', providerFilter)
        }

        const res = await fetch(`/api/reports/allocations?${queryParams.toString()}`, { cache: 'no-store' })
        const data = await res.json()

        if (data.success) {
          generateAllocationStatusExcel(data.allocations)
        } else {
          alert('Erro ao gerar relatório Excel: ' + data.message)
        }
      } else if (reportId === 'historico') {
        const queryParams = new URLSearchParams({
          machineId: selectedEquipmentId,
          allPeriod: allPeriod.toString()
        })
        if (!allPeriod) {
          if (dateFrom) queryParams.append('dateFrom', dateFrom)
          if (dateTo) queryParams.append('dateTo', dateTo)
        }

        const res = await fetch(`/api/reports/machine-history?${queryParams.toString()}`, { cache: 'no-store' })
        const data = await res.json()

        if (data.success) {
          generateMachineHistoryExcel(data.machine, data.events)
        } else {
          alert('Erro ao gerar relatório Excel: ' + data.message)
        }
      } else if (reportId === 'abastecimento') {
        const queryParams = new URLSearchParams({
          start_date: weekRange.start,
          end_date: weekRange.end
        })
        if (providerFilter !== 'all') {
          queryParams.append('provider', providerFilter)
        }

        const res = await fetch(`/api/reports/refueling-control?${queryParams.toString()}`, { cache: 'no-store' })
        const data = await res.json()

        if (data.success) {
          generateRefuelingControlExcel(data.events)
        } else {
          alert('Erro ao gerar relatório Excel: ' + data.message)
        }
      } else if (reportId === 'manutencao') {
        const queryParams = new URLSearchParams()
        if (allPeriod) {
          queryParams.append('allPeriod', 'true')
        } else {
          if (dateFrom) queryParams.append('dateFrom', dateFrom)
          if (dateTo) queryParams.append('dateTo', dateTo)
        }
        if (providerFilter !== 'all') {
          queryParams.append('provider', providerFilter)
        }

        const res = await fetch(`/api/reports/maintenance-time?${queryParams.toString()}`, { cache: 'no-store' })
        const data = await res.json()

        if (data.success) {
          generateMaintenanceTimeExcel(data.maintenanceEvents)
        } else {
          alert('Erro ao gerar relatório Excel: ' + data.message)
        }
      } else if (reportId === 'allocation-credits') {
        const res = await fetch(`/api/reports/allocation-credits`, { cache: 'no-store' })
        const data = await res.json()

        if (data.success) {
          generateAllocationCreditsExcel(data.summaryBySupplier, data.allocations)
        } else {
          alert('Erro ao gerar relatório Excel: ' + data.message)
        }
      } else if (reportId === 'backcharges') {
        const queryParams = new URLSearchParams()
        if (allPeriod) queryParams.append('allPeriod', 'true')
        else {
          if (dateFrom) queryParams.append('dateFrom', dateFrom)
          if (dateTo) queryParams.append('dateTo', dateTo)
        }
        const res = await fetch(`/api/reports/backcharges?${queryParams.toString()}`, { cache: 'no-store' })
        const data = await res.json()
        if (data.success) {
          const periodLabel = allPeriod ? 'Todo o período' : `${dateFrom ? `De ${formatDateOnly(dateFrom)} ` : ''}Até ${formatDateOnly(dateTo)}`
          generateBackchargesExcel(data.backcharges, periodLabel)
        } else {
          alert('Erro ao gerar relatório Excel: ' + data.message)
        }
      }
    } catch (error) {
      console.error('Error generating Excel:', error)
      alert('Erro ao gerar relatório Excel. Tente novamente.')
    } finally {
      setGeneratingExcel(null)
    }
  }

  const headerActions = (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-gray-400 text-xs uppercase font-bold tracking-wider">Período:</span>
        <div className="w-36">
          <CustomInput
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            disabled={allPeriod}
            className="!py-1.5 !text-xs"
          />
        </div>
        <span className="text-gray-400 text-xs uppercase font-medium">até</span>
        <div className="w-36">
          <CustomInput
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            disabled={allPeriod}
            className="!py-1.5 !text-xs"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer group">
        <div className="relative flex items-center">
          <input
            type="checkbox"
            checked={allPeriod}
            onChange={(e) => setAllPeriod(e.target.checked)}
            className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 dark:border-gray-600 checked:border-blue-600 checked:bg-blue-600 transition-all focus:ring-offset-0 focus:ring-2 focus:ring-blue-500/20"
          />
          <svg
            className="absolute h-3 w-3 pointer-events-none hidden peer-checked:block text-white left-0.5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          Atualmente
        </span>
      </label>
    </div>
  )

  const renderReportItem = (report: ReportItem) => (
    <div key={report.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {report.title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {report.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {report.id === 'alocacoes' && (
            <div className="mr-2 flex items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {!isReportReady(report.id) ? 'Defina o período para gerar o relatório' : 'Período definido'}
              </span>
              <div className={`ml-2 flex items-center justify-center transition-all duration-500 ease-out ${isReportReady(report.id) ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
                <div className="w-6 h-6 flex items-center justify-center bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-md border border-green-100 dark:border-green-900/30 shadow-sm">
                  <HiCheck className="w-3.5 h-3.5 stroke-[0.5]" />
                </div>
              </div>
            </div>
          )}

          {report.id === 'historico' && (
            <div className="flex items-center gap-2 mr-2">
              <div className="w-44 transition-all duration-300">
                <CustomDropdown
                  label=""
                  value={selectedEquipmentId}
                  onChange={setSelectedEquipmentId}
                  options={[
                    { value: '', label: 'Selecionar' },
                    ...equipments.map(e => ({
                      value: e.id,
                      label: e.unit_number,
                      description: e.description
                    }))
                  ]}
                  searchable={true}
                  descriptionLayout="beside"
                  className="!py-1"
                />
              </div>
              <div className={`flex items-center justify-center transition-all duration-500 ease-out ${selectedEquipmentId ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
                <div className="w-6 h-6 flex items-center justify-center bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-md border border-green-100 dark:border-green-900/30 shadow-sm">
                  <HiCheck className="w-3.5 h-3.5 stroke-[0.5]" />
                </div>
              </div>
            </div>
          )}

          {report.id === 'abastecimento' && (
            <div className="flex items-center gap-2 mr-2">
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <button
                  onClick={() => setWeekOffset(prev => prev - 1)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-600 dark:text-gray-400"
                  title="Semana Anterior"
                >
                  <HiChevronLeft className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => setWeekOffset(0)}
                  className="px-2 py-1 text-[10px] font-bold hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors flex items-center gap-1.5 text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                >
                  <HiOutlineCalendarDays className="w-3.5 h-3.5" />
                  <span className="min-w-[100px] text-center">
                    {formatWeekRange(weekRange.labelStart, weekRange.labelEnd)}
                  </span>
                </button>

                <button
                  onClick={() => setWeekOffset(prev => prev + 1)}
                  disabled={weekOffset >= 0}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-600 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  title="Próxima Semana"
                >
                  <HiChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className={`flex items-center justify-center transition-all duration-500 ease-out ${hasFuelData ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
                <div className="w-6 h-6 flex items-center justify-center bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-md border border-green-100 dark:border-green-900/30 shadow-sm">
                  <HiCheck className="w-3.5 h-3.5 stroke-[0.5]" />
                </div>
              </div>
            </div>
          )}

          {report.id === 'manutencao' && (
            <div className="flex items-center gap-2 mr-2">
              <div className="flex items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {!(allPeriod || (!!dateFrom && !!dateTo)) ? 'Defina o período para gerar o relatório' : ''}
                </span>
              </div>
              {(allPeriod || (!!dateFrom && !!dateTo)) && (
                <div className="w-44 transition-all duration-300">
                  <CustomDropdown
                    label=""
                    value={providerFilter}
                    onChange={setProviderFilter}
                    options={[
                      { value: 'all', label: 'Todos' },
                      { value: 'owned', label: 'Equipamento Próprio' },
                      { value: 'rented', label: 'Equipamento Alugado' }
                    ]}
                    className="!py-1"
                  />
                </div>
              )}
              <div className={`flex items-center justify-center transition-all duration-500 ease-out ${isReportReady(report.id) ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
                <div className="w-6 h-6 flex items-center justify-center bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-md border border-green-100 dark:border-green-900/30 shadow-sm">
                  <HiCheck className="w-3.5 h-3.5 stroke-[0.5]" />
                </div>
              </div>
            </div>
          )}

          {report.id === 'backcharges' && (allPeriod || (!!dateFrom && !!dateTo)) && (
            <div className="mr-2 flex items-center">
              {checkingBackchargeData ? (
                <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : hasBackchargeData === false ? (
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Nenhum backcharge no período
                </span>
              ) : hasBackchargeData === true ? (
                <div className="w-6 h-6 flex items-center justify-center bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-md border border-green-100 dark:border-green-900/30 shadow-sm">
                  <HiCheck className="w-3.5 h-3.5 stroke-[0.5]" />
                </div>
              ) : null}
            </div>
          )}

          {report.id === 'events-by-site' && (allPeriod || (!!dateFrom && !!dateTo)) && (
            <div className="w-44 mr-2 transition-all duration-300">
              <SiteMultiSelect
                sites={availableSites}
                selected={selectedSiteIds}
                onChange={setSelectedSiteIds}
                loading={loadingSites}
              />
            </div>
          )}

          <button
            onClick={() => handleGeneratePDF(report.id)}
            disabled={!isReportReady(report.id) || generatingPDF === report.id}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[70px] justify-center"
            title="Gerar PDF"
          >
            {generatingPDF === report.id ? (
              <div className="w-4 h-4 border-2 border-red-600 dark:border-red-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <BsFileEarmarkPdf className="w-4 h-4" />
                <span>PDF</span>
              </>
            )}
          </button>
          <button
            onClick={() => handleGenerateExcel(report.id)}
            disabled={!isReportReady(report.id) || generatingExcel === report.id}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[70px] justify-center"
            title="Gerar Excel"
          >
            {generatingExcel === report.id ? (
              <div className="w-4 h-4 border-2 border-green-600 dark:border-green-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <BsFileEarmarkExcel className="w-4 h-4" />
                <span>Excel</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen md:h-screen md:max-h-screen bg-gray-50 dark:bg-gray-900 pb-safe-content md:pb-0 md:flex md:flex-col md:overflow-hidden">
      <Header />
      <div className="flex md:flex-1 md:overflow-hidden">
        <Sidebar />
        <main className={`flex-1 p-4 md:p-6 md:overflow-y-auto transition-all duration-300 ease-in-out ${isExpanded ? 'md:ml-52' : 'md:ml-16'}`}>
          <div className="w-full">
            <BaseList
              title="Reports"
              items={reports}
              renderItem={renderReportItem}
              headerActions={headerActions}
              fullHeight={false}
            />
          </div>
        </main>
      </div>
      <BottomNavigation />
    </div>
  )
}

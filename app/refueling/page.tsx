'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Header from '@/app/components/Header'
import BottomNavigation from '@/app/components/BottomNavigation'
import Sidebar from '@/app/components/Sidebar'
import PageTabs from '@/app/components/PageTabs'
import CustomInput from '@/app/components/CustomInput'
import TimeInput from '@/app/components/TimeInput'
import CustomDropdown from '@/app/components/CustomDropdown'
import { useSession } from '@/lib/useSession'
import { useSidebar } from '@/lib/useSidebar'
import { supabase } from '@/lib/supabase'
import { getEventConfig } from '@/app/events/utils'
import { formatDate } from '@/app/events/utils'
import { HiOutlineInformationCircle } from 'react-icons/hi'
import { getSupplierIcon } from '@/app/usuarios/components/UserIcons'

interface RefuelingEvent {
  id: string
  event_type: string
  event_date: string
  status: string
  notas: string | null
  machine: { id: string; unit_number: string } | null
  site: { id: string; title: string } | null
}

interface RefuelingTemplate {
  id: string
  site_id: string
  machine_id: string
  fuel_supplier_id: string | null
  day_of_week: number
  time_of_day: string
  is_active: boolean
  notes?: string | null
  machine?: { id: string; unit_number: string } | null
  site?: { id: string; title: string } | null
  supplier?: { id: string; nome: string } | null
}

interface FuelSupplier {
  id: string
  nome: string
  email: string | null
  telefone: string | null
  supplier_type: 'rental' | 'maintenance' | 'both' | 'fuel'
  ativo: boolean
}

type TabKey = 'week' | 'templates'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

function getCurrentWeekRange() {
  const today = new Date()
  const day = today.getDay()
  const diffToMonday = (day + 6) % 7
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - diffToMonday)
  const sunday = new Date(monday.getTime() + 6 * ONE_DAY_MS)
  const start = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0))
  const end = new Date(Date.UTC(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), 23, 59, 59))
  return { start: start.toISOString(), end: end.toISOString(), labelStart: monday, labelEnd: sunday }
}

type TemplateScheduleItem = { day_of_week: string; time_of_day: string; id?: string }
type TemplateFormData = {
  site_id: string
  machine_id: string
  fuel_supplier_id: string
  schedules: TemplateScheduleItem[]
  deletedIds: string[]
  is_active: boolean
  notes: string
}

interface TemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => Promise<void>
  onDelete?: () => Promise<void>
  saving: boolean
  error: string
  formData: TemplateFormData
  setFormData: React.Dispatch<React.SetStateAction<TemplateFormData>>
  sites: { id: string; title: string }[]
  machines: { id: string; unit_number: string }[]
  fuelSuppliers: FuelSupplier[]
}

function TemplateModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  saving,
  error,
  formData,
  setFormData,
  sites,
  machines,
  fuelSuppliers,
}: TemplateModalProps) {
  if (!isOpen) return null

  const dayOptions = [
    { value: '0', label: 'Domingo' },
    { value: '1', label: 'Segunda' },
    { value: '2', label: 'Terça' },
    { value: '3', label: 'Quarta' },
    { value: '4', label: 'Quinta' },
    { value: '5', label: 'Sexta' },
    { value: '6', label: 'Sábado' },
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-6 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Template de abastecimento</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              await onSave()
            }}
            className="space-y-4"
          >
            <CustomDropdown
              label="Jobsite"
              value={formData.site_id}
              onChange={(value) => setFormData({ ...formData, site_id: value })}
              options={[
                { value: '', label: 'Selecione um Jobsite' },
                ...sites.map((s) => ({ value: s.id, label: s.title })),
              ]}
              placeholder="Selecione um Jobsite"
              searchable
            />
            <CustomDropdown
              label="Unit"
              value={formData.machine_id}
              onChange={(value) => setFormData({ ...formData, machine_id: value })}
              options={[
                { value: '', label: 'Selecione uma Unit' },
                ...machines.map((m) => ({ value: m.id, label: m.unit_number })),
              ]}
              placeholder="Selecione uma Unit"
              searchable
            />
            <CustomDropdown
              label="Fornecedor de combustível"
              value={formData.fuel_supplier_id}
              onChange={(value) => setFormData({ ...formData, fuel_supplier_id: value })}
              options={[
                { value: '', label: 'Opcional' },
                ...fuelSuppliers.map((s) => ({ value: s.id, label: s.nome })),
              ]}
              placeholder="Selecione um fornecedor (opcional)"
              searchable
            />
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Agendamentos
              </label>
              {formData.schedules.map((schedule, index) => (
                <div key={index} className="flex gap-4 items-start p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg relative group border border-gray-100 dark:border-gray-700">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CustomDropdown
                      label="Dia da semana"
                      value={schedule.day_of_week}
                      onChange={(value) => {
                        const newSchedules = [...formData.schedules]
                        newSchedules[index].day_of_week = value
                        setFormData({ ...formData, schedules: newSchedules })
                      }}
                      options={dayOptions}
                    />
                    <TimeInput
                      label="Horário"
                      value={schedule.time_of_day}
                      onChange={(value) => {
                        const newSchedules = [...formData.schedules]
                        newSchedules[index].time_of_day = value
                        setFormData({ ...formData, schedules: newSchedules })
                      }}
                      required
                    />
                  </div>
                  {formData.schedules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const scheduleToRemove = formData.schedules[index]
                        const newSchedules = formData.schedules.filter((_, i) => i !== index)
                        const newDeletedIds = [...(formData.deletedIds || [])]
                        if (scheduleToRemove.id) {
                          newDeletedIds.push(scheduleToRemove.id)
                        }
                        setFormData({ ...formData, schedules: newSchedules, deletedIds: newDeletedIds })
                      }}
                      className="mt-8 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Remover agendamento"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    schedules: [...formData.schedules, { day_of_week: '1', time_of_day: '08:00' }]
                  })
                }}
                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium px-3 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors w-fit border border-transparent hover:border-blue-200 dark:hover:border-blue-800/50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Adicionar outro horário
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="template-active"
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="template-active" className="text-sm text-gray-700 dark:text-gray-300">
                Template ativo
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Observações
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-h-[80px]"
              />
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex gap-3">
            {onDelete && (
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Tem certeza que deseja excluir este template?')) {
                    await onDelete()
                  }
                }}
                disabled={saving}
                className="px-4 py-2 border border-red-300 dark:border-red-900/50 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
              >
                Excluir
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RefuelingPage() {
  const { isExpanded } = useSidebar()
  const { user } = useSession()
  const [activeTab, setActiveTab] = useState<TabKey>('week')
  const [events, setEvents] = useState<RefuelingEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<RefuelingTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [templateSearchTerm, setTemplateSearchTerm] = useState('')
   const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  
  // Modal states
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [modalSaving, setModalSaving] = useState(false)
  const [modalError, setModalError] = useState('')
  const [, setTimezoneTick] = useState(0)

  useEffect(() => {
    const handleTimezoneChange = () => {
      setTimezoneTick(prev => prev + 1)
    }
    window.addEventListener('timezoneChange', handleTimezoneChange)
    return () => window.removeEventListener('timezoneChange', handleTimezoneChange)
  }, [])
  
  // Data for dropdowns
  const [sites, setSites] = useState<{ id: string; title: string }[]>([])
  const [machines, setMachines] = useState<{ id: string; unit_number: string }[]>([])
  const [allFuelSuppliers, setAllFuelSuppliers] = useState<FuelSupplier[]>([]) // For dropdown in template modal

  // Form states
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null)
  const [templateFormData, setTemplateFormData] = useState<TemplateFormData>({
    site_id: '',
    machine_id: '',
    fuel_supplier_id: '',
    schedules: [{ day_of_week: '1', time_of_day: '08:00', id: undefined as string | undefined }],
    deletedIds: [] as string[],
    is_active: true,
    notes: '',
  })

  const { start, end } = useMemo(() => getCurrentWeekRange(), [])

  const fetchSitesAndMachines = useCallback(async (signal?: AbortSignal) => {
    try {
      const [sitesRes, machinesRes] = await Promise.all([
        fetch('/api/sites?archived=false', { signal }),
        fetch('/api/machines', { signal }),
      ])

      const [sitesData, machinesData] = await Promise.all([
        sitesRes.json(),
        machinesRes.json(),
      ])

      if (sitesData.success) {
        setSites((sitesData.sites || []).map((s: any) => ({ id: s.id, title: s.title })))
      } else {
        setSites([])
      }

      if (machinesData.success) {
        const list = (machinesData.machines || [])
        setMachines(list.map((m: any) => ({ id: m.id, unit_number: m.unit_number })))
      } else {
        setMachines([])
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return
      console.error('Error loading sites/machines for refueling modal:', err)
      setSites([])
      setMachines([])
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchSitesAndMachines(controller.signal)
    return () => controller.abort()
  }, [fetchSitesAndMachines])

  const fetchEvents = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('allocation_events')
        .select(
          `
          id,
          event_type,
          event_date,
          status,
          notas,
          machine:machines(id, unit_number),
          site:sites(id, title)
        `
        )
        .eq('event_type', 'refueling')
        .gte('event_date', start)
        .lte('event_date', end)
        .order('event_date', { ascending: true })
        .abortSignal(signal as any)

      if (error) {
        if (error.code === 'ABORTED') return
        console.error('Error fetching refueling events', error)
        setEvents([])
      } else {
        setEvents((data || []) as unknown as RefuelingEvent[])
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.code === 'ABORTED') return
      console.error('Error fetching refueling events', err)
    } finally {
      setLoading(false)
    }
  }, [start, end])

  const loadTemplates = useCallback(async (signal?: AbortSignal) => {
    setLoadingTemplates(true)
    try {
      const res = await fetch('/api/refueling-templates', { signal })
      const data = await res.json()
      if (data.success) {
        setTemplates((data.templates || []) as unknown as RefuelingTemplate[])
      } else {
        setTemplates([])
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return
      console.error('Error fetching refueling templates', error)
      setTemplates([])
    } finally {
      setLoadingTemplates(false)
    }
  }, [])

  const loadSuppliers = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/suppliers?archived=false', { signal })
      const data = await res.json()
      if (data.success) {
        const fuels = (data.suppliers || []).filter((s: any) => s.supplier_type === 'fuel' && s.ativo)
        setAllFuelSuppliers(fuels as FuelSupplier[])
      } else {
        setAllFuelSuppliers([])
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return
      console.error('Error fetching fuel suppliers', error)
      setAllFuelSuppliers([])
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchEvents(controller.signal)
    return () => controller.abort()
  }, [fetchEvents])

  useEffect(() => {
    const controller = new AbortController()
    loadTemplates(controller.signal)
    loadSuppliers(controller.signal)
    return () => controller.abort()
  }, [loadTemplates, loadSuppliers])

  // Handlers
  const handleOpenAddTemplate = () => {
    if (!sites.length || !machines.length) {
      fetchSitesAndMachines()
    }
    setTemplateFormData({
      site_id: '',
      machine_id: '',
      fuel_supplier_id: '',
      schedules: [{ day_of_week: '1', time_of_day: '08:00', id: undefined }],
      deletedIds: [],
      is_active: true,
      notes: '',
    })
    setCurrentTemplateId(null)
    setModalError('')
    setIsTemplateModalOpen(true)
  }

  const handleOpenEditTemplate = (template: RefuelingTemplate) => {
    if (!sites.length || !machines.length) {
      fetchSitesAndMachines()
    }
    setTemplateFormData({
      site_id: template.site_id,
      machine_id: template.machine_id,
      fuel_supplier_id: template.fuel_supplier_id || '',
      schedules: [{ day_of_week: template.day_of_week.toString(), time_of_day: template.time_of_day, id: template.id }],
      deletedIds: [],
      is_active: template.is_active,
      notes: template.notes || '',
    })
    setCurrentTemplateId(template.id)
    setModalError('')
    setIsTemplateModalOpen(true)
  }

  const handleSaveTemplate = async () => {
    setModalSaving(true)
    setModalError('')
    try {
      if (!templateFormData.site_id) {
        throw new Error('Por favor, selecione um Jobsite.')
      }
      if (!templateFormData.machine_id) {
        throw new Error('Por favor, selecione uma Unit.')
      }
      if (templateFormData.schedules.length === 0) {
        throw new Error('Por favor, adicione pelo menos um horário.')
      }
      
      const setKey = new Set<string>()
      for (const s of templateFormData.schedules) {
        const k = `${templateFormData.machine_id}-${s.day_of_week}-${s.time_of_day}`
        if (setKey.has(k)) {
          throw new Error('Você adicionou horários duplicados para esta unit no formulário.')
        }
        setKey.add(k)
      }

      const conflict = templates.some((t) => {
        if (t.machine_id !== templateFormData.machine_id) return false
        return templateFormData.schedules.some((s) => {
          const same = t.day_of_week.toString() === s.day_of_week && t.time_of_day === s.time_of_day
          const sameRecord = s.id && t.id === s.id
          return same && !sameRecord
        })
      })

      if (conflict) {
        throw new Error('Já existe um template para esta unit com o mesmo dia/horário.')
      }
      // Process deletions first
      if (templateFormData.deletedIds && templateFormData.deletedIds.length > 0) {
        const deletePromises = templateFormData.deletedIds.map(async (id) => {
          const res = await fetch(`/api/refueling-templates/${id}`, {
            method: 'DELETE',
          })
          if (!res.ok) {
            console.error(`Failed to delete template ${id}`)
          }
        })
        await Promise.all(deletePromises)
      }

      // Process upserts
      const promises = templateFormData.schedules.map(async (schedule) => {
        const url = schedule.id 
          ? `/api/refueling-templates/${schedule.id}`
          : '/api/refueling-templates'
        
        const method = schedule.id ? 'PUT' : 'POST'
        
        const body = {
          site_id: templateFormData.site_id,
          machine_id: templateFormData.machine_id,
          fuel_supplier_id: templateFormData.fuel_supplier_id,
          day_of_week: schedule.day_of_week,
          time_of_day: schedule.time_of_day,
          is_active: templateFormData.is_active,
          notes: templateFormData.notes,
          currentUserId: user?.id,
        }

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || 'Failed to save template')
        }

        return res.json()
      })

      await Promise.all(promises)

      await loadTemplates()
      setIsTemplateModalOpen(false)
    } catch (err: any) {
      setModalError(err.message)
    } finally {
      setModalSaving(false)
    }
  }

  const handleDeleteTemplate = async (templateId?: string) => {
    const idToDelete = templateId || currentTemplateId
    if (!idToDelete) return
    
    setModalSaving(true)
    setModalError('')
    try {
      const res = await fetch(`/api/refueling-templates/${idToDelete}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to delete template')
      }

      await loadTemplates()
      setIsTemplateModalOpen(false)
      setCurrentTemplateId(null)
    } catch (err: any) {
      setModalError(err.message)
    } finally {
      setModalSaving(false)
    }
  }

  const renderWeekTab = () => {
    if (loading) {
      return (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-gray-400" />
        </div>
      )
    }

    if (!events.length) {
      return (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          Nenhum evento de abastecimento agendado para esta semana.
        </div>
      )
    }

    return (
      <div className="p-4 space-y-3">
        {events.map((event) => {
          const config = getEventConfig(event.event_type)
          const Icon = config.icon
          return (
            <div
              key={event.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
            >
              <div
                className={`w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center ${config.bgColor} ${config.textColor} ${config.borderColor}`}
              >
                <Icon size={24} title={config.label} aria-label={config.label} />
              </div>
              <div className="flex-1 min-w-0 w-full">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {event.machine?.unit_number || 'Sem unit'}
                    </span>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      {event.site?.title || 'Sem jobsite'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="px-2 py-0.5 rounded-full text-xs border border-gray-200 dark:border-gray-700">
                      {event.status}
                    </span>
                    <span>{formatDate(event.event_date)}</span>
                  </div>
                </div>
                {event.notas && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{event.notas}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderTemplatesTab = () => {
    const filteredTemplates = templates.filter((template) => {
      const searchLower = templateSearchTerm.toLowerCase()
      const machineMatch = template.machine?.unit_number?.toLowerCase().includes(searchLower)
      const siteMatch = template.site?.title?.toLowerCase().includes(searchLower)
      const supplier = allFuelSuppliers.find((s) => s.id === (template as any).fuel_supplier_id)
      const supplierMatch = supplier?.nome?.toLowerCase().includes(searchLower)
      
      return machineMatch || siteMatch || supplierMatch
    })

    const tabHeader = (
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 gap-4">
        <h2 className={`text-base font-normal text-gray-500 dark:text-gray-400 ${isSearchExpanded ? 'hidden sm:block sm:opacity-0' : 'block'}`}>
          Templates de abastecimento • {templates.length}
        </h2>
        
        <div className="flex items-center gap-2 ml-auto">
          <div className={`flex items-center transition-all duration-300 ease-in-out ${isSearchExpanded ? 'w-48 sm:w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
            <input
              type="text"
              placeholder="Unit, Jobsite ou Fornecedor..."
              value={templateSearchTerm}
              onChange={(e) => setTemplateSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:text-white"
              autoFocus={isSearchExpanded}
            />
          </div>

          <button
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
            className={`p-2 rounded-lg transition-colors ${
              isSearchExpanded 
                ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' 
                : 'text-blue-600 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Pesquisar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          <button
            onClick={() => loadTemplates()}
            className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Atualizar"
            disabled={loadingTemplates}
          >
            <svg className={`w-5 h-5 ${loadingTemplates ? 'animate-spin-reverse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          
          <button
            onClick={handleOpenAddTemplate}
            className="p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Adicionar Template"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
    )

    if (loadingTemplates && !templates.length) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden">
          {tabHeader}
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-gray-400" />
          </div>
        </div>
      )
    }

    if (!templates.length) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden">
          {tabHeader}
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Nenhum template de abastecimento configurado.
          </div>
        </div>
      )
    }

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden">
        {tabHeader}
        <div className="divide-y divide-gray-200 dark:divide-gray-700 md:flex-1 md:overflow-y-auto">
          {filteredTemplates.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Nenhum resultado encontrado para &quot;{templateSearchTerm}&quot;
            </div>
          ) : (
            filteredTemplates.map((template) => {
            const dayLabel =
              ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][template.day_of_week]
            
            const supplier = allFuelSuppliers.find((s) => s.id === (template as any).fuel_supplier_id)
            const supplierIcon = getSupplierIcon(supplier?.supplier_type || 'fuel')

            return (
              <div
                key={template.id}
                className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-gray-400 flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <span className="text-base font-semibold text-gray-900 dark:text-white truncate">
                        {template.machine?.unit_number || 'Sem unit'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">{template.site?.title || 'Sem jobsite definido'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="flex-shrink-0 text-gray-400">
                          {React.cloneElement(supplierIcon.icon as React.ReactElement, { className: 'w-4 h-4' })}
                        </div>
                        <span className="truncate">{supplier?.nome || 'Não informado'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-row md:flex-col items-center md:items-end gap-2 md:gap-1 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                        {dayLabel} • {template.time_of_day}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full border text-xs ${
                          template.is_active
                            ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                      >
                        {template.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2 md:mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEditTemplate(template)}
                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('Tem certeza que deseja excluir este template?')) {
                            await handleDeleteTemplate(template.id)
                          }
                        }}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          }))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen md:h-screen md:max-h-screen bg-gray-50 dark:bg-gray-900 pb-safe-content md:pb-0 md:flex md:flex-col md:overflow-hidden">
      <Header />
      <div className="flex md:flex-1 md:overflow-hidden">
        <Sidebar />
        <main
          className={`flex-1 p-4 md:p-6 md:overflow-hidden md:flex md:flex-col transition-all duration-250 ease-in-out ${
            isExpanded ? 'md:ml-48 lg:ml-64' : 'md:ml-16 lg:ml-20'
          }`}
        >
          <div className="max-w-7xl mx-auto md:flex md:flex-col md:flex-1 md:overflow-hidden md:w-full">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4 flex-shrink-0 overflow-hidden">
              <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  activeTab === 'templates' 
                    ? 'max-h-40 sm:max-h-32 opacity-100 border-b border-gray-100 dark:border-gray-700/50' 
                    : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-4 py-4 flex items-start gap-3">
                  <HiOutlineInformationCircle className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    As unidades abaixo que estiverem inseridas e ativas geram automaticamente eventos semanais de abastecimento.<br />
                    Novos eventos de abastecimentos serão criados em seus respectivos jobsites e devem ser confirmados logo após sua efetivação.
                  </p>
                </div>
              </div>
              <PageTabs
                tabs={[
                  { id: 'week', label: 'Weekly schedule' },
                  { id: 'templates', label: 'Templates' },
                ]}
                activeId={activeTab}
                onChange={(id) => setActiveTab(id as TabKey)}
              />
            </div>

            <div className="flex-1 md:min-h-0 md:overflow-y-auto">
              {activeTab === 'week' && renderWeekTab()}
              {activeTab === 'templates' && renderTemplatesTab()}
            </div>
          </div>
        </main>
      </div>

      <BottomNavigation />

      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSave={handleSaveTemplate}
        onDelete={currentTemplateId ? handleDeleteTemplate : undefined}
        saving={modalSaving}
        error={modalError}
        formData={templateFormData}
        setFormData={setTemplateFormData}
        sites={sites}
        machines={machines}
        fuelSuppliers={allFuelSuppliers}
      />

    </div>
  )
}


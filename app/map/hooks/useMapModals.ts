import { useState, useCallback, useEffect } from 'react'
import { Site } from '../types'

function inferEventsForSite(allEvents: any[], siteId: string) {
  if (!Array.isArray(allEvents) || !siteId) return []

  const sortedEvents = [...allEvents].sort((a, b) => {
    const aDate = new Date(a.event_date).getTime()
    const bDate = new Date(b.event_date).getTime()
    if (aDate !== bDate) return aDate - bDate
    const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0
    const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0
    return aCreated - bCreated
  })

  const machineStates: Record<string, { currentSiteId: string | null }> = {}
  const siteEvents: any[] = []

  for (const event of sortedEvents) {
    // Apenas abastecimentos confirmados devem aparecer no sistema
    if (event.event_type === 'refueling' && event.status !== 'approved') {
      continue
    }

    const machineId = event.machine?.id || event.machine_id
    if (!machineId) continue

    if (!machineStates[machineId]) {
      machineStates[machineId] = { currentSiteId: null }
    }

    const state = machineStates[machineId]
    const explicitSiteId = event.site?.id || event.site_id || null
    let candidateSiteId: string | null = null

    switch (event.event_type) {
      case 'start_allocation':
        if (explicitSiteId) {
          state.currentSiteId = explicitSiteId
        }
        candidateSiteId = explicitSiteId
        break

      case 'end_allocation':
        candidateSiteId = state.currentSiteId || explicitSiteId
        if (state.currentSiteId && (!explicitSiteId || explicitSiteId === state.currentSiteId)) {
          state.currentSiteId = null
        }
        break

      case 'extension_attach': {
        const isIndependentExtension = !event.extension_id && !!machineId
        if (isIndependentExtension) {
          if (explicitSiteId) {
            state.currentSiteId = explicitSiteId
          }
          candidateSiteId = explicitSiteId
        } else {
          candidateSiteId = explicitSiteId || state.currentSiteId
        }
        break
      }

      case 'downtime_start':
      case 'downtime_end':
        candidateSiteId = explicitSiteId || state.currentSiteId
        break

      default:
        candidateSiteId = explicitSiteId || state.currentSiteId
        break
    }

    if (candidateSiteId === siteId) {
      siteEvents.push(event)
    }
  }

  return siteEvents
}

interface UseMapModalsProps {
  selectedSite: Site | null
  setSelectedSite: (site: Site | null) => void
}

export function useMapModals({ selectedSite, setSelectedSite }: UseMapModalsProps) {
  // Estados para modal de detalhes do site
  const [showSiteDetailsModal, setShowSiteDetailsModal] = useState(false)
  const [siteDetails, setSiteDetails] = useState<any>(null)
  const [siteEvents, setSiteEvents] = useState<any[]>([])
  const [siteAllocations, setSiteAllocations] = useState<any[]>([])
  const [loadingSiteDetails, setLoadingSiteDetails] = useState(false)

  // Estados para modal de detalhes da máquina
  const [showMachineDetailsModal, setShowMachineDetailsModal] = useState(false)
  const [machineDetails, setMachineDetails] = useState<any>(null)
  const [machineEvents, setMachineEvents] = useState<any[]>([])
  const [machineAllocations, setMachineAllocations] = useState<any[]>([])
  const [loadingMachineDetails, setLoadingMachineDetails] = useState(false)

  // Carregar detalhes do site para o modal
  const loadSiteDetails = useCallback(async (siteId: string) => {
    setLoadingSiteDetails(true)
    try {
      // Buscar informações detalhadas do site
      const [siteResponse, allocationsResponse, eventsResponse] = await Promise.all([
        fetch(`/api/sites/${siteId}`),
        fetch(`/api/sites/${siteId}/allocations?history=true`),
        fetch(`/api/events?limit=500`)
      ])

      const [siteData, allocationsData, eventsData] = await Promise.all([
        siteResponse.json(),
        allocationsResponse.json(),
        eventsResponse.json()
      ])

      if (siteData.success && allocationsData.success && eventsData.success) {
        setSiteDetails(siteData.site)
        setSiteAllocations(allocationsData.allocations || [])
        const relatedEvents = inferEventsForSite(eventsData.events, siteId)
        setSiteEvents(relatedEvents)
      }
    } catch (error) {
      console.error('Error loading site details:', error)
    } finally {
      setLoadingSiteDetails(false)
    }
  }, [])

  // Carregar detalhes da máquina para o modal
  const loadMachineDetails = useCallback(async (machineId: string, siteId: string) => {
    setLoadingMachineDetails(true)
    try {
      // Buscar informações detalhadas da máquina
      const [machineResponse, eventsResponse] = await Promise.all([
        fetch(`/api/machines/${machineId}`),
        fetch(`/api/events?machine_id=${machineId}&limit=500`)
      ])

      const [machineData, eventsData] = await Promise.all([
        machineResponse.json(),
        eventsResponse.json()
      ])

      if (machineData.success && eventsData.success) {
        setMachineDetails(machineData.machine)
        const eventsForSite = inferEventsForSite(eventsData.events, siteId)
        setMachineEvents(eventsForSite)
        const machineAllocations = eventsForSite
          .filter((event: any) => event.event_type === 'start_allocation' && event.status === 'approved')
          .map((event: any) => ({
            ...event,
            allocation_start: event.event_date
          }))
        setMachineAllocations(machineAllocations)
      }
    } catch (error) {
      console.error('Error loading machine details:', error)
    } finally {
      setLoadingMachineDetails(false)
    }
  }, [])

  // Event listeners para os modais de detalhes
  useEffect(() => {
    const handleCloseSitePanel = (event: CustomEvent) => {
      const siteId = event.detail
      if (selectedSite?.id === siteId) {
        setSelectedSite(null)
      }
    }

    const handleOpenSiteDetails = (event: CustomEvent) => {
      const siteId = event.detail
      if (!siteId) return
      setSiteDetails(null) // Limpar dados anteriores
      loadSiteDetails(siteId)
      setShowSiteDetailsModal(true)
    }

    const handleOpenMachineDetails = (event: CustomEvent) => {
      const { machineId, siteId } = event.detail
      loadMachineDetails(machineId, siteId)
      setShowMachineDetailsModal(true)
    }

    window.addEventListener('closeSitePanel', handleCloseSitePanel as EventListener)
    window.addEventListener('openSiteDetails', handleOpenSiteDetails as EventListener)
    window.addEventListener('openMachineDetails', handleOpenMachineDetails as EventListener)

    return () => {
      window.removeEventListener('closeSitePanel', handleCloseSitePanel as EventListener)
      window.removeEventListener('openSiteDetails', handleOpenSiteDetails as EventListener)
      window.removeEventListener('openMachineDetails', handleOpenMachineDetails as EventListener)
    }
  }, [selectedSite, setSelectedSite, loadSiteDetails, loadMachineDetails])

  return {
    showSiteDetailsModal,
    setShowSiteDetailsModal,
    siteDetails,
    siteEvents,
    siteAllocations,
    loadingSiteDetails,
    showMachineDetailsModal,
    setShowMachineDetailsModal,
    machineDetails,
    machineEvents,
    machineAllocations,
    loadingMachineDetails
  }
}

import { useState, useCallback, useEffect } from 'react'
import { Site } from '../types'

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
        fetch(`/api/sites/${siteId}/allocations`),
        fetch('/api/events')
      ])

      const [siteData, allocationsData, eventsData] = await Promise.all([
        siteResponse.json(),
        allocationsResponse.json(),
        eventsResponse.json()
      ])

      if (siteData.success && allocationsData.success && eventsData.success) {
        setSiteDetails(siteData.site)
        setSiteAllocations(allocationsData.allocations || [])
        // Filtrar eventos relacionados ao site
        const relatedEvents = eventsData.events.filter((event: any) =>
          event.site?.id === siteId || event.site_id === siteId
        )
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
        fetch('/api/events')
      ])

      const [machineData, eventsData] = await Promise.all([
        machineResponse.json(),
        eventsResponse.json()
      ])

      if (machineData.success && eventsData.success) {
        setMachineDetails(machineData.machine)
        // Filtrar eventos relacionados à máquina neste site
        const relatedEvents = eventsData.events.filter((event: any) =>
          (event.machine?.id === machineId || event.machine_id === machineId) &&
          (event.site?.id === siteId || event.site_id === siteId)
        )
        setMachineEvents(relatedEvents)
        // Calcular alocações da máquina neste site
        const machineAllocations = relatedEvents
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

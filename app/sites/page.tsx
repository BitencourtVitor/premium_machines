'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/app/components/Header'
import BottomNavigation from '@/app/components/BottomNavigation'
import Sidebar from '@/app/components/Sidebar'
import ConfirmModal from '@/app/components/ConfirmModal'
import { useSession } from '@/lib/useSession'
import { useSidebar } from '@/lib/useSidebar'
import { useAllocationDataRefresh } from '@/lib/allocationEvents'
import { Site, SiteMetrics, GeocodingResult } from './types'
import MetricsCards from './components/MetricsCards'
import SiteList from './components/SiteList'
import CreateSiteModal from './components/CreateSiteModal'

export default function SitesPage() {
  const router = useRouter()
  const { user, loading: sessionLoading } = useSession()
  const { isExpanded } = useSidebar()
  const [loading, setLoading] = useState(true)
  const [loadingSites, setLoadingSites] = useState(false)
  const [sites, setSites] = useState<Site[]>([])
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  const [metrics, setMetrics] = useState<SiteMetrics>({
    totalActiveSites: 0,
    totalMachinesAllocated: 0,
    pendingAllocations: 0,
    machinesWithIssues: 0,
    archivedSites: 0,
  })
  const [showArchivedSites, setShowArchivedSites] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [creating, setCreating] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    confirmButtonText?: string
    isDangerous?: boolean
    isLoading?: boolean
    error?: string | null
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })
  const [newSite, setNewSite] = useState({
    title: '',
    address: '',
  })
  const [geocoding, setGeocoding] = useState(false)
  const [geocodingResult, setGeocodingResult] = useState<GeocodingResult | null>(null)
  const [mapCoordinates, setMapCoordinates] = useState<{ lat: number; lng: number } | null>(null)

  const loadSites = useCallback(async () => {
    setLoadingSites(true)
    try {
      const archivedParam = showArchivedSites ? 'true' : 'false'
      const response = await fetch(`/api/sites?archived=${archivedParam}&with_machines=true`)
      const data = await response.json()

      if (data.success) {
        setSites(data.sites)
      }
    } catch (error) {
      console.error('Error loading sites:', error)
    } finally {
      setLoadingSites(false)
      setLoading(false)
    }
  }, [showArchivedSites])

  const loadMetrics = useCallback(async () => {
    setLoadingMetrics(true)
    try {
      const response = await fetch('/api/sites/metrics')
      const data = await response.json()

      if (data.success) {
        setMetrics(data.metrics)
      }
    } catch (error) {
      console.error('Error loading metrics:', error)
    } finally {
      setLoadingMetrics(false)
    }
  }, [])

  useEffect(() => {
    if (sessionLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    if (!user.can_manage_sites && user.role !== 'admin' && user.role !== 'dev') {
      router.push('/dashboard')
      return
    }

    loadSites()
    loadMetrics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionLoading])

  useEffect(() => {
    if (!loading && user) {
      loadSites()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchivedSites, loading, user])

  // Atualizar automaticamente quando alocações mudam
  useAllocationDataRefresh(() => {
    loadSites()
    loadMetrics()
  })

  const handleArchiveSite = (site: Site) => {
    const isArchiving = site.ativo;
    const action = isArchiving ? 'arquivar' : 'desarquivar';

    setConfirmModal({
      isOpen: true,
      title: isArchiving ? 'Arquivar Jobsite' : 'Desarquivar Jobsite',
      message: isArchiving 
        ? `Tem certeza que deseja arquivar o jobsite "${site.title}"?`
        : `Tem certeza que deseja desarquivar o jobsite "${site.title}"?`,
      confirmButtonText: isArchiving ? 'Arquivar' : 'Desarquivar',
      isDangerous: isArchiving,
      isLoading: false,
      error: null,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true, error: null }))
        try {
          const response = await fetch(`/api/sites/${site.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...site,
              ativo: !site.ativo,
            }),
          })

          const data = await response.json()

          if (data.success) {
            setConfirmModal(prev => ({ ...prev, isOpen: false }))
            await loadSites()
            await loadMetrics()
          } else {
            setConfirmModal(prev => ({ ...prev, error: data.message || `Erro ao ${action} obra` }))
          }
        } catch (error) {
          console.error(`Erro ao ${action} site:`, error)
          setConfirmModal(prev => ({ ...prev, error: 'Erro ao conectar com o servidor' }))
        } finally {
          setConfirmModal(prev => ({ ...prev, isLoading: false }))
        }
      }
    })
  }

  const handleGeocode = async () => {
    if (!newSite.address) {
      setModalError('Por favor, insira o endereço antes de geolocalizar')
      return
    }

    setGeocoding(true)
    setGeocodingResult(null)
    setModalError(null)
    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: newSite.address }),
      })
      const data = await response.json()

      if (data.success && data.result) {
        // Validar que temos coordenadas válidas
        if (data.result.latitude && data.result.longitude) {
          setGeocodingResult(data.result)
          setMapCoordinates({ lat: data.result.latitude, lng: data.result.longitude })
        } else {
          setModalError('Erro: A API não retornou coordenadas válidas. Tente um endereço mais específico.')
        }
      } else {
        setModalError(data.message || 'Não foi possível encontrar o endereço. Certifique-se de que o endereço está completo (inclua cidade e estado).')
      }
    } catch (error: any) {
      console.error('Geocoding error:', error)
      setModalError('Erro ao conectar com o serviço de geolocalização. Verifique sua conexão e tente novamente.')
    } finally {
      setGeocoding(false)
    }
  }

  const handleOpenModal = (siteToEdit?: Site) => {
    if (siteToEdit) {
      setEditingSite(siteToEdit)
      setNewSite({
        title: siteToEdit.title,
        address: siteToEdit.address,
      })
      // Se a obra já tem coordenadas, usar elas
      if (siteToEdit.latitude && siteToEdit.longitude) {
        setMapCoordinates({ lat: siteToEdit.latitude, lng: siteToEdit.longitude })
        // Criar um geocodingResult simulado para manter o estado do modal
        setGeocodingResult({
          formatted_address: siteToEdit.address,
          latitude: siteToEdit.latitude,
          longitude: siteToEdit.longitude,
        })
      } else {
        setMapCoordinates(null)
        setGeocodingResult(null)
      }
    } else {
      setEditingSite(null)
      setNewSite({ title: '', address: '' })
      setGeocodingResult(null)
      setMapCoordinates(null)
    }
    setShowCreateModal(true)
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setEditingSite(null)
    setNewSite({ title: '', address: '' })
    setGeocodingResult(null)
    setMapCoordinates(null)
  }

  const handleCreateSite = async () => {
    if (!newSite.title) {
      setModalError('Por favor, insira o nome da obra')
      return
    }

    if (!mapCoordinates) {
      setModalError('Por favor, geolocalize o endereço e confirme a localização no mapa antes de salvar.')
      return
    }

    // Validar que temos coordenadas válidas
    if (!mapCoordinates.lat || !mapCoordinates.lng ||
        isNaN(mapCoordinates.lat) || isNaN(mapCoordinates.lng)) {
      setModalError('Erro: Coordenadas inválidas. Por favor, geolocalize o endereço novamente.')
      return
    }

    setCreating(true)
    setModalError(null)
    try {
      const url = editingSite ? `/api/sites/${editingSite.id}` : '/api/sites'
      const method = editingSite ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSite.title,
          address: newSite.address, // Sempre usar o endereço digitado pelo usuário
          latitude: mapCoordinates.lat,
          longitude: mapCoordinates.lng,
          geocoding_confidence: geocodingResult?.confidence || 0,
          place_type: geocodingResult?.place_type || 'unknown',
          city: geocodingResult?.city || null,
          state: geocodingResult?.state || null,
          zip: geocodingResult?.zip || null,
        }),
      })

      const data = await response.json()

      if (data.success) {
        handleCloseModal()
        loadSites()
        loadMetrics()
      } else {
        setModalError(data.message || 'Erro ao salvar obra')
      }
    } catch (error) {
      console.error('Error saving site:', error)
      setModalError('Erro ao conectar com o servidor')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen md:h-screen md:max-h-screen bg-gray-50 dark:bg-gray-900 pb-safe-content md:pb-0 md:flex md:flex-col md:overflow-hidden">
      <Header />
      <div className="flex md:flex-1 md:overflow-hidden">
        <Sidebar />
        <main className={`flex-1 p-4 md:p-6 md:overflow-hidden md:flex md:flex-col transition-all duration-300 ease-in-out ${isExpanded ? 'md:ml-52' : 'md:ml-16'}`}>
          <div className="w-full md:flex md:flex-col md:flex-1 md:overflow-hidden">
            
            {/* Metrics Cards */}
            <MetricsCards metrics={metrics} loadingMetrics={loadingMetrics} />

            {/* Site List */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col mt-4 md:mt-6">
              <SiteList
                sites={sites}
                loadingSites={loadingSites}
                showArchivedSites={showArchivedSites}
                setShowArchivedSites={setShowArchivedSites}
                loadSites={loadSites}
                handleOpenModal={handleOpenModal}
                handleArchiveSite={handleArchiveSite}
              />
            </div>
          </div>
        </main>
      </div>

      <BottomNavigation />
      {/* Create Site Modal */}
      <CreateSiteModal
        showCreateModal={showCreateModal}
        editingSite={editingSite}
        newSite={newSite}
        setNewSite={setNewSite}
        handleCloseModal={handleCloseModal}
        handleCreateSite={handleCreateSite}
        creating={creating}
        geocoding={geocoding}
        handleGeocode={handleGeocode}
        geocodingResult={geocodingResult}
        setGeocodingResult={setGeocodingResult}
        mapCoordinates={mapCoordinates}
        setMapCoordinates={setMapCoordinates}
        error={modalError}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmButtonText={confirmModal.confirmButtonText}
        cancelButtonText="Cancelar"
        isDangerous={confirmModal.isDangerous}
        isLoading={confirmModal.isLoading}
        error={confirmModal.error}
      />
    </div>
  )
}

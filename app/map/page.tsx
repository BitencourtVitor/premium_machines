'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/app/components/Header'
import Sidebar from '@/app/components/Sidebar'
import BottomNavigation from '@/app/components/BottomNavigation'
import { useSession } from '@/lib/useSession'
import { useSidebar } from '@/lib/useSidebar'
import { useAllocationDataRefresh } from '@/lib/allocationEvents'
import SiteDetailsModal from './components/SiteDetailsModal'
import MachineDetailsModal from '@/app/components/MachineDetailsModal'
import MapControls from './components/MapControls'
import MapLegend from './components/MapLegend'
import { Site } from './types'
import { useMapInitialization } from './hooks/useMapInitialization'
import { useMapMarkers } from './hooks/useMapMarkers'
import { useMapModals } from './hooks/useMapModals'
import { useThemeDetector } from './hooks/useThemeDetector'
import { useDebounce } from '@/app/hooks/useDebounce'

// Mapbox token will be set from env
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

export default function MapPage() {
  const router = useRouter()
  const { user, loading: sessionLoading } = useSession()
  const { isExpanded } = useSidebar()
  
  // Refs
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const headquartersMarkerRef = useRef<any | null>(null)
  const updateMarkersRef = useRef<(() => void) | null>(null)
  
  // State
  const [loading, setLoading] = useState(true)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [markersInitialized, setMarkersInitialized] = useState(false)
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const [mapStyle, setMapStyle] = useState<'map' | 'satellite'>('map')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Filter state
  const [mapFilters, setMapFilters] = useState({
    showHeadquarters: true,
    showJobsites: true,
    statuses: ['maintenance', 'exceeded', 'active', 'scheduled', 'moved', 'finished', 'in_transit', 'none']
  })

  // Filter sites based on search query and map filters
  const filteredSites = useMemo(() => {
    let result = sites

    // Apply Search Query
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase().trim()
      if (query) {
        result = result.filter(site => {
          // 1. Jobsite Name
          if (site.title?.toLowerCase().includes(query)) return true
          
          // 2. Address
          if (site.address?.toLowerCase().includes(query)) return true
          
          // 3. Machines/Extensions (Current, Past and Future)
          const machinesToSearch = site.all_machines || site.machines
          if (machinesToSearch && Array.isArray(machinesToSearch)) {
            return machinesToSearch.some((machine: any) => {
              const unitNumber = machine.unit_number?.toLowerCase() || ''
              const typeName = typeof machine.machine_type === 'object' ? machine.machine_type?.nome : machine.machine_type
              const typeStr = String(typeName || '').toLowerCase()
              
              return unitNumber.includes(query) || typeStr.includes(query)
            })
          }
          
          return false
        })
      }
    }

    // Apply Map Filters
    result = result.filter(site => {
      const isHQ = site.is_headquarters || site.title === 'Premium Group Inc.'
      
      // Headquarters filter
      if (isHQ && !mapFilters.showHeadquarters) return false
      
      // Jobsites filter (non-headquarters)
      if (!isHQ && !mapFilters.showJobsites) return false
      
      // REGRA DE OURO: Se o site tem máquinas, ele DEVE aparecer no mapa.
      // Filtros de status (MapControls) não podem remover o site do mapa, apenas afetar o popup interno.
      const machines = site.all_machines || site.machines || []
      
      // LOG DE AUDITORIA: Garantir que sabemos por que o site está sendo mantido
      if (machines.length > 0) {

      }
      
      if (machines.length === 0) {
        return mapFilters.statuses.includes('none')
      }

      // Se tem máquinas, o site sobrevive ao filtro.
      return true
    })

    return result
  }, [sites, debouncedSearchQuery, mapFilters])

  // Detect theme
  const isDark = useThemeDetector()

  // Hooks
  const {
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
  } = useMapModals({ selectedSite, setSelectedSite })

  const { updateMarkers } = useMapMarkers({
    mapRef: map,
    sites: filteredSites,
    selectedSite,
    setSelectedSite,
    markersRef,
    headquartersMarkerRef
  })

  // Update updateMarkersRef
  useEffect(() => {
    updateMarkersRef.current = updateMarkers
  }, [updateMarkers])

  // Refresh markers when filtered sites change
  useEffect(() => {
    if (mapLoaded && markersInitialized) {
      updateMarkers()
    }
  }, [filteredSites, mapLoaded, markersInitialized, updateMarkers])

  // Load Sites
  const loadSites = useCallback(async () => {
    try {
      const now = new Date();
      // INSTRUMENTAÇÃO: Buscar eventos e sites em paralelo para auditoria total
      const [sitesRes, eventsRes] = await Promise.all([
        fetch(`/api/sites?with_machines=true&t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/events?limit=2000&t=${Date.now()}`, { cache: 'no-store' })
      ])
      
      const sitesData = await sitesRes.json()
      const eventsData = await eventsRes.json()

      if (sitesData.success && sitesData.sites) {


        const activeSites = sitesData.sites.filter((s: any) => 
          s.ativo === true || s.is_headquarters === true
        )
        setSites(activeSites)
      }
    } catch (error) {
      console.error('Error loading sites:', error)
    }
  }, [])

  // Map Event Handlers
  const handleMapLoad = useCallback(() => {
    setMapLoaded(true)
    if (map.current) {
      map.current.resize()
    }
  }, [])

  // Debounced zoom update
  const zoomUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastZoomRef = useRef<number | null>(null)

  const handleZoomUpdate = useCallback(() => {
    const currentZoom = map.current?.getZoom()
    if (currentZoom === undefined || !map.current?.isStyleLoaded()) return
    
    if (lastZoomRef.current !== null && Math.abs(currentZoom - lastZoomRef.current) < 0.05) {
      return
    }
    
    lastZoomRef.current = currentZoom
    
    if (zoomUpdateTimeoutRef.current) {
      clearTimeout(zoomUpdateTimeoutRef.current)
    }
    
    zoomUpdateTimeoutRef.current = setTimeout(() => {
      if (map.current && map.current.isStyleLoaded()) {
        requestAnimationFrame(() => {
          if (map.current && map.current.isStyleLoaded()) {
            updateMarkersRef.current?.()
          }
        })
      }
    }, 200)
  }, [])

  const handleZoomEnd = useCallback(() => {
    const currentZoom = map.current?.getZoom()
    if (currentZoom !== undefined) {
      lastZoomRef.current = currentZoom
    }
    if (zoomUpdateTimeoutRef.current) {
      clearTimeout(zoomUpdateTimeoutRef.current)
      zoomUpdateTimeoutRef.current = null
    }
    if (map.current && map.current.isStyleLoaded()) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (map.current && map.current.isStyleLoaded()) {
            updateMarkersRef.current?.()
            
            // Mobile check and refresh
            const isMobileDevice = typeof window !== 'undefined' && (
              window.innerWidth < 768 || 
              /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            )
            if (isMobileDevice) {
              setTimeout(() => {
                loadSites()
              }, 300)
            }
          }
        })
      })
    }
  }, [loadSites])

  const handleMoveEnd = useCallback(() => {
    const currentZoom = map.current?.getZoom()
    if (currentZoom !== undefined) {
      const previousZoom = lastZoomRef.current
      lastZoomRef.current = currentZoom
      
      if (previousZoom === null || Math.abs(currentZoom - previousZoom) >= 0.05) {
        if (zoomUpdateTimeoutRef.current) {
          clearTimeout(zoomUpdateTimeoutRef.current)
          zoomUpdateTimeoutRef.current = null
        }
        if (map.current && map.current.isStyleLoaded()) {
          updateMarkersRef.current?.()
        }
      }
    }
  }, [])

  const handleClick = useCallback((e: any) => {
    const target = e.originalEvent.target as HTMLElement
    if (!target.closest('.marker-container')) {
      setSelectedSite(null)
    }
  }, [])

  // Initialize Map
  useMapInitialization({
    mapContainer,
    mapRef: map,
    mapStyle,
    mapboxToken: MAPBOX_TOKEN,
    onMapLoad: handleMapLoad,
    onZoomUpdate: handleZoomUpdate,
    onZoomEnd: handleZoomEnd,
    onMoveEnd: handleMoveEnd,
    onClick: handleClick,
    isDark
  })

  // Effects
  useEffect(() => {
    if (sessionLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    if (user.role === 'admin' || user.role === 'dev') {
      setLoading(true)
      loadSites().finally(() => {
        setLoading(false)
      })
      return
    }

    if (!user.can_view_map) {
      import('@/lib/session').then(({ clearSession }) => {
        clearSession()
        router.push('/login')
      })
      return
    }

    setLoading(true)
    loadSites().finally(() => {
      setLoading(false)
    })
  }, [user, sessionLoading, router, loadSites])

  // Refresh data on allocation changes
  useAllocationDataRefresh(() => {
    loadSites()
  })

  // Update updateMarkersRef
  useEffect(() => {
    updateMarkersRef.current = updateMarkers
  }, [updateMarkers])

  // Initial markers update
  useEffect(() => {
    if (!map.current || !mapLoaded) return
    
    const runUpdate = () => {
      updateMarkers()
      setMarkersInitialized(true)
    }
    
    if (map.current.isStyleLoaded()) {
      runUpdate()
    } else {
      map.current.once('style.load', () => {
        runUpdate()
      })
    }
  }, [sites, mapLoaded, selectedSite, updateMarkers, isDark])

  // Cleanup
  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
        setMapLoaded(false)
      }
    }
  }, [])

  const toggleMapStyle = useCallback(() => {
    setMapStyle(prev => prev === 'satellite' ? 'map' : 'satellite')
  }, [])

  return (
    <div className="min-h-screen md:h-screen md:max-h-screen bg-gray-50 dark:bg-gray-900 pb-safe-content md:pb-0 md:flex md:flex-col md:overflow-hidden">
      <Header title="Mapa" />
      <div className="flex md:flex-1 md:overflow-hidden">
        <Sidebar />
        <main className={`relative flex-1 p-4 md:p-6 transition-all duration-300 ease-in-out md:flex md:flex-col md:overflow-hidden ${isExpanded ? 'md:ml-52' : 'md:ml-16'}`} style={{ minHeight: 'calc(100vh - 200px)' }}>
          <div className="relative w-full h-full rounded-lg overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700" style={{ minHeight: '400px' }}>
            {/* Map Container */}
            <div ref={mapContainer} className="map-container w-full h-full" />

            {/* Loading Overlay */}
            {(loading || !mapLoaded || !markersInitialized) && (
              <div className="absolute inset-0 bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center z-50">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400 font-medium animate-pulse">
                  {loading ? 'Carregando dados...' : (!mapLoaded ? 'Inicializando mapa...' : 'Gerando marcadores...')}
                </p>
              </div>
            )}

            {/* Controls */}
            <MapControls 
              mapStyle={mapStyle} 
              toggleMapStyle={toggleMapStyle} 
              onSearch={setSearchQuery} 
              filters={mapFilters}
              setFilters={setMapFilters}
            />
            
            {/* Legend */}
            <MapLegend isDark={isDark} />
          </div>
        </main>
      </div>

      <SiteDetailsModal
        isOpen={showSiteDetailsModal}
        onClose={() => setShowSiteDetailsModal(false)}
        site={siteDetails}
        events={siteEvents}
        allocations={siteAllocations}
        loading={loadingSiteDetails}
      />

      <MachineDetailsModal
        isOpen={showMachineDetailsModal}
        onClose={() => setShowMachineDetailsModal(false)}
        machine={machineDetails}
        events={machineEvents}
        allocations={machineAllocations}
        loading={loadingMachineDetails}
      />

      <BottomNavigation />
    </div>
  )
}

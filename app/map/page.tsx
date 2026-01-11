'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import mapboxgl from 'mapbox-gl'
import Header from '@/app/components/Header'
import Sidebar from '@/app/components/Sidebar'
import BottomNavigation from '@/app/components/BottomNavigation'
import { useSession } from '@/lib/useSession'
import { useSidebar } from '@/lib/useSidebar'
import { useAllocationDataRefresh } from '@/lib/allocationEvents'
import SiteDetailsModal from './components/SiteDetailsModal'
import MachineDetailsModal from './components/MachineDetailsModal'
import MapControls from './components/MapControls'
import { Site } from './types'
import { useMapInitialization } from './hooks/useMapInitialization'
import { useMapMarkers } from './hooks/useMapMarkers'
import { useMapModals } from './hooks/useMapModals'

// Mapbox token will be set from env
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

export default function MapPage() {
  const router = useRouter()
  const { user, loading: sessionLoading } = useSession()
  const { isExpanded } = useSidebar()
  
  // Refs
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const spiderLinesRef = useRef<HTMLDivElement[]>([])
  const spiderMoveHandlersRef = useRef<(() => void)[]>([])
  const headquartersMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const lastAnimatedSpiderfyRef = useRef<string | null>(null)
  const originalGroupsRef = useRef<Map<string, { center: { lng: number; lat: number }; sites: Site[]; id: string }>>(new Map())
  const previousSitesIdsRef = useRef<string>('')
  const updateMarkersRef = useRef<(() => void) | null>(null)
  
  // State
  const [spiderfiedGroup, setSpiderfiedGroup] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [sites, setSites] = useState<Site[]>([])
  const [selectedMachine, setSelectedMachine] = useState<any | null>(null)
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const [mapStyle, setMapStyle] = useState<'map' | 'satellite'>('map')

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

  const { updateMarkers, clearSpiderLines } = useMapMarkers({
    mapRef: map,
    sites,
    selectedSite,
    setSelectedSite,
    spiderfiedGroup,
    setSpiderfiedGroup,
    markersRef,
    headquartersMarkerRef,
    spiderLinesRef,
    spiderMoveHandlersRef,
    lastAnimatedSpiderfyRef,
    originalGroupsRef,
    previousSitesIdsRef
  })

  // Load Sites
  const loadSites = useCallback(async () => {
    try {
      const response = await fetch('/api/sites?with_machines=true')
      const data = await response.json()

      if (data.success && data.sites) {
        const activeSites = data.sites.filter((s: any) => 
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
    setLoading(false)
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

  const handleClick = useCallback((e: mapboxgl.MapMouseEvent) => {
    const target = e.originalEvent.target as HTMLElement
    if (!target.closest('.marker-container')) {
      lastAnimatedSpiderfyRef.current = null
      setSpiderfiedGroup(null)
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
    onClick: handleClick
  })

  // Effects
  useEffect(() => {
    if (sessionLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    if (user.role === 'admin' || user.role === 'dev') {
      loadSites()
      setLoading(false)
      return
    }

    if (!user.can_view_map) {
      import('@/lib/session').then(({ clearSession }) => {
        clearSession()
        router.push('/login')
      })
      return
    }

    loadSites()
    setLoading(false)
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
    
    if (map.current.isStyleLoaded()) {
      updateMarkers()
    } else {
      map.current.once('style.load', () => {
        updateMarkers()
      })
    }
  }, [sites, mapLoaded, spiderfiedGroup, selectedSite, updateMarkers])

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
        <main className={`relative flex-1 p-4 md:p-6 transition-all duration-250 ease-in-out md:flex md:flex-col md:overflow-hidden ${isExpanded ? 'md:ml-48 lg:ml-64' : 'md:ml-16 lg:ml-20'}`} style={{ minHeight: 'calc(100vh - 200px)' }}>
          <div className="relative w-full h-full rounded-lg overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700" style={{ minHeight: '400px' }}>
            {/* Map Container */}
            <div ref={mapContainer} className="map-container w-full h-full" />

            {/* Loading Overlay */}
            {loading && (
              <div className="absolute inset-0 bg-gray-50 dark:bg-gray-900 flex items-center justify-center z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-gray-400"></div>
              </div>
            )}

            {/* Controls */}
            <MapControls mapStyle={mapStyle} toggleMapStyle={toggleMapStyle} />
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

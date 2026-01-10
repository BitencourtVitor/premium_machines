'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import mapboxgl from 'mapbox-gl'
import Header from '../components/Header'
import BottomNavigation from '../components/BottomNavigation'
import Sidebar from '../components/Sidebar'
import CustomInput from '../components/CustomInput'
import { useSession } from '@/lib/useSession'
import { useSidebar } from '@/lib/useSidebar'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

// Função para remover "Estados Unidos da América" ou "United States" do endereço
const cleanAddress = (address: string): string => {
  if (!address) return address
  return address
    .replace(/,?\s*Estados Unidos da América/gi, '')
    .replace(/,?\s*United States/gi, '')
    .replace(/,?\s*USA/gi, '')
    .replace(/,?\s*US$/gi, '')
    .trim()
    .replace(/,\s*$/, '') // Remove vírgula final se houver
}

interface Site {
  id: string
  title: string
  address: string
  city?: string
  state?: string
  latitude?: number
  longitude?: number
  ativo: boolean
  machines_count: number
  created_at: string
  is_headquarters?: boolean
}

export default function SitesPage() {
  const router = useRouter()
  const { user, loading: sessionLoading } = useSession()
  const { isExpanded } = useSidebar()
  const [loading, setLoading] = useState(true)
  const [loadingSites, setLoadingSites] = useState(false)
  const [sites, setSites] = useState<Site[]>([])
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  const [metrics, setMetrics] = useState({
    totalActiveSites: 0,
    totalMachinesAllocated: 0,
    pendingAllocations: 0,
    machinesWithIssues: 0,
    archivedSites: 0,
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [showArchivedSites, setShowArchivedSites] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [creating, setCreating] = useState(false)
  const [newSite, setNewSite] = useState({
    title: '',
    address: '',
  })
  const [geocoding, setGeocoding] = useState(false)
  const [geocodingResult, setGeocodingResult] = useState<any>(null)
  const [mapCoordinates, setMapCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const mapModalContainer = useRef<HTMLDivElement>(null)
  const mapModal = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const themeObserverRef = useRef<MutationObserver | null>(null)
  const mediaQueryRef = useRef<MediaQueryList | null>(null)

  const loadSites = useCallback(async () => {
    setLoadingSites(true)
    try {
      const archivedParam = showArchivedSites ? 'true' : 'false'
      const response = await fetch(`/api/sites?archived=${archivedParam}`)
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

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.relative')) {
        setShowSearchDropdown(false)
      }
    }

    if (showSearchDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSearchDropdown])

  const handleArchiveSite = async (site: Site) => {
    if (!confirm(`Are you sure you want to ${site.ativo ? 'archive' : 'unarchive'} this jobsite?`)) {
      return
    }

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
        loadSites()
      } else {
        alert(data.message || 'Error archiving jobsite')
      }
    } catch (error) {
      console.error('Error archiving site:', error)
      alert('Error connecting to server')
    }
  }

  const handleGeocode = async () => {
    if (!newSite.address) {
      alert('Please enter the address before geocoding')
      return
    }

    setGeocoding(true)
    setGeocodingResult(null)
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
          alert('Error: The API did not return valid coordinates. Try a more specific address.')
        }
      } else {
        alert(data.message || 'Could not find the address. Please make sure the address is complete (include city and state).')
      }
    } catch (error: any) {
      console.error('Geocoding error:', error)
      alert('Error connecting to geocoding service. Check your connection and try again.')
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
    if (mapModal.current) {
      mapModal.current.remove()
      mapModal.current = null
    }
    if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }
  }

  const handleCreateSite = async () => {
    if (!newSite.title) {
      alert('Please enter the jobsite name')
      return
    }

    if (!mapCoordinates) {
      alert('Please geocode the address and confirm the location on the map before saving.')
      return
    }

    // Validar que temos coordenadas válidas
    if (!mapCoordinates.lat || !mapCoordinates.lng ||
        isNaN(mapCoordinates.lat) || isNaN(mapCoordinates.lng)) {
      alert('Error: Invalid coordinates. Please geocode the address again.')
      return
    }

    setCreating(true)
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
          country: geocodingResult?.country || null,
        }),
      })

      const data = await response.json()

      if (data.success) {
        handleCloseModal()
        loadSites()
        // Limpar mapa
        if (mapModal.current) {
          mapModal.current.remove()
          mapModal.current = null
        }
        if (markerRef.current) {
          markerRef.current.remove()
          markerRef.current = null
        }
        loadSites()
      } else {
        alert(data.message || 'Error creating jobsite')
      }
    } catch (error: any) {
      console.error('Error creating site:', error)
      alert('Error creating jobsite. Check your connection and try again.')
    } finally {
      setCreating(false)
    }
  }

  // Inicializar mapa no modal
  useEffect(() => {
    if (!showCreateModal || !mapCoordinates || !mapModalContainer.current) {
      // Se o modal fechou, limpar o mapa
      if (!showCreateModal && mapModal.current) {
        mapModal.current.remove()
        mapModal.current = null
      }
      return
    }

    mapboxgl.accessToken = MAPBOX_TOKEN

    if (!MAPBOX_TOKEN) {
      console.warn('MAPBOX_TOKEN não configurado')
      return
    }

    // Se o mapa já existe, apenas redimensionar e atualizar posição
    if (mapModal.current) {
      setTimeout(() => {
        if (mapModal.current) {
          mapModal.current.resize()
          if (markerRef.current && mapCoordinates) {
            markerRef.current.setLngLat([mapCoordinates.lng, mapCoordinates.lat])
            mapModal.current.flyTo({
              center: [mapCoordinates.lng, mapCoordinates.lat],
              zoom: 15,
            })
          }
        }
      }, 200)
      return
    }

    // Pequeno delay para garantir que o container está renderizado e tem dimensões
    let timer: NodeJS.Timeout | null = null
    
    const createMapInModal = () => {
      if (!mapModalContainer.current || mapModal.current) return

      // Detectar tema atual para o mapa
      const currentIsDark = typeof window !== 'undefined' && (
        document.documentElement.classList.contains('dark') ||
        localStorage.theme === 'dark' ||
        (!localStorage.theme && window.matchMedia('(prefers-color-scheme: dark)').matches)
      )
      
      // Criar mapa com estilo baseado no tema
      mapModal.current = new mapboxgl.Map({
        container: mapModalContainer.current,
        style: currentIsDark 
          ? 'mapbox://styles/mapbox/dark-v11'
          : 'mapbox://styles/mapbox/streets-v12',
        center: [mapCoordinates.lng, mapCoordinates.lat],
        zoom: 15,
      })

      // Adicionar controles
      mapModal.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

      // Garantir que o mapa redimensione corretamente após carregar
      mapModal.current.once('load', () => {
        if (mapModal.current) {
          // Múltiplos resize para garantir que funcione
          setTimeout(() => {
            if (mapModal.current) {
              mapModal.current.resize()
              // Segundo resize após um pequeno delay adicional
              setTimeout(() => {
                if (mapModal.current) {
                  mapModal.current.resize()
                }
              }, 50)
            }
          }, 150)
        }
      })

      // Cores adaptativas ao tema (azul para novo jobsite)
      const pinColor = currentIsDark ? '#60A5FA' : '#2563EB' // blue-400 : blue-600
      
      // Criar marcador arrastável - estilo agulha com bola (bola maior para melhor visibilidade)
      const el = document.createElement('div')
      el.className = 'custom-marker'
      el.style.cursor = 'grab'
      el.style.width = '24px'
      el.style.height = '36px'
      el.style.position = 'relative'
      el.innerHTML = `
        <div style="position: relative; width: 100%; height: 100%;">
          <!-- Bola no topo (aumentada) -->
          <div style="position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 18px; height: 18px; border-radius: 50%; background-color: ${pinColor}; border: 2px solid white; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);"></div>
          <!-- Agulha (linha fina) -->
          <div style="position: absolute; top: 16px; left: 50%; transform: translateX(-50%); width: 2px; height: 20px; background-color: ${pinColor};"></div>
        </div>
      `
      
      // Listener para atualizar estilo do mapa quando o tema mudar
      const updateMapStyle = () => {
        if (!mapModal.current) return
        
        const isDark = document.documentElement.classList.contains('dark') ||
          localStorage.theme === 'dark' ||
          (!localStorage.theme && window.matchMedia('(prefers-color-scheme: dark)').matches)
        
        const newStyle = isDark 
          ? 'mapbox://styles/mapbox/dark-v11'
          : 'mapbox://styles/mapbox/streets-v12'
        
        mapModal.current.setStyle(newStyle)
      }
      
      // Observar mudanças no tema
      themeObserverRef.current = new MutationObserver(updateMapStyle)
      themeObserverRef.current.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      })
      
      mediaQueryRef.current = window.matchMedia('(prefers-color-scheme: dark)')
      // Armazenar a função para poder remover depois
      const mediaQueryHandler = updateMapStyle
      mediaQueryRef.current.addEventListener('change', mediaQueryHandler)
      
      // Armazenar handler para cleanup
      ;(mediaQueryRef.current as any)._handler = mediaQueryHandler

      markerRef.current = new mapboxgl.Marker({
        element: el,
        draggable: true,
        anchor: 'bottom', // Ancorar na ponta inferior da agulha
      })
        .setLngLat([mapCoordinates.lng, mapCoordinates.lat])
        .addTo(mapModal.current)

      // Atualizar coordenadas quando o marcador for arrastado
      markerRef.current.on('dragend', () => {
        const lngLat = markerRef.current!.getLngLat()
        setMapCoordinates({ lat: lngLat.lat, lng: lngLat.lng })
      })
    }
    
    timer = setTimeout(() => {
      if (!mapModalContainer.current || mapModal.current) return
      
      // Verificar se o container tem dimensões válidas
      const rect = mapModalContainer.current.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) {
        // Tentar novamente após um delay maior
        setTimeout(() => {
          if (mapModalContainer.current && !mapModal.current) {
            const retryRect = mapModalContainer.current.getBoundingClientRect()
            if (retryRect.width > 0 && retryRect.height > 0) {
              createMapInModal()
            }
          }
        }, 300)
        return
      }
      
      createMapInModal()
    }, 200)

    return () => {
      if (timer) clearTimeout(timer)
      if (themeObserverRef.current) {
        themeObserverRef.current.disconnect()
        themeObserverRef.current = null
      }
      if (mediaQueryRef.current && (mediaQueryRef.current as any)._handler) {
        mediaQueryRef.current.removeEventListener('change', (mediaQueryRef.current as any)._handler)
        mediaQueryRef.current = null
      }
      if (mapModal.current) {
        mapModal.current.remove()
        mapModal.current = null
      }
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
    }
  }, [showCreateModal, mapCoordinates])

  // Atualizar posição do marcador quando coordenadas mudarem (após geocodificação)
  useEffect(() => {
    if (mapModal.current && markerRef.current && mapCoordinates) {
      markerRef.current.setLngLat([mapCoordinates.lng, mapCoordinates.lat])
      mapModal.current.flyTo({
        center: [mapCoordinates.lng, mapCoordinates.lat],
        zoom: 15,
      })
    }
  }, [mapCoordinates])

  // Garantir que o mapa redimensione quando o modal abrir
  useEffect(() => {
    if (showCreateModal && mapModal.current && mapModalContainer.current) {
      // Aguardar um pouco para garantir que o modal está totalmente renderizado
      const resizeTimer = setTimeout(() => {
        if (mapModal.current && mapModalContainer.current) {
          // Verificar se o container tem dimensões válidas
          const rect = mapModalContainer.current.getBoundingClientRect()
          if (rect.width > 0 && rect.height > 0) {
            mapModal.current.resize()
          }
        }
      }, 200)

      return () => clearTimeout(resizeTimer)
    }
  }, [showCreateModal])

  const filteredSites = sites.filter(site => {
    // Excluir sede da lista de obras
    if (site.is_headquarters) {
      return false
    }
    
    // Aplicar filtro de busca
    if (searchQuery.trim()) {
      return (
        site.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.city?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-gray-400"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen md:h-screen md:max-h-screen bg-gray-50 dark:bg-gray-900 pb-safe-content md:pb-0 md:flex md:flex-col md:overflow-hidden overflow-x-hidden">
      <Header title="Jobsites" />
      <div className="flex md:flex-1 md:overflow-hidden">
        <Sidebar />
        <main className={`flex-1 p-4 md:p-6 md:overflow-hidden md:flex md:flex-col transition-all duration-250 ease-in-out ${isExpanded ? 'md:ml-48 lg:ml-64' : 'md:ml-16 lg:ml-20'} min-w-0 max-w-full overflow-x-hidden`}>
          <div className="max-w-7xl mx-auto md:flex md:flex-col md:flex-1 md:overflow-hidden md:w-full w-full min-w-0">
            {/* Métricas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 flex-shrink-0 min-w-0">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden min-w-0">
                <div className="p-3 md:p-4">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">Jobsites Ativos</p>
                      <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {loadingMetrics ? '...' : metrics.totalActiveSites}
                      </p>
                    </div>
                    <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-1.5 md:p-2 flex-shrink-0">
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden min-w-0">
                <div className="p-3 md:p-4">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">Máquinas Alocadas</p>
                      <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {loadingMetrics ? '...' : metrics.totalMachinesAllocated}
                      </p>
                    </div>
                    <div className="bg-green-100 dark:bg-green-900 rounded-full p-1.5 md:p-2 flex-shrink-0">
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden min-w-0">
                <div className="p-3 md:p-4">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">Alocações Pendentes</p>
                      <p className={`text-xl md:text-2xl font-bold mt-1 ${metrics.pendingAllocations > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}>
                        {loadingMetrics ? '...' : metrics.pendingAllocations}
                      </p>
                    </div>
                    <div className={`rounded-full p-1.5 md:p-2 flex-shrink-0 ${metrics.pendingAllocations > 0 ? 'bg-yellow-100 dark:bg-yellow-900' : 'bg-gray-100 dark:bg-gray-700'}`}>
                      <svg className={`w-4 h-4 md:w-5 md:h-5 ${metrics.pendingAllocations > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden min-w-0">
                <div className="p-3 md:p-4">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">Máquinas com Problemas</p>
                      <p className={`text-xl md:text-2xl font-bold mt-1 ${metrics.machinesWithIssues > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                        {loadingMetrics ? '...' : metrics.machinesWithIssues}
                      </p>
                    </div>
                    <div className={`rounded-full p-1.5 md:p-2 flex-shrink-0 ${metrics.machinesWithIssues > 0 ? 'bg-red-100 dark:bg-red-900' : 'bg-gray-100 dark:bg-gray-700'}`}>
                      <svg className={`w-4 h-4 md:w-5 md:h-5 ${metrics.machinesWithIssues > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de Jobsites */}
            {(
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden min-w-0">
                <div className="p-3 md:p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 gap-2 min-w-0">
                  <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate min-w-0 flex-1">
                    {showArchivedSites ? 'Jobsites Arquivados' : 'Jobsites'} ({filteredSites.length})
                  </h2>
                  <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                    <div className="relative">
                      <button
                        onClick={() => setShowSearchDropdown(!showSearchDropdown)}
                        className={`p-1.5 md:p-2 rounded-lg transition-colors flex-shrink-0 ${
                          searchQuery.trim()
                            ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
                            : showSearchDropdown
                            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-gray-700'
                            : 'text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        title="Buscar"
                      >
                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                      {showSearchDropdown && (
                        <div className="absolute top-full right-0 mt-2 w-56 md:w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-10">
                          <div className="relative">
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Buscar jobsites..."
                              className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              autoFocus
                            />
                            {searchQuery && (
                              <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                title="Limpar busca"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={loadSites}
                      className="p-1.5 md:p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
                      disabled={loadingSites}
                      title="Atualizar"
                    >
                      {loadingSites ? (
                        <svg className="w-4 h-4 md:w-5 md:h-5 animate-spin-reverse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => setShowArchivedSites(!showArchivedSites)}
                      className={`p-1.5 md:p-2 rounded-lg transition-colors flex-shrink-0 ${
                        showArchivedSites
                          ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
                          : 'text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title={showArchivedSites ? 'Mostrar Obras Ativas' : 'Mostrar Obras Arquivadas'}
                    >
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </button>
                    {!showArchivedSites && (
                      <button 
                        onClick={() => handleOpenModal()}
                        className="p-1.5 md:p-2 text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
                        title="Novo Jobsite"
                      >
                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

              {loadingSites ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-gray-400"></div>
                </div>
              ) : filteredSites.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchQuery ? 'Nenhum jobsite encontrado' : 'Nenhum jobsite cadastrado'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700 md:flex-1 md:overflow-y-auto min-w-0">
                  {filteredSites.map((site) => (
                    <div
                      key={site.id}
                      className="p-3 md:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-w-0"
                    >
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div 
                          className="flex-1 min-w-0"
                        >
                          <p className="font-medium text-gray-900 dark:text-white truncate">{site.title}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                            {cleanAddress(site.address)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                          <div className="text-center hidden sm:block">
                            <p className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {site.machines_count || 0}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">máquinas</p>
                          </div>
                          <div className="text-center sm:hidden">
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              {site.machines_count || 0}
                            </p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">máq</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenModal(site)
                            }}
                            className="p-1.5 md:p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors flex-shrink-0"
                            title="Editar"
                          >
                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleArchiveSite(site)
                            }}
                            className={`p-1.5 md:p-2 rounded-lg transition-colors flex-shrink-0 ${
                              site.ativo
                                ? 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30'
                                : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
                            }`}
                            title={site.ativo ? 'Arquivar' : 'Desarquivar'}
                          >
                            {site.ativo ? (
                              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            )}

          </div>
        </main>
      </div>

      <BottomNavigation />

      {/* Create Site Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 md:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl my-4 md:my-8 min-w-0 max-w-[calc(100vw-1.5rem)] md:max-w-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingSite ? 'Editar Jobsite' : 'Novo Jobsite'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome do Jobsite
                </label>
                <input
                  type="text"
                  value={newSite.title}
                  onChange={(e) => setNewSite({ ...newSite, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Ex: Jobsite Residencial Alpha"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Endereço
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSite.address}
                    onChange={(e) => {
                      setNewSite({ ...newSite, address: e.target.value })
                      setGeocodingResult(null)
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Rua, número, bairro, cidade"
                  />
                  <button
                    onClick={handleGeocode}
                    disabled={geocoding || !newSite.address}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50 transition-colors"
                  >
                    {geocoding ? (
                      <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {geocodingResult && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200 flex items-center gap-1">
                        Endereço encontrado
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                        {cleanAddress(geocodingResult.formatted_address)}
                      </p>
                      {mapCoordinates && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          <span className="font-medium">Coordenadas:</span> {mapCoordinates.lat.toFixed(6)}, {mapCoordinates.lng.toFixed(6)}
                        </p>
                      )}
                      <p className="text-xs text-green-500 dark:text-green-500 mt-1">
                        Confiança: {Math.round((geocodingResult.confidence || 0) * 100)}%
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Arraste o pin no mapa abaixo para ajustar a localização
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Mapa para confirmação de localização */}
              {mapCoordinates && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirme a localização no mapa
                  </label>
                  <div 
                    ref={mapModalContainer}
                    className="w-full h-64 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600"
                    style={{ minHeight: '256px' }}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateSite}
                disabled={creating || !newSite.title || !mapCoordinates}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={!mapCoordinates ? 'É necessário geocodificar o endereço e confirmar a localização no mapa antes de salvar' : ''}
              >
                {creating ? (editingSite ? 'Salvando...' : 'Criando...') : (editingSite ? 'Salvar Alterações' : 'Criar Jobsite')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

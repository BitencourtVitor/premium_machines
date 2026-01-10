'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import mapboxgl from 'mapbox-gl'
import Header from '../components/Header'
import BottomNavigation from '../components/BottomNavigation'
import Sidebar from '../components/Sidebar'
import { useSession } from '@/lib/useSession'
import { useSidebar } from '@/lib/useSidebar'
import { MACHINE_STATUS_LABELS } from '@/lib/permissions'

// Mapbox token will be set from env
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

interface Site {
  id: string
  title: string
  latitude: number
  longitude: number
  address?: string
  city?: string
  machines_count: number
  machines: any[]
  is_headquarters?: boolean
}

export default function MapPage() {
  const router = useRouter()
  const { user, loading: sessionLoading } = useSession()
  const { isExpanded } = useSidebar()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const spiderLinesRef = useRef<HTMLDivElement[]>([])
  const spiderMoveHandlersRef = useRef<(() => void)[]>([])
  const headquartersMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const userSelectedStyle = useRef<'map' | 'satellite' | null>(null)
  const resizeHandlersRef = useRef<(() => void)[]>([])
  const lastAnimatedSpiderfyRef = useRef<string | null>(null) // Rastrear qual grupo já foi animado
  const originalGroupsRef = useRef<Map<string, { center: { lng: number; lat: number }; sites: Site[]; id: string }>>(new Map()) // Armazenar grupos originais
  const previousSitesIdsRef = useRef<string>('') // Rastrear IDs dos sites para detectar mudanças
  const updateMarkersRef = useRef<(() => void) | null>(null) // Ref para updateMarkers para uso nos listeners
  const [spiderfiedGroup, setSpiderfiedGroup] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Inicializar estilo como 'map' (que será claro/escuro baseado no tema)
  const [mapStyle, setMapStyle] = useState<'map' | 'satellite'>('map')

  // Estados para drag and drop do painel
  const [isDragging, setIsDragging] = useState(false)
  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number } | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [panelStart, setPanelStart] = useState({ x: 0, y: 0 })
  const panelRef = useRef<HTMLDivElement>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  // Calcular posição inicial do handle baseada no painel
  const getInitialHandlePosition = useCallback(() => {
    if (!panelRef.current) return { x: 0, y: 0 }

    const panelRect = panelRef.current.getBoundingClientRect()
    const handleWidth = 96 // 25% de 384px
    const handleHeight = 48 // h-12

    // Handle fica acima do painel, centralizado na largura
    const handleX = panelRect.left + (panelRect.width - handleWidth) / 2
    const handleY = panelRect.top - handleHeight

    return { x: handleX, y: handleY }
  }, [])

  const loadSites = useCallback(async () => {
    try {
      // Buscar todos os sites ativos (inclui sede automaticamente)
      const response = await fetch('/api/sites?with_machines=true')
      const data = await response.json()

      if (data.success && data.sites) {
        // Filtrar apenas sites ativos e a sede
        const activeSites = data.sites.filter((s: any) => 
          s.ativo === true || s.is_headquarters === true
        )
        setSites(activeSites)
      }
    } catch (error) {
      console.error('Error loading sites:', error)
    }
  }, [])

  const initializeMap = useCallback(() => {
    if (!mapContainer.current || map.current) return

    // Garantir que o container tenha dimensões antes de inicializar
    const container = mapContainer.current
    const rect = container.getBoundingClientRect()
    
    // Se o container não tem dimensões, aguardar um pouco e tentar novamente
    if (rect.width === 0 || rect.height === 0) {
      setTimeout(() => initializeMap(), 100)
      return
    }

    mapboxgl.accessToken = MAPBOX_TOKEN

    // Determinar estilo: satélite ou mapa (claro/escuro baseado no tema)
    let styleUrl = 'mapbox://styles/mapbox/streets-v12'
    if (mapStyle === 'satellite') {
      styleUrl = 'mapbox://styles/mapbox/satellite-streets-v12'
    } else {
      // Estilo 'map' - detectar tema do sistema
      const currentIsDark = typeof window !== 'undefined' && (
        document.documentElement.classList.contains('dark') ||
        localStorage.theme === 'dark' ||
        (!localStorage.theme && window.matchMedia('(prefers-color-scheme: dark)').matches)
      )
      styleUrl = currentIsDark 
        ? 'mapbox://styles/mapbox/dark-v11'
        : 'mapbox://styles/mapbox/streets-v12'
    }

    // Detectar se é mobile para ajustar zoom
    const isMobile = typeof window !== 'undefined' && (
      window.innerWidth < 768 || 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    )
    
    // Zoom mais retraído em mobile (ajustado para 6.0)
    const initialZoom = isMobile ? 6.0 : 7.5

    map.current = new mapboxgl.Map({
      container: container,
      style: styleUrl,
      center: [-71.5412, 42.1301], // Hopedale, MA - Sede da empresa
      zoom: initialZoom, // Zoom ajustado: mobile mais retraído, desktop normal
      // Configurações específicas para mobile
      touchZoomRotate: true,
      touchPitch: true,
      doubleClickZoom: true,
      dragRotate: false, // Desabilitar rotação por arraste em mobile
      pitchWithRotate: false,
      // Melhorar performance em mobile
      antialias: false,
      preserveDrawingBuffer: false,
    })

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right')

    map.current.on('load', () => {
      setLoading(false)
      setMapLoaded(true)
      // Forçar resize após carregar para garantir que o mapa renderize corretamente
      if (map.current) {
        map.current.resize()
      }
    })

    // Atualizar marcadores quando o zoom mudar (para recalcular clusters)
    // Usar debounce para evitar muitas atualizações durante o zoom
    let zoomUpdateTimeout: NodeJS.Timeout | null = null
    let lastZoom: number | null = null
    
    const handleZoomUpdate = () => {
      const currentZoom = map.current?.getZoom()
      if (currentZoom === undefined || !map.current?.isStyleLoaded()) return
      
      // Se o zoom realmente mudou significativamente
      if (lastZoom !== null && Math.abs(currentZoom - lastZoom) < 0.05) {
        return // Zoom não mudou significativamente (menos de 0.05)
      }
      
      lastZoom = currentZoom
      
      if (zoomUpdateTimeout) {
        clearTimeout(zoomUpdateTimeout)
      }
      
      // Debounce para evitar muitas atualizações durante o zoom
      zoomUpdateTimeout = setTimeout(() => {
        if (map.current && map.current.isStyleLoaded()) {
          // Usar requestAnimationFrame para garantir que o mapa esteja renderizado
          requestAnimationFrame(() => {
            if (map.current && map.current.isStyleLoaded()) {
              updateMarkersRef.current?.()
            }
          })
        }
      }, 200) // Debounce de 200ms para dar tempo do mapa renderizar
    }

    // Listener para zoom (dispara durante o zoom, mais confiável no mobile)
    map.current.on('zoom', handleZoomUpdate)
    
    // Detectar se é mobile para atualização automática após zoom
    const isMobileDevice = typeof window !== 'undefined' && (
      window.innerWidth < 768 || 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    )

    // Listener para zoomend (dispara quando o zoom termina) - mais confiável
    // Este é o evento principal que deve sempre atualizar os marcadores
    map.current.on('zoomend', () => {
      const currentZoom = map.current?.getZoom()
      if (currentZoom !== undefined) {
        lastZoom = currentZoom
      }
      // Limpar timeout anterior e atualizar imediatamente
      if (zoomUpdateTimeout) {
        clearTimeout(zoomUpdateTimeout)
        zoomUpdateTimeout = null
      }
      // Sempre atualizar quando o zoom terminar, mesmo que já tenha sido atualizado
      if (map.current && map.current.isStyleLoaded()) {
        // Usar requestAnimationFrame + pequeno delay para garantir que o mapa esteja totalmente renderizado
        requestAnimationFrame(() => {
          // Aguardar um frame adicional para garantir que as projeções estejam prontas
          requestAnimationFrame(() => {
            if (map.current && map.current.isStyleLoaded()) {
              updateMarkersRef.current?.()
              
              // No mobile, atualizar os sites automaticamente após o zoom
              if (isMobileDevice) {
                // Pequeno delay para garantir que os marcadores foram atualizados primeiro
                setTimeout(() => {
                  loadSites()
                }, 300)
              }
            }
          })
        })
      }
    })
    
    // Listener para moveend (dispara quando o mapa para de se mover, útil no mobile)
    // Atualizar se o zoom mudou durante o movimento
    map.current.on('moveend', () => {
      const currentZoom = map.current?.getZoom()
      if (currentZoom !== undefined) {
        const previousZoom = lastZoom
        lastZoom = currentZoom
        
        // Se o zoom mudou, atualizar marcadores
        if (previousZoom === null || Math.abs(currentZoom - previousZoom) >= 0.05) {
          if (zoomUpdateTimeout) {
            clearTimeout(zoomUpdateTimeout)
            zoomUpdateTimeout = null
          }
          if (map.current && map.current.isStyleLoaded()) {
            updateMarkersRef.current?.()
          }
        }
      }
    })

    // Fechar spiderfy ao clicar no mapa (fora dos marcadores)
    map.current.on('click', (e) => {
      // Verifica se clicou em um marcador
      const target = e.originalEvent.target as HTMLElement
      if (!target.closest('.marker-container')) {
        lastAnimatedSpiderfyRef.current = null // Resetar para permitir animação na próxima vez
        setSpiderfiedGroup(null)
      }
    })

    // Resize handler para ajustar o mapa quando a janela mudar de tamanho
    const handleResize = () => {
      if (map.current) {
        map.current.resize()
      }
    }

    const handleOrientationChange = () => {
      // Aguardar um pouco após mudança de orientação para garantir que o layout foi atualizado
      setTimeout(() => {
        if (map.current) {
          map.current.resize()
        }
      }, 100)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleOrientationChange)
    
    // Armazenar handlers para cleanup
    resizeHandlersRef.current.push(handleResize, handleOrientationChange)
  }, [mapStyle, loadSites])

  // Função para obter cores adaptadas ao tema
  const getThemeColors = (colorType: 'neutral' | 'blue' | 'red' | 'green' | 'yellow' | 'orange' | 'purple', isDark: boolean) => {
    const colors: Record<string, { bg: string; text: string }> = {
      neutral: {
        bg: isDark ? '#374151' : '#6B7280', // gray-700 : gray-500
        text: '#FFFFFF'
      },
      blue: {
        bg: isDark ? '#60A5FA' : '#2563EB', // blue-400 : blue-600
        text: '#FFFFFF'
      },
      red: {
        bg: isDark ? '#F87171' : '#DC2626', // red-400 : red-600
        text: '#FFFFFF'
      },
      green: {
        bg: isDark ? '#4ADE80' : '#16A34A', // green-400 : green-600
        text: '#FFFFFF'
      },
      yellow: {
        bg: isDark ? '#FBBF24' : '#CA8A04', // yellow-400 : yellow-600
        text: '#FFFFFF'
      },
      orange: {
        bg: isDark ? '#FB923C' : '#EA580C', // orange-400 : orange-600
        text: '#FFFFFF'
      },
      purple: {
        bg: isDark ? '#A78BFA' : '#9333EA', // purple-400 : purple-600
        text: '#FFFFFF'
      }
    }
    return colors[colorType] || colors.neutral
  }

  // Função para calcular distância geográfica entre dois pontos (em metros)
  const getGeoDistance = useCallback((lng1: number, lat1: number, lng2: number, lat2: number) => {
    const R = 6371000 // Raio da Terra em metros
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }, [])

  // Função para agrupar sites próximos baseado na distância visual (pixels) na tela
  // Isso torna o agrupamento dinâmico: obras visualmente próximas são agrupadas,
  // independente da distância geográfica real
  const groupNearbySites = useCallback((sites: Site[], mapInstance: mapboxgl.Map, thresholdPixels: number = 80) => {
    const groups: { center: { lng: number; lat: number }; sites: Site[]; id: string }[] = []
    const processed = new Set<string>()

    // Verificar se o mapa está pronto para projeções
    if (!mapInstance || !mapInstance.isStyleLoaded()) {
      // Se o mapa não está pronto, retornar cada site como grupo individual
      return sites.map(site => ({
        center: { lng: Number(site.longitude), lat: Number(site.latitude) },
        sites: [site],
        id: site.id
      }))
    }

    sites.forEach(site => {
      if (processed.has(site.id)) return

      const group: Site[] = [site]
      processed.add(site.id)

      try {
        // Converter coordenadas do site atual para pixels
        const sitePoint = mapInstance.project([Number(site.longitude), Number(site.latitude)])
        
        // Verificar se a projeção é válida (não está fora da tela ou inválida)
        if (!sitePoint || !isFinite(sitePoint.x) || !isFinite(sitePoint.y)) {
          // Se a projeção falhou, criar grupo individual
          const centerLng = Number(site.longitude)
          const centerLat = Number(site.latitude)
          groups.push({
            center: { lng: centerLng, lat: centerLat },
            sites: group,
            id: site.id
          })
          return
        }

        sites.forEach(otherSite => {
          if (processed.has(otherSite.id)) return
          
          try {
            // Converter coordenadas do outro site para pixels
            const otherSitePoint = mapInstance.project([Number(otherSite.longitude), Number(otherSite.latitude)])
            
            // Verificar se a projeção é válida
            if (!otherSitePoint || !isFinite(otherSitePoint.x) || !isFinite(otherSitePoint.y)) {
              return // Pular este site se a projeção falhou
            }
            
            // Calcular distância em pixels na tela
            const dx = otherSitePoint.x - sitePoint.x
            const dy = otherSitePoint.y - sitePoint.y
            const pixelDistance = Math.sqrt(dx * dx + dy * dy)

            // Sites dentro do threshold em pixels serão agrupados
            // Isso significa que obras visualmente próximas na tela são agrupadas,
            // independente da distância geográfica real
            if (pixelDistance < thresholdPixels) {
              group.push(otherSite)
              processed.add(otherSite.id)
            }
          } catch (error) {
            // Se houver erro na projeção, pular este site
            console.warn('Erro ao projetar coordenadas do site:', otherSite.id, error)
          }
        })
      } catch (error) {
        // Se houver erro na projeção do site principal, criar grupo individual
        console.warn('Erro ao projetar coordenadas do site:', site.id, error)
      }

      // Calcular centro do grupo
      const centerLng = group.reduce((sum, s) => sum + Number(s.longitude), 0) / group.length
      const centerLat = group.reduce((sum, s) => sum + Number(s.latitude), 0) / group.length

      groups.push({
        center: { lng: centerLng, lat: centerLat },
        sites: group,
        id: group.map(s => s.id).sort().join('-')
      })
    })

    return groups
  }, [])

  // Limpar linhas do spider e event handlers
  const clearSpiderLines = useCallback(() => {
    spiderLinesRef.current.forEach(line => line.remove())
    spiderLinesRef.current = []
    
    // Remover event handlers de movimento, zoom e render
    if (map.current) {
      spiderMoveHandlersRef.current.forEach(handler => {
        map.current?.off('move', handler)
        map.current?.off('zoom', handler)
        map.current?.off('render', handler)
      })
    }
    spiderMoveHandlersRef.current = []
  }, [])

  // Criar marcador com ícone map-pin do Phosphor Icons para jobsites individuais
  const createLocationMarker = useCallback((site: Site, currentIsDark: boolean, onClick: (e?: Event) => void, isSelected: boolean = false) => {
    // Cor baseada na condição das máquinas (não muda quando selecionado)
    const baseColorType = site.machines_count > 0 ? 'blue' : 'neutral'
    const colors = getThemeColors(baseColorType, currentIsDark)
    // Borda: 1px normal, 2px selecionado (em escala de viewBox 256 → 32px, multiplicar por 8)
    const strokeWidth = isSelected ? 16 : 8
    const el = document.createElement('div')
    el.className = 'marker-container'
    el.style.cursor = 'pointer'
    el.style.width = '32px'
    el.style.height = '40px'
    el.style.zIndex = isSelected ? '1002' : '1000'
    el.innerHTML = `
      <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
        <svg width="32" height="40" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); overflow: visible;">
          <path d="M128,16a88.1,88.1,0,0,0-88,88c0,75.3,80,132.17,83.41,134.55a8,8,0,0,0,9.18,0C136,236.17,216,179.3,216,104A88.1,88.1,0,0,0,128,16Zm0,56a32,32,0,1,1-32,32A32,32,0,0,1,128,72Z" fill="${colors.bg}" stroke="white" stroke-width="${strokeWidth}"/>
        </svg>
      </div>
    `

    el.addEventListener('click', onClick as EventListener)
    return el
  }, [])

  // Criar marcador com ícone circle do Phosphor Icons para jobsites no spiderfy
  const createSpiderfyMarker = useCallback((site: Site, currentIsDark: boolean, onClick: (e?: Event) => void, isSelected: boolean = false) => {
    // Cor baseada na condição das máquinas (não muda quando selecionado)
    const baseColorType = site.machines_count > 0 ? 'blue' : 'neutral'
    const colors = getThemeColors(baseColorType, currentIsDark)
    // Borda: 1px normal, 2px selecionado (em escala de viewBox 256 → 24px, multiplicar por ~10.7)
    const strokeWidth = isSelected ? 21 : 11
    const el = document.createElement('div')
    el.className = 'marker-container'
    el.style.cursor = 'pointer'
    el.style.width = '24px'
    el.style.height = '24px'
    el.style.zIndex = isSelected ? '1002' : '1000'
    el.innerHTML = `
      <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
        <svg width="24" height="24" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); overflow: visible;">
          <circle cx="128" cy="128" r="112" fill="${colors.bg}" stroke="white" stroke-width="${strokeWidth}"/>
        </svg>
      </div>
    `

    el.addEventListener('click', onClick as EventListener)
    return el
  }, [])

  // Criar marcador em formato de pin/cone para obras (usado no spiderfy)
  const createSitePinMarker = useCallback((site: Site, currentIsDark: boolean, onClick: (e?: Event) => void) => {
    const colors = getThemeColors(site.machines_count > 0 ? 'blue' : 'neutral', currentIsDark)
    const el = document.createElement('div')
    el.className = 'marker-container'
    el.style.cursor = 'pointer'
    el.style.width = '28px'
    el.style.height = '36px'
    el.style.zIndex = '1000'
    el.innerHTML = `
      <div class="relative w-full h-full flex items-center justify-center">
        <div class="relative">
          <div class="w-7 h-7 rounded-full flex items-center justify-center shadow-md border-2 border-white" style="background-color: ${colors.bg};">
          </div>
          <div class="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[7px] border-r-[7px] border-t-[9px] border-l-transparent border-r-transparent" style="border-top-color: ${colors.bg}; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.3));"></div>
        </div>
      </div>
    `

    el.addEventListener('click', onClick as EventListener)
    return el
  }, [])

  const updateMarkers = useCallback(() => {
    const mapInstance = map.current
    if (!mapInstance || !mapInstance.isStyleLoaded()) return

    // Detectar tema atual
    const currentIsDark = typeof window !== 'undefined' && (
      document.documentElement.classList.contains('dark') ||
      localStorage.theme === 'dark' ||
      (!localStorage.theme && window.matchMedia('(prefers-color-scheme: dark)').matches)
    )

    // Separar sede dos jobsites (apenas sites com coordenadas válidas)
    const validSites = sites.filter(site => {
      const lat = Number(site.latitude)
      const lng = Number(site.longitude)
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0
    })
    const headquarters = validSites.find(site => site.is_headquarters)
    const regularSites = validSites.filter(site => !site.is_headquarters)

    // Detectar se os sites mudaram (não apenas zoom)
    const currentSitesIds = regularSites.map(s => s.id).sort().join(',')
    if (previousSitesIdsRef.current !== currentSitesIds) {
      // Sites mudaram, limpar grupos originais para recalcular
      originalGroupsRef.current.clear()
      previousSitesIdsRef.current = currentSitesIds
    }

    // Remover todos os marcadores anteriores
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []
    clearSpiderLines()

    if (headquartersMarkerRef.current) {
      headquartersMarkerRef.current.remove()
      headquartersMarkerRef.current = null
    }

    // Adicionar marcador especial para sede da empresa
    if (headquarters) {
      const colors = getThemeColors('neutral', currentIsDark)
      const isSelected = selectedSite?.id === headquarters.id
      const el = document.createElement('div')
      el.className = 'marker-container'
      el.style.cursor = 'pointer'
      el.style.zIndex = isSelected ? '1002' : '1000'
      // Sede com borda de 1px normal, 2px selecionado
      const borderWidth = isSelected ? '2px' : '1px'
      el.innerHTML = `
        <div class="relative">
          <div class="rounded-lg flex items-center justify-center shadow-md" style="width: 30px; height: 30px; background-color: ${colors.bg}; border: ${borderWidth} solid white;">
            <svg style="width: 15px; height: 15px; color: ${colors.text};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 rotate-45" style="width: 7.5px; height: 7.5px; background-color: ${colors.bg}; border-right: ${borderWidth} solid white; border-bottom: ${borderWidth} solid white;"></div>
        </div>
      `

      el.addEventListener('click', () => {
        setSelectedSite(headquarters)
        setPanelPosition(null)
      })

      headquartersMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([Number(headquarters.longitude), Number(headquarters.latitude)])
        .addTo(mapInstance)
    }

    // Verificar se há sites para processar
    if (regularSites.length === 0) {
      return // Não há sites para processar
    }

    // Agrupar sites próximos baseado na distância visual (pixels) na tela
    // Threshold de 80 pixels: obras que estão visualmente próximas na tela serão agrupadas
    // Isso torna o agrupamento dinâmico conforme o zoom
    // Verificar novamente se o mapa está pronto antes de agrupar
    let groups: { center: { lng: number; lat: number }; sites: Site[]; id: string }[] = []
    try {
      if (mapInstance && mapInstance.isStyleLoaded()) {
        groups = groupNearbySites(regularSites, mapInstance, 80)
      } else {
        // Se o mapa não está pronto, criar grupos individuais como fallback
        groups = regularSites.map(site => ({
          center: { lng: Number(site.longitude), lat: Number(site.latitude) },
          sites: [site],
          id: site.id
        }))
      }
    } catch (error) {
      // Em caso de erro, criar grupos individuais como fallback
      console.warn('Erro ao agrupar sites:', error)
      groups = regularSites.map(site => ({
        center: { lng: Number(site.longitude), lat: Number(site.latitude) },
        sites: [site],
        id: site.id
      }))
    }

    // Se há um grupo expandido, verificar se ele ainda existe nos grupos recalculados
    // Se não existir mais (sites não estão mais próximos o suficiente), desagrupar
    if (spiderfiedGroup) {
      const expandedGroup = groups.find(g => g.id === spiderfiedGroup)
      if (!expandedGroup || expandedGroup.sites.length === 1) {
        // Grupo não existe mais ou tem apenas 1 site, desagrupar
        setSpiderfiedGroup(null)
      } else {
        // Atualizar grupo original armazenado com o grupo recalculado
        originalGroupsRef.current.set(expandedGroup.id, { ...expandedGroup, sites: [...expandedGroup.sites] })
      }
    }

    groups.forEach(group => {
      if (group.sites.length === 1) {
        // Site individual - marcador com ícone de location
        const site = group.sites[0]
        const isSelected = selectedSite?.id === site.id
        const el = createLocationMarker(site, currentIsDark, () => {
          lastAnimatedSpiderfyRef.current = null // Resetar para permitir animação na próxima vez
          setSpiderfiedGroup(null)
          setSelectedSite(site)
          setPanelPosition(null)
        }, isSelected)

        const marker = new mapboxgl.Marker(el)
          .setLngLat([Number(site.longitude), Number(site.latitude)])
          .addTo(mapInstance)

        markersRef.current.push(marker)
      } else if (spiderfiedGroup === group.id) {
        // ============================================================
        // SPIDERFY EXPANDIDO
        // ============================================================
        // Usar o grupo recalculado (que já foi atualizado no originalGroupsRef se necessário)
        const groupToUse = group
        const groupCenter = groupToUse.center
        
        // Verificar se devemos animar ou apenas reposicionar marcadores
        const shouldAnimate = lastAnimatedSpiderfyRef.current !== group.id
        
        const spiderRadius = 60 // pixels de deslocamento do centro
        const lineDuration = shouldAnimate ? 200 : 0 // ms para animar cada linha
        const lineDelay = shouldAnimate ? 30 : 0 // ms entre cada linha
        const markerDelay = shouldAnimate ? 50 : 0 // ms após linha para mostrar marcador

        // Marcar este grupo como já animado
        lastAnimatedSpiderfyRef.current = group.id

        // Pré-calcular todos os dados necessários ANTES de qualquer renderização
        // Usar o centro do grupo atual (pode ter mudado com zoom) mas os sites originais
        const spiderData = groupToUse.sites.map((site, index) => {
          const siteLng = Number(site.longitude)
          const siteLat = Number(site.latitude)
          
          // Calcular ângulo
          const centerPoint = mapInstance.project([groupCenter.lng, groupCenter.lat])
          const sitePoint = mapInstance.project([siteLng, siteLat])
          const dx = sitePoint.x - centerPoint.x
          const dy = sitePoint.y - centerPoint.y
          const pixelDistance = Math.sqrt(dx * dx + dy * dy)
          
          let angle: number
          if (pixelDistance < 5) {
            angle = (index / group.sites.length) * 2 * Math.PI - Math.PI / 2
          } else {
            angle = Math.atan2(dy, dx)
          }

          // Calcular posição final
          const spiderX = centerPoint.x + Math.cos(angle) * spiderRadius
          const spiderY = centerPoint.y + Math.sin(angle) * spiderRadius
          const finalPosition = mapInstance.unproject([spiderX, spiderY])

          return {
            site,
            angle,
            finalPosition,
            getSpiderPosition: () => {
              const cp = mapInstance.project([groupCenter.lng, groupCenter.lat])
              const sx = cp.x + Math.cos(angle) * spiderRadius
              const sy = cp.y + Math.sin(angle) * spiderRadius
              return mapInstance.unproject([sx, sy])
            }
          }
        })

        // ============================================================
        // ETAPA 1: Criar e mostrar o botão X no centro
        // ============================================================
        const closeEl = document.createElement('div')
        closeEl.className = 'marker-container'
        closeEl.style.cursor = 'pointer'
        closeEl.style.width = '36px'
        closeEl.style.height = '36px'
        closeEl.style.zIndex = '9999'
        const bgColor = currentIsDark ? '#4B5563' : '#6B7280'
        closeEl.innerHTML = `
          <div style="width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background-color: ${bgColor}; border: 1px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
        `

        closeEl.addEventListener('click', (e) => {
          e.stopPropagation()
          lastAnimatedSpiderfyRef.current = null // Resetar para permitir animação na próxima vez
          setSpiderfiedGroup(null)
          setSelectedSite(null)
          setPanelPosition(null)
        })

        const closeMarker = new mapboxgl.Marker(closeEl)
          .setLngLat([groupCenter.lng, groupCenter.lat])
          .addTo(mapInstance)

        markersRef.current.push(closeMarker)

        // ============================================================
        // ETAPA 2 e 3: Para cada site, criar linhas e marcadores
        // ============================================================
        spiderData.forEach((data, index) => {
          const { site, angle, finalPosition, getSpiderPosition } = data
          const totalDelay = index * lineDelay

          // Criar linha
          const lineEl = document.createElement('div')
          lineEl.style.position = 'absolute'
          lineEl.style.pointerEvents = 'none'
          lineEl.style.zIndex = '1000'
          lineEl.style.height = '2px'
          lineEl.style.backgroundColor = currentIsDark ? '#60A5FA' : '#2563EB'
          lineEl.style.transformOrigin = '0 50%'

          // Posicionar linha no centro com rotação correta
          const centerPoint = mapInstance.project([groupCenter.lng, groupCenter.lat])
          lineEl.style.left = `${centerPoint.x}px`
          lineEl.style.top = `${centerPoint.y}px`
          lineEl.style.transform = `rotate(${angle * (180 / Math.PI)}deg)`

          // Variável para armazenar o marcador
          let marker: mapboxgl.Marker | null = null
          let markerEl: HTMLElement | null = null

          // Handler para atualizar posições com zoom/pan
          const updatePositions = () => {
            if (!marker) return
            
            const targetPos = getSpiderPosition()
            marker.setLngLat([targetPos.lng, targetPos.lat])

            const cp = mapInstance.project([groupCenter.lng, groupCenter.lat])
            const mp = mapInstance.project([targetPos.lng, targetPos.lat])
            const dx = mp.x - cp.x
            const dy = mp.y - cp.y
            const length = Math.sqrt(dx * dx + dy * dy)
            const rotation = Math.atan2(dy, dx) * (180 / Math.PI)

            lineEl.style.left = `${cp.x}px`
            lineEl.style.top = `${cp.y}px`
            lineEl.style.width = `${length}px`
            lineEl.style.transform = `rotate(${rotation}deg)`
          }

          // Função para criar marcador na posição final
          const createMarkerAtFinalPosition = () => {
            const markerPos = getSpiderPosition()
            const isSelected = selectedSite?.id === site.id
            markerEl = createSpiderfyMarker(site, currentIsDark, (e) => {
              if (e) e.stopPropagation()
              setSelectedSite(site)
              setPanelPosition(null)
            }, isSelected)

            marker = new mapboxgl.Marker(markerEl)
              .setLngLat([markerPos.lng, markerPos.lat])
              .addTo(mapInstance)

            markersRef.current.push(marker)

            // Adicionar handlers para zoom/pan
            mapInstance.on('move', updatePositions)
            mapInstance.on('zoom', updatePositions)
            spiderMoveHandlersRef.current.push(updatePositions)
          }

          if (shouldAnimate) {
            // COM ANIMAÇÃO
            lineEl.style.width = '0px'
            
            setTimeout(() => {
              mapInstance.getCanvasContainer().appendChild(lineEl)
              spiderLinesRef.current.push(lineEl)

              const startTime = Date.now()

              const animateLine = () => {
                const elapsed = Date.now() - startTime
                const progress = Math.min(elapsed / lineDuration, 1)
                const eased = 1 - Math.pow(1 - progress, 3) // cubic-out

                const targetPos = getSpiderPosition()
                const cp = mapInstance.project([groupCenter.lng, groupCenter.lat])
                const tp = mapInstance.project([targetPos.lng, targetPos.lat])
                const dx = tp.x - cp.x
                const dy = tp.y - cp.y
                const fullLength = Math.sqrt(dx * dx + dy * dy)
                const currentLength = fullLength * eased
                const rotation = Math.atan2(dy, dx) * (180 / Math.PI)

                lineEl.style.left = `${cp.x}px`
                lineEl.style.top = `${cp.y}px`
                lineEl.style.width = `${currentLength}px`
                lineEl.style.transform = `rotate(${rotation}deg)`

                if (progress < 1) {
                  requestAnimationFrame(animateLine)
                } else {
                  setTimeout(() => {
                    createMarkerAtFinalPosition()
                    
                    // Animar entrada do marcador
                    const innerEl = markerEl?.querySelector('div') as HTMLElement
                    if (innerEl) {
                      innerEl.style.opacity = '0'
                      innerEl.style.transform = 'scale(0.5)'
                      innerEl.style.transition = 'opacity 150ms ease-out, transform 150ms ease-out'
                      void innerEl.offsetWidth
                      innerEl.style.opacity = '1'
                      innerEl.style.transform = 'scale(1)'
                    }
                  }, markerDelay)
                }
              }

              requestAnimationFrame(animateLine)
            }, totalDelay)
          } else {
            // SEM ANIMAÇÃO - posicionar diretamente
            const targetPos = getSpiderPosition()
            const cp = mapInstance.project([groupCenter.lng, groupCenter.lat])
            const tp = mapInstance.project([targetPos.lng, targetPos.lat])
            const dx = tp.x - cp.x
            const dy = tp.y - cp.y
            const fullLength = Math.sqrt(dx * dx + dy * dy)
            const rotation = Math.atan2(dy, dx) * (180 / Math.PI)

            lineEl.style.width = `${fullLength}px`
            lineEl.style.left = `${cp.x}px`
            lineEl.style.top = `${cp.y}px`
            lineEl.style.transform = `rotate(${rotation}deg)`

            mapInstance.getCanvasContainer().appendChild(lineEl)
            spiderLinesRef.current.push(lineEl)

            createMarkerAtFinalPosition()
          }
        })
      } else {
        // Grupo não expandido - mostrar marcador de cluster
        const totalMachines = group.sites.reduce((sum, s) => sum + (s.machines_count || 0), 0)
        const hasActiveSites = group.sites.some(s => s.machines_count > 0)
        const colors = getThemeColors(hasActiveSites ? 'blue' : 'neutral', currentIsDark)
        
        const el = document.createElement('div')
        el.className = 'marker-container'
        el.style.cursor = 'pointer'
        el.style.width = '36px'
        el.style.height = '36px'
        // Borda branca de 1px igual aos outros marcadores
        el.innerHTML = `
          <div class="relative w-full h-full flex items-center justify-center">
            <div class="w-9 h-9 rounded-full flex items-center justify-center shadow-lg" style="background-color: ${colors.bg}; border: 1px solid white;">
              <span class="text-white text-sm font-normal">${group.sites.length}</span>
            </div>
          </div>
        `

        el.addEventListener('click', () => {
          setSpiderfiedGroup(group.id)
          setSelectedSite(null)
        })

        const marker = new mapboxgl.Marker(el)
          .setLngLat([group.center.lng, group.center.lat])
          .addTo(mapInstance)

        markersRef.current.push(marker)
      }
    })

  }, [sites, spiderfiedGroup, selectedSite, groupNearbySites, clearSpiderLines, createLocationMarker, createSpiderfyMarker, getGeoDistance])

  // Atualizar ref de updateMarkers sempre que a função mudar
  useEffect(() => {
    updateMarkersRef.current = updateMarkers
  }, [updateMarkers])

  // Detectar tema escuro e ajustar mapa automaticamente (apenas quando estilo for 'map')
  useEffect(() => {
    const checkDarkMode = () => {
      if (typeof window !== 'undefined') {
        const isDark = document.documentElement.classList.contains('dark') ||
          localStorage.theme === 'dark' ||
          (!localStorage.theme && window.matchMedia('(prefers-color-scheme: dark)').matches)
        setIsDarkMode(isDark)
        
        // Se o estilo atual é 'map', ajustar automaticamente baseado no tema
        if (map.current && mapStyle === 'map') {
          const styleUrl = isDark 
            ? 'mapbox://styles/mapbox/dark-v11'
            : 'mapbox://styles/mapbox/streets-v12'
          map.current.setStyle(styleUrl)
          map.current.once('style.load', () => {
            if (map.current) {
              // Aguardar um pouco para garantir que o estilo carregou completamente
              setTimeout(() => {
                updateMarkers()
              }, 100)
            }
          })
        } else {
          // Atualizar marcadores quando o tema mudar, mesmo se não mudar o estilo do mapa
          if (map.current && map.current.isStyleLoaded()) {
            updateMarkers()
          }
        }
      }
    }

    checkDarkMode()

    const observer = new MutationObserver(checkDarkMode)
    if (typeof document !== 'undefined') {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      })
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', checkDarkMode)

    const storageListener = () => checkDarkMode()
    window.addEventListener('storage', storageListener)

    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener('change', checkDarkMode)
      window.removeEventListener('storage', storageListener)
    }
  }, [mapStyle, updateMarkers])


  useEffect(() => {
    if (sessionLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    // Admin e dev sempre têm acesso
    if (user.role === 'admin' || user.role === 'dev') {
      loadSites()
      setLoading(false)
      return
    }

    // Se não tem permissão para ver o mapa, limpar sessão e ir para login
    // (evita loop de redirecionamento)
    if (!user.can_view_map) {
      import('@/lib/session').then(({ clearSession }) => {
        clearSession()
        router.push('/login')
      })
      return
    }

    loadSites()
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionLoading])

  useEffect(() => {
    initializeMap()

    return () => {
      // Remover event listeners de resize
      const handlers = resizeHandlersRef.current
      if (handlers.length >= 2) {
        window.removeEventListener('resize', handlers[0] as () => void)
        window.removeEventListener('orientationchange', handlers[1] as () => void)
      }
      resizeHandlersRef.current = []
      
      if (map.current) {
        map.current.remove()
        map.current = null
        setMapLoaded(false)
      }
    }
  }, [initializeMap])

  // Atualizar marcadores quando o mapa carrega, sites mudam, spiderfy muda ou site selecionado muda
  useEffect(() => {
    if (!map.current || !mapLoaded) return
    
    // Garantir que o estilo está carregado
    if (map.current.isStyleLoaded()) {
      updateMarkers()
    } else {
      map.current.once('style.load', () => {
        updateMarkers()
      })
    }
  }, [sites, mapLoaded, spiderfiedGroup, selectedSite, updateMarkers])

  const toggleMapStyle = () => {
    // Alternar entre 'map' e 'satellite'
    const newStyle: 'map' | 'satellite' = mapStyle === 'satellite' ? 'map' : 'satellite'
    
    // Marcar que o usuário escolheu manualmente
    userSelectedStyle.current = newStyle
    setMapStyle(newStyle)
    
    if (map.current) {
      let styleUrl = 'mapbox://styles/mapbox/streets-v12'
      if (newStyle === 'satellite') {
        styleUrl = 'mapbox://styles/mapbox/satellite-streets-v12'
      } else {
        // Estilo 'map' - detectar tema atual
        const currentIsDark = typeof window !== 'undefined' && (
          document.documentElement.classList.contains('dark') ||
          localStorage.theme === 'dark' ||
          (!localStorage.theme && window.matchMedia('(prefers-color-scheme: dark)').matches)
        )
        styleUrl = currentIsDark 
          ? 'mapbox://styles/mapbox/dark-v11'
          : 'mapbox://styles/mapbox/streets-v12'
      }
      
      map.current.setStyle(styleUrl)
      // Re-add markers after style change
      map.current.once('style.load', () => {
        updateMarkers()
      })
    }
  }

  const getMapStyleLabel = () => {
    return mapStyle === 'satellite' ? 'Satélite' : 'Mapa'
  }

  // Funções para drag and drop do painel
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!panelRef.current) return

    setIsDragging(true)
    // Coordenadas relativas ao container (sempre position: absolute)
    const containerRect = mapContainerRef.current.getBoundingClientRect()
    const isMobile = 'touches' in e
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].pageY : e.clientY

    // Salvar posição inicial do ponteiro relativa ao container
    setDragStart({
      x: clientX - containerRect.left,
      y: clientY - containerRect.top
    })

    // Salvar posição inicial do painel relativa ao container
    const rect = panelRef.current.getBoundingClientRect()
    const containerRect = mapContainerRef.current.getBoundingClientRect()
    setPanelStart({
      x: rect.left - containerRect.left, // Posição relativa ao container
      y: rect.top - containerRect.top
    })

    // Prevenir seleção de texto durante o arraste (apenas para mouse)
    if ('clientX' in e) {
      e.preventDefault()
    }
  }, [])

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !panelRef.current || !mapContainerRef.current) return

    // Coordenadas relativas ao container
    const containerRect = mapContainerRef.current.getBoundingClientRect()
    const isMobile = 'touches' in e
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].pageY : e.clientY

    // Converter para coordenadas relativas ao container
    const relativeX = clientX - containerRect.left
    const relativeY = clientY - containerRect.top

    // Lógica simples e consistente: nova posição = posição inicial + movimento
    const deltaX = relativeX - dragStart.x
    const deltaY = relativeY - dragStart.y

    const newX = panelStart.x + deltaX
    const newY = panelStart.y + deltaY

    // Controlar limites do container do mapa (sempre position: absolute)
    const containerRect = mapContainerRef.current.getBoundingClientRect()
    const panel = panelRef.current

    // Limites baseados no container, não na viewport
    const minX = 16 // left-4 = 16px
    const maxX = containerRect.width - panel.offsetWidth - 16 // right-4 = 16px
    const minY = 16 // top padding mínimo
    const maxY = containerRect.height - panel.offsetHeight - 16 // bottom padding mínimo

    const clampedX = Math.max(minX, Math.min(newX, maxX))
    const clampedY = Math.max(minY, Math.min(newY, maxY))

    // Atualizar posição durante o drag
    setPanelPosition({ x: clampedX, y: clampedY })
  }, [isDragging, dragStart, panelStart])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
    // A posição final já está em panelPosition
  }, [])

  // Adicionar event listeners globais durante o arraste
  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => handleDragMove(e)
      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault() // Bloquear scroll da página durante drag no mobile
        handleDragMove(e)
      }
      const handleMouseUp = () => handleDragEnd()
      const handleTouchEnd = () => handleDragEnd()

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchend', handleTouchEnd)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging, handleDragMove, handleDragEnd])

  return (
    <div className="min-h-screen md:h-screen md:max-h-screen bg-gray-50 dark:bg-gray-900 md:flex md:flex-col md:overflow-hidden">
      <Header title="Mapa" />
      <div className="flex md:flex-1 md:overflow-hidden">
        <Sidebar />
        <main ref={mapContainerRef} className={`relative flex-1 p-4 md:p-6 transition-all duration-250 ease-in-out md:flex md:flex-col md:overflow-hidden ${isExpanded ? 'md:ml-48 lg:ml-64' : 'md:ml-16 lg:ml-20'}`} style={{ minHeight: 'calc(100vh - 200px)' }}>
          <div className="relative w-full h-full rounded-lg overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700" style={{ minHeight: '400px' }}>
            {/* Map Container */}
            <div ref={mapContainer} className="map-container w-full h-full" />

            {/* Loading Overlay */}
            {loading && (
              <div className="absolute inset-0 bg-gray-50 dark:bg-gray-900 flex items-center justify-center z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {/* Map Controls */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
              <button
                onClick={toggleMapStyle}
                className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                title={`Alternar estilo: ${getMapStyleLabel()}`}
              >
                {mapStyle === 'satellite' ? (
                  <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => loadSites()}
                className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                title="Atualizar"
              >
                <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {/* Sites count - excluindo sede da empresa */}
            <div className="absolute top-4 right-20 bg-white dark:bg-gray-800 rounded-lg shadow px-4 py-2 z-10">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-white">{sites.filter(s => !s.is_headquarters).length}</span> jobsites
              </p>
            </div>

            {/* Drag Container - Transparente */}
            {selectedSite && (
              <div
                ref={panelRef}
                className="absolute left-4 right-4 md:left-auto md:right-4 md:w-96 z-[10000]"
                style={panelPosition ? {
                  left: `${panelPosition.x}px`,
                  top: `${panelPosition.y}px`,
                  width: '384px',
                  maxWidth: 'calc(100vw - 2rem)',
                  height: 'auto'
                } : {
                  bottom: '80px' // Posição inicial: 20px (padding) + 60px (altura estimada)
                }}
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
              >
                {/* Drag Handle - Barra Superior */}
                <div
                  className={`w-24 h-12 mx-auto cursor-move touch-none flex items-center justify-center rounded-t-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-b-0`}
                  style={{ touchAction: 'none' }}
                  onMouseDown={handleDragStart}
                  onTouchStart={handleDragStart}
                >
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                    <div className="w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                    <div className="w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                  </div>
                </div>

                {/* Panel Content - Com suas próprias bordas e padding */}
                <div
                  className={`rounded-t-lg rounded-b-lg shadow-lg p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ${isDragging ? 'select-none' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2 mt-1">
                  <div className="flex items-center gap-2">
                    {selectedSite.is_headquarters && (
                      <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    )}
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {selectedSite.title}
                    </h3>
                    {selectedSite.is_headquarters && (
                      <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded font-medium">
                        Sede
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSite(null)
                      setPanelPosition(null)
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <p className="text-sm mb-3 text-gray-500 dark:text-gray-400">
                  {selectedSite.address || selectedSite.city || 'Localização não disponível'}
                </p>

                {!selectedSite.is_headquarters && (
                  <>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Máquinas ({selectedSite.machines_count})
                      </p>
                      {selectedSite.machines?.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {selectedSite.machines.map((machine: any) => (
                            <div
                              key={machine.id}
                              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                            >
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {machine.unit_number}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                machine.status === 'allocated' ? 'status-allocated' :
                                machine.status === 'available' ? 'status-available' :
                                machine.status === 'maintenance' ? 'status-maintenance' : 'status-inactive'
                              }`}>
                                {MACHINE_STATUS_LABELS[machine.status]}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Nenhuma máquina alocada
                        </p>
                      )}
                    </div>

                    <div className="mt-3 w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-sm font-medium text-center cursor-not-allowed">
                      Detalhes Indisponíveis
                    </div>
                  </>
                )}
                {selectedSite.is_headquarters && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                      Esta é a sede da empresa Premium Group Inc.
                    </p>
                  </div>
                )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <BottomNavigation />
    </div>
  )
}
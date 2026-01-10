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
  const [spiderfiedGroup, setSpiderfiedGroup] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  
  // Inicializar estilo como 'map' (que será claro/escuro baseado no tema)
  const [mapStyle, setMapStyle] = useState<'map' | 'satellite'>('map')

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

    // Fechar spiderfy ao clicar no mapa (fora dos marcadores)
    map.current.on('click', (e) => {
      // Verifica se clicou em um marcador
      const target = e.originalEvent.target as HTMLElement
      if (!target.closest('.marker-container')) {
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
  }, [mapStyle])

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

  // Função para agrupar sites próximos (usa distância geográfica para consistência)
  // 50 metros é suficiente para agrupar endereços na mesma rua/prédio
  const groupNearbySites = useCallback((sites: Site[], thresholdMeters: number = 50) => {
    const groups: { center: { lng: number; lat: number }; sites: Site[]; id: string }[] = []
    const processed = new Set<string>()

    sites.forEach(site => {
      if (processed.has(site.id)) return

      const group: Site[] = [site]
      processed.add(site.id)

      sites.forEach(otherSite => {
        if (processed.has(otherSite.id)) return
        
        // Usar distância geográfica (em metros) para agrupamento consistente
        const distance = getGeoDistance(
          Number(site.longitude), Number(site.latitude),
          Number(otherSite.longitude), Number(otherSite.latitude)
        )

        // 100 metros = sites muito próximos que devem ser agrupados
        if (distance < thresholdMeters) {
          group.push(otherSite)
          processed.add(otherSite.id)
        }
      })

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
  }, [getGeoDistance])

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

  // Criar marcador com ícone map-pin do Phosphor Icons para obras individuais
  const createLocationMarker = useCallback((site: Site, currentIsDark: boolean, onClick: (e?: Event) => void, isSelected: boolean = false) => {
    // Cor diferente quando selecionado (verde/amarelo para destacar)
    const baseColorType = site.machines_count > 0 ? 'blue' : 'neutral'
    const colorType = isSelected ? 'green' : baseColorType
    const colors = getThemeColors(colorType, currentIsDark)
    const el = document.createElement('div')
    el.className = 'marker-container'
    el.style.cursor = 'pointer'
    el.style.width = '32px'
    el.style.height = '40px'
    el.style.zIndex = isSelected ? '1002' : '1000'
    el.innerHTML = `
      <div class="relative w-full h-full flex items-center justify-center">
        <svg class="w-8 h-10" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
          <path d="M128,16a88.1,88.1,0,0,0-88,88c0,75.3,80,132.17,83.41,134.55a8,8,0,0,0,9.18,0C136,236.17,216,179.3,216,104A88.1,88.1,0,0,0,128,16Zm0,56a32,32,0,1,1-32,32A32,32,0,0,1,128,72Z" fill="${colors.bg}" stroke="white" stroke-width="4"/>
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

    // Separar sede das obras (apenas sites com coordenadas válidas)
    const validSites = sites.filter(site => {
      const lat = Number(site.latitude)
      const lng = Number(site.longitude)
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0
    })
    const headquarters = validSites.find(site => site.is_headquarters)
    const regularSites = validSites.filter(site => !site.is_headquarters)

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
      const el = document.createElement('div')
      el.className = 'marker-container'
      el.style.cursor = 'pointer'
      el.innerHTML = `
        <div class="relative">
          <div class="rounded-lg flex items-center justify-center shadow-md border-2 border-white" style="width: 30px; height: 30px; background-color: ${colors.bg};">
            <svg style="width: 15px; height: 15px; color: ${colors.text};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 rotate-45 border-r border-b border-white" style="width: 7.5px; height: 7.5px; background-color: ${colors.bg};"></div>
        </div>
      `

      el.addEventListener('click', () => {
        setSelectedSite(headquarters)
      })

      headquartersMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([Number(headquarters.longitude), Number(headquarters.latitude)])
        .addTo(mapInstance)
    }

    // Agrupar sites próximos
    const groups = groupNearbySites(regularSites)

    groups.forEach(group => {
      if (group.sites.length === 1) {
        // Site individual - marcador com ícone de location
        const site = group.sites[0]
        const isSelected = selectedSite?.id === site.id
        const el = createLocationMarker(site, currentIsDark, () => {
          setSpiderfiedGroup(null)
          setSelectedSite(site)
        }, isSelected)

        const marker = new mapboxgl.Marker(el)
          .setLngLat([Number(site.longitude), Number(site.latitude)])
          .addTo(mapInstance)

        markersRef.current.push(marker)
      } else if (spiderfiedGroup === group.id) {
        // ============================================================
        // SPIDERFY EXPANDIDO - FLUXO SÍNCRONO EM 3 ETAPAS
        // ============================================================
        // Etapa 1: Mostrar botão X no centro
        // Etapa 2: Animar linhas de dentro para fora
        // Etapa 3: Mostrar marcadores nas pontas das linhas
        // ============================================================
        
        const spiderRadius = 60 // pixels de deslocamento do centro
        const lineDuration = 200 // ms para animar cada linha
        const lineDelay = 30 // ms entre cada linha
        const markerDelay = 50 // ms após linha para mostrar marcador

        // Pré-calcular todos os dados necessários ANTES de qualquer renderização
        const spiderData = group.sites.map((site, index) => {
          const siteLng = Number(site.longitude)
          const siteLat = Number(site.latitude)
          
          // Calcular ângulo
          const centerPoint = mapInstance.project([group.center.lng, group.center.lat])
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
              const cp = mapInstance.project([group.center.lng, group.center.lat])
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
          <div style="width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background-color: ${bgColor}; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
        `

        closeEl.addEventListener('click', (e) => {
          e.stopPropagation()
          setSpiderfiedGroup(null)
          setSelectedSite(null)
        })

        const closeMarker = new mapboxgl.Marker(closeEl)
          .setLngLat([group.center.lng, group.center.lat])
          .addTo(mapInstance)

        markersRef.current.push(closeMarker)

        // ============================================================
        // ETAPA 2 e 3: Para cada site, animar linha e depois mostrar marcador
        // ============================================================
        spiderData.forEach((data, index) => {
          const { site, angle, finalPosition, getSpiderPosition } = data
          const totalDelay = index * lineDelay

          // Criar linha (ainda não visível, ainda não adicionada)
          const lineEl = document.createElement('div')
          lineEl.style.position = 'absolute'
          lineEl.style.pointerEvents = 'none'
          lineEl.style.zIndex = '1000'
          lineEl.style.height = '2px'
          lineEl.style.backgroundColor = currentIsDark ? '#60A5FA' : '#2563EB'
          lineEl.style.transformOrigin = '0 50%'
          lineEl.style.width = '0px'

          // Posicionar linha no centro com rotação correta
          const centerPoint = mapInstance.project([group.center.lng, group.center.lat])
          lineEl.style.left = `${centerPoint.x}px`
          lineEl.style.top = `${centerPoint.y}px`
          lineEl.style.transform = `rotate(${angle * (180 / Math.PI)}deg)`

          // Variável para armazenar o marcador (será criado depois)
          let marker: mapboxgl.Marker | null = null
          let markerEl: HTMLElement | null = null

          // Handler para atualizar posições com zoom/pan
          const updatePositions = () => {
            if (!marker) return
            
            const targetPos = getSpiderPosition()
            marker.setLngLat([targetPos.lng, targetPos.lat])

            const cp = mapInstance.project([group.center.lng, group.center.lat])
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

          // ============================================================
          // ETAPA 2: Animar linha de dentro para fora
          // ============================================================
          setTimeout(() => {
            // Adicionar linha ao DOM
            mapInstance.getCanvasContainer().appendChild(lineEl)
            spiderLinesRef.current.push(lineEl)

            const startTime = Date.now()

            const animateLine = () => {
              const elapsed = Date.now() - startTime
              const progress = Math.min(elapsed / lineDuration, 1)
              const eased = 1 - Math.pow(1 - progress, 3) // cubic-out

              // Calcular comprimento atual da linha
              const targetPos = getSpiderPosition()
              const cp = mapInstance.project([group.center.lng, group.center.lat])
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
                // ============================================================
                // ETAPA 3: Linha terminou, agora criar e mostrar o marcador
                // ============================================================
                setTimeout(() => {
                  // Calcular posição EXATA onde o marcador deve aparecer
                  const markerPos = getSpiderPosition()

                  // Criar elemento do marcador
                  const isSelected = selectedSite?.id === site.id
                  markerEl = createLocationMarker(site, currentIsDark, (e) => {
                    if (e) e.stopPropagation()
                    setSelectedSite(site)
                  }, isSelected)
                  
                  // IMPORTANTE: Não aplicar transform no elemento root!
                  // O Mapbox usa transform para posicionar o marcador.
                  // Aplicar animações apenas no elemento INTERNO.
                  const innerEl = markerEl.querySelector('div') as HTMLElement
                  if (innerEl) {
                    innerEl.style.opacity = '0'
                    innerEl.style.transform = 'scale(0.5)'
                    innerEl.style.transition = 'opacity 150ms ease-out, transform 150ms ease-out'
                  }

                  // Criar marcador na posição CORRETA (não no centro)
                  marker = new mapboxgl.Marker(markerEl)
                    .setLngLat([markerPos.lng, markerPos.lat])
                    .addTo(mapInstance)

                  markersRef.current.push(marker)

                  // Forçar reflow e animar o elemento interno
                  if (innerEl) {
                    void innerEl.offsetWidth
                    innerEl.style.opacity = '1'
                    innerEl.style.transform = 'scale(1)'
                  }

                  // Adicionar handlers para zoom/pan
                  mapInstance.on('move', updatePositions)
                  mapInstance.on('zoom', updatePositions)
                  spiderMoveHandlersRef.current.push(updatePositions)
                }, markerDelay)
              }
            }

            requestAnimationFrame(animateLine)
          }, totalDelay)
        })
      } else {
        // Grupo não expandido - mostrar marcador de cluster
        const totalMachines = group.sites.reduce((sum, s) => sum + (s.machines_count || 0), 0)
        const hasActiveSites = group.sites.some(s => s.machines_count > 0)
        const colors = getThemeColors(hasActiveSites ? 'blue' : 'neutral', currentIsDark)
        
        const el = document.createElement('div')
        el.className = 'marker-container'
        el.style.cursor = 'pointer'
        el.style.width = '44px'
        el.style.height = '44px'
        el.innerHTML = `
          <div class="relative w-full h-full flex items-center justify-center">
            <div class="w-11 h-11 rounded-full flex items-center justify-center shadow-lg border-3 border-white" style="background-color: ${colors.bg}; border-width: 3px;">
              <span class="text-white text-base font-bold">${group.sites.length}</span>
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

  }, [sites, spiderfiedGroup, selectedSite, groupNearbySites, clearSpiderLines, createLocationMarker])

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

  // Atualizar marcadores quando o mapa carrega, sites mudam ou spiderfy muda
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
  }, [sites, mapLoaded, spiderfiedGroup, updateMarkers])

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

  return (
    <div className="min-h-screen md:h-screen md:max-h-screen bg-gray-50 dark:bg-gray-900 md:flex md:flex-col md:overflow-hidden">
      <Header title="Mapa" />
      <div className="flex md:flex-1 md:overflow-hidden">
        <Sidebar />
        <main className={`flex-1 p-4 md:p-6 transition-all duration-250 ease-in-out md:flex md:flex-col md:overflow-hidden ${isExpanded ? 'md:ml-48 lg:ml-64' : 'md:ml-16 lg:ml-20'}`} style={{ minHeight: 'calc(100vh - 200px)' }}>
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
                <span className="font-semibold text-gray-900 dark:text-white">{sites.filter(s => !s.is_headquarters).length}</span> obras
              </p>
            </div>

            {/* Selected Site Panel */}
            {selectedSite && (
              <div className={`absolute bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 rounded-lg shadow-lg p-4 z-[10000] ${
                selectedSite.is_headquarters 
                  ? 'bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600' 
                  : 'bg-white dark:bg-gray-800'
              }`}>
                <div className="flex items-center justify-between mb-3">
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
                    onClick={() => setSelectedSite(null)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <p className="text-sm mb-3 text-gray-500 dark:text-gray-400">
                  {selectedSite.city || 'Localização não disponível'}
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

                    <button
                      onClick={() => router.push(`/sites/${selectedSite.id}`)}
                      className="mt-3 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Ver Detalhes
                    </button>
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
            )}
          </div>
        </main>
      </div>

      <BottomNavigation />
    </div>
  )
}

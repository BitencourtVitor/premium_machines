import { useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { Site } from '../types'
import { 
  getThemeColors, 
  groupNearbySites, 
  createLocationMarker, 
  createSitePanel, 
  createSpiderfyMarker 
} from '../mapUtils'

interface UseMapMarkersProps {
  mapRef: React.MutableRefObject<mapboxgl.Map | null>
  sites: Site[]
  selectedSite: Site | null
  setSelectedSite: (site: Site | null) => void
  spiderfiedGroup: string | null
  setSpiderfiedGroup: (id: string | null) => void
  markersRef: React.MutableRefObject<mapboxgl.Marker[]>
  headquartersMarkerRef: React.MutableRefObject<mapboxgl.Marker | null>
  spiderLinesRef: React.MutableRefObject<HTMLDivElement[]>
  spiderMoveHandlersRef: React.MutableRefObject<(() => void)[]>
  lastAnimatedSpiderfyRef: React.MutableRefObject<string | null>
  originalGroupsRef: React.MutableRefObject<Map<string, { center: { lng: number; lat: number }; sites: Site[]; id: string }>>
  previousSitesIdsRef: React.MutableRefObject<string>
}

export function useMapMarkers({
  mapRef,
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
}: UseMapMarkersProps) {

  // Limpar linhas do spider e event handlers
  const clearSpiderLines = useCallback(() => {
    spiderLinesRef.current.forEach(line => line.remove())
    spiderLinesRef.current = []
    
    // Remover event handlers de movimento, zoom e render
    if (mapRef.current) {
      spiderMoveHandlersRef.current.forEach(handler => {
        mapRef.current?.off('move', handler)
        mapRef.current?.off('zoom', handler)
        mapRef.current?.off('render', handler)
      })
    }
    spiderMoveHandlersRef.current = []
  }, [mapRef, spiderLinesRef, spiderMoveHandlersRef])

  const updateMarkers = useCallback(() => {
    const mapInstance = mapRef.current
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

      // Criar marcador da sede
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
      })

      headquartersMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([Number(headquarters.longitude), Number(headquarters.latitude)])
        .addTo(mapInstance)

      markersRef.current.push(headquartersMarkerRef.current)

      // Se a sede estiver selecionada, criar painel separado
      if (isSelected) {
        const panelEl = createSitePanel(headquarters, currentIsDark)
        // Calcular posição abaixo do marcador (100 pixels abaixo)
        const markerLngLat = [Number(headquarters.longitude), Number(headquarters.latitude)] as [number, number]
        const markerPoint = mapInstance.project(markerLngLat)
        const offsetPoint = [markerPoint.x, markerPoint.y + 100] as [number, number]
        const offsetLngLat = mapInstance.unproject(offsetPoint)

        const panelMarker = new mapboxgl.Marker(panelEl)
          .setLngLat(offsetLngLat)
          .addTo(mapInstance)
        markersRef.current.push(panelMarker)
      }
    }

    // Verificar se há sites para processar
    if (regularSites.length === 0) {
      return // Não há sites para processar
    }

    // Agrupar sites próximos baseado na distância visual (pixels) na tela
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
      console.warn('Erro ao agrupar sites:', error)
      groups = regularSites.map(site => ({
        center: { lng: Number(site.longitude), lat: Number(site.latitude) },
        sites: [site],
        id: site.id
      }))
    }

    // Se há um grupo expandido, verificar se ele ainda existe nos grupos recalculados
    if (spiderfiedGroup) {
      const expandedGroup = groups.find(g => g.id === spiderfiedGroup)
      if (!expandedGroup || expandedGroup.sites.length === 1) {
        setSpiderfiedGroup(null)
      } else {
        originalGroupsRef.current.set(expandedGroup.id, { ...expandedGroup, sites: [...expandedGroup.sites] })
      }
    }

    groups.forEach(group => {
      if (group.sites.length === 1) {
        // Site individual - marcador com ícone de location
        const site = group.sites[0]
        const isSelected = selectedSite?.id === site.id
        const el = createLocationMarker(site, currentIsDark, () => {
          lastAnimatedSpiderfyRef.current = null 
          setSpiderfiedGroup(null)
          setSelectedSite(site)
        }, isSelected)

        const marker = new mapboxgl.Marker(el)
          .setLngLat([Number(site.longitude), Number(site.latitude)])
          .addTo(mapInstance)

        markersRef.current.push(marker)

        if (isSelected) {
          const panelEl = createSitePanel(site, currentIsDark)
          const markerLngLat = [Number(site.longitude), Number(site.latitude)] as [number, number]
          const markerPoint = mapInstance.project(markerLngLat)
          const offsetPoint = [markerPoint.x, markerPoint.y + 140] as [number, number]
          const offsetLngLat = mapInstance.unproject(offsetPoint)

          const panelMarker = new mapboxgl.Marker(panelEl)
            .setLngLat(offsetLngLat)
            .addTo(mapInstance)
          markersRef.current.push(panelMarker)
        }
      } else if (spiderfiedGroup === group.id) {
        // ============================================================
        // SPIDERFY EXPANDIDO
        // ============================================================
        const groupToUse = group
        const groupCenter = groupToUse.center
        
        const shouldAnimate = lastAnimatedSpiderfyRef.current !== group.id
        
        const spiderRadius = 60 // pixels de deslocamento do centro
        const lineDuration = shouldAnimate ? 200 : 0 
        const lineDelay = shouldAnimate ? 30 : 0 
        const markerDelay = shouldAnimate ? 50 : 0 

        lastAnimatedSpiderfyRef.current = group.id

        const spiderData = groupToUse.sites.map((site, index) => {
          const siteLng = Number(site.longitude)
          const siteLat = Number(site.latitude)
          
          const centerPoint = mapInstance.project([groupCenter.lng, groupCenter.lat])
          const sitePoint = mapInstance.project([siteLng, siteLat])
          
          let angle = Math.atan2(sitePoint.y - centerPoint.y, sitePoint.x - centerPoint.x)
          if (Math.abs(sitePoint.x - centerPoint.x) < 5 && Math.abs(sitePoint.y - centerPoint.y) < 5) {
             angle = (index / groupToUse.sites.length) * Math.PI * 2 - Math.PI / 2
          }

          const targetX = centerPoint.x + Math.cos(angle) * spiderRadius
          const targetY = centerPoint.y + Math.sin(angle) * spiderRadius
          
          const targetLngLat = mapInstance.unproject([targetX, targetY])
          
          return {
            site,
            centerPoint,
            targetPoint: { x: targetX, y: targetY },
            targetLngLat,
            angle
          }
        })

        spiderData.forEach((data, index) => {
          const { site, centerPoint, targetPoint, targetLngLat } = data
          
          const lineEl = document.createElement('div')
          lineEl.className = 'spider-line'
          lineEl.style.position = 'absolute'
          lineEl.style.top = '0'
          lineEl.style.left = '0'
          lineEl.style.width = '100%'
          lineEl.style.height = '100%'
          lineEl.style.pointerEvents = 'none'
          lineEl.style.zIndex = '900' 
          
          const createLineSvg = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
             return `
              <svg width="100%" height="100%" style="position: absolute; top: 0; left: 0;">
                <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" 
                      stroke="${currentIsDark ? '#9CA3AF' : '#6B7280'}" 
                      stroke-width="2" 
                      stroke-dasharray="4 2" />
              </svg>
            `
          }

          if (shouldAnimate) {
             lineEl.innerHTML = createLineSvg(centerPoint, centerPoint) 
             setTimeout(() => {
               lineEl.innerHTML = createLineSvg(centerPoint, targetPoint)
               lineEl.style.transition = `all ${lineDuration}ms ease-out`
             }, index * lineDelay)
          } else {
             lineEl.innerHTML = createLineSvg(centerPoint, targetPoint)
          }

          const canvas = mapInstance.getCanvasContainer()
          canvas.appendChild(lineEl)
          spiderLinesRef.current.push(lineEl)
          
          const updateLine = () => {
             const currentCenter = mapInstance.project([groupCenter.lng, groupCenter.lat])
             const currentTarget = mapInstance.project(targetLngLat)
             lineEl.innerHTML = createLineSvg(currentCenter, currentTarget)
          }
          
          spiderMoveHandlersRef.current.push(updateLine)
          mapInstance.on('move', updateLine)
          mapInstance.on('zoom', updateLine) 
          mapInstance.on('render', updateLine) 

          const isSelected = selectedSite?.id === site.id
          
          const el = createSpiderfyMarker(site, currentIsDark, () => {
             setSelectedSite(site)
          }, isSelected)

          if (shouldAnimate) {
             el.style.opacity = '0'
             el.style.transform = 'scale(0)'
             el.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }

          const marker = new mapboxgl.Marker(el)
            .setLngLat(targetLngLat)
            .addTo(mapInstance)
            
          markersRef.current.push(marker)
          
          if (shouldAnimate) {
             setTimeout(() => {
               el.style.opacity = '1'
               el.style.transform = 'scale(1)'
             }, index * lineDelay + markerDelay)
          }

          if (isSelected) {
            const panelEl = createSitePanel(site, currentIsDark)
            const markerPoint = mapInstance.project(targetLngLat)
            const offsetPoint = [markerPoint.x, markerPoint.y + 120] as [number, number]
            const offsetLngLat = mapInstance.unproject(offsetPoint)

            const panelMarker = new mapboxgl.Marker(panelEl)
              .setLngLat(offsetLngLat)
              .addTo(mapInstance)
            markersRef.current.push(panelMarker)
          }
        })
      } else {
        // Grupo colapsado (cluster)
        const count = group.sites.length
        const colors = getThemeColors('neutral', currentIsDark)
        
        const el = document.createElement('div')
        el.className = 'marker-container'
        el.style.cursor = 'pointer'
        el.innerHTML = `
          <div class="relative">
            <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white" style="background-color: ${colors.bg};">
              <span class="text-white font-bold text-lg">${count}</span>
            </div>
            <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 rotate-45" style="background-color: ${colors.bg}; border-right: 2px solid white; border-bottom: 2px solid white;"></div>
          </div>
        `

        el.addEventListener('click', (e) => {
          e.stopPropagation()
          lastAnimatedSpiderfyRef.current = null 
          setSpiderfiedGroup(group.id)
          // Centralizar no grupo com zoom suave
          mapInstance.flyTo({
             center: [group.center.lng, group.center.lat],
             zoom: Math.max(mapInstance.getZoom(), 10), // Garantir zoom mínimo
             speed: 1.2
          })
        })

        const marker = new mapboxgl.Marker(el)
          .setLngLat([group.center.lng, group.center.lat])
          .addTo(mapInstance)

        markersRef.current.push(marker)
      }
    })

  }, [
    mapRef, 
    sites, 
    selectedSite, 
    spiderfiedGroup, 
    markersRef, 
    headquartersMarkerRef, 
    spiderLinesRef, 
    spiderMoveHandlersRef, 
    lastAnimatedSpiderfyRef, 
    originalGroupsRef, 
    previousSitesIdsRef, 
    clearSpiderLines, 
    setSelectedSite, 
    setSpiderfiedGroup
  ])

  return { updateMarkers, clearSpiderLines }
}

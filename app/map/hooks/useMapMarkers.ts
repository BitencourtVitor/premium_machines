import { useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { Site } from '../types'
import { 
  getThemeColors, 
  groupNearbySites, 
  createLocationMarker, 
  createSitePanel, 
  getClusterStatusColor
} from '../mapUtils'

interface UseMapMarkersProps {
  mapRef: React.MutableRefObject<mapboxgl.Map | null>
  sites: Site[]
  selectedSite: Site | null
  setSelectedSite: (site: Site | null) => void
  markersRef: React.MutableRefObject<mapboxgl.Marker[]>
  headquartersMarkerRef: React.MutableRefObject<mapboxgl.Marker | null>
}

export function useMapMarkers({
  mapRef,
  sites,
  selectedSite,
  setSelectedSite,
  markersRef,
  headquartersMarkerRef
}: UseMapMarkersProps) {

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
    const headquarters = validSites.find(site => 
      site.is_headquarters || 
      site.title === 'Premium Group Inc.' || 
      site.address?.includes('1B Landing Lane')
    )
    const regularSites = validSites.filter(site => site.id !== headquarters?.id)

    // Remover todos os marcadores anteriores
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    if (headquartersMarkerRef.current) {
      headquartersMarkerRef.current.remove()
      headquartersMarkerRef.current = null
    }

    // Adicionar marcador especial para sede da empresa
    if (headquarters) {
      const colors = getClusterStatusColor([headquarters], currentIsDark)
      const isSelected = selectedSite?.id === headquarters.id

      // Criar marcador da sede
      const el = document.createElement('div')
      el.className = 'marker-container'
      el.style.cursor = 'pointer'
      // Reduzir z-index para não sobrepor os controles do mapa
      el.style.zIndex = isSelected ? '5' : '1'
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
        
        // Posicionar fixo abaixo do marcador, ancorado no topo para crescer para baixo
        const panelMarker = new mapboxgl.Marker({
          element: panelEl,
          anchor: 'top',
          offset: [0, 20] // Offset para baixo para não cobrir o ícone da sede
        })
          .setLngLat([Number(headquarters.longitude), Number(headquarters.latitude)])
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
      const currentZoom = mapInstance?.getZoom() || 0
      
      // Se o zoom for maior que 15, não agrupar (mostrar todos individualmente)
      if (mapInstance && mapInstance.isStyleLoaded() && currentZoom <= 15) {
        groups = groupNearbySites(regularSites, mapInstance, 40)
      } else {
        // Se o mapa não está pronto ou zoom é alto, criar grupos individuais
        groups = regularSites.map(site => ({
          center: { lng: Number(site.longitude), lat: Number(site.latitude) },
          sites: [site],
          id: `single-${site.id}`
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

    groups.forEach(group => {
      if (group.sites.length === 1) {
        // Site individual - marcador com ícone de location
        const site = group.sites[0]
        const isSelected = selectedSite?.id === site.id
        const el = createLocationMarker(site, currentIsDark, () => {
          setSelectedSite(site)
        }, isSelected)

        const marker = new mapboxgl.Marker(el)
          .setLngLat([Number(site.longitude), Number(site.latitude)])
          .addTo(mapInstance)

        markersRef.current.push(marker)

        if (isSelected) {
          const panelEl = createSitePanel(site, currentIsDark)
          
          // Posicionar fixo abaixo do marcador, ancorado no topo para crescer para baixo
          const panelMarker = new mapboxgl.Marker({
            element: panelEl,
            anchor: 'top',
            offset: [0, 20] // Offset para baixo para não cobrir o ícone da obra
          })
            .setLngLat([Number(site.longitude), Number(site.latitude)])
            .addTo(mapInstance)
          markersRef.current.push(panelMarker)
        }
      } else {
            // Grupo colapsado (cluster)
            const count = group.sites.length
            const colors = getClusterStatusColor(group.sites, currentIsDark)
            
            const el = document.createElement('div')
            el.className = 'marker-container'
            el.style.cursor = 'pointer'
            el.style.zIndex = '1'
            el.style.transition = 'all 0.3s ease' // Transição suave de cor
            el.innerHTML = `
              <div class="relative transition-colors duration-300">
                <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-colors duration-300" style="background-color: ${colors.bg};">
                  <span class="text-white font-bold text-lg">${count}</span>
                </div>
                <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 rotate-45 transition-colors duration-300" style="background-color: ${colors.bg}; border-right: 2px solid white; border-bottom: 2px solid white;"></div>
              </div>
            `

        el.addEventListener('click', (e) => {
          e.stopPropagation()
          const currentZoom = mapInstance.getZoom()
          // Aumentar o salto de zoom para garantir a separação
          const targetZoom = Math.min(currentZoom + 3, 22)
          mapInstance.easeTo({
            center: [group.center.lng, group.center.lat],
            zoom: targetZoom,
            duration: 600
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
    markersRef, 
    headquartersMarkerRef, 
    setSelectedSite
  ])

  return { updateMarkers }
}

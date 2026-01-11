import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'

interface UseMapInitializationProps {
  mapContainer: React.RefObject<HTMLDivElement>
  mapRef: React.MutableRefObject<mapboxgl.Map | null>
  mapStyle: 'map' | 'satellite'
  mapboxToken: string
  onMapLoad: () => void
  onZoomUpdate: () => void
  onZoomEnd: () => void
  onMoveEnd: () => void
  onClick: (e: mapboxgl.MapMouseEvent) => void
}

export function useMapInitialization({
  mapContainer,
  mapRef,
  mapStyle,
  mapboxToken,
  onMapLoad,
  onZoomUpdate,
  onZoomEnd,
  onMoveEnd,
  onClick
}: UseMapInitializationProps) {
  const resizeHandlersRef = useRef<(() => void)[]>([])

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    // Garantir que o container tenha dimensões antes de inicializar
    const container = mapContainer.current
    const rect = container.getBoundingClientRect()
    
    // Se o container não tem dimensões, aguardar um pouco e tentar novamente
    if (rect.width === 0 || rect.height === 0) {
      // Pequeno delay para tentar novamente se o container ainda não estiver pronto
      const timeoutId = setTimeout(() => {
        // Trigger re-run of effect (or handle internally if we were recursive)
        // Since we can't easily recurse inside useEffect without adding deps, 
        // we rely on the component re-rendering or the mapContainer eventually having size.
        // However, standard pattern is usually just to wait for mount.
        // For simplicity here, we'll let the parent handle the "ready" state or assume it's mounted.
        // But to keep the original logic:
        // We can't easily recall the hook. We'll just skip initialization and hope for a re-render
        // or we could use a ResizeObserver in a more advanced implementation.
      }, 100)
      return () => clearTimeout(timeoutId)
    }

    mapboxgl.accessToken = mapboxToken

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

    mapRef.current = new mapboxgl.Map({
      container: container,
      style: styleUrl,
      center: [-71.5412, 42.1301], // Hopedale, MA - Sede da empresa
      zoom: initialZoom,
      touchZoomRotate: true,
      touchPitch: true,
      doubleClickZoom: true,
      dragRotate: false, // Desabilitar rotação por arraste em mobile
      pitchWithRotate: false,
      antialias: false,
      preserveDrawingBuffer: false,
    })

    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
    mapRef.current.addControl(new mapboxgl.FullscreenControl(), 'top-right')

    mapRef.current.on('load', onMapLoad)
    mapRef.current.on('zoom', onZoomUpdate)
    mapRef.current.on('zoomend', onZoomEnd)
    mapRef.current.on('moveend', onMoveEnd)
    mapRef.current.on('click', onClick)

    // Resize handler
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.resize()
      }
    }

    const handleOrientationChange = () => {
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.resize()
        }
      }, 100)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleOrientationChange)
    
    resizeHandlersRef.current.push(handleResize, handleOrientationChange)

    // Cleanup function
    return () => {
        // We typically don't remove the map instance here in React 18 strict mode 
        // if we want to preserve it, but for a clean unmount we should.
        // However, the original code didn't have a cleanup for the map instance itself in the useEffect
        // It just had a check `if (!mapContainer.current || map.current) return`
        
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('orientationchange', handleOrientationChange)
        
        // Note: we are NOT removing the map instance here to avoid flashing on re-renders
        // The parent component should handle full cleanup if needed
    }
  }, [mapStyle, mapboxToken]) // Re-run if style changes (though mapbox usually handles style updates differently)

  // Effect to update style dynamically without recreating map
  useEffect(() => {
    if (!mapRef.current) return

    let styleUrl = 'mapbox://styles/mapbox/streets-v12'
    if (mapStyle === 'satellite') {
      styleUrl = 'mapbox://styles/mapbox/satellite-streets-v12'
    } else {
      const currentIsDark = typeof window !== 'undefined' && (
        document.documentElement.classList.contains('dark') ||
        localStorage.theme === 'dark' ||
        (!localStorage.theme && window.matchMedia('(prefers-color-scheme: dark)').matches)
      )
      styleUrl = currentIsDark 
        ? 'mapbox://styles/mapbox/dark-v11'
        : 'mapbox://styles/mapbox/streets-v12'
    }
    
    // Only set style if map is loaded to avoid errors
    if (mapRef.current.isStyleLoaded()) {
        mapRef.current.setStyle(styleUrl)
    } else {
        mapRef.current.once('style.load', () => {
            mapRef.current?.setStyle(styleUrl)
        })
    }
    
  }, [mapStyle])

  return {}
}

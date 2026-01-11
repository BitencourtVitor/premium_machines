import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'

interface LocationPickerMapProps {
  mapCoordinates: { lat: number; lng: number }
  setMapCoordinates: (coords: { lat: number; lng: number }) => void
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

export default function LocationPickerMap({ mapCoordinates, setMapCoordinates }: LocationPickerMapProps) {
  const mapModalContainer = useRef<HTMLDivElement>(null)
  const mapModal = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const themeObserverRef = useRef<MutationObserver | null>(null)
  const mediaQueryRef = useRef<MediaQueryList | null>(null)

  useEffect(() => {
    if (!mapCoordinates || !mapModalContainer.current) {
      // Se o modal fechou ou não tem coordenadas, limpar o mapa
      if (mapModal.current) {
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
  }, [mapCoordinates, setMapCoordinates])

  return (
    <div 
      ref={mapModalContainer}
      className="w-full h-64 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600"
      style={{ minHeight: '256px' }}
    />
  )
}

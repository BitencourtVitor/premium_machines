import { renderHook, act } from '@testing-library/react'
import { useMapMarkers } from '../useMapMarkers'
import { Site } from '../../types'

jest.mock('mapbox-gl', () => {
  const easeToMock = jest.fn()

  function MockMap(this: any) {
    this.isStyleLoaded = () => true
    this.getZoom = () => 8
    this.project = ([lng, lat]: [number, number]) => ({ x: lng, y: lat })
    this.unproject = ([x, y]: [number, number]) => ({ lng: x, lat: y })
    this.getCanvasContainer = () => {
      const div = document.createElement('div')
      document.body.appendChild(div)
      return div
    }
    this.easeTo = easeToMock
    this.on = jest.fn()
    this.off = jest.fn()
  }

  function MockMarker(this: any, element?: HTMLElement) {
    if (element) {
      document.body.appendChild(element)
    }
    this.setLngLat = () => this
    this.addTo = () => this
    this.remove = () => {}
  }

  ;(MockMap as any).__easeToMock = easeToMock

  return {
    __esModule: true,
    default: { Map: MockMap, Marker: MockMarker },
    Map: MockMap,
    Marker: MockMarker
  }
})

describe('useMapMarkers cluster behavior without spiderfy', () => {
  const createSite = (id: string, lat: number, lng: number): Site => ({
    id,
    title: `Site ${id}`,
    latitude: lat.toString(),
    longitude: lng.toString(),
    machines_count: 1,
    is_headquarters: false
  } as any)

  it('zooms in on cluster click using easeTo and does not spiderfy', () => {
    const { Map } = require('mapbox-gl')
    const easeToMock = (Map as any).__easeToMock as jest.Mock

    ;(window as any).matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    })

    const mapInstance: any = new Map()
    const mapRef: any = { current: mapInstance }
    const markersRef: any = { current: [] }
    const headquartersMarkerRef: any = { current: null }

    const sites: Site[] = [
      createSite('1', 10, 10),
      createSite('2', 10.0001, 10.0001)
    ]

    const { result } = renderHook(() =>
      useMapMarkers({
        mapRef,
        sites,
        selectedSite: null,
        setSelectedSite: jest.fn(),
        markersRef,
        headquartersMarkerRef
      })
    )

    act(() => {
      result.current.updateMarkers()
    })

    const clusterEl = document.querySelector('.marker-container')
    expect(clusterEl).not.toBeNull()

    ;(clusterEl as HTMLElement).click()

    expect(easeToMock).toHaveBeenCalled()
    const calls = easeToMock.mock.calls
    expect(calls[0][0].zoom).toBeGreaterThan(mapInstance.getZoom())
  })
})

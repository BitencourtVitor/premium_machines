// Geocoding using Geoapify API

const GEOAPIFY_API_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY

export interface GeocodingResult {
  latitude: number
  longitude: number
  confidence: number
  place_type: string
  formatted_address: string
  city?: string
  state?: string
  country?: string
}

export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  if (!GEOAPIFY_API_KEY) {
    console.error('Geoapify API key not configured')
    return null
  }

  try {
    const encodedAddress = encodeURIComponent(address)
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodedAddress}&apiKey=${GEOAPIFY_API_KEY}&lang=pt&filter=countrycode:br`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error('Geocoding request failed')
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      return null
    }

    const feature = data.features[0]
    const props = feature.properties

    return {
      latitude: feature.geometry.coordinates[1],
      longitude: feature.geometry.coordinates[0],
      confidence: props.rank?.confidence || 0,
      place_type: props.result_type || 'unknown',
      formatted_address: props.formatted || address,
      city: props.city || props.county,
      state: props.state,
      country: props.country,
    }
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult | null> {
  if (!GEOAPIFY_API_KEY) {
    console.error('Geoapify API key not configured')
    return null
  }

  try {
    const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${GEOAPIFY_API_KEY}&lang=pt`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error('Reverse geocoding request failed')
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      return null
    }

    const feature = data.features[0]
    const props = feature.properties

    return {
      latitude: lat,
      longitude: lng,
      confidence: 1,
      place_type: props.result_type || 'unknown',
      formatted_address: props.formatted || '',
      city: props.city || props.county,
      state: props.state,
      country: props.country,
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}

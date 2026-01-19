export interface Site {
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
  machines?: any[]
}

export interface SiteMetrics {
  totalActiveSites: number
  totalMachinesAllocated: number
  pendingAllocations: number
  machinesWithIssues: number
  archivedSites: number
}

export interface GeocodingResult {
  latitude: number
  longitude: number
  formatted_address: string
  city?: string
  state?: string
  zip?: string
  confidence?: number
  place_type?: string
}

export interface Site {
  id: string
  title: string
  latitude: number
  longitude: number
  address?: string
  city?: string
  machines_count: number
  machines: any[]
  all_machines?: any[]
  is_headquarters?: boolean
}

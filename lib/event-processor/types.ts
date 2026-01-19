export type EventType = 
  | 'start_allocation'
  | 'end_allocation'
  | 'downtime_start'
  | 'downtime_end'
  | 'correction'
  | 'extension_attach'
  | 'extension_detach'
  | 'transport_start'
  | 'transport_arrival'
  | 'request_allocation'
  | 'refueling'
  | 'monitoring'

export interface AllocationEvent {
  id: string
  event_type: EventType
  machine_id: string
  site_id?: string | null
  extension_id?: string | null
  supplier_id?: string | null
  construction_type?: string | null
  lot_building_number?: string | null
  event_date: string
  end_date?: string | null
  downtime_reason?: string | null
  downtime_description?: string | null
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: string | null
  approved_at?: string | null
  rejection_reason?: string | null
  corrects_event_id?: string | null
  correction_description?: string | null
  created_by: string
  notas?: string | null
  created_at: string
  updated_at: string
}

export interface MachineState {
  current_site_id: string | null
  status: 'available' | 'allocated' | 'maintenance' | 'inactive' | 'in_transit'
  is_in_downtime: boolean
  current_downtime_event_id: string | null
  last_allocation_event_id: string | null
}

export interface ExtensionState {
  current_machine_id: string | null
  status: 'available' | 'attached' | 'maintenance' | 'inactive'
}

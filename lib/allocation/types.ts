
export interface AllocationEvent {
  id: string
  event_type: string
  machine_id: string
  site_id: string | null
  extension_id: string | null
  supplier_id: string | null
  machine_type_id: string | null
  construction_type: 'lot' | 'building' | null
  lot_building_number: string | null
  event_date: string
  end_date: string | null
  downtime_reason: string | null
  downtime_description: string | null
  status: 'pending' | 'approved' | 'rejected'
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  corrects_event_id: string | null
  correction_description: string | null
  created_by: string
  notas: string | null
  created_at: string
  updated_at: string
}

export interface AttachedExtension {
  extension_id: string
  extension_unit_number: string
  extension_type: string
  extension_type_icon: string | null
  attach_event_id: string
  attached_at: string
}

export interface ActiveAllocation {
  allocation_event_id: string | null
  machine_id: string
  machine_unit_number: string
  machine_type: string
  machine_type_icon: string | null
  machine_ownership: 'owned' | 'rented'
  machine_supplier_id: string | null
  machine_supplier_name: string | null
  site_id: string | null
  site_title: string
  construction_type: 'lot' | 'building' | null
  lot_building_number: string | null
  allocation_start: string
  start_date?: string
  end_date?: string | null
  planned_end_date?: string | null
  actual_end_date?: string | null
  is_in_downtime: boolean
  current_downtime_event_id: string | null
  current_downtime_reason: string | null
  current_downtime_start: string | null
  attached_extensions: AttachedExtension[]
  status: 'available' | 'allocated' | 'maintenance' | 'inactive' | 'in_transit' | 'exceeded'
  is_currently_at_site: boolean
  previous_site_id?: string | null
  origin_site_id?: string | null
  destination_site_id?: string | null
  physical_site_id?: string | null
}

export interface ActiveDowntime {
  downtime_event_id: string
  machine_id: string
  machine_unit_number: string
  site_id: string | null
  site_title: string | null
  downtime_reason: string
  downtime_description: string | null
  downtime_start: string
}

export interface ActiveTransport {
  transport_start_event_id: string
  machine_id: string
  machine_unit_number: string
  origin_site_id: string | null
  origin_site_title: string | null
  destination_site_id: string | null
  destination_site_title: string | null
  transport_start: string
}

export interface MachineAllocationState {
  machine_id: string
  current_site_id: string | null
  current_site_title: string | null
  current_allocation_event_id: string | null
  construction_type: 'lot' | 'building' | null
  lot_building_number: string | null
  status: 'available' | 'allocated' | 'maintenance' | 'inactive' | 'in_transit' | 'exceeded'
  is_in_downtime: boolean
  current_downtime_event_id: string | null
  allocation_start: string | null
  end_date?: string | null
  planned_end_date?: string | null
  downtime_start: string | null
  current_downtime_reason: string | null
  current_downtime_start: string | null
  attached_extensions: AttachedExtension[]
  previous_site_id?: string | null
  destination_site_id?: string | null
}

export interface ExtensionState {
  extension_id: string
  current_machine_id: string | null
  current_machine_unit_number: string | null
  attach_event_id: string | null
  status: 'available' | 'attached' | 'maintenance' | 'inactive' | 'in_transit'
  attached_at: string | null
}

export interface SiteAllocationSummary {
  site_id: string
  site_title: string
  total_machines: number
  machines_in_downtime: number
  machines_working: number
  allocations: ActiveAllocation[]
}

export interface AllocationDaysCalculation {
  machine_id: string
  site_id: string
  supplier_id: string | null
  period_start: Date
  period_end: Date
  total_days: number
  downtime_days: number
  billable_days: number
  daily_rate: number
  estimated_cost: number
}

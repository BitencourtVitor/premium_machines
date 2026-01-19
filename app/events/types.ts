export interface AllocationEvent {
  id: string
  event_type: string
  machine: { id: string; unit_number: string }
  site?: { id: string; title: string }
  extension?: { id: string; unit_number: string }
  event_date: string
  end_date?: string | null
  status: string
  downtime_reason?: string
  downtime_description?: string
  created_by_user: { nome: string }
  approved_by_user?: { nome: string }
  created_at: string
  construction_type?: string
  lot_building_number?: string
  extension_id?: string
  corrects_event_id?: string
  correction_description?: string
  rejection_reason?: string
  notas?: string
}

export interface ActiveAllocation {
  allocation_event_id: string
  machine_id: string
  machine_unit_number: string
  machine_type: string
  machine_ownership: 'owned' | 'rented'
  machine_supplier_name: string | null
  site_id: string
  site_title: string
  construction_type: 'lot' | 'building' | null
  lot_building_number: string | null
  allocation_start: string
  end_date?: string | null
  is_in_downtime: boolean
  current_downtime_event_id: string | null
  current_downtime_reason: string | null
  current_downtime_start: string | null
}

export interface ActiveDowntime {
  downtime_event_id: string
  machine_id: string
  machine_unit_number: string
  site_id: string
  site_title: string
  downtime_reason: string
  downtime_start: string
}

export interface NewEventState {
  event_type: string
  machine_id: string
  site_id: string
  extension_id: string
  construction_type: string
  lot_building_number: string
  event_date: string
  end_date: string
  downtime_reason: string
  downtime_description: string
  corrects_event_id: string
  correction_description: string
  notas: string
}
